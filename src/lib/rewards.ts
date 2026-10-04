// Belohnungen, die übrig sind: Combo-Bonus innerhalb einer Runde und die Münzen für eine fertige Kurs-Einheit.
// (Tagesaufgaben, Tagesziel-Bonus, Truhe und Serien gibt es nicht mehr: Geübt wird für Arbeiten.)

/** Münzen für die Truhe am Ende einer Einheit */
export const UNIT_CHEST_COINS = 25

/** Combo-Bonus: Wer viele Aufgaben in Folge auf Anhieb schafft, bekommt ein paar XP extra (höchstens 6). */
export function comboBonus(bestCombo: number): number {
  return Math.min(6, Math.floor(bestCombo / 3) * 2)
}
