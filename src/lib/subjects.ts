/**
 * Fächer mit KI-Hilfe. Nur Französisch ist ein Kurs zum aktiven Lernen; bei allen anderen Fächern
 * hilft die KI, den Stoff aus der Schule zu vertiefen und sich auf Arbeiten vorzubereiten.
 */
export interface HelpSubject {
  id: string
  name: string
  /** Eine Zeile: Wobei die KI hilft */
  blurb: string
  /** Farbe der Kachel (Fläche, Unterkante) */
  c: string
  s: string
  /** Kurze Zeichen für die Kachel */
  mark: string
  suggestions: string[]
  /** Fachspezifische Hinweise für die KI */
  rules: string[]
}

const PLAN = 'Hilf mir, mich auf meine nächste Arbeit vorzubereiten.'

export const HELP_SUBJECTS: HelpSubject[] = [
  {
    id: 'mathe',
    name: 'Mathe',
    blurb: 'Aufgaben verstehen, Rechenwege prüfen, üben',
    c: '#8b5cf6',
    s: '#6a3ad6',
    mark: '÷',
    suggestions: ['Erkläre mir ein Thema aus meinem Unterricht Schritt für Schritt.', 'Gib mir Übungsaufgaben für meine Arbeit und prüfe meine Lösungen.', PLAN, 'Ich verstehe meine Hausaufgabe nicht. Kannst du mir den ersten Schritt zeigen?'],
    rules: [
      'Schreibe Mathe in einfacher Textschreibweise: 3/4 für Brüche, x^2 für Hochzahlen, · für Mal und : für Geteilt. Kein LaTeX, keine Dollarzeichen.',
      'Zeige jeden Rechenschritt in einer eigenen Zeile. Bei Aufgaben des Schülers: erst einen Tipp oder den ersten Schritt, dann prüfe sein Ergebnis und zeige, wo genau ein Fehler liegt.',
    ],
  },
  {
    id: 'deutsch',
    name: 'Deutsch',
    blurb: 'Texte, Grammatik, Aufsatz und Rechtschreibung',
    c: '#ff5c9a',
    s: '#d43b77',
    mark: 'Ab',
    suggestions: ['Erkläre mir ein Grammatikthema mit Beispielen.', 'Lies meinen Text und sag mir, was ich verbessern kann.', 'Wie baue ich eine Erörterung oder Textanalyse auf?', PLAN],
    rules: ['Bei Texten des Schülers: erst loben, was gut ist, dann höchstens drei konkrete Verbesserungen. Schreibe den Text nicht für ihn um.'],
  },
  {
    id: 'englisch',
    name: 'Englisch',
    blurb: 'Vokabeln, Grammatik, Texte und Sprechen üben',
    c: '#1e96fa',
    s: '#1474cc',
    mark: 'En',
    suggestions: ['Frag mich Vokabeln zu meinem aktuellen Thema ab.', 'Erkläre mir ein Grammatikthema mit Beispielen und Übersetzung.', 'Verbessere meinen englischen Text und erkläre die Fehler.', PLAN],
    rules: ['Gib englische Beispiele immer mit deutscher Übersetzung. Weise bei Korrekturen auf die Regel hin, nicht nur auf die richtige Form.'],
  },
  {
    id: 'biologie',
    name: 'Biologie',
    blurb: 'Zusammenfassen, erklären, abfragen',
    c: '#58c234',
    s: '#3e9a1f',
    mark: 'Bio',
    suggestions: ['Fass mir ein Thema aus meinem Unterricht in einfachen Worten zusammen.', 'Frag mich Fachbegriffe ab.', 'Erkläre mir einen Zusammenhang mit einem Alltagsbeispiel.', PLAN],
    rules: ['Erkläre Fachbegriffe in einfachen Worten und nenne den Fachbegriff dazu. Nutze Merksätze und Vergleiche aus dem Alltag.'],
  },
  {
    id: 'geschichte',
    name: 'Geschichte',
    blurb: 'Zeitabläufe, Ursachen und Folgen verstehen',
    c: '#d69a00',
    s: '#a87300',
    mark: 'Ge',
    suggestions: ['Erkläre mir Ursachen und Folgen eines Ereignisses aus meinem Unterricht.', 'Frag mich Jahreszahlen und Begriffe ab.', 'Hilf mir, eine Quelle zu analysieren.', PLAN],
    rules: ['Trenne Fakten von Deutungen. Nenne Jahreszahlen nur, wenn du dir sicher bist, und sag es sonst offen.'],
  },
  {
    id: 'physik',
    name: 'Physik',
    blurb: 'Formeln anwenden und Zusammenhänge verstehen',
    c: '#14b8a6',
    s: '#0d8f80',
    mark: 'Ph',
    suggestions: ['Erkläre mir eine Formel und wann ich sie benutze.', 'Gib mir Rechenaufgaben zu meinem Thema und prüfe meine Lösungen.', 'Erkläre mir ein Experiment aus dem Unterricht.', PLAN],
    rules: ['Schreibe Formeln in einfacher Textschreibweise (F = m · a). Rechne mit Einheiten und zeige jeden Schritt.'],
  },
  {
    id: 'chemie',
    name: 'Chemie',
    blurb: 'Reaktionen, Stoffe und Formeln verstehen',
    c: '#ff8a1f',
    s: '#d66a00',
    mark: 'Ch',
    suggestions: ['Erkläre mir eine Reaktion Schritt für Schritt.', 'Frag mich Symbole und Fachbegriffe ab.', 'Wie stelle ich eine Reaktionsgleichung auf?', PLAN],
    rules: ['Schreibe Formeln in einfacher Textschreibweise (H2O, CO2). Erkläre erst die Idee, dann die Schreibweise.'],
  },
  {
    id: 'geografie',
    name: 'Geografie',
    blurb: 'Räume, Karten und Zusammenhänge',
    c: '#0d8f80',
    s: '#0a6e63',
    mark: 'Gg',
    suggestions: ['Fass mir ein Thema aus meinem Unterricht zusammen.', 'Frag mich Begriffe und Beispiele ab.', 'Erkläre mir einen Zusammenhang zwischen Klima und Landwirtschaft.', PLAN],
    rules: ['Nenne Zahlen nur, wenn du dir sicher bist. Verbinde Begriffe mit einem konkreten Beispiel.'],
  },
  {
    id: 'politik',
    name: 'Politik und Gesellschaft',
    blurb: 'Begriffe und Zusammenhänge erklären',
    c: '#5b6cff',
    s: '#3c4bd8',
    mark: 'Po',
    suggestions: ['Erkläre mir einen Begriff aus meinem Unterricht.', 'Frag mich Begriffe ab.', 'Hilf mir, Pro und Contra zu einem Thema zu sammeln.', PLAN],
    rules: ['Bleibe neutral und zeige bei strittigen Themen mehrere Sichtweisen, ohne selbst Partei zu ergreifen.'],
  },
  {
    id: 'sonstiges',
    name: 'Anderes Fach',
    blurb: 'Kunst, Musik, Informatik, Religion, Ethik …',
    c: '#868a95',
    s: '#5f636d',
    mark: '…',
    suggestions: ['Erkläre mir ein Thema aus meinem Unterricht.', 'Frag mich zu meinem Thema ab.', 'Fass meine Notizen zusammen.', PLAN],
    rules: ['Frag zuerst, um welches Fach und welches Thema es geht.'],
  },
]

