import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { goalInfo, levelFromXp } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
import { CourseChip } from './CoursePicker'
import { Camera, Coin, Flame, Gear, TabBooks, TabHome, TabKi, TabRepeat, TabUser, Trophy, Xp } from './Icons'
import { EASE } from './motion'
import { useCoachComposer } from '../../lib/coachComposer'
import { CoachComposer } from './CoachComposer'
import { TabBar } from './TabBar'
import { useDue } from '../../features/review/ReviewPage'
import { ProgressBar, ProgressRing, WeekStrip } from './widgets'

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
    <span className={`flex items-center gap-2.5 font-bold tracking-tight ${tone === 'light' ? 'text-white' : 'text-ink'} ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
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
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link to="/" className="mb-7 px-2" aria-label="Zur Startseite">
          <Wordmark />
        </Link>
        <nav className="grid gap-1" aria-label="Hauptnavigation">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link press relative ${isActive ? 'text-brand-dark' : ''}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className="relative flex items-center gap-3.5">
                    <Icon size={22} />
                    {label}
                    {to === '/practice' && dueCount > 0 && <DueBadge n={dueCount} className="ml-auto" />}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={({ isActive }) => `nav-link press mt-auto ${isActive ? 'text-brand-dark' : ''}`}>
          <Gear size={22} />
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

/** Kopfzeile auf dem Handy: Kurs links, Serie und XP rechts (antippen öffnet das Profil). */
function TopBar({ className = '' }: { className?: string }) {
  const { streak, xpByDay, dailyGoal, coins } = useStore()
  const s = streakNow(streak)
  const today = xpToday(xpByDay)
  return (
    <header className={`flex items-center justify-between border-b border-line bg-surface px-3 py-2 ${className}`}>
      <CourseChip />
      <div className="flex items-center">
        <Link to="/profile" className="press flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold transition-colors hover:bg-snow" aria-label="Profil öffnen">
          <span className="flex items-center gap-1 text-fox-dark" title="Serie"><Flame size={20} />{s}</span>
          <span className="flex items-center gap-1 text-gold-dark" title="Heute gesammelte XP"><Xp size={20} />{today}/{goalInfo(dailyGoal, today).goal}</span>
        </Link>
        <Link to="/shop" className="press flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-gold-dark transition-colors hover:bg-snow" aria-label={`${coins} Münzen, zum Fuchs-Laden`} title="Münzen">
          <Coin size={20} />{coins}
        </Link>
      </div>
    </header>
  )
}

export function RightRail() {
  const { streak, xp, xpByDay, dailyGoal } = useStore()
  const s = streakNow(streak)
  const lvl = levelFromXp(xp)
  const today = xpToday(xpByDay)
  const g = goalInfo(dailyGoal, today)
  const goalPct = g.pct
  const card = 'card lift block p-5'
  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/profile" className="group">
            <p className="eyebrow">Serie</p>
            <p className="flex items-center gap-1.5 text-2xl font-bold transition-colors group-hover:text-brand-dark"><Flame size={26} />{s} {s === 1 ? 'Tag' : 'Tage'}</p>
          </Link>
          <CourseChip />
        </div>
        <WeekStrip />
      </div>

      <Link to="/settings" className={`${card} flex items-center gap-4`} aria-label="Tagesziel anpassen">
        <ProgressRing pct={goalPct} size={72} color="var(--gold)">
          <Xp size={26} />
        </ProgressRing>
        <div>
          <p className="eyebrow">{g.baseReached ? 'Bonusziel' : 'Tagesziel'}</p>
          <p className="text-xl font-bold">{today} / {g.goal} XP</p>
          <p className="text-sm text-muted">{g.baseReached ? `Mindestziel geschafft${g.tier > 1 ? `, Bonus ${g.tier - 1}` : ''}` : `Noch ${g.goal - today} XP`}</p>
        </div>
      </Link>

      <Link to="/profile" className={card}>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="eyebrow">Level</p>
          <p className="text-sm text-muted">{lvl.into} / {lvl.needed} XP</p>
        </div>
        <p className="mb-3 text-xl font-bold">Level {lvl.level}</p>
        <ProgressBar pct={lvl.into / lvl.needed} />
      </Link>

      <Link to="/books" className={`${card} group flex items-center gap-4`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark transition-transform group-hover:scale-105">
          <Camera size={24} />
        </span>
        <span>
          <span className="block font-semibold">Deine Bücher</span>
          <span className="block text-sm text-muted">Seiten fotografieren, die KI kennt dein Buch.</span>
        </span>
      </Link>

      <Link to="/practice" className={`${card} flex items-center gap-4`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-snow text-muted"><Trophy size={24} /></span>
        <span>
          <span className="block font-semibold">Frei üben</span>
          <span className="block text-sm text-muted">Karteikarten, Schreiben, Hören.</span>
        </span>
      </Link>
    </div>
  )
}
