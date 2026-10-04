import { Plus, Swap, Trash } from '../../components/ui/Icons'
import { restoreAccents } from '../../lib/accents'
import type { DeckLang } from '../../lib/types'
import { newRow, type Row } from '../upload/VocabTable'

const cell = 'min-w-0 w-full resize-none rounded-xl border-2 border-line bg-snow px-3 py-2 text-[15px] font-semibold leading-snug outline-none transition-colors focus:border-sky'

/** Karten bearbeiten: Vorderseite und Rückseite je Zeile. KI und Foto-Erkennung machen Fehler, deshalb prüft man hier alles. */
export function CardTable({ rows, onChange, lang, labels = ['Vorderseite', 'Rückseite'] }: { rows: Row[]; onChange: (rows: Row[]) => void; lang?: DeckLang; labels?: [string, string] }) {
  const update = (key: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const fixFront = (key: string, value: string) => {
    // Französisch: fehlende Akzente beim Verlassen des Feldes ergänzen
    if (lang === 'fr') {
      const next = restoreAccents(value)
      if (next !== value) update(key, { front: next })
    }
  }
  return (
    <div>
      <ul className="grid gap-3">
        {rows.map((r, i) => (
          <li key={r.key} className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-muted">Karte {i + 1}</span>
              <button type="button" aria-label={`Karte ${i + 1} löschen`} onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-snow hover:text-bad">
                <Trash size={18} />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-muted">
                {labels[0]}
                <textarea
                  rows={2}
                  className={cell}
                  value={r.front}
                  lang={lang}
                  spellCheck={false}
                  onChange={(e) => update(r.key, { front: e.target.value })}
                  onBlur={(e) => fixFront(r.key, e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-muted">
                {labels[1]}
                <textarea rows={2} className={cell} value={r.back} onChange={(e) => update(r.key, { back: e.target.value })} />
              </label>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost press !px-3 !py-2 !text-sm" onClick={() => onChange([...rows, newRow()])}>
          <Plus size={16} /> Karte
        </button>
        <button type="button" className="btn btn-ghost press !px-3 !py-2 !text-sm" onClick={() => onChange(rows.map((r) => ({ ...r, front: r.back, back: r.front })))}>
          <Swap size={16} /> Seiten tauschen
        </button>
      </div>
    </div>
  )
}
