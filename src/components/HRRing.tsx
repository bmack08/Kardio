import { ZONE_META, zoneFor } from '../lib/zones'

const A0 = 137
const SWEEP = 266
const R = 43
const C = 50

const pol = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}

function arc(r: number, d0: number, d1: number) {
  if (d1 - d0 < 0.4) return ''
  const [x0, y0] = pol(r, d0)
  const [x1, y1] = pol(r, d1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/**
 * The dial is the zone map. Every band is a real training zone drawn to scale,
 * so where the marker sits tells you the answer before you read the number.
 */
export function HRRing({
  hr,
  zones,
  restHr,
  target,
  stale,
}: {
  hr: number | null
  zones: [number, number][]
  restHr: number
  target: number | null
  stale: boolean
}) {
  // start the dial just under zone 1 — a third of the sweep spent on resting HR is wasted glass
  const lo = Math.max(restHr, (zones[0]?.[0] ?? 95) - 14)
  const hi = zones[4]?.[1] ?? 190
  const f = (v: number) => Math.max(0, Math.min(1, (v - lo) / Math.max(1, hi - lo)))
  const deg = (v: number) => A0 + f(v) * SWEEP
  const z = zoneFor(hr, zones)
  const knob = hr != null ? pol(R, deg(hr)) : null

  return (
    <svg viewBox="0 0 100 100" className="dial" aria-hidden>
      <defs>
        <filter id="ringGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* base track */}
      <path d={arc(R, A0, A0 + SWEEP)} stroke="rgba(255,255,255,0.07)" strokeWidth="6.5" fill="none" strokeLinecap="round" />

      {/* below zone 1 */}
      <path d={arc(R, A0, deg(zones[0]?.[0] ?? lo))} stroke="rgba(255,255,255,0.14)" strokeWidth="6.5" fill="none" strokeLinecap="round" />

      {zones.map(([a, b], i) => {
        const on = z === i + 1
        const isTarget = target === i + 1
        return (
          <g key={i}>
            <path
              d={arc(R, deg(a) + 0.9, deg(b) - 0.9)}
              stroke={ZONE_META[i].color}
              strokeWidth={on ? 8.5 : 6.5}
              opacity={on ? 1 : isTarget ? 0.75 : 0.45}
              fill="none"
              strokeLinecap="round"
              filter={on ? 'url(#ringGlow)' : undefined}
              style={{ transition: 'stroke-width 400ms, opacity 400ms' }}
            />
            {isTarget && (
              <path
                d={arc(R + 6.4, deg(a) + 1.4, deg(b) - 1.4)}
                stroke={ZONE_META[i].color}
                strokeWidth="1.6"
                opacity="0.95"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="2.4 2.4"
              />
            )}
          </g>
        )
      })}

      {knob && !stale && (
        <g style={{ transition: 'transform 700ms cubic-bezier(.22,1,.36,1)' }}>
          <circle cx={knob[0]} cy={knob[1]} r="7" fill="var(--zone)" opacity="0.3" />
          <circle cx={knob[0]} cy={knob[1]} r="3.4" fill="#06070a" stroke="#edf0f7" strokeWidth="2.1" />
        </g>
      )}
    </svg>
  )
}
