import { describe, expect, it } from 'vitest'
import { importFromWeek, lessonsFromWeek, mergeWeeks, normalizeTimetable, periodsOfWeek, readCell, readTimetablePhotos } from './untisPhoto'
import { subjectFromName, UntisError } from './untis'

/** So sieht eine Zelle aus WebUntis aus: Lehrer, Fach, Raum, manchmal die Klasse, in wechselnder Reihenfolge. */
const RAW = {
  lessons: [
    { day: 0, start: '8:00', end: '08:45', cell: ['MÜL', 'BI_4', 'A12'] },
    { day: 0, start: '08:55', end: '9.40', cell: ['KRA', 'MA', '204', '7a'] },
    { day: 1, start: '08:00', end: '08:45', cell: ['E', 'SCH', 'R105'] },
    { day: 1, start: '08:55', end: '09:40', cell: ['DE', 'LEH', '7a'] },
    { day: 2, start: '08:00', end: '08:45', cell: ['PH_W1', 'BER', '301'] },
    { day: 2, start: '08:55', end: '09:40', cell: ['KU', 'ZIM'] },
    { day: 9, start: '08:00', end: '08:45', cell: ['MA'] },
    { day: 3, start: '10:00', end: '10:05', cell: ['MA'] },
    { day: 3, start: 'abc', end: '10:45', cell: ['MA'] },
    { day: 3, start: '08:00', end: '08:45', cell: [] },
    { day: 0, start: '08:00', end: '08:45', cell: ['DOPPELT'] },
  ],
}

describe('Fächer aus den Zeilen einer Zelle', () => {
  it('erkennt Fach, Raum und überspringt Lehrer und Klasse', () => {
    expect(readCell(['MÜL', 'BI_4', 'A12'])).toEqual({ name: 'BI_4', room: 'A12' })
    expect(readCell(['KRA', 'MA', '204', '7a'])).toEqual({ name: 'MA', room: '204' })
    expect(readCell(['SCH', 'E', 'R105'])).toEqual({ name: 'E', room: 'R105' })
    expect(readCell(['7a', 'LEH', 'DE'])).toEqual({ name: 'DE' })
    expect(readCell(['PH_W1'])).toEqual({ name: 'PH_W1' })
    expect(readCell(['SPO-2', 'MEI', 'Halle'])?.name).toBe('SPO-2')
    expect(readCell([])).toBeNull()
  })

  it('die Kürzel aus dem echten Stundenplan werden zu Fächern', () => {
    const cases: [string, string | undefined][] = [
      ['KU', 'kunst'], ['E', 'englisch'], ['PH', 'physik'], ['PB', 'politik'], ['DE', 'deutsch'], ['PH_W1', 'physik'], ['CH', 'chemie'],
      ['F', 'franzoesisch'], ['MA', 'mathe'], ['BI_4', 'biologie'], ['SPO-2', 'sonstiges'], ['TUT', 'sonstiges'], ['GE', 'geschichte'],
    ]
    for (const [k, id] of cases) expect(subjectFromName(k), k).toBe(id)
  })
})

