import { useEffect, useState } from 'react'
import { Today } from './screens/Today'
import { Live } from './screens/Live'
import { Summary } from './screens/Summary'
import { History } from './screens/History'
import { Settings } from './screens/Settings'
import { PairSheet } from './components/PairSheet'
import { ZoneTheme } from './components/Ui'
import { IHistory, IHome, ISliders } from './components/Icons'
import { recorder, useRecorder } from './lib/recorder'
import { useSettings } from './lib/store'
import { tryResume } from './lib/bleStore'
import { zoneFor } from './lib/zones'
import { resumeIfNeeded } from './lib/audio'
import { HAPTICS } from './lib/haptics'
import type { Mode, Session } from './lib/types'

type Tab = 'today' | 'history' | 'settings'
type View = { s: Session; fresh: boolean } | null

export default function App() {
  const s = useSettings()
  const rec = useRecorder()
  const [tab, setTab] = useState<Tab>('today')
  const [pairing, setPairing] = useState(false)
  const [view, setView] = useState<View>(null)

  const live = rec.status !== 'idle'
  const hr = rec.hrStale ? null : rec.hr
  // idle with no strap: preview the colour of the zone you're aiming at
  const zone = live ? rec.cueZone : hr != null ? zoneFor(hr, s.zones) : (s.targetZone ?? 0)

  useEffect(() => {
    tryResume()
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        resumeIfNeeded()
        tryResume()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Don't let a stray back-swipe throw away a workout in progress.
  useEffect(() => {
    if (!live) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [live])

  const start = async (m: Mode) => {
    HAPTICS.tap()
    await recorder.start(m)
  }

  const finish = () => {
    const session = recorder.finish()
    if (session) setView({ s: session, fresh: true })
  }

  return (
    <>
      <ZoneTheme zone={zone} bpm={hr} />
      <div className="aurora" />
      <div className="app">
        {live ? (
          <Live onFinish={finish} />
        ) : view ? (
          <Summary session={view.s} fresh={view.fresh} onDone={() => setView(null)} />
        ) : tab === 'today' ? (
          <Today
            onStart={start}
            onPair={() => setPairing(true)}
            onOpen={(x) => setView({ s: x, fresh: false })}
            onSeeAll={() => setTab('history')}
          />
        ) : tab === 'history' ? (
          <History onOpen={(x) => setView({ s: x, fresh: false })} />
        ) : (
          <Settings onPair={() => setPairing(true)} />
        )}

        {!live && !view && (
          <nav className="nav">
            <button aria-current={tab === 'today'} onClick={() => setTab('today')}>
              <IHome size={21} />
              Today
            </button>
            <button aria-current={tab === 'history'} onClick={() => setTab('history')}>
              <IHistory size={21} />
              History
            </button>
            <button aria-current={tab === 'settings'} onClick={() => setTab('settings')}>
              <ISliders size={21} />
              Settings
            </button>
          </nav>
        )}
      </div>
      {pairing && <PairSheet onClose={() => setPairing(false)} />}
    </>
  )
}
