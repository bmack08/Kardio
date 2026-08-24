import { useEffect, type ReactNode } from 'react'
import { zoneInfo } from '../lib/zones'
import { IClose } from './Icons'

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/** Paints the entire app in the colour of the zone you are currently in. */
export function ZoneTheme({ zone, bpm }: { zone: number; bpm: number | null }) {
  const color = zoneInfo(zone).color
  useEffect(() => {
    const r = document.documentElement
    r.style.setProperty('--zone', color)
    r.style.setProperty('--zone-soft', hexA(color, 0.17))
    const m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', zone > 0 ? '#0a0c12' : '#06070a')
  }, [color, zone])
  useEffect(() => {
    const d = bpm && bpm > 30 ? 60 / bpm : 1.1
    document.documentElement.style.setProperty('--beat', `${d.toFixed(3)}s`)
  }, [bpm])
  return null
}

export function Wordmark() {
  return (
    <div className="wordmark">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M1.6 12h4.2l1.6-4.4 3.1 9.2 2.5-7 1.9 4.4 1.3-2.2h6.2"
          stroke="var(--zone)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Kardio
    </div>
  )
}

export function Tile({ k, v, u }: { k: string; v: ReactNode; u?: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className="v">
        {v}
        {u && <span className="u">{u}</span>}
      </div>
    </div>
  )
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="sw"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      aria-label={on ? 'On' : 'Off'}
    >
      <i />
    </button>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  fmt = (n: number) => String(n),
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  fmt?: (n: number) => string
}) {
  const set = (d: number) => onChange(Math.min(max, Math.max(min, Math.round((value + d) * 100) / 100)))
  return (
    <div className="stepper">
      <button onClick={() => set(-step)} aria-label="Decrease">
        −
      </button>
      <span className="n">{fmt(value)}</span>
      <button onClick={() => set(step)} aria-label="Increase">
        +
      </button>
    </div>
  )
}

export function SettingRow({
  label,
  hint,
  end,
  onClick,
}: {
  label: string
  hint?: string
  end?: ReactNode
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="set" onClick={onClick}>
      <span className="lab">
        <b>{label}</b>
        {hint && <span>{hint}</span>}
      </span>
      {end}
    </Tag>
  )
}

export function Sheet({
  title,
  lede,
  onClose,
  children,
}: {
  title: string
  lede?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="row" style={{ marginBottom: 4 }}>
          <h3 style={{ flex: 1 }}>{title}</h3>
          <button className="chip" onClick={onClose} aria-label="Close" style={{ width: 34, padding: 0, justifyContent: 'center' }}>
            <IClose size={16} />
          </button>
        </div>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </div>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
