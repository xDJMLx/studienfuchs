// Erfolge: werden aus dem gespeicherten Fortschritt abgeleitet, brauchen keinen eigenen Speicher.
export interface AchievementInput {
  lessons: number
  streak: number
  xp: number
  learnedWords: number
  masteredWords: number
  sets: number
  goalDays: number
  /** Eigene Stapel */
  decks?: number
  /** Eingetragene Arbeiten */
  arbeiten?: number
  /** In wie vielen Fächern schon geübt wurde */
  subjectsPracticed?: number
  /** Stapel mit drei Sternen (mindestens fünf Karten) */
  fullStars?: number
  /** Höchstes Fach-Level */
  maxLevel?: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  /** aktueller Stand / Ziel */
  value: number
  goal: number
}

export function achievements(i: AchievementInput): Achievement[] {
  const a = (id: string, title: string, description: string, value: number, goal: number): Achievement => ({
    id,
    title,
    description,
    value: Math.min(value, goal),
    goal,
  })
  return [
    a('first', 'Erster Schritt', 'Schließe deine erste Übungsrunde ab.', i.lessons, 1),
    a('ten', 'Dranbleiber', 'Schließe 10 Übungsrunden ab.', i.lessons, 10),
    a('fifty', 'Lernprofi', 'Schließe 50 Übungsrunden ab.', i.lessons, 50),
    a('streak3', 'Drei Tage am Stück', 'Lerne 3 Tage in Folge.', i.streak, 3),
    a('streak7', 'Wochenserie', 'Lerne 7 Tage in Folge.', i.streak, 7),
    a('streak30', 'Monatsserie', 'Lerne 30 Tage in Folge.', i.streak, 30),
    a('words25', '25 Karten', 'Lerne 25 verschiedene Karten.', i.learnedWords, 25),
    a('words100', '100 Karten', 'Lerne 100 verschiedene Karten.', i.learnedWords, 100),
    a('mastered50', 'Sitzt fest', 'Festige 50 Karten im Langzeitgedächtnis.', i.masteredWords, 50),
    a('xp1000', '1000 XP', 'Sammle insgesamt 1000 XP.', i.xp, 1000),
    a('goal5', 'Zielstrebig', 'Erreiche an 5 Tagen dein Tagesziel.', i.goalDays, 5),
    a('set', 'Eigener Stoff', 'Erstelle deinen ersten Stapel.', i.decks ?? i.sets, 1),
    a('decks5', 'Sammler', 'Erstelle 5 Stapel.', i.decks ?? i.sets, 5),
    a('arbeit1', 'Gut geplant', 'Trag deine erste Arbeit in den Kalender ein.', i.arbeiten ?? 0, 1),
    a('subjects3', 'Allrounder', 'Übe in 3 verschiedenen Fächern.', i.subjectsPracticed ?? 0, 3),
    a('star3', 'Gemeistert', 'Bring einen Stapel auf drei Sterne.', i.fullStars ?? 0, 1),
    a('level5', 'Profi-Status', 'Erreiche in einem Fach Level 5.', i.maxLevel ?? 1, 5),
  ]
}
