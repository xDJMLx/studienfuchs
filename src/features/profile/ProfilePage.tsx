import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { COURSE_STATS } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { IconChip } from '../../components/ui/controls'
import { Bolt, Book, Check, Flame, Gear, Right, Shield, Trophy } from '../../components/ui/Icons'
import { CountUp, EASE, Item, ItemLi, Stagger, StaggerList, SPRING } from '../../components/ui/motion'
import { ProgressBar, ProgressRing, SegmentedBar } from '../../components/ui/widgets'
import { achievements } from '../../lib/achievements'
import { dayKey } from '../../lib/streak'
import { goalInfo, levelFromXp } from '../../lib/xp'
import { streakNow, useStore } from '../../store/useStore'
import { useLearned } from '../review/ReviewPage'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const HEAT_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const TITLES = ['Fuchsjunges', 'Neugieriger Fuchs', 'Wortsammler', 'Vokabelprofi', 'Sprachfuchs', 'Grammatikmeister', 'Studienfuchs-Legende']
const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))]

/** Alle Wörter des Kurses (einmal gezählt), Grundlage für den Wortschatz-Balken. */
const COURSE_WORDS = COURSE_STATS.words

export function ProfilePage() {
  const reduce = useReducedMotion()
  const { xp, xpByDay, streak, dailyGoal, lessons, sets } = useStore()
  const { learned, byMastery } = useLearned()
  const lvl = levelFromXp(xp)
  const streakDays = streakNow(streak)
  const todayXp = xpByDay[dayKey()] ?? 0

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { key: dayKey(d), label: WEEKDAYS[d.getDay()] }
  })
  const maxXp = Math.max(dailyGoal, ...days.map((d) => xpByDay[d.key] ?? 0))
  const weekXp = days.reduce((n, d) => n + (xpByDay[d.key] ?? 0), 0)
  const goalDays = Object.values(xpByDay).filter((v) => v >= dailyGoal).length

  // Letzte fünf Wochen als Raster (Montag bis Sonntag)
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const heat = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() - 28 + i)
    const key = dayKey(d)
    return { key, v: xpByDay[key] ?? 0, future: d > today, label: d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) }
  })
  const activeDays = heat.filter((h) => h.v > 0).length

  const learning = byMastery[0]
  const mastered = byMastery[1]
  const unseen = Math.max(0, COURSE_WORDS - learned.length)

  const badges = achievements({
    lessons: Object.keys(lessons).length,
    streak: streakDays,
    xp,
    learnedWords: learned.length,
    masteredWords: mastered,
    sets: sets.length,
    goalDays,
  })
  const unlocked = badges.filter((b) => b.value >= b.goal).length

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 lg:pt-8">
      <Stagger stagger={0.09}>
        {/* Kopfbereich */}
        <Item>
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-[#f7872c] to-[#ffb25e] p-6 text-white shadow-[0_18px_40px_-22px_rgba(242,105,15,0.8)]">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full bg-white/15 blur-sm" />
            <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-white/10" />
            <Link to="/settings" aria-label="Einstellungen" className="press absolute right-4 top-4 rounded-xl bg-white/20 p-2.5 transition-colors hover:bg-white/30">
              <Gear size={20} />
            </Link>

            <div className="relative flex items-center gap-5">
              <ProgressRing pct={lvl.into / lvl.needed} size={108} stroke={7} color="#fff" track="rgba(255,255,255,0.28)">
                <motion.span initial={reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SPRING.bouncy, delay: 0.2 }} className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white">
                  <Mascot size={66} blink />
                </motion.span>
              </ProgressRing>
              <div className="min-w-0 flex-1 pr-8">
                <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold">Level {lvl.level}</span>
                <h1 className="mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">{titleFor(lvl.level)}</h1>
                <p className="mt-0.5 text-sm text-white/90">
                  <CountUp to={xp} /> XP gesamt
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-white/90">
                <span>Noch {lvl.needed - lvl.into} XP bis Level {lvl.level + 1}</span>
                <span>{lvl.into} / {lvl.needed}</span>
              </div>
              <ProgressBar pct={lvl.into / lvl.needed} color="bg-white" className="!bg-white/25" delay={0.3} />
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold"><Flame size={16} /> {streakDays} {streakDays === 1 ? 'Tag' : 'Tage'} Serie</span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold"><Bolt size={16} /> Heute {todayXp} / {goalInfo(dailyGoal, todayXp).goal} XP</span>
            </div>
          </section>
        </Item>

        {/* Zahlen */}
        <Item>
          <StaggerList className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" stagger={0.06} delay={0.15}>
            <Stat icon={<Flame size={22} />} tone="brand" value={streakDays} label="Tage Serie" />
            <Stat icon={<Bolt size={22} />} tone="gold" value={xp} label="XP gesamt" />
            <Stat icon={<Book size={22} />} tone="brand" value={Object.keys(lessons).length} label="Lektionen" />
            <Stat icon={<Check size={20} />} tone="good" value={mastered} label={`gefestigt von ${learned.length}`} />
          </StaggerList>
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
                        transition={{ duration: 0.8, ease: EASE, delay: 0.25 + i * 0.07 }}
                        style={{ opacity: v ? 1 : 0.25 }}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${d.key === dayKey() ? 'text-brand-dark' : 'text-muted'}`}>{d.label}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-muted">Grün: Tagesziel von {dailyGoal} XP erreicht.</p>

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Letzte fünf Wochen</h3>
                <span className="text-xs text-muted">{activeDays} aktive Tage</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {HEAT_DAYS.map((d) => (
                  <span key={d} className="text-center text-[10px] font-medium uppercase text-muted">{d}</span>
                ))}
                {heat.map((h, i) => {
                  const level = h.v <= 0 ? 0 : h.v < dailyGoal / 2 ? 1 : h.v < dailyGoal ? 2 : 3
                  const bg = ['bg-snow', 'bg-brand/25', 'bg-brand/55', 'bg-brand'][level]
                  return (
                    <motion.span
                      key={h.key}
                      title={`${h.label}: ${h.v} XP`}
                      initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ ...SPRING.snappy, delay: i * 0.012 }}
                      className={`aspect-square rounded-md ${h.future ? 'border border-dashed border-line' : bg}`}
                    />
                  )
                })}
              </div>
            </div>
          </section>
        </Item>

        {/* Wortschatz */}
        <Item>
          <section className="card mt-4 p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-semibold">Dein Wortschatz</h2>
              <span className="flex items-center gap-3 text-sm text-muted">
                <span><span className="font-semibold text-ink"><CountUp to={learned.length} /></span> von {COURSE_WORDS}</span>
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

        {/* Erfolge */}
        <Item>
          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-lg font-semibold">Erfolge</h2>
              <span className="text-sm text-muted"><span className="font-semibold text-ink">{unlocked}</span> von {badges.length}</span>
            </div>
            <StaggerList className="grid gap-3 sm:grid-cols-2" stagger={0.05}>
              {badges.map((b) => {
                const done = b.value >= b.goal
                return (
                  <ItemLi key={b.id} className={`card relative flex items-center gap-4 overflow-hidden p-4 ${done ? 'ring-1 ring-brand/30' : ''}`}>
                    {done && <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/10" />}
                    <ProgressRing pct={b.value / b.goal} size={56} stroke={5} color={done ? 'var(--good)' : 'var(--brand)'}>
                      {done ? (
                        <motion.span initial={reduce ? false : { scale: 0, rotate: -40 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ ...SPRING.bouncy, delay: 0.3 }} className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#ffb25e] text-white">
                          <Trophy size={18} />
                        </motion.span>
                      ) : (
                        <span className="text-xs font-bold text-muted">{Math.round((b.value / b.goal) * 100)}%</span>
                      )}
                    </ProgressRing>
                    <div className="relative min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{b.title}</p>
                      <p className="text-sm text-muted">{b.description}</p>
                      <p className={`mt-1 text-xs font-semibold ${done ? 'text-good-dark' : 'text-muted'}`}>{done ? 'Geschafft' : `${b.value} / ${b.goal}`}</p>
                    </div>
                  </ItemLi>
                )
              })}
            </StaggerList>
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

function Stat({ icon, tone, value, label }: { icon: React.ReactNode; tone: 'brand' | 'gold' | 'good'; value: number; label: string }) {
  return (
    <ItemLi className="card p-4">
      <IconChip tone={tone} size={36}>{icon}</IconChip>
      <div className="mt-3 text-2xl font-bold leading-none"><CountUp to={value} /></div>
      <div className="mt-1 text-xs font-medium text-muted">{label}</div>
    </ItemLi>
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
