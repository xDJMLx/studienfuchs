import { create } from 'zustand'
import type { Achievement } from '../lib/achievements'
import type { QuestDef } from '../lib/rewards'

/** Was nach einer Übungseinheit Neues passiert ist (für den Ergebnisbildschirm). Wird nicht gespeichert. */
export interface SessionEvents {
  quests: QuestDef[]
  questCoins: number
  allQuests: boolean
  bonus: number
  achievements: Achievement[]
  unit: { id: string; title: string; description: string } | null
  chestUnlocked: boolean
}

export const useRewardEvents = create<{ last: SessionEvents | null }>(() => ({ last: null }))
