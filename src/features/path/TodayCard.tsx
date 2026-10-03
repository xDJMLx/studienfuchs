import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { ChestSheet } from '../../components/ui/ChestSheet'
import { Check, Chest, Flame, Repeat, Right, Target, Xp } from '../../components/ui/Icons'
import { Sheet } from '../../components/ui/Sheet'
import { ProgressRing } from '../../components/ui/widgets'
import { catchUpStatus } from '../../lib/catchup'
import { chestReady, questDef } from '../../lib/rewards'
import { dayKey } from '../../lib/streak'
import { goalInfo } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { useDue } from '../review/ReviewPage'
import { DailyRewards } from './DailyQuests'

/** Heute: Tagesziel, Truhe, Tagesaufgaben, fällige Wörter und Aufholplan in einer Karte. */
export function TodayCard({ onChest }: { onChest?: () => void }) {
  const navigate = useNavigate()
  const { xpByDay, dailyGoal, streak, classUnit, catchUpTarget, catchUpAll, catchUpExtras, catchUpOngoing, lessons } = useStore(
    useShallow((s) => ({ xpByDay: s.xpByDay, dailyGoal: s.dailyGoal, streak: s.streak, classUnit: s.classUnit, catchUpTarget: s.catchUpTarget, catchUpAll: s.catchUpAll, catchUpExtras: s.catchUpExtras, catchUpOngoing: s.catchUpOngoing, lessons: s.lessons })),
  )
  const { due } = useDue()
  const plan = classUnit && catchUpTarget ? catchUpStatus(classUnit, catchUpTarget, lessons, new Date(), catchUpAll, catchUpExtras, catchUpOngoing) : null
  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const days = streakNow(streak)
  const done = g.baseReached
  const row = 'press flex w-full items-center gap-3.5 px-4 py-3.5 text-left'
  return (
    <section className="card divide-y-2 divide-line overflow-hidden" aria-label="Heute">
      <div className="flex items-center gap-4 px-4 py-4">
        <ProgressRing key={g.goal} pct={g.pct} size={56} stroke={6} color={done ? 'var(--good)' : 'var(--gold)'} track="var(--line)">
          {done ? <Check size={22} className="text-good" /> : <Xp size={24} />}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-extrabold leading-tight">{done ? (g.tier === 1 ? 'Tagesziel geschafft!' : 'Bonusziel geschafft!') : `Noch ${g.goal - today} XP bis zum Tagesziel`}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <Flame size={15} /> {days} {days === 1 ? 'Tag' : 'Tage'} Serie{done ? `, nächstes Bonusziel bei ${g.goal} XP` : ', danach wartet eine Truhe'}
          </p>
        </div>
      </div>
      <DailyRewards onChest={onChest} />
      {due.length > 0 && (
        <button type="button" className={row} onClick={() => navigate('/review/play')}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-sky-dark"><Repeat size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">
              {due.length} {due.length === 1 ? 'Wort' : 'Wörter'} wiederholen
            </span>
            <span className="block text-sm text-muted">{due.length >= 20 ? 'Erst das, dann Neues: So bleibt es länger hängen.' : 'Kurz bevor du sie vergessen würdest'}</span>
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </button>
      )}
      {plan && !plan.finished && (
        <button type="button" className={row} onClick={() => navigate('/catchup')}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Target size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Aufholen: {plan.toGoToday > 0 ? `heute noch ${plan.toGoToday} ${plan.toGoToday === 1 ? 'Lektion' : 'Lektionen'}` : 'für heute geschafft'}</span>
            <span className="block text-sm text-muted">
              Noch {plan.remaining} Lektionen in {plan.daysLeft} {plan.daysLeft === 1 ? 'Tag' : 'Tagen'}
            </span>
          </span>
          <Right size={16} className="shrink-0 text-muted" />
        </button>
      )}
    </section>
  )
}

