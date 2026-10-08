import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Back } from './Icons'

/**
 * Zurück-Knopf: Kam man aus der App hierher, geht es genau dorthin zurück, woher man kam (nicht auf eine feste Seite).
 * Ohne Verlauf (Seite direkt geöffnet) führt er zur angegebenen Seite.
 */
export function BackLink({ to, label, size = 18, className = '' }: { to: string; label: string; size?: number; className?: string }) {
  const navigate = useNavigate()
  // Der erste Eintrag einer Sitzung hat bei react-router den Schlüssel "default": davor gibt es nichts, wohin man zurückkönnte
  const canGoBack = useLocation().key !== 'default'
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (!canGoBack || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(-1)
      }}
      className={`press -ml-2 mb-2 hidden min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted transition-colors hover:text-ink lg:inline-flex ${className}`}
    >
      <Back size={size} /> {canGoBack ? 'Zurück' : label}
    </Link>
  )
}
