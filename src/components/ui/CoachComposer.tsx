import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { blobToJpegBase64 } from '../../lib/ai'
import { MAX_PAGES, useCoachComposer } from '../../lib/coachComposer'
import { Camera, Close, Plus, Right } from './Icons'

/** Eingabefeld für die KI: Plus für Fotos von Buchseiten, Textfeld, Senden. Sitzt in der Tab-Leiste (Handy) oder unten auf der Seite (Computer). */
/** Kleine Vorschau als Daten-Bild: bleibt gültig, auch wenn die Seite später aus dem Feld entfernt wird. */
async function makeThumb(blob: Blob, side = 240): Promise<string> {
  const bmp = await createImageBitmap(blob)
  const k = Math.min(1, side / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c.toDataURL('image/jpeg', 0.7)
}

export function CoachComposer({ className = '' }: { className?: string }) {
  const { input, busy, submit, pages, setInput, addPage, removePage } = useCoachComposer()
  const box = useRef<HTMLTextAreaElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const files = useRef<HTMLInputElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState(false)
  const [loading, setLoading] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  const can = !busy && !!input.trim() && !!submit

  // Höhe an den Text anpassen (bis zu fünf Zeilen)
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  // Menü schließt bei Tipp daneben und mit Esc
  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const attach = async (list: FileList | null) => {
    setMenu(false)
    const imgs = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))
    if (!imgs.length) return
    setProblem(null)
    const room = MAX_PAGES - useCoachComposer.getState().pages.length
    if (room <= 0) return setProblem(`Mehr als ${MAX_PAGES} Seiten auf einmal geht nicht.`)
    setLoading((n) => n + 1)
    try {
      for (const file of imgs.slice(0, room)) {
        try {
          const data = await blobToJpegBase64(file, 1800)
          addPage({ id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, thumb: await makeThumb(file), data })
        } catch {
          setProblem('Ein Foto konnte ich nicht lesen. Probier es mit einem JPG oder PNG.')
        }
      }
      if (imgs.length > room) setProblem(`Mehr als ${MAX_PAGES} Seiten auf einmal geht nicht, der Rest fehlt.`)
    } finally {
      setLoading((n) => n - 1)
      if (camera.current) camera.current.value = ''
      if (files.current) files.current.value = ''
    }
  }

  return (
    <div ref={wrap} className={`relative ${className}`}>
      {/* Angehängte Seiten: diese Seiten sieht die KI, solange sie hier stehen */}
      <AnimatePresence initial={false}>
        {(pages.length > 0 || loading > 0 || problem) && (
          <motion.div key="pages" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="mb-2">
            {(pages.length > 0 || loading > 0) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1" role="list" aria-label="Angehängte Seiten">
                {pages.map((p, i) => (
                  <div key={p.id} role="listitem" className="relative h-14 w-11 shrink-0">
                    <img src={p.thumb} alt={`Seite ${i + 1}`} className="h-14 w-11 rounded-lg border border-black/10 object-cover dark:border-white/15" draggable={false} />
                    <button
                      type="button"
                      onClick={() => removePage(p.id)}
                      aria-label={`Seite ${i + 1} entfernen`}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-surface shadow"
                    >
                      <Close size={10} />
                    </button>
                  </div>
                ))}
                {loading > 0 && <span className="flex h-14 w-11 shrink-0 animate-pulse items-center justify-center rounded-lg bg-black/10 dark:bg-white/10" aria-label="Foto wird vorbereitet" />}
                <span className="shrink-0 pl-1 text-xs font-medium text-muted">
                  {pages.length} {pages.length === 1 ? 'Seite' : 'Seiten'} für die KI
                </span>
              </div>
            )}
            {problem && <p className="text-xs font-medium text-bad-dark" role="alert">{problem}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (can) submit?.()
        }}
      >
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label="Foto oder Seite hinzufügen"
          aria-haspopup="menu"
          aria-expanded={menu}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/55 text-ink dark:border-white/10 dark:bg-white/10"
        >
          <motion.span animate={{ rotate: menu ? 45 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }} className="flex">
            <Plus size={22} />
          </motion.span>
        </button>
        <label htmlFor="coach-input" className="sr-only">
          Nachricht an die KI
        </label>
        <textarea
          id="coach-input"
          ref={box}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (can) submit?.()
            }
          }}
          placeholder={pages.length ? 'Was soll die KI damit machen?' : 'Frag die KI …'}
          enterKeyHint="send"
          className="max-h-[120px] min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-black/5 bg-white/55 px-4 py-2.5 text-ink outline-none placeholder:text-muted focus:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:focus:bg-white/15"
        />
        <motion.button
          type="submit"
          initial={{ scale: 0.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 0.14 }}
          disabled={!can}
          aria-label="Senden"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-strong text-on-brand shadow-[0_6px_16px_-6px_var(--brand)] transition-opacity disabled:opacity-40 disabled:shadow-none"
        >
          <Right size={20} />
        </motion.button>
      </form>

      {/* Menü über dem Plus */}
      <AnimatePresence>
        {menu && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            style={{ transformOrigin: 'bottom left' }}
            className="absolute bottom-full left-0 z-50 mb-3 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
          >
            <button type="button" role="menuitem" className="press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium hover:bg-snow" onClick={() => camera.current?.click()}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Camera size={20} /></span>
              Foto aufnehmen
            </button>
            <button type="button" role="menuitem" className="press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium hover:bg-snow" onClick={() => files.current?.click()}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Plus size={20} /></span>
              Fotos auswählen
            </button>
            <p className="px-3 pb-2 pt-1 text-xs leading-snug text-muted">Die KI sieht die Seiten erst, wenn du sendest. Am besten ein scharfes Foto pro Seite, gerade von oben.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => void attach(e.target.files)} />
      <input ref={files} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => void attach(e.target.files)} />
    </div>
  )
}
