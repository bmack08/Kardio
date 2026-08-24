import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/app.css'
import { recorder } from './lib/recorder'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// dev-only handle so cues can be exercised without a strap on the desk
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).kardio = { recorder }

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {})
  })
}
