import { describe, expect, it } from 'vitest'
import { allUnits, blockingLesson, findLesson, isMathLesson, isUnlocked, mathItems, mathUnits, nextLessonAfter, units } from '../index'
import { buildCoachPrompt } from '../../lib/coach'
import { addProgress, emptyDaily, foxGreeting, questDef } from '../../lib/rewards'
import { evaluate } from '../../lib/evaluate'
import { generateMathSession, BLITZ_SKILLS, makeMathBlitz, unitFormulas, skillsOfUnit } from './index'
import { makeRng } from './rng'

const done = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { bestAccuracy: 1 }]))

describe('Mathe im Lernpfad', () => {
  it('Lektions-Kennungen sind eindeutig und von Französisch unterscheidbar', () => {
    const ids = allUnits.flatMap((u) => u.lessons.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of mathUnits.flatMap((u) => u.lessons)) expect(isMathLesson(l.id)).toBe(true)
    for (const l of units.flatMap((u) => u.lessons)) expect(isMathLesson(l.id), l.id).toBe(false)
  })

  it('findLesson findet Mathe-Lektionen mit ihrer Einheit', () => {
    const f = findLesson('m7-u1-l1')
    expect(f?.unit.subject).toBe('math')
    expect(f?.lesson.explanation?.math).toBe(true)
  })

  it('die erste Lektion ist offen, die zweite erst nach der ersten', () => {
    expect(isUnlocked('m7-u1-l1', {})).toBe(true)
    expect(isUnlocked('m7-u1-l2', {})).toBe(false)
    expect(isUnlocked('m7-u1-l2', done(['m7-u1-l1']))).toBe(true)
    expect(blockingLesson('m7-u1-l2', {})?.id).toBe('m7-u1-l1')
  })

  it('Mathe-Einheit 2 hängt nur an Mathe-Einheit 1, nicht an Französisch', () => {
    expect(isUnlocked('m7-u2-l1', {})).toBe(false)
    const unit1 = mathUnits[0].lessons.filter((l) => !l.review && !l.test).map((l) => l.id)
    expect(isUnlocked('m7-u2-l1', done(unit1))).toBe(true)
  })

  it('Französisch bleibt unverändert: erste Lektion offen, auch ohne Mathe', () => {
    const first = units.find((u) => u.grade === 7 && !u.extra)?.lessons[0]
    expect(first && isUnlocked(first.id, {})).toBe(true)
  })

  it('Wiederholung und Test öffnen, wenn alle normalen Lektionen geschafft sind', () => {
    const u = mathUnits[0]
    const regular = u.lessons.filter((l) => !l.review && !l.test).map((l) => l.id)
    expect(isUnlocked(`${u.id}-review`, done(regular.slice(1)))).toBe(false)
    expect(isUnlocked(`${u.id}-review`, done(regular))).toBe(true)
    expect(isUnlocked(`${u.id}-test`, done(regular))).toBe(true)
  })

  it('nach einer Lektion kommt als Nächstes die nächste Mathe-Lektion', () => {
    const next = nextLessonAfter('m7-u1-l1', done(['m7-u1-l1']))
    expect(next?.id).toBe('m7-u1-l2')
  })

  it('jedes Thema hat einen Eintrag in der Themen-Übersicht', () => {
    for (const u of mathUnits) {
      for (const id of skillsOfUnit(u.id)) expect(mathItems.has(id), id).toBe(true)
      expect(unitFormulas(u.id).length, u.title).toBeGreaterThan(0)
    }
  })
})

