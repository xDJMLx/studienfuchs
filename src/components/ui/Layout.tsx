import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate, useNavigationType, useOutlet } from 'react-router-dom'
import { levelFromXp } from '../../lib/xp'
import { useStore } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
import { Back, Gear, TabCalendar, TabRepeat, TabUser } from './Icons'
import { pageTitle } from '../../lib/pageTitle'
import { useCoachComposer } from '../../lib/coachComposer'
import { CoachComposer } from './CoachComposer'
import { TabBar } from './TabBar'
import { useDue } from '../../features/review/ReviewPage'
import { ProgressBar } from './widgets'
import { autoCloudSave } from '../../lib/autoCloud'
import { maybeSendUsage } from '../../lib/feedback'
import { dateKey } from '../../lib/calendar'
import { dueNowCount } from '../../lib/hausaufgaben'

interface NavItem {
  to: string
  label: string
  Icon: (p: { size?: number }) => React.ReactNode
  end?: boolean
  /** Farbe des Bereichs (aktiver Tab, Seitenleiste) */
  c: string
  t: string
}

// Drei feste Tabs: Üben (Karteikarten, alle Fächer), Kalender (Arbeiten, Tests und Hausaufgaben) und Profil (Stand, Tier, Einstellungen).
// Die Fächer wählt man beim Start und ändert sie in den Einstellungen.
const NAV: NavItem[] = [
  { to: '/', label: 'Üben', Icon: TabRepeat, end: true, c: 'var(--brand)', t: 'var(--brand-text)' },
  { to: '/kalender', label: 'Kalender', Icon: TabCalendar, c: 'var(--sky)', t: 'var(--sky-text)' },
  { to: '/profile', label: 'Profil', Icon: TabUser, c: 'var(--good)', t: 'var(--good-text)' },
]

