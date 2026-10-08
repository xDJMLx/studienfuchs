import { describe, expect, it } from 'vitest'
import { importFromWeek, lessonsFromWeek, normalizeTimetable, periodsOfWeek, readTimetablePhoto } from './untisPhoto'
import { UntisError } from './untis'

const RAW = {
  lessons: [
    { day: 0, start: '8:00', end: '08:45', name: 'Bio', room: 'A12' },
    { day: 0, start: '08:55', end: '9.40', name: 'Mathe' },
    { day: 1, start: '08:00', end: '08:45', name: 'E' },
    { day: 1, start: '08:55', end: '09:40', name: 'D' },
    { day: 2, start: '08:00', end: '08:45', name: 'Ph' },
    { day: 2, start: '08:55', end: '09:40', name: 'Ku' },
    { day: 9, start: '08:00', end: '08:45', name: 'Falscher Tag' },
    { day: 3, start: '10:00', end: '10:05', name: 'Zu kurz' },
    { day: 3, start: 'abc', end: '10:45', name: 'Keine Zeit' },
    { day: 3, start: '08:00', end: '08:45', name: '' },
    { day: 0, start: '08:00', end: '08:45', name: 'Doppelt' },
  ],
}

describe('Stundenplan aus dem Foto', () => {
  it('prüft die Antwort der KI: Zeiten säubern, Unsinn und Doppeltes weglassen, sortieren', () => {
    const w = normalizeTimetable(RAW)
    expect(w).toHaveLength(6)
    expect(w[0]).toEqual({ day: 0, start: '08:00', end: '08:45', name: 'Bio', room: 'A12' })
    expect(w[1]).toMatchObject({ day: 0, start: '08:55', end: '09:40', name: 'Mathe' })
    expect(w.map((l) => l.name)).not.toContain('Doppelt')
    expect(normalizeTimetable({})).toEqual([])
    expect(normalizeTimetable(null)).toEqual([])
  })

  it('macht aus dem Wochenplan Stunden für zehn Wochen und erkennt die Fächer', () => {
    const w = normalizeTimetable(RAW)
    // Mittwoch, 7. Oktober 2026 → die Woche beginnt am Montag, 5. Oktober
    const l = lessonsFromWeek(w, new Date(2026, 9, 7), 10)
    expect(l).toHaveLength(60)
    expect(l[0]).toMatchObject({ date: '2026-10-05', start: '08:00', name: 'Bio', subject: 'biologie', room: 'A12' })
    expect(l.find((x) => x.name === 'Ph' && x.date === '2026-10-07')).toBeTruthy()
    expect(l.find((x) => x.name === 'E')?.date).toBe('2026-10-06')
    expect(new Set(l.map((x) => x.id)).size).toBe(60)
  })

  it('leitet das Stundenraster aus den Zeiten ab', () => {
    expect(periodsOfWeek(normalizeTimetable(RAW))).toEqual([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
    ])
  })

  it('liest über die KI; leere oder unlesbare Antworten geben verständliche Fehler', async () => {
    const ok = async () => JSON.stringify(RAW)
    const imp = await readTimetablePhoto(['jpeg'], new Date(2026, 9, 7), ok as never)
    expect(imp.lessons).toHaveLength(60)
    expect(imp.exams).toEqual([])
    expect(imp.periods).toHaveLength(2)
    await expect(readTimetablePhoto(['jpeg'], new Date(), (async () => 'Sorry, das kann ich nicht') as never)).rejects.toThrow(UntisError)
    await expect(readTimetablePhoto(['jpeg'], new Date(), (async () => '{"lessons": []}') as never)).rejects.toThrow(/keinen Stundenplan/)
    await expect(readTimetablePhoto([])).rejects.toThrow(/Foto/)
    expect(() => importFromWeek([])).toThrow(UntisError)
  })
})
