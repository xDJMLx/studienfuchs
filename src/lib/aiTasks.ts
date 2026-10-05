import { AiError, extractJson } from './ai'
import { callAi } from './aiCards'
import { helpSubject } from './subjects'
import { normalizeTasks, type Task } from './tasks'

/** Was die KI erstellen soll. */
export type TaskPlan = 'karten' | 'aufgaben' | 'rechnen'

export const PLAN_LABEL: Record<TaskPlan, { label: string; text: string }> = {
  karten: { label: 'Karteikarten', text: 'Frage vorn, Antwort hinten: für Begriffe, Vokabeln, Daten.' },
  aufgaben: { label: 'Quiz & Aufgaben', text: 'Auswahlfragen, Lückentext, Zuordnen, Reihenfolge, Richtig/Falsch, Kurzantworten.' },
  rechnen: { label: 'Rechenaufgaben', text: 'Die KI schreibt die Aufgaben, die App rechnet die Lösung selbst aus.' },
}

/** Welche Art zu einem Fach am besten passt (zum Vorauswählen). */
export function defaultPlan(subjectId: string): TaskPlan {
  if (['mathe', 'physik', 'chemie'].includes(subjectId)) return 'rechnen'
  if (['franzoesisch', 'englisch'].includes(subjectId)) return 'karten'
  return 'aufgaben'
}

const FORMAT = [
  'Antworte NUR mit JSON, ohne Text davor oder danach, in diesem Format:',
  '{"title": "kurzer Titel", "tasks": [ ... ]}',
  'Jede Aufgabe ist ein Objekt mit "t" (Art) und den passenden Feldern:',
]

const KINDS_TEXT: Record<string, string> = {
  mc: '- Quiz: {"t":"mc","q":"Frage","options":["richtig","falsch1","falsch2","falsch3"],"answer":0,"why":"kurze Erklärung"} ("answer" = Nummer der richtigen Antwort, ab 0; 4 Antworten, die falschen sind plausibel, aber eindeutig falsch)',
  tf: '- Richtig/Falsch: {"t":"tf","q":"Aussage","answer":true,"why":"kurze Begründung"}',
  cloze: '- Lückentext: {"t":"cloze","text":"Satz mit genau einer Lücke ___ darin","answers":["Lösung","andere Schreibweise"],"why":"..."}',
  order: '- Reihenfolge: {"t":"order","q":"Bringe in die richtige Reihenfolge: ...","steps":["erster Schritt","zweiter","dritter"]} (3 bis 6 kurze Schritte, bereits in der RICHTIGEN Reihenfolge)',
  match: '- Zuordnen: {"t":"match","q":"Ordne zu","pairs":[["Begriff","Zuordnung"],["...","..."],["...","..."]]} (3 bis 6 Paare, jede Seite eindeutig)',
  short: '- Kurzantwort: {"t":"short","q":"Frage, die in 1 bis 3 Sätzen zu beantworten ist","sample":"Musterantwort","keys":["Stichwort1","Stichwort2"]}',
  calc: '- Rechnen: {"t":"calc","q":"Aufgabentext mit allen Zahlen","expr":"Rechnung als Term","unit":"Einheit des Ergebnisses (optional)","digits":2,"why":"Rechenweg in einem Satz"}',
  solve: '- Gleichung: {"t":"solve","q":"Löse die Gleichung nach x","equation":"2x + 3 = 11","why":"..."}',
}

