import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ChestSheet } from '../../components/ui/ChestSheet'
import { Check, Chest, Coin, Right } from '../../components/ui/Icons'
import { QUEST_BONUS, chestReady, questDef, questProgress, type QuestDef } from '../../lib/rewards'
import { dayKey } from '../../lib/streak'
import { goalInfo } from '../../lib/xp'
import { useStore } from '../../store/useStore'

/** Truhe und Tagesaufgaben: das Extra für jeden Tag, ohne Druck (verpasste Tage kosten nichts). */
export function DailyRewards() {
  const reduce = useReducedMotion()
  const daily = useStore((s) => s.daily)
  const goalReached = useStore((s) => goalInfo(s.dailyGoal, s.xpByDay[dayKey()] ?? 0).baseReached)
  const ensureDaily = useStore((s) => s.ensureDaily)
  const [sheet, setSheet] = useState(false)

  // Neuer Tag, neue Aufgaben
  useEffect(() => {
    ensureDaily()
  }, [ensureDaily])

  const today = daily && daily.day === dayKey() ? daily : null
  if (!today) return null
  const quests = today.quests.map(questDef).filter((q): q is QuestDef => !!q)
  const doneCount = quests.filter((q) => today.claimed.includes(q.id)).length
  const ready = chestReady(goalReached, today)
  const opened = today.chest !== null

  return (
    <>
      {(ready || opened) && (
        <button type="button" onClick={() => setSheet(true)} className="press flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
          <motion.span
            className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl ${ready ? 'bg-gold/25 text-gold-dark' : 'bg-snow text-muted'}`}
            animate={ready && !reduce ? { rotate: [0, -6, 6, -4, 4, 0], scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.6 }}
          >
            <Chest size={34} open={opened} />
          </motion.span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{ready ? 'Deine Truhe wartet!' : 'Truhe von heute'}</span>
            <span className="block text-sm text-muted">{ready ? 'Tippe zum Öffnen. Fenni hat etwas versteckt.' : 'Schon geöffnet. Morgen gibt es die nächste.'}</span>
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </button>
      )}

      <div className="px-4 py-3.5" aria-label="Tagesaufgaben">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Heutige Aufgaben</h2>
          <span className="text-sm font-semibold text-muted">
            {doneCount} von {quests.length}
          </span>
        </div>
        <ul className="grid gap-2">
          {quests.map((q) => {
            const done = today.claimed.includes(q.id)
            const p = questProgress(q, today)
            return (
              <li key={q.id} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-good bg-good text-on-brand' : 'border-line text-transparent'}`}
                  aria-hidden
                >
                  <Check size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] leading-snug ${done ? 'text-muted line-through decoration-1' : 'font-medium'}`}>{q.text}</span>
                  {!done && q.target > 1 && (
                    <span className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-snow" role="progressbar" aria-valuemin={0} aria-valuemax={q.target} aria-valuenow={p} aria-label={q.text}>
                        <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(p / q.target) * 100}%` }} />
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {p}/{q.target}
                      </span>
                    </span>
                  )}
                </span>
                <span className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${done ? 'bg-snow text-muted' : 'bg-gold/20 text-gold-dark'}`}>
                  <Coin size={13} /> {done ? 'erhalten' : `+${q.coins}`}
                </span>
              </li>
            )
          })}
        </ul>
        {quests.length > 0 && (
          <p className="mt-2.5 text-xs text-muted">
            {today.bonusClaimed ? 'Alle drei geschafft. Der Bonus ist da. Stark!' : `Alle drei schaffen gibt noch +${QUEST_BONUS} Münzen extra.`}
          </p>
        )}
      </div>
      <ChestSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  )
}
