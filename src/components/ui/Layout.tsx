import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { goalInfo, levelFromXp } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
import { CourseChip } from './CoursePicker'
import { Coin, Flame, Gear, TabBooks, TabHome, TabKi, TabRepeat, TabUser, Xp } from './Icons'
import { EASE } from './motion'
import { useCoachComposer } from '../../lib/coachComposer'
import { CoachComposer } from './CoachComposer'
import { TabBar } from './TabBar'
import { useDue } from '../../features/review/ReviewPage'
import { ProgressBar, WeekStrip } from './widgets'
import { TodayCard } from '../../features/path/TodayCard'
import { useShallow } from 'zustand/react/shallow'

interface NavItem {
  to: string
  label: string
  Icon: (p: { size?: number }) => React.ReactNode
  end?: boolean
}

// Fünf feste Tabs, kein "Mehr": Alles Wichtige ist immer mit einem Tipp erreichbar (Grammatik und Wörter im Üben-Tab,
// Einstellungen über das Profil). Fuchs anpassen und Shop liegen im Profil.
const NAV: NavItem[] = [
  { to: '/', label: 'Lernen', Icon: TabHome, end: true },
  { to: '/practice', label: 'Üben', Icon: TabRepeat },
  { to: '/coach', label: 'KI', Icon: TabKi },
  { to: '/books', label: 'Bücher', Icon: TabBooks },
  { to: '/profile', label: 'Profil', Icon: TabUser },
]

export function Wordmark({ size = 'md', tone = 'default' }: { size?: 'md' | 'lg'; tone?: 'default' | 'light' }) {
  return (
    <span className={`flex items-center gap-2.5 font-black tracking-tight ${tone === 'light' ? 'text-white' : 'text-brand'} ${size === 'lg' ? 'text-[32px]' : 'text-[24px]'}`}>
      <Mascot size={size === 'lg' ? 46 : 32} />
      Studienfuchs
    </span>
  )
}

/**
 * Seitenübergang: die neue Seite steigt sanft ein. Bewusst ohne Ausblenden der alten Seite,
 * damit nie eine leere Zwischenphase entsteht und jeder Klick sofort wirkt.
 */
function AnimatedOutlet() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  return (
    <motion.div key={pathname} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.14, ease: EASE }}>
      {outlet}
    </motion.div>
  )
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLElement>(null)
  const dueCount = useDue().due.length
  const onCoach = location.pathname.startsWith('/coach')
  const hasPages = useCoachComposer((c) => c.pages.length > 0)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex h-full bg-page" style={onCoach ? ({ '--tabbar-h': `calc(${hasPages ? '13rem' : '9rem'} + env(safe-area-inset-bottom, 0px))` } as React.CSSProperties) : undefined}>
      <button
        type="button"
        onClick={() => scroller.current?.focus()}
        className="sr-only z-[60] rounded-xl bg-surface px-4 py-2 font-semibold shadow-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Zum Inhalt springen
      </button>
      {/* Seitenleiste (Desktop) */}
      <aside className="hidden w-[256px] shrink-0 flex-col border-r-2 border-line bg-surface px-4 py-6 lg:flex">
        <Link to="/" className="mb-7 px-2" aria-label="Zur Startseite">
          <Wordmark />
        </Link>
        <nav className="grid gap-1" aria-label="Hauptnavigation">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link press relative ${isActive ? 'nav-link-active' : ''}`}>
              {() => (
                <>
                  <span className="relative flex w-full items-center gap-4">
                    <Icon size={26} />
                    {label}
                    {to === '/practice' && dueCount > 0 && <DueBadge n={dueCount} className="ml-auto" />}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={({ isActive }) => `nav-link press mt-auto ${isActive ? 'nav-link-active' : ''}`}>
          <Gear size={26} />
          Einstellungen
        </NavLink>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar className="lg:hidden" />
        <main ref={scroller} tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--tabbar-h)+1rem)] outline-none lg:pb-10">
          <div className="mx-auto flex max-w-[1040px] justify-center gap-8 px-0 lg:px-8">
            <div className="min-w-0 flex-1">
              <AnimatedOutlet />
            </div>
            <aside className="hidden w-[320px] shrink-0 pt-6 xl:block">
              <div className="sticky top-6">
                <RightRail />
              </div>
            </aside>
          </div>
        </main>

        {/* Tab-Leiste (Mobil): schwebende Glas-Kapsel mit ziehbarer Linse */}
        <TabBar
          extra={onCoach ? <CoachComposer /> : undefined}
          tabs={NAV.map(({ to, label, Icon }) => ({
            key: to,
            label,
            icon: <Icon size={26} />,
            badge: to === '/practice' && dueCount > 0 ? <DueBadge n={dueCount} className="absolute -right-3 -top-1.5" /> : undefined,
          }))}
          activeIndex={NAV.findIndex((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) || (n.to === '/profile' && location.pathname.startsWith('/shop'))))}
          onSelect={(i) => {
            const to = NAV[i].to
            // Zweiter Tipp auf den aktiven Tab: nach oben scrollen (wie bei iOS-Apps)
            if (location.pathname === to) scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
            else navigate(to)
          }}
        />
      </div>
    </div>
  )
}

/** Kleine Zahl: so viele Wörter sind gerade zur Wiederholung fällig. */
function DueBadge({ n, className = '' }: { n: number; className?: string }) {
  return (
    <motion.span
      key={n}
      initial={{ scale: 0.4 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 14 }}
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-strong px-1 text-[11px] font-bold leading-none text-on-brand ${className}`}
      aria-label={`${n} Wörter fällig`}
    >
      {n > 99 ? '99+' : n}
    </motion.span>
  )
}

