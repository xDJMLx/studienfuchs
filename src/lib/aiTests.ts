import { AiError, extractJson } from './ai'
import { callAi } from './aiCards'
import { helpSubject } from './subjects'
import { normalizeTest, taskCount, TEST_KINDS, type TestData, type TestKind } from './tests'

export type TestLength = 'kurz' | 'normal' | 'lang'
export type Difficulty = 'leicht' | 'mittel' | 'schwer'

export const LENGTHS: { id: TestLength; label: string }[] = [
  { id: 'kurz', label: 'Kurz' },
  { id: 'normal', label: 'Normal' },
  { id: 'lang', label: 'Lang' },
]
export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'leicht', label: 'Leicht' },
  { id: 'mittel', label: 'Wie im Unterricht' },
  { id: 'schwer', label: 'Anspruchsvoll' },
]

/** Wie viele Aufgaben und Minuten zu Art und Länge passen. */
export function sizeOf(kind: Exclude<TestKind, 'vokabeltest'>, length: TestLength): { tasks: number; minutes: number; sections: number } {
  const base = kind === 'arbeit' ? { tasks: 14, minutes: 60, sections: 3 } : { tasks: 9, minutes: 20, sections: 1 }
  const f = length === 'kurz' ? 0.65 : length === 'lang' ? 1.5 : 1
  return { tasks: Math.max(6, Math.round(base.tasks * f)), minutes: Math.round((base.minutes * f) / 5) * 5, sections: base.sections }
}

const FORMAT = [
  'Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:',
  '{"title": "...", "minutes": 45, "sections": [{"title": "Teil A: ...", "intro": "optionaler Text, auf den sich die Aufgaben des Teils beziehen", "tasks": [ ... ]}]}',
  'Jede Aufgabe hat "t" (Art), "points" (ganze Punkte, 1 bis 6), "afb" (Anforderungsbereich: 1 = Wissen wiedergeben, 2 = Anwenden, 3 = Begründen und Übertragen) und die Felder ihrer Art:',
  '- Quiz: {"t":"mc","q":"...","options":["richtig","falsch","falsch","falsch"],"answer":0,"afb":1,"points":1,"why":"kurze Erklärung der Lösung"} ("answer" = Nummer der richtigen Antwort, ab 0)',
  '- Richtig/Falsch: {"t":"tf","q":"Aussage","answer":true,"afb":1,"points":1,"why":"..."}',
  '- Lückentext: {"t":"cloze","text":"Satz mit genau einer Lücke ___ darin","answers":["Lösung","andere Schreibweise"],"afb":1,"points":1}',
  '- Reihenfolge: {"t":"order","q":"Bringe in die richtige Reihenfolge: ...","steps":["1. Schritt","2. Schritt","3. Schritt"],"afb":2,"points":2} (Schritte schon in RICHTIGER Reihenfolge)',
  '- Zuordnen: {"t":"match","q":"Ordne zu","pairs":[["A","a"],["B","b"],["C","c"]],"afb":1,"points":2}',
  '- Kurzantwort: {"t":"short","q":"Frage, die in 1 bis 3 Sätzen zu beantworten ist","sample":"Musterantwort","keys":["Stichwort","Stichwort"],"afb":3,"points":3}',
  '- Rechnen: {"t":"calc","q":"Aufgabentext mit allen Zahlen","expr":"Rechnung als Term","unit":"Einheit","digits":2,"afb":2,"points":2,"why":"Rechenweg in einem Satz"}',
  '- Gleichung: {"t":"solve","q":"Löse nach x","equation":"2x + 3 = 11","afb":2,"points":2}',
]

