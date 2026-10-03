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
  examples?: { fr: string; de: string }[]
  tip?: string
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
}

/** `warm`: Aufwärm-Aufgabe zu einem älteren, fälligen Wort. Sie zählt für die Wiederholungsplanung, aber nicht fürs Bestehen der Lektion. */
export type Exercise = ExerciseKind & { warm?: boolean }

type ExerciseKind =
  | { kind: 'teach'; id: string; itemId: string; items: Item[] }
  | { kind: 'choice'; id: string; itemId: string; prompt: string; promptLang: 'fr' | 'de'; answer: string; options: string[]; speak?: string }
  | { kind: 'type'; id: string; itemId: string; prompt: string; promptLang: 'fr' | 'de'; answer: string; accept?: string[]; speak?: string; hint?: boolean }
  | { kind: 'spell'; id: string; itemId: string; prompt: string; answer: string; letters: string[]; speak: string }
  | { kind: 'listen'; id: string; itemId: string; speak: string; answer: string; accept?: string[]; translation: string }
  | { kind: 'listenChoice'; id: string; itemId: string; speak: string; answer: string; options: string[] }
  | { kind: 'speak'; id: string; itemId: string; text: string; translation: string; accept?: string[] }
  | { kind: 'build'; id: string; itemId: string; prompt: string; answer: string; words: string[] }
  | { kind: 'match'; id: string; itemId: string; pairs: { id: string; left: string; right: string }[] }
  | { kind: 'fill'; id: string; itemId: string; sentence: string; answer: string; options: string[]; translation?: string; why: string }

export type Mastery = 0 | 1 | 2 // neu, lernend, gefestigt
