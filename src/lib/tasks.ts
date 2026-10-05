import { calc, CalcError, formatFraction, formatNumber, roundTo, solve, terminates } from './calc'
import { shuffle } from './generateExercises'
import type { DeckLang, Exercise, Item } from './types'

/**
 * Aufgaben außer Karteikarten: Quiz, Lückentext, Zuordnen, Reihenfolge, Kurzantwort und Rechnen.
 * Sie hängen als `task` an einem Item und laufen damit durch dieselbe Planung (Wiederholung, Arbeiten, Fortschritt) wie Karteikarten.
 *
 * Rechenaufgaben (`calc`, `solve`) enthalten keine Lösung von der KI: Sie bestehen aus dem Term oder der Gleichung,
 * das Ergebnis berechnet die App selbst (siehe calc.ts).
 */
export type Task =
  | { t: 'mc'; q: string; options: string[]; answer: number; why?: string; hint?: string }
  | { t: 'tf'; q: string; truth: boolean; why?: string }
  | { t: 'cloze'; text: string; answers: string[]; why?: string }
  | { t: 'order'; q: string; steps: string[]; why?: string }
  | { t: 'match'; q: string; pairs: { l: string; r: string }[] }
  | { t: 'short'; q: string; sample: string; keys?: string[] }
  /** Antwort tippen (z. B. Vokabeln im Test): `accept` = weitere richtige Schreibweisen */
  | { t: 'type'; q: string; answer: string; accept?: string[]; lang?: DeckLang }
  | { t: 'calc'; q: string; expr: string; unit?: string; digits?: number; as?: 'dec' | 'frac'; why?: string; hint?: string }
  | { t: 'solve'; q: string; equation: string; digits?: number; why?: string; hint?: string }

export type TaskKind = Task['t']

export const TASK_LABEL: Record<TaskKind, string> = {
  mc: 'Quiz',
  tf: 'Richtig oder falsch',
  cloze: 'Lückentext',
  order: 'Reihenfolge',
  match: 'Zuordnen',
  short: 'Kurzantwort',
  type: 'Tippen',
  calc: 'Rechnen',
  solve: 'Gleichung',
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : typeof v === 'number' ? String(v) : '')
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const opt = (v: unknown): string | undefined => clean(v) || undefined
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Rundungshinweis oder Bruch in der Frage? Dann darf das Ergebnis eine unendliche Dezimalzahl sein. */
const MENTIONS_ROUNDING = /(gerundet|runde|nachkomma|dezimal|bruch|näherung|ungefähr)/i

interface Computed {
  value: number
  /** Text der Lösung für die Anzeige */
  text: string
  digits?: number
  reduce?: boolean
  frac?: boolean
  accept?: number[]
}

/** Das Ergebnis einer Rechenaufgabe, von der App berechnet. Null, wenn die Aufgabe nicht sauber lösbar ist. */
export function computeTask(task: Extract<Task, { t: 'calc' | 'solve' }>): Computed | null {
  try {
    const r = task.t === 'calc' ? calc(task.expr) : (() => {
      const sols = solve(task.equation)
      if (sols.length !== 1) throw new CalcError('Nicht genau eine Lösung')
      return sols[0]
    })()
    if (!Number.isFinite(r.value) || Math.abs(r.value) > 1e9) return null
    // Bruch gewünscht (und das Ergebnis ist exakt und kein ganzer Wert)
    if (task.t === 'calc' && task.as === 'frac' && r.exact && r.exact.d !== 1n) {
      return { value: r.value, text: formatFraction(r.exact), reduce: true, frac: true }
    }
    const exactTerminating = r.exact ? terminates(r.exact) : false
    const mentions = MENTIONS_ROUNDING.test(task.q)
    if (!exactTerminating && !r.isInteger && !mentions) return null
    let digits = task.digits
    if (digits === undefined) digits = exactTerminating ? undefined : 2
    // Endliche Dezimalzahlen mit zu vielen Stellen sind keine Schulaufgabe
    if (exactTerminating && r.exact && digits === undefined) {
      const dec = formatNumber(r.value, 6)
      if ((dec.split(',')[1] ?? '').length > 4) return null
    }
    const shown = digits !== undefined ? roundTo(r.value, digits) : r.value
    const accept = digits !== undefined ? [r.value] : undefined
    return { value: shown, text: formatNumber(shown, digits ?? 6), digits, accept }
  } catch {
    return null
  }
}