/** Zu welchem Tab eine Seite gehört (damit er auch auf Unterseiten wie dem Kalender markiert bleibt). */
function tabOf(path: string): string {
  if (path.startsWith('/kalender')) return '/kalender'
  if (path.startsWith('/hausaufgaben')) return '/kalender'
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

/** Wie tief eine Adresse liegt (für die Richtung: tiefer = vorwärts, höher = zurück). */
const depth = (path: string): number => path.split('/').filter(Boolean).length

/** Kurve: zügig los, gleichmäßig ausgleiten (die iOS-Kurve ist am Anfang so steil, dass die Bewegung wie ein Ruck wirkt). */
const PAGE_EASE = [0.25, 0.8, 0.25, 1] as const

/**
 * Seitenwechsel wie ein Blätterstapel: Die alte Seite schiebt sich seitlich hinaus, die neue von der anderen Seite herein, in einem Zug und ohne Überblenden.
 * Richtung: zwischen den Tabs zum Tab hin (Kalender liegt rechts von Üben), in eine Unterseite hinein nach links, zurück nach rechts.
 * Die Richtung gehört zur Navigation, nicht zur einzelnen Seite: Sie wird über `custom` auch an die ausfahrende Seite gegeben.
 */
const pageVariants = {
  enter: (d: number) => ({ x: `${d * 100}%` }),
  center: { x: '0%', transition: { duration: 0.32, ease: PAGE_EASE } },
  exit: (d: number) => ({ x: `${-d * 100}%`, transition: { duration: 0.32, ease: PAGE_EASE } }),
}

function AnimatedOutlet() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const last = useRef(pathname)
  const dirRef = useRef(0)
  if (last.current !== pathname) {
    const from = tabIndex(last.current)
    const to = tabIndex(pathname)
    dirRef.current = from !== to ? Math.sign(to - from) : Math.sign(depth(pathname) - depth(last.current))
    last.current = pathname
  }
  // Am Computer wechseln die Seiten ohne Schiebebewegung (das Wischen gehört zum Handy)
  const desktop = typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 1024px)').matches
  const dir = reduce || desktop ? 0 : dirRef.current
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div key={pathname} custom={dir} variants={pageVariants} initial={dir === 0 ? false : 'enter'} animate="center" exit={dir === 0 ? undefined : 'exit'}>
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLElement>(null)
  const dueCount = useDue().due.length
  // Hausaufgaben, die heute oder schon früher fällig sind
  const homeworkNow = useStore((st) => dueNowCount(st.hausaufgaben ?? [], dateKey(new Date())))
  const nav = NAV
  // Auf KI-Seiten (auch die Fächer-Chats) sitzt das Eingabefeld in der Tab-Leiste
  const onCoach = location.pathname.startsWith('/coach') || /^\/faecher\/[^/]+\/ki/.test(location.pathname)
  const hasPages = useCoachComposer((c) => c.pages.length > 0)

  // Wie in einer richtigen App: Beim Zurückgehen steht die Seite wieder dort, wo man sie verlassen hat; sonst beginnt sie oben
  const navType = useNavigationType()
  const savedScroll = useRef(new Map<string, number>())
  const lastKey = useRef(location.key)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => savedScroll.current.set(lastKey.current, el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    lastKey.current = location.key
    const target = navType === 'POP' ? (savedScroll.current.get(location.key) ?? 0) : 0
    scroller.current?.scrollTo({ top: 0 })
    if (target > 0) {
      // Der Inhalt braucht einen Moment, bis er so hoch ist
      const ids = [60, 200, 450].map((ms) => window.setTimeout(() => scroller.current?.scrollTo({ top: target }), ms))
      return () => ids.forEach(clearTimeout)
    }
  }, [location.key, navType])

  // Obere Leiste (Handy) auf allen Seiten, die kein Tab sind: Zurück und Titel, immer sichtbar
  const isRoot = ['/', '/kalender', '/profile'].includes(location.pathname)
  const canGoBack = location.key !== 'default'
  const goBack = () => (canGoBack ? navigate(-1) : navigate(tabOf(location.pathname)))
  const title = pageTitle(location.pathname)

  // Beim Öffnen und wenn man in die App zurückkehrt: fällige Sicherung und freiwillige Nutzungsdaten
  useEffect(() => {
    const tick = () => {
      void autoCloudSave(() => useStore.getState().exportData())
      const st = useStore.getState()
      void maybeSendUsage({ grade: st.grade, subjects: (st.mySubjects ?? []).length, sets: st.sets.length, cards: Object.keys(st.cards).length, arbeiten: (st.arbeiten ?? []).length, mascot: st.mascot })
    }
    tick()
    const onVisible = () => document.visibilityState === 'visible' && tick()
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
      {/* Seitenleiste (Computer): die drei Tabs als Blöcke, unten Level und Einstellungen */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 px-2" aria-label="Zur Startseite">
          <Wordmark />
        </Link>
        <nav className="grid gap-2" aria-label="Hauptnavigation">
          {nav.map(({ to, label, Icon, end, c }) => {
            const on = tabOf(location.pathname) === to
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={{ '--nav-c': c } as React.CSSProperties}
                className="nav-link press relative"
                data-active={on || undefined}
              >
                <span className="relative flex w-full items-center gap-3.5">
                  <span className="nav-icon flex h-9 w-11 items-center justify-center rounded-[10px]">
                    <Icon size={24} />
                  </span>
                  <span className="text-[16px] font-extrabold">{label}</span>
                  {to === '/' && dueCount > 0 && <DueBadge n={dueCount} className="ml-auto" />}
                  {to === '/kalender' && homeworkNow > 0 && <DueBadge n={homeworkNow} className="ml-auto" />}
                </span>
              </NavLink>
            )
          })}
        </nav>
        <div className="mt-auto grid gap-3">
          <SidebarLevel />
          <NavLink to="/settings" className={({ isActive }) => `nav-link press ${isActive ? 'nav-link-soft' : ''}`}>
            <span className="relative flex w-full items-center gap-3.5">
              <span className="flex h-9 w-11 items-center justify-center">
                <Gear size={24} />
              </span>
              <span className="text-[16px] font-extrabold">Einstellungen</span>
            </span>
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!isRoot && (
          <header className="relative z-30 flex h-12 shrink-0 items-center px-1.5 lg:hidden" style={{ background: 'color-mix(in srgb, var(--base) 82%, transparent)', WebkitBackdropFilter: 'blur(18px) saturate(1.6)', backdropFilter: 'blur(18px) saturate(1.6)', borderBottom: '1px solid var(--line)' }}>
            <button type="button" onClick={goBack} className="press flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-[16px] font-bold text-brand-dark" aria-label="Zurück">
              <Back size={20} /> Zurück
            </button>
            {title && <span className="pointer-events-none absolute inset-x-24 truncate text-center text-[16px] font-extrabold">{title}</span>}
          </header>
        )}
        <main ref={scroller} tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--tabbar-h)+1rem)] outline-none lg:pb-10">
          <div className="relative mx-auto w-full max-w-[1180px] min-w-0 lg:px-10">
            <AnimatedOutlet />
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
            badge: to === '/' && dueCount > 0 ? <DueBadge n={dueCount} className="absolute -right-3 -top-1.5" /> : to === '/kalender' && homeworkNow > 0 ? <DueBadge n={homeworkNow} className="absolute -right-3 -top-1.5" /> : undefined,
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

/** Unten in der Seitenleiste: Level mit Fortschritt, führt ins Profil. */
function SidebarLevel() {
  const xp = useStore((s) => s.xp)
  const lvl = levelFromXp(xp)
  return (
    <Link to="/profile" className="press block rounded-[14px] border border-line bg-snow p-3.5">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[15px] font-extrabold">Level {lvl.level}</p>
        <p className="text-xs font-bold text-muted">{lvl.into} / {lvl.needed} XP</p>
      </div>
      <ProgressBar pct={lvl.into / lvl.needed} color="bg-brand" className="!h-2.5" />
    </Link>
  )
}
