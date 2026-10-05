import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { levelFromXp } from '../../lib/xp'
import { useStore } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
import { Coin, Gear, TabCalendar, TabRepeat, TabUser, Xp } from './Icons'
import { useCoachComposer } from '../../lib/coachComposer'
import { CoachComposer } from './CoachComposer'
import { TabBar } from './TabBar'
import { useDue } from '../../features/review/ReviewPage'
import { ProgressBar } from './widgets'
import { StudyTimeCard } from './StudyTime'
import { autoSyncUntis } from '../../lib/untisSync'
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

// Drei feste Tabs: Üben (Karteikarten, alle Fächer), Kalender (Arbeiten und Tests) und Profil (Stand, Fuchs, Einstellungen).
// Die Fächer wählt man beim Start und ändert sie in den Einstellungen.
const NAV: NavItem[] = [
  { to: '/', label: 'Üben', Icon: TabRepeat, end: true, c: 'var(--brand)', t: 'var(--brand-text)' },
  { to: '/kalender', label: 'Kalender', Icon: TabCalendar, c: 'var(--sky)', t: 'var(--sky-text)' },
  { to: '/profile', label: 'Profil', Icon: TabUser, c: 'var(--violet)', t: 'var(--violet-text)' },
]

/** Zu welchem Tab eine Seite gehört (damit er auch auf Unterseiten wie dem Kalender markiert bleibt). */
function tabOf(path: string): string {
  if (path.startsWith('/kalender')) return '/kalender'
  if (path.startsWith('/profile') || path.startsWith('/shop') || path.startsWith('/settings') || path.startsWith('/about')) return '/profile'
  return '/'
}

/** Position des Tabs, zu dem eine Adresse gehört (für die Richtung des Seitenwechsels). */
const tabIndex = (path: string): number => Math.max(0, NAV.findIndex((n) => n.to === tabOf(path)))

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
  // Richtung: Wechsel zwischen Tabs schiebt die Seite von der Seite herein (nach rechts → von rechts), alles andere hebt sich sanft.
  const last = useRef(pathname)
  const from = tabIndex(last.current)
  const to = tabIndex(pathname)
  const dir = pathname === last.current ? 0 : from !== to ? Math.sign(to - from) : 0
  useEffect(() => {
    last.current = pathname
  }, [pathname])
  // Fixierte Elemente der Seite bleiben nach der Bewegung unberührt: Transform und Filter werden danach entfernt
  const initial = reduce ? false : dir !== 0 ? { opacity: 0, x: dir * 28, filter: 'blur(1.5px)' } : { opacity: 0, y: 8, scale: 0.99 }
  return (
    <motion.div
      key={pathname}
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }}
      transition={dir !== 0 ? { type: 'spring', stiffness: 380, damping: 30 } : { type: 'spring', stiffness: 460, damping: 32 }}
    >
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

  // WebUntis: beim Öffnen und wenn man in die App zurückkehrt, leise abgleichen, falls es fällig ist
  useEffect(() => {
    autoSyncUntis()
    const onVisible = () => document.visibilityState === 'visible' && autoSyncUntis()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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
            icon: <Icon size={24} />,
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

/** Kopfzeile auf dem Handy: links der Fuchs, rechts XP von heute und Münzen als kräftige Zahlen. */
function TopBar({ className = '' }: { className?: string }) {
  const { xp, coins } = useStore(useShallow((s) => ({ xp: s.xp, coins: s.coins })))
  const lvl = levelFromXp(xp)
  const stat = 'press flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[16px] font-extrabold tabular-nums transition-colors hover:bg-snow'
  return (
    <header className={`flex items-center justify-between border-b-2 border-line bg-page px-3 py-1.5 ${className}`}>
      <Link to="/" aria-label="Zur Startseite" className="press flex items-center gap-2 rounded-xl px-1.5 py-1">
        <Mascot size={32} />
        <span className="hidden text-[19px] min-[360px]:inline font-black tracking-tight text-brand-strong">Studienfuchs</span>
      </Link>
      <div className="flex items-center gap-0.5">
        <Link to="/profile" className={`${stat} text-gold-dark`} aria-label={`Level ${lvl.level}, ${xp} XP`} title="Dein Level">
          <Xp size={24} />
          <motion.span key={lvl.level} initial={{ scale: 1.5, y: -2 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
            Lv {lvl.level}
          </motion.span>
        </Link>
        <Link to="/shop" className={`${stat} text-gold-dark`} aria-label={`${coins} Münzen, zum Fuchs-Laden`} title="Münzen">
          <Coin size={24} />
          <motion.span key={coins} initial={{ scale: 1.5, y: -2 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
            {coins}
          </motion.span>
        </Link>
      </div>
    </header>
  )
}

export function RightRail() {
  const xp = useStore((s) => s.xp)
  const lvl = levelFromXp(xp)
  return (
    <div className="grid gap-4">
      <StudyTimeCard />
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
