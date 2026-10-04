// Gemeinsames Datenmodell: Kurs-Inhalte und eigene Sets nutzen dieselben Items.
// front = Lernsprache (z.B. Französisch), back = Muttersprache (Deutsch).

export interface Item {
  id: string
  front: string
  back: string
  example?: string
  exampleDe?: string
  note?: string
}

export interface Explanation {
  title: string
  paragraphs: string[]
  /** Beispiele: bei Mathe steht in fr die Rechnung (Mathe-Schreibweise), in de die Erklärung dazu */
  examples?: { fr: string; de: string }[]
  tip?: string
  /** Mathe: Beispiele ohne Vorlesen-Knopf und in Mathe-Schreibweise */
  math?: boolean
}

/** Lückensatz mit Begründung – für Grammatik, die sich nicht aus Vokabeln erzeugen lässt. */
export interface FillTask {
  id: string
  sentence: string // enthält ___ als Lücke
  answer: string
  options: string[]
  translation?: string
  why: string
}

export interface Lesson {
  id: string
  title: string
  explanation?: Explanation
  items: Item[]
  fills?: FillTask[]
  /** automatisch erzeugte Wiederholungs-Lektion einer Einheit */
  review?: boolean
  /** Einheitentest: gemischte Aufgaben ohne Hilfen, bestanden ab 70 % */
  test?: boolean
}

export interface Unit {
  id: string
  title: string
  description: string
  grade: number
  subject: string
  /** Schulbuch-Zuordnung, z. B. "À plus ! 1 · Unité 2" */
  book?: string
  /** Zusatzwortschatz (z. B. aus Découvertes): freiwillig, bremst den Lernpfad nicht */
  extra?: boolean
  lessons: Lesson[]
}

export interface VocabSet {
  id: string
  title: string
  createdAt: string
  items: Item[]
  /** Buch, zu dem das Kapitel gehört (z. B. "À plus ! 1"); ohne Angabe steht das Set einzeln */
  book?: string
  /** Fach (Kennung aus subjects.ts). Ältere Sets ohne Angabe gehören zu Französisch. */
  subject?: string
  /** Sprache der Karten, wenn es Vokabeln sind: bringt Vorlesen und Akzent-Tasten */
  lang?: DeckLang
  /** Auch rückwärts abfragen (Rückseite zeigen, Vorderseite antworten): gut für Vokabeln */
  both?: boolean
}

export type DeckLang = 'fr' | 'en'

/** Eine Klassenarbeit oder ein Test: Fach, Termin und die Stapel, die dafür gelernt werden. */
export type ArbeitKind = 'klassenarbeit' | 'test' | 'vokabeltest' | 'klausur' | 'praesentation' | 'sonstiges'

export interface Arbeit {
  id: string
  subject: string
  /** Art des Termins; ältere Einträge ohne Angabe sind Klassenarbeiten */
  kind?: ArbeitKind
  title: string
  /** YYYY-MM-DD */
  date: string
  /** Beginn (HH:MM); ohne Angabe ist der Termin ganztägig */
  time?: string
  /** Dauer in Minuten (mit Uhrzeit) */
  duration?: number
  /** Karteikarten-Kennungen (eigene Sets oder "unit:…" für Kurs-Stapel) */
  deckIds: string[]
  /** Nach dem Termin: erledigt (Note eingetragen oder übersprungen) */
  done?: boolean
  /** Note 1 bis 6, falls eingetragen */
  note?: number
}

/** `warm`: Aufwärm-Aufgabe zu einem älteren, fälligen Wort. Sie zählt für die Wiederholungsplanung, aber nicht fürs Bestehen der Lektion. */
export type Exercise = ExerciseKind & {
  warm?: boolean
  /** Mathe: erzeugt eine frische, gleichartige Aufgabe (statt bei einem Fehler genau dieselbe zu wiederholen) */
  again?: () => Exercise
}

type ExerciseKind =
  | { kind: 'teach'; id: string; itemId: string; items: Item[]; /** Karten-Stapel: Sprache für das Vorlesen ('none' = nichts vorlesen). Ohne Angabe: Französisch-Wortschatz. */ lang?: DeckLang | 'none' }
  | CardExerciseKind
  | { kind: 'choice'; id: string; itemId: string; prompt: string; promptLang: 'fr' | 'de'; answer: string; options: string[]; speak?: string }
  | { kind: 'type'; id: string; itemId: string; prompt: string; promptLang: 'fr' | 'de'; answer: string; accept?: string[]; speak?: string; hint?: boolean }
  | { kind: 'spell'; id: string; itemId: string; prompt: string; answer: string; letters: string[]; speak: string }
  | { kind: 'listen'; id: string; itemId: string; speak: string; answer: string; accept?: string[]; translation: string }
  | { kind: 'listenChoice'; id: string; itemId: string; speak: string; answer: string; options: string[] }
  | { kind: 'speak'; id: string; itemId: string; text: string; translation: string; accept?: string[] }
  | { kind: 'build'; id: string; itemId: string; prompt: string; answer: string; words: string[] }
  | { kind: 'match'; id: string; itemId: string; pairs: { id: string; left: string; right: string }[] }
  | { kind: 'fill'; id: string; itemId: string; sentence: string; answer: string; options: string[]; translation?: string; why: string }
  | MathExerciseKind

/** Aufgaben zu eigenen Karten (jedes Fach): Frage und Antwort, optional mit Sprache für Vorlesen und Tasten. */
export type CardExerciseKind =
  | { kind: 'qchoice'; id: string; itemId: string; title: string; prompt: string; answer: string; options: string[]; lang?: DeckLang; speak?: string }
  | { kind: 'qtype'; id: string; itemId: string; title: string; prompt: string; answer: string; accept?: string[]; lang?: DeckLang; speak?: string; hint?: boolean }
  | { kind: 'qcard'; id: string; itemId: string; front: string; back: string; example?: string; exampleDe?: string; lang?: DeckLang; speak?: string }

/** Mathe-Aufgaben. Texte sind in Mathe-Schreibweise: $…$ für Terme, {Zähler|Nenner} für Brüche, ^2 für Hochzahlen. */
export type MathExerciseKind =
  | {
      kind: 'calc'
      id: string
      itemId: string
      title: string
      prompt: string
      /** steht vor dem Eingabefeld, z. B. "x =" */
      lead?: string
      /** steht hinter dem Eingabefeld, z. B. "cm²" */
      unit?: string
      /** Lösung zur Anzeige (Mathe-Schreibweise) */
      answer: string
      value: number
      /** Die Lösung ist ein Bruch, der gekürzt sein soll (sonst "fast richtig") */
      reduce?: boolean
      /** Zahlentastatur mit Bruchstrich */
      frac?: boolean
      accept?: number[]
      hint?: string
      /** Rechenweg, wird bei einem Fehler gezeigt */
      solution?: string
    }
  | { kind: 'mchoice'; id: string; itemId: string; title: string; prompt: string; answer: string; options: string[]; hint?: string; solution?: string }
  | { kind: 'mmatch'; id: string; itemId: string; title: string; pairs: { id: string; left: string; right: string }[]; hint?: string }

export type Mastery = 0 | 1 | 2 // neu, lernend, gefestigt
