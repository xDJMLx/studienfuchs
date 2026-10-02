import { fillSentence } from './fillSentence'
import type { Exercise, FillTask, Item, Mastery } from './types'

export interface GenOptions {
  /** Items, die in dieser Session geübt werden. */
  items: Item[]
  /** Alle bekannten Items – Quelle für falsche Antwortoptionen. */
  pool: Item[]
  mastery: (itemId: string) => Mastery
  fills?: FillTask[]
  maxExercises?: number
  /** false, wenn das Gerät keine französische Stimme hat. */
  allowListen?: boolean
  /** true, wenn Sprechübungen (Mikrofon + Spracherkennung) erlaubt sind. */
  allowSpeak?: boolean
  /** Schwerpunkt für freies Üben: nur Schreiben oder nur Hören */
  focus?: 'write' | 'listen' | 'mix'
  rng?: () => number
}

interface Planned {
  round: 1 | 2
  priority: number
  ex: Exercise
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function distractors(item: Item, pool: Item[], side: 'front' | 'back', n: number, rng: () => number): string[] {
  const answer = item[side].toLowerCase()
  const seen = new Set<string>([answer])
  const out: string[] = []
  for (const p of shuffle(pool, rng)) {
    const v = p[side]
    if (seen.has(v.toLowerCase())) continue
    seen.add(v.toLowerCase())
    out.push(v)
    if (out.length === n) break
  }
  return out
}

function choice(item: Item, pool: Item[], dir: 'fr-de' | 'de-fr', rng: () => number): Exercise {
  const toDe = dir === 'fr-de'
  const answer = toDe ? item.back : item.front
  const options = shuffle([answer, ...distractors(item, pool, toDe ? 'back' : 'front', 3, rng)], rng)
  return {
    kind: 'choice',
    id: `${item.id}:choice:${dir}`,
    itemId: item.id,
    prompt: toDe ? item.front : item.back,
    promptLang: toDe ? 'fr' : 'de',
    answer,
    options,
    speak: toDe ? item.front : undefined,
  }
}

const typeEx = (item: Item, accept: string[]): Exercise => ({
  kind: 'type',
  id: `${item.id}:type`,
  itemId: item.id,
  prompt: item.back,
  promptLang: 'de',
  answer: item.front,
  accept,
})

const listenChoiceEx = (item: Item, pool: Item[], rng: () => number): Exercise => ({
  kind: 'listenChoice',
  id: `${item.id}:listenchoice`,
  itemId: item.id,
  speak: item.front,
  answer: item.back,
  options: shuffle([item.back, ...distractors(item, pool, 'back', 3, rng)], rng),
})

const speakEx = (item: Item, accept: string[]): Exercise => ({
  kind: 'speak',
  id: `${item.id}:speak`,
  itemId: item.id,
  text: item.front,
  translation: item.back,
  accept,
})

const listenEx = (item: Item): Exercise => ({
  kind: 'listen',
  id: `${item.id}:listen`,
  itemId: item.id,
  speak: item.front,
  answer: item.front,
  translation: item.back,
})

function buildEx(item: Item, rng: () => number): Exercise | null {
  if (!item.example || !item.exampleDe) return null
  const words = item.example.split(/\s+/).filter(Boolean)
  if (words.length < 3 || words.length > 9) return null
  return {
    kind: 'build',
    id: `${item.id}:build`,
    itemId: item.id,
    prompt: item.exampleDe,
    answer: item.example,
    words: shuffle(words, rng),
  }
}

/** Reihenfolge mischen, ohne dass dasselbe Item direkt hintereinander kommt (Interleaving). */
function interleave(list: Planned[], rng: () => number): Planned[] {
  const pool = shuffle(list, rng)
  const out: Planned[] = []
  while (pool.length) {
    const last = out[out.length - 1]?.ex.itemId
    const idx = pool.findIndex((p) => p.ex.itemId !== last)
    out.push(...pool.splice(idx === -1 ? 0 : idx, 1))
  }
  return out
}

/**
 * Baut eine Übungsfolge nach dem Lern-Workflow:
 * Runde 1 = Erkennen (leicht), Runde 2 = Produzieren (Tippen, Hören, Sätze bauen).
 * Je besser ein Item sitzt, desto weniger Erkennen und desto mehr Produzieren.
 */
export function generateExercises(opts: GenOptions): Exercise[] {
  const { items, pool, mastery, fills = [], allowListen = true, allowSpeak = false, focus = 'mix', rng = Math.random } = opts
  // Jedes Item soll mindestens einmal erkannt und einmal produziert werden – Obergrenze wächst mit der Itemzahl.
  const maxExercises = opts.maxExercises ?? Math.min(22, Math.max(16, items.length * 2 + 1))
  // Gleiche deutsche Bedeutung → alle französischen Varianten gelten als richtig (z. B. zwei Wörter für "gut").
  const sameMeaning = (item: Item) =>
    [...pool, ...items]
      .filter((o) => o.id !== item.id && o.back.trim().toLowerCase() === item.back.trim().toLowerCase())
      .map((o) => o.front)
  const planned: Planned[] = []
  const add = (round: 1 | 2, priority: number, ex: Exercise | null) => {
    if (ex) planned.push({ round, priority, ex })
  }

  // Zuordnen kommt zuerst in die Planung, damit es bei der Kürzung nicht herausfällt.
  const fresh = items.filter((i) => mastery(i.id) === 0)
  if (fresh.length >= 4) {
    const group = fresh.slice(0, 5)
    add(1, 0, {
      kind: 'match',
      id: `match:${group.map((g) => g.id).join('+')}`,
      itemId: group[0].id,
      pairs: group.map((g) => ({ id: g.id, left: g.front, right: g.back })),
    })
  }

  for (const item of items) {
    const m = mastery(item.id)
    if (m === 0) {
      add(1, 0, choice(item, pool, 'fr-de', rng))
      add(1, 1, choice(item, pool, 'de-fr', rng))
      add(2, 0, typeEx(item, sameMeaning(item)))
      add(2, 2, buildEx(item, rng))
    } else if (m === 1) {
      add(1, 1, choice(item, pool, 'de-fr', rng))
      add(2, 0, typeEx(item, sameMeaning(item)))
      add(2, 1, allowListen ? listenEx(item) : null)
      add(1, 1, allowListen ? listenChoiceEx(item, pool, rng) : null)
      add(2, 2, buildEx(item, rng))
    } else {
      add(2, 0, typeEx(item, sameMeaning(item)))
      add(2, 1, allowListen ? listenEx(item) : null)
      add(1, 1, allowListen ? listenChoiceEx(item, pool, rng) : null)
      add(2, 2, allowSpeak ? speakEx(item, sameMeaning(item)) : null)
      add(2, 1, buildEx(item, rng))
    }
  }

  // Aus Lückensätzen mit Übersetzung entstehen zusätzlich Satzbau-Aufgaben (Übersetzen mit Wortbausteinen).
  for (const f of fills.filter((x) => x.translation).slice(0, 3)) {
    const sentence = fillSentence(f.sentence, f.answer)
    const words = sentence.split(' ')
    if (words.length < 3 || words.length > 10) continue
    add(2, 2, { kind: 'build', id: `${f.id}:build`, itemId: f.id, prompt: f.translation as string, answer: sentence, words: shuffle(words, rng) })
  }

  // Schwerpunkt: nur bestimmte Aufgabentypen
  const wanted = focus === 'write' ? ['type', 'build'] : focus === 'listen' ? ['listen', 'listenChoice'] : null
  const pickFrom = wanted ? planned.filter((p) => wanted.includes(p.ex.kind)) : planned
  const kept = [...(pickFrom.length ? pickFrom : planned)].sort((a, b) => a.priority - b.priority).slice(0, maxExercises)
  const round1 = interleave(kept.filter((p) => p.round === 1), rng)
  const round2 = interleave(kept.filter((p) => p.round === 2), rng)

  const fillEx: Exercise[] = fills.slice(0, 4).map((f) => ({
    kind: 'fill',
    id: f.id,
    itemId: f.id,
    sentence: f.sentence,
    answer: f.answer,
    options: shuffle(f.options, rng),
    translation: f.translation,
    why: f.why,
  }))

  return [...round1.map((p) => p.ex), ...round2.map((p) => p.ex), ...fillEx]
}

/**
 * Einheitentest: gemischte Aufgaben ohne Erklärung und ohne zweiten Versuch.
 * Schwerpunkt auf Produzieren (Tippen), dazu Erkennen und – wenn möglich – Hören.
 */
export function generateTest(opts: { items: Item[]; pool: Item[]; count?: number; allowListen?: boolean; rng?: () => number }): Exercise[] {
  const { items, pool, count = 15, allowListen = true, rng = Math.random } = opts
  const sameMeaning = (item: Item) =>
    [...pool, ...items].filter((o) => o.id !== item.id && o.back.trim().toLowerCase() === item.back.trim().toLowerCase()).map((o) => o.front)
  const picked = shuffle(items, rng).slice(0, count)
  const out: Exercise[] = picked.map((item, i) => {
    const slot = i % 4
    if (slot === 0 || slot === 2) return typeEx(item, sameMeaning(item))
    if (slot === 1) return choice(item, pool, 'fr-de', rng)
    return allowListen ? listenChoiceEx(item, pool, rng) : choice(item, pool, 'de-fr', rng)
  })
  return interleave(out.map((ex) => ({ round: 1 as const, priority: 0, ex })), rng).map((p) => p.ex)
}

/** Wie viele neue Wörter auf einmal gezeigt werden, bevor sie sofort abgefragt werden. */
export const NEW_BATCH = 2

/**
 * Lektion in kleinen Schritten: neue Wörter nur zu zweit zeigen und gleich abfragen,
 * danach festigen (Rückübersetzen, Tippen, Hören, Sätze bauen) – statt erst alles vorzulesen.
 */
export function generateLesson(opts: GenOptions): Exercise[] {
  const { items, pool, mastery, rng = Math.random, allowListen = true } = opts
  const fresh = items.filter((i) => mastery(i.id) === 0)
  const steps: Exercise[] = []

  for (let i = 0; i < fresh.length; i += NEW_BATCH) {
    const batch = fresh.slice(i, i + NEW_BATCH)
    steps.push({ kind: 'teach', id: `teach:${batch.map((b) => b.id).join('+')}`, itemId: batch[0].id, items: batch })
    for (const item of batch) steps.push(choice(item, pool, 'fr-de', rng))
  }

  // Ab hier gelten die frisch gezeigten Wörter als "lernend": rückübersetzen, tippen, hören, Sätze bauen
  const freshIds = new Set(fresh.map((f) => f.id))
  const consolidate = generateExercises({
    ...opts,
    mastery: (id) => (freshIds.has(id) ? 1 : mastery(id)),
    maxExercises: opts.maxExercises ?? Math.min(18, Math.max(12, items.length * 2 + 2)),
    allowListen,
  })
  return [...steps, ...consolidate]
}
