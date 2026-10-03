import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Layout } from './components/ui/Layout'
import { UpdateBanner } from './components/ui/UpdateBanner'
import { useApplyTheme } from './lib/theme'
import { useStore } from './store/useStore'
import { LessonPage } from './features/lesson/LessonPage'
import { LearnPage } from './features/path/LearnPage'
import { Welcome } from './features/welcome/Welcome'

/**
 * Seiten werden erst beim Öffnen geladen: der Start bleibt klein und schnell.
 * Gibt es nach einer neuen Version die alte Datei nicht mehr, lädt die App einmal neu, statt leer zu bleiben.
 */
function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() =>
    load()
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
const CatchUpPage = lazyPage(() => import('./features/catchup/CatchUpPage'), 'CatchUpPage')
const CoachPage = lazyPage(() => import('./features/coach/CoachPage'), 'CoachPage')
const ExamCreatePage = lazyPage(() => import('./features/exam/ExamCreatePage'), 'ExamCreatePage')
const ExamPlayPage = lazyPage(() => import('./features/exam/ExamPlayPage'), 'ExamPlayPage')
const SpeakTrainingPage = lazyPage(() => import('./features/speak/SpeakTrainingPage'), 'SpeakTrainingPage')
const PlacementPage = lazyPage(() => import('./features/placement/PlacementPage'), 'PlacementPage')
const BookPage = lazyPage(() => import('./features/books/BookPage'), 'BookPage')
const BooksPage = lazyPage(() => import('./features/books/BooksPage'), 'BooksPage')
const FlashcardsPage = lazyPage(() => import('./features/practice/FlashcardsPage'), 'FlashcardsPage')
const PracticePage = lazyPage(() => import('./features/practice/PracticePage'), 'PracticePage')
const PracticePlay = lazyPage(() => import('./features/practice/PracticePlay'), 'PracticePlay')
const BlitzPage = lazyPage(() => import('./features/practice/BlitzPage'), 'BlitzPage')
const AboutPage = lazyPage(() => import('./features/profile/AboutPage'), 'AboutPage')
const ProfilePage = lazyPage(() => import('./features/profile/ProfilePage'), 'ProfilePage')
const ShopPage = lazyPage(() => import('./features/shop/ShopPage'), 'ShopPage')
const ReviewPage = lazyPage(() => import('./features/review/ReviewPage'), 'ReviewPage')
const ReviewPlay = lazyPage(() => import('./features/review/ReviewPlay'), 'ReviewPlay')
const SettingsPage = lazyPage(() => import('./features/settings/SettingsPage'), 'SettingsPage')
const SetDetailPage = lazyPage(() => import('./features/sets/SetDetailPage'), 'SetDetailPage')
const SetPlay = lazyPage(() => import('./features/sets/SetPlay'), 'SetPlay')
const CreateSetPage = lazyPage(() => import('./features/upload/CreateSetPage'), 'CreateSetPage')
const FoxLab = import.meta.env.DEV ? lazyPage(() => import('./features/dev/FoxLab'), 'FoxLab') : null
const ResultLab = import.meta.env.DEV ? lazyPage(() => import('./features/dev/ResultLab'), 'ResultLab') : null

function PageFallback() {
  return <div role="status" aria-label="Lädt" className="flex h-full min-h-[40vh] items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand" /></div>
}

/** Seitentitel pro Seite: wichtig für Tabs, Verlauf und Screenreader (die Adresse ändert sich nur nach dem #). */
const TITLES: [prefix: string, title: string][] = [
  ['/welcome', 'Willkommen'],
  ['/lesson/', 'Lektion'],
  ['/placement', 'Einstufungstest'],
  ['/catchup', 'Aufholen'],
  ['/coach', 'KI'],
  ['/books', 'Bücher'],
  ['/speak', 'Sprechtraining'],
  ['/exam/new', 'Test erstellen'],
  ['/exam/', 'Test'],
  ['/shop', 'Fuchs & Shop'],
  ['/practice/cards', 'Karteikarten'],
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
    document.title = hit ? `${hit[1]} · Studienfuchs` : 'Studienfuchs – Französisch lernen für die Schule'
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
      <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="welcome" element={<Welcome />} />
        <Route element={<RequireOnboarding />}>
          <Route element={<Layout />}>
            <Route index element={<LearnPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="catchup" element={<CatchUpPage />} />
            <Route path="coach" element={<CoachPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="exam/new" element={<ExamCreatePage />} />
            <Route path="books/:bookId" element={<BookPage />} />
            <Route path="plan" element={<Navigate to="/books" replace />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="words" element={<Navigate to="/practice?tab=words" replace />} />
            <Route path="grammar" element={<Navigate to="/practice?tab=grammar" replace />} />
            <Route path="grammar/:lessonId" element={<GrammarTopicPage />} />
            <Route path="sets" element={<Navigate to="/practice" replace />} />
            <Route path="sets/new" element={<CreateSetPage />} />
            <Route path="sets/:setId" element={<SetDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
            {FoxLab && <Route path="fox" element={<FoxLab />} />}
          </Route>
          {/* Lern-Sessions ohne Navigation, damit nichts ablenkt */}
          <Route path="lesson/:lessonId" element={<LessonPage />} />
          <Route path="placement" element={<PlacementPage />} />
          <Route path="exam/:examId" element={<ExamPlayPage />} />
          <Route path="speak" element={<SpeakTrainingPage />} />
          <Route path="practice/play" element={<PracticePlay />} />
          {ResultLab && <Route path="result-lab" element={<ResultLab />} />}
          <Route path="blitz" element={<BlitzPage />} />
          <Route path="practice/cards" element={<FlashcardsPage />} />
          <Route path="sets/:setId/cards" element={<FlashcardsPage />} />
          <Route path="review/play" element={<ReviewPlay />} />
          <Route path="sets/:setId/play" element={<SetPlay />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </HashRouter>
  )
}
