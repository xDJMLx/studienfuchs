import { useEffect } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Layout } from './components/ui/Layout'
import { UpdateBanner } from './components/ui/UpdateBanner'
import { useApplyTheme } from './lib/theme'
import { useStore } from './store/useStore'
import { GrammarTopicPage } from './features/grammar/GrammarPage'
import { CatchUpPage } from './features/catchup/CatchUpPage'
import { CoachPage } from './features/coach/CoachPage'
import { LessonPage } from './features/lesson/LessonPage'
import { LearnPage } from './features/path/LearnPage'
import { PlacementPage } from './features/placement/PlacementPage'
import { BookPage } from './features/books/BookPage'
import { BooksPage } from './features/books/BooksPage'
import { FlashcardsPage } from './features/practice/FlashcardsPage'
import { PracticePage } from './features/practice/PracticePage'
import { PracticePlay } from './features/practice/PracticePlay'
import { AboutPage } from './features/profile/AboutPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ShopPage } from './features/shop/ShopPage'
import { ReviewPage } from './features/review/ReviewPage'
import { ReviewPlay } from './features/review/ReviewPlay'
import { SettingsPage } from './features/settings/SettingsPage'
import { SetDetailPage } from './features/sets/SetDetailPage'
import { SetPlay } from './features/sets/SetPlay'
import { CreateSetPage } from './features/upload/CreateSetPage'
import { Welcome } from './features/welcome/Welcome'

/** Seitentitel pro Seite: wichtig für Tabs, Verlauf und Screenreader (die Adresse ändert sich nur nach dem #). */
const TITLES: [prefix: string, title: string][] = [
  ['/welcome', 'Willkommen'],
  ['/lesson/', 'Lektion'],
  ['/placement', 'Einstufungstest'],
  ['/catchup', 'Aufholen'],
  ['/coach', 'KI'],
  ['/books', 'Bücher'],
  ['/shop', 'Fuchs & Shop'],
  ['/practice/cards', 'Karteikarten'],
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
    document.title = hit ? `${hit[1]} · Studienfuchs` : 'Studienfuchs – Lernen für die Schule'
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
  return (
    <HashRouter>
      <RouteTitle />
      <UpdateBanner />
      <ErrorBoundary>
      <Routes>
        <Route path="welcome" element={<Welcome />} />
        <Route element={<RequireOnboarding />}>
          <Route element={<Layout />}>
            <Route index element={<LearnPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="catchup" element={<CatchUpPage />} />
            <Route path="coach" element={<CoachPage />} />
            <Route path="books" element={<BooksPage />} />
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
          </Route>
          {/* Lern-Sessions ohne Navigation, damit nichts ablenkt */}
          <Route path="lesson/:lessonId" element={<LessonPage />} />
          <Route path="placement" element={<PlacementPage />} />
          <Route path="practice/play" element={<PracticePlay />} />
          <Route path="practice/cards" element={<FlashcardsPage />} />
          <Route path="sets/:setId/cards" element={<FlashcardsPage />} />
          <Route path="review/play" element={<ReviewPlay />} />
          <Route path="sets/:setId/play" element={<SetPlay />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </HashRouter>
  )
}
