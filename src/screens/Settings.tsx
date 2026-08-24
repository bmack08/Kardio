import { useEffect, useState } from 'react'
import { NumField, Seg, SettingRow, Stepper, Switch } from '../components/Ui'
import { TargetPicker } from '../components/TargetPicker'
import { IBluetooth, ITrash } from '../components/Icons'
import { refreshZones, setCues, setSettings, useSettings, resetSettings } from '../lib/store'
import { ZONE_META, computeZones, estMaxHr } from '../lib/zones'
import { CueEngine } from '../lib/cues'
import { canVibrate } from '../lib/haptics'
import { configureVoice, getVoices, loadVoices } from '../lib/speech'
import { setVolume, unlockAudio } from '../lib/audio'
import { useHrm, forgetStrap } from '../lib/bleStore'
import { clearAll } from '../lib/db'
import { reloadSessions, useSessions } from '../lib/sessions'
import { download } from '../lib/gpx'
import type { ZoneModel } from '../lib/types'

export function Settings({ onPair }: { onPair: () => void }) {
  const s = useSettings()
  const link = useHrm()
  const list = useSessions()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [wipe, setWipe] = useState(false)

  useEffect(() => {
    loadVoices().then(() => setVoices(getVoices()))
  }, [])

  const preview = async (kind: 'up' | 'down' | 'zone') => {
    await unlockAudio(s.cues.volume)
    setVolume(s.cues.volume)
    configureVoice({ uri: s.cues.voiceURI, rate: s.cues.voiceRate })
    CueEngine.preview(kind, s, s.targetZone ?? 3)
  }

  /**
   * Manual zones are yours, not the formula's. Nothing here consults age, weight
   * or the estimated max — the only rule enforced is that the bands stay in order
   * and touch, so there can be no gap for your heart rate to fall into.
   * Editing the zone 5 ceiling moves your max HR with it, since in manual mode
   * that ceiling *is* your working max.
   */
  const setZoneBound = (i: number, edge: 0 | 1, v: number) => {
    const z = s.zones.map((p) => [...p] as [number, number])
    z[i][edge] = v
    if (edge === 0 && i > 0) z[i - 1][1] = v
    if (edge === 1 && i < 4) z[i + 1][0] = v
    const patch: Partial<typeof s> = { zones: z, zoneModel: 'manual' }
    if (i === 4 && edge === 1) patch.maxHr = v
    setSettings(patch)
  }

  /** How far a given bound is allowed to move before it would cross its neighbour. */
  const limits = (i: number, edge: 0 | 1) => {
    const z = s.zones
    if (edge === 0) return { min: i === 0 ? 30 : z[i - 1][0] + 1, max: z[i][1] - 1 }
    return { min: z[i][0] + 1, max: i === 4 ? 240 : z[i + 1][1] - 1 }
  }

  const exportAll = () => {
    download(
      `kardio-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exportedAt: Date.now(), settings: s, sessions: list ?? [] }, null, 1),
      'application/json',
    )
  }

  const nukeIt = async () => {
    await clearAll()
    await reloadSessions()
    resetSettings()
    setWipe(false)
  }

  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(navigator.language.slice(0, 2).toLowerCase()))
  const voiceList = langVoices.length ? langVoices : voices

  return (
    <div className="scroll">
      <div className="topbar">
        <h1 className="title">Settings</h1>
      </div>

      <h2 className="section" style={{ marginTop: 4 }}>Heart rate strap</h2>
      <div className="card">
        <div className="row" style={{ marginBottom: 14 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: link.status === 'connected' ? 'color-mix(in srgb, var(--zone) 18%, transparent)' : 'var(--surface-2)',
              color: link.status === 'connected' ? 'var(--zone)' : 'var(--dim)',
              border: '1px solid var(--line)',
            }}
          >
            <IBluetooth size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', letterSpacing: '-0.02em' }}>{link.name ?? s.device.name ?? 'No strap linked'}</b>
            <span style={{ fontSize: 12.5, color: 'var(--dim)' }}>
              {link.status === 'connected'
                ? `Connected${link.battery != null ? ` · ${link.battery}% battery` : ''}`
                : link.status === 'reconnecting'
                  ? 'Reconnecting…'
                  : link.status === 'unsupported'
                    ? 'This browser has no Bluetooth'
                    : link.error
                      ? link.error
                      : 'Not connected'}
            </span>
          </div>
        </div>
        <div className="grid2">
          <button className="btn" onClick={onPair}>
            {link.status === 'connected' ? 'Re-link' : 'Link strap'}
          </button>
          <button className="btn ghost" onClick={forgetStrap} disabled={!s.device.id && !link.name}>
            Forget
          </button>
        </div>
      </div>

      <h2 className="section">Target zone</h2>
      <div className="card">
        <TargetPicker />
      </div>

      <h2 className="section">Cues</h2>
      <SettingRow
        label="Zone cues"
        hint="Everything below is off when this is off."
        end={<Switch on={s.cues.enabled} onChange={(v) => setCues({ enabled: v })} />}
      />
      <SettingRow
        label="Haptics"
        hint={canVibrate() ? 'Short pulses = lift the pace. Long = ease off. Count the pulses for the zone.' : 'Not available in this browser.'}
        end={<Switch on={s.cues.haptics && canVibrate()} onChange={(v) => setCues({ haptics: v })} />}
      />
      <SettingRow
        label="Tones"
        hint="Short blips that cut through music without pausing it."
        end={<Switch on={s.cues.tones} onChange={(v) => setCues({ tones: v })} />}
      />
      <SettingRow
        label="Spoken cues"
        hint="A voice says the zone and which way to move."
        end={<Switch on={s.cues.voice} onChange={(v) => setCues({ voice: v })} />}
      />

      <div className="card" style={{ marginTop: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Volume</div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={s.cues.volume}
          style={{ ['--p' as string]: `${s.cues.volume * 100}%` }}
          onChange={(e) => {
            const v = Number(e.target.value)
            setCues({ volume: v })
            setVolume(v)
          }}
        />
        {s.cues.voice && voiceList.length > 0 && (
          <>
            <div className="eyebrow" style={{ margin: '14px 0 8px' }}>Voice</div>
            <select
              value={s.cues.voiceURI ?? ''}
              onChange={(e) => {
                setCues({ voiceURI: e.target.value || null })
                configureVoice({ uri: e.target.value || null })
              }}
            >
              <option value="">System default</option>
              {voiceList.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
            <div className="eyebrow" style={{ margin: '14px 0 8px' }}>Speaking rate · {s.cues.voiceRate.toFixed(2)}×</div>
            <input
              type="range"
              min={0.7}
              max={1.6}
              step={0.05}
              value={s.cues.voiceRate}
              style={{ ['--p' as string]: `${((s.cues.voiceRate - 0.7) / 0.9) * 100}%` }}
              onChange={(e) => {
                const r = Number(e.target.value)
                setCues({ voiceRate: r })
                configureVoice({ rate: r })
              }}
            />
          </>
        )}
        <div className="eyebrow" style={{ margin: '16px 0 8px' }}>Try them</div>
        <div className="grid3" style={{ gap: 8 }}>
          <button className="btn sm" style={{ padding: '0 8px', whiteSpace: 'nowrap' }} onClick={() => preview('up')}>
            Pick it up
          </button>
          <button className="btn sm" style={{ padding: '0 8px', whiteSpace: 'nowrap' }} onClick={() => preview('down')}>
            Ease off
          </button>
          <button className="btn sm" style={{ padding: '0 8px', whiteSpace: 'nowrap' }} onClick={() => preview('zone')}>
            Zone {s.targetZone ?? 3}
          </button>
        </div>
      </div>

      <SettingRow
        label="Nudge every"
        hint="How often Kardio reminds you while you are outside the target zone."
        end={<Stepper value={s.cues.nagSeconds} min={10} max={120} step={5} onChange={(v) => setCues({ nagSeconds: v })} fmt={(n) => `${n}s`} />}
      />
      <SettingRow
        label="Zone must hold for"
        hint="Stops the app chattering when you hover on a boundary."
        end={<Stepper value={s.cues.dwellSeconds} min={1} max={20} step={1} onChange={(v) => setCues({ dwellSeconds: v })} fmt={(n) => `${n}s`} />}
      />
      <SettingRow
        label="Boundary deadband"
        hint="Beats you must clear past a line before the zone flips."
        end={<Stepper value={s.cues.deadband} min={0} max={8} step={1} onChange={(v) => setCues({ deadband: v })} fmt={(n) => `${n} bpm`} />}
      />
      <SettingRow
        label="Call zone changes"
        hint="When no target is set, announce every zone you move into."
        end={<Switch on={s.cues.onZoneChange} onChange={(v) => setCues({ onZoneChange: v })} />}
      />
      <div className="set">
        <span className="lab">
          <b>Progress updates</b>
          <span>Spoken split at each distance marker, or on a timer.</span>
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        <Seg
          value={s.cues.periodic}
          onChange={(v) => setCues({ periodic: v })}
          options={[
            { id: 'off', label: 'Off' },
            { id: 'dist', label: s.units === 'mi' ? 'Every mile' : 'Every km' },
            { id: '5min', label: '5 min' },
            { id: '10min', label: '10 min' },
          ]}
        />
      </div>

      <h2 className="section">Your numbers</h2>
      <SettingRow label="Units" end={<Seg value={s.units} onChange={(v) => setSettings({ units: v })} options={[{ id: 'km', label: 'km' }, { id: 'mi', label: 'mi' }]} />} />
      <SettingRow
        label="Age"
        end={
          <Stepper
            value={s.age}
            min={10}
            max={99}
            onChange={(v) =>
              // only re-estimate the max if you never overrode it yourself
              refreshZones(
                s.maxHr === estMaxHr(s.age)
                  ? { age: v, maxHr: estMaxHr(v), lthr: Math.round(estMaxHr(v) * 0.88) }
                  : { age: v },
              )
            }
          />
        }
      />
      <SettingRow
        label="Max heart rate"
        hint={
          s.zoneModel === 'manual'
            ? 'Not used — your zones are manual. Kept only for the calorie estimate.'
            : `Estimated ${estMaxHr(s.age)} for age ${s.age}. Override it if you have tested.`
        }
        end={<Stepper value={s.maxHr} min={120} max={230} onChange={(v) => refreshZones({ maxHr: v })} />}
      />
      <SettingRow label="Resting heart rate" end={<Stepper value={s.restHr} min={30} max={100} onChange={(v) => refreshZones({ restHr: v })} />} />
      <SettingRow
        label="Threshold HR"
        hint="Only used by the LTHR zone model."
        end={<Stepper value={s.lthr} min={100} max={220} onChange={(v) => refreshZones({ lthr: v })} />}
      />
      <SettingRow label="Weight" hint="Used for the calorie estimate only." end={<Stepper value={s.weightKg} min={35} max={200} onChange={(v) => setSettings({ weightKg: v })} fmt={(n) => `${n} kg`} />} />

      <h2 className="section">Zones</h2>
      <Seg<ZoneModel>
        value={s.zoneModel}
        onChange={(v) => setSettings({ zoneModel: v, zones: v === 'manual' ? s.zones : computeZones(v, s) })}
        options={[
          { id: 'max', label: '% Max' },
          { id: 'hrr', label: '% HRR' },
          { id: 'lthr', label: 'LTHR' },
          { id: 'manual', label: 'Manual' },
        ]}
      />
      <div style={{ marginTop: 10 }}>
        {ZONE_META.map((z, i) => (
          <div className="zrow" key={z.short} style={{ ['--c' as string]: z.color }} data-target={s.targetZone === i + 1}>
            <button className="tag" onClick={() => setSettings({ targetZone: s.targetZone === i + 1 ? null : i + 1 })}>
              {z.short}
            </button>
            <div>
              <div className="nm">{z.name}</div>
              <div className="bl">{z.blurb}</div>
            </div>
            <div className="bounds">
              <NumField
                value={s.zones[i][0]}
                onCommit={(v) => setZoneBound(i, 0, v)}
                {...limits(i, 0)}
                label={`${z.short} lower bound`}
              />
              <span className="dim">–</span>
              <NumField
                value={s.zones[i][1]}
                onCommit={(v) => setZoneBound(i, 1, v)}
                {...limits(i, 1)}
                label={`${z.short} upper bound`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="note">
        Tap a zone tag to make it the target. Type either end of a band and press enter — editing any
        number switches you to <b>Manual</b>, where your numbers are used exactly as entered and age,
        weight and the estimated max are ignored entirely. Bands stay joined, so moving one end moves
        its neighbour to match and no heart rate can land in a gap.
      </p>

      <h2 className="section">Recording</h2>
      <SettingRow label="GPS tracking" hint="Off for treadmill and indoor work — heart rate still records." end={<Switch on={s.gps} onChange={(v) => setSettings({ gps: v })} />} />
      <SettingRow label="Auto-pause" hint="Pauses when you stop moving, resumes when you go again." end={<Switch on={s.autoPause} onChange={(v) => setSettings({ autoPause: v })} />} />
      <SettingRow label="Keep screen on" end={<Switch on={s.keepScreenOn} onChange={(v) => setSettings({ keepScreenOn: v })} />} />
      <SettingRow label="Start in eyes-free view" hint="Black screen, huge number, zone glow. Cues do the talking." end={<Switch on={s.eyesFreeDefault} onChange={(v) => setSettings({ eyesFreeDefault: v })} />} />

      <h2 className="section">Data</h2>
      <SettingRow label="Export everything" hint="One JSON file with every session and your settings." onClick={exportAll} end={<span className="val">{list?.length ?? 0}</span>} />
      {wipe ? (
        <div className="card" style={{ marginTop: 8, borderColor: 'rgba(255,77,109,0.4)' }}>
          <b>Erase all sessions and settings?</b>
          <p className="note" style={{ marginBottom: 12 }}>This cannot be undone. Export first if you want a copy.</p>
          <div className="grid2">
            <button className="btn ghost" onClick={() => setWipe(false)}>Cancel</button>
            <button className="btn danger" onClick={nukeIt}>Erase</button>
          </div>
        </div>
      ) : (
        <SettingRow label="Erase all data" hint="Nothing here is on a server — this phone is the only copy." onClick={() => setWipe(true)} end={<ITrash size={17} className="dim" />} />
      )}

      <p className="note" style={{ marginTop: 26, textAlign: 'center' }}>
        Kardio · everything stays on your phone
      </p>
    </div>
  )
}
