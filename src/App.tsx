import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Layout } from './components/ui/Layout'
import { UpdateBanner } from './components/ui/UpdateBanner'
import { useApplyTheme } from './lib/theme'
import { useStore } from './store/useStore'
import { UebenPage } from './features/ueben/UebenPage'
import { Welcome } from './features/welcome/Welcome'

/**
 * Seiten werden erst beim Öffnen geladen: der Start bleibt klein und schnell.
 * Gibt es nach einer neuen Version die alte Datei nicht mehr, lädt die App einmal neu, statt leer zu bleiben.
 */
/** Lädt eine Seiten-Datei mit zwei Wiederholungen (auf dem Handy reißt das Netz oft kurz ab), bevor ein Fehler gemeldet wird. */
async function loadWithRetry<T>(load: () => Promise<T>): Promise<T> {
  let last: unknown
  for (const wait of [0, 700, 2000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    try {
      return await load()
    } catch (e) {
      last = e
    }
  }
  throw last
}

function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() =>
    loadWithRetry(load)
      .then((m) => ({ default: m[name] }))
      .catch((e) => {
        try {
          if (!sessionStorage.getItem('chunk-reload')) {
            sessionStorage.setItem('chunk-reload', '1')
            location.reload()
            return new Promise<never>(() => {})
          }
        } catch {
          /* ohne Speicher einfach den Fehler zeigen */
        }
        throw e
      }),
  )
}

const GrammarTopicPage = lazyPage(() => import('./features/grammar/GrammarPage'), 'GrammarTopicPage')
const UebenPlay = lazyPage(() => import('./features/ueben/CardFlow'), 'UebenPlay')
const KalenderPage = lazyPage(() => import('./features/kalender/KalenderPage'), 'KalenderPage')
const FachPage = lazyPage(() => import('./features/faecher/FachPage'), 'FachPage')
const DeckPage = lazyPage(() => import('./features/faecher/DeckPage'), 'DeckPage')
const DeckCreatePage = lazyPage(() => import('./features/faecher/DeckCreatePage'), 'DeckCreatePage')
const FaecherPage = lazyPage(() => import('./features/faecher/FaecherPage'), 'FaecherPage')
const CoachPage = lazyPage(() => import('./features/coach/CoachPage'), 'CoachPage')
const ExamCreatePage = lazyPage(() => import('./features/exam/ExamCreatePage'), 'ExamCreatePage')
const ExamPlayPage = lazyPage(() => import('./features/exam/ExamPlayPage'), 'ExamPlayPage')
const SpeakTrainingPage = lazyPage(() => import('./features/speak/SpeakTrainingPage'), 'SpeakTrainingPage')
const BookPage = lazyPage(() => import('./features/books/BookPage'), 'BookPage')
const BooksPage = lazyPage(() => import('./features/books/BooksPage'), 'BooksPage')
const BlitzPage = lazyPage(() => import('./features/practice/BlitzPage'), 'BlitzPage')
const AboutPage = lazyPage(() => import('./features/profile/AboutPage'), 'AboutPage')
const ProfilePage = lazyPage(() => import('./features/profile/ProfilePage'), 'ProfilePage')
const ShopPage = lazyPage(() => import('./features/shop/ShopPage'), 'ShopPage')
const ReviewPage = lazyPage(() => import('./features/review/ReviewPage'), 'ReviewPage')
const SettingsPage = lazyPage(() => import('./features/settings/SettingsPage'), 'SettingsPage')
const FoxLab = import.meta.env.DEV ? lazyPage(() => import('./features/dev/FoxLab'), 'FoxLab') : null
const ResultLab = import.meta.env.DEV ? lazyPage(() => import('./features/dev/ResultLab'), 'ResultLab') : null

/** Fehlermeldung verschwindet, sobald man zu einer anderen Seite wechselt (z. B. über die Tab-Leiste). */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

/** Alte Adresse eines Stapels (früher "Set") führt zum neuen Stapel. */
function DeckRedirect() {
  const { setId = '' } = useParams()
  return <Navigate to={`/stapel/${setId}`} replace />
}

function PageFallback() {
  return <div role="status" aria-label="Lädt" className="flex h-full min-h-[40vh] items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand" /></div>
}

