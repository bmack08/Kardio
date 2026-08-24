import type { Session } from './types'

const DB = 'kardio'
const STORE = 'sessions'
let dbp: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id' })
        s.createIndex('startedAt', 'startedAt')
      }
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  return dbp
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (d) =>
      new Promise<T>((res, rej) => {
        const t = d.transaction(STORE, mode)
        const r = fn(t.objectStore(STORE))
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      }),
  )
}

export const saveSession = (s: Session) => tx('readwrite', (st) => st.put(s))
export const getSession = (id: string) => tx<Session | undefined>('readonly', (st) => st.get(id))
export const deleteSession = (id: string) => tx('readwrite', (st) => st.delete(id))

export async function allSessions(): Promise<Session[]> {
  const list = await tx<Session[]>('readonly', (st) => st.getAll())
  return list.sort((a, b) => b.startedAt - a.startedAt)
}

export async function clearAll() {
  await tx('readwrite', (st) => st.clear())
}
