import type { ZoneModel } from './types'

export const ZONE_META = [
  { short: 'Z1', name: 'Recovery', color: '#3DD9EB', blurb: 'Warm-up. You could hold a conversation forever.' },
  { short: 'Z2', name: 'Endurance', color: '#38E08A', blurb: 'Aerobic base. Full sentences, nose breathing.' },
  { short: 'Z3', name: 'Tempo', color: '#F5D547', blurb: 'Comfortably hard. Short sentences only.' },
  { short: 'Z4', name: 'Threshold', color: '#FF8A3D', blurb: 'Hard. A few words at a time.' },
  { short: 'Z5', name: 'VO₂ Max', color: '#FF4D6D', blurb: 'All out. No talking.' },
] as const

export const BELOW = { short: '—', name: 'Resting', color: '#5A6274', blurb: 'Below zone 1.' }

export function zoneInfo(z: number) {
  return z >= 1 && z <= 5 ? ZONE_META[z - 1] : BELOW
}

/** Tanaka: more accurate across ages than 220 − age. */
export function estMaxHr(age: number) {
  return Math.round(208 - 0.7 * age)
}

const PCT: Record<Exclude<ZoneModel, 'manual'>, [number, number][]> = {
  // % of max HR
  max: [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.0]],
  // % of heart-rate reserve (Karvonen)
  hrr: [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.0]],
  // % of lactate-threshold HR (Friel)
  lthr: [[0.65, 0.81], [0.81, 0.89], [0.9, 0.94], [0.94, 1.0], [1.0, 1.06]],
}

export function computeZones(
  model: ZoneModel,
  o: { maxHr: number; restHr: number; lthr: number },
): [number, number][] {
  if (model === 'manual') return []
  const pct = PCT[model]
  return pct.map(([a, b]) => {
    if (model === 'hrr') {
      const r = o.maxHr - o.restHr
      return [Math.round(o.restHr + r * a), Math.round(o.restHr + r * b)] as [number, number]
    }
    const base = model === 'lthr' ? o.lthr : o.maxHr
    return [Math.round(base * a), Math.round(base * b)] as [number, number]
  })
}

/** 0 = below zone 1, otherwise 1..5. */
export function zoneFor(hr: number | null, zones: [number, number][]): number {
  if (hr == null || !zones.length) return 0
  if (hr >= zones[4][0]) return 5
  for (let i = 4; i >= 0; i--) if (hr >= zones[i][0]) return i + 1
  return 0
}

/** 0..1 position of hr across the whole trainable range, for gauges. */
export function gaugePos(hr: number, zones: [number, number][], restHr: number) {
  const lo = Math.min(restHr, zones[0]?.[0] ?? 90)
  const hi = zones[4]?.[1] ?? 190
  return Math.max(0, Math.min(1, (hr - lo) / Math.max(1, hi - lo)))
}
