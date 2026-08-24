import { useSyncExternalStore } from 'react'
import type { Lap, Mode, Sample, Session, Totals } from './types'
import { MODES } from './types'
import { settings } from './store'
import { zoneFor } from './zones'
import { haversine } from './geo'
import { CueEngine } from './cues'
import { play, TONES, startKeepAlive, stopKeepAlive, unlockAudio, setVolume } from './audio'
import { HAPTICS, setHaptics } from './haptics'
import { configureVoice, shutUp, speak } from './speech'
import { MI, paceFromSpeed } from './format'

export type RecStatus = 'idle' | 'running' | 'paused' | 'autopaused'

export type RecState = {
  status: RecStatus
  mode: Mode
  startedAt: number
  elapsedMs: number
  movingMs: number
  distM: number
  lapDistM: number
  lapMs: number
  hr: number | null
  hrAt: number
  hrStale: boolean
  avgHr: number | null
  maxHr: number | null
  zone: number
  zoneMs: number[]
  speed: number
  paceSec: number | null
  avgPaceSec: number | null
  kcal: number
  ascentM: number
  laps: Lap[]
  points: [number, number][]
  gpsAcc: number | null
  gpsError: string | null
  lastCue: string | null
  lastCueAt: number
  eyesFree: boolean
  /** the hysteresis-smoothed zone the cue engine is acting on */
  cueZone: number
}

const blank = (): RecState => ({
  status: 'idle',
  mode: 'run',
  startedAt: 0,
  elapsedMs: 0,
  movingMs: 0,
  distM: 0,
  lapDistM: 0,
  lapMs: 0,
  hr: null,
  hrAt: 0,
  hrStale: true,
  avgHr: null,
  maxHr: null,
  zone: 0,
  zoneMs: [0, 0, 0, 0, 0, 0],
  speed: 0,
  paceSec: null,
  avgPaceSec: null,
  kcal: 0,
  ascentM: 0,
  laps: [],
  points: [],
  gpsAcc: null,
  gpsError: null,
  lastCue: null,
  lastCueAt: 0,
  eyesFree: false,
  cueZone: 0,
})

const TICK = 250

class Recorder {
  private s: RecState = blank()
  private subs = new Set<() => void>()
  private timer: number | null = null
  private watch: number | null = null
  private lastTick = 0
  private lastSampleAt = 0
  private hrSum = 0
  private hrCount = 0
  private slowSince = 0
  private lastFix: { lat: number; lon: number; alt: number | null; t: number } | null = null
  private speeds: number[] = []
  private samples: Sample[] = []
  private lapStart = 0
  private lapDistBase = 0
  private nextAutoLap = Infinity
  private pausedAt = 0
  private pausedTotal = 0
  private hrMaxSeen = 0
  cue = new CueEngine()

  constructor() {
    this.cue.onEvent = (label) => {
      this.s = { ...this.s, lastCue: label, lastCueAt: Date.now() }
      this.emit()
    }
  }

  /* ---------- store plumbing ---------- */
  subscribe = (f: () => void) => {
    this.subs.add(f)
    return () => {
      this.subs.delete(f)
    }
  }
  snapshot = () => this.s
  private emit() {
    this.subs.forEach((f) => f())
  }
  private patch(p: Partial<RecState>) {
    this.s = { ...this.s, ...p }
    this.emit()
  }

  get active() {
    return this.s.status !== 'idle'
  }

  /* ---------- inputs ---------- */
  ingestHr(bpm: number) {
    if (!bpm || bpm < 25 || bpm > 240) return
    this.hrMaxSeen = Math.max(this.hrMaxSeen, bpm)
    this.s = { ...this.s, hr: bpm, hrAt: Date.now(), hrStale: false }
    if (this.s.status === 'running') {
      this.hrSum += bpm
      this.hrCount++
    }
    this.emit()
  }

