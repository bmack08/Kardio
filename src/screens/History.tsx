import type { Session } from '../lib/types'
import { SessionRow } from './Today'
import { useSettings } from '../lib/store'
import { useSessions } from '../lib/sessions'
import { distUnit, fmtDistance, fmtShortDur } from '../lib/format'
import { ZONE_META } from '../lib/zones'

export function History({ onOpen }: { onOpen: (s: Session) => void }) {
  const s = useSettings()
  const list = useSessions()

  if (!list) return <div className="scroll"><div className="empty">Loading…</div></div>

  const groups = new Map<string, Session[]>()
  for (const x of list) {
    const k = new Date(x.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(x)
  }

  const totalMs = list.reduce((a, b) => a + b.totals.durMs, 0)
  const totalM = list.reduce((a, b) => a + b.totals.distM, 0)
  const zoneMs = list.reduce((acc, b) => {
    b.totals.zoneMs.forEach((v, i) => (acc[i] = (acc[i] ?? 0) + v))
    return acc
  }, [] as number[])
  const inZone = zoneMs.slice(1)
  const zTotal = Math.max(1, inZone.reduce((a, b) => a + b, 0))

  return (
    <div className="scroll">
      <div className="topbar">
        <h1 className="title">History</h1>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <b>No sessions yet</b>
          Everything you record lands here — stored on this phone, not a server.
        </div>
      ) : (
        <div className="stagger">
          <div className="card">
            <div className="grid3" style={{ gap: 14, marginBottom: 16 }}>
              <div>
                <div className="eyebrow">Sessions</div>
                <div className="num" style={{ fontSize: 27 }}>{list.length}</div>
              </div>
              <div>
                <div className="eyebrow">Time</div>
                <div className="num" style={{ fontSize: 27 }}>{fmtShortDur(totalMs)}</div>
              </div>
              <div>
                <div className="eyebrow">Distance</div>
                <div className="num" style={{ fontSize: 27 }}>
                  {fmtDistance(totalM, s.units, 1)}
                  <span style={{ fontSize: 12, color: 'var(--dim)', marginLeft: 3 }}>{distUnit(s.units)}</span>
                </div>
              </div>
            </div>
            <div className="eyebrow" style={{ marginBottom: 7 }}>Lifetime zone mix</div>
            <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
              {ZONE_META.map((z, i) => (
                <i
                  key={z.short}
                  title={z.name}
                  style={{
                    width: `${((inZone[i] ?? 0) / zTotal) * 100}%`,
                    background: z.color,
                    display: 'block',
                    minWidth: (inZone[i] ?? 0) > 0 ? 4 : 0,
                  }}
                />
              ))}
            </div>
          </div>

          {[...groups.entries()].map(([month, items]) => (
            <div key={month}>
              <h2 className="section">{month}</h2>
              <div className="list">
                {items.map((x) => (
                  <SessionRow key={x.id} s={x} units={s.units} onOpen={() => onOpen(x)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
