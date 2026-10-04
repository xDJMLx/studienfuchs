import type { Exercise, Lesson, Unit } from '../../lib/types'
import { skillItem, type Draft, type Form, type Level } from './core'
import { MATH_GRADE_7, type FormulaCard } from './curriculum'
import { freshSeed, makeRng, type Rng } from './rng'
import { SKILLS } from './registry'
import './skills/rz'
import './skills/br'
import './skills/pz'
import './skills/tm'
import './skills/zu'
import './skills/ge'
import './skills/da'

export { SKILLS } from './registry'
export type { FormulaCard } from './curriculum'

export const MATH_GRADES = [7]

/** Alle Mathe-Einheiten als normale Einheiten (Lektionen mit Themen statt Vokabeln). */
function build(): Unit[] {
  const units: Unit[] = []
  MATH_GRADE_7.forEach((def, ui) => {
    const unitId = `m7-u${ui + 1}`
    const lessons: Lesson[] = def.lessons.map((l, li) => {
      for (const s of l.skills) if (!SKILLS[s]) throw new Error(`Mathe: unbekanntes Thema ${s} in ${def.title}`)
      return {
        id: `${unitId}-l${li + 1}`,
        title: l.title,
        explanation: l.explanation,
        items: [...new Set(l.skills)].map((s) => skillItem(SKILLS[s])),
      }
    })
    const all = lessons.flatMap((l) => l.items)
    const unique = [...new Map(all.map((i) => [i.id, i])).values()]
    if (lessons.length >= 2) lessons.push({ id: `${unitId}-review`, title: 'Einheit wiederholen', items: unique, review: true })
    if (lessons.length >= 3) lessons.push({ id: `${unitId}-test`, title: 'Einheitentest', items: unique, test: true })
    units.push({ id: unitId, title: def.title, description: def.description, grade: 7, subject: 'math', lessons })
  })
  return units
}

export const mathUnits: Unit[] = build()

export const mathSkillIds = Object.keys(SKILLS)

/** Formelsammlung (Merkblatt) zu einer Einheit. */
export function unitFormulas(unitId: string): FormulaCard[] {
  const i = mathUnits.findIndex((u) => u.id === unitId)
  return i >= 0 ? MATH_GRADE_7[i].formulas : []
}

export const isMathSkill = (id: string): boolean => id in SKILLS

/** Kennungen aller Themen einer Einheit (ohne Doppelte). */
export function skillsOfUnit(unitId: string): string[] {
  const u = mathUnits.find((x) => x.id === unitId)
  return u ? [...new Set(u.lessons.filter((l) => !l.review && !l.test).flatMap((l) => l.items.map((i) => i.id)))] : []
}

// ---------- Aufgaben einer Sitzung ----------

export interface MathSessionOptions {
  skillIds: string[]
  /** Anzahl der Aufgaben (ohne Aufwärmen) */
  count: number
  /** Start- und Endstufe: Die Aufgaben werden im Lauf der Sitzung schwerer */
  from?: Level
  to?: Level
  /** Fälligen älteren Themen, die zum Aufwärmen kurz abgefragt werden (höchstens zwei Aufgaben) */
  warm?: string[]
  form?: Form
  rng?: Rng
  /** Stufe, bei der ein Thema beginnt (z. B. höher, wenn es schon gut sitzt) */
  startLevelOf?: (skillId: string) => Level
}

const key = (d: Draft): string => (d.kind === 'mmatch' ? d.pairs.map((p) => p.left).join('|') : `${d.prompt}|${d.answer}`)

/** Eine einzelne Aufgabe zu einem Thema, die sich von `avoid` unterscheidet. */
export function makeMathExercise(skillId: string, level: Level, form: Form, rng: Rng, avoid: Set<string> = new Set()): Draft {
  const skill = SKILLS[skillId]
  if (!skill) throw new Error(`Unbekanntes Mathe-Thema: ${skillId}`)
  let draft = skill.gen(rng, level, form)
  for (let i = 0; i < 14 && avoid.has(key(draft)); i++) draft = skill.gen(rng, level, form)
  return draft
}

