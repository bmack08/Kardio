export type Mode = 'run' | 'walk' | 'ride' | 'indoor' | 'other'

export const MODES: { id: Mode; label: string; icon: string; gps: boolean }[] = [
  { id: 'run', label: 'Run', icon: 'run', gps: true },
  { id: 'walk', label: 'Walk', icon: 'walk', gps: true },
  { id: 'ride', label: 'Ride', icon: 'ride', gps: true },
  { id: 'indoor', label: 'Indoor', icon: 'indoor', gps: false },
  { id: 'other', label: 'Cardio', icon: 'other', gps: false },
]

/** One second of recorded truth. */
export type Sample = {
  t: number // ms since session start
  hr: number | null
  lat: number | null
  lon: number | null
  alt: number | null
  d: number // cumulative metres
  v: number // instantaneous m/s (smoothed)
}

export type Lap = {
  n: number
  t0: number
  t1: number
  distM: number
  avgHr: number | null
  maxHr: number | null
}

export type Totals = {
  durMs: number
  movingMs: number
  distM: number
  avgHr: number | null
  maxHr: number | null
  minHr: number | null
  kcal: number
  ascentM: number
  /** ms spent in zone 0..5 (0 = below zone 1) */
  zoneMs: number[]
}

export type Session = {
  id: string
  startedAt: number // epoch ms
  endedAt: number
  mode: Mode
  title: string
  notes: string
  deviceName: string | null
  totals: Totals
  laps: Lap[]
  samples: Sample[]
  /** zone bounds in effect during the session, so summaries stay honest later */
  zones: [number, number][]
}

export type ZoneModel = 'max' | 'hrr' | 'lthr' | 'manual'

export type CueSettings = {
  enabled: boolean
  voice: boolean
  voiceURI: string | null
  voiceRate: number
  tones: boolean
  volume: number
  haptics: boolean
  onZoneChange: boolean
  /** seconds between nudges while outside the target zone */
  nagSeconds: number
  /** seconds a new zone must hold before it counts (kills boundary chatter) */
  dwellSeconds: number
  /** bpm you must clear past a boundary before the zone flips */
  deadband: number
  periodic: 'off' | 'dist' | '5min' | '10min'
  announceMetrics: boolean
}

export type Settings = {
  units: 'km' | 'mi'
  age: number
  weightKg: number
  restHr: number
  maxHr: number
  lthr: number
  zoneModel: ZoneModel
  /** bpm bounds for zones 1..5 */
  zones: [number, number][]
  targetZone: number | null // 1..5
  cues: CueSettings
  gps: boolean
  autoPause: boolean
  keepScreenOn: boolean
  eyesFreeDefault: boolean
  device: { name: string | null; id: string | null }
  onboarded: boolean
}
