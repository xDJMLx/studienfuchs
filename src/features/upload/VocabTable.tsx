import { useState } from 'react'
import { Plus, Swap, Trash } from '../../components/ui/Icons'

export interface Row {
  key: string
  front: string
  back: string
  example?: string
  exampleDe?: string
  note?: string
}

let counter = 0
export const newRow = (front = '', back = '', extra: Partial<Row> = {}): Row => ({ key: `r${++counter}`, front, back, ...extra })

/** Bearbeitbare Vokabeltabelle: KI und Texterkennung machen Fehler, deshalb prüfst du hier alles vor dem Lernen. */
export function VocabTable({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const [showExamples, setShowExamples] = useState(rows.some((r) => r.example))
  const update = (key: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const input = 'min-w-0 rounded-xl border border-line bg-snow px-3 py-2 font-medium outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]'
  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_1fr_2.5rem] gap-2 text-xs font-semibold text-muted">
        <span>Französisch</span>
        <span>Deutsch</span>
        <span />
      </div>
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.key} className="rounded-xl">
            <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-2">
              <input value={r.front} lang="fr" spellCheck={false} onChange={(e) => update(r.key, { front: e.target.value })} aria-label="Französisch" className={input} />
              <input value={r.back} lang="de" onChange={(e) => update(r.key, { back: e.target.value })} aria-label="Deutsch" className={input} />
              <button type="button" aria-label="Zeile löschen" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="flex items-center justify-center text-muted transition-colors hover:text-bad">
                <Trash size={20} />
              </button>
            </div>
            {showExamples && (
              <div className="mt-1.5 grid grid-cols-1 gap-1.5 pl-3 sm:grid-cols-2">
                <input value={r.example ?? ''} lang="fr" spellCheck={false} placeholder="Beispielsatz (Französisch)" onChange={(e) => update(r.key, { example: e.target.value })} aria-label="Beispielsatz" className={`${input} text-sm`} />
                <input value={r.exampleDe ?? ''} lang="de" placeholder="Übersetzung" onChange={(e) => update(r.key, { exampleDe: e.target.value })} aria-label="Übersetzung des Beispielsatzes" className={`${input} text-sm`} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !px-3 !py-2 !text-sm" onClick={() => onChange([...rows, newRow()])}>
          <Plus size={16} /> Zeile
        </button>
        <button type="button" className="btn btn-ghost !px-3 !py-2 !text-sm" onClick={() => onChange(rows.map((r) => ({ ...r, front: r.back, back: r.front })))}>
          <Swap size={16} /> Spalten tauschen
        </button>
        <button type="button" className="btn btn-ghost !px-3 !py-2 !text-sm" onClick={() => setShowExamples((s) => !s)} aria-pressed={showExamples}>
          {showExamples ? 'Beispielsätze ausblenden' : 'Beispielsätze bearbeiten'}
        </button>
      </div>
    </div>
  )
}
