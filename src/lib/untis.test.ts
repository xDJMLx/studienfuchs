import { describe, expect, it, vi } from 'vitest'
import { parseIcs, unfold } from './ics'
import { agoText, derivePeriods, examKind, fetchIcs, importUntis, mergeExams, normalizeUntisUrl, subjectFromName, syncDue, UntisError, type UntisState } from './untis'
import type { Arbeit } from './types'

const NOW = new Date(2026, 9, 5, 12, 0) // Mo 5. Okt. 2026

/** Eine Beispieldatei, wie sie WebUntis/Untis-Exporte liefern: Unterricht je Stunde, eine Klassenarbeit, ein Test, eine ausgefallene Stunde. */
const day = (d: number) => `202610${String(d).padStart(2, '0')}`
const lesson = (uid: string, d: number, from: string, to: string, name: string, room = 'R101', extra = '') => [
  'BEGIN:VEVENT',
  `UID:${uid}`,
  `DTSTART;TZID=Europe/Berlin:${day(d)}T${from}00`,
  `DTEND;TZID=Europe/Berlin:${day(d)}T${to}00`,
  `SUMMARY:${name}`,
  `LOCATION:${room}`,
  extra,
  'END:VEVENT',
]
const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Untis//EN']
const slots = [['0800', '0845'], ['0855', '0940'], ['1000', '1045'], ['1055', '1140']]
for (const d of [5, 6, 7, 8, 9]) slots.forEach(([a, b], i) => lines.push(...lesson(`l-${d}-${i}`, d, a, b, ['Mathe', 'Bio', 'E', 'Deutsch'][(i + d) % 4])))
lines.push(...lesson('exam-1', 8, '0855', '1040', 'Mathe Klassenarbeit', 'R101'))
lines.push(...lesson('exam-2', 9, '1000', '1045', 'Bio', 'R202', 'DESCRIPTION:Test zur Zelle'))
lines.push(...lesson('cancel-1', 6, '0800', '0845', 'Kunst', 'R5', 'STATUS:CANCELLED'))
lines.push('END:VCALENDAR')
const ICS = lines.filter(Boolean).join('\r\n')

describe('iCal lesen', () => {
  it('fügt umgebrochene Zeilen zusammen und liest Umlaute, Kommas und Zeilenumbrüche', () => {
    expect(unfold('SUMMARY:Ma\r\n the\r\n matik')).toEqual(['SUMMARY:Mathematik'])
    const ev = parseIcs('BEGIN:VEVENT\r\nUID:1\r\nDTSTART:20261005T080000\r\nDTEND:20261005T084500\r\nSUMMARY:Fr\\, Klasse 7\\; B\r\nDESCRIPTION:Zeile1\\nZeile2\r\nEND:VEVENT')[0]
    expect(ev).toMatchObject({ summary: 'Fr, Klasse 7; B', description: 'Zeile1\nZeile2', date: '2026-10-05', start: 480, end: 525, allDay: false })
  })

  it('ganztägige Termine und UTC-Zeiten', () => {
    const [a] = parseIcs('BEGIN:VEVENT\r\nUID:a\r\nDTSTART;VALUE=DATE:20261012\r\nSUMMARY:Studientag\r\nEND:VEVENT')
    expect(a).toMatchObject({ date: '2026-10-12', allDay: true, start: null })
    const [u] = parseIcs('BEGIN:VEVENT\r\nUID:u\r\nDTSTART:20261005T060000Z\r\nDTEND:20261005T064500Z\r\nSUMMARY:UTC\r\nEND:VEVENT')
    // Ortszeit des Geräts: 06:00 UTC + Zeitzonen-Versatz
    const off = -new Date(Date.UTC(2026, 9, 5, 6, 0)).getTimezoneOffset()
    expect(u.start).toBe(360 + off)
    expect(u.end! - u.start!).toBe(45)
  })
})

describe('Fach und Art erkennen', () => {
  it('Kürzel und Namen → Fach', () => {
    expect(subjectFromName('Bio')).toBe('biologie')
    expect(subjectFromName('Mathematik GK')).toBe('mathe')
    expect(subjectFromName('E 7a')).toBe('englisch')
    expect(subjectFromName('Politische Bildung')).toBe('politik')
    expect(subjectFromName('Sport')).toBe('sonstiges')
    expect(subjectFromName('Latein')).toBeUndefined()
    expect(subjectFromName('')).toBeUndefined()
  })
  it('Klassenarbeit, Test, Klausur, Vokabeltest; normaler Unterricht nicht', () => {
    expect(examKind('Mathe Klassenarbeit')).toBe('klassenarbeit')
    expect(examKind('Bio Test zur Zelle')).toBe('test')
    expect(examKind('Vokabeltest Englisch')).toBe('vokabeltest')
    expect(examKind('Deutsch Klausur')).toBe('klausur')
    expect(examKind('Mathe')).toBeNull()
    expect(examKind('Kontest')).toBeNull()
  })
})