function toExercise(draft: Draft, skillId: string, id: string, level: Level, form: Form, warm: boolean): Exercise {
  const ex = { ...draft, id, itemId: skillId, ...(warm ? { warm: true } : {}) } as Exercise
  // Bei einem Fehler kommt keine identische Aufgabe wieder, sondern eine frische desselben Themas
  ex.again = () => toExercise(makeMathExercise(skillId, level, form, makeRng(freshSeed()), new Set([key(draft)])), skillId, id, level, form, warm)
  return ex
}

/** Aufgaben für eine Lektion, eine Wiederholung oder freies Üben. Immer frisch und zufällig, nie zweimal dieselbe Aufgabe. */
export function generateMathSession(opts: MathSessionOptions): Exercise[] {
  const rng = opts.rng ?? makeRng(freshSeed())
  const form = opts.form ?? 'any'
  const skills = [...new Set(opts.skillIds.filter((s) => SKILLS[s]))]
  if (!skills.length) return []
  const out: Exercise[] = []
  const seen = new Set<string>()
  const from = opts.from ?? 1
  const to = opts.to ?? 3

  // Aufwärmen: ein bis zwei leichte Aufgaben zu älteren, fälligen Themen
  for (const [i, s] of (opts.warm ?? []).filter((w) => SKILLS[w]).slice(0, 2).entries()) {
    const d = makeMathExercise(s, 1, form, rng, seen)
    seen.add(key(d))
    out.push(toExercise(d, s, `warm:${s}:${i}`, 1, form, true))
  }

  let order = rng.shuffle(skills)
  for (let i = 0; i < opts.count; i++) {
    if (!order.length) order = rng.shuffle(skills)
    const s = order.shift() as string
    const t = opts.count > 1 ? i / (opts.count - 1) : 1
    let level = Math.round(from + (to - from) * t) as Level
    const base = opts.startLevelOf?.(s)
    if (base && base > level) level = base
    level = Math.min(3, Math.max(1, level)) as Level
    const d = makeMathExercise(s, level, form, rng, seen)
    seen.add(key(d))
    out.push(toExercise(d, s, `${s}:${i}`, level, form, false))
  }
  return out
}

// ---------- Blitzrunde ----------

/** Kurze Kopfrechen-Themen für die Blitzrunde. Sie liefern immer eine Auswahl (kein Tippen). */
export const BLITZ_SKILLS = ['rz.vergleichen', 'rz.betrag', 'rz.add', 'rz.sub', 'rz.mul', 'rz.div', 'rz.punkt', 'br.kuerzen', 'br.vergleichen', 'br.add', 'br.mul', 'dez.rechnen', 'tm.einsetzen', 'gl.einfach', 'da.mittel', 'da.median', 'da.spann'].filter((id) => id in SKILLS)

export interface MathBlitzQuestion {
  skillId: string
  prompt: string
  options: string[]
  answer: string
}

/** Nächste Blitz-Frage aus den Themen, die schon gelernt sind (nie zweimal dasselbe Thema direkt hintereinander, wenn es Alternativen gibt). */
export function makeMathBlitz(pool: string[], level: Level, rnd: Rng = makeRng(freshSeed()), lastSkill?: string): MathBlitzQuestion {
  const candidates = pool.length > 1 ? pool.filter((s) => s !== lastSkill) : pool
  for (let tries = 0; tries < 20; tries++) {
    const skillId = rnd.pick(candidates)
    const d = makeMathExercise(skillId, level, 'choice', rnd)
    if (d.kind === 'mchoice') return { skillId, prompt: d.prompt, options: d.options, answer: d.answer }
  }
  // Notfall: ein sicheres Thema
  const d = makeMathExercise('rz.add', level, 'choice', rnd)
  if (d.kind !== 'mchoice') throw new Error('rz.add muss eine Auswahl liefern')
  return { skillId: 'rz.add', prompt: d.prompt, options: d.options, answer: d.answer }
}
