import { Mascot, type Mood } from '../../components/mascot/Mascot'
import { useSearchParams } from 'react-router-dom'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { SPECIES_IDS } from '../../components/mascot/species'
const MOODS: Mood[] = ['happy', 'wink', 'laugh', 'love', 'cheer', 'sleep', 'surprised', 'sad', 'think', 'proud', 'determined', 'yawn']
export function Augen() {
  const [p] = useSearchParams()
  const species = p.get('t') ?? 'fuchs'
  const one = p.get('m') as Mood | null
  if (p.get('x') === 'shop') {
    const SETS: Record<string, Record<string, string>> = { A: { kopf: 'muetze', gesicht: 'brille', hals: 'schal' }, B: { kopf: 'krone', gesicht: 'sonnenbrille', hals: 'medaille' }, C: { kopf: 'zylinder', gesicht: 'schnurrbart', hals: 'fliege' }, D: { kopf: 'kappe', hintergrund: 'aura' } }
    const outfit = SETS[p.get('set') ?? 'A']
    if (p.get('n')) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white"><Mascot size={Number(p.get('s') ?? 520)} species={p.get('n') as never} mood="happy" outfit={outfit as never} /></div>
    return <div className="fixed inset-0 z-50 grid gap-1 overflow-y-auto bg-white p-2" style={{ gridTemplateColumns: `repeat(${p.get('c') ?? 4}, 1fr)` }}>{SPECIES_IDS.map((id) => <div key={id} className="text-center text-[11px]"><Mascot size={Number(p.get('s') ?? 150)} species={id} mood="happy" outfit={outfit as never} />{id}</div>)}</div>
  }
  if (p.get('x') === 'icons') return <div className="fixed inset-0 z-50 grid grid-cols-4 gap-3 overflow-y-auto bg-white p-3">{HELP_SUBJECTS.map((h) => <div key={h.id} className="text-center text-xs"><span className="mx-auto flex h-24 w-24 items-center justify-center rounded-[22px]" style={{ background: h.c }}><HelpSubjectIcon id={h.id} ink={h.c} size={64} /></span>{h.name}</div>)}</div>
  if (one) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white"><Mascot size={Number(p.get('s') ?? 420)} mood={one} species={species as never} /></div>
  return (
    <div className="fixed inset-0 z-50 grid grid-cols-3 gap-2 overflow-y-auto bg-white p-2">
      {MOODS.map((m) => (
        <div key={m} className="text-center text-xs">
          <Mascot size={150} mood={m} species={species as never} />
          {m}
        </div>
      ))}
    </div>
  )
}
