import { useId } from 'react'
import { ZONE_META } from '../lib/zones'
import { projectPath, type LatLon } from '../lib/geo'
import type { Sample } from '../lib/types'
import { fmtShortDur } from '../lib/format'

/** Five bands. The one you are in swells and lights up; the rest keep score. */
export function ZoneBar({ zoneMs, current }: { zoneMs: number[]; current: number }) {
  const total = Math.max(1, zoneMs.reduce((a, b) => a + b, 0))
  return (
    <div className="zonebar" aria-label="Time in zone">
      {ZONE_META.map((z, i) => {
        const share = (zoneMs[i + 1] ?? 0) / total
        return (
          <div key={z.short} className="zs" data-on={current === i + 1} style={{ ['--c' as string]: z.color }}>
            <i className="fill" style={{ height: `${Math.min(100, share * 100).toFixed(1)}%` }} />
            <span>{z.short}</span>
          </div>
        )
      })}
    </div>
  )
}

/** HR over time, coloured by the zone it was in — the gradient is the zone map. */
export function HrChart({ samples, zones }: { samples: Sample[]; zones: [number, number][] }) {
  const gid = useId().replace(/:/g, '')
  const pts = samples.filter((s) => s.hr != null)
  if (pts.length < 3) return <div className="empty" style={{ padding: 24 }}>No heart-rate data</div>

  const W = 340
  const H = 92
  const step = Math.max(1, Math.floor(pts.length / 340))
  const use = pts.filter((_, i) => i % step === 0)
  const hrs = use.map((s) => s.hr!)
  const lo = Math.min(...hrs, zones[0]?.[0] ?? 100) - 6
  const hi = Math.max(...hrs, zones[3]?.[1] ?? 170) + 6
  const t0 = use[0].t
  const t1 = use[use.length - 1].t || 1
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * W
  const y = (v: number) => H - ((v - lo) / Math.max(1, hi - lo)) * H
  const off = (v: number) => Math.max(0, Math.min(1, (hi - v) / (hi - lo)))

  const d = use.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)} ${y(s.hr!).toFixed(1)}`).join('')
  const area = `${d}L${W} ${H}L0 ${H}Z`

  const bounds = [lo, zones[0][0], zones[1][0], zones[2][0], zones[3][0], zones[4][0], hi]
  const colors = ['#5b6377', ...ZONE_META.map((z) => z.color)]
  const stops: { o: number; c: string }[] = []
  for (let i = colors.length - 1; i >= 0; i--) {
    stops.push({ o: off(bounds[i + 1]), c: colors[i] })
    stops.push({ o: off(bounds[i]), c: colors[i] })
  }

  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Heart rate over time">
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
          {stops.map((s, i) => (
            <stop key={i} offset={`${(s.o * 100).toFixed(2)}%`} stopColor={s.c} />
          ))}
        </linearGradient>
        <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--zone)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--zone)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {zones.map(([a], i) => (
        <line key={i} x1="0" x2={W} y1={y(a)} y2={y(a)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#a${gid})`} />
      <path d={d} fill="none" stroke={`url(#g${gid})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function RouteTrace({ points }: { points: LatLon[] }) {
  const gid = useId().replace(/:/g, '')
  if (points.length < 3) return null
  const W = 340
  const H = 190
  const { d, pts } = projectPath(points, W, H, 16)
  const a = pts[0]
  const b = pts[pts.length - 1]
  return (
    <svg className="trace" viewBox={`0 0 ${W} ${H}`} aria-label="Route">
      <defs>
        <filter id={`bl${gid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <path d={d} fill="none" stroke="var(--zone)" strokeWidth="7" opacity="0.32" filter={`url(#bl${gid})`} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--zone)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={a[0]} cy={a[1]} r="4.6" fill="#0a0c12" stroke="#38e08a" strokeWidth="2.4" />
      <circle cx={b[0]} cy={b[1]} r="4.6" fill="#0a0c12" stroke="#ff4d6d" strokeWidth="2.4" />
    </svg>
  )
}

export function ZoneDist({ zoneMs }: { zoneMs: number[] }) {
  const inZones = zoneMs.slice(1)
  const peak = Math.max(1, ...inZones)
  const total = Math.max(1, zoneMs.reduce((a, b) => a + b, 0))
  return (
    <div className="dist">
      {ZONE_META.map((z, i) => {
        const ms = inZones[i] ?? 0
        return (
          <div className="drow" key={z.short} style={{ ['--c' as string]: z.color }}>
            <span className="tg">{z.short}</span>
            <span className="bar">
              <i style={{ width: `${(ms / peak) * 100}%` }} />
            </span>
            <span className="tm">
              {fmtShortDur(ms)} · {Math.round((ms / total) * 100)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
