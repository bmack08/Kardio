import { useSyncExternalStore } from 'react'
import { hrm, type LinkStatus } from './ble'
import { recorder } from './recorder'
import { settings, setSettings } from './store'

export type HrmSnapshot = {
  status: LinkStatus
  name: string | null
  battery: number | null
  error: string | null
  supported: boolean
}

let snap: HrmSnapshot = {
  status: hrm.status,
  name: hrm.deviceName,
  battery: hrm.battery,
  error: hrm.lastError,
  supported: (hrm.constructor as typeof hrm.constructor & { supported: boolean }).supported ?? false,
}

const subs = new Set<() => void>()

function refresh() {
  snap = {
    status: hrm.status,
    name: hrm.deviceName,
    battery: hrm.battery,
    error: hrm.lastError,
    supported: snap.supported,
  }
  subs.forEach((f) => f())
}

hrm.onChange = refresh
hrm.onPacket = (p) => recorder.ingestHr(p.hr)

function subscribe(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

export function useHrm() {
  return useSyncExternalStore(subscribe, () => snap, () => snap)
}

export async function pairStrap() {
  await hrm.pair()
  if (hrm.deviceId) setSettings({ device: { name: hrm.deviceName, id: hrm.deviceId } })
}

export function forgetStrap() {
  hrm.forget()
  setSettings({ device: { name: null, id: null } })
}

/** Silent reconnect on launch, if the browser still holds the permission. */
export async function tryResume() {
  const id = settings().device.id
  if (!id) return false
  return hrm.resume(id)
}
