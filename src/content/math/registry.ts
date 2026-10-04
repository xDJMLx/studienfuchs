import type { Gen, MathSkill } from './core'

/** Alle Fähigkeiten (Themen), nach Kennung. Die Dateien in skills/ tragen sich hier ein. */
export const SKILLS: Record<string, MathSkill> = {}

export function defineSkill(id: string, title: string, blurb: string, gen: Gen, opts: { blitz?: boolean } = {}): void {
  // Beim Neuladen im Entwicklungsserver läuft dieselbe Datei nochmal: dann einfach ersetzen
  if (SKILLS[id] && !import.meta.hot) throw new Error(`Fähigkeit doppelt: ${id}`)
  SKILLS[id] = { id, title, blurb, gen, blitz: opts.blitz }
}
