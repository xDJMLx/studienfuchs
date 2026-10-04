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
      if (s.id !== 'franzoesisch') expect(s.rules.length).toBeGreaterThan(0)
    }
  })

  it('jedes Fach hat ein eigenes Symbol und einen kurzen, richtigen Namen', () => {
    for (const s of HELP_SUBJECTS) expect(hasSubjectIcon(s.id), s.id).toBe(true)
    expect(helpSubject('politik')?.name).toBe('Politik')
  })

  it('Französisch und Englisch haben Kartensprachen, die anderen Fächer nicht', () => {
    expect(helpSubject('franzoesisch')?.lang).toBe('fr')
    expect(helpSubject('englisch')?.lang).toBe('en')
    expect(HELP_SUBJECTS.filter((s) => s.lang).map((s) => s.id)).toEqual(['franzoesisch', 'englisch'])
  })

  it('der Prompt macht klar: vertiefen und für Arbeiten üben, keine fertigen Hausaufgaben', () => {
    const p = buildSubjectPrompt({ subject: helpSubject('mathe')!, streak: 3 })
    expect(p).toContain('Unterricht')
    expect(p).toContain('Arbeiten')
    expect(p).toContain('Hausaufgaben')
    expect(p).toContain('Fach Mathe')
    expect(p).not.toContain('Serie')
    expect(p).toContain('Kein LaTeX')
  })

  it('der Französisch-Prompt bleibt unverändert', () => {
    const p = buildCoachPrompt({ grade: 7, examDates: {}, sets: [], cards: {}, lessonsDone: 0, lessonsTotal: 10, streak: 0 })
    expect(p).toContain('Französisch')
  })
})
