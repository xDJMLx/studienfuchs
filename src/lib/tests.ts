import type { Answer, SelfGrade } from './evaluate'
import { evaluate } from './evaluate'
import { approxGrade } from './exam'
import type { CardRef } from './decks'
import { shuffle } from './generateExercises'
import { itemFromTask, normalizeTask, taskQuestion, taskToExercise, type Task, type TaskKind } from './tasks'
import type { Exercise } from './types'

/** Tests, Klassenarbeiten und Vokabeltests für jedes Fach: Aufgaben mit Punkten, ohne Hilfe, am Ende eine ungefähre Note. */
export type TestKind = 'test' | 'arbeit' | 'vokabeltest'

export const TEST_KINDS: { id: TestKind; label: string; minutes: number; text: string }[] = [
  { id: 'test', label: 'Test', minutes: 20, text: 'Kurz, 8 bis 12 Aufgaben, etwa 20 Minuten.' },
  { id: 'arbeit', label: 'Klassenarbeit', minutes: 60, text: 'Mehrere Teile mit Punkten, etwa 45 bis 90 Minuten.' },
  { id: 'vokabeltest', label: 'Vokabeltest', minutes: 15, text: 'Wörter tippen, aus deinen Vokabel-Karteikarten.' },
]

export const testKindLabel = (k: TestKind): string => TEST_KINDS.find((x) => x.id === k)?.label ?? 'Test'

export interface TestTask {
  id: string
  task: Task
  points: number
  /** Anforderungsbereich: 1 Wissen, 2 Anwenden, 3 Begründen und Übertragen (nur bei Tests von der KI) */
  afb?: 1 | 2 | 3
}
export interface TestSection {
  title: string
  /** Text, auf den sich die Aufgaben des Teils beziehen (Lesetext, Quelle, Fall) */
  intro?: string
  tasks: TestTask[]
}
export interface TestData {
  id: string
  subject: string
  kind: TestKind
  title: string
  minutes: number
  createdAt: string
  /** Woraus der Test entstanden ist (Thema oder Karteikarten) */
  source: string
  sections: TestSection[]
}

/** Das Ergebnis eines Durchgangs. */
export interface TestResult {
  testId: string
  at: string
  points: number
  max: number
  percent: number
  note: number
  seconds: number
}

/** Standardpunkte je Aufgabenart. */
export const DEFAULT_POINTS: Record<TaskKind, number> = { mc: 1, tf: 1, cloze: 1, type: 1, order: 2, match: 2, calc: 2, solve: 2, short: 3 }

const clean = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
/** Wie `clean`, aber mit Absätzen (für Lesetexte). */
const cleanText = (v: unknown): string => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '')
/** Wörter, die auf eine Abbildung oder einen Text zeigen, den es ohne "intro" nicht gibt. */
const NEEDS_SOURCE = /(abgebildet|abbildung|zeichnung|skizze|\bdiagramm|siehe (text|bild)|im (obigen|folgenden|oben stehenden|abgedruckten) text|im text\b|der text\b|dem text\b|textstelle)/i
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export const totalPoints = (t: TestData): number => t.sections.reduce((n, s) => n + s.tasks.reduce((m, x) => m + x.points, 0), 0)
export const taskCount = (t: TestData): number => t.sections.reduce((n, s) => n + s.tasks.length, 0)

// ---------- Aus der KI-Antwort ----------

/**
 * KI-Antwort in einen Test verwandeln: ungültige Aufgaben fallen weg (Rechnungen werden nachgerechnet),
 * Punkte werden begrenzt, leere Teile entfallen. Weniger als drei brauchbare Aufgaben ergeben keinen Test (null).
 */
