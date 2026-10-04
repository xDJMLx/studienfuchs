import { describe, expect, it } from 'vitest'
import { buildCoachPrompt } from './coach'
import { hasSubjectIcon } from '../components/ui/SubjectIcons'
import { buildSubjectPrompt, HELP_SUBJECTS, helpSubject } from './subjects'

describe('Fächer mit KI-Hilfe', () => {
  it('jedes Fach hat eindeutige Kennung, Name, Vorschläge und Regeln', () => {
    const ids = HELP_SUBJECTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of HELP_SUBJECTS) {
      expect(s.name.length).toBeGreaterThan(2)
      expect(s.suggestions.length).toBeGreaterThanOrEqual(3)
      expect(s.rules.length).toBeGreaterThan(0)
    }
  })

  it('jedes Fach hat ein eigenes Symbol und einen kurzen, richtigen Namen', () => {
    for (const s of HELP_SUBJECTS) expect(hasSubjectIcon(s.id), s.id).toBe(true)
    expect(helpSubject('politik')?.name).toBe('Politik')
  })

  it('Französisch gehört nicht dazu (dafür gibt es den Kurs)', () => {
    expect(helpSubject('franzoesisch')).toBeUndefined()
    expect(HELP_SUBJECTS.every((s) => !/franz/i.test(s.name))).toBe(true)
  })

  it('der Prompt macht klar: kein Kurs, vertiefen und für Arbeiten üben, keine fertigen Hausaufgaben', () => {
    const p = buildSubjectPrompt({ subject: helpSubject('mathe')!, streak: 3 })
    expect(p).toContain('keinen eigenen Kurs')
    expect(p).toContain('Arbeiten')
    expect(p).toContain('Hausaufgaben')
    expect(p).toContain('Fach Mathe')
    expect(p).toContain('Serie 3 Tage')
    expect(p).toContain('Kein LaTeX')
  })

  it('der Französisch-Prompt bleibt unverändert', () => {
    const p = buildCoachPrompt({ grade: 7, examDates: {}, sets: [], cards: {}, lessonsDone: 0, lessonsTotal: 10, streak: 0 })
    expect(p).toContain('Französisch')
    expect(p).not.toContain('keinen eigenen Kurs')
  })
})
