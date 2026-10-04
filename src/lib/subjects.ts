/**
 * Die Fächer der App. Im Unterricht lernst du, hier übst du: Jedes Fach hat Karten-Stapel, Arbeiten mit Termin und KI-Hilfe.
 * Französisch bringt zusätzlich fertige Stapel aus dem Kurs mit.
 */
export interface HelpSubject {
  id: string
  name: string
  /** Eine Zeile: Wobei die KI hilft */
  blurb: string
  /** Sprache der Karten, wenn das Fach Vokabeln hat (Vorlesen, Sonderzeichen, auch rückwärts fragen) */
  lang?: 'fr' | 'en'
  /** Farbe der Kachel (Fläche, Unterkante) */
  c: string
  s: string
  suggestions: string[]
  /** Fachspezifische Hinweise für die KI */
  rules: string[]
}

const PLAN = 'Hilf mir, mich auf meine nächste Arbeit vorzubereiten.'

export const HELP_SUBJECTS: HelpSubject[] = [
  {
    id: 'franzoesisch',
    name: 'Französisch',
    blurb: 'Vokabeln üben, Grammatik nachschlagen, Buchseiten einlesen',
    lang: 'fr',
    c: '#3f6fd8',
    s: '#2f55b0',
    suggestions: ['Frag mich Vokabeln ab, bei denen es bei mir hakt.', 'Hilf mir, mich auf meine nächste Klassenarbeit vorzubereiten.', 'Erkläre mir den Unterschied zwischen passé composé und imparfait.', 'Wie lerne ich Vokabeln, damit sie wirklich hängen bleiben?'],
    rules: [],
  },
  {
    id: 'mathe',
    name: 'Mathe',
    blurb: 'Aufgaben verstehen, Rechenwege prüfen, üben',
    c: '#8b5cf6',
    s: '#6a3ad6',
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
    c: '#e5538b',
    s: '#b3416c',
    suggestions: ['Erkläre mir ein Grammatikthema mit Beispielen.', 'Lies meinen Text und sag mir, was ich verbessern kann.', 'Wie baue ich eine Erörterung oder Textanalyse auf?', PLAN],
    rules: ['Bei Texten des Schülers: erst loben, was gut ist, dann höchstens drei konkrete Verbesserungen. Schreibe den Text nicht für ihn um.'],
  },
  {
    id: 'englisch',
    name: 'Englisch',
    blurb: 'Vokabeln, Grammatik, Texte und Sprechen üben',
    lang: 'en',
    c: '#1c8deb',
    s: '#166eb7',
    suggestions: ['Frag mich Vokabeln zu meinem aktuellen Thema ab.', 'Erkläre mir ein Grammatikthema mit Beispielen und Übersetzung.', 'Verbessere meinen englischen Text und erkläre die Fehler.', PLAN],
    rules: ['Gib englische Beispiele immer mit deutscher Übersetzung. Weise bei Korrekturen auf die Regel hin, nicht nur auf die richtige Form.'],
  },
  {
    id: 'biologie',
    name: 'Biologie',
    blurb: 'Zusammenfassen, erklären, abfragen',
    c: '#469b2a',
    s: '#377921',
    suggestions: ['Fass mir ein Thema aus meinem Unterricht in einfachen Worten zusammen.', 'Frag mich Fachbegriffe ab.', 'Erkläre mir einen Zusammenhang mit einem Alltagsbeispiel.', PLAN],
    rules: ['Erkläre Fachbegriffe in einfachen Worten und nenne den Fachbegriff dazu. Nutze Merksätze und Vergleiche aus dem Alltag.'],
  },
  {
    id: 'geschichte',
    name: 'Geschichte',
    blurb: 'Zeitabläufe, Ursachen und Folgen verstehen',
    c: '#b48100',
    s: '#8c6500',
    suggestions: ['Erkläre mir Ursachen und Folgen eines Ereignisses aus meinem Unterricht.', 'Frag mich Jahreszahlen und Begriffe ab.', 'Hilf mir, eine Quelle zu analysieren.', PLAN],
    rules: ['Trenne Fakten von Deutungen. Nenne Jahreszahlen nur, wenn du dir sicher bist, und sag es sonst offen.'],
  },
  {
    id: 'physik',
    name: 'Physik',
    blurb: 'Formeln anwenden und Zusammenhänge verstehen',
    c: '#119b8b',
    s: '#0d796c',
    suggestions: ['Erkläre mir eine Formel und wann ich sie benutze.', 'Gib mir Rechenaufgaben zu meinem Thema und prüfe meine Lösungen.', 'Erkläre mir ein Experiment aus dem Unterricht.', PLAN],
    rules: ['Schreibe Formeln in einfacher Textschreibweise (F = m · a). Rechne mit Einheiten und zeige jeden Schritt.'],
  },
  {
    id: 'chemie',
    name: 'Chemie',
    blurb: 'Reaktionen, Stoffe und Formeln verstehen',
    c: '#d17119',
    s: '#a35814',
    suggestions: ['Erkläre mir eine Reaktion Schritt für Schritt.', 'Frag mich Symbole und Fachbegriffe ab.', 'Wie stelle ich eine Reaktionsgleichung auf?', PLAN],
    rules: ['Schreibe Formeln in einfacher Textschreibweise (H2O, CO2). Erkläre erst die Idee, dann die Schreibweise.'],
  },
  {
    id: 'geografie',
    name: 'Geografie',
    blurb: 'Räume, Karten und Zusammenhänge',
    c: '#9a6b3f',
    s: '#764f2b',
    suggestions: ['Fass mir ein Thema aus meinem Unterricht zusammen.', 'Frag mich Begriffe und Beispiele ab.', 'Erkläre mir einen Zusammenhang zwischen Klima und Landwirtschaft.', PLAN],
    rules: ['Nenne Zahlen nur, wenn du dir sicher bist. Verbinde Begriffe mit einem konkreten Beispiel.'],
  },
  {
    id: 'politik',
    name: 'Politik',
    blurb: 'Begriffe und Zusammenhänge erklären',
    c: '#5b6cff',
    s: '#3c4bd8',
    suggestions: ['Erkläre mir einen Begriff aus meinem Unterricht.', 'Frag mich Begriffe ab.', 'Hilf mir, Pro und Contra zu einem Thema zu sammeln.', PLAN],
    rules: ['Bleibe neutral und zeige bei strittigen Themen mehrere Sichtweisen, ohne selbst Partei zu ergreifen.'],
  },
  {
    id: 'informatik',
    name: 'Informatik',
    blurb: 'Programmieren, Algorithmen und Daten verstehen',
    c: '#3c4bd8',
    s: '#2a35a6',
    suggestions: ['Erkläre mir ein Thema aus meinem Unterricht mit einem kleinen Beispiel.', 'Hilf mir, den Fehler in meinem Programm zu finden.', 'Gib mir Übungsaufgaben und prüfe meine Lösungen.', PLAN],
    rules: ['Zeige Code in kurzen Blöcken und erkläre ihn Zeile für Zeile. Schreibe nicht das ganze Programm für den Schüler, sondern führe ihn zur Lösung.'],
  },
  {
    id: 'kunst',
    name: 'Kunst',
    blurb: 'Bilder beschreiben, Techniken und Epochen verstehen',
    c: '#cf4a3a',
    s: '#a23528',
    suggestions: ['Hilf mir, ein Bild zu beschreiben und zu analysieren.', 'Erkläre mir eine Technik oder Epoche aus meinem Unterricht.', 'Frag mich Fachbegriffe ab.', PLAN],
    rules: ['Gliedere Bildanalysen in Beschreibung, Analyse und Deutung. Nenne Künstler und Jahreszahlen nur, wenn du dir sicher bist.'],
  },
  {
    id: 'musik',
    name: 'Musik',
    blurb: 'Notenlehre, Epochen und Begriffe',
    c: '#a855f7',
    s: '#7e2fd0',
    suggestions: ['Erkläre mir ein Thema der Musiktheorie mit Beispielen.', 'Frag mich Begriffe und Komponisten ab.', 'Hilf mir, ein Musikstück zu beschreiben.', PLAN],
    rules: ['Erkläre Notenlehre in Worten und einfachen Beispielen. Nenne Komponisten und Epochen nur, wenn du dir sicher bist.'],
  },
  {
    id: 'sonstiges',
    name: 'Anderes Fach',
    blurb: 'Ethik, Religion, Sport, Latein, Spanisch …',
    c: '#868a95',
    s: '#5f636d',
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
    'Der Schüler lernt den Stoff im Unterricht und nutzt dich, um ihn zu vertiefen, Lücken zu schließen und sich auf Arbeiten vorzubereiten. Du ersetzt weder Unterricht noch Lehrer.',
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
