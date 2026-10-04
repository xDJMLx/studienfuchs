import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { goalInfo, levelFromXp } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
import { Coin, Flame, Gear, Shield, TabRepeat, TabSubjects, TabUser, Xp } from './Icons'
import { Sheet } from './Sheet'
import { dayKey } from '../../lib/streak'
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
  /** Farbe des Bereichs (aktiver Tab, Seitenleiste) */
  c: string
  t: string
}

// Fünf feste Tabs, kein "Mehr": Alles Wichtige ist immer mit einem Tipp erreichbar (Grammatik und Wörter im Üben-Tab,
// Einstellungen über das Profil). Fuchs anpassen und Shop liegen im Profil.
const NAV: NavItem[] = [
  { to: '/', label: 'Üben', Icon: TabRepeat, end: true, c: 'var(--brand)', t: 'var(--brand-text)' },
  { to: '/faecher', label: 'Fächer', Icon: TabSubjects, c: 'var(--sky)', t: 'var(--sky-text)' },
  { to: '/profile', label: 'Profil', Icon: TabUser, c: 'var(--violet)', t: 'var(--violet-text)' },
]

/** Zu welchem Tab eine Seite gehört (damit er auch auf Unterseiten wie dem Kalender markiert bleibt). */
function tabOf(path: string): string {
  if (path.startsWith('/faecher') || path.startsWith('/stapel') || path.startsWith('/books') || path.startsWith('/exam')) return '/faecher'
  if (path.startsWith('/profile') || path.startsWith('/shop') || path.startsWith('/settings') || path.startsWith('/about')) return '/profile'
  return '/'
}

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
  const nav = NAV
  // Auf KI-Seiten (auch die Fächer-Chats) sitzt das Eingabefeld in der Tab-Leiste
  const onCoach = location.pathname.startsWith('/coach') || /^\/faecher\/[^/]+\/ki/.test(location.pathname)
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
          {nav.map(({ to, label, Icon, end, c, t }) => (
            <NavLink key={to} to={to} end={end} style={{ '--nav-c': c, '--nav-t': t } as React.CSSProperties} className={() => `nav-link press relative ${tabOf(location.pathname) === to ? 'nav-link-active' : ''}`}>
              {() => (
                <>
                  <span className="relative flex w-full items-center gap-4">
                    <Icon size={26} />
                    {label}
                    {to === '/' && dueCount > 0 && <DueBadge n={dueCount} className="ml-auto" />}
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
          tabs={nav.map(({ to, label, Icon, c, t }) => ({
            key: to,
            label,
            color: c,
            textColor: t,
            icon: <Icon size={26} />,
            badge: to === '/' && dueCount > 0 ? <DueBadge n={dueCount} className="absolute -right-3 -top-1.5" /> : undefined,
          }))}
          activeIndex={nav.findIndex((n) => tabOf(location.pathname) === n.to)}
          onSelect={(i) => {
            const to = nav[i].to
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
      aria-label={`${n} fällig`}
    >
      {n > 99 ? '99+' : n}
    </motion.span>
  )
}

/** Kopfzeile auf dem Handy: Kurs links, rechts Serie, XP von heute und Münzen als kräftige Zahlen. */
function TopBar({ className = '' }: { className?: string }) {
  const { streak, xpByDay, dailyGoal, coins } = useStore(useShallow((s) => ({ streak: s.streak, xpByDay: s.xpByDay, dailyGoal: s.dailyGoal, coins: s.coins })))
  const [streakOpen, setStreakOpen] = useState(false)
  const s = streakNow(streak)
  const today = xpToday(xpByDay)
  // Die Flamme brennt erst, wenn heute schon gelernt wurde (wie eine Kerze, die man jeden Tag neu anzündet)
  const lit = streak.lastDay === dayKey()
  const stat = 'press flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[16px] font-extrabold tabular-nums transition-colors hover:bg-snow'
  return (
    <header className={`flex items-center justify-between border-b-2 border-line bg-page px-3 py-1.5 ${className}`}>
      <Link to="/" aria-label="Zur Startseite" className="press flex items-center gap-2 rounded-xl px-1.5 py-1">
        <Mascot size={32} />
        <span className="hidden text-[19px] min-[360px]:inline font-black tracking-tight text-brand">Studienfuchs</span>
      </Link>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => setStreakOpen(true)} className={`${stat} ${lit ? 'text-fox-dark' : 'text-muted'}`} aria-label={`${s} Tage Serie${lit ? ', heute gesichert' : ', heute noch nicht gelernt'}`} title="Serie">
          <Flame size={24} className={lit ? '' : 'opacity-50 grayscale'} />
          {s}
        </button>
        <Link to="/profile" className={`${stat} text-gold-dark`} aria-label={`Heute ${today} von ${goalInfo(dailyGoal, today).goal} XP`} title="XP heute">
          <Xp size={24} />
          <motion.span key={today} initial={{ scale: 1.5, y: -2 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
            {today}
          </motion.span>
        </Link>
        <Link to="/shop" className={`${stat} text-gold-dark`} aria-label={`${coins} Münzen, zum Fuchs-Laden`} title="Münzen">
          <Coin size={24} />
          <motion.span key={coins} initial={{ scale: 1.5, y: -2 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
            {coins}
          </motion.span>
        </Link>
      </div>
      <StreakSheet open={streakOpen} onClose={() => setStreakOpen(false)} />
    </header>
  )
}

/** Serien-Fenster: große Flamme, die Woche, Schutz und was heute zu tun ist. */
function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const streak = useStore((s) => s.streak)
  const n = streakNow(streak)
  const lit = streak.lastDay === dayKey()
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2">
          <motion.span animate={lit ? { scale: [1, 1.12, 1] } : undefined} transition={{ duration: 1.4, repeat: Infinity }}>
            <Flame size={64} className={lit ? '' : 'opacity-50 grayscale'} />
          </motion.span>
          <span className={`text-[56px] font-black leading-none tabular-nums ${lit ? 'text-fox-dark' : 'text-muted'}`}>{n}</span>
        </div>
        <h2 className="mt-2 text-[22px] font-extrabold">{lit ? 'Heute gesichert!' : n > 0 ? 'Deine Serie wartet' : 'Starte deine Serie'}</h2>
        <p className="mt-1 max-w-xs text-muted">
          {lit ? `Morgen weiterlernen, dann sind es ${n + 1} Tage.` : n > 0 ? `Lerne heute eine Lektion, dann wächst deine Serie auf ${n + 1} Tage.` : 'Eine Lektion heute, und die Flamme brennt.'}
        </p>
        <div className="mt-5 w-full max-w-xs">
          <WeekStrip />
        </div>
        <p className="mt-5 flex items-center gap-2 rounded-2xl bg-sky-soft px-4 py-2.5 text-left text-sm font-bold text-sky-dark">
          <Shield size={20} />
          <span>
            {streak.freezes > 0 ? `${streak.freezes} Serien-Schutz bereit: Verpasst du einen Tag, springt er ein.` : 'Kein Serien-Schutz übrig. Jede Woche gibt es einen neuen.'}
          </span>
        </p>
        <button
          type="button"
          className="btn btn-primary press mt-5 w-full sm:w-64"
          autoFocus
          onClick={() => {
            onClose()
            if (!lit) navigate('/')
          }}
        >
          {lit ? 'Super' : 'Jetzt lernen'}
        </button>
      </div>
    </Sheet>
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
