import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mathItems } from '../../content'
import { useItemIndex } from '../review/ReviewPage'
import { BLITZ_SKILLS, makeMathBlitz } from '../../content/math'
import type { Level } from '../../content/math/core'
import { MathText } from '../../components/math/MathText'
import { Mascot } from '../../components/mascot/Mascot'
import { Confetti } from '../../components/ui/Confetti'
import { Close, Coin, Flame, Xp } from '../../components/ui/Icons'
import { CountUp, EASE, SPRING } from '../../components/ui/motion'
import { BLITZ_MIN_WORDS, BLITZ_PENALTY, BLITZ_SECONDS, makeQuestion, multiplier, pointsFor, type BlitzQuestion } from '../../lib/blitz'
import { mascotBus } from '../../lib/mascotBus'
import { playCorrect, playDone, playWrong } from '../../lib/sound'
import type { Item } from '../../lib/types'
import { useStore } from '../../store/useStore'

type Phase = 'ready' | 'play' | 'done'

/** Blitzrunde: 60 Sekunden, so viele Wörter wie möglich. Kein Lernplan-Druck, nur Tempo und Rekord. */
export function BlitzPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const cards = useStore((s) => s.cards)
  const best = useStore((s) => s.blitzBest ?? 0)
  const outfit = useStore((s) => s.outfit)
  const finishBlitz = useStore((s) => s.finishBlitz)
  const math = useStore((s) => s.subject ?? 'fr') === 'math'
  const index = useItemIndex()

  const pool = useMemo(() => {
    // Mathe: nur kurze Kopfrechen-Themen, die schon gelernt sind
    if (math) return BLITZ_SKILLS.filter((id) => cards[id]).flatMap((id) => (mathItems.get(id) ? [mathItems.get(id) as Item] : []))
    // Alle Fächer: gelernte Karten mit kurzer Antwort (lange Definitionen passen nicht in eine Blitzfrage)
    return Object.keys(cards).flatMap((id) => {
      const it = index.get(id)
      return it && it.back.length <= 40 && it.front.length <= 70 ? [it] : []
    })
  }, [cards, math, index])

  const [phase, setPhase] = useState<Phase>('ready')
  const [q, setQ] = useState<BlitzQuestion | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [left, setLeft] = useState(BLITZ_SECONDS)
  const [flash, setFlash] = useState<{ text: string; good: boolean; key: number } | null>(null)
  const [missed, setMissed] = useState<Item[]>([])
  const [reward, setReward] = useState<BlitzReward | null>(null)
  const endAt = useRef(0)
  const lastId = useRef<string | undefined>(undefined)
  const finished = useRef(false)
  const lock = useRef(false)
  const stats = useRef({ score: 0, correct: 0 })

  const comboRef = useRef(0)
  const next = useCallback(() => {
    let nq: BlitzQuestion
    if (math) {
      // Schwerer, je länger die Reihe richtiger Antworten ist
      const level = (comboRef.current >= 8 ? 3 : comboRef.current >= 4 ? 2 : 1) as Level
      const m = makeMathBlitz(pool.map((i) => i.id), level, undefined, lastId.current)
      nq = { item: mathItems.get(m.skillId) as Item, toFrench: false, prompt: m.prompt, options: m.options, answer: m.answer }
    } else nq = makeQuestion(pool, Math.random, lastId.current)
    lastId.current = nq.item.id
    setQ(nq)
    setPicked(null)
    lock.current = false
  }, [pool, math])

  const start = () => {
    comboRef.current = 0
    finished.current = false
    stats.current = { score: 0, correct: 0 }
    setScore(0)
    setCombo(0)
    setCorrect(0)
    setMissed([])
    setReward(null)
    setLeft(BLITZ_SECONDS)
    endAt.current = Date.now() + BLITZ_SECONDS * 1000
    next()
    setPhase('play')
  }

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    const r = finishBlitz(stats.current)
    setReward(r)
    setPhase('done')
    playDone()
    if (r.record) window.setTimeout(() => mascotBus.emit('levelup'), 700)
    else window.setTimeout(() => mascotBus.emit('cheer'), 500)
  }, [finishBlitz])

  // Uhr
  useEffect(() => {
    if (phase !== 'play') return
    const id = window.setInterval(() => {
      const ms = endAt.current - Date.now()
      setLeft(Math.max(0, ms / 1000))
      if (ms <= 0) finish()
    }, 100)
    return () => clearInterval(id)
  }, [phase, finish])

  const answer = useCallback(
    (opt: string) => {
      if (phase !== 'play' || !q || lock.current) return
      lock.current = true
      setPicked(opt)
      const ok = opt === q.answer
      if (ok) {
        const pts = pointsFor(combo)
        stats.current = { score: stats.current.score + pts, correct: stats.current.correct + 1 }
        setScore((s) => s + pts)
        setCorrect((c) => c + 1)
        setCombo((c) => c + 1)
        comboRef.current = combo + 1
        setFlash({ text: `+${pts}`, good: true, key: Date.now() })
        playCorrect(combo + 1)
        mascotBus.emit('correct')
        window.setTimeout(next, 260)
      } else {
        endAt.current -= BLITZ_PENALTY * 1000
        setCombo(0)
        comboRef.current = 0
        setMissed((m) => (m.some((x) => x.id === q.item.id) ? m : [...m, q.item]))
        setFlash({ text: `−${BLITZ_PENALTY} s`, good: false, key: Date.now() })
        playWrong()
        mascotBus.emit('wrong')
        window.setTimeout(next, 750)
      }
    },
    [phase, q, combo, next],
  )

  // Tasten 1 bis 4
  useEffect(() => {
    if (phase !== 'play' || !q) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && q.options[n - 1]) answer(q.options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, q, answer])

  const mult = multiplier(combo)
  const tooFew = pool.length < (math ? 2 : BLITZ_MIN_WORDS)

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => navigate('/')} aria-label="Schließen" className="press -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:text-ink">
          <Close size={26} />
        </button>
        {phase === 'play' ? (
          <>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-snow" role="timer" aria-label={`Noch ${Math.ceil(left)} Sekunden`}>
              <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${left <= 10 ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${(left / BLITZ_SECONDS) * 100}%` }} />
            </div>
            <span className={`w-9 text-right text-lg font-extrabold tabular-nums ${left <= 10 ? 'text-bad' : 'text-ink'}`}>{Math.ceil(left)}</span>
          </>
        ) : (
          <span className="flex-1" />
        )}
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 pb-6">
        {phase === 'ready' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Mascot mood="cheer" size={150} pose="full" alive listen outfit={outfit} />
            <h1 className="mt-3 text-3xl font-extrabold">Blitzrunde</h1>
            <p className="mt-1 max-w-xs text-muted">60 Sekunden. {math ? 'Rechne im Kopf und wähle die richtige Antwort, so schnell du kannst. Mit jeder richtigen Reihe wird der Faktor größer und die Aufgaben werden etwas kniffliger.' : 'Such zu jeder Karte die richtige Antwort, so schnell du kannst. Mit jeder richtigen Reihe wird der Faktor größer.'}</p>
            <ul className="mt-4 grid gap-1 text-sm text-muted">
              <li>Richtig: 10 Punkte, ab 4 in Folge ×2, ab 8 ×3, ab 12 ×4</li>
              <li>Falsch: {BLITZ_PENALTY} Sekunden weniger und die Reihe ist weg</li>
            </ul>
            {best > 0 && <p className="mt-4 rounded-xl bg-gold/20 px-4 py-2 font-semibold text-gold-dark">Dein Rekord: {best} Punkte</p>}
            {tooFew ? (
              <>
                <p className="mt-5 max-w-xs text-sm text-muted">{math ? 'Dafür kennst du noch zu wenige Rechenthemen. Schließe erst ein, zwei Lektionen ab, dann geht es los.' : 'Dafür kennst du noch zu wenige Karten. Übe erst ein paar Karten, dann geht es los.'}</p>
                <button type="button" className="btn btn-primary press mt-4 w-full sm:w-64" onClick={() => navigate('/')}>
                  Zum Lernpfad
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-shine press mt-6 w-full sm:w-64" onClick={start} autoFocus>
                Los!
              </button>
            )}
          </div>
        )}

        {phase === 'play' && q && (
          <>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2">
                <Mascot mood="happy" size={64} alive listen outfit={outfit} />
                <span className="text-3xl font-extrabold tabular-nums">{score}</span>
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                {combo >= 2 && (
                  <motion.span
                    key={`c${combo}`}
                    initial={reduce ? false : { opacity: 0, scale: 0.5, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={SPRING.bouncy}
                    className="flex items-center gap-1.5 rounded-xl bg-fox/15 px-3 py-1.5 font-extrabold text-fox-dark"
                  >
                    <Flame size={18} /> {combo}
                    {mult > 1 && <span className="rounded-md bg-fox px-1.5 text-sm text-white">×{mult}</span>}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
                <motion.div
                  key={q.item.id + q.prompt}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="card mb-4 flex min-h-[7.5rem] flex-col items-center justify-center px-4 py-6 text-center"
                >
                  <span className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{math ? 'Rechne' : q.toFrench ? 'Und andersherum' : 'Was ist die Antwort?'}</span>
                  {math ? <MathText className={`font-extrabold leading-snug ${q.prompt.length > 40 ? 'text-xl' : 'text-3xl'}`}>{q.prompt}</MathText> : <span className={`font-extrabold leading-tight ${q.prompt.length > 40 ? 'text-xl' : 'text-3xl'}`}>{q.prompt}</span>}
                </motion.div>
              <AnimatePresence>
                {flash && (
                  <motion.span
                    key={flash.key}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -34, scale: 1.2 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    onAnimationComplete={() => setFlash((f) => (f?.key === flash.key ? null : f))}
                    className={`pointer-events-none absolute right-3 top-2 text-2xl font-extrabold ${flash.good ? 'text-good' : 'text-bad'}`}
                  >
                    {flash.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="grid gap-2.5" role="group" aria-label="Antworten">
              {q.options.map((o, i) => {
                const isAnswer = o === q.answer
                const state = picked === null ? '' : isAnswer ? 'tile-correct' : o === picked ? 'tile-wrong' : 'opacity-50'
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => answer(o)}
                    disabled={picked !== null}
                    className={`tile press w-full !justify-start !py-4 text-left ${state}`}
                  >
                    <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-line text-sm font-bold text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 text-[17px] font-semibold">{math ? <MathText>{o}</MathText> : o}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {phase === 'done' && reward && (
          <div className="relative flex flex-1 flex-col items-center pt-2 text-center">
            {reward.record && <Confetti count={60} />}
            <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <Mascot mood="cheer" size={140} pose="full" alive listen outfit={outfit} />
            </motion.div>
            <h1 className="mt-3 text-3xl font-extrabold">{reward.record ? 'Neuer Rekord!' : 'Geschafft!'}</h1>
            <p className="mt-1 text-muted">{math ? (correct === 1 ? 'Eine Aufgabe' : `${correct} Aufgaben`) : correct === 1 ? 'Eine Karte' : `${correct} Karten`} richtig in 60 Sekunden.</p>
            <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gold bg-surface px-2 py-3">
                <div className="text-2xl font-extrabold text-gold-dark"><CountUp to={score} delay={0.2} /></div>
                <div className="text-[11px] font-medium text-muted">Punkte</div>
              </div>
              <div className="rounded-2xl border border-line bg-surface px-2 py-3">
                <div className="flex items-center justify-center gap-1 text-2xl font-extrabold"><Xp size={20} /> +{reward.xp}</div>
                <div className="text-[11px] font-medium text-muted">XP</div>
              </div>
              <div className="rounded-2xl border border-line bg-surface px-2 py-3">
                <div className="flex items-center justify-center gap-1 text-2xl font-extrabold"><Coin size={20} /> +{reward.coins}</div>
                <div className="text-[11px] font-medium text-muted">Münzen</div>
              </div>
            </div>
            {!reward.record && best > 0 && <p className="mt-3 text-sm text-muted">Rekord: {best} Punkte. Noch {Math.max(1, best - score + 1)} bis zum neuen.</p>}
            {missed.length > 0 && (
              <div className="mt-6 w-full max-w-sm text-left">
                <h2 className="mb-2 font-semibold">Hier hat es gehakt</h2>
                <ul className="grid gap-2">
                  {missed.map((m) => (
                    <li key={m.id} className="card flex items-center justify-between gap-3 px-4 py-2">
                      <span className="font-medium">{m.front}</span>
                      <span className="text-right text-sm text-muted">{m.back}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex w-full flex-col gap-3 sm:w-72">
              <button type="button" className="btn btn-primary btn-shine press" onClick={start} autoFocus>
                Nochmal
              </button>
              <button type="button" className="btn btn-ghost press" onClick={() => navigate('/practice')}>
                Fertig
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

type BlitzReward = ReturnType<ReturnType<typeof useStore.getState>['finishBlitz']>
