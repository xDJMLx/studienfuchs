// @vitest-environment happy-dom
import fs from 'node:fs'
import { cleanup, render, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { dateKey, addDays } from './lib/calendar'
import { useStore } from './store/useStore'

vi.hoisted(() => {
  globalThis.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
})
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
  const anim = (window as unknown as { Animation?: { prototype: { cancel: () => void; finished?: Promise<unknown> } } }).Animation?.prototype
  if (anim) {
    const cancel = anim.cancel
    anim.cancel = function (this: { finished?: Promise<unknown> }) {
      this.finished?.catch(() => undefined)
      return cancel.call(this)
    }
  }
  window.HTMLElement.prototype.scrollIntoView = () => undefined
  window.HTMLElement.prototype.scrollTo = (() => undefined) as typeof window.HTMLElement.prototype.scrollTo
})
beforeEach(() => {
  useStore.getState().resetAll()
  const mk = (t: string, subj: string, n: number) => useStore.getState().addSet(t, Array.from({ length: n }, (_, i) => ({ front: `F${i}`, back: `B${i}` })), { subject: subj })
  useStore.setState({ onboarded: true, mySubjects: ['biologie', 'mathe', 'englisch'], grade: 8 })
  const a = mk('Zellen', 'biologie', 20)
  const b = mk('Bruchrechnen', 'mathe', 15)
  mk('Unit 3', 'englisch', 30)
  useStore.getState().addArbeit({ subject: 'biologie', kind: 'test', title: 'Bio-Test', date: dateKey(addDays(new Date(), 3)), deckIds: [a] })
  useStore.getState().addArbeit({ subject: 'mathe', kind: 'klassenarbeit', title: 'Mathe Brüche', date: dateKey(addDays(new Date(), 9)), deckIds: [b] })
})
afterEach(cleanup)

const SCREENS: [string, string, RegExp][] = [
  ['Üben', '#/', /Als Nächstes|Heute/],
  ['Fach-Seite', '#/faecher/biologie', /Biologie/],
  ['Neu erstellen', '#/stapel/neu', /Neu erstellen|Neue Karteikarten/],
  ['Kalender', '#/kalender', /Kalender/],
  ['Profil', '#/profile', /Level/],
  ['Einstellungen', '#/settings', /Einstellungen/],
]

/** Obergrenzen: So viel darf ein Bildschirm höchstens zeigen (gemessener Stand der neuen Fassung); die Zahlen vom Stand vor dem Aufräumen (Commit 266a721) stehen in docs/MESSUNG.md. */
const LIMIT: Record<string, { controls: number; chars: number }> = {
  Üben: { controls: 13, chars: 420 },
  'Fach-Seite': { controls: 12, chars: 470 },
  'Neu erstellen': { controls: 19, chars: 820 },
  Kalender: { controls: 46, chars: 440 },
  Profil: { controls: 10, chars: 380 },
  Einstellungen: { controls: 15, chars: 670 },
}

/** Zählt, was man auf einem Bildschirm sehen und bedienen kann (ohne die Tab-Leiste): Bedienelemente und Zeichen Text. */
function measure(): { controls: number; chars: number } {
  const main = document.querySelector('main')!
  const controls = main.querySelectorAll('button, a[href], input:not([type="file"]), select, textarea, [role="checkbox"], [role="radio"], summary').length
  return { controls, chars: (main.textContent ?? '').replace(/\s+/g, ' ').trim().length }
}

describe('Übersicht der neuen Fassung', () => {
  for (const [name, hash, expected] of SCREENS) {
    it(name, async () => {
      window.location.hash = hash
      render(<App />)
      await waitFor(() => expect(document.body.textContent).toMatch(expected), { timeout: 4000 })
      await new Promise((r) => setTimeout(r, 300))
      const m = measure()
      if (process.env.UEBERSICHT_OUT) fs.appendFileSync(process.env.UEBERSICHT_OUT, `NEU ${name} Bedienelemente=${m.controls} Zeichen=${m.chars}\n`)
      expect(m.controls, `${name}: Bedienelemente`).toBeLessThanOrEqual(LIMIT[name].controls)
      expect(m.chars, `${name}: Zeichen`).toBeLessThanOrEqual(LIMIT[name].chars)
    })
  }
})
