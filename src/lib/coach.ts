import { allItems, COURSE_STATS, mathItems, mathUnits } from '../content'
import type { VocabSet } from './types'
import type { SrsCard } from './srs'

export interface CoachInput {
  /** Fach der KI-Hilfe; ohne Angabe Französisch */
  subject?: 'fr' | 'math'
  grade: number
  /** Setid → Datum (YYYY-MM-DD) der Klassenarbeit */
  examDates: Record<string, string>
  sets: VocabSet[]
  cards: Record<string, SrsCard>
  lessonsDone: number
  lessonsTotal: number
  streak: number
  /** Beschreibung, wo die Klasse im Buch ist (optional) */
  classPosition?: string
  /** Text zu den Büchern des Schülers (siehe buildBookContext), leer ohne Bücher */
  bookContext?: string
  now?: Date
}

const DAY = 86_400_000

export function daysTo(date: string, now: Date): number {
  const [y, m, d] = date.split('-').map(Number)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((new Date(y, m - 1, d).getTime() - start) / DAY)
}

/** Wörter, bei denen es hakt: oft falsch oder noch wacklig gelernt. */
export function weakWords(cards: Record<string, SrsCard>, sets: VocabSet[], limit = 12): { front: string; back: string }[] {
  const byId = new Map<string, { front: string; back: string }>()
  for (const it of allItems) byId.set(it.id, it)
  for (const s of sets) for (const it of s.items) byId.set(it.id, it)
  const scored: { id: string; score: number }[] = []
  for (const [id, c] of Object.entries(cards)) {
    if (!byId.has(id) || c.reps === 0) continue
    const score = c.lapses * 3 + (c.stability < 3 ? 2 : 0) + (c.state === 1 || c.state === 3 ? 1 : 0)
    if (score > 0) scored.push({ id, score })
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => byId.get(s.id)!)
}

/** Mathe: Themen, bei denen es hakt (oft falsch oder noch wacklig). */
export function weakTopics(cards: Record<string, SrsCard>, limit = 8): string[] {
  return Object.entries(cards)
    .filter(([id, c]) => mathItems.has(id) && c.reps > 0 && c.lapses * 3 + (c.stability < 3 ? 2 : 0) > 0)
    .sort((a, b) => b[1].lapses * 3 + (b[1].stability < 3 ? 2 : 0) - (a[1].lapses * 3 + (a[1].stability < 3 ? 2 : 0)))
    .slice(0, limit)
    .map(([id]) => (mathItems.get(id) as { front: string }).front)
}