/** Anzeige-Text der Antwort (Rückseite einer Karte, Lösung in der Liste). */
export function taskAnswerText(task: Task): string {
  switch (task.t) {
    case 'mc':
      return task.options[task.answer]
    case 'tf':
      return task.truth ? 'Richtig' : 'Falsch'
    case 'cloze':
      return task.answers[0]
    case 'order':
      return task.steps.map((s, i) => `${i + 1}. ${s}`).join(' → ')
    case 'match':
      return task.pairs.map((p) => `${p.l} – ${p.r}`).join('; ')
    case 'short':
      return task.sample
    case 'type':
      return task.answer
    case 'calc':
    case 'solve': {
      const c = computeTask(task)
      return c ? (task.t === 'solve' ? `x = ${c.text}` : `${c.text}${task.t === 'calc' && task.unit ? ` ${task.unit}` : ''}`) : '?'
    }
  }
}

export const taskQuestion = (task: Task): string => (task.t === 'cloze' ? task.text : task.q)

/** Aus einer Aufgabe ein Item machen (Frage vorn, Lösung hinten), damit sie in Listen und Karteikarten-Ansicht erscheint. */
export function itemFromTask(task: Task, id: string): Item {
  return { id, front: taskQuestion(task), back: taskAnswerText(task), task }
}

// ---------- Prüfen und bereinigen (KI-Antworten) ----------