const MATH_RULES = [
  'WICHTIG zu Rechenaufgaben: Du rechnest NICHT selbst. Du schreibst nur die Rechnung als Term in "expr" (oder die Gleichung in "equation"), das Ergebnis berechnet die App. Gib kein Ergebnis an.',
  '- Im Term: + - * / ^ und Klammern, sqrt(...). Brüche IMMER in Klammern: (3/4) + (2/5). Prozent als 15%.',
  '- Ist das Ergebnis keine endliche Dezimalzahl, schreibe "auf zwei Nachkommastellen gerundet" in "q" und setze "digits": 2; soll es ein Bruch sein, schreibe "als Bruch" in "q" und setze "as":"frac".',
  '- Alle Zahlen der Rechnung stehen auch im Aufgabentext "q". Kein Bezug auf Zeichnungen oder Abbildungen, die der Schüler nicht sieht.',
]

/** So baut eine Lehrkraft in diesem Fach eine Arbeit auf (Hinweise für die KI). */
const SUBJECT_BLUEPRINT: Record<string, string> = {
  mathe: 'Aufbau wie eine Mathe-Arbeit: Teil A Grundwissen ohne Rechnen (Begriffe, Regeln, Zuordnen), Teil B Rechenaufgaben mit steigender Schwierigkeit, Teil C Textaufgaben, bei denen man erst die Rechnung aufstellen muss.',
  physik: 'Aufbau wie eine Physik-Arbeit: Teil A Begriffe, Größen und Einheiten, Teil B Formeln anwenden (Rechenaufgaben mit Einheiten), Teil C Alltagsbeispiele erklären (Kurzantworten).',
  chemie: 'Aufbau wie eine Chemie-Arbeit: Teil A Begriffe, Stoffe und Symbole, Teil B Berechnungen (Stoffmenge, Massenanteil) und Reaktionen einordnen, Teil C Versuche und Beobachtungen erklären (Kurzantworten).',
  biologie: 'Aufbau wie eine Bio-Arbeit: Teil A Fachbegriffe und Zuordnungen, Teil B Abläufe (Reihenfolge) und Zusammenhänge, Teil C Begründen und Erklären an Beispielen (Kurzantworten).',
  geschichte: 'Aufbau wie eine Geschichts-Arbeit: Teil A Daten, Personen, Begriffe (Zuordnen, Reihenfolge), Teil B Ursachen und Folgen, Teil C ein kurzer Quellentext (als "intro") mit Fragen zum Einordnen und Bewerten.',
  politik: 'Aufbau wie eine Politik-Arbeit: Teil A Begriffe und Institutionen, Teil B Zusammenhänge und Beispiele, Teil C eine Fallbeschreibung (als "intro") mit Fragen zum Beurteilen.',
  geografie: 'Aufbau wie eine Geografie-Arbeit: Teil A Orte, Begriffe, Zuordnungen, Teil B Zusammenhänge und Prozesse (Reihenfolge, Ursache und Wirkung), Teil C Beispiele erklären.',
  deutsch: 'Aufbau wie eine Deutsch-Arbeit: Teil A ein kurzer Text (als "intro", 80 bis 150 Wörter, selbst geschrieben) mit Verständnisfragen, Teil B Sprache und Grammatik (Lückentext, Zuordnen), Teil C eine Aufgabe zum Begründen oder Erklären (Kurzantwort).',
  englisch: 'Aufbau wie eine Englisch-Arbeit: Teil A Reading (kurzer englischer Text als "intro", 80 bis 150 Wörter, mit Verständnisfragen), Teil B Vocabulary und Grammar (Lückentext, Auswahl), Teil C ein kurzer Schreibauftrag (Kurzantwort mit Beispiel).',
  franzoesisch: 'Aufbau wie eine Französisch-Arbeit: Teil A Compréhension (kurzer französischer Text als "intro" mit Fragen), Teil B Vocabulaire und Grammaire (Lückentext, Auswahl), Teil C ein kurzer Schreibauftrag (Kurzantwort mit Beispiel).',
  informatik: 'Aufbau wie eine Informatik-Arbeit: Teil A Begriffe, Teil B Abläufe und Algorithmen in Worten (Reihenfolge), Teil C kleine Denkaufgaben.',
  kunst: 'Aufbau: Teil A Begriffe, Techniken, Epochen (Zuordnen), Teil B Zusammenhänge, Teil C ein Werk in Worten beschreiben und deuten (Kurzantworten).',
  musik: 'Aufbau: Teil A Notenwerte, Begriffe, Instrumente (Zuordnen, Auswahl), Teil B Zusammenhänge, Teil C Hörbeispiele in Worten beschreiben (Kurzantworten).',
}

