import { Link } from 'react-router-dom'
import { Flame, Right } from '../../components/ui/Icons'
import { useStore } from '../../store/useStore'

/** Die Blitzrunde: der kurze, schnelle Weg zu Punkten und Rekord, ohne Lernplan. */
export function BlitzCard() {
  const best = useStore((s) => s.blitzBest ?? 0)
  const math = useStore((s) => (s.subject ?? 'fr') === 'math')
  return (
    <Link to="/blitz" className="press relative mb-6 flex items-center gap-4 overflow-hidden rounded-[20px] bg-violet p-4 text-white">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Flame size={30} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold leading-tight">Blitzrunde</span>
        <span className="block text-sm font-medium opacity-95">{best > 0 ? `60 Sekunden. Dein Rekord: ${best} Punkte` : math ? '60 Sekunden, so viele Aufgaben wie möglich' : '60 Sekunden, so viele Karten wie möglich'}</span>
      </span>
      <Right size={18} className="shrink-0" />
    </Link>
  )
}