/** Eine Aufgabe aus der KI-Antwort prüfen. Null = unbrauchbar (wird weggelassen). Rechnungen werden hier nachgerechnet. */
export function normalizeTask(raw: unknown): Task | null {
  const r = raw as Record<string, unknown>
  if (!r || typeof r !== 'object') return null
  const t = clean(r.t ?? r.type ?? r.kind).toLowerCase()
  const q = clean(r.q ?? r.question ?? r.frage ?? r.prompt)
  const why = opt(r.why ?? r.explanation ?? r.erklaerung ?? r.begruendung)
  const hint = opt(r.hint ?? r.tipp)

  if (t === 'mc' || t === 'quiz' || t === 'choice') {
    let options = list(r.options ?? r.antworten).map(clean).filter(Boolean)
    if (options.length >= 2 && options.every((o, i) => new RegExp(`^${String.fromCharCode(65 + i)}[).:]\\s*`).test(o))) options = options.map((o) => o.replace(/^[A-Z][).:]\s*/, ''))
    if (!q || options.length < 3 || options.length > 6 || new Set(options.map(norm)).size !== options.length) return null
    let a = Number(r.answer ?? r.correct)
    if (!Number.isInteger(a)) {
      const text = clean(r.answer ?? r.correct)
      const letter = /^[A-F]$/i.test(text) ? text.toUpperCase().charCodeAt(0) - 65 : -1
      a = letter >= 0 ? letter : options.findIndex((o) => norm(o) === norm(text))
    }
    if (a < 0 || a >= options.length) return null
    return { t: 'mc', q, options, answer: a, ...(why ? { why } : {}), ...(hint ? { hint } : {}) }
  }

  if (t === 'tf' || t === 'truefalse' || t === 'richtigfalsch') {
    const v = r.truth ?? r.answer ?? r.correct
    const truth = typeof v === 'boolean' ? v : /^(richtig|wahr|true|ja)$/i.test(clean(v)) ? true : /^(falsch|false|nein)$/i.test(clean(v)) ? false : null
    if (!q || truth === null) return null
    return { t: 'tf', q, truth, ...(why ? { why } : {}) }
  }

  if (t === 'cloze' || t === 'gap' || t === 'luecke') {
    const text = clean(r.text ?? r.q ?? r.sentence).replace(/_{2,}|\[\.{3}\]|\[…\]|…|\.{3,}/g, '___')
    const answers = [...list(r.answers), r.answer].map(clean).filter(Boolean)
    if ((text.match(/___/g) ?? []).length !== 1 || !answers.length) return null
    return { t: 'cloze', text, answers: [...new Set(answers)], ...(why ? { why } : {}) }
  }

  if (t === 'order' || t === 'sort' || t === 'reihenfolge') {
    const steps = list(r.steps ?? r.items).map(clean).filter(Boolean)
    if (!q || steps.length < 3 || steps.length > 8 || new Set(steps.map(norm)).size !== steps.length) return null
    return { t: 'order', q, steps, ...(why ? { why } : {}) }
  }

  if (t === 'match' || t === 'pairs' || t === 'zuordnen') {
    const pairs = list(r.pairs)
      .map((p) => {
        const x = p as Record<string, unknown> | unknown[]
        return Array.isArray(x) ? { l: clean(x[0]), r: clean(x[1]) } : { l: clean((x as Record<string, unknown>).l ?? (x as Record<string, unknown>).left), r: clean((x as Record<string, unknown>).r ?? (x as Record<string, unknown>).right) }
      })
      .filter((p) => p.l && p.r)
    if (pairs.length < 3 || pairs.length > 8 || new Set(pairs.map((p) => norm(p.l))).size !== pairs.length || new Set(pairs.map((p) => norm(p.r))).size !== pairs.length) return null
    return { t: 'match', q: q || 'Ordne zu', pairs }
  }

  if (t === 'short' || t === 'open' || t === 'kurzantwort') {
    const sample = clean(r.sample ?? r.answer ?? r.musterloesung)
    if (!q || !sample) return null
    const keys = list(r.keys ?? r.keywords ?? r.stichpunkte).map(clean).filter(Boolean).slice(0, 6)
    return { t: 'short', q, sample, ...(keys.length ? { keys } : {}) }
  }

  if (t === 'type' || t === 'typed' || t === 'tippen') {
    const answer = clean(r.answer)
    if (!q || !answer) return null
    const accept = list(r.accept).map(clean).filter(Boolean)
    return { t: 'type', q, answer, ...(accept.length ? { accept } : {}) }
  }

  if (t === 'calc' || t === 'rechnen') {
    const expr = clean(r.expr ?? r.term ?? r.expression)
    if (!q || !expr) return null
    const task: Task = { t: 'calc', q, expr, ...(opt(r.unit ?? r.einheit) ? { unit: opt(r.unit ?? r.einheit) } : {}), ...(Number.isInteger(Number(r.digits)) && r.digits !== undefined && r.digits !== '' ? { digits: Math.max(0, Math.min(4, Number(r.digits))) } : {}), ...(clean(r.as ?? r.format) === 'frac' ? { as: 'frac' as const } : {}), ...(why ? { why } : {}), ...(hint ? { hint } : {}) }
    return computeTask(task) ? task : null
  }

  if (t === 'solve' || t === 'gleichung') {
    const equation = clean(r.equation ?? r.gleichung ?? r.expr)
    if (!q || !equation.includes('=')) return null
    const task: Task = { t: 'solve', q, equation, ...(Number.isInteger(Number(r.digits)) && r.digits !== undefined && r.digits !== '' ? { digits: Math.max(0, Math.min(4, Number(r.digits))) } : {}), ...(why ? { why } : {}), ...(hint ? { hint } : {}) }
    return computeTask(task) ? task : null
  }

  return null
}

/** Mehrere Aufgaben prüfen; doppelte Fragen entfallen. */
export function normalizeTasks(raw: unknown): { tasks: Task[]; dropped: number } {
  const seen = new Set<string>()
  const tasks: Task[] = []
  let dropped = 0
  for (const x of list(raw)) {
    const t = normalizeTask(x)
    const key = t ? norm(taskQuestion(t)) : ''
    if (!t || seen.has(key)) {
      dropped++
      continue
    }
    seen.add(key)
    tasks.push(t)
  }
  return { tasks, dropped }
}

