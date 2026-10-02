import { useRef, useState } from 'react'
import { Check, Plus, Swap, Trash } from '../../components/ui/Icons'
import { restoreAccents } from '../../lib/accents'

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

type FrField = 'front' | 'example'

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'ô', 'î', 'ï', 'œ']

/** Setzt fehlende Akzente in allen französischen Feldern ein (z. B. nach dem Einlesen). */
export function fixRowAccents(rows: Row[]): Row[] {
  return rows.map((r) => ({ ...r, front: restoreAccents(r.front), ...(r.example ? { example: restoreAccents(r.example) } : {}) }))
}

/** Bearbeitbare Vokabeltabelle: KI und Texterkennung machen Fehler, deshalb prüfst du hier alles vor dem Lernen. Fehlende Akzente ergänzt die App selbst. */
export function VocabTable({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const [showExamples, setShowExamples] = useState(rows.some((r) => r.example))
  const [fixed, setFixed] = useState<string | null>(null)
  const active = useRef<{ key: string; field: FrField; el: HTMLInputElement } | null>(null)
  const timer = useRef<number>(0)
  const update = (key: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const autoFix = (key: string, field: FrField, value: string) => {
    const next = restoreAccents(value)
    if (next === value) return
    update(key, { [field]: next })
    setFixed(key)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFixed(null), 2200)
  }

  const insert = (ch: string) => {
    const a = active.current
    if (!a || !a.el.isConnected) return
    const row = rows.find((r) => r.key === a.key)
    if (!row) return
    const cur = (row[a.field] ?? '') as string
    const start = a.el.selectionStart ?? cur.length
    const end = a.el.selectionEnd ?? cur.length
    update(a.key, { [a.field]: cur.slice(0, start) + ch + cur.slice(end) })
    requestAnimationFrame(() => {
      a.el.focus()
      a.el.setSelectionRange(start + ch.length, start + ch.length)
    })
  }

  const input = 'min-w-0 rounded-xl border border-line bg-snow px-3 py-2 font-medium outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]'
  const frProps = (r: Row, field: FrField) => ({
    lang: 'fr',
    spellCheck: false,
    autoCapitalize: 'none' as const,
    autoCorrect: 'off',
    value: (r[field] ?? '') as string,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      active.current = { key: r.key, field, el: e.currentTarget }
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(r.key, { [field]: e.target.value }),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => autoFix(r.key, field, e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter springt ins nächste Feld und korrigiert dabei
      if (e.key === 'Enter') {
        e.preventDefault()
        autoFix(r.key, field, e.currentTarget.value)
        const next = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[lang="de"]')
        next?.focus()
      }
    },
  })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-snow p-2" role="group" aria-label="Akzente einfügen">
        <span className="px-1 text-xs font-medium text-muted">Akzente:</span>
        {ACCENTS.map((ch) => (
          <button
            key={ch}
            type="button"
            // mousedown verhindern, damit das Textfeld den Fokus behält
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(ch)}
            className="press flex h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-surface text-base font-semibold transition-colors hover:border-brand hover:text-brand-dark"
            aria-label={`${ch} einfügen`}
          >
            {ch}
          </button>
        ))}
        <span className="basis-full px-1 text-xs text-muted sm:basis-auto">Fehlende Akzente ergänzt die App automatisch, sobald du ein Feld verlässt.</span>
      </div>
      <div className="mb-2 grid grid-cols-[1fr_1fr_2.5rem] gap-2 text-xs font-semibold text-muted">
        <span>Französisch</span>
        <span>Deutsch</span>
        <span />
      </div>
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.key} className="rounded-xl">
            <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-2">
              <div className="relative min-w-0">
                <input {...frProps(r, 'front')} aria-label="Französisch" className={`${input} w-full`} />
                {fixed === r.key && (
                  <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md bg-good-soft px-1.5 py-0.5 text-[11px] font-semibold text-good-dark" role="status">
                    <Check size={11} /> Akzente
                  </span>
                )}
              </div>
              <input value={r.back} lang="de" onChange={(e) => update(r.key, { back: e.target.value })} aria-label="Deutsch" className={input} />
              <button type="button" aria-label="Zeile löschen" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="flex items-center justify-center text-muted transition-colors hover:text-bad">
                <Trash size={20} />
              </button>
            </div>
            {showExamples && (
              <div className="mt-1.5 grid grid-cols-1 gap-1.5 pl-3 sm:grid-cols-2">
                <input {...frProps(r, 'example')} placeholder="Beispielsatz (Französisch)" aria-label="Beispielsatz" className={`${input} text-sm`} />
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
