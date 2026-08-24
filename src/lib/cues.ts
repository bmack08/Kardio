import { play, TONES } from './audio'
import { HAPTICS } from './haptics'
import { speak } from './speech'
import type { Settings } from './types'
import { MI } from './format'
import { zoneFor, ZONE_META } from './zones'

export type CueCtx = {
  hr: number | null
  now: number
  distM: number
  elapsedMs: number
  running: boolean
  paceSecPerUnit: number | null
}

type Dir = 'up' | 'down'

/**
 * Decides *when* to interrupt you. Everything here exists to make the phone
 * stay in your pocket: hysteresis so boundary noise never chatters, one
 * unmistakable nudge when you drift, silence the rest of the time.
 */
export class CueEngine {
  stableZone = 0
  onEvent: ((label: string) => void) | null = null

  private candidate = -1
  private candidateSince = 0
  private lastNagAt = 0
  private nextDistMark = Infinity
  private nextTimeMark = Infinity
  private hrAlive = false
  private hrLostAt = 0
  private lostAnnounced = false
  private armed = false

  arm(s: Settings, hr: number | null) {
    this.armed = true
    this.candidate = -1
    this.lastNagAt = 0
    this.hrAlive = hr != null
    this.lostAnnounced = false
    // seed from the strap so the dial is honest from the first second
    this.stableZone = zoneFor(hr, s.zones)
    const unit = s.units === 'mi' ? MI : 1000
    this.nextDistMark = s.cues.periodic === 'dist' ? unit : Infinity
    this.nextTimeMark = s.cues.periodic === '5min' ? 3e5 : s.cues.periodic === '10min' ? 6e5 : Infinity
  }

  disarm() {
    this.armed = false
  }

  reset() {
    this.stableZone = 0
    this.candidate = -1
    this.armed = false
  }

  private emit(label: string) {
    this.onEvent?.(label)
  }

  private fire(tones: Parameters<typeof play>[0], haptic: () => void, phrase: string | null, s: Settings) {
    if (s.cues.haptics) haptic()
    if (s.cues.tones) play(tones)
    if (s.cues.voice && phrase) setTimeout(() => speak(phrase), s.cues.tones ? 420 : 60)
  }

  /** Deadband: you must clear a boundary by N bpm before the zone flips. */
  private resolve(hr: number, s: Settings) {
    const raw = zoneFor(hr, s.zones)
    if (raw === this.stableZone) return raw
    const db = s.cues.deadband
    if (raw > this.stableZone) {
      const lo = s.zones[raw - 1]?.[0] ?? Infinity
      return hr >= lo + db ? raw : this.stableZone
    }
    const leaving = this.stableZone >= 1 ? s.zones[this.stableZone - 1][0] : -Infinity
    return hr <= leaving - db ? raw : this.stableZone
  }

  private nudge(dir: Dir, s: Settings, hr: number | null) {
    const z = this.stableZone
    const zn = z >= 1 ? `zone ${z}` : 'below zone one'
    const extra = s.cues.announceMetrics && hr ? `, ${hr}` : ''
    const phrase = dir === 'up' ? `Pick it up. ${zn}${extra}.` : `Ease off. ${zn}${extra}.`
    this.fire(dir === 'up' ? TONES.speedUp : TONES.easeOff, dir === 'up' ? HAPTICS.speedUp : HAPTICS.easeOff, phrase, s)
    this.emit(dir === 'up' ? 'Pick it up' : 'Ease off')
  }

  private committed(prev: number, z: number, s: Settings, hr: number | null) {
    const target = s.targetZone
    if (target != null) {
      if (z === target) {
        this.fire(TONES.onTarget, HAPTICS.onTarget, `On target. Zone ${z}.`, s)
        this.emit(`On target · Z${z}`)
        this.lastNagAt = 0
      } else {
        this.nudge(z < target ? 'up' : 'down', s, hr)
        this.lastNagAt = this.candidateSince
      }
      return
    }
    if (s.cues.onZoneChange && z !== prev) {
      const label = z >= 1 ? `Zone ${z}` : 'Below zone one'
      this.fire(TONES.zone(z), () => HAPTICS.zone(z), label, s)
      this.emit(label)
    }
  }

