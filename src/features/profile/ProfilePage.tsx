import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { IconChip } from '../../components/ui/controls'
import { Coin, Gear, Right, Shield, Star, Trophy } from '../../components/ui/Icons'
import { CountUp, EASE } from '../../components/ui/motion'
import { ProgressRing } from '../../components/ui/widgets'
import { achievements } from '../../lib/achievements'
import { dayKey } from '../../lib/streak'
import { levelFromXp } from '../../lib/xp'
import { useStore } from '../../store/useStore'
import { deckAchievementStats } from '../../lib/progress'
import { useLearned } from '../review/ReviewPage'
import { useShallow } from 'zustand/react/shallow'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const TITLES = ['Fuchsjunges', 'Neugieriger Fuchs', 'Wortsammler', 'Vokabelprofi', 'Sprachfuchs', 'Grammatikmeister', 'Studienfuchs-Legende']
const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))]


export function ProfilePage() {
  const reduce = useReducedMotion()
  const [allBadges, setAllBadges] = useState(false)
  const { xp, minutesByDay, dailyMinutes, lessons, rounds, sets, outfit, coins, addedUnits, arbeiten, cards } = useStore(useShallow((s) => ({ xp: s.xp, minutesByDay: s.minutesByDay, dailyMinutes: s.dailyMinutes, lessons: s.lessons, rounds: s.rounds, sets: s.sets, outfit: s.outfit, coins: s.coins, addedUnits: s.addedUnits, arbeiten: s.arbeiten, cards: s.cards })))
  const lvl = levelFromXp(xp)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { key: dayKey(d), label: WEEKDAYS[d.getDay()] }
  })
  const minOf = (key: string) => Math.round(minutesByDay?.[key] ?? 0)
  const maxMin = Math.max(dailyMinutes, ...days.map((d) => minOf(d.key)))
  const weekMin = days.reduce((n, d) => n + minOf(d.key), 0)
  const { learned, byMastery } = useLearned()
  const mastered = byMastery[1]

  const badges = achievements({
    lessons: (rounds ?? 0) + Object.keys(lessons).length,
    xp,
    learnedWords: learned.length,
    masteredWords: mastered,
    sets: sets.length,
    ...deckAchievementStats({ sets, addedUnits, arbeiten, cards }),
  })
  const unlocked = badges.filter((b) => b.value >= b.goal).length

  const shown = allBadges ? badges : [...badges].sort((x, y) => y.value / y.goal - x.value / x.goal).slice(0, 3)
  const linkRow = 'row'
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-3 lg:pt-8">
      <h1 className="large-title mb-4 px-1">Profil</h1>

      {/* Fuchs, Level und Münzen */}
      <section className="card relative overflow-hidden p-5" aria-label="Level">
        <div className="flex items-center gap-4">
          <Mascot size={92} alive listen outfit={outfit} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-muted">Level {lvl.level}</p>
            <h2 className="text-[22px] font-black leading-tight">{titleFor(lvl.level)}</h2>
            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-snow" role="progressbar" aria-valuemin={0} aria-valuemax={lvl.needed} aria-valuenow={lvl.into} aria-label={`Fortschritt zu Level ${lvl.level + 1}`}>
              <motion.div className="h-full rounded-full bg-brand" initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(3, (lvl.into / lvl.needed) * 100)}%` }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }} />
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              <CountUp to={xp} /> XP · noch {lvl.needed - lvl.into} bis Level {lvl.level + 1}
            </p>
          </div>
        </div>
      </section>

      <div className="list mt-4">
        <Link to="/shop" className={linkRow}>
          <Coin size={26} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-extrabold leading-tight">Fuchs und Shop</span>
            <span className="block text-[13px] text-muted">{coins} {coins === 1 ? 'Münze' : 'Münzen'} zum Ausgeben</span>
          </span>
          <Right size={13} className="shrink-0 text-muted" />
        </Link>
      </div>

      {/* Eine Woche auf einen Blick */}
      <section className="card mt-4 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px] font-extrabold">Diese Woche</h2>
          <span className="text-sm text-muted"><span className="font-extrabold text-ink">{weekMin}</span> Minuten</span>
        </div>
        {weekMin === 0 ? (
          <p className="py-6 text-center text-[15px] text-muted">Diese Woche hast du noch nicht geübt. Eine Runde dauert nur ein paar Minuten.</p>
        ) : (
        <div className="flex h-28 items-end gap-2.5" role="img" aria-label="Geübte Minuten der letzten 7 Tage">
          {days.map((d, i) => {
            const v = minOf(d.key)
            const hit = v >= dailyMinutes
            return (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${v} Minuten`}>
                <div className="flex w-full flex-1 items-end">
                  <motion.div
                    className={`w-full rounded-md ${hit ? 'bg-good' : 'bg-brand'}`}
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: `${Math.max((v / maxMin) * 100, v ? 5 : 2)}%` }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.04 }}
                    style={{ opacity: v ? 1 : 0.25 }}
                  />
                </div>
                <span className={`text-[11px] font-bold ${d.key === dayKey() ? 'text-brand-dark' : 'text-muted'}`}>{d.label}</span>
              </div>
            )
          })}
        </div>
        )}
        <p className="mt-3 text-xs text-muted">Grün: so viele Minuten, wie du dir für eine Arbeit vorgenommen hast ({dailyMinutes}).</p>
      </section>

      {/* Erfolge: drei, der Rest klappt auf */}
      <section className="mt-6">
        <div className="mb-1.5 flex items-baseline justify-between px-1">
          <h2 className="text-[20px] font-black">Erfolge</h2>
          <span className="text-sm text-muted"><span className="font-extrabold text-ink">{unlocked}</span> von {badges.length}</span>
        </div>
        <ul className="grid grid-cols-3 gap-2.5">
          {shown.map((b) => {
            const done = b.value >= b.goal
            return (
              <li key={b.id} className="card flex flex-col items-center px-2 pb-3 pt-3.5 text-center" title={b.description}>
                {done ? (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-white">
                    <Trophy size={28} />
                  </span>
                ) : (
                  <ProgressRing pct={b.value / b.goal} size={58} stroke={5} color="var(--gold)" track="var(--line)">
                    <span className="text-muted opacity-70"><Trophy size={24} /></span>
                  </ProgressRing>
                )}
                <p className="mt-2 line-clamp-2 text-[13px] font-extrabold leading-tight">{b.title}</p>
                <p className={`mt-0.5 text-[12px] font-bold tabular-nums ${done ? 'text-gold-dark' : 'text-muted'}`}>{done ? 'geschafft' : `${b.value} / ${b.goal}`}</p>
              </li>
            )
          })}
        </ul>
        {badges.length > 3 && (
          <button type="button" className="press mx-auto mt-2 flex min-h-11 items-center rounded-xl px-3 text-sm font-extrabold text-sky-dark" onClick={() => setAllBadges((v) => !v)} aria-expanded={allBadges}>
            {allBadges ? 'Weniger zeigen' : `Alle ${badges.length} Erfolge zeigen`}
          </button>
        )}
      </section>

      <div className="list mt-6">
        <Link to="/review" className={linkRow}>
          <IconChip tone="muted"><Star size={20} /></IconChip>
          <span className="min-w-0 flex-1 text-[16px] font-extrabold">Lernstand und Wochenbericht</span>
          <Right size={13} className="text-muted" />
        </Link>
        <Link to="/settings" className={linkRow}>
          <IconChip tone="muted"><Gear size={20} /></IconChip>
          <span className="min-w-0 flex-1 text-[16px] font-extrabold">Einstellungen</span>
          <Right size={13} className="text-muted" />
        </Link>
        <Link to="/about" className={linkRow}>
          <IconChip tone="muted"><Shield size={20} /></IconChip>
          <span className="min-w-0 flex-1 text-[16px] font-extrabold">Datenschutz & Impressum</span>
          <Right size={13} className="text-muted" />
        </Link>
      </div>
    </div>
  )
}
