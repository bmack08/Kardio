/**
 * Vibration vocabulary. The grammar is deliberate:
 *   short pulses  = do more (lift the pace)
 *   long pulses   = do less (ease off)
 *   N pulses      = you are in zone N
 * After a week you stop needing the voice at all.
 */

export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator

let enabled = true
export const setHaptics = (v: boolean) => { enabled = v }

function buzz(pattern: number | number[]) {
  if (!enabled || !canVibrate()) return
  try { navigator.vibrate(pattern) } catch { /* ignore */ }
}

export const HAPTICS = {
  zone: (z: number) => buzz(z <= 0 ? [60] : Array.from({ length: z * 2 - 1 }, (_, i) => (i % 2 ? 70 : 95))),
  speedUp: () => buzz([70, 70, 70, 70, 70]),
  easeOff: () => buzz([400, 130, 400]),
  onTarget: () => buzz([45, 55, 45]),
  lap: () => buzz([30, 55, 30]),
  start: () => buzz([160]),
  stop: () => buzz([200, 90, 200, 90, 200]),
  lost: () => buzz([90, 60, 90, 60, 350]),
  tap: () => buzz(12),
  stopAll: () => buzz(0),
}