export function normalizeTest(raw: unknown, meta: { id: string; subject: string; kind: TestKind; source: string; now?: Date }): { test: TestData; dropped: number } | null {
  const r = raw as { title?: unknown; minutes?: unknown; sections?: unknown; parts?: unknown; tasks?: unknown }
  if (!r || typeof r !== 'object') return null
  const rawSections = list(r.sections ?? r.parts)
  const sectionsIn = rawSections.length ? rawSections : [{ title: 'Aufgaben', tasks: r.tasks }]
  const seen = new Set<string>()
  let dropped = 0
  let n = 0
  const sections: TestSection[] = []
  for (const s of sectionsIn) {
    const sec = s as { title?: unknown; intro?: unknown; text?: unknown; tasks?: unknown; aufgaben?: unknown }
    const intro = cleanText(sec?.intro ?? sec?.text).slice(0, 2500)
    const tasks: TestTask[] = []
    for (const x of list(sec?.tasks ?? sec?.aufgaben)) {
      const task = normalizeTask(x)
      const key = task ? ((task.t === 'cloze' ? task.text : task.q) || '').toLowerCase() : ''
      // Aufgaben, die sich auf einen Text oder ein Bild beziehen, das nicht da ist, kann niemand lösen
      if (!task || seen.has(key) || (!intro && NEEDS_SOURCE.test(taskQuestion(task)))) {
        dropped++
        continue
      }
      seen.add(key)
      const given = Number((x as { points?: unknown }).points)
      const points = Number.isFinite(given) && given > 0 ? Math.min(8, Math.max(1, Math.round(given * 2) / 2)) : DEFAULT_POINTS[task.t]
      const afbRaw = Number((x as { afb?: unknown }).afb)
      tasks.push({ id: `${meta.id}:${++n}`, task, points, ...(afbRaw === 1 || afbRaw === 2 || afbRaw === 3 ? { afb: afbRaw as 1 | 2 | 3 } : {}) })
    }
    if (tasks.length) sections.push({ title: clean(sec?.title) || `Teil ${sections.length + 1}`, ...(intro ? { intro } : {}), tasks })
  }
  const count = sections.reduce((a, s) => a + s.tasks.length, 0)
  if (count < 3) return null
  const asked = Number(r.minutes)
  const defaults = TEST_KINDS.find((k) => k.id === meta.kind)!.minutes
  return {
    test: {
      id: meta.id,
      subject: meta.subject,
      kind: meta.kind,
      title: clean(r.title).slice(0, 80) || `${testKindLabel(meta.kind)}`,
      minutes: Number.isFinite(asked) && asked >= 5 && asked <= 180 ? Math.round(asked) : defaults,
      createdAt: (meta.now ?? new Date()).toISOString(),
      source: meta.source,
      sections,
    },
    dropped,
  }
}

// ---------- Ohne KI: aus Karteikarten ----------

const splitAlternatives = (s: string): string[] =>
  s
    .split(/\s*[/;]\s*|\s+oder\s+/)
    .map((x) => x.trim())
    .filter(Boolean)

/**
 * Test aus vorhandenen Karteikarten, ohne KI. Vokabeltest: Wörter tippen (deutsch → Fremdsprache, rückwärts oder gemischt).
 * Test: Auswahlfragen (wenn andere Antworten als Auswahl da sind), kurze Antworten zum Tippen, lange Antworten als Kurzantwort mit Selbstbewertung.
 * Vorhandene Aufgaben (Quiz, Rechnen …) kommen unverändert hinein.
 */
