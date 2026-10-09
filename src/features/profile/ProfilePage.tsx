import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Bug, Gear, Right, Shield, Star } from '../../components/ui/Icons'
import { AchievementIcon } from '../../components/ui/AchievementIcons'
import { SubjectShape } from '../../components/ui/SubjectShape'
import { CountUp, EASE } from '../../components/ui/motion'
import { achievements } from '../../lib/achievements'
import { dayKey } from '../../lib/streak'
import { levelFromXp } from '../../lib/xp'
import { useStore } from '../../store/useStore'
import { deckAchievementStats } from '../../lib/progress'
import { useLearned } from '../review/ReviewPage'
import { useShallow } from 'zustand/react/shallow'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const TITLES = ['Lernneuling', 'Neugierig', 'Wortsammler', 'Vokabelprofi', 'Sprachprofi', 'Grammatikmeister', 'Studienfuchs-Legende']
const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))]


/** Farben der Erfolge (jeder hat dazu sein eigenes Symbol). */
const BADGE_COLORS = ['#ff6a3d', '#3b82ff', '#e09500', '#19b36b', '#7c5cff', '#ee5a8d', '#14a3c7']

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
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-3 lg:max-w-none lg:px-0 lg:pt-10">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">
      <div>
      <header className="mb-4 flex items-center justify-between px-1">
        <h1 className="large-title">Profil</h1>
        <Link to="/settings" aria-label="Einstellungen" className="press flex h-11 w-11 items-center justify-center rounded-[12px] border border-line bg-surface text-ink">
          <Gear size={22} />
        </Link>
      </header>

      <section className="card relative overflow-visible px-5 pb-5 pt-4" aria-label="Level">
        <div className="flex items-end gap-4">
          <Link to="/settings/tier" aria-label="Lerntier wechseln" className="press relative -mt-6 shrink-0 rounded-2xl">
            <Mascot size={118} alive listen outfit={outfit} />
          </Link>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[14px] font-bold text-muted">Level</p>
            <p className="flex items-baseline gap-2.5">
              <span className="text-[60px] font-black leading-[0.85] tracking-[-0.04em]">{lvl.level}</span>
              <span className="truncate text-[20px] font-extrabold leading-tight">{titleFor(lvl.level)}</span>
            </p>
          </div>
        </div>
        <div className="mt-5 h-3.5 w-full overflow-hidden rounded-full bg-snow" role="progressbar" aria-valuemin={0} aria-valuemax={lvl.needed} aria-valuenow={lvl.into} aria-label={`Fortschritt zu Level ${lvl.level + 1}`}>
          <motion.div className="h-full rounded-full" style={{ background: 'var(--brand)' }} initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(4, (lvl.into / lvl.needed) * 100)}%` }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 }} />
        </div>
        <p className="mt-2 text-[13px] text-muted">
          <CountUp to={xp} /> XP · noch {lvl.needed - lvl.into} bis Level {lvl.level + 1}
        </p>
      </section>

      {/* Zwei Blöcke wie bei den Fächern: Shop und Lernstand */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/shop" className="shape-block press" style={{ '--block': '#d98a00', '--block-edge': 'color-mix(in srgb, #d98a00 55%, black)' } as React.CSSProperties}>
          <SubjectShape id="geografie" size={24} className="text-white/95" />
          <span>
            <span className="block text-[34px] font-black leading-none tabular-nums">{coins}</span>
            <span className="mt-0.5 block text-[15px] font-extrabold">Tier und Shop</span>
          </span>
        </Link>
        <Link to="/review" className="shape-block press" style={{ '--block': '#2f6bff', '--block-edge': 'color-mix(in srgb, #2f6bff 55%, black)' } as React.CSSProperties}>
          <Star size={24} className="text-white/95" />
          <span>
            <span className="block text-[34px] font-black leading-none tabular-nums">{learned.length}</span>
            <span className="mt-0.5 block text-[15px] font-extrabold">Lernstand</span>
          </span>
        </Link>
      </div>

      </div>
      <div>
      {/* Eine Woche auf einen Blick */}
      <section className="card mt-4 p-5 lg:mt-0">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px] font-extrabold">Diese Woche</h2>
          <span className="text-sm text-muted"><span className="font-extrabold text-ink">{weekMin}</span> Minuten</span>
        </div>
        {weekMin === 0 ? (
          <p className="py-6 text-center text-[15px] text-muted">Noch keine Runde diese Woche. Eine dauert nur ein paar Minuten.</p>
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
        {weekMin > 0 && <p className="mt-3 text-xs text-muted">Grün: so viele Minuten, wie du dir für eine Arbeit vorgenommen hast ({dailyMinutes}).</p>}
      </section>

      {/* Erfolge: drei, der Rest klappt auf */}
      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="text-[20px] font-black">Erfolge</h2>
          <span className="text-sm text-muted"><span className="font-extrabold text-ink">{unlocked}</span> von {badges.length}</span>
        </div>
        <ul className="grid grid-cols-3 gap-3">
          {shown.map((b) => {
            const done = b.value >= b.goal
            const k = badges.findIndex((x) => x.id === b.id)
            const color = BADGE_COLORS[k % BADGE_COLORS.length]
            return (
              <li key={b.id} className="card flex flex-col items-center px-2 pb-3 pt-3.5 text-center" title={b.description}>
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-[16px]"
                  style={{ background: done ? color : `color-mix(in srgb, ${color} 38%, var(--snow))`, boxShadow: done ? `0 4px 0 color-mix(in srgb, ${color} 55%, black)` : 'none', opacity: done ? 1 : 0.9 }}
                >
                  <AchievementIcon id={b.id} color={color} size={46} />
                </span>
                <p className="mt-2.5 line-clamp-2 text-[13px] font-extrabold leading-tight">{b.title}</p>
                {done ? (
                  <p className="mt-0.5 text-[12px] font-bold text-good-dark">geschafft</p>
                ) : (
                  <div className="mt-1.5 w-full" role="progressbar" aria-valuemin={0} aria-valuemax={b.goal} aria-valuenow={b.value} aria-label={`${b.title}: ${b.value} von ${b.goal}`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-snow">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(6, (b.value / b.goal) * 100)}%`, background: color }} />
                    </div>
                    <p className="mt-1 text-[11px] font-bold tabular-nums text-muted">
                      {b.value} / {b.goal}
                    </p>
                  </div>
                )}
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
        <Link to="/settings/feedback" className="row">
          <Bug size={20} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 text-[16px] font-extrabold">Fehler melden und Ideen</span>
          <Right size={13} className="text-muted" />
        </Link>
        <Link to="/about" className="row">
          <Shield size={20} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1 text-[16px] font-extrabold">Datenschutz & Impressum</span>
          <Right size={13} className="text-muted" />
        </Link>
      </div>
      </div>
      </div>
    </div>
  )
}
