import type { CardRef } from './decks'
import { shuffle } from './generateExercises'
import { taskToExercise } from './tasks'
import type { Exercise, Item, Mastery } from './types'

export interface CardSessionOptions {
  /** Karten, die in diesem Durchgang geübt werden (fällige zuerst, dann neue) */
  refs: CardRef[]
  /** Alle bekannten Karten: Quelle für falsche Antworten */
  pool: CardRef[]
  mastery: (itemId: string) => Mastery
  /** Höchstens so viele Karten (Standard: alle) */
  count?: number
  /** Nur Karteikarten zum Umdrehen (kein Tippen, keine Auswahl) */
  flipOnly?: boolean
  /** Nur Tippen (wo die Antwort kurz genug ist) */
  typeOnly?: boolean
  rng?: () => number
}

const LANG_NAME = { fr: 'Französisch', en: 'Englisch' } as const

/** Eine Antwort ist "kurz", wenn man sie sinnvoll eintippen kann: ein Wort, eine Wendung, eine Zahl. */
export const isShortAnswer = (a: string): boolean => a.trim().length <= 30 && !a.includes('\n') && a.trim().split(/\s+/).length <= 6

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Falsche Antworten: erst aus demselben Stapel (die verwechselt man wirklich), dann aus dem Fach, dann von überall. */
function wrongAnswers(ref: CardRef, side: 'front' | 'back', pool: CardRef[], n: number, rng: () => number): string[] {
  const answer = norm(ref.item[side])
  const seen = new Set([answer])
  const out: string[] = []
  const tiers = [pool.filter((p) => p.deck.id === ref.deck.id), pool.filter((p) => p.deck.subject === ref.deck.subject), pool]
  for (const tier of tiers) {
    for (const p of shuffle(tier, rng)) {
      const v = p.item[side]
      if (p.item.id === ref.item.id || p.item.task || seen.has(norm(v)) || v.length > 60) continue
      seen.add(norm(v))
      out.push(v)
      if (out.length >= n) return out
    }
  }
  return out
}

function titleFor(ref: CardRef, reverse: boolean): string {
  const lang = ref.deck.lang
  if (lang) return reverse ? `Wie heißt das auf ${LANG_NAME[lang]}?` : 'Was bedeutet das?'
  return reverse ? 'Was gehört dazu?' : 'Was ist die Antwort?'
}

/**
 * Aufgaben für einen Durchgang, nach dem Wissensstand je Karte:
 * neu → erst zeigen (zu zweit), sofort Auswahl; lernend → selbst antworten; fest → selbst antworten, bei Vokabeln auch rückwärts.
 * Lange Antworten (Definitionen, Sätze) werden nicht getippt, sondern als Karteikarte mit Selbstbewertung gefragt.
 */
export function generateCardSession(opts: CardSessionOptions): Exercise[] {
  const rng = opts.rng ?? Math.random
  const seen = new Set<string>()
  const refs = opts.refs.filter((r) => (seen.has(r.item.id) ? false : (seen.add(r.item.id), true))).slice(0, opts.count ?? Infinity)

  const known = shuffle(refs.filter((r) => opts.mastery(r.item.id) > 0), rng)
  // Neue Aufgaben werden nicht erst gezeigt: Sie sind selbst schon die Übung (bei einem Fehler steht die Lösung dabei)
  const freshTasks = refs.filter((r) => opts.mastery(r.item.id) === 0 && r.item.task)
  const fresh = refs.filter((r) => opts.mastery(r.item.id) === 0 && !r.item.task)
  const out: Exercise[] = []

  const forms = (ref: CardRef, m: Mastery, firstContact: boolean): Exercise => {
    const { item, deck } = ref
    // Aufgaben (Quiz, Lückentext, Rechnen …) haben ihre eigene Form; im Karteikarten-Modus werden sie zu Frage und Antwort
    if (item.task) return taskToExercise(item, item.task, { rng, flip: opts.flipOnly, lang: deck.lang })
    const reverse = deck.both && !firstContact && rng() < 0.5
    const q = reverse ? item.back : item.front
    const a = reverse ? item.front : item.back
    const speak = deck.lang ? item.front : undefined
    const base = { itemId: item.id, lang: deck.lang, speak }
    const canChoice = q.length <= 160 && a.length <= 60 && wrongAnswers(ref, reverse ? 'front' : 'back', opts.pool, 3, rng).length >= 3
    const mkChoice = (): Exercise => ({
      ...base,
      kind: 'qchoice',
      id: `${item.id}:qc:${reverse ? 'r' : 'f'}`,
      title: titleFor(ref, reverse),
      prompt: q,
      answer: a,
      options: shuffle([a, ...wrongAnswers(ref, reverse ? 'front' : 'back', opts.pool, 3, rng)], rng),
    })
    const mkType = (): Exercise => ({ ...base, kind: 'qtype', id: `${item.id}:qt:${reverse ? 'r' : 'f'}`, title: titleFor(ref, reverse), prompt: q, answer: a })
    const mkFlip = (): Exercise => ({
      kind: 'qcard',
      id: `${item.id}:flip:${reverse ? 'r' : 'f'}`,
      itemId: item.id,
      front: q,
      back: a,
      lang: deck.lang,
      speak,
      ...(!reverse && item.example ? { example: item.example, exampleDe: item.exampleDe } : {}),
    })
    if (opts.flipOnly) return mkFlip()
    const short = isShortAnswer(a)
    if (firstContact) return canChoice ? mkChoice() : mkFlip()
    if (opts.typeOnly) return short ? mkType() : mkFlip()
    if (!short) return mkFlip()
    // Lernend: eher Auswahl als Einstieg (leichter), fest: aus dem Gedächtnis tippen
    if (m === 1 && canChoice && rng() < 0.4) return mkChoice()
    return mkType()
  }

  for (const ref of known) out.push(forms(ref, opts.mastery(ref.item.id), false))

  for (const ref of freshTasks) out.push(forms(ref, 0, false))

  // Neue Karten zu zweit zeigen und gleich abfragen
  for (let i = 0; i < fresh.length; i += 2) {
    const pair = fresh.slice(i, i + 2)
    const lang = pair[0].deck.lang
    out.push({ kind: 'teach', id: `${pair[0].item.id}:teach`, itemId: pair[0].item.id, items: pair.map((p) => p.item) as Item[], lang: lang ?? 'none' })
    for (const ref of shuffle(pair, rng)) out.push(forms(ref, 0, true))
  }
  return out
}
