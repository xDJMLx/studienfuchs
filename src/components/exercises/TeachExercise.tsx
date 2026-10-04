import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { speak } from '../../lib/speech'
import type { Exercise } from '../../lib/types'
import { Fr, SpeakButton } from './common'
import { ReadAloud, speechLang } from './CardExercises'

/** Neue Wörter: höchstens zwei auf einmal, mit Aussprache und Beispielsatz. Direkt danach werden sie abgefragt. */
export function TeachExercise({ exercise: ex }: { exercise: Extract<Exercise, { kind: 'teach' }> }) {
  const reduce = useReducedMotion()

  // Karten-Stapel: nur vorlesen, wenn es eine Sprache gibt. Ohne Angabe (Kurs-Wortschatz) ist es Französisch.
  const lang = ex.lang === 'none' ? undefined : (ex.lang ?? 'fr')
  const cards = ex.lang !== undefined
  useEffect(() => {
    if (!lang) return
    const t = setTimeout(() => speak(ex.items[0].front, speechLang(lang)), 350)
    return () => clearTimeout(t)
  }, [ex.items, lang])

  return (
    <div>
      <p className="eyebrow mb-1">Neu</p>
      <h2 className="mb-5 text-[25px] font-extrabold">{cards ? (ex.items.length === 1 ? 'Eine neue Karte' : 'Zwei neue Karten') : ex.items.length === 1 ? 'Ein neues Wort' : 'Zwei neue Wörter'}</h2>
      <ul className="grid gap-4">
        {ex.items.map((it, i) => (
          <motion.li
            key={it.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.08 * i, type: 'spring', stiffness: 260, damping: 24 }}
            className="card p-5"
          >
            <div className="flex items-start gap-4">
              {cards ? <ReadAloud text={it.front} lang={lang} /> : <SpeakButton text={it.front} />}
              <div className="min-w-0 flex-1">
                {cards ? <p className={`whitespace-pre-wrap font-extrabold leading-tight ${it.front.length > 40 ? 'text-[21px]' : 'text-[28px]'}`}>{it.front}</p> : <Fr className="block text-[32px] font-extrabold leading-tight">{it.front}</Fr>}
                <p className="mt-1 whitespace-pre-wrap text-lg text-muted">{it.back}</p>
              </div>
            </div>
            {it.example && (
              <button
                type="button"
                onClick={() => lang && speak(it.example as string, speechLang(lang))}
                className="mt-4 w-full rounded-xl bg-snow px-4 py-3 text-left transition-colors hover:bg-line/60"
                aria-label="Beispielsatz vorlesen"
              >
                {cards ? <span className="block font-medium text-brand-dark">{it.example}</span> : <Fr className="block font-medium text-brand-dark">{it.example}</Fr>}
                <span className="block text-sm text-muted">{it.exampleDe}</span>
              </button>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
