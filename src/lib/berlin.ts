import { isRegular, units } from '../content'

/**
 * Berliner Rahmenbedingungen für Französisch als 2. Fremdsprache (Gymnasium, Beginn in Jahrgangsstufe 7).
 * Quellen: Rahmenlehrplan 1–10 Berlin-Brandenburg, Teil C Moderne Fremdsprachen (Niveaustufen E bis H);
 * Stoffverteilungspläne von Klett (Découvertes, Ausgabe ab 2020, Berlin/Brandenburg) und Cornelsen (À plus !).
 */
export const BERLIN_LEVEL: Record<number, { stufe: string; ger: string; text: string }> = {
  7: { stufe: 'E', ger: 'A1', text: 'Vertraute Alltagssituationen mit auswendig gelernten Wendungen bewältigen' },
  8: { stufe: 'F', ger: 'A2', text: 'Einfache zusammenhängende Texte zu Alltagsthemen schreiben und verstehen' },
  9: { stufe: 'G', ger: 'B1', text: 'Alltagssituationen auch mit Unvorhergesehenem meistern, über eigene Interessen sprechen' },
  10: { stufe: 'H', ger: 'B1+', text: 'Alltag differenziert bewältigen, Meinung begründen, längere Texte schreiben' },
}

/** Berliner Ferienzeiten (ungefähr, jedes Jahr gleich angenommen): Monat/Tag von bis, jeweils einschließlich. */
const HOLIDAYS: [number, number, number, number][] = [
  [10, 19, 10, 31], // Herbst
  [12, 23, 1, 2], // Weihnachten
  [2, 2, 2, 7], // Winter
  [3, 30, 4, 10], // Ostern
]
/** Erster Schultag (ungefähr) und ab wann Sommerferien sind. */
const SCHOOL_START = { month: 8, day: 24 }
const SUMMER_BREAK = { month: 7, day: 9 }
/** Unterrichtswochen, in denen die Lehrbücher durchgenommen werden (Klett rechnet in Berlin mit 32 Wochen plus Klassenarbeiten). */
const COURSE_WEEKS = 34

const DAY = 86_400_000

function overlapDays(from: Date, to: Date, holiday: [number, number, number, number]): number {
  let total = 0
  for (const year of new Set([from.getFullYear() - 1, from.getFullYear(), to.getFullYear()])) {
    const wraps = holiday[0] > holiday[2]
    const a = new Date(year, holiday[0] - 1, holiday[1])
    const b = new Date(wraps ? year + 1 : year, holiday[2] - 1, holiday[3] + 1)
    const lo = Math.max(a.getTime(), from.getTime())
    const hi = Math.min(b.getTime(), to.getTime())
    if (hi > lo) total += (hi - lo) / DAY
  }
  return total
}

/** Wie weit ist das Berliner Schuljahr (0 = erster Schultag, 1 = Lehrbuch geschafft)? In den Sommerferien: 1. */
export function schoolYearProgress(now = new Date()): number {
  const y = now.getFullYear()
  const summer = new Date(y, SUMMER_BREAK.month - 1, SUMMER_BREAK.day)
  const start = new Date(now >= new Date(y, SCHOOL_START.month - 1, SCHOOL_START.day) ? y : y - 1, SCHOOL_START.month - 1, SCHOOL_START.day)
  if (now >= summer && now < new Date(y, SCHOOL_START.month - 1, SCHOOL_START.day)) return 1
  const holidayDays = HOLIDAYS.reduce((sum, h) => sum + overlapDays(start, now, h), 0)
  const weeks = Math.max(0, (now.getTime() - start.getTime()) / DAY - holidayDays) / 7
  return Math.min(1, weeks / COURSE_WEEKS)
}

export interface BookUnit {
  id: string
  title: string
  /** Anteil des Schuljahrs, nach dem die Einheit laut Stoffverteilungsplan durch ist (aus den Wochen und Stunden des Plans) */
  end: number
}