describe('WebUntis-Import', () => {
  const imp = importUntis(ICS, NOW)

  it('leitet das Stundenraster mit Pausen aus dem Unterricht ab', () => {
    expect(imp.periods).toEqual([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
      { start: '10:00', end: '10:45' },
      { start: '10:55', end: '11:40' },
    ])
  })

  it('übernimmt Unterricht mit Fach, Raum und Ausfall; Klassenarbeiten sind kein Unterricht', () => {
    const l = imp.lessons.find((x) => x.id === 'l-5-0')!
    expect(l).toMatchObject({ date: '2026-10-05', start: '08:00', end: '08:45', room: 'R101' })
    expect(imp.lessons.find((x) => x.id === 'cancel-1')).toMatchObject({ cancelled: true, name: 'Kunst' })
    expect(imp.lessons.some((x) => x.id === 'exam-1' || x.id === 'exam-2')).toBe(false)
  })

  it('erkennt Klassenarbeit und Test mit Fach, Art, Tag und Zeit', () => {
    expect(imp.exams.map((e) => [e.uid, e.subject, e.kind, e.date, e.time, e.duration])).toEqual([
      ['exam-1', 'mathe', 'klassenarbeit', '2026-10-08', '08:55', 105],
      ['exam-2', 'biologie', 'test', '2026-10-09', '10:00', 45],
    ])
  })

  it('lehnt Unbrauchbares verständlich ab', () => {
    expect(() => importUntis('<html>Login</html>', NOW)).toThrow(UntisError)
    expect(() => importUntis('BEGIN:VCALENDAR\r\nEND:VCALENDAR', NOW)).toThrow(/keine Termine/)
  })

  it('Raster aus Doppelstunden: die kurze Länge gewinnt', () => {
    const rows: { start: number; end: number }[] = []
    for (let i = 0; i < 6; i++) rows.push({ start: 480, end: 525 }, { start: 535, end: 580 }, { start: 535, end: 625 })
    expect(derivePeriods(rows)).toEqual([
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
    ])
  })
})

describe('Klassenarbeiten zusammenführen', () => {
  const base = importUntis(ICS, NOW).exams
  it('legt neue an und behält Karteikarten, Note und Abgehaktes beim nächsten Abgleich', () => {
    let list = mergeExams([], base)
    expect(list.map((a) => a.id)).toEqual(['untis:exam-1', 'untis:exam-2'])
    list = list.map((a) => (a.id === 'untis:exam-1' ? { ...a, deckIds: ['d1'], done: true, note: 2 } : a))
    const again = mergeExams(list, base)
    expect(again.find((a) => a.id === 'untis:exam-1')).toMatchObject({ deckIds: ['d1'], done: true, note: 2 })
    expect(again).toHaveLength(2)
  })

  it('eigene Arbeiten bleiben, in WebUntis verschwundene gehen weg – außer sie haben Karteikarten', () => {
    const own: Arbeit = { id: 'a1', subject: 'mathe', title: 'Eigene', date: '2026-10-20', deckIds: [] }
    const gone: Arbeit = { id: 'untis:weg', subject: 'mathe', title: 'Weg', date: '2026-10-10', deckIds: [] }
    const learning: Arbeit = { id: 'untis:lernen', subject: 'mathe', title: 'Lernen', date: '2026-10-11', deckIds: ['d1'] }
    const out = mergeExams([own, gone, learning], base).map((a) => a.id)
    expect(out).toContain('a1')
    expect(out).toContain('untis:lernen')
    expect(out).not.toContain('untis:weg')
  })
})

describe('Link und Abruf', () => {
  it('webcal wird https; Unsinn und http werden abgelehnt', () => {
    expect(normalizeUntisUrl(' webcal://nessa.webuntis.com/WebUntis/Ical.do?school=x&key=1 ')).toBe('https://nessa.webuntis.com/WebUntis/Ical.do?school=x&key=1')
    expect(() => normalizeUntisUrl('hallo')).toThrow(/gültiger Link/)
    expect(() => normalizeUntisUrl('http://x.de/a.ics')).toThrow(/https/)
  })

  it('Abruf direkt oder über das Relais, mit verständlichen Fehlern', async () => {
    const ok = vi.fn(async () => new Response('BEGIN:VCALENDAR', { status: 200 })) as unknown as typeof fetch
    await expect(fetchIcs('https://a.webuntis.com/x', undefined, ok)).resolves.toContain('VCALENDAR')
    expect((ok as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('https://a.webuntis.com/x')
    await fetchIcs('https://a.webuntis.com/x?k=1', 'https://relay.example.workers.dev/', ok)
    expect((ok as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe('https://relay.example.workers.dev/?url=https%3A%2F%2Fa.webuntis.com%2Fx%3Fk%3D1')
    const blocked = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(fetchIcs('https://a.webuntis.com/x', undefined, blocked)).rejects.toThrow(/\.ics-Datei/)
    const denied = (async () => new Response('', { status: 403 })) as unknown as typeof fetch
    await expect(fetchIcs('https://a.webuntis.com/x', undefined, denied)).rejects.toThrow(/abgelaufen/)
  })

  it('wann im Hintergrund abgeglichen wird', () => {
    const st = (lastSync?: string): UntisState => ({ url: 'https://x', lessons: [], exams: 0, lastSync })
    expect(syncDue(null, NOW)).toBe(false)
    expect(syncDue(st(), NOW)).toBe(true)
    expect(syncDue(st(new Date(NOW.getTime() - 2 * 3_600_000).toISOString()), NOW)).toBe(false)
    expect(syncDue(st(new Date(NOW.getTime() - 7 * 3_600_000).toISOString()), NOW)).toBe(true)
    expect(agoText(undefined)).toBe('noch nie')
    expect(agoText(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe('vor 3 Std.')
  })
})

describe('Link erkennen', () => {
  it('erkennt WebUntis-Links in der Zwischenablage, andere nicht', async () => {
    const { looksLikeUntisLink } = await import('./untis')
    expect(looksLikeUntisLink('webcal://xyz.webuntis.com/WebUntis/Ical.do?school=a&token=1')).toBe(true)
    expect(looksLikeUntisLink('  https://xyz.webuntis.com/WebUntis/Ical.do?k=1\n')).toBe(true)
    expect(looksLikeUntisLink('https://example.com/kalender.ics')).toBe(false)
    expect(looksLikeUntisLink('Hallo Welt')).toBe(false)
    expect(looksLikeUntisLink('')).toBe(false)
  })
})
