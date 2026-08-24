import { useEffect, useRef, useState } from 'react'
import { HRRing } from '../components/HRRing'
import { ZoneBar } from '../components/Charts'
import { IEye, IFlag, IPause, IPlay, IStop } from '../components/Icons'
import { useRecorder, recorder } from '../lib/recorder'
import { useSettings } from '../lib/store'
import { useHrm } from '../lib/bleStore'
import { useWakeLock } from '../hooks/useWakeLock'
import { zoneInfo } from '../lib/zones'
import { MODES } from '../lib/types'
import { distUnit, fmtClock, fmtDistance, fmtPace, fmtShortDur } from '../lib/format'
import { HAPTICS } from '../lib/haptics'

export function Live({ onFinish }: { onFinish: () => void }) {
  const s = useSettings()
  const rec = useRecorder()
  const link = useHrm()
  useWakeLock(s.keepScreenOn && rec.status !== 'idle')

  const hr = rec.hrStale ? null : rec.hr
  const zone = rec.cueZone
  const zi = zoneInfo(zone)
  const target = s.targetZone
  const gps = MODES.find((m) => m.id === rec.mode)?.gps && s.gps
  const paused = rec.status === 'paused' || rec.status === 'autopaused'
  const showCue = rec.lastCue && Date.now() - rec.lastCueAt < 3200

  if (rec.eyesFree) return <EyesFree hr={hr} zone={zone} onExit={() => recorder.setEyesFree(false)} />

  return (
    <div className="live">
      <div className="live-head">
        <span className={`chip ${link.status === 'connected' && !rec.hrStale ? 'on' : 'warn'}`}>
          <span className="dot" />
          {link.status === 'connected' ? (rec.hrStale ? 'No signal' : 'Strap') : link.status === 'reconnecting' ? 'Reconnecting' : 'No strap'}
        </span>
        {gps && (
          <span className={`chip ${rec.gpsAcc != null && rec.gpsAcc < 20 ? 'on' : 'warn'}`}>
            <span className="dot" />
            GPS{rec.gpsAcc != null ? ` ±${Math.round(rec.gpsAcc)}m` : ' …'}
          </span>
        )}
        <div className="spacer" />
        <button className="chip" onClick={() => { HAPTICS.tap(); recorder.setEyesFree(true) }} aria-label="Eyes-free mode">
          <IEye size={15} />
        </button>
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
        <div className="num" style={{ fontSize: 42, letterSpacing: '-0.045em' }}>
          {fmtClock(rec.elapsedMs)}
        </div>
        {paused && (
          <span className="chip warn" style={{ height: 26 }}>
            {rec.status === 'autopaused' ? 'Auto-paused' : 'Paused'}
          </span>
        )}
      </div>

      <div className="hero">
        <div className="ring">
          <HRRing hr={hr} zones={s.zones} restHr={s.restHr} target={target} stale={rec.hrStale} />
        </div>
        {hr && !rec.hrStale && <div className="glow" />}
        <div className="readout">
          <div className={`bpm ${rec.hrStale ? 'stale' : ''}`}>{hr ?? '--'}</div>
          <div className="bpm-unit">bpm</div>
          <div className="zone-name" style={{ color: zi.color, opacity: rec.hrStale ? 0.45 : 1 }}>
            <span className="dot" />
            {zi.short} · {zi.name}
          </div>
        </div>
        {showCue && <div className="cue-toast">{rec.lastCue}</div>}
      </div>

      <TargetHint zone={zone} target={target} zones={s.zones} hr={hr} />

      <ZoneBar zoneMs={rec.zoneMs} current={zone} />

      <div className="grid3">
        {gps ? (
          <>
            <Stat k="Distance" v={fmtDistance(rec.distM, s.units, 2)} u={distUnit(s.units)} />
            <Stat k="Pace" v={fmtPace(rec.paceSec)} u={`/${distUnit(s.units)}`} />
            <Stat k="Calories" v={Math.round(rec.kcal)} u="kcal" />
          </>
        ) : (
          <>
            <Stat k="Avg HR" v={rec.avgHr ?? '--'} u="bpm" />
            <Stat k="Max HR" v={rec.maxHr ?? '--'} u="bpm" />
            <Stat k="Calories" v={Math.round(rec.kcal)} u="kcal" />
          </>
        )}
      </div>

      <div className="grid3">
        <Stat k={`Lap ${rec.laps.length + 1}`} v={fmtClock(rec.lapMs)} />
        {gps ? (
          <>
            <Stat k="Lap dist" v={fmtDistance(rec.lapDistM, s.units, 2)} u={distUnit(s.units)} />
            <Stat k="Avg HR" v={rec.avgHr ?? '--'} u="bpm" />
          </>
        ) : (
          <>
            <Stat k={target ? 'In target' : 'In zones'} v={fmtShortDur(target ? rec.zoneMs[target] : rec.zoneMs.slice(1).reduce((a, b) => a + b, 0))} />
            <Stat k="Moving" v={fmtClock(rec.movingMs)} />
          </>
        )}
      </div>

      <div className="spacer" style={{ maxHeight: 26 }} />

      <div className="controls">
        <button className="btn" onClick={() => recorder.lap()} disabled={paused}>
          <IFlag size={17} /> Lap
        </button>
        <button
          className="btn zone"
          style={{ height: 60 }}
          onClick={() => (paused ? recorder.resume() : recorder.pause())}
        >
          {paused ? <IPlay size={19} /> : <IPause size={19} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <HoldToFinish onDone={onFinish} />
      </div>
    </div>
  )
}

function Stat({ k, v, u }: { k: string; v: React.ReactNode; u?: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className="v">
        {v}
        {u && <span className="u">{u}</span>}
      </div>
    </div>
  )
}

function TargetHint({
  zone,
  target,
  zones,
  hr,
}: {
  zone: number
  target: number | null
  zones: [number, number][]
  hr: number | null
}) {
  if (target == null) return <div className="target-hint">{zoneInfo(zone).blurb}</div>
  if (hr == null) return <div className="target-hint">Waiting for heart rate…</div>
  const band = zones[target - 1]
  if (zone === target) {
    return (
      <div className="target-hint act">
        Holding {zoneInfo(target).short} · {band[0]}–{band[1]}
      </div>
    )
  }
  const up = zone < target
  const need = up ? `+${Math.max(1, band[0] - hr)} bpm` : `−${Math.max(1, hr - band[1])} bpm`
  return (
    <div className="target-hint act">
      <span className={`arrow ${up ? '' : 'down'}`}>{up ? '▲' : '▼'}</span>
      {up ? 'Pick it up' : 'Ease off'} · {need} to {zoneInfo(target).short}
    </div>
  )
}

function HoldToFinish({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0)
  const raf = useRef(0)
  const t0 = useRef(0)
  const HOLD = 850

  const stop = () => {
    cancelAnimationFrame(raf.current)
    setP(0)
  }

  const step = () => {
    const f = Math.min(1, (performance.now() - t0.current) / HOLD)
    setP(f)
    if (f >= 1) {
      HAPTICS.stop()
      stop()
      onDone()
    } else raf.current = requestAnimationFrame(step)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <button
      className="btn danger hold"
      onPointerDown={() => {
        t0.current = performance.now()
        HAPTICS.tap()
        raf.current = requestAnimationFrame(step)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      <span className="prog" style={{ transform: `scaleX(${p})` }} />
      <IStop size={15} /> {p > 0 ? 'Hold' : 'Finish'}
    </button>
  )
}

function EyesFree({ hr, zone, onExit }: { hr: number | null; zone: number; onExit: () => void }) {
  const zi = zoneInfo(zone)
  return (
    <div className="eyesfree">
      <div className="edge" />
      <div className="lab">{zi.short} · {zi.name}</div>
      <div className="big">{hr ?? '--'}</div>
      <button className="btn ghost" onClick={onExit} style={{ opacity: 0.5 }}>
        Show controls
      </button>
    </div>
  )
}