describe('Mathe: Tagesaufgaben', () => {
  it('neue und wiederholte Themen zählen halb so viel wie Wörter', () => {
    expect(questDef('newWords:8', 'math')?.target).toBe(4)
    expect(questDef('reviewed:6', 'math')?.target).toBe(3)
    expect(questDef('newWords:8')?.target).toBe(8)
    expect(questDef('practiced:10', 'math')?.text).toBe('Löse 10 Aufgaben')
  })

  it('Fortschritt in Mathe bezahlt die Aufgabe beim halben Ziel', () => {
    const d = { ...emptyDaily('2026-05-04', { knownWords: 0 }), quests: ['newWords:8', 'lessons:1', 'blitz:1'] }
    const fr = addProgress(d, { newWords: 4 }, 'fr')
    expect(fr.completed.map((q) => q.id)).not.toContain('newWords:8')
    const math = addProgress(d, { newWords: 4 }, 'math')
    expect(math.completed.map((q) => q.id)).toContain('newWords:8')
  })

  it('der Fuchs begrüßt in Mathe auf Deutsch', () => {
    const g = { doneLessons: 3, streakDays: 0, daysAway: 0, chestReady: false, questsLeft: 3, goalLeft: 40, hour: 12 }
    expect(foxGreeting(g)).toBe('Salut ! Weiter geht’s.')
    expect(foxGreeting({ ...g, subject: 'math' })).toBe('Hi! Weiter geht’s.')
  })
})

describe('Mathe: Sitzungen und Blitzrunde', () => {
  it('höhere Startstufe bei gut sitzenden Themen', () => {
    const list = generateMathSession({ skillIds: ['rz.add'], count: 6, from: 1, to: 1, startLevelOf: () => 2, rng: makeRng(2) })
    expect(list).toHaveLength(6)
    // Stufe 2 heißt: keine reinen Leichtaufgaben mehr (Zahlen bis in den zweistelligen Bereich)
    expect(list.every((e) => e.itemId === 'rz.add')).toBe(true)
  })

  it('Aufwärmaufgaben stehen vor den Lektionsaufgaben und zählen nicht fürs Bestehen', () => {
    const list = generateMathSession({ skillIds: ['rz.sub'], count: 4, warm: ['rz.add', 'rz.mul', 'rz.div'], rng: makeRng(7) })
    expect(list.slice(0, 2).every((e) => e.warm)).toBe(true)
    expect(list.slice(2).every((e) => !e.warm)).toBe(true)
  })

  it('Blitzfragen sind immer eine Auswahl mit der richtigen Antwort darunter', () => {
    const pool = BLITZ_SKILLS
    const rnd = makeRng(11)
    let last: string | undefined
    for (let i = 0; i < 300; i++) {
      const q = makeMathBlitz(pool, ((i % 3) + 1) as 1 | 2 | 3, rnd, last)
      expect(q.options).toContain(q.answer)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.options.length).toBeGreaterThanOrEqual(3)
      if (pool.length > 1) expect(q.skillId).not.toBe(last)
      last = q.skillId
    }
  })

  it('"Weiß ich nicht" ist bei jeder Aufgabe falsch und nennt das Thema als Fehler', () => {
    const list = generateMathSession({ skillIds: ['br.add', 'gl.zwei', 'da.laplace'], count: 18, rng: makeRng(4) })
    for (const ex of list) {
      if (ex.kind === 'mmatch') continue
      const ev = evaluate(ex, '')
      expect(ev.status).toBe('wrong')
      expect(ev.mistakeItemIds).toEqual([ex.itemId])
    }
  })
})

describe('Mathe: KI-Hilfe', () => {
  it('kennt das Fach und bleibt bei einfacher Textschreibweise', () => {
    const p = buildCoachPrompt({ subject: 'math', grade: 7, examDates: {}, sets: [], cards: {}, lessonsDone: 2, lessonsTotal: 34, streak: 1 })
    expect(p).toContain('Mathematik')
    expect(p).toContain('2 von 34 Mathe-Lektionen')
    expect(p).not.toContain('```vokabeln')
  })

  it('Französisch bleibt unverändert', () => {
    const p = buildCoachPrompt({ grade: 7, examDates: {}, sets: [], cards: {}, lessonsDone: 0, lessonsTotal: 10, streak: 0 })
    expect(p).toContain('Französisch')
  })
})
