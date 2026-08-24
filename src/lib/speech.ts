/** speechSynthesis wrapper: lazy voice list, cancel-on-new, graceful no-op. */

let voices: SpeechSynthesisVoice[] = []
let cfg = { uri: null as string | null, rate: 1.05, volume: 1 }

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) { voices = now; return Promise.resolve(now) }
  return new Promise((res) => {
    const done = () => { voices = speechSynthesis.getVoices(); res(voices) }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1200)
  })
}

export function configureVoice(o: Partial<typeof cfg>) {
  cfg = { ...cfg, ...o }
}

export function getVoices() {
  return voices
}

export function speak(text: string, opts: { interrupt?: boolean } = {}) {
  if (!canSpeak() || !text) return
  try {
    if (opts.interrupt !== false) speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = cfg.rate
    u.volume = cfg.volume
    u.pitch = 1
    const v = voices.find((x) => x.voiceURI === cfg.uri)
    if (v) u.voice = v
    speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export function shutUp() {
  if (canSpeak()) try { speechSynthesis.cancel() } catch { /* ignore */ }
}