/** Découvertes (Klett, Ausgabe ab 2020), Band 1 bis 4 = Klasse 7 bis 10. Wochen und Stunden aus den Stoffverteilungsplänen. */
export const DECOUVERTES: Record<number, BookUnit[]> = {
  7: [
    { id: 'd1-0', title: 'Au début', end: 0.02 },
    { id: 'd1-u1', title: 'Unité 1: Bonjour, Paris !', end: 0.13 },
    { id: 'd1-u2', title: 'Unité 2: Les copains et les activités', end: 0.28 },
    { id: 'd1-u3', title: "Unité 3: L'anniversaire de Jules", end: 0.43 },
    { id: 'd1-u4', title: 'Unité 4: Une journée de surprises', end: 0.58 },
    { id: 'd1-u5', title: 'Unité 5: Le spectacle va commencer !', end: 0.73 },
    { id: 'd1-u6', title: 'Unité 6: À Nice', end: 0.88 },
    { id: 'd1-m', title: 'Module: À la découverte de Paris', end: 1 },
  ],
  8: [
    { id: 'd2-u1', title: 'Unité 1: La rentrée des amis', end: 0.14 },
    { id: 'd2-u2', title: 'Unité 2: Aventures à Paris', end: 0.28 },
    { id: 'd2-u3', title: 'Unité 3: En famille à Grenoble', end: 0.47 },
    { id: 'd2-u4', title: 'Unité 4: À table ! On mange !', end: 0.63 },
    { id: 'd2-u5', title: 'Unité 5: Degemer mat e Breizh !', end: 0.8 },
    { id: 'd2-u6', title: 'Unité 6: Les médias et moi', end: 0.94 },
    { id: 'd2-m', title: "Module: Le sport, c'est fort !", end: 1 },
  ],
  9: [
    { id: 'd3-u1', title: 'Unité 1: Vive les échanges !', end: 0.19 },
    { id: 'd3-u2', title: "Unité 2: Une histoire d'amitié", end: 0.42 },
    { id: 'd3-u3', title: "Unité 3: S'engager, pourquoi pas ?", end: 0.61 },
    { id: 'd3-u4', title: 'Unité 4: Voyage en Martinique', end: 0.81 },
    { id: 'd3-u5', title: 'Unité 5: Aioli Marseille !', end: 1 },
  ],
  10: [
    { id: 'd4-u1', title: 'Unité 1: Vues sur le Québec', end: 0.19 },
    { id: 'd4-u2', title: 'Unité 2: Nous, Européens…', end: 0.42 },
    { id: 'd4-u3', title: 'Unité 3: Viens faire un tour…', end: 0.61 },
    { id: 'd4-u4', title: 'Unité 4: Ce qui compte pour moi…', end: 0.81 },
    { id: 'd4-m', title: 'Modules: La musique, la lecture', end: 1 },
  ],
}

/**
 * Die Einheit der App, bei der ein bestimmter Anteil des Schuljahrs erreicht ist: Zusatzeinheiten zählen nicht,
 * die Kerneinheiten werden nach ihrer Zahl an Lektionen auf das Schuljahr verteilt.
 */
export function unitAtProgress(grade: number, progress: number): string | null {
  const core = units.filter((u) => u.grade === grade && !u.extra)
  const sizes = core.map((u) => u.lessons.filter(isRegular).length)
  const total = sizes.reduce((a, b) => a + b, 0)
  if (!core.length || !total) return null
  let acc = 0
  for (let i = 0; i < core.length; i++) {
    acc += sizes[i]
    if (acc / total >= progress - 0.02) return core[i].id
  }
  return core[core.length - 1].id
}

/** Wo ist eine Berliner Klasse dieser Jahrgangsstufe heute ungefähr? */
export function expectedUnit(grade: number, now = new Date()): string | null {
  return unitAtProgress(grade, schoolYearProgress(now))
}