  private periodic(c: CueCtx, s: Settings) {
    const unit = s.units === 'mi' ? MI : 1000
    const unitName = s.units === 'mi' ? 'mile' : 'kilometre'
    if (c.distM >= this.nextDistMark) {
      const n = Math.round(this.nextDistMark / unit)
      this.nextDistMark += unit
      const pace = c.paceSecPerUnit ? ` ${paceWords(c.paceSecPerUnit)} per ${unitName}.` : ''
      const hr = c.hr ? ` Heart rate ${c.hr}, zone ${this.stableZone}.` : ''
      if (s.cues.tones) play(TONES.lap)
      if (s.cues.haptics) HAPTICS.lap()
      if (s.cues.voice) setTimeout(() => speak(`${n} ${unitName}${n === 1 ? '' : 's'}.${pace}${hr}`), 380)
      this.emit(`${n} ${unitName}${n === 1 ? '' : 's'}`)
      return
    }
    if (c.elapsedMs >= this.nextTimeMark) {
      const mins = Math.round(this.nextTimeMark / 6e4)
      this.nextTimeMark += s.cues.periodic === '5min' ? 3e5 : 6e5
      const hr = c.hr ? ` Heart rate ${c.hr}, zone ${this.stableZone}.` : ''
      if (s.cues.tones) play(TONES.lap)
      if (s.cues.voice) setTimeout(() => speak(`${mins} minutes.${hr}`), 380)
      this.emit(`${mins} min`)
    }
  }

  update(c: CueCtx, s: Settings) {
    if (!this.armed || !s.cues.enabled) return

    // strap health
    if (c.hr != null) {
      if (!this.hrAlive && this.lostAnnounced) {
        this.emit('Strap back')
        if (s.cues.tones) play(TONES.tick)
      }
      this.hrAlive = true
      this.lostAnnounced = false
    } else if (this.hrAlive) {
      this.hrAlive = false
      this.hrLostAt = c.now
    } else if (!this.lostAnnounced && this.hrLostAt && c.now - this.hrLostAt > 9000) {
      this.lostAnnounced = true
      this.fire(TONES.lost, HAPTICS.lost, 'Heart rate signal lost.', s)
      this.emit('Signal lost')
    }

    if (!c.running) return
    this.periodic(c, s)
    if (c.hr == null) return

    const z = this.resolve(c.hr, s)
    if (z !== this.stableZone) {
      if (z !== this.candidate) {
        this.candidate = z
        this.candidateSince = c.now
      } else if (c.now - this.candidateSince >= s.cues.dwellSeconds * 1000) {
        const prev = this.stableZone
        this.stableZone = z
        this.candidate = -1
        this.committed(prev, z, s, c.hr)
      }
    } else {
      this.candidate = -1
    }

    const target = s.targetZone
    if (target != null && this.stableZone !== target) {
      const wait = s.cues.nagSeconds * 1000
      if (this.lastNagAt === 0) this.lastNagAt = c.now
      else if (c.now - this.lastNagAt >= wait) {
        this.nudge(this.stableZone < target ? 'up' : 'down', s, c.hr)
        this.lastNagAt = c.now
      }
    }
  }

  /** Fire a single cue by hand — used by the settings previewer. */
  static preview(kind: 'up' | 'down' | 'target' | 'zone', s: Settings, zone = 3) {
    const g = (t: Parameters<typeof play>[0], h: () => void, p: string) => {
      if (s.cues.haptics) h()
      if (s.cues.tones) play(t)
      if (s.cues.voice) setTimeout(() => speak(p), s.cues.tones ? 420 : 60)
    }
    if (kind === 'up') g(TONES.speedUp, HAPTICS.speedUp, 'Pick it up. Zone 1.')
    else if (kind === 'down') g(TONES.easeOff, HAPTICS.easeOff, 'Ease off. Zone 4.')
    else if (kind === 'target') g(TONES.onTarget, HAPTICS.onTarget, `On target. Zone ${zone}.`)
    else g(TONES.zone(zone), () => HAPTICS.zone(zone), `Zone ${zone}. ${ZONE_META[zone - 1].name}.`)
  }
}

function paceWords(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (s === 0) return `${m} minutes flat`
  return `${m} ${s < 10 ? 'oh ' : ''}${s}`
}
