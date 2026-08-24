import { useEffect, useRef } from 'react'

/** Holds the screen awake during a workout, and re-takes the lock after tab switches. */
export function useWakeLock(active: boolean) {
  const ref = useRef<any>(null)
  useEffect(() => {
    let dead = false
    const request = async () => {
      if (!active || dead) return
      try {
        ref.current = await (navigator as any).wakeLock?.request('screen')
      } catch {
        /* denied or unsupported — not fatal, the cues are the point */
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') request()
    }
    if (active) {
      request()
      document.addEventListener('visibilitychange', onVis)
    }
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', onVis)
      try {
        ref.current?.release?.()
      } catch {
        /* ignore */
      }
      ref.current = null
    }
  }, [active])
}
