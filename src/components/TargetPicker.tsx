import { ZONE_META } from '../lib/zones'
import { useSettings, setSettings } from '../lib/store'
import { HAPTICS } from '../lib/haptics'

/**
 * The single most important control in the app: pick a zone and Kardio will
 * talk you back into it whenever you drift out.
 */
export function TargetPicker({ compact = false }: { compact?: boolean }) {
  const s = useSettings()
  const pick = (z: number | null) => {
    HAPTICS.tap()
    setSettings({ targetZone: z })
  }
  return (
    <div>
      <div className="modes" style={{ margin: 0, padding: 0 }}>
        <button className="mode" aria-pressed={s.targetZone == null} onClick={() => pick(null)} style={{ ['--zone' as string]: '#8a93a6' }}>
          Free
        </button>
        {ZONE_META.map((z, i) => (
          <button
            key={z.short}
            className="mode"
            aria-pressed={s.targetZone === i + 1}
            onClick={() => pick(i + 1)}
            style={{ ['--zone' as string]: z.color }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 99, background: z.color, display: 'inline-block' }} />
            {z.short}
            {!compact && (
              <span style={{ fontWeight: 500, opacity: 0.75 }}>
                {s.zones[i]?.[0]}–{s.zones[i]?.[1]}
              </span>
            )}
          </button>
        ))}
      </div>
      {!compact && (
        <p className="note">
          {s.targetZone
            ? `Drift out of ${ZONE_META[s.targetZone - 1].name.toLowerCase()} and you get a buzz and a word — three short pulses to lift the pace, two long ones to back off.`
            : 'Free run. Kardio calls out each zone change but never nags you.'}
        </p>
      )}
    </div>
  )
}
