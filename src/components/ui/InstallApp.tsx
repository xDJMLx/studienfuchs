import { useState } from 'react'
import { isIos, useInstall } from '../../lib/install'
import { Mascot } from '../mascot/Mascot'
import { Close, Download } from './Icons'
import { Sheet } from './Sheet'

const DISMISS_KEY = 'studienfuchs-install-hidden'

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Gemeinsame Logik: Browser-Dialog öffnen, wenn möglich, sonst eine kurze Anleitung zeigen. */
export function useInstallFlow() {
  const { state, install } = useInstall()
  const [help, setHelp] = useState(false)
  const start = async () => {
    if (state === 'prompt') await install()
    else setHelp(true)
  }
  return { state, start, help, closeHelp: () => setHelp(false) }
}

export function InstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ios = isIos()
  const steps = ios
    ? [
        'Öffne diese Seite in Safari.',
        'Tippe unten auf „Teilen“ (das Quadrat mit dem Pfeil nach oben).',
        'Wähle „Zum Home-Bildschirm“ und dann „Hinzufügen“.',
      ]
    : [
        'Öffne das Browser-Menü (drei Punkte oben rechts).',
        'Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.',
        'Bestätige mit „Installieren“. Das Symbol liegt danach auf deinem Startbildschirm.',
      ]
  return (
    <Sheet open={open} onClose={onClose} title="Als App installieren">
      <div className="flex items-center gap-4">
        <Mascot size={64} mood="cheer" />
        <p className="text-muted">Studienfuchs öffnet sich dann wie eine normale App: ohne Adressleiste, im Vollbild und mit eigenem Symbol.</p>
      </div>
      <ol className="mt-5 grid gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-bold text-on-brand">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      <button className="btn btn-primary mt-6 w-full" onClick={onClose}>
        Verstanden
      </button>
    </Sheet>
  )
}

/** Karte auf der Startseite: erscheint nur, wenn die App noch nicht installiert ist, und lässt sich wegklicken. */
export function InstallBanner() {
  const { state, start, help, closeHelp } = useInstallFlow()
  const [hidden, setHidden] = useState(readDismissed)
  if (state === 'installed' || hidden) return null
  // Auf dem Computer ohne Installations-Ereignis wäre die Anleitung wenig hilfreich: nur anbieten, wenn es wirklich geht oder auf dem Handy
  const mobile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  if (state === 'manual' && !mobile) return null
  return (
    <>
      <div className="card mb-3 flex items-center gap-3 py-2 pl-3 pr-1.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
          <Download size={20} />
        </span>
        <button type="button" onClick={start} className="press min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-extrabold">Als App aufs Handy holen</span>
          <span className="block truncate text-[13px] text-muted">Ohne Adressleiste, direkt vom Startbildschirm</span>
        </button>
        <button
          type="button"
          aria-label="Hinweis ausblenden"
          onClick={() => {
            setHidden(true)
            try {
              localStorage.setItem(DISMISS_KEY, '1')
            } catch {
              /* Speicher nicht verfügbar */
            }
          }}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-ink"
        >
          <Close size={18} />
        </button>
      </div>
      <InstallHelp open={help} onClose={closeHelp} />
    </>
  )
}