  private onFix = (p: GeolocationPosition) => {
    const { latitude: lat, longitude: lon, accuracy, altitude } = p.coords
    const t = p.timestamp || Date.now()
    const acc = accuracy ?? 999
    this.s = { ...this.s, gpsAcc: acc, gpsError: null }
    if (acc > 35) return this.emit()
    const prev = this.lastFix
    this.lastFix = { lat, lon, alt: altitude ?? null, t }
    if (!prev) {
      this.s = { ...this.s, points: [[lat, lon]] }
      return this.emit()
    }
    const dt = (t - prev.t) / 1000
    if (dt <= 0.2) return
    const d = haversine(prev.lat, prev.lon, lat, lon)
    const v = d / dt
    if (v > 30 || d < 1.2) {
      this.pushSpeed(0)
      return this.emit()
    }
    this.pushSpeed(v)
    if (this.s.status === 'running') {
      const up = altitude != null && prev.alt != null && altitude - prev.alt > 0.8 ? altitude - prev.alt : 0
      const pts = this.s.points
      const last = pts[pts.length - 1]
      const next =
        !last || haversine(last[0], last[1], lat, lon) > 4 ? [...pts, [lat, lon] as [number, number]] : pts
      this.s = { ...this.s, distM: this.s.distM + d, ascentM: this.s.ascentM + up, points: next }
    }
    this.emit()
  }

  private pushSpeed(v: number) {
    this.speeds.push(v)
    if (this.speeds.length > 12) this.speeds.shift()
  }

  private get smoothSpeed() {
    if (!this.speeds.length) return 0
    let num = 0
    let den = 0
    this.speeds.forEach((v, i) => {
      const w = i + 1
      num += v * w
      den += w
    })
    return num / den
  }

  /* ---------- lifecycle ---------- */
  async start(mode: Mode) {
    const st = settings()
    await unlockAudio(st.cues.volume)
    setVolume(st.cues.volume)
    setHaptics(st.cues.haptics)
    configureVoice({ uri: st.cues.voiceURI, rate: st.cues.voiceRate })
    startKeepAlive()

    this.samples = []
    this.speeds = []
    this.lastFix = null
    this.hrSum = 0
    this.hrCount = 0
    this.hrMaxSeen = 0
    this.pausedTotal = 0
    this.pausedAt = 0
    this.lapStart = 0
    this.lapDistBase = 0
    const unit = st.units === 'mi' ? MI : 1000
    const gps = st.gps && (MODES.find((m) => m.id === mode)?.gps ?? false)
    this.nextAutoLap = gps ? unit : Infinity

    this.s = {
      ...blank(),
      mode,
      status: 'running',
      startedAt: Date.now(),
      hr: this.s.hr,
      hrAt: this.s.hrAt,
      eyesFree: st.eyesFreeDefault,
    }
    this.lastTick = Date.now()
    this.lastSampleAt = 0
    this.cue.reset()
    this.cue.arm(st, this.s.hrStale ? null : this.s.hr)
    this.s = { ...this.s, cueZone: this.cue.stableZone, zone: this.cue.stableZone }
    this.emit()

    if (gps) this.startGeo()
    if (this.timer) clearInterval(this.timer)
    this.timer = window.setInterval(this.tick, TICK)
    if (st.cues.tones) play(TONES.start)
    if (st.cues.haptics) HAPTICS.start()
    if (st.cues.voice) {
      setTimeout(() => speak(st.targetZone ? `Started. Target zone ${st.targetZone}.` : 'Started.'), 520)
    }
  }

