import { useState } from 'react'
import { useInstall } from '../hooks/useInstall'
import { MODES, type Mode, type Session } from '../lib/types'
import { MODE_ICON, IBluetooth, IChevron, IPlay } from '../components/Icons'
import { Wordmark } from '../components/Ui'
import { TargetPicker } from '../components/TargetPicker'
import { useHrm } from '../lib/bleStore'
import { useSettings } from '../lib/store'
import { useRecorder } from '../lib/recorder'
import { useSessions, weekOf } from '../lib/sessions'
import { zoneInfo } from '../lib/zones'
import { fmtDay, fmtDistance, fmtShortDur, distUnit } from '../lib/format'

export function Today({
  onStart,
  onPair,
  onOpen,
  onSeeAll,
}: {
  onStart: (m: Mode) => void
  onPair: () => void
  onOpen: (s: Session) => void
  onSeeAll: () => void
}) {
  const s = useSettings()
  const link = useHrm()
  const rec = useRecorder()
  const list = useSessions()
  const install = useInstall()
  const [mode, setMode] = useState<Mode>(() => {
    const q = new URLSearchParams(location.search).get('start')
    return (MODES.find((m) => m.id === q)?.id ?? 'run') as Mode
  })

  const connected = link.status === 'connected'
  const hr = rec.hrStale ? null : rec.hr
  const week = weekOf(list ?? [])
  const peak = Math.max(1, ...week.map((d) => d.ms))
  const recent = (list ?? []).slice(0, 4)
  const weekMs = week.reduce((a, b) => a + b.ms, 0)
  const weekDist = week.reduce((a, b) => a + b.dist, 0)

  return (
    <div className="scroll">
      <div className="topbar">
        <Wordmark />
        <div className="spacer" />
        <button className={`chip ${connected ? 'on' : ''}`} onClick={onPair}>
          {connected && hr ? (
            <>
              <span className="dot beat" />
              <b className="num" style={{ fontSize: 15 }}>{hr}</b>
              <span style={{ opacity: 0.6, fontSize: 11, letterSpacing: '0.1em' }}>BPM</span>
            </>
          ) : (
            <>
              <IBluetooth size={14} />
              {link.status === 'reconnecting' ? 'Reconnecting' : link.status === 'connecting' ? 'Connecting' : link.name ? 'Tap to link' : 'Link strap'}
            </>
          )}
        </button>
      </div>

      {install.canInstall && (
        <button
          className="card"
          onClick={install.install}
          style={{ width: '100%', textAlign: 'left', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', letterSpacing: '-0.02em' }}>Add Kardio to your home screen</b>
            <span style={{ fontSize: 12.5, color: 'var(--dim)' }}>Runs full screen, works offline, keeps the strap linked.</span>
          </span>
          <span className="chip on">Install</span>
        </button>
      )}

      <div className="stagger">
        <div className="modes" style={{ marginBottom: 14 }}>
          {MODES.map((m) => {
            const I = MODE_ICON[m.id]
            return (
              <button key={m.id} className="mode" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                <I size={17} />
                {m.label}
              </button>
            )
          })}
        </div>

        <button className="starter" onClick={() => onStart(mode)}>
          <span className="sheen" />
          <span className="go">START</span>
          <span className="sub">
            {MODES.find((m) => m.id === mode)?.label}
            {s.targetZone ? ` · hold ${zoneInfo(s.targetZone).short} ${s.zones[s.targetZone - 1][0]}–${s.zones[s.targetZone - 1][1]}` : ' · free'}
          </span>
          <span
            style={{
              position: 'absolute',
              right: 18,
              bottom: 18,
              width: 40,
              height: 40,
              borderRadius: 99,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--zone)',
              color: '#06070a',
            }}
          >
            <IPlay size={16} />
          </span>
        </button>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <div className="eyebrow">Target zone</div>
              <div style={{ fontWeight: 650, letterSpacing: '-0.02em' }}>
                {s.targetZone ? `${zoneInfo(s.targetZone).name} · ${s.zones[s.targetZone - 1][0]}–${s.zones[s.targetZone - 1][1]} bpm` : 'No target — free run'}
              </div>
            </div>
          </div>
          <TargetPicker />
        </div>

        <h2 className="section">This week</h2>
        <div className="card">
          <div className="row" style={{ marginBottom: 14, gap: 22 }}>
            <div>
              <div className="eyebrow">Moving</div>
              <div className="num" style={{ fontSize: 27 }}>{fmtShortDur(weekMs)}</div>
            </div>
            <div>
              <div className="eyebrow">Distance</div>
              <div className="num" style={{ fontSize: 27 }}>
                {fmtDistance(weekDist, s.units, 1)}
                <span style={{ fontSize: 13, color: 'var(--dim)', marginLeft: 3 }}>{distUnit(s.units)}</span>
              </div>
            </div>
            <div>
              <div className="eyebrow">Sessions</div>
              <div className="num" style={{ fontSize: 27 }}>{week.filter((d) => d.ms > 0).length}</div>
            </div>
          </div>
          <div className="week">
            {week.map((d, i) => (
              <div key={i} className={`d ${d.today ? 'today' : ''}`}>
                <i style={{ height: `${Math.max(d.ms ? 8 : 0, Math.round((d.ms / peak) * 100))}%` }} />
                <span style={{ position: 'relative' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <h2 className="section">
          Recent
          {recent.length > 0 && (
            <button onClick={onSeeAll} style={{ float: 'right', color: 'var(--muted)', fontSize: 12, letterSpacing: 0, textTransform: 'none' }}>
              See all
            </button>
          )}
        </h2>

        {recent.length === 0 ? (
          <div className="empty">
            <b>Nothing logged yet</b>
            Link your strap, pick a zone, press start.
          </div>
        ) : (
          <div className="list">
            {recent.map((x) => (
              <SessionRow key={x.id} s={x} units={s.units} onOpen={() => onOpen(x)} />
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 6 }} />
    </div>
  )
}

export function SessionRow({ s, units, onOpen }: { s: Session; units: 'km' | 'mi'; onOpen: () => void }) {
  const I = MODE_ICON[s.mode]
  const zi = s.totals.zoneMs.slice(1)
  const top = zi.indexOf(Math.max(...zi)) + 1
  const c = zoneInfo(top).color
  const label = MODES.find((m) => m.id === s.mode)?.label ?? 'Workout'
  return (
    <button className="item" onClick={onOpen} style={{ ['--c' as string]: c }}>
      <span className="blip">
        <I size={19} />
      </span>
      <span className="meta">
        <b>{s.title || label}</b>
        <span>
          {fmtDay(s.startedAt)} · {fmtShortDur(s.totals.durMs)}
          {s.totals.avgHr ? ` · ${s.totals.avgHr} bpm avg` : ''}
        </span>
      </span>
      <span className="end">
        <b>{s.totals.distM > 30 ? fmtDistance(s.totals.distM, units, 2) : fmtShortDur(s.totals.durMs)}</b>
        <span>{s.totals.distM > 30 ? distUnit(units) : 'duration'}</span>
      </span>
      <IChevron size={16} className="dim" />
    </button>
  )
}