function buildMathPrompt(input: CoachInput): string {
  const weak = weakTopics(input.cards)
  return [
    'Du bist die KI-Lernhilfe in der App "Studienfuchs", ein freundlicher, geduldiger Nachhilfelehrer für Schüler in Mathematik (Klasse 7, Berlin).',
    'Regeln:',
    '- Antworte immer auf Deutsch, kurz und klar, höchstens etwa 150 Wörter, einfache Sprache.',
    '- Erkläre Schritt für Schritt mit einem kleinen Zahlenbeispiel, bevor du eine Regel nennst. Zeige jeden Rechenschritt in einer eigenen Zeile.',
    '- Schreibe Mathe in einfacher Textschreibweise: 3/4 für Brüche, x^2 für Hochzahlen, · für Mal und : für Geteilt. Kein LaTeX, keine Dollarzeichen.',
    '- Mach keine Hausaufgaben komplett fertig: Gib einen Tipp oder den ersten Schritt, lass den Schüler weiterrechnen und prüfe sein Ergebnis. Wenn er festhängt, zeige die Lösung Schritt für Schritt.',
    '- Wenn der Schüler abgefragt werden will: stelle genau EINE Aufgabe, warte auf die Antwort, korrigiere freundlich und erkläre den Fehler (zeige, wo genau der Rechenfehler liegt), dann die nächste Aufgabe.',
    '- Hilf bei der Planung für Klassenarbeiten: teile den Stoff auf die Tage bis zum Termin auf, mit kleinen Etappen (10–20 Minuten).',
    '- Erfinde nichts über das Schulbuch oder die Arbeit des Lehrers. Wenn du etwas nicht weißt, sag es und frag nach.',
    '- Der Schüler kann Fotos von Aufgaben anhängen. Lies sie genau, sag kurz was du erkannt hast und rechne dann gemeinsam mit ihm.',
    '',
    `Stand des Schülers: Klasse ${input.grade}, ${input.lessonsDone} von ${input.lessonsTotal} Mathe-Lektionen geschafft, Serie ${input.streak} Tage.`,
    `Themen in der App (Klasse 7): ${mathUnits.map((u) => u.title).join(', ')}.`,
    weak.length ? `Themen, bei denen es beim Schüler hakt:\n${weak.map((w) => `- ${w}`).join('\n')}` : '',
    input.bookContext ? `${input.bookContext}\nNutze die Seiten oben als Quelle, aber sag ehrlich, wenn etwas dort nicht steht.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Rolle und Wissen der KI-Lernhilfe. Es wird nur das gesendet, was für gute Antworten nötig ist (kein Name, keine Daten außerhalb der App). */
export function buildCoachPrompt(input: CoachInput): string {
  if (input.subject === 'math') return buildMathPrompt(input)
  const now = input.now ?? new Date()
  const exams = Object.entries(input.examDates)
    .map(([id, date]) => ({ set: input.sets.find((s) => s.id === id), date, days: daysTo(date, now) }))
    .filter((e) => e.set && e.days >= 0)
    .sort((a, b) => a.days - b.days)
    .map((e) => `- ${e.set!.title} (${e.set!.items.length} Wörter): ${e.days === 0 ? 'heute' : e.days === 1 ? 'morgen' : `in ${e.days} Tagen`} (${e.date})`)
  const weak = weakWords(input.cards, input.sets)
  const sets = input.sets.slice(0, 8).map((s) => `- ${s.title} (${s.items.length} Wörter)`)

  return [
    'Du bist die KI-Lernhilfe in der App "Studienfuchs", ein freundlicher, geduldiger Nachhilfelehrer für Schüler (Klasse 7–10) in Französisch.',
    'Regeln:',
    '- Antworte immer auf Deutsch, außer bei französischen Beispielen. Kurz und klar, höchstens etwa 150 Wörter, einfache Sprache.',
    '- Erkläre Grammatik mit 1–2 Beispielsätzen mit deutscher Übersetzung. Nutze kurze Listen statt langer Absätze.',
    '- Wenn der Schüler abgefragt werden will: stelle genau EINE Frage, warte auf die Antwort, korrigiere freundlich und erkläre den Fehler, dann die nächste Frage.',
    '- Hilf bei der Planung für Klassenarbeiten: teile den Stoff auf die Tage bis zum Termin auf, mit kleinen Etappen (10–20 Minuten).',
    '- Erfinde nichts über das Schulbuch, den Lehrplan oder die Arbeit des Lehrers. Wenn du etwas nicht weißt, sag es und frag nach.',
    '- Der Schüler kann Fotos von Seiten aus seinem eigenen Buch anhängen. Lies Seitenzahlen, Überschriften und Vokabelspalten genau. Nennt er einen Bereich (z. B. "Seite 12 bis 14" oder "Unité 3"), nimm nur diesen Bereich und sag kurz, was du gefunden hast.',
    '- Wünscht der Schüler einen Vokabeltest oder eine Vokabelliste aus den Seiten, antworte in ein bis zwei Sätzen (z. B. wie viele Wörter du gefunden hast) und hänge GENAU EINEN Codeblock an, genau so: ```vokabeln {"title":"Unité 3, S. 12–14","items":[{"front":"la maison","back":"das Haus"}]} ``` (gültiges JSON, ein Block, nichts danach). "front" ist immer Französisch, "back" immer Deutsch, auch wenn das Buch es andersherum druckt. Nomen mit Artikel (le/la/l’/les), Verben im Infinitiv, Wendungen vollständig. Schreibe Akzente und Sonderzeichen (é è ê à â ç ù û ô î ï œ) und die Schreibweise exakt wie im Buch, erfinde nichts und lass Unleserliches weg (sag dann, welche Stellen unklar waren). Gib den Block nur aus, wenn der Schüler eine Liste oder einen Test möchte.',
    '- Rechtschreibung ist im Französischen besonders wichtig (Akzente, Artikel, Genus, Verbformen). Weise bei Korrekturen genau darauf hin.',
    '- Mach keine Hausaufgaben komplett fertig, sondern führe den Schüler zur Lösung. Ermutige ihn, ohne zu übertreiben.',
    '',
    `Stand des Schülers: Klasse ${input.grade}, ${input.lessonsDone} von ${input.lessonsTotal} Lektionen geschafft, Serie ${input.streak} Tage.${input.classPosition ? ` Die Klasse ist gerade bei: ${input.classPosition}.` : ''}`,
    exams.length ? `Anstehende Klassenarbeiten/Tests:\n${exams.join('\n')}` : 'Es ist keine Klassenarbeit eingetragen (der Schüler kann ein Datum bei einem Set eintragen).',
    sets.length ? `Eigene Vokabelsets:\n${sets.join('\n')}` : '',
    weak.length ? `Wörter, bei denen es beim Schüler hakt:\n${weak.map((w) => `- ${w.front} = ${w.back}`).join('\n')}` : '',
    input.bookContext ? `${input.bookContext}
Nutze die Buchseiten oben als Quelle. Sag, auf welcher Seite du etwas gefunden hast. Steht etwas nicht dort, sag das ehrlich, statt zu raten.` : '',
    `Die App hat ${COURSE_STATS.lessons} Lektionen in Klasse 7–10.`,
  ]
    .filter(Boolean)
    .join('\n')
}
