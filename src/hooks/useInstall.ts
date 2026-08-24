import { useEffect, useState } from 'react'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BIPEvent | null = null
const subs = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
    subs.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    subs.forEach((f) => f())
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)

export function useInstall() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  }, [])
  return {
    canInstall: !!deferred && !isStandalone(),
    installed: isStandalone(),
    install: async () => {
      if (!deferred) return
      await deferred.prompt()
      await deferred.userChoice
      deferred = null
      subs.forEach((f) => f())
    },
  }
}