export function buildOfflineTest(opts: { refs: CardRef[]; kind: TestKind; subject: string; count: number; direction?: 'toForeign' | 'toGerman' | 'both'; title: string; id: string; rng?: () => number; now?: Date }): TestData | null {
  const rng = opts.rng ?? Math.random
  const picked = shuffle(opts.refs, rng).slice(0, opts.count)
  if (picked.length < 3) return null
  const pool = opts.refs.filter((r) => !r.item.task)
  const tasks: TestTask[] = []
  let n = 0
  const add = (task: Task, points?: number) => tasks.push({ id: `${opts.id}:${++n}`, task, points: points ?? DEFAULT_POINTS[task.t] })
  const vokabel = opts.kind === 'vokabeltest'
  for (const ref of picked) {
    const { item, deck } = ref
    if (item.task) {
      add(item.task)
      continue
    }
    const lang = deck.lang
    if (vokabel || lang) {
      const dir = opts.direction ?? 'both'
      const toGerman = dir === 'toGerman' || (dir === 'both' && rng() < 0.5)
      const q = toGerman ? item.front : item.back
      const a = toGerman ? item.back : item.front
      const alts = splitAlternatives(a)
      add({ t: 'type', q, answer: alts[0] ?? a, ...(alts.length > 1 ? { accept: alts.slice(1) } : {}), ...(lang ? { lang } : {}) })
      continue
    }
    const short = item.back.trim().length <= 30 && !item.back.includes('\n') && item.back.trim().split(/\s+/).length <= 6
    const wrong = shuffle(pool.filter((p) => p.item.id !== item.id && p.item.back.length <= 60 && p.item.back.trim().toLowerCase() !== item.back.trim().toLowerCase()), rng)
    const options = [...new Set(wrong.map((w) => w.item.back))].slice(0, 3)
    if (short && options.length >= 3 && rng() < 0.5) {
      const mixed = shuffle([item.back, ...options], rng)
      add({ t: 'mc', q: item.front, options: mixed, answer: mixed.indexOf(item.back) })
    }
    else if (short) add({ t: 'type', q: item.front, answer: item.back })
    else add({ t: 'short', q: item.front, sample: item.back })
  }
  return {
    id: opts.id,
    subject: opts.subject,
    kind: opts.kind,
    title: opts.title,
    minutes: Math.max(5, Math.round((tasks.length * (vokabel ? 0.5 : 1)) / 5) * 5),
    createdAt: (opts.now ?? new Date()).toISOString(),
    source: 'Aus deinen Karteikarten',
    sections: [{ title: vokabel ? 'Vokabeln' : 'Aufgaben', tasks }],
  }
}

// ---------- Prüfen und Punkte ----------

/** Die Übung zu einer Aufgabe im Test: wie beim Üben, nur ohne Hilfen. Kurzantworten zählen die Selbstbewertung am Ende. */
export function testExercise(t: TestTask, rng: () => number = Math.random): Exercise {
  const ex = taskToExercise(itemFromTask(t.task, t.id), t.task, { rng })
  // Kein Tipp im Test
  return 'hint' in ex ? ({ ...ex, hint: undefined } as Exercise) : ex
}

/** Punkte für eine Antwort. `self` ist die Selbstbewertung bei Kurzantworten. */
export function scoreAnswer(t: TestTask, ex: Exercise, answer: Answer | null, self?: SelfGrade): number {
  if (t.task.t === 'short') return self === 'good' ? t.points : self === 'hard' ? roundHalf(t.points / 2) : 0
  if (answer === null || answer === '') return 0
  if (ex.kind === 'mmatch') {
    const mistakes = (answer as { matchMistakes?: string[] }).matchMistakes?.length ?? 0
    return roundHalf(t.points * Math.max(0, 1 - mistakes / Math.max(1, ex.pairs.length)))
  }
  const ev = evaluate(ex, answer)
  return ev.status === 'correct' ? t.points : ev.status === 'almost' ? roundHalf(t.points / 2) : 0
}

const roundHalf = (n: number) => Math.round(n * 2) / 2

/** Prozent und ungefähre Note. */
export function gradeOf(points: number, max: number): { percent: number; note: number } {
  const percent = max > 0 ? Math.round((points / max) * 100) : 0
  return { percent, note: approxGrade(percent).note }
}

/**
 * Vorschlag für die Selbstbewertung einer Kurzantwort aus den Stichwörtern (wenn die KI welche mitgeliefert hat):
 * alle Stichwörter drin → voll, mindestens die Hälfte → teilweise, sonst nicht. Der Schüler kann das ändern.
 */
export function suggestSelfGrade(task: Extract<Task, { t: 'short' }>, given: string): SelfGrade {
  const keys = task.keys ?? []
  const text = given.toLowerCase()
  if (!text.trim()) return 'again'
  if (!keys.length) return 'hard'
  const hit = keys.filter((k) => text.includes(k.toLowerCase())).length
  return hit === keys.length ? 'good' : hit * 2 >= keys.length ? 'hard' : 'again'
}
