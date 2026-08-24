import { Sheet } from './Ui'
import { IBluetooth, ICheck } from './Icons'
import { useHrm, pairStrap, forgetStrap } from '../lib/bleStore'
import { useRecorder } from '../lib/recorder'

const STEPS = [
  'Open the WHOOP app and go to your device settings.',
  'Turn on Broadcast Heart Rate. WHOOP now advertises as a normal Bluetooth strap.',
  'Come back here, tap Link, and pick WHOOP from the chooser.',
]

export function PairSheet({ onClose }: { onClose: () => void }) {
  const link = useHrm()
  const rec = useRecorder()
  const connected = link.status === 'connected'

  return (
    <Sheet
      title={connected ? 'Strap linked' : 'Link your heart rate'}
      lede={
        connected
          ? 'Kardio is reading live beats. It stays linked between sessions and reconnects on its own if the signal drops.'
          : 'Kardio speaks the standard Bluetooth heart-rate profile, so it works with WHOOP, Polar, Garmin, Wahoo TICKR — anything that broadcasts.'
      }
      onClose={onClose}
    >
      {connected ? (
        <div className="card" style={{ textAlign: 'center', padding: 26 }}>
          <div className="num" style={{ fontSize: 58, color: 'var(--zone)' }}>{rec.hrStale ? '--' : rec.hr ?? '--'}</div>
          <div className="eyebrow" style={{ marginTop: 4 }}>bpm from {link.name}</div>
          {link.battery != null && <div className="note">Strap battery {link.battery}%</div>}
        </div>
      ) : (
        <ol style={{ margin: '0 0 18px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((t, i) => (
            <li key={i} className="row" style={{ alignItems: 'flex-start' }}>
              <span
                className="num"
                style={{
                  width: 26,
                  height: 26,
                  flex: 'none',
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--surface-2)',
                  fontSize: 13,
                  color: 'var(--zone)',
                  border: '1px solid var(--line)',
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14.5, lineHeight: 1.45, color: 'var(--muted)' }}>{t}</span>
            </li>
          ))}
        </ol>
      )}

      {link.status === 'unsupported' && (
        <div className="card" style={{ borderColor: 'rgba(255,180,90,0.35)', marginBottom: 14 }}>
          <b>This browser can't do Bluetooth</b>
          <p className="note">Open Kardio in Chrome on Android. Bluetooth and Location both need to be switched on for the chooser to find your strap.</p>
        </div>
      )}

      {link.error && link.status === 'error' && (
        <p className="note" style={{ color: '#ffb07a' }}>{link.error}</p>
      )}

      <div className="grid2" style={{ marginTop: 4 }}>
        <button className="btn ghost" onClick={forgetStrap} disabled={!link.name}>
          Forget
        </button>
        <button className="btn solid" onClick={() => pairStrap()} disabled={link.status === 'requesting' || link.status === 'unsupported'}>
          {connected ? <ICheck size={16} /> : <IBluetooth size={16} />}
          {link.status === 'requesting' ? 'Choosing…' : connected ? 'Re-link' : 'Link'}
        </button>
      </div>

      <p className="note">
        WHOOP broadcasts to one device at a time, so close other apps that might grab it. The link keeps running in the
        background once a workout starts.
      </p>
    </Sheet>
  )
}
