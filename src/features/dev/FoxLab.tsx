import { useState } from 'react'
import { Mascot, type Mood } from '../../components/mascot/Mascot'
import { mascotBus } from '../../lib/mascotBus'

/** Nur in der Entwicklung: alle Posen und Reaktionen des Fuchses auf einen Blick. */
const MOODS: Mood[] = ['happy', 'cheer', 'sad', 'think', 'wave', 'sleep', 'surprised', 'love', 'wink', 'laugh', 'yawn', 'dance', 'proud', 'determined']
const OUTFITS = [{}, { kopf: 'krone', gesicht: 'brille', hals: 'schal', hintergrund: 'sonne' }, { kopf: 'zylinder', gesicht: 'schnurrbart', hals: 'fliege', hintergrund: 'nacht' }, { kopf: 'muetze', gesicht: 'sonnenbrille', hals: 'medaille', hintergrund: 'aura' }, { kopf: 'kappe' }]

export function FoxLab() {
  const [pose, setPose] = useState<'bust' | 'full'>('full')
  const [big, setBig] = useState<Mood>('happy')
  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <button className="chip" onClick={() => setPose(pose === 'full' ? 'bust' : 'full')}>{pose}</button>
        {(['correct', 'wrong', 'almost', 'cheer', 'pass', 'fail', 'levelup', 'speak:start', 'speak:end'] as const).map((e) => (
          <button key={e} className="chip" onClick={() => mascotBus.emit(e)}>{e}</button>
        ))}
      </div>
      <div className="mb-4 flex justify-center"><Mascot size={420} pose={pose} alive listen mood={big} /></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOODS.map((m) => (
          <div key={m} className="card cursor-pointer p-2 text-center" onClick={() => setBig(m)}>
            <Mascot mood={m} size={180} pose={pose} alive listen />
            <p className="text-xs text-muted">{m}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        {OUTFITS.map((o, i) => (
          <Mascot key={i} size={140} pose={pose} outfit={o} mood="happy" alive />
        ))}
        <Mascot size={56} />
        <Mascot size={34} />
      </div>
    </div>
  )
}