/** Kopfzeile auf dem Handy: Kurs links, rechts Serie, XP von heute und Münzen als kräftige Zahlen. */
function TopBar({ className = '' }: { className?: string }) {
  const { streak, xpByDay, dailyGoal, coins } = useStore(useShallow((s) => ({ streak: s.streak, xpByDay: s.xpByDay, dailyGoal: s.dailyGoal, coins: s.coins })))
  const s = streakNow(streak)
  const today = xpToday(xpByDay)
  const stat = 'press flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[16px] font-extrabold tabular-nums transition-colors hover:bg-snow'
  return (
    <header className={`flex items-center justify-between border-b-2 border-line bg-page px-3 py-1.5 ${className}`}>
      <CourseChip />
      <div className="flex items-center gap-0.5">
        <Link to="/profile" className={`${stat} ${s > 0 ? 'text-fox-dark' : 'text-muted'}`} aria-label={`${s} Tage Serie, Profil öffnen`} title="Serie">
          <Flame size={24} className={s > 0 ? '' : 'grayscale opacity-60'} />
          {s}
        </Link>
        <Link to="/profile" className={`${stat} text-gold-dark`} aria-label={`Heute ${today} von ${goalInfo(dailyGoal, today).goal} XP`} title="XP heute">
          <Xp size={24} />
          {today}
        </Link>
        <Link to="/shop" className={`${stat} text-gold-dark`} aria-label={`${coins} Münzen, zum Fuchs-Laden`} title="Münzen">
          <Coin size={24} />
          {coins}
        </Link>
      </div>
    </header>
  )
}

export function RightRail() {
  const { streak, xp } = useStore(useShallow((s) => ({ streak: s.streak, xp: s.xp })))
  const s = streakNow(streak)
  const lvl = levelFromXp(xp)
  return (
    <div className="grid gap-4">
      <TodayCard />
      <Link to="/profile" className="card lift block p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[20px] font-extrabold"><Flame size={28} />{s} {s === 1 ? 'Tag' : 'Tage'} Serie</p>
        </div>
        <WeekStrip />
      </Link>
      <Link to="/profile" className="card lift block p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[18px] font-extrabold">Level {lvl.level}</p>
          <p className="text-sm font-bold text-muted">{lvl.into} / {lvl.needed} XP</p>
        </div>
        <ProgressBar pct={lvl.into / lvl.needed} color="bg-gold" className="!h-3" />
      </Link>
    </div>
  )
}
