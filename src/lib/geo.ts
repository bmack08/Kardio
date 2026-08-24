export function haversine(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371000
  const p = Math.PI / 180
  const dLat = (bLat - aLat) * p
  const dLon = (bLon - aLon) * p
  const la1 = aLat * p
  const la2 = bLat * p
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export type LatLon = [number, number]

/** Equirectangular projection into a unit box — good enough at run scale. */
export function projectPath(pts: LatLon[], w: number, h: number, pad = 10) {
  if (pts.length < 2) return { d: '', pts: [] as [number, number][] }
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const [la, lo] of pts) {
    minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la)
    minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo)
  }
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180)
  const kx = Math.cos(midLat)
  const spanX = Math.max(1e-9, (maxLon - minLon) * kx)
  const spanY = Math.max(1e-9, maxLat - minLat)
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY)
  const ox = (w - spanX * scale) / 2
  const oy = (h - spanY * scale) / 2
  const out = pts.map(([la, lo]) => [
    ox + (lo - minLon) * kx * scale,
    h - (oy + (la - minLat) * scale),
  ] as [number, number])
  const d = out.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')
  return { d, pts: out }
}
