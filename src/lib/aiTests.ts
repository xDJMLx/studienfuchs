import { AiError, extractJson } from './ai'
import { callAi } from './aiCards'
import { helpSubject } from './subjects'
import { normalizeTest, TEST_KINDS, type TestData, type TestKind } from './tests'

export type TestLength = 'kurz' | 'normal' | 'lang'

export const LENGTHS: { id: TestLength; label: string }[] = [
  { id: 'kurz', label: 'Kurz' },
  { id: 'normal', label: 'Normal' },
  { id: 'lang', label: 'Lang' },
]

/** Wie viele Aufgaben und Minuten zu Art und Länge passen. */
export function sizeOf(kind: Exclude<TestKind, 'vokabeltest'>, length: TestLength): { tasks: number; minutes: number; sections: number } {
  const base = kind === 'arbeit' ? { tasks: 14, minutes: 60, sections: 3 } : { tasks: 9, minutes: 20, sections: 1 }
  const f = length === 'kurz' ? 0.65 : length === 'lang' ? 1.5 : 1
  return { tasks: Math.max(6, Math.round(base.tasks * f)), minutes: Math.round((base.minutes * f) / 5) * 5, sections: base.sections }
}

const FORMAT = [
  'Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:',
  '{"title": "...", "minutes": 45, "sections": [{"title": "Teil A: ...", "tasks": [ ... ]}]}',
  'Jede Aufgabe hat "t" (Art), "points" (ganze Punkte, 1 bis 6) und die Felder ihrer Art:',
  '- Quiz: {"t":"mc","q":"...","options":["richtig","falsch","falsch","falsch"],"answer":0,"points":1}',
  '- Richtig/Falsch: {"t":"tf","q":"Aussage","answer":true,"points":1}',
  '- Lückentext: {"t":"cloze","text":"Satz mit genau einer Lücke ___","answers":["Lösung"],"points":1}',
  '- Reihenfolge: {"t":"order","q":"...","steps":["1. Schritt","2. Schritt","3. Schritt"],"points":2} (Schritte schon in richtiger Reihenfolge)',
  '- Zuordnen: {"t":"match","q":"Ordne zu","pairs":[["A","a"],["B","b"],["C","c"]],"points":2}',
  '- Kurzantwort: {"t":"short","q":"Frage","sample":"Musterantwort in 1 bis 3 Sätzen","keys":["Stichwort","Stichwort"],"points":3}',
  '- Rechnen: {"t":"calc","q":"Aufgabentext mit allen Zahlen","expr":"Rechnung als Term","unit":"Einheit","digits":2,"points":2}',
  '- Gleichung: {"t":"solve","q":"Löse nach x","equation":"2x + 3 = 11","points":2}',
]

const MATH_RULES = [
  'WICHTIG zu Rechenaufgaben: Du rechnest NICHT selbst. Du schreibst nur die Rechnung als Term in "expr" (oder die Gleichung in "equation"), das Ergebnis berechnet die App. Gib kein Ergebnis an.',
  '- Im Term: + - * / ^ und Klammern, sqrt(...). Brüche IMMER in Klammern: (3/4) + (2/5). Prozent als 15%.',
  '- Ist das Ergebnis keine endliche Dezimalzahl, schreibe "auf zwei Nachkommastellen gerundet" in "q" und setze "digits": 2; soll es ein Bruch sein, schreibe "als Bruch" in "q" und setze "as":"frac".',
]

/** Rolle der KI beim Erstellen eines Tests oder einer Klassenarbeit. */
export function buildTestPrompt(p: { subjectId: string; kind: Exclude<TestKind, 'vokabeltest'>; length: TestLength; material?: string }): string {
  const subject = helpSubject(p.subjectId)
  const name = subject?.name ?? 'dem Fach'
  const size = sizeOf(p.kind, p.length)
  const mint = ['mathe', 'physik', 'chemie', 'informatik'].includes(p.subjectId)
  const label = TEST_KINDS.find((k) => k.id === p.kind)!.label
  const lines = [
    `Du erstellst eine ${label} für Schüler (Berliner Schulen) im Fach ${name}, so wie eine Lehrkraft sie stellen würde.`,
    ...FORMAT,
    'Regeln:',
    `- Etwa ${size.tasks} Aufgaben in ${size.sections} ${size.sections === 1 ? 'Teil' : 'Teilen'}, für etwa ${size.minutes} Minuten ("minutes").`,
    p.kind === 'arbeit'
      ? '- Aufbau: Teil A Wissen und Begriffe (Quiz, Richtig/Falsch, Lücken, Zuordnen, Reihenfolge), Teil B Anwenden (' + (mint ? 'Rechnen und Gleichungen' : 'Kurzantworten und Lücken') + '), Teil C Aufgaben zum Erklären oder Begründen (Kurzantworten mit mehr Punkten). Die Punkte steigen mit dem Schwierigkeitsgrad.'
      : '- Gemischte Aufgaben, von leicht zu schwerer.',
    '- Jede Aufgabe hat genau eine richtige Lösung und prüft einen klaren Gedanken. Nichts, bei dem du dir nicht sicher bist. Keine Duplikate.',
    '- Wenn Stoff mitgeschickt wird (Karteikarten, Notizen, Fotos), stammen die Aufgaben aus genau diesem Stoff. Erfinde nichts dazu.',
    ...(mint ? MATH_RULES : ['- Rechenaufgaben (falls es welche gibt) schreibst du als Art "calc" nur mit der Rechnung, nie mit dem Ergebnis.']),
  ]
  if (p.material) lines.push('', 'Stoff, aus dem die Aufgaben stammen sollen:', p.material)
  return lines.join('\n')
}

export interface TestRequest {
  subjectId: string
  kind: Exclude<TestKind, 'vokabeltest'>
  length: TestLength
  /** Was der Schüler dazu sagt (Thema, Kapitel …) */
  topic: string
  /** Stoff aus Karteikarten, als Text ("Frage – Antwort", eine Zeile je Karte) */
  material?: string
  source: string
  images?: string[]
  id: string
}

/** Test oder Arbeit von der KI erstellen lassen. Rechnungen werden von der App nachgerechnet; unbrauchbare Aufgaben fallen weg. */
export async function generateTest(r: TestRequest): Promise<{ test: TestData; dropped: number }> {
  const content = r.topic.trim() || (r.material ? 'Mach den Test aus dem Stoff.' : r.images?.length ? 'Mach den Test aus diesen Fotos.' : '')
  if (!content) throw new AiError('Schreib kurz, wozu der Test sein soll (Thema oder Kapitel), oder wähle Karteikarten dazu.', 'format')
  const system = buildTestPrompt({ subjectId: r.subjectId, kind: r.kind, length: r.length, material: r.material })
  const text = await callAi(system, content, r.images ?? [], 7000)
  const res = normalizeTest(extractJson<unknown>(text), { id: r.id, subject: r.subjectId, kind: r.kind, source: r.source })
  if (!res) throw new AiError('Die KI hat keinen brauchbaren Test geliefert. Versuch es nochmal oder beschreibe das Thema genauer.', 'format')
  return res
}

/** Stoff als Text für die KI: eine Zeile je Karteikarte, höchstens `max` Karten. */
export function materialFrom(items: { front: string; back: string }[], max = 80): string {
  return items
    .slice(0, max)
    .map((i) => `- ${i.front.replace(/\n/g, ' ')} – ${i.back.replace(/\n/g, ' ')}`)
    .join('\n')
}
