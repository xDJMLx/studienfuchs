import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { goalInfo, levelFromXp } from '../../lib/xp'
import { streakNow, useStore, xpToday } from '../../store/useStore'
import { Mascot } from '../mascot/Mascot'
import { CourseChip } from './CoursePicker'
import { Bolt, Book, Camera, Dots, Flame, Gear, Home, Repeat, Right, Shield, Sparkle, Target, Trophy, User } from './Icons'
import { EASE, ItemLi, StaggerList } from './motion'
import { Sheet } from './Sheet'
import { TabBar } from './TabBar'
import { useDue } from '../../features/review/ReviewPage'
import { ProgressBar, ProgressRing, WeekStrip } from './widgets'

interface NavItem {
  to: string
  label: string
  Icon: (p: { size?: number }) => React.ReactNode
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Lernen', Icon: Home, end: true },
  { to: '/practice', label: 'Üben', Icon: Repeat },
  { to: '/grammar', label: 'Grammatik', Icon: Book },
  { to: '/sets', label: 'Meine Sets', Icon: Camera },
  { to: '/profile', label: 'Profil', Icon: User },
]
// Auf dem Handy passen vier Einträge plus "Mehr" in die Leiste; der Rest liegt unter "Mehr"
const MOBILE_NAV: NavItem[] = [NAV[0], NAV[1], NAV[3]]

export function Wordmark({ size = 'md', tone = 'default' }: { size?: 'md' | 'lg'; tone?: 'default' | 'light' }) {
  return (
    <span className={`display flex items-center gap-2.5 font-bold tracking-tight ${tone === 'light' ? 'text-white' : 'text-ink'} ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
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
    <motion.div key={pathname} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: EASE }}>
      {outlet}
    </motion.div>
  )
}

export function Layout() {
  const [moreOpen, setMoreOpen] = useState(false)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLElement>(null)
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const dueCount = useDue().due.length

  useEffect(() => {
    setMoreOpen(false)
    scroller.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex h-full bg-page">
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
        {desktop && <MorePopover open={moreOpen} onToggle={() => setMoreOpen((o) => !o)} onClose={closeMore} />}
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
          tabs={[
            ...MOBILE_NAV.map(({ to, label, Icon }) => ({
              key: to,
              label,
              icon: <Icon size={26} />,
              badge: to === '/practice' && dueCount > 0 ? <DueBadge n={dueCount} className="absolute -right-3 -top-1.5" /> : undefined,
            })),
            { key: 'more', label: 'Mehr', icon: <Dots size={26} /> },
          ]}
          activeIndex={moreOpen ? MOBILE_NAV.length : MOBILE_NAV.findIndex((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))}
          onSelect={(i) => {
            if (i >= MOBILE_NAV.length) return setMoreOpen(true)
            const to = MOBILE_NAV[i].to
            // Zweiter Tipp auf den aktiven Tab: nach oben scrollen (wie bei iOS-Apps)
            if (location.pathname === to) scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
            else navigate(to)
          }}
        />

        {/* "Mehr" als Sheet auf dem Handy. Es gibt immer nur EIN Menü, sonst schließt das unsichtbare das sichtbare beim Klicken. */}
        {!desktop && (
          <Sheet open={moreOpen} onClose={closeMore} title="Mehr">
            <MoreList onClose={closeMore} showMain />
          </Sheet>
        )}
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

/** Mehr-Menü am Desktop: kleines Fenster über dem Knopf. Schließt bei Klick daneben oder Esc. */
function MorePopover({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="relative mt-auto">
      <button type="button" className="nav-link press w-full" onClick={onToggle} aria-expanded={open} aria-haspopup="menu">
        <Dots size={22} />
        Mehr
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ transformOrigin: 'bottom left' }}
            className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
          >
            <MoreList onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ROW = 'group press flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-snow'

function RowBody({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </span>
      <Right size={16} className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5" />
    </>
  )
}

/** Einträge des Mehr-Menüs. Am Desktop stehen Grammatik und Profil schon in der Seitenleiste. */
function MoreList({ onClose, showMain = false }: { onClose: () => void; showMain?: boolean }) {
  const navigate = useNavigate()
  const setOnboarded = useStore((s) => s.setOnboarded)
  return (
    <StaggerList className="grid gap-0.5" stagger={0.04} delay={0.05}>
      {showMain && (
        <>
          <ItemLi>
            <NavLink to="/grammar" role="menuitem" className={ROW} onClick={onClose}>
              <RowBody icon={<Book size={22} />} label="Grammatik" hint="Regeln nachschlagen und anhören" />
            </NavLink>
          </ItemLi>
          <ItemLi>
            <NavLink to="/profile" role="menuitem" className={ROW} onClick={onClose}>
              <RowBody icon={<User size={22} />} label="Profil" hint="Level, Serie und Erfolge" />
            </NavLink>
          </ItemLi>
        </>
      )}
      <ItemLi>
        <NavLink to="/coach" role="menuitem" className={ROW} onClick={onClose}>
          <RowBody icon={<Sparkle size={22} />} label="Lern-Coach" hint="Mit der KI über Tests und Grammatik reden" />
        </NavLink>
      </ItemLi>
      <ItemLi>
        <NavLink to="/catchup" role="menuitem" className={ROW} onClick={onClose}>
          <RowBody icon={<Target size={22} />} label="Aufholen" hint="Stoff aus dem Unterricht nachholen" />
        </NavLink>
      </ItemLi>
      <ItemLi>
        <NavLink to="/settings" role="menuitem" className={ROW} onClick={onClose}>
          <RowBody icon={<Gear size={22} />} label="Einstellungen" hint="Darstellung, Ziel, Stimme, KI" />
        </NavLink>
      </ItemLi>
      <ItemLi>
        <NavLink to="/about" role="menuitem" className={ROW} onClick={onClose}>
          <RowBody icon={<Shield size={22} />} label="Datenschutz & Impressum" hint="Was mit deinen Daten passiert" />
        </NavLink>
      </ItemLi>
      <ItemLi>
        <button
          type="button"
          role="menuitem"
          className={ROW}
          onClick={() => {
            setOnboarded(false)
            onClose()
            navigate('/welcome')
          }}
        >
          <RowBody icon={<Mascot size={26} />} label="Willkommen" hint="Startseite und Einführung" />
        </button>
      </ItemLi>
    </StaggerList>
  )
}

/** Kopfzeile auf dem Handy: Kurs links, Serie und XP rechts (antippen öffnet das Profil). */
function TopBar({ className = '' }: { className?: string }) {
  const { streak, xpByDay, dailyGoal } = useStore()
  const s = streakNow(streak)
  const today = xpToday(xpByDay)
  return (
    <header className={`flex items-center justify-between border-b border-line bg-surface px-3 py-2 ${className}`}>
      <CourseChip />
      <Link to="/profile" className="press flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold transition-colors hover:bg-snow" aria-label="Profil öffnen">
        <span className="flex items-center gap-1 text-fox-dark" title="Serie"><Flame size={20} />{s}</span>
        <span className="flex items-center gap-1 text-gold-dark" title="Heute gesammelte XP"><Bolt size={20} />{today}/{goalInfo(dailyGoal, today).goal}</span>
      </Link>
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
          <Bolt size={26} />
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

      <Link to="/sets/new" className={`${card} group flex items-center gap-4`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark transition-transform group-hover:scale-105">
          <Camera size={24} />
        </span>
        <span>
          <span className="block font-semibold">Eigene Buchseite hochladen</span>
          <span className="block text-sm text-muted">Aus Fotos oder eigenen Wörtern ein Quiz erstellen.</span>
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
