import './lib/migrate' // zuerst: übernimmt Daten aus der Zeit als "Lernfuchs", bevor der Store geladen wird
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline-Fähigkeit nur im Produktionsbuild (im Dev-Server würde der Cache beim Entwickeln stören)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