// ---------- Aufgabe → Übung ----------

export interface TaskExerciseOptions {
  rng?: () => number
  lang?: DeckLang
  /** Nur zum Umdrehen (Karteikarten-Modus) */
  flip?: boolean
}

/** Die Übung zu einer Aufgabe. Karten-Modus ("Karteikarten") zeigt jede Aufgabe als Frage/Antwort zum Umdrehen. */
export function taskToExercise(item: Item, task: Task, opts: TaskExerciseOptions = {}): Exercise {
  const rng = opts.rng ?? Math.random
  const itemId = item.id
  if (opts.flip && task.t !== 'order' && task.t !== 'match') {
    return { kind: 'qcard', id: `${itemId}:flip`, itemId, front: taskQuestion(task), back: taskAnswerText(task) }
  }
  switch (task.t) {
    case 'mc':
      return { kind: 'mchoice', id: `${itemId}:mc`, itemId, title: 'Wähle die richtige Antwort', prompt: task.q, answer: task.options[task.answer], options: shuffle(task.options, rng), ...(task.hint ? { hint: task.hint } : {}), ...(task.why ? { solution: task.why } : {}) }
    case 'tf':
      return { kind: 'mchoice', id: `${itemId}:tf`, itemId, title: 'Richtig oder falsch?', prompt: task.q, answer: task.truth ? 'Richtig' : 'Falsch', options: ['Richtig', 'Falsch'], ...(task.why ? { solution: task.why } : {}) }
    case 'cloze':
      return { kind: 'qtype', id: `${itemId}:cloze`, itemId, title: 'Setze das fehlende Wort ein', prompt: task.text, answer: task.answers[0], ...(task.answers.length > 1 ? { accept: task.answers.slice(1) } : {}) }
    case 'order':
      return { kind: 'order', id: `${itemId}:order`, itemId, prompt: task.q, steps: task.steps, shuffled: shuffleNotSame(task.steps, rng), ...(task.why ? { why: task.why } : {}) }
    case 'match':
      return { kind: 'mmatch', id: `${itemId}:match`, itemId, title: task.q, pairs: task.pairs.map((p, i) => ({ id: `${itemId}:p${i}`, left: p.l, right: p.r })) }
    case 'type':
      return { kind: 'qtype', id: `${itemId}:type`, itemId, title: 'Schreibe die Antwort', prompt: task.q, answer: task.answer, ...(task.accept?.length ? { accept: task.accept } : {}), ...(task.lang ? { lang: task.lang } : {}) }
    case 'short':
      return { kind: 'qcard', id: `${itemId}:short`, itemId, front: task.q, back: task.sample + (task.keys?.length ? `\n\nDas gehört dazu: ${task.keys.join(', ')}` : '') }
    case 'calc':
    case 'solve': {
      const c = computeTask(task)!
      const base = { kind: 'calc' as const, id: `${itemId}:calc`, itemId, title: task.t === 'solve' ? 'Löse die Gleichung' : 'Rechne aus', prompt: task.q, answer: c.text, value: c.value, ...(c.accept ? { accept: c.accept } : {}), ...(c.reduce ? { reduce: true } : {}), ...(c.frac ? { frac: true } : {}), ...(task.hint ? { hint: task.hint } : {}) }
      const solution = task.why ?? (task.t === 'solve' ? task.equation : task.expr)
      return task.t === 'solve' ? { ...base, lead: 'x =', solution } : { ...base, ...(task.unit ? { unit: task.unit } : {}), solution }
    }
  }
}

/** Gemischt, aber nie in der richtigen Reihenfolge (sonst wäre die Aufgabe schon gelöst). */
export function shuffleNotSame<T>(arr: T[], rng: () => number): T[] {
  for (let i = 0; i < 6; i++) {
    const s = shuffle(arr, rng)
    if (s.some((x, k) => x !== arr[k])) return s
  }
  return [...arr].reverse()
}