export const helpSubject = (id: string | undefined): HelpSubject | undefined => HELP_SUBJECTS.find((s) => s.id === id)

export interface SubjectPromptInput {
  subject: HelpSubject
  /** Klassenstufe, falls bekannt */
  grade?: number
  streak?: number
  /** Texte von Fotos oder Büchern, falls vorhanden */
  bookContext?: string
}

/** Rolle der KI in einem Fach ohne eigenen Kurs: vertiefen, was in der Schule dran war, und für Arbeiten üben. */
export function buildSubjectPrompt({ subject, grade, streak, bookContext }: SubjectPromptInput): string {
  return [
    `Du bist die KI-Lernhilfe in der App "Studienfuchs", ein freundlicher, geduldiger Nachhilfelehrer für Schüler in ${subject.name} (Berliner Schulen).`,
    'Die App hat in diesem Fach keinen eigenen Kurs. Der Schüler lernt den Stoff in der Schule und nutzt dich, um ihn zu vertiefen, Lücken zu schließen und sich auf Arbeiten vorzubereiten. Du ersetzt weder Unterricht noch Lehrer.',
    'Regeln:',
    '- Antworte immer auf Deutsch, kurz und klar, höchstens etwa 150 Wörter, einfache Sprache, kurze Listen statt langer Absätze.',
    '- Frag am Anfang kurz nach, wenn du es nicht weißt: Welche Klasse, welches Thema, wann ist die Arbeit? Richte dich nach dem, was der Schüler im Unterricht hatte, und erfinde nichts über Lehrer, Buch oder Lehrplan.',
    '- Wenn der Schüler abgefragt werden will: stelle genau EINE Frage, warte auf die Antwort, korrigiere freundlich, erkläre den Fehler, dann die nächste Frage.',
    '- Für eine Arbeit: teile den Stoff auf die Tage bis zum Termin auf (Etappen von 10–20 Minuten), gib Übungsfragen zu den wichtigsten Punkten und fass am Ende die Merksätze zusammen.',
    '- Mach keine Hausaufgaben komplett fertig. Gib einen Tipp oder den ersten Schritt und lass den Schüler weitermachen. Hängt er fest, zeige die Lösung Schritt für Schritt.',
    '- Der Schüler kann Fotos von Aufgaben, Heftseiten oder Arbeitsblättern anhängen. Lies sie genau, sag kurz, was du erkannt hast, und arbeite damit.',
    '- Wenn du dir bei einer Tatsache nicht sicher bist, sag es offen, statt zu raten.',
    ...subject.rules.map((r) => `- ${r}`),
    '',
    `Stand: Fach ${subject.name}${grade ? `, Klasse ${grade}` : ''}${streak ? `, Serie ${streak} Tage` : ''}.`,
    bookContext ? bookContext : '',
  ]
    .filter(Boolean)
    .join('\n')
}