const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  leicht: 'Etwas leichter als im Unterricht: vor allem Wissen wiedergeben und einfaches Anwenden, kaum Transfer.',
  mittel: 'So schwer wie eine normale Arbeit der Klassenstufe: etwa 40 % Wissen, 40 % Anwenden, 20 % Begründen und Übertragen.',
  schwer: 'Anspruchsvoll, wie für eine Eins: mehr Anwenden und Begründen, auch ungewöhnlichere Beispiele.',
}

/** Rolle der KI beim Erstellen eines Tests oder einer Klassenarbeit. */
export function buildTestPrompt(p: { subjectId: string; kind: Exclude<TestKind, 'vokabeltest'>; length: TestLength; grade?: number; difficulty?: Difficulty; material?: string }): string {
  const subject = helpSubject(p.subjectId)
  const name = subject?.name ?? 'dem Fach'
  const size = sizeOf(p.kind, p.length)
  const mint = ['mathe', 'physik', 'chemie', 'informatik'].includes(p.subjectId)
  const label = TEST_KINDS.find((k) => k.id === p.kind)!.label
  const grade = p.grade && p.grade >= 5 && p.grade <= 13 ? p.grade : undefined
  const lines = [
    `Du bist eine erfahrene Lehrkraft und erstellst eine ${label} im Fach ${name}${grade ? ` für die Klassenstufe ${grade}` : ''} an einer Berliner Schule, so wie du sie wirklich stellen würdest.`,
    ...FORMAT,
    'Regeln:',
    `- Etwa ${size.tasks} Aufgaben in ${size.sections} ${size.sections === 1 ? 'Teil' : 'Teilen'}, für etwa ${size.minutes} Minuten ("minutes"). Die Punkte zeigen den Aufwand: Wissensfragen 1 Punkt, Anwenden 2, Begründen 3 bis 4.`,
    p.kind === 'arbeit' ? `- ${SUBJECT_BLUEPRINT[p.subjectId] ?? 'Aufbau: Teil A Wissen und Begriffe, Teil B Anwenden, Teil C Begründen und Erklären (Kurzantworten mit mehr Punkten).'}` : '- Gemischte Aufgaben, von leicht zu schwerer, wie in einem Test.',
    `- Schwierigkeit: ${DIFFICULTY_TEXT[p.difficulty ?? 'mittel']}`,
    ...(grade ? [`- Alles muss genau zu Klasse ${grade} passen: Stoff, Zahlenraum, Wortschatz und Satzlänge wie in den Schulbüchern und Arbeiten dieser Klassenstufe. Nichts aus höheren Klassen (zu schwer), aber auch nichts von weit darunter (zu leicht). Im Zweifel orientiere dich am Berliner Rahmenlehrplan für diese Stufe.`] : []),
    '- Es soll sich wie eine echte Arbeit anfühlen, nicht wie ein Quiz: Aufgaben mit Teilaufgaben (a, b), mehrere Schritte, Anwendungs- und Transferaufgaben, nicht nur Wissensabfrage. Die Punkte sind so verteilt, dass man mit 50 % knapp besteht.',
    '- Aufgabenstellungen sind eindeutig und kurz. Nutze die Wörter, die Lehrkräfte nutzen: nenne, beschreibe, erkläre, begründe, vergleiche, berechne. Jede Aufgabe prüft genau einen Gedanken und hat genau eine richtige Lösung.',
    '- Falsche Antworten bei Quizfragen sind plausibel (typische Verwechslungen), aber eindeutig falsch. Die richtige Antwort steht nicht immer an derselben Stelle. Bei "tf" etwa gleich viele wahre und falsche Aussagen.',
    '- Wenn du einen Text brauchst (Lesetext, Quelle, Fallbeispiel), schreibst du ihn selbst in "intro" des Teils und die Aufgaben dieses Teils beziehen sich darauf. Aufgaben ohne "intro" dürfen sich nie auf einen Text, ein Bild oder eine Abbildung beziehen.',
    '- Nichts, bei dem du dir nicht sicher bist. Keine Duplikate. Keine Aufgaben, die man ohne Wissen erraten kann.',
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
  grade?: number
  difficulty?: Difficulty
  /** Was der Schüler dazu sagt (Thema, Kapitel …) */
  topic: string
  /** Stoff aus Karteikarten, als Text ("Frage – Antwort", eine Zeile je Karte) */
  material?: string
  source: string
  images?: string[]
  id: string
}

export interface TestOutcome {
  test: TestData
  dropped: number
  /** Die erste Antwort war zu schwach, die App hat einmal nachgefragt */
  retried: boolean
}

/** Brauchbar genug? Mindestens zwei Drittel der gewünschten Aufgaben und mehrere Arten. */
export function goodEnough(test: TestData, wanted: number): boolean {
  const kinds = new Set(test.sections.flatMap((s) => s.tasks.map((t) => t.task.t)))
  return taskCount(test) >= Math.ceil(wanted * 0.66) && (wanted <= 8 || kinds.size >= 3)
}

/**
 * Test oder Arbeit von der KI erstellen lassen. Rechnungen werden von der App nachgerechnet; unbrauchbare Aufgaben fallen weg.
 * Ist das Ergebnis zu dünn (zu wenige brauchbare Aufgaben, zu einseitig), fragt die App einmal mit Hinweisen nach und nimmt das bessere.
 */
export async function generateTest(r: TestRequest, ask: typeof callAi = callAi): Promise<TestOutcome> {
  const content = r.topic.trim() || (r.material ? 'Mach den Test aus dem Stoff.' : r.images?.length ? 'Mach den Test aus diesen Fotos.' : '')
  if (!content) throw new AiError('Schreib kurz, wozu der Test sein soll (Thema oder Kapitel), oder wähle Karteikarten dazu.', 'format')
  const system = buildTestPrompt({ subjectId: r.subjectId, kind: r.kind, length: r.length, grade: r.grade, difficulty: r.difficulty, material: r.material })
  const wanted = sizeOf(r.kind, r.length).tasks
  const meta = { id: r.id, subject: r.subjectId, kind: r.kind, source: r.source }
  const parse = (text: string) => {
    try {
      return normalizeTest(extractJson<unknown>(text), meta)
    } catch {
      return null
    }
  }

  const first = parse(await ask(system, content, r.images ?? [], 7000))
  if (first && goodEnough(first.test, wanted)) return { ...first, retried: false }

  const problem = first
    ? `Beim ersten Versuch waren nur ${taskCount(first.test)} von ${wanted} Aufgaben brauchbar (${first.dropped} fielen weg, zum Beispiel wegen eines falschen "answer"-Index, einer fehlenden oder doppelten Lücke "___", einer nicht berechenbaren Rechnung oder doppelter Fragen).`
    : 'Deine erste Antwort war kein gültiges JSON in dem verlangten Format.'
  const second = parse(await ask(system, `${content}\n\nWICHTIG: ${problem} Liefere die komplette Arbeit noch einmal, strikt im Format, mit ${wanted} Aufgaben aus mehreren Arten.`, r.images ?? [], 7000))
  const best = [first, second].filter((x): x is NonNullable<typeof first> => !!x).sort((a, b) => taskCount(b.test) - taskCount(a.test))[0]
  if (!best) throw new AiError('Die KI hat keinen brauchbaren Test geliefert. Versuch es nochmal oder beschreibe das Thema genauer.', 'format')
  return { ...best, retried: true }
}

/** Stoff als Text für die KI: eine Zeile je Karteikarte, höchstens `max` Karten. */
export function materialFrom(items: { front: string; back: string }[], max = 80): string {
  return items
    .slice(0, max)
    .map((i) => `- ${i.front.replace(/\n/g, ' ')} – ${i.back.replace(/\n/g, ' ')}`)
    .join('\n')
}
