/**
 * Standard BLE Heart Rate Profile (0x180D). Whoop 4.0 / 5.0 / MG expose exactly
 * this once "Broadcast Heart Rate" is switched on in the Whoop app, so we pair
 * with it the same way we would a Polar or Garmin strap — no Whoop API, no
 * account, no cloud round-trip. Works with any HR strap you own.
 */

const HR_SERVICE = 'heart_rate'
const HR_CHAR = 'heart_rate_measurement'
const BATT_SERVICE = 'battery_service'
const BATT_CHAR = 'battery_level'

export type LinkStatus =
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type HrPacket = { hr: number; rr: number[]; contact: boolean | null; at: number }

function parse(dv: DataView): HrPacket {
  const flags = dv.getUint8(0)
  let i = 1
  const wide = (flags & 0x1) === 1
  const hr = wide ? dv.getUint16(i, true) : dv.getUint8(i)
  i += wide ? 2 : 1
  const contactBits = (flags >> 1) & 0x3
  const contact = contactBits < 2 ? null : contactBits === 3
  if (flags & 0x8) i += 2 // energy expended
  const rr: number[] = []
  if (flags & 0x10) {
    while (i + 1 < dv.byteLength) {
      rr.push(Math.round((dv.getUint16(i, true) / 1024) * 1000))
      i += 2
    }
  }
  return { hr, rr, contact, at: Date.now() }
}

export class HrmLink {
  status: LinkStatus = typeof navigator !== 'undefined' && 'bluetooth' in navigator ? 'idle' : 'unsupported'
  deviceName: string | null = null
  deviceId: string | null = null
  battery: number | null = null
  lastError: string | null = null

  onPacket: ((p: HrPacket) => void) | null = null
  onChange: (() => void) | null = null

  private device: BluetoothDevice | null = null
  private char: BluetoothRemoteGATTCharacteristic | null = null
  private retries = 0
  private retryTimer: number | null = null
  private wanted = false

  static get supported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  private set(s: LinkStatus, err?: string | null) {
    this.status = s
    if (err !== undefined) this.lastError = err
    this.onChange?.()
  }

  /** Opens the OS chooser — must be called straight from a tap. */
  async pair() {
    if (!HrmLink.supported) return this.set('unsupported')
    try {
      this.set('requesting', null)
      const d = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE] }],
        optionalServices: [BATT_SERVICE],
      })
      this.device = d
      this.deviceId = d.id
      this.deviceName = d.name ?? 'Heart rate strap'
      this.wanted = true
      await this.attach()
    } catch (e: any) {
      if (e?.name === 'NotFoundError') this.set('idle', null) // user closed the picker
      else this.set('error', e?.message ?? String(e))
    }
  }

  /** Reconnect to an already-permitted strap with no chooser (Chrome 85+). */
  async resume(id: string | null) {
    if (!HrmLink.supported || !id) return false
    try {
      const known = await (navigator.bluetooth as any).getDevices?.()
      const d: BluetoothDevice | undefined = known?.find((x: BluetoothDevice) => x.id === id)
      if (!d) return false
      this.device = d
      this.deviceId = d.id
      this.deviceName = d.name ?? 'Heart rate strap'
      this.wanted = true
      await this.attach()
      return true
    } catch {
      return false
    }
  }

  private async attach() {
    const d = this.device
    if (!d) return
    this.set('connecting')
    d.removeEventListener('gattserverdisconnected', this.onDrop)
    d.addEventListener('gattserverdisconnected', this.onDrop)
    const server = await d.gatt!.connect()
    const svc = await server.getPrimaryService(HR_SERVICE)
    this.char = await svc.getCharacteristic(HR_CHAR)
    this.char.removeEventListener('characteristicvaluechanged', this.onValue)
    this.char.addEventListener('characteristicvaluechanged', this.onValue)
    await this.char.startNotifications()
    this.retries = 0
    this.set('connected', null)
    this.readBattery(server)
  }

  private async readBattery(server: BluetoothRemoteGATTServer) {
    try {
      const svc = await server.getPrimaryService(BATT_SERVICE)
      const c = await svc.getCharacteristic(BATT_CHAR)
      const v = await c.readValue()
      this.battery = v.getUint8(0)
      this.onChange?.()
    } catch { /* plenty of straps don't publish it */ }
  }

  private onValue = (e: Event) => {
    const dv = (e.target as BluetoothRemoteGATTCharacteristic).value
    if (dv) this.onPacket?.(parse(dv))
  }

  private onDrop = () => {
    this.char = null
    if (!this.wanted) return this.set('idle')
    this.set('reconnecting')
    this.scheduleRetry()
  }

  private scheduleRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    const wait = Math.min(15000, 800 * 2 ** Math.min(this.retries, 4))
    this.retries++
    this.retryTimer = window.setTimeout(async () => {
      if (!this.wanted) return
      try {
        await this.attach()
      } catch {
        this.scheduleRetry()
      }
    }, wait)
  }

  forget() {
    this.wanted = false
    if (this.retryTimer) clearTimeout(this.retryTimer)
    try { this.device?.gatt?.disconnect() } catch { /* ignore */ }
    this.device = null
    this.char = null
    this.deviceId = null
    this.deviceName = null
    this.battery = null
    this.set('idle', null)
  }
}

export const hrm = new HrmLink()