/**
 * Die kompakte Heute-Leiste über dem Lernpfad (Handy und schmale Fenster): Tagesziel, Aufgaben und Truhe auf einen Blick.
 * Antippen öffnet alles im Detail. Fällige Wörter stehen als blauer Knopf darunter, weil sie fürs Behalten am wichtigsten sind.
 */
export function TodayStrip() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const { xpByDay, dailyGoal, daily, ensureDaily } = useStore(useShallow((s) => ({ xpByDay: s.xpByDay, dailyGoal: s.dailyGoal, daily: s.daily, ensureDaily: s.ensureDaily })))
  const { due } = useDue()
  const [sheet, setSheet] = useState(false)
  const [chest, setChest] = useState(false)

  useEffect(() => {
    ensureDaily()
  }, [ensureDaily])

  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const d = daily?.day === dayKey() ? daily : null
  const quests = d ? d.quests.map(questDef).filter(Boolean) : []
  const questsDone = d ? d.claimed.length : 0
  const ready = chestReady(g.baseReached, d)
  const opened = !!d?.chest

  const seg = 'press flex min-w-0 flex-col items-center gap-1 px-2 pb-2.5 pt-3 text-center'
  return (
    <>
      <div className="card mb-3 grid grid-cols-3 divide-x-2 divide-line overflow-hidden" role="group" aria-label="Heute">
        <button type="button" className={seg} onClick={() => setSheet(true)} aria-label={`Tagesziel: ${today} von ${g.goal} XP`}>
          <ProgressRing key={g.goal} pct={g.pct} size={38} stroke={5} color={g.baseReached ? 'var(--good)' : 'var(--gold)'} track="var(--line)">
            {g.baseReached ? <Check size={15} className="text-good" /> : <Xp size={17} />}
          </ProgressRing>
          <span className="block text-[14px] font-extrabold leading-tight tabular-nums">{today}/{g.goal} XP</span>
        </button>
        <button type="button" className={seg} onClick={() => setSheet(true)} aria-label={`Tagesaufgaben: ${questsDone} von ${quests.length} geschafft`}>
          <span className="flex h-[38px] items-center gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-full ${i < questsDone ? 'bg-good text-white' : 'border-2 border-line'}`}>
                {i < questsDone && <Check size={14} />}
              </span>
            ))}
          </span>
          <span className="block text-[14px] font-extrabold leading-tight">{questsDone === (quests.length || 3) ? 'Alle geschafft' : 'Aufgaben'}</span>
        </button>
        <button type="button" className={seg} onClick={() => (ready || opened ? setChest(true) : setSheet(true))} aria-label={ready ? 'Truhe öffnen' : opened ? 'Truhe von heute ansehen' : 'Truhe: erst nach dem Tagesziel'}>
          <motion.span
            className="shrink-0"
            animate={ready && !reduce ? { rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.1, 1] } : undefined}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.4 }}
          >
            <Chest size={38} open={opened} className={ready || opened ? '' : 'opacity-45 grayscale'} />
          </motion.span>
          <span className={`block text-[14px] font-extrabold leading-tight ${ready ? 'text-gold-dark' : opened ? 'text-muted' : ''}`}>{ready ? 'Truhe öffnen!' : opened ? 'Truhe offen' : 'Truhe'}</span>
        </button>
      </div>
      {due.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/review/play')}
          className="press mb-3 flex w-full items-center gap-3 rounded-2xl bg-sky px-4 py-3 text-left text-white"
          style={{ boxShadow: '0 4px 0 var(--shade-sky)' }}
        >
          <Repeat size={22} />
          <span className="min-w-0 flex-1 font-extrabold">
            {due.length} {due.length === 1 ? 'Wort' : 'Wörter'} wiederholen
          </span>
          <Right size={16} />
        </button>
      )}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Heute">
        <TodayCard
          onChest={() => {
            setSheet(false)
            window.setTimeout(() => setChest(true), 220)
          }}
        />
      </Sheet>
      <ChestSheet open={chest} onClose={() => setChest(false)} />
    </>
  )
}
