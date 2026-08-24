/**
 * Tone engine. Short, pitched blips designed to cut through music without
 * stopping it, plus a silent keep-alive loop so Android keeps giving us audio
 * focus (and background execution) once the screen goes off.
 */

export type Note = { f: number; d: number; gap?: number; type?: OscillatorType; gain?: number }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let keepAlive: HTMLAudioElement | null = null
let unlocked = false

function silentWav(seconds = 1) {
  const rate = 8000
  const n = rate * seconds
  const bytes = 44 + n * 2
  const b = new ArrayBuffer(bytes)
  const v = new DataView(b)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)
  let s = ''
  const u8 = new Uint8Array(b)
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  return 'data:audio/wav;base64,' + btoa(s)
}

/** Must be called from a user gesture (the Start button does it). */
export async function unlockAudio(volume = 0.85) {
  if (!ctx) {
    const AC: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext
    ctx = new AC({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
  if (!keepAlive) {
    keepAlive = new Audio(silentWav(1))
    keepAlive.loop = true
    keepAlive.volume = 0.001
    ;(keepAlive as any).playsInline = true
  }
  unlocked = true
  return ctx.state === 'running'
}

export function setVolume(v: number) {
  if (master) master.gain.value = v
}

/** Hold audio focus so cues still fire with the screen off. */
export async function startKeepAlive() {
  if (!unlocked) await unlockAudio()
  try { await keepAlive?.play() } catch { /* ignore */ }
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
}

export function stopKeepAlive() {
  keepAlive?.pause()
}

export function audioReady() {
  return !!ctx && ctx.state === 'running'
}

export function resumeIfNeeded() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {})
}

export function play(notes: Note[]) {
  if (!ctx || !master) return
  resumeIfNeeded()
  let t = ctx.currentTime + 0.02
  for (const n of notes) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = n.type ?? 'triangle'
    osc.frequency.setValueAtTime(n.f, t)
    const peak = n.gain ?? 0.9
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + n.d)
    osc.connect(g).connect(master)
    osc.start(t)
    osc.stop(t + n.d + 0.02)
    t += n.d + (n.gap ?? 0.035)
  }
}

/* ---------- the vocabulary ---------- */

const ZONE_ROOT = [0, 392, 466, 554, 659, 784] // G4 · A#4 · C#5 · E5 · G5

export const TONES = {
  /** Zone N: N rising blips. You can count them without looking. */
  zone(z: number): Note[] {
    if (z <= 0) return [{ f: 300, d: 0.12, type: 'sine' }]
    const root = ZONE_ROOT[z]
    return Array.from({ length: z }, (_, i) => ({ f: root * (1 + i * 0.06), d: 0.075, gap: 0.045 }))
  },
  /** Below target — rising fifth, "lift it". */
  speedUp: [{ f: 587, d: 0.085 }, { f: 880, d: 0.14 }] as Note[],
  /** Above target — falling fifth, "back off". */
  easeOff: [{ f: 880, d: 0.1 }, { f: 523, d: 0.19, type: 'sine' as OscillatorType }] as Note[],
  /** Back inside the target — a small reward. */
  onTarget: [{ f: 784, d: 0.07 }, { f: 1175, d: 0.11 }] as Note[],
  lap: [{ f: 1245, d: 0.05 }, { f: 1245, d: 0.05 }] as Note[],
  start: [{ f: 523, d: 0.08 }, { f: 659, d: 0.08 }, { f: 1046, d: 0.16 }] as Note[],
  stop: [{ f: 880, d: 0.1 }, { f: 587, d: 0.1 }, { f: 392, d: 0.22, type: 'sine' as OscillatorType }] as Note[],
  tick: [{ f: 1000, d: 0.04, gain: 0.5 }] as Note[],
  /** HR link dropped. */
  lost: [{ f: 440, d: 0.09 }, { f: 330, d: 0.09 }, { f: 247, d: 0.16 }] as Note[],
}
