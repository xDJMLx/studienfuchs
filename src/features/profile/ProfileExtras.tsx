import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { COURSE_STATS } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Check, Lock, Right } from '../../components/ui/Icons'
import { EASE } from '../../components/ui/motion'
import { Sheet } from '../../components/ui/Sheet'
import { BOX_NAMES, boxCounts } from '../../lib/boxes'
import { daysTo } from '../../lib/coach'
import { buildWeeklyReport } from '../../lib/report'
import { ACCENT_SWATCH, ACCENTS, AVATARS, isRewardUnlocked, rewardHint, type Reward } from '../../lib/rewards'
import { levelFromXp } from '../../lib/xp'
import { streakNow, useStore } from '../../store/useStore'
import { useDue, useLearned } from '../review/ReviewPage'

/** Karteikasten: wie fest die geübten Wörter sitzen, verteilt auf fünf Fächer (wie bei Phase 6, nur ohne Abo). */
export function Karteikasten() {
  const reduce = useReducedMotion()
  const cards = useStore((s) => s.cards)
  const { learned } = useLearned()
  const counts = useMemo(() => boxCounts(cards), [cards])
  const max = Math.max(1, ...counts)
  const unseen = Math.max(0, COURSE_STATS.words - learned.length)
  const shades = ['bg-bad', 'bg-gold', 'bg-brand', 'bg-good', 'bg-good']
  return (
    <section className="card mt-4 p-5" aria-label="Karteikasten">
      <h2 className="font-semibold">Dein Karteikasten</h2>
      <p className="mt-0.5 text-sm text-muted">Je weiter rechts, desto länger kannst du ein Wort in Ruhe lassen.</p>
      <div className="mt-4 grid h-32 grid-cols-5 items-end gap-2.5" role="img" aria-label={counts.map((c, i) => `Fach ${i + 1}: ${c} Wörter`).join(', ')}>
        {counts.map((c, i) => (
          <div key={i} className="flex h-full flex-col items-center justify-end gap-1">
            <span className="text-sm font-bold tabular-nums">{c}</span>
            <motion.span
              className={`w-full rounded-t-xl ${shades[i]} ${c === 0 ? 'opacity-25' : ''}`}
              initial={reduce ? false : { height: 0 }}
              animate={{ height: `${Math.max(6, (c / max) * 84)}%` }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.05 * i }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-2.5 text-center">
        {BOX_NAMES.map((n, i) => (
          <div key={n}>
            <p className="text-xs font-bold">Fach {i + 1}</p>
            <p className="text-[11px] leading-tight text-muted">{n}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-snow px-3 py-2 text-sm text-muted">
        Noch nicht gesehen: <b className="text-ink">{unseen}</b> von {COURSE_STATS.words} Wörtern.
      </p>
    </section>
  )
}

/** Sammlung: Zubehör für den Fuchs und Farben der App, freigeschaltet über Level und längste Serie. */
export function Sammlung() {
  const { xp, streak, bestStreak, avatar, accent, setAvatar, setAccent } = useStore()
  const progress = { level: levelFromXp(xp).level, bestStreak: Math.max(bestStreak ?? 0, streakNow(streak)) }
  const open = (r: Reward) => isRewardUnlocked(r, progress)

  return (
    <section className="card mt-4 p-5" aria-label="Sammlung">
      <h2 className="font-semibold">Sammlung</h2>
      <p className="mt-0.5 text-sm text-muted">Schalte Zubehör und Farben frei: mit Level und einer langen Serie.</p>

      <h3 className="mb-2 mt-4 text-sm font-semibold">Fuchs</h3>
      <ul className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Zubehör für den Fuchs">
        {AVATARS.map((r) => {
          const ok = open(r)
          const on = avatar === r.id
          return (
            <li key={r.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!ok}
                aria-label={ok ? r.label : `${r.label}, gesperrt: ${rewardHint(r)}`}
                onClick={() => setAvatar(r.id)}
                className={`press relative flex w-full flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'} ${ok ? '' : 'opacity-55'}`}
              >
                <Mascot size={44} accessory={r.id} />
                <span className="text-[11px] font-semibold leading-tight">{r.label}</span>
                <span className="text-[10px] leading-none text-muted">{ok ? (on ? 'aktiv' : ' ') : rewardHint(r)}</span>
                {!ok && <Lock size={12} className="absolute right-1.5 top-1.5 text-muted" />}
              </button>
            </li>
          )
        })}
      </ul>

      <h3 className="mb-2 mt-5 text-sm font-semibold">Farbe der App</h3>
      <ul className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Farbe der App">
        {ACCENTS.map((r) => {
          const ok = open(r)
          const on = accent === r.id
          return (
            <li key={r.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!ok}
                aria-label={ok ? r.label : `${r.label}, gesperrt: ${rewardHint(r)}`}
                onClick={() => setAccent(r.id)}
                className={`press relative flex w-full flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'} ${ok ? '' : 'opacity-55'}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: ACCENT_SWATCH[r.id] }}>
                  {on ? <Check size={16} /> : !ok ? <Lock size={14} /> : null}
                </span>
                <span className="text-[11px] font-semibold leading-tight">{r.label}</span>
                <span className="text-[10px] leading-none text-muted">{ok ? (on ? 'aktiv' : ' ') : rewardHint(r)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Wochenbericht zum Teilen (z. B. mit den Eltern): Text über die letzten sieben Tage, ohne Namen. */
export function WeeklyReport() {
  const { xpByDay, dailyGoal, lessons, streak, bestStreak, xp, sets, examDates } = useStore()
  const { learned, byMastery } = useLearned()
  const { due } = useDue()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const report = useMemo(() => {
    const next = Object.entries(examDates)
      .map(([id, date]) => ({ set: sets.find((s) => s.id === id), days: daysTo(date, new Date()) }))
      .filter((e) => e.set && e.days >= 0)
      .sort((a, b) => a.days - b.days)[0]
    return buildWeeklyReport({
      xpByDay,
      dailyGoal,
      lessons,
      streak: streakNow(streak),
      bestStreak: bestStreak ?? 0,
      level: levelFromXp(xp).level,
      learnedWords: learned.length,
      masteredWords: byMastery[1],
      dueNow: due.length,
      nextExam: next ? { title: next.set!.title, days: next.days } : null,
    })
  }, [xpByDay, dailyGoal, lessons, streak, bestStreak, xp, sets, examDates, learned.length, byMastery, due.length])

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Studienfuchs Wochenbericht', text: report.text })
        return
      }
      await navigator.clipboard.writeText(report.text)
      setNote('Text kopiert. Du kannst ihn jetzt einfügen und verschicken.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote('Das Teilen hat nicht geklappt. Markiere den Text und kopiere ihn von Hand.')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.text)
      setNote('Text kopiert.')
    } catch {
      setNote('Kopieren hat nicht geklappt.')
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="card lift mt-4 flex w-full items-center gap-4 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
          <Right size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Wochenbericht teilen</span>
          <span className="block text-sm text-muted">Für Eltern oder Lehrer: {report.activeDays} von 7 Tagen aktiv, {report.weekXp} XP.</span>
        </span>
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setNote(null) }} title="Wochenbericht">
        <pre className="whitespace-pre-wrap rounded-2xl bg-snow p-4 font-sans text-[15px] leading-relaxed select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{report.text}</pre>
        <p className="mt-2 text-xs text-muted">Der Bericht enthält keinen Namen und wird nirgends gespeichert. Er geht nur dorthin, wohin du ihn teilst.</p>
        {note && <p className="mt-3 rounded-xl bg-good-soft px-3 py-2 text-sm font-medium text-good-dark" role="status">{note}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-ghost press" onClick={copy}>Kopieren</button>
          <button className="btn btn-primary press flex-1" onClick={share}>Teilen</button>
        </div>
      </Sheet>
    </>
  )
}
