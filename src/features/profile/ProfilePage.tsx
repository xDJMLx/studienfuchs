import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { IconChip } from '../../components/ui/controls'
import { Check, Coin, Gear, Right, Shield, Star, Trophy, Xp } from '../../components/ui/Icons'
import { CountUp, EASE, Item, Stagger } from '../../components/ui/motion'
import { ProgressRing, SegmentedBar } from '../../components/ui/widgets'
import { achievements } from '../../lib/achievements'
import { dayKey } from '../../lib/streak'
import { levelFromXp } from '../../lib/xp'
import { useStore } from '../../store/useStore'
import { deckAchievementStats } from '../../lib/progress'
import { useCourse, useLearned } from '../review/ReviewPage'
import { Karteikasten, WeeklyReport } from './ProfileExtras'
import { useShallow } from 'zustand/react/shallow'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const TITLES = ['Fuchsjunges', 'Neugieriger Fuchs', 'Wortsammler', 'Vokabelprofi', 'Sprachfuchs', 'Grammatikmeister', 'Studienfuchs-Legende']
const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))]


export function ProfilePage() {
  const reduce = useReducedMotion()
  const { xp, xpByDay, dailyGoal, lessons, rounds, sets, outfit, coins, addedUnits, arbeiten, cards } = useStore(useShallow((s) => ({ xp: s.xp, xpByDay: s.xpByDay, dailyGoal: s.dailyGoal, lessons: s.lessons, rounds: s.rounds, sets: s.sets, outfit: s.outfit, coins: s.coins, addedUnits: s.addedUnits, arbeiten: s.arbeiten, cards: s.cards })))
  const { learned, byMastery } = useLearned()
  const course = useCourse()
  const lvl = levelFromXp(xp)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { key: dayKey(d), label: WEEKDAYS[d.getDay()] }
  })
  const maxXp = Math.max(dailyGoal, ...days.map((d) => xpByDay[d.key] ?? 0))
  const weekXp = days.reduce((n, d) => n + (xpByDay[d.key] ?? 0), 0)
  const goalDays = Object.values(xpByDay).filter((v) => v >= dailyGoal).length

  const learning = byMastery[0]
  const mastered = byMastery[1]
  const unseen = Math.max(0, course.total - learned.length)

  const badges = achievements({
    lessons: (rounds ?? 0) + Object.keys(lessons).length,
    xp,
    learnedWords: learned.length,
    masteredWords: mastered,
    sets: sets.length,
    goalDays,
    ...deckAchievementStats({ sets, addedUnits, arbeiten, cards }),
  })
  const unlocked = badges.filter((b) => b.value >= b.goal).length

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 lg:pt-8">
      <Stagger stagger={0.09}>
        {/* Kopfbereich: flacher Markenblock, der Fuchs schaut herein */}
        <Item>
          <section className="relative overflow-hidden rounded-[22px] bg-brand-strong p-5 pr-32 text-on-brand shadow-[0_5px_0_var(--shade-brand)]">
            <Link to="/settings" aria-label="Einstellungen" className="press absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-on-brand/90 hover:bg-white/15">
              <Gear size={22} />
            </Link>
            <p className="text-sm font-medium opacity-85">Level {lvl.level}</p>
            <h1 className="mt-0.5 text-[30px] font-black leading-[1.05]">{titleFor(lvl.level)}</h1>
            <p className="mt-1 text-[15px] opacity-90">
              <CountUp to={xp} /> XP gesamt
            </p>
            <div className="mt-4 h-3 w-full max-w-[15rem] overflow-hidden rounded-full bg-black/15" role="progressbar" aria-valuemin={0} aria-valuemax={lvl.needed} aria-valuenow={lvl.into} aria-label={`Fortschritt zu Level ${lvl.level + 1}`}>
              <motion.div className="h-full rounded-full bg-white" initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(3, (lvl.into / lvl.needed) * 100)}%` }} transition={{ duration: 0.6, ease: EASE, delay: 0.15 }} />
            </div>
            <p className="mt-1.5 text-sm opacity-85">
              Noch {lvl.needed - lvl.into} XP bis Level {lvl.level + 1}
            </p>
            <Mascot size={140} alive listen outfit={outfit} className="absolute -bottom-5 -right-3" />
          </section>
        </Item>

        {/* Fuchs anpassen und Shop */}
        <Item>
          <Link to="/shop" className="card lift mt-4 flex items-center gap-3.5 px-4 py-3.5">
            <Coin size={26} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Fuchs und Shop</span>
              <span className="block text-sm text-muted">Du hast {coins} {coins === 1 ? 'Münze' : 'Münzen'} zum Ausgeben</span>
            </span>
            <Right size={16} className="shrink-0 text-muted" />
          </Link>
        </Item>

        {/* Statistik als Kacheln: Symbol, große Zahl, kurze Bezeichnung */}
        <Item>
          <h2 className="mb-3 mt-6 px-1 text-[20px] font-extrabold">Statistik</h2>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { k: 'XP gesamt', v: xp.toLocaleString('de-DE'), icon: <Xp size={26} /> },
              { k: 'Arbeiten geschafft', v: String((arbeiten ?? []).filter((a) => a.done).length), icon: <Trophy size={26} /> },
              { k: 'Runden', v: String((rounds ?? 0) + Object.keys(lessons).length), icon: <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-sky text-white"><Check size={15} /></span> },
              { k: 'Karten gefestigt', v: String(mastered), icon: <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-good text-white"><Star size={15} /></span> },
            ].map(({ k, v, icon }) => (
              <div key={k} className="card flex items-center gap-3 px-3.5 py-3">
                <span className="shrink-0">{icon}</span>
                <div className="min-w-0">
                  <dd className="truncate text-[19px] font-extrabold leading-tight tabular-nums">{v}</dd>
                  <dt className="truncate text-[13px] text-muted">{k}</dt>
                </div>
              </div>
            ))}
          </dl>
        </Item>

        {/* Aktivität */}
        <Item>
          <section className="card mt-4 p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-semibold">Diese Woche</h2>
              <span className="text-sm text-muted"><span className="font-semibold text-ink">{weekXp}</span> XP</span>
            </div>
            <div className="flex h-36 items-end gap-2.5" role="img" aria-label="XP der letzten 7 Tage">
              {days.map((d, i) => {
                const v = xpByDay[d.key] ?? 0
                const hit = v >= dailyGoal
                return (
                  <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${v} XP`}>
                    <span className={`text-[11px] font-semibold ${v ? 'text-ink' : 'text-transparent'}`}>{v || 0}</span>
                    <div className="flex w-full flex-1 items-end">
                      <motion.div
                        className={`w-full rounded-lg ${hit ? 'bg-good' : 'bg-brand'}`}
                        initial={reduce ? false : { height: 0 }}
                        animate={{ height: `${Math.max((v / maxXp) * 100, v ? 5 : 2)}%` }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.04 }}
                        style={{ opacity: v ? 1 : 0.25 }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${d.key === dayKey() ? 'text-brand-dark' : 'text-muted'}`}>{d.label}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-muted">Grün: Tagesziel von {dailyGoal} XP erreicht.</p>

          </section>
        </Item>

        {/* Wortschatz */}
        <Item>
          <section className="card mt-4 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="font-semibold">Deine Karten</h2>
              <span className="flex items-center gap-3 whitespace-nowrap text-sm text-muted">
                <span><span className="font-semibold text-ink"><CountUp to={learned.length} /></span> von {course.total}</span>
                <Link to="/review" className="press flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-brand-dark hover:bg-brand-soft">Lernstand <Right size={12} /></Link>
              </span>
            </div>
            <SegmentedBar
              height="h-4"
              parts={[
                { value: mastered, color: 'bg-good', label: 'Gefestigt' },
                { value: learning, color: 'bg-brand', label: 'Lernend' },
                { value: unseen, color: 'bg-line', label: 'Noch nicht gesehen' },
              ]}
            />
            <ul className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Legend dot="bg-good" label="Gefestigt" value={mastered} />
              <Legend dot="bg-brand" label="Lernend" value={learning} />
              <Legend dot="bg-line" label="Noch offen" value={unseen} />
            </ul>
          </section>
        </Item>

        {/* Karteikasten, Wochenbericht */}
        <Item>
          <Karteikasten />
          <WeeklyReport />
        </Item>

        {/* Erfolge */}
        <Item>
          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-[20px] font-extrabold">Erfolge</h2>
              <span className="text-sm text-muted"><span className="font-semibold text-ink">{unlocked}</span> von {badges.length}</span>
            </div>
            <ul className="grid grid-cols-3 gap-2.5">
              {badges.map((b) => {
                const done = b.value >= b.goal
                return (
                  <li key={b.id} className="card flex flex-col items-center px-2 pb-3 pt-3.5 text-center" title={b.description}>
                    {done ? (
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-white" style={{ boxShadow: '0 4px 0 var(--shade-gold)' }}>
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
          </section>
        </Item>

        <Item>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/settings" className="card lift flex items-center gap-3 p-4">
              <IconChip tone="muted"><Gear size={20} /></IconChip>
              <span className="min-w-0 flex-1 font-semibold">Einstellungen</span>
              <Right size={16} className="text-muted" />
            </Link>
            <Link to="/about" className="card lift flex items-center gap-3 p-4">
              <IconChip tone="muted"><Shield size={20} /></IconChip>
              <span className="min-w-0 flex-1 font-semibold">Datenschutz & Impressum</span>
              <Right size={16} className="text-muted" />
            </Link>
          </div>
        </Item>
      </Stagger>
    </div>
  )
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <li>
      <div className="flex items-center gap-1.5 text-muted"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</div>
      <div className="text-xl font-bold"><CountUp to={value} /></div>
    </li>
  )
}
