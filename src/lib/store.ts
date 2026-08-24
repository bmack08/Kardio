import { useSyncExternalStore } from 'react'
import type { Settings } from './types'
import { computeZones, estMaxHr } from './zones'

const KEY = 'kardio.settings.v1'

const AGE = 35
const MAX = estMaxHr(AGE)

export const DEFAULTS: Settings = {
  units: 'mi',
  age: AGE,
  weightKg: 80,
  restHr: 55,
  maxHr: MAX,
  lthr: Math.round(MAX * 0.88),
  zoneModel: 'max',
  zones: computeZones('max', { maxHr: MAX, restHr: 55, lthr: Math.round(MAX * 0.88) }),
  targetZone: 2,
  cues: {
    enabled: true,
    voice: true,
    voiceURI: null,
    voiceRate: 1.05,
    tones: true,
    volume: 0.85,
    haptics: true,
    onZoneChange: true,
    nagSeconds: 25,
    dwellSeconds: 4,
    deadband: 2,
    periodic: 'dist',
    announceMetrics: true,
  },
  gps: true,
  autoPause: true,
  keepScreenOn: true,
  eyesFreeDefault: false,
  device: { name: null, id: null },
  onboarded: false,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw)
    return { ...DEFAULTS, ...p, cues: { ...DEFAULTS.cues, ...(p.cues ?? {}) }, device: { ...DEFAULTS.device, ...(p.device ?? {}) } }
  } catch {
    return DEFAULTS
  }
}

let state: Settings = load()
const subs = new Set<() => void>()

export const settings = () => state

export function setSettings(patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch { /* private mode — run anyway */ }
  subs.forEach((f) => f())
}

export const setCues = (patch: Partial<Settings['cues']>) =>
  setSettings((s) => ({ cues: { ...s.cues, ...patch } }))

/** Recompute zone bounds from the current model unless the user went manual. */
export function refreshZones(over: Partial<Settings> = {}) {
  const s = { ...state, ...over }
  if (s.zoneModel === 'manual') return setSettings(over)
  setSettings({ ...over, zones: computeZones(s.zoneModel, s) })
}

export function resetSettings() {
  state = { ...DEFAULTS }
  localStorage.removeItem(KEY)
  subs.forEach((f) => f())
}

function subscribe(f: () => void) {
  subs.add(f)
  return () => { subs.delete(f) }
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, settings, settings)
}
