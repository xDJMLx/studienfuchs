import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SpeakButton } from '../../components/exercises/common'
import { Close } from '../../components/ui/Icons'
import { shuffle } from '../../lib/generateExercises'
import { itemsForScope, scopeLabel, type Scope } from '../../lib/scope'
import { playCorrect, playWrong } from '../../lib/sound'
import { speak } from '../../lib/speech'
import type { Grade } from '../../lib/srs'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'

const DECK = 15

/** Karteikarten: Vorderseite (Französisch) ansehen, überlegen, umdrehen, selbst bewerten. Wischen oder Tasten funktionieren auch. */
export function FlashcardsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setId } = useParams()
  const finishSession = useStore((s) => s.finishSession)
  const reduce = useReducedMotion()

  const scope = (setId ? `set:${setId}` : (params.get('scope') ?? 'due')) as Scope
  const exitTo = setId ? `/sets/${setId}` : '/practice'

  const deck = useMemo(() => {
    const { cards, favorites, sets } = useStore.getState()
    return shuffle(itemsForScope(scope, { cards, favorites, sets })).slice(0, DECK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [queue, setQueue] = useState<Item[]>(deck)
  const [flipped, setFlipped] = useState(false)
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [done, setDone] = useState(false)
  const [known, setKnown] = useState(0)
  const [total] = useState(deck.length)

  const card = queue[0]
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10])
  const hintGood = useTransform(x, [0, 120], [0, 1])
  const hintBad = useTransform(x, [-120, 0], [1, 0])

  useEffect(() => {
    if (card) {
      const t = setTimeout(() => speak(card.front), 250)
      return () => clearTimeout(t)
    }
  }, [card])

  const rate = (grade: Grade) => {
    if (!card) return
    const wasAgain = grade === 'again'
    if (wasAgain) playWrong()
    else playCorrect()
    setGrades((g) => {
      const prev = g[card.id]
      // Einmal "nochmal" gedrückt bleibt als schwächste Bewertung stehen
      return { ...g, [card.id]: prev === 'again' ? 'again' : grade }
    })
    setFlipped(false)
    x.set(0)
    if (wasAgain) setQueue((q) => [...q.slice(1), card])
    else {
      setKnown((k) => k + 1)
      setQueue((q) => q.slice(1))
    }
  }

  useEffect(() => {
    if (queue.length === 0 && total > 0 && !done) {
      finishSession({ xp: Math.max(5, Math.round(total * 1.2)), grades, accuracy: 1 })
      setDone(true)
    }
  }, [queue.length, total, done, finishSession, grades])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && e.key === 'ArrowRight') rate('good')
      else if (flipped && e.key === 'ArrowLeft') rate('again')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!deck.length) return <Navigate to={exitTo} replace />

  if (done) {
    const again = Object.values(grades).filter((g) => g === 'again').length
    return (
      <div className="flex h-full flex-col items-center justify-center bg-page px-6 text-center">
        <motion.div initial={reduce ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <h1 className="text-3xl font-semibold">Stapel geschafft</h1>
          <p className="mt-2 text-muted">{total} Karten durch. {again > 0 ? `${again} davon musstest du wiederholen, sie kommen bald wieder dran.` : 'Alle saßen auf Anhieb.'}</p>
          <button className="btn btn-primary mt-6" onClick={() => navigate(exitTo)} autoFocus>Fertig</button>
        </motion.div>
      </div>
    )
  }

  const progress = total ? (total - queue.length) / total : 1

  return (
    <div className="flex h-full flex-col bg-page">
      <header className="mx-auto flex w-full max-w-xl items-center gap-4 px-4 py-4">
        <button type="button" onClick={() => navigate(exitTo)} aria-label="Beenden" className="text-muted hover:text-ink">
          <Close size={26} />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-snow" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${Math.max(progress * 100, 3)}%` }} transition={{ type: 'spring', stiffness: 220, damping: 30 }} />
        </div>
        <span className="w-14 text-right text-sm text-muted">{known}/{total}</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 pb-6">
        <p className="eyebrow mb-4">{scopeLabel(scope)}</p>
        <div className="relative w-full" style={{ perspective: 1200 }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={card.id + queue.length}
              style={{ x, rotate }}
              drag={flipped ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => {
                if (info.offset.x > 110) rate('good')
                else if (info.offset.x < -110) rate('again')
              }}
              initial={reduce ? false : { opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="cursor-pointer select-none"
              onClick={() => setFlipped((f) => !f)}
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 22 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative h-72 w-full"
              >
                <div className="card absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ backfaceVisibility: 'hidden' }}>
                  <SpeakButton text={card.front} />
                  <p className="text-4xl font-semibold leading-tight">{card.front}</p>
                  <p className="text-sm text-muted">Tippen zum Umdrehen</p>
                </div>
                <div className="card absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <p className="text-3xl font-semibold leading-tight">{card.back}</p>
                  {card.example && (
                    <div className="mt-2 rounded-xl bg-snow px-4 py-3">
                      <p className="font-medium text-brand-dark">{card.example}</p>
                      <p className="text-sm text-muted">{card.exampleDe}</p>
                    </div>
                  )}
                </div>
              </motion.div>
              <motion.span style={{ opacity: hintGood }} className="pointer-events-none absolute right-4 top-4 rounded-lg bg-good px-3 py-1 text-sm font-semibold text-white">Gewusst</motion.span>
              <motion.span style={{ opacity: hintBad }} className="pointer-events-none absolute left-4 top-4 rounded-lg bg-bad px-3 py-1 text-sm font-semibold text-white">Nochmal</motion.span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 grid h-14 w-full grid-cols-2 gap-3">
          {flipped ? (
            <>
              <button className="btn btn-ghost !text-bad-dark" onClick={() => rate('again')}>Nochmal</button>
              <button className="btn btn-good" onClick={() => rate('good')}>Gewusst</button>
            </>
          ) : (
            <button className="btn btn-primary col-span-2" onClick={() => setFlipped(true)}>Umdrehen</button>
          )}
        </div>
        <p className="mt-3 hidden text-xs text-muted sm:block">Leertaste = umdrehen · ← nochmal · → gewusst</p>
      </main>
    </div>
  )
}
