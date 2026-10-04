import { dayKey } from './streak'

export interface ReportInput {
  xpByDay: Record<string, number>
  /** Geübte Minuten je Tag */
  minutesByDay?: Record<string, number>
  /** Lektionen mit dem Tag, an dem sie zuletzt geschafft wurden (YYYY-MM-DD) */
  lessons: Record<string, { lastDone: string }>
  level: number
  learnedWords: number
  masteredWords: number
  dueNow: number
  /** Nächste Klassenarbeit (Titel der Liste, Tage bis dahin) */
  nextExam?: { title: string; days: number } | null
  now?: Date
}

const dm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Wochenbericht der letzten sieben Tage als Text zum Teilen (z. B. für die Eltern). Enthält keinen Namen. */
export function buildWeeklyReport(i: ReportInput): { text: string; activeDays: number; weekXp: number; minutes: number; lessonsWeek: number } {
  const now = i.now ?? new Date()
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - k))
    return d
  })
  const keys = days.map((d) => dayKey(d))
  const xp = keys.map((k) => i.xpByDay[k] ?? 0)
  const weekXp = xp.reduce((a, b) => a + b, 0)
  const activeDays = xp.filter((v) => v > 0).length
  const minutes = Math.round(keys.reduce((a, k) => a + (i.minutesByDay?.[k] ?? 0), 0))
  const lessonsWeek = Object.values(i.lessons).filter((l) => keys.includes(l.lastDone)).length

  const lines = [
    `Studienfuchs · Wochenbericht ${dm(days[0])}–${dm(days[6])}`,
    '',
    `• Aktiv an ${activeDays} von 7 Tagen`,
    `• ${minutes} ${plural(minutes, 'Minute', 'Minuten')} geübt, ${weekXp} XP gesammelt`,
    `• ${lessonsWeek} ${plural(lessonsWeek, 'Lektion', 'Lektionen')} geschafft`,
    `• Wortschatz: ${i.learnedWords} Wörter geübt, ${i.masteredWords} davon gefestigt (Level ${i.level})`,
    `• Jetzt zu wiederholen: ${i.dueNow} ${plural(i.dueNow, 'Wort', 'Wörter')}`,
  ]
  if (i.nextExam) lines.push(`• Nächste Klassenarbeit: ${i.nextExam.title} (${i.nextExam.days === 0 ? 'heute' : i.nextExam.days === 1 ? 'morgen' : `in ${i.nextExam.days} Tagen`})`)
  lines.push('', 'Aus der Lern-App Studienfuchs.')
  return { text: lines.join('\n'), activeDays, weekXp, minutes, lessonsWeek }
}