const MATH_RULES = [
  'WICHTIG zum Rechnen: Du rechnest NICHT selbst. Du schreibst nur die Rechnung als Term in "expr" (oder die Gleichung in "equation"), das Ergebnis berechnet die App. Gib kein Ergebnis an.',
  '- Schreibweise im Term: Zahlen mit Komma oder Punkt, + - * / ^ und Klammern, sqrt(...) für Wurzeln. Brüche IMMER in Klammern: (3/4) + (2/5). Prozent als 15% oder 0,15.',
  '- Der Aufgabentext "q" nennt alle Zahlen (z. B. "Ein Auto fährt 150 km in 2 Stunden. Wie schnell ist es im Durchschnitt?"). Die Zahlen in "expr" müssen zu "q" passen.',
  '- Wenn das Ergebnis keine endliche Dezimalzahl ist, schreibe in "q" "auf zwei Nachkommastellen gerundet" und setze "digits": 2. Soll das Ergebnis ein Bruch sein, schreibe "als Bruch" in "q" und setze "as":"frac".',
  '- Bei Gleichungen: Schreibe "2x + 3 = 11" (Unbekannte x, höchstens zweiten Grades); die Gleichung hat genau eine Lösung.',
  '- Schreibe Aufgaben passend zur Klassenstufe und mit "schönen" Zahlen. Keine Geometrie mit π (nutze 3,14 im Text).',
]

/** Rolle der KI beim Erstellen von Aufgaben. */
export function buildTasksPrompt(subjectId: string, plan: Exclude<TaskPlan, 'karten'>, count: number): string {
  const subject = helpSubject(subjectId)
  const name = subject?.name ?? 'dem Fach'
  const kinds = plan === 'rechnen' ? ['calc', 'solve', 'mc'] : ['mc', 'tf', 'cloze', 'order', 'match', 'short']
  const lines = [
    `Du erstellst Übungsaufgaben für Schüler (Berliner Schulen) im Fach ${name}.`,
    ...FORMAT,
    ...kinds.map((k) => KINDS_TEXT[k]),
    'Regeln:',
    `- Erstelle höchstens ${count} Aufgaben, gemischt aus den Arten oben. Keine Duplikate, nichts, bei dem du dir nicht sicher bist.`,
    '- Eine Aufgabe prüft genau einen Gedanken. Die Aufgaben sind eindeutig und haben genau eine richtige Antwort.',
    '- Wenn der Schüler Fotos oder Notizen mitschickt, nimm den Inhalt davon als Quelle und erfinde nichts dazu.',
    ...(plan === 'rechnen' ? MATH_RULES : ['- Wenn eine Aufgabe eine Zahl ausrechnen lässt (z. B. in Physik oder Chemie), nutze die Art "calc" und schreibe nur die Rechnung, nie das Ergebnis.']),
  ]
  if (plan === 'rechnen') lines.push('- Etwa 70 % Rechenaufgaben und Gleichungen, der Rest Quizfragen zu Begriffen und Formeln.')
  return lines.join('\n')
}

export interface TaskRequest {
  subjectId: string
  plan: Exclude<TaskPlan, 'karten'>
  request: string
  count: number
  images?: string[]
}

export interface TaskResult {
  title: string
  tasks: Task[]
  /** Wie viele Aufgaben der KI wegen Fehlern (z. B. nicht berechenbar) aussortiert wurden */
  dropped: number
}

/** Aufgaben von der KI erzeugen lassen und prüfen. Rechenaufgaben werden von der App nachgerechnet. */
export async function generateTasks({ subjectId, plan, request, count, images = [] }: TaskRequest): Promise<TaskResult> {
  const content = request.trim() || (images.length ? 'Mach Aufgaben aus diesen Seiten.' : '')
  if (!content) throw new AiError('Schreib kurz, wozu du Aufgaben brauchst, oder hänge ein Foto an.', 'format')
  const text = await callAi(buildTasksPrompt(subjectId, plan, count), content, images, 6000)
  const raw = extractJson<{ title?: unknown; tasks?: unknown; aufgaben?: unknown }>(text)
  const { tasks, dropped } = normalizeTasks(raw?.tasks ?? raw?.aufgaben ?? (Array.isArray(raw) ? raw : []))
  const title = typeof raw?.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 80) : plan === 'rechnen' ? 'Neue Rechenaufgaben' : 'Neues Quiz'
  return { title, tasks: tasks.slice(0, Math.max(count, 5)), dropped }
}