/** Seitentitel pro Seite: wichtig für Tabs, Verlauf und Screenreader (die Adresse ändert sich nur nach dem #). */
const TITLES: [prefix: string, title: string][] = [
  ['/welcome', 'Willkommen'],
  ['/lesson/', 'Lektion'],
  ['/placement', 'Einstufungstest'],
  ['/catchup', 'Aufholen'],
  ['/faecher', 'Fächer'],
  ['/kalender', 'Wochenplan'],
  ['/stapel', 'Stapel'],
  ['/ueben/los', 'Üben'],
  ['/books', 'Bücher'],
  ['/speak', 'Sprechtraining'],
  ['/exam/new', 'Test erstellen'],
  ['/exam/', 'Test'],
  ['/shop', 'Fuchs & Shop'],
  ['/practice/cards', 'Karteikarten'],
  ['/math/train', 'Training'],
  ['/blitz', 'Blitzrunde'],
  ['/practice', 'Üben'],
  ['/review/play', 'Wiederholung'],
  ['/review', 'Lernstand'],
  ['/words', 'Wörter'],
  ['/grammar', 'Grammatik'],
  ['/sets', 'Eigene Liste'],
  ['/profile', 'Profil'],
  ['/settings', 'Einstellungen'],
  ['/about', 'Datenschutz & Impressum'],
]

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const hit = TITLES.find(([p]) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')))
    document.title = hit ? `${hit[1]} · Studienfuchs` : 'Studienfuchs – Üben für die Schule'
  }, [pathname])
  return null
}

/** Wer noch nie hier war (und keinen Fortschritt hat), sieht zuerst das Startmenü. */
function RequireOnboarding() {
  const onboarded = useStore((s) => s.onboarded)
  const hasProgress = useStore((s) => s.xp > 0 || Object.keys(s.lessons).length > 0)
  return onboarded || hasProgress ? <Outlet /> : <Navigate to="/welcome" replace />
}

// HashRouter: funktioniert auf GitHub Pages ohne Server-Umleitungen.
export default function App() {
  useApplyTheme()
  // Lief die Seite stabil, darf ein späterer Ladefehler (neue Version) wieder einmal neu laden
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        sessionStorage.removeItem('chunk-reload')
      } catch {
        /* egal */
      }
    }, 4000)
    return () => clearTimeout(id)
  }, [])
  return (
    <HashRouter>
      <RouteTitle />
      <UpdateBanner />
      <RouteGuard>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="welcome" element={<Welcome />} />
        <Route element={<RequireOnboarding />}>
          <Route element={<Layout />}>
            <Route index element={<UebenPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="faecher" element={<FaecherPage />} />
            <Route path="kalender" element={<KalenderPage />} />
            <Route path="faecher/:subjectId" element={<FachPage />} />
            <Route path="faecher/:subjectId/ki" element={<CoachPage />} />
            <Route path="stapel/neu" element={<DeckCreatePage />} />
            <Route path="stapel/:deckId" element={<DeckPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="books/:bookId" element={<BookPage />} />
            <Route path="exam/new" element={<ExamCreatePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="grammar/:lessonId" element={<GrammarTopicPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
            {/* Alte Adressen */}
            <Route path="practice" element={<Navigate to="/" replace />} />
            <Route path="coach" element={<Navigate to="/faecher/franzoesisch/ki" replace />} />
            <Route path="plan" element={<Navigate to="/books" replace />} />
            <Route path="words" element={<Navigate to="/faecher/franzoesisch?tab=nachschlagen" replace />} />
            <Route path="grammar" element={<Navigate to="/faecher/franzoesisch?tab=nachschlagen" replace />} />
            <Route path="sets" element={<Navigate to="/faecher" replace />} />
            <Route path="sets/new" element={<Navigate to="/stapel/neu" replace />} />
            <Route path="sets/:setId" element={<DeckRedirect />} />
            <Route path="catchup" element={<Navigate to="/" replace />} />
            <Route path="lesson/:lessonId" element={<Navigate to="/" replace />} />
            {FoxLab && <Route path="fox" element={<FoxLab />} />}
          </Route>
          {/* Übungs-Durchgänge ohne Navigation, damit nichts ablenkt */}
          <Route path="ueben/los" element={<UebenPlay />} />
          <Route path="review/play" element={<UebenPlay />} />
          <Route path="exam/:examId" element={<ExamPlayPage />} />
          <Route path="speak" element={<SpeakTrainingPage />} />
          {ResultLab && <Route path="result-lab" element={<ResultLab />} />}
          <Route path="blitz" element={<BlitzPage />} />
          <Route path="placement" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </RouteGuard>
    </HashRouter>
  )
}
