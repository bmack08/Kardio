import { useState } from 'react'
import type { Session } from '../lib/types'
import { MODES } from '../lib/types'
import { HrChart, RouteTrace, ZoneDist } from '../components/Charts'
import { IBack, ICheck, IShare, ITrash } from '../components/Icons'
import { Tile } from '../components/Ui'
import { useSettings } from '../lib/store'
import { zoneInfo } from '../lib/zones'
import { commitSession, removeSession } from '../lib/sessions'
import { recorder } from '../lib/recorder'
import { download, toGPX } from '../lib/gpx'
import { distUnit, fmtClock, fmtDistance, fmtDay, fmtPace, fmtTime, MI } from '../lib/format'

export function Summary({
  session,
  fresh,
  onDone,
}: {
  session: Session
  fresh: boolean
  onDone: () => void
}) {
  const s = useSettings()
  const [title, setTitle] = useState(session.title)
  const [saving, setSaving] = useState(false)
  const t = session.totals
  const unit = distUnit(s.units)
  const unitM = s.units === 'mi' ? MI : 1000
  const label = MODES.find((m) => m.id === session.mode)?.label ?? 'Workout'
  const zi = t.zoneMs.slice(1)
  const topZone = zi.some((x) => x > 0) ? zi.indexOf(Math.max(...zi)) + 1 : 0
  const avgPace = t.distM > 30 ? t.movingMs / 1000 / (t.distM / unitM) : null
  const pts = session.samples
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => [p.lat!, p.lon!] as [number, number])

  const save = async () => {
    setSaving(true)
    await commitSession({ ...session, title: title.trim() })
    onDone()
  }

  const discard = () => {
    recorder.discard()
    onDone()
  }

  const del = async () => {
    await removeSession(session.id)
    onDone()
  }

  return (
    // the whole page takes the colour of the zone this session actually lived in
    <div className="scroll" style={{ ['--zone' as string]: zoneInfo(topZone).color }}>
      <div className="topbar">
        {!fresh && (
          <button className="chip" onClick={onDone} aria-label="Back" style={{ width: 34, padding: 0, justifyContent: 'center' }}>
            <IBack size={16} />
          </button>
        )}
        <div>
          <div className="eyebrow">{fmtDay(session.startedAt)} · {fmtTime(session.startedAt)}</div>
          <h1 className="title">{title || label}</h1>
        </div>
        <div className="spacer" />
        <span className="chip" style={{ color: zoneInfo(topZone).color }}>
          <span className="dot" />
          {zoneInfo(topZone).short}
        </span>
      </div>

      <div className="stagger">
        <div className="card">
          <div className="grid3" style={{ gap: 14 }}>
            <div>
              <div className="eyebrow">Time</div>
              <div className="num" style={{ fontSize: 30 }}>{fmtClock(t.durMs)}</div>
            </div>
            <div>
              <div className="eyebrow">Distance</div>
              <div className="num" style={{ fontSize: 30 }}>
                {t.distM > 30 ? fmtDistance(t.distM, s.units, 2) : '--'}
                <span style={{ fontSize: 12, color: 'var(--dim)', marginLeft: 3 }}>{unit}</span>
              </div>
            </div>
            <div>
              <div className="eyebrow">Avg HR</div>
              <div className="num" style={{ fontSize: 30, color: zoneInfo(topZone).color }}>
                {t.avgHr ?? '--'}
              </div>
            </div>
          </div>
        </div>

        {pts.length > 3 && (
          <div className="card" style={{ marginTop: 10, padding: 8 }}>
            <RouteTrace points={pts} />
          </div>
        )}

        <div className="grid2" style={{ marginTop: 10 }}>
          <Tile k="Avg pace" v={avgPace ? fmtPace(avgPace) : '--'} u={`/${unit}`} />
          <Tile k="Max HR" v={t.maxHr ?? '--'} u="bpm" />
          <Tile k="Calories" v={t.kcal} u="kcal" />
          <Tile k="Ascent" v={t.ascentM || 0} u="m" />
        </div>

        <h2 className="section">Heart rate</h2>
        <div className="card" style={{ padding: '16px 10px 10px' }}>
          <HrChart samples={session.samples} zones={session.zones} />
        </div>

        <h2 className="section">Time in zone</h2>
        <div className="card">
          <ZoneDist zoneMs={t.zoneMs} />
        </div>

        {session.laps.length > 1 && (
          <>
            <h2 className="section">Splits</h2>
            <div className="card" style={{ padding: '6px 4px' }}>
              <Splits session={session} units={s.units} />
            </div>
          </>
        )}

        {fresh && (
          <>
            <h2 className="section">Name it</h2>
            <input
              type="text"
              value={title}
              placeholder={`${label} · ${fmtTime(session.startedAt)}`}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
          </>
        )}

        <div style={{ height: 22 }} />

        {fresh ? (
          <div className="grid2">
            <button className="btn danger" onClick={discard}>
              <ITrash size={16} /> Discard
            </button>
            <button className="btn solid" onClick={save} disabled={saving}>
              <ICheck size={16} /> Save
            </button>
          </div>
        ) : (
          <div className="grid2">
            <button
              className="btn"
              onClick={() => download(`kardio-${new Date(session.startedAt).toISOString().slice(0, 16).replace(/[:T]/g, '')}.gpx`, toGPX(session), 'application/gpx+xml')}
              disabled={pts.length < 3}
            >
              <IShare size={16} /> Export GPX
            </button>
            <button className="btn danger" onClick={del}>
              <ITrash size={16} /> Delete
            </button>
          </div>
        )}
        <p className="note">
          {session.deviceName ? `Recorded from ${session.deviceName}. ` : ''}
          Calories are an estimate from heart rate, weight and age.
        </p>
      </div>
    </div>
  )
}

function Splits({ session, units }: { session: Session; units: 'km' | 'mi' }) {
  const unitM = units === 'mi' ? MI : 1000
  const laps = session.laps.filter((l) => l.t1 > l.t0)
  const paces = laps.map((l) => (l.distM > 20 ? (l.t1 - l.t0) / 1000 / (l.distM / unitM) : null))
  const valid = paces.filter((p): p is number => p != null)
  const best = valid.length ? Math.min(...valid) : 0
  const worst = valid.length ? Math.max(...valid) : 1

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 62px 58px', gap: 10, padding: '8px 12px 2px' }}>
        <span className="eyebrow">lap</span>
        <span />
        <span className="eyebrow" style={{ textAlign: 'right' }}>pace</span>
        <span className="eyebrow" style={{ textAlign: 'right' }}>bpm</span>
      </div>
      {laps.map((l, i) => {
        const p = paces[i]
        const w = p && worst > best ? 22 + ((worst - p) / (worst - best)) * 76 : 60
        return (
          <div
            key={l.n}
            style={{
              display: 'grid',
              gridTemplateColumns: '30px 1fr 62px 58px',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderTop: '1px solid var(--line)',
              fontSize: 13,
            }}
          >
            <span className="num" style={{ fontSize: 13, color: 'var(--dim)' }}>{l.n}</span>
            <span style={{ height: 20, borderRadius: 5, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <i
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${w}%`,
                  background: 'var(--zone)',
                  opacity: 0.7,
                  borderRadius: 5,
                }}
              />
            </span>
            <span className="num" style={{ fontSize: 14, textAlign: 'right' }}>
              {p ? fmtPace(p) : fmtClock(l.t1 - l.t0)}
            </span>
            <span className="num" style={{ fontSize: 14, textAlign: 'right', color: 'var(--muted)' }}>
              {l.avgHr ?? '--'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