  private startGeo() {
    if (!('geolocation' in navigator)) return this.patch({ gpsError: 'No GPS on this device' })
    this.watch = navigator.geolocation.watchPosition(
      this.onFix,
      (e) => this.patch({ gpsError: e.message }),
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 20000 },
    )
  }

  pause(auto = false) {
    if (this.s.status !== 'running') return
    this.pausedAt = Date.now()
    this.patch({ status: auto ? 'autopaused' : 'paused' })
    shutUp()
    if (!auto) {
      const st = settings()
      if (st.cues.tones) play(TONES.stop)
      if (st.cues.haptics) HAPTICS.tap()
    }
  }

  resume() {
    if (this.s.status !== 'paused' && this.s.status !== 'autopaused') return
    if (this.pausedAt) this.pausedTotal += Date.now() - this.pausedAt
    this.pausedAt = 0
    this.slowSince = 0
    this.lastTick = Date.now()
    this.patch({ status: 'running' })
    if (settings().cues.tones) play(TONES.start)
  }

  lap() {
    const now = this.s.elapsedMs
    const st = settings()
    const l: Lap = {
      n: this.s.laps.length + 1,
      t0: this.lapStart,
      t1: now,
      distM: this.s.distM - this.lapDistBase,
      avgHr: this.lapAvgHr(this.lapStart, now),
      maxHr: this.lapMaxHr(this.lapStart, now),
    }
    this.lapStart = now
    this.lapDistBase = this.s.distM
    this.patch({ laps: [...this.s.laps, l], lapDistM: 0, lapMs: 0 })
    if (st.cues.tones) play(TONES.lap)
    if (st.cues.haptics) HAPTICS.lap()
  }

  private window(t0: number, t1: number) {
    return this.samples.filter((x) => x.t >= t0 && x.t <= t1 && x.hr != null)
  }

  private lapAvgHr(t0: number, t1: number) {
    const win = this.window(t0, t1)
    if (!win.length) return null
    return Math.round(win.reduce((a, b) => a + (b.hr ?? 0), 0) / win.length)
  }

  private lapMaxHr(t0: number, t1: number) {
    const win = this.window(t0, t1)
    if (!win.length) return null
    return Math.max(...win.map((x) => x.hr ?? 0))
  }

  setEyesFree(v: boolean) {
    this.patch({ eyesFree: v })
  }

  finish(): Session | null {
    if (this.s.status === 'idle') return null
    const st = settings()
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.watch != null) {
      navigator.geolocation.clearWatch(this.watch)
      this.watch = null
    }
    this.cue.disarm()
    shutUp()
    if (st.cues.tones) play(TONES.stop)
    if (st.cues.haptics) HAPTICS.stop()
    stopKeepAlive()

    const s = this.s
    const laps = [...s.laps]
    if (s.elapsedMs - this.lapStart > 3000) {
      laps.push({
        n: laps.length + 1,
        t0: this.lapStart,
        t1: s.elapsedMs,
        distM: s.distM - this.lapDistBase,
        avgHr: this.lapAvgHr(this.lapStart, s.elapsedMs),
        maxHr: this.lapMaxHr(this.lapStart, s.elapsedMs),
      })
    }
    const totals: Totals = {
      durMs: s.elapsedMs,
      movingMs: s.movingMs,
      distM: Math.round(s.distM),
      avgHr: this.hrCount ? Math.round(this.hrSum / this.hrCount) : null,
      maxHr: this.hrMaxSeen || null,
      minHr: this.samples.reduce<number | null>(
        (m, x) => (x.hr == null ? m : m == null ? x.hr : Math.min(m, x.hr)),
        null,
      ),
      kcal: Math.round(s.kcal),
      ascentM: Math.round(s.ascentM),
      zoneMs: [...s.zoneMs],
    }
    const session: Session = {
      id: `${s.startedAt.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      startedAt: s.startedAt,
      endedAt: Date.now(),
      mode: s.mode,
      title: '',
      notes: '',
      deviceName: st.device.name,
      totals,
      laps,
      samples: this.samples,
      zones: st.zones,
    }
    this.s = { ...blank(), hr: s.hr, hrAt: s.hrAt }
    this.emit()
    return session
  }

  discard() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.watch != null) {
      navigator.geolocation.clearWatch(this.watch)
      this.watch = null
    }
    this.cue.disarm()
    shutUp()
    stopKeepAlive()
    this.samples = []
    this.s = { ...blank(), hr: this.s.hr, hrAt: this.s.hrAt }
    this.emit()
  }

  /* ---------- heartbeat ---------- */
  private tick = () => {
    const now = Date.now()
    const dt = now - this.lastTick
    this.lastTick = now
    const st = settings()
    const running = this.s.status === 'running'
    const stale = now - this.s.hrAt > 6000
    const hr = stale ? null : this.s.hr
    const speed = this.smoothSpeed

    let next: Partial<RecState> = { hrStale: stale, speed }

    if (running) {
      const elapsed = now - this.s.startedAt - this.pausedTotal
      const moving = this.s.movingMs + (speed > 0.5 || !this.lastFix ? dt : 0)
      const z = zoneFor(hr, st.zones)
      const zoneMs = [...this.s.zoneMs]
      zoneMs[z] += dt
      const kcal = this.s.kcal + kcalPerMs(hr, speed, st.weightKg, st.age) * dt
      const unitM = st.units === 'mi' ? MI : 1000
      next = {
        ...next,
        elapsedMs: elapsed,
        movingMs: moving,
        zone: z,
        zoneMs,
        kcal,
        lapMs: elapsed - this.lapStart,
        lapDistM: this.s.distM - this.lapDistBase,
        avgHr: this.hrCount ? Math.round(this.hrSum / this.hrCount) : null,
        maxHr: this.hrMaxSeen || null,
        paceSec: paceFromSpeed(speed, st.units),
        avgPaceSec: this.s.distM > 20 ? moving / 1000 / (this.s.distM / unitM) : null,
      }

      // 1 Hz truth log
      if (elapsed - this.lastSampleAt >= 1000) {
        this.lastSampleAt = elapsed
        this.samples.push({
          t: Math.round(elapsed),
          hr,
          lat: this.lastFix?.lat ?? null,
          lon: this.lastFix?.lon ?? null,
          alt: this.lastFix?.alt ?? null,
          d: Math.round(this.s.distM),
          v: Number(speed.toFixed(2)),
        })
      }

      if (this.s.distM >= this.nextAutoLap) {
        this.nextAutoLap += unitM
        setTimeout(() => this.lap(), 0)
      }

      if (st.autoPause && this.lastFix) {
        if (speed < 0.45) {
          if (!this.slowSince) this.slowSince = now
          else if (now - this.slowSince > 10000) {
            this.slowSince = 0
            setTimeout(() => this.pause(true), 0)
          }
        } else this.slowSince = 0
      }
    } else if (this.s.status === 'autopaused' && speed > 0.9) {
      setTimeout(() => this.resume(), 0)
    }

    this.s = { ...this.s, ...next }
    this.emit()

    this.cue.update(
      {
        hr,
        now,
        distM: this.s.distM,
        elapsedMs: this.s.elapsedMs,
        running,
        paceSecPerUnit: this.s.avgPaceSec ?? this.s.paceSec,
      },
      st,
    )

    if (this.s.cueZone !== this.cue.stableZone) {
      this.s = { ...this.s, cueZone: this.cue.stableZone }
      this.emit()
    }
  }
}

/** Keytel HR-to-kcal, averaged across the sex coefficients. An estimate, not gospel. */
function kcalPerMs(hr: number | null, speed: number, kg: number, age: number) {
  let perMin: number
  if (hr && hr > 60) {
    const a = -55.0969 + 0.6309 * hr + 0.1988 * kg + 0.2017 * age
    const b = -20.4022 + 0.4472 * hr - 0.1263 * kg + 0.074 * age
    perMin = Math.max(0, (a + b) / 2 / 4.184)
  } else {
    const met = speed > 0.5 ? Math.min(16, 1.5 + speed * 2.2) : 1.3
    perMin = (met * 3.5 * kg) / 200
  }
  return perMin / 60000
}

export const recorder = new Recorder()

export function useRecorder(): RecState {
  return useSyncExternalStore(recorder.subscribe, recorder.snapshot, recorder.snapshot)
}
