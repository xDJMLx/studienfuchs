// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { anonId, buildReport, clearErrors, logError, maybeSendUsage, recentErrors, reportText, sendReport, setUsageOptIn, track, usageCounts } from './feedback'

beforeEach(() => {
  localStorage.clear()
})

describe('Fehlerprotokoll und Zähler', () => {
  it('merkt sich nur die letzten 15 Fehler und zählt sie mit', () => {
    for (let i = 0; i < 20; i++) logError(`Fehler ${i}`, 'a\nb\nc\nd\ne\nf')
    const list = recentErrors()
    expect(list).toHaveLength(15)
    expect(list[14].message).toBe('Fehler 19')
    expect(list[0].stack?.split('\n')).toHaveLength(4)
    expect(usageCounts().fehler).toBe(20)
    clearErrors()
    expect(recentErrors()).toHaveLength(0)
  })

  it('track zählt hoch, die Kennung bleibt gleich und enthält keinen Namen', () => {
    track('runde')
    track('runde', 2)
    expect(usageCounts().runde).toBe(3)
    expect(anonId()).toBe(anonId())
    expect(anonId()).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('Bericht', () => {
  it('ohne Technik nur Nachricht und Kennung, mit Technik auch Version, Gerät und Zähler', () => {
    track('runde')
    const slim = buildReport({ kind: 'idee', message: '  Dunkler Modus wäre schön  ', withTech: false })
    expect(slim.nachricht).toBe('Dunkler Modus wäre schön')
    expect(slim.technik).toBeUndefined()
    expect(slim.zähler).toBeUndefined()
    const full = buildReport({ kind: 'fehler', message: 'Kaputt', contact: ' Max ', withTech: true, snapshot: { grade: 7, sets: 2 } })
    expect(full.kontakt).toBe('Max')
    expect(full.technik?.grade).toBe(7)
    expect(full.technik?.version).toBeTruthy()
    expect(full.zähler?.runde).toBe(1)
    const text = reportText(full)
    expect(text).toContain('Fehler')
    expect(text).toContain('Kaputt')
    expect(text).toContain('Kontakt: Max')
  })

  it('keine Lerninhalte im Bericht', () => {
    const r = buildReport({ kind: 'fehler', message: 'x'.repeat(5000), withTech: true, snapshot: { sets: 3, cards: 40 } })
    expect(r.nachricht).toHaveLength(2000)
    expect(JSON.stringify(r)).not.toMatch(/front|back|Antwort/)
  })
})

describe('Senden', () => {
  const report = () => buildReport({ kind: 'fehler', message: 'Es klappt nicht', withTech: true })

  it('mit Adresse: direkt als JSON, ok oder Fehler', async () => {
    const ok = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    expect(await sendReport(report(), { url: 'https://x.example', doFetch: ok })).toBe('gesendet')
    expect((ok as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].method).toBe('POST')
    const bad = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    expect(await sendReport(report(), { url: 'https://x.example', doFetch: bad })).toBe('fehler')
    const down = (async () => {
      throw new TypeError('offline')
    }) as unknown as typeof fetch
    expect(await sendReport(report(), { url: 'https://x.example', doFetch: down })).toBe('fehler')
  })

  it('ohne Adresse: Teilen-Fenster, sonst Zwischenablage', async () => {
    const share = vi.fn(async (_d: ShareData) => undefined)
    expect(await sendReport(report(), { url: '', share })).toBe('geteilt')
    expect(share.mock.calls[0][0].text).toContain('Es klappt nicht')
    const abort = vi.fn(async () => {
      throw Object.assign(new Error('x'), { name: 'AbortError' })
    })
    expect(await sendReport(report(), { url: '', share: abort })).toBe('abgebrochen')
    const copy = vi.fn(async () => undefined)
    const noShare = undefined as unknown as (d: ShareData) => Promise<void>
    // ohne share-Funktion greift navigator.share nicht (happy-dom kennt es nicht): Zwischenablage
    expect(await sendReport(report(), { url: '', share: noShare, copy })).toBe('kopiert')
  })
})

describe('Anonyme Nutzungsdaten', () => {
  it('nur mit Einwilligung und Adresse, höchstens einmal pro Woche, danach beginnen die Zähler neu', async () => {
    const doFetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    track('runde', 4)
    const now = Date.UTC(2026, 9, 8)
    expect(await maybeSendUsage({}, now, { url: 'https://x.example', doFetch })).toBe(false) // nicht eingewilligt
    setUsageOptIn(true)
    expect(await maybeSendUsage({}, now, { url: '', doFetch })).toBe(false) // keine Adresse
    expect(await maybeSendUsage({}, now, { url: 'https://x.example', doFetch })).toBe(true)
    const body = JSON.parse((doFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(body.art).toBe('nutzung')
    expect(body.zähler.runde).toBe(4)
    expect(usageCounts().runde).toBeUndefined()
    expect(await maybeSendUsage({}, now + 86_400_000, { url: 'https://x.example', doFetch })).toBe(false)
    expect(await maybeSendUsage({}, now + 8 * 86_400_000, { url: 'https://x.example', doFetch })).toBe(true)
  })
})
