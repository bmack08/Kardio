import { useEffect, useState } from 'react'
import { allSessions, deleteSession, saveSession } from './db'
import type { Session } from './types'

let cache: Session[] | null = null
const subs = new Set<() => void>()

async function load() {
  cache = await allSessions()
  subs.forEach((f) => f())
}

export function useSessions() {
  const [list, setList] = useState<Session[] | null>(cache)
  useEffect(() => {
    const f = () => setList(cache ? [...cache] : null)
    subs.add(f)
    if (cache === null) load()
    else f()
    return () => {
      subs.delete(f)
    }
  }, [])
  return list
}

export async function commitSession(s: Session) {
  await saveSession(s)
  await load()
}

export async function removeSession(id: string) {
  await deleteSession(id)
  await load()
}

export async function reloadSessions() {
  await load()
}

/** Rolling 7-day totals for the home strip. */
export function weekOf(list: Session[]) {
  const days: { key: string; label: string; ms: number; dist: number; today: boolean }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    d.setHours(0, 0, 0, 0)
    days.push({
      key: d.toDateString(),
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      ms: 0,
      dist: 0,
      today: i === 0,
    })
  }
  const idx = new Map(days.map((d, i) => [d.key, i]))
  for (const s of list) {
    const k = new Date(s.startedAt).toDateString()
    const i = idx.get(k)
    if (i != null) {
      days[i].ms += s.totals.durMs
      days[i].dist += s.totals.distM
    }
  }
  return days
}
