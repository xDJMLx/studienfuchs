import { generateCardSession } from './cardSession'
import type { CardRef } from './decks'
import { generateLesson, generateTest, shuffle } from './generateExercises'
import type { Exercise, Mastery } from './types'

/** Aufgabenart eines Durchgangs. `write` und `listen` gibt es nur bei Französisch (Karten mit Aufnahmen). */
export type RoundMode = 'mix' | 'flip' | 'type' | 'write' | 'listen' | 'probe'

export interface RoundOptions {
  refs: CardRef[]
  pool: CardRef[]
  mastery: (itemId: string) => Mastery
  mode?: RoundMode
  /** Gerät kann Französisch vorlesen (Aufnahmen oder Stimme) */
  allowListen?: boolean
  /** Sprechübungen mit Mikrofon erlaubt */
  allowSpeak?: boolean
  rng?: () => number
}

/** Französisch-Karten pro Durchgang: Die reiche Übungsfolge (Hören, Buchstaben legen, Sätze bauen) braucht mehr Aufgaben je Wort. */
export const FRENCH_ROUND = 10

/**
 * Die Aufgaben eines Durchgangs. Französische Karten bekommen die volle Übungsfolge des Sprachkurses
 * (Erkennen, Hören, Buchstaben legen, Tippen, Sätze bauen, Sprechen), alle anderen Karten die allgemeinen Karten-Aufgaben.
 */
export function generateRound(opts: RoundOptions): Exercise[] {
  const rng = opts.rng ?? Math.random
  const mode = opts.mode ?? 'mix'
  // Aufgaben (Quiz, Lückentext, Rechnen …) laufen auch in französischen Sätzen über die allgemeinen Aufgaben
  const french = opts.refs.filter((r) => r.deck.lang === 'fr' && !r.item.task)
  const rest = opts.refs.filter((r) => r.deck.lang !== 'fr' || r.item.task)

  // Karteikarten zum Umdrehen: für alle gleich
  if (mode === 'flip') return generateCardSession({ refs: opts.refs, pool: opts.pool, mastery: opts.mastery, flipOnly: true, rng })

  // Probearbeit: nichts wird gezeigt oder erklärt, jede Karte wird einmal abgefragt (Tippen oder Karteikarte, bei Französisch auch Hören)
  if (mode === 'probe') {
    const probe: Exercise[][] = []
    if (rest.length) probe.push(generateCardSession({ refs: rest, pool: opts.pool, mastery: () => 2, rng }))
    if (french.length) probe.push(generateTest({ items: french.map((r) => r.item), pool: opts.pool.filter((r) => r.deck.lang === 'fr').map((r) => r.item), count: french.length, allowListen: !!opts.allowListen, mastery: () => 2, rng }))
    return shuffle(probe.flat(), rng)
  }

  const blocks: Exercise[][] = []
  if (rest.length) blocks.push(generateCardSession({ refs: rest, pool: opts.pool, mastery: opts.mastery, typeOnly: mode === 'type' || mode === 'write', rng }))
  if (french.length) {
    const items = french.slice(0, FRENCH_ROUND).map((r) => r.item)
    blocks.push(
      generateLesson({
        items,
        pool: opts.pool.filter((r) => r.deck.lang === 'fr').map((r) => r.item),
        mastery: opts.mastery,
        allowListen: !!opts.allowListen,
        allowSpeak: !!opts.allowSpeak,
        focus: mode === 'type' || mode === 'write' ? 'write' : mode === 'listen' ? 'listen' : 'mix',
        rng,
      }),
    )
  }
  // Mehrere Fächer in einem Durchgang: die Blöcke in zufälliger Reihenfolge (neue Karten und ihre Fragen bleiben beisammen)
  return shuffle(blocks, rng).flat()
}
