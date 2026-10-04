import type { Exercise, Item } from '../../lib/types'
import { num } from './fmt'
import type { Rng } from './rng'

/** Schwierigkeit innerhalb einer Fähigkeit: 1 = leicht, 3 = knifflig. */
export type Level = 1 | 2 | 3
/** 'any' = Eingabe oder Auswahl, wie es zur Schwierigkeit passt; 'choice' erzwingt Auswahl (Blitzrunde). */
export type Form = 'any' | 'choice'

type CalcExercise = Extract<Exercise, { kind: 'calc' }>
type MChoiceExercise = Extract<Exercise, { kind: 'mchoice' }>
type MMatchExercise = Extract<Exercise, { kind: 'mmatch' }>

/** Entwurf einer Aufgabe: Das Gerüst (id, Thema) ergänzt der Sitzungs-Erzeuger. */
export type Draft = Omit<CalcExercise, 'id' | 'itemId'> | Omit<MChoiceExercise, 'id' | 'itemId'> | Omit<MMatchExercise, 'id' | 'itemId'>

export type Gen = (r: Rng, level: Level, form: Form) => Draft

export interface MathSkill {
  id: string
  /** Name des Themas, z. B. "Brüche kürzen" */
  title: string
  /** Eine Zeile, worum es geht (zeigt die Themen-Übersicht) */
  blurb: string
  gen: Gen
  /** Eignet sich für die Blitzrunde (kurze Kopfrechen-Aufgaben) */
  blitz?: boolean
}

export const skillItem = (s: MathSkill): Item => ({ id: s.id, front: s.title, back: s.blurb })

// ---------- Aufgaben bauen ----------

export interface NumericSpec {
  title: string
  /** Aufgabentext in Mathe-Schreibweise */
  prompt: string
  value: number
  /** Lösung für die Anzeige (Standard: Zahl mit Komma); bei Brüchen z. B. {3|4} */
  display?: string
  /** Text, der dem Eingabefeld entspricht, wenn es ein Bruch ist: bringt die Tastatur mit Bruchstrich */
  frac?: boolean
  reduce?: boolean
  lead?: string
  unit?: string
  /** Typische falsche Ergebnisse als Zahlen (Vorzeichenfehler, falsche Rechenart …) */
  wrong?: number[]
  /** Falsche Antworten als fertiger Text (z. B. falsche Brüche) */
  wrongText?: string[]
  /** Anzeige von Zahlen in den Antworten (Standard: num) */
  fmt?: (v: number) => string
  hint?: string
  solution?: string
  accept?: number[]
}

/** Falsche Antworten für die Auswahl: erst die typischen Fehler, dann Nachbarwerte, jeweils ohne Doppelte. */
function pickWrong(value: number, spec: NumericSpec, correctText: string, r: Rng, n = 3): string[] {
  const fmt = spec.fmt ?? num
  const seen = new Set([correctText])
  const out: string[] = []
  const add = (t: string) => {
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  const explicit = r.shuffle([...(spec.wrongText ?? []), ...(spec.wrong ?? []).filter((w) => Number.isFinite(w) && Math.abs(Math.round(w * 100) / 100 - w) < 1e-9).map(fmt)])
  for (const t of explicit) add(t)
  if (out.length < n && !spec.wrongText?.length) {
    const near = Number.isInteger(value) ? [1, -1, 2, -2, 10, -10, 5, -5, 3, -3] : [0.1, -0.1, 1, -1, 0.5, -0.5, 2, -2]
    for (const d of r.shuffle(near)) {
      add(fmt(value + d))
      if (out.length >= n) break
    }
    add(fmt(-value))
    add(fmt(value * 2))
  }
  // Brüche: Zähler und Nenner leicht verändern, falls es sonst zu wenige falsche Antworten gäbe
  const m = /^\{(\d+)\|(\d+)\}$/.exec(correctText)
  if (m && out.length < n) {
    const [p, q] = [Number(m[1]), Number(m[2])]
    const variants = r.shuffle([[p + 1, q], [Math.max(1, p - 1), q], [p, q + 1], [p, Math.max(2, q - 1)], [q, p], [p + 1, q + 1], [p + 2, q]])
    for (const [vp, vq] of variants) {
      if (vp > 0 && vq > 1) add(`{${vp}|${vq}}`)
      if (out.length >= n) break
    }
  }
  return out.slice(0, n)
}

/**
 * Zahl als Ergebnis. Je nach Schwierigkeit tippt man die Zahl ein (schwerer) oder wählt sie aus (leichter).
 * Bei form === 'choice' gibt es immer eine Auswahl.
 */
export function numeric(spec: NumericSpec, r: Rng, level: Level, form: Form = 'any'): Draft {
  const fmt = spec.fmt ?? num
  const answer = spec.display ?? fmt(spec.value)
  const asChoice = form === 'choice' || r.chance(level === 1 ? 0.45 : level === 2 ? 0.2 : 0.05)
  if (asChoice) {
    const unit = spec.unit ? ` ${spec.unit}` : ''
    const wrong = pickWrong(spec.value, spec, answer, r)
    if (wrong.length >= 2) {
      const lead = spec.lead ? `${spec.lead} ` : ''
      return {
        kind: 'mchoice',
        title: spec.title,
        prompt: spec.prompt,
        answer: lead + answer + unit,
        options: r.shuffle([lead + answer + unit, ...wrong.map((w) => lead + w + unit)]),
        hint: spec.hint,
        solution: spec.solution,
      }
    }
  }
  return {
    kind: 'calc',
    title: spec.title,
    prompt: spec.prompt,
    lead: spec.lead,
    unit: spec.unit,
    answer,
    value: spec.value,
    reduce: spec.reduce,
    frac: spec.frac,
    accept: spec.accept,
    hint: spec.hint,
    solution: spec.solution,
  }
}

export interface ChoiceSpec {
  title: string
  prompt: string
  answer: string
  /** falsche Antworten (mindestens 2); höchstens 3 davon werden verwendet */
  wrong: string[]
  hint?: string
  solution?: string
}

/** Auswahl mit Text-Antworten (Vergleichszeichen, Begriffe, Gleichungen …). */
export function choice(spec: ChoiceSpec, r: Rng): Draft {
  const wrong = r.shuffle([...new Set(spec.wrong.filter((w) => w !== spec.answer))]).slice(0, 3)
  return { kind: 'mchoice', title: spec.title, prompt: spec.prompt, answer: spec.answer, options: r.shuffle([spec.answer, ...wrong]), hint: spec.hint, solution: spec.solution }
}

/** Zuordnen: links ein Ausdruck, rechts sein Wert oder Name (3 bis 4 Paare). */
export function matching(title: string, pairs: [string, string][], hint?: string): Draft {
  return { kind: 'mmatch', title, pairs: pairs.map(([left, right], i) => ({ id: `p${i}`, left, right })), hint }
}

/** Lückenfreie Schreibweise einer Summe wie "3x + 5" aus Gliedern [Beiwert, Variable]. */
export function termText(parts: { c: number; v?: string }[]): string {
  let out = ''
  parts.forEach((p, i) => {
    if (p.c === 0) return
    const abs = Math.abs(p.c)
    const coef = abs === 1 && p.v ? '' : num(abs)
    const body = `${coef}${p.v ?? ''}`
    if (i === 0 || out === '') out += (p.c < 0 ? '−' : '') + body
    else out += (p.c < 0 ? ' − ' : ' + ') + body
  })
  return out || '0'
}