describe('Stundenplan aus dem Foto', () => {
  it('prüft die Antwort der KI: Zeiten säubern, Unsinn und Doppeltes weglassen, sortieren', () => {
    const w = normalizeTimetable(RAW)
    expect(w).toHaveLength(6)
    expect(w[0]).toEqual({ day: 0, start: '08:00', end: '08:45', name: 'BI_4', room: 'A12' })
    expect(w[1]).toMatchObject({ day: 0, start: '08:55', end: '09:40', name: 'MA', room: '204' })
    expect(w.map((l) => l.name)).not.toContain('DOPPELT')
    expect(normalizeTimetable({})).toEqual([])
    expect(normalizeTimetable(null)).toEqual([])
  })

  it('versteht auch das ältere Format mit fertigem Namen', () => {
    expect(normalizeTimetable({ lessons: [{ day: 0, start: '08:00', end: '08:45', name: 'Bio', room: 'A1' }] })).toEqual([{ day: 0, start: '08:00', end: '08:45', name: 'Bio', room: 'A1' }])
  })

  it('macht aus dem Wochenplan Stunden für zehn Wochen und erkennt die Fächer', () => {
    const w = normalizeTimetable(RAW)
    // Mittwoch, 7. Oktober 2026 → die Woche beginnt am Montag, 5. Oktober
    const l = lessonsFromWeek(w, new Date(2026, 9, 7), 10)
    expect(l).toHaveLength(60)
    expect(l[0]).toMatchObject({ date: '2026-10-05', start: '08:00', name: 'BI_4', subject: 'biologie', room: 'A12' })
    expect(l.find((x) => x.name === 'PH_W1' && x.date === '2026-10-07')?.subject).toBe('physik')
    expect(l.find((x) => x.name === 'E')?.date).toBe('2026-10-06')
    expect(new Set(l.map((x) => x.id)).size).toBe(60)
  })

  it('leitet das Stundenraster aus den Zeiten ab', () => {
    expect(periodsOfWeek(normalizeTimetable(RAW))).toEqual([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
    ])
  })

  it('mehrere Bilder (oben und unten) werden zusammengefügt, Doppeltes zählt einmal', () => {
    const oben = normalizeTimetable({ lessons: [{ day: 0, start: '08:00', end: '08:45', cell: ['MA'] }, { day: 1, start: '08:00', end: '08:45', cell: ['DE'] }] })
    const unten = normalizeTimetable({ lessons: [{ day: 1, start: '08:00', end: '08:45', cell: ['DE'] }, { day: 0, start: '13:00', end: '13:45', cell: ['KU'] }, { day: 4, start: '14:00', end: '14:45', cell: ['SPO-2'] }] })
    const w = mergeWeeks([oben, unten])
    expect(w.map((l) => `${l.day}-${l.start}-${l.name}`)).toEqual(['0-08:00-MA', '0-13:00-KU', '1-08:00-DE', '4-14:00-SPO-2'])
  })

  it('jedes Bild wird einzeln gelesen; ein unlesbares Bild stört die anderen nicht', async () => {
    const answers = [JSON.stringify({ lessons: [{ day: 0, start: '08:00', end: '08:45', cell: ['MA'] }] }), 'Das kann ich nicht lesen', JSON.stringify({ lessons: [{ day: 2, start: '10:00', end: '10:45', cell: ['E'] }] })]
    const calls: unknown[][] = []
    const ask = (async (...args: unknown[]) => {
      calls.push(args)
      return answers.shift()
    }) as never
    const w = await readTimetablePhotos(['a', 'b', 'c'], ask)
    expect(calls).toHaveLength(3)
    expect((calls[0][2] as string[]).length).toBe(1)
    expect(w.map((l) => l.name)).toEqual(['MA', 'E'])
  })

  it('leere oder unlesbare Antworten geben verständliche Fehler; Anmeldefehler bleiben erhalten', async () => {
    await expect(readTimetablePhotos(['a'], (async () => 'Sorry') as never)).rejects.toThrow(UntisError)
    await expect(readTimetablePhotos(['a'], (async () => '{"lessons": []}') as never)).rejects.toThrow(/nicht lesen/)
    await expect(readTimetablePhotos([])).rejects.toThrow(/Foto/)
    const { AiError } = await import('./ai')
    await expect(readTimetablePhotos(['a'], (async () => { throw new AiError('Anmeldung nötig', 'auth') }) as never)).rejects.toThrow(/Anmeldung nötig/)
    expect(() => importFromWeek([])).toThrow(UntisError)
    const imp = importFromWeek(normalizeTimetable(RAW), new Date(2026, 9, 7))
    expect(imp.lessons).toHaveLength(60)
    expect(imp.exams).toEqual([])
    expect(imp.periods).toHaveLength(2)
  })
})
