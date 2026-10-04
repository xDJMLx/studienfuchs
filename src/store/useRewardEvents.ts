import { create } from 'zustand'
import type { Achievement } from '../lib/achievements'

/** Was nach einer Übungseinheit Neues passiert ist (für den Ergebnisbildschirm). Wird nicht gespeichert. */
export interface SessionEvents {
  achievements: Achievement[]
  unit: { id: string; title: string; description: string } | null
}

/**
 * last: Meldungen für den Ergebnisbildschirm. pathDone: eine Lektion, die gerade frisch geschafft wurde;
 * der Lernpfad feiert sie beim nächsten Öffnen mit einem kleinen Feuerwerk und löscht den Eintrag dann.
 */
export const useRewardEvents = create<{ last: SessionEvents | null; pathDone: string | null }>(() => ({ last: null, pathDone: null }))
