export const MI = 1609.344

export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`
}

export function fmtShortDur(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function distValue(m: number, units: 'km' | 'mi') {
  return units === 'mi' ? m / MI : m / 1000
}

export function fmtDistance(m: number, units: 'km' | 'mi', dp = 2) {
  return distValue(m, units).toFixed(dp)
}

export const distUnit = (units: 'km' | 'mi') => (units === 'mi' ? 'mi' : 'km')

/** seconds per km/mi from m/s */
export function paceFromSpeed(mps: number, units: 'km' | 'mi') {
  if (!mps || mps < 0.28) return null
  const perUnit = units === 'mi' ? MI : 1000
  return perUnit / mps
}

export function fmtPace(secPerUnit: number | null) {
  if (secPerUnit == null || !isFinite(secPerUnit) || secPerUnit > 3599) return '--:--'
  const m = Math.floor(secPerUnit / 60)
  const s = Math.round(secPerUnit % 60)
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`
}

export function fmtSpeed(mps: number, units: 'km' | 'mi') {
  const v = units === 'mi' ? (mps * 3600) / MI : (mps * 3600) / 1000
  return v.toFixed(1)
}

export function fmtDay(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  const y = new Date(Date.now() - 864e5)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, y)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
