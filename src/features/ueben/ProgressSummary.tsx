import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { mascotBus } from '../../lib/mascotBus'
import { Check, Coin, Star, Trophy } from '../../components/ui/Icons'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { SPRING } from '../../components/ui/motion'
import type { Deck } from '../../lib/decks'
import { levelOfSolid, type ProgressDiff } from '../../lib/progress'
import { helpSubject } from '../../lib/subjects'
import type { Arbeit } from '../../lib/types'

const MILESTONE_TEXT: Record<number, string> = {
  25: 'Ein Viertel sitzt schon.',
  50: 'Halbzeit: Die Hälfte sitzt!',
  75: 'Fast geschafft: drei Viertel sitzen.',
  100: 'Alles sitzt. Du bist bereit!',
}

/** "Das hat sich getan": Was diese Runde gebracht hat, mit Glückwünschen für Level, Sterne und Arbeiten. */
export function ProgressSummary({ diff, bonus = 0, decks, arbeiten, solidBySubject, subjects }: { diff: ProgressDiff; bonus?: number; decks: Deck[]; arbeiten: Arbeit[]; solidBySubject: Record<string, number>; subjects: string[] }) {
  const reduce = useReducedMotion()
  // Level, Sterne und Arbeits-Marken: Der Fuchs freut sich mit
  const celebrate = diff.levelUps.length > 0 || diff.newStars.length > 0 || diff.arbeit.some((a) => a.milestone)
  useEffect(() => {
    if (!celebrate) return
    const id = window.setTimeout(() => mascotBus.emit('levelup'), 1100)
    return () => clearTimeout(id)
  }, [celebrate])
  const deckTitle = (id: string) => decks.find((d) => d.id === id)?.title ?? 'Karteikarten'
  const arbeitOf = (id: string) => arbeiten.find((a) => a.id === id)
  const anything = diff.learned > 0 || diff.solidGain > 0 || diff.levelUps.length || diff.newStars.length || diff.arbeit.length
  if (!anything) return null

  const pop = (i: number) => ({ initial: reduce ? false : { opacity: 0, scale: 0.85, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { ...SPRING.bouncy, delay: 0.5 + i * 0.12 } })
  let n = 0

  return (
    <section className="mt-5 w-full max-w-sm text-left" aria-label="Das hat sich getan">
      <h2 className="mb-2 text-center text-sm font-extrabold uppercase tracking-[0.1em] text-muted">Das hat sich getan</h2>
      <div className="grid gap-2.5">
        {(diff.learned > 0 || diff.solidGain > 0) && (
          <motion.div {...pop(n++)} className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border-2 border-line bg-surface px-3 py-2.5 text-center">
              <div className="text-[26px] font-black leading-none text-sky-dark">+{diff.learned}</div>
              <div className="mt-1 text-xs font-bold text-muted">{diff.learned === 1 ? 'neue Karte gelernt' : 'neue Karten gelernt'}</div>
            </div>
            <div className="rounded-2xl border-2 border-line bg-surface px-3 py-2.5 text-center">
              <div className="text-[26px] font-black leading-none text-good-dark">+{diff.solidGain}</div>
              <div className="mt-1 text-xs font-bold text-muted">{diff.solidGain === 1 ? 'Karte sitzt jetzt' : 'Karten sitzen jetzt'}</div>
            </div>
          </motion.div>
        )}

        {bonus > 0 && (
          <motion.p {...pop(n++)} className="flex items-center justify-center gap-2 rounded-2xl bg-gold/20 px-4 py-2 text-center font-extrabold text-gold-dark">
            <Coin size={20} /> +{bonus} Münzen für deine Meilensteine
          </motion.p>
        )}

        {diff.levelUps.map((l) => {
          const s = helpSubject(l.subject)
          return (
            <motion.div key={l.subject} {...pop(n++)} className="flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3" style={{ borderColor: s?.c, background: `color-mix(in srgb, ${s?.c ?? '#888'} 12%, var(--surface))` }}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: s?.c, boxShadow: `0 3px 0 ${s?.s}` }}>
                <HelpSubjectIcon id={l.subject} ink={s?.c ?? '#888'} size={28} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold uppercase tracking-wide text-muted">Level aufgestiegen</span>
                <span className="block text-[17px] font-black leading-tight">{s?.name}: Level {l.to} · {l.name}</span>
              </span>
            </motion.div>
          )
        })}

        {diff.newStars.map((st) => (
          <motion.div key={st.deckId} {...pop(n++)} className="flex items-center gap-3 rounded-2xl border-2 border-gold bg-gold/10 px-3.5 py-3">
            <span className="flex gap-0.5 text-gold" aria-label={`${st.stars} von 3 Sternen`}>
              {[0, 1, 2].map((i) => (
                <Star key={i} size={22} className={i < st.stars ? '' : 'opacity-25'} />
              ))}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-gold-dark">{st.stars === 3 ? 'Karteikarten gemeistert' : 'Neuer Stern'}</span>
              <span className="block truncate font-extrabold">{deckTitle(st.deckId)}</span>
            </span>
          </motion.div>
        ))}

        {diff.arbeit.map((a) => {
          const ar = arbeitOf(a.id)
          if (!ar) return null
          return (
            <motion.div key={a.id} {...pop(n++)} className="rounded-2xl border-2 border-line bg-surface px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-extrabold">{ar.title}</span>
                <span className="shrink-0 text-sm font-black tabular-nums text-good-dark">{a.from} % → {a.to} %</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={a.to} aria-valuemin={0} aria-valuemax={100}>
                <motion.div className="h-full rounded-full bg-good" initial={{ width: `${a.from}%` }} animate={{ width: `${a.to}%` }} transition={{ duration: reduce ? 0 : 0.9, delay: 0.9, ease: 'easeOut' }} />
              </div>
              {a.milestone && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-extrabold text-good-dark">
                  {a.milestone === 100 ? <Trophy size={16} /> : <Check size={16} />} {MILESTONE_TEXT[a.milestone]}
                </p>
              )}
            </motion.div>
          )
        })}

        {/* Nächstes Ziel je Fach, das in dieser Runde geübt wurde */}
        {subjects.slice(0, 2).map((id) => {
          const lv = levelOfSolid(solidBySubject[id] ?? 0)
          if (!lv.next || diff.levelUps.some((l) => l.subject === id)) return null
          const s = helpSubject(id)
          return (
            <motion.div key={id} {...pop(n++)} className="rounded-2xl border-2 border-line bg-surface px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-extrabold">{s?.name}: Level {lv.level}</span>
                <span className="font-bold text-muted">noch {lv.toNext} {lv.toNext === 1 ? 'Karte' : 'Karten'} bis {lv.next}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full" style={{ width: `${Math.round(lv.pct * 100)}%`, background: s?.c }} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
