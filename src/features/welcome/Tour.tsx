import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Back } from '../../components/ui/Icons'

/** Eine kleine Nachbildung der App für die Einführung: Sie zeigt, was man tun kann, ohne dass man etwas einrichten muss. */
const Phone = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto w-full max-w-[17rem] rounded-[1.6rem] border border-ink/10 bg-surface p-3 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)]" aria-hidden>
    {children}
  </div>
)

function CardsArt({ reduce }: { reduce: boolean }) {
  return (
    <Phone>
      <p className="mb-2 text-[11px] font-bold text-muted">Neue Karteikarten · Biologie</p>
      <div className="mb-2 rounded-xl bg-snow px-3 py-2 text-[12px] font-semibold">Zellorganellen und ihre Aufgaben, 20 Karten</div>
      {['Was macht das Mitochondrium?', 'Was ist ein Ribosom?', 'Wozu dient die Vakuole?'].map((q, i) => (
        <motion.div key={q} initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.25 + i * 0.18, type: 'spring', stiffness: 420, damping: 26 }} className="mb-1.5 flex items-center justify-between rounded-xl border border-ink/10 px-3 py-2 text-[12px]">
          <span className="font-semibold">{q}</span>
          <span className="text-[10px] font-bold text-good-dark">neu</span>
        </motion.div>
      ))}
      <div className="mt-2 rounded-xl bg-brand-strong py-2 text-center text-[12px] font-extrabold text-on-brand">Karteikarten speichern (20)</div>
    </Phone>
  )
}

function PlanArt({ reduce }: { reduce: boolean }) {
  return (
    <Phone>
      <motion.div initial={reduce ? false : { scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 24, delay: 0.1 }} className="rounded-2xl bg-brand-strong p-3 text-on-brand">
        <p className="text-[15px] font-black leading-tight">Heute dran</p>
        <p className="text-[11px] font-bold opacity-90">8 neue Karten, 6 zum Wiederholen</p>
        <div className="mt-2 rounded-lg bg-white py-1.5 text-center text-[12px] font-extrabold text-brand-dark">Los geht’s (14)</div>
      </motion.div>
      <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-ink/10 p-2.5">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--line)" strokeWidth="4" />
            <motion.circle cx="18" cy="18" r="14" fill="none" stroke="var(--sky)" strokeWidth="4" strokeLinecap="round" strokeDasharray={88} initial={{ strokeDashoffset: reduce ? 35 : 88 }} animate={{ strokeDashoffset: 35 }} transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </svg>
        </span>
        <span className="text-[11px] leading-tight">
          <b className="block text-[12px]">10 Minuten für Bio-Test</b>
          <span className="text-muted">noch 6 Min. · in 3 Tagen</span>
        </span>
      </div>
    </Phone>
  )
}

function CalendarArt({ reduce }: { reduce: boolean }) {
  const blocks = [
    { c: 1, r: 1, h: 1, bg: '#58c234', t: 'Bio' },
    { c: 3, r: 2, h: 2, bg: '#8b5cf6', t: 'Mathe' },
    { c: 4, r: 0, h: 1, bg: '#1e96fa', t: 'Engl' },
  ]
  return (
    <Phone>
      <p className="mb-1.5 text-[11px] font-bold text-muted">Kalender · Woche</p>
      <div className="grid grid-cols-5 gap-1">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr'].map((d) => (
          <span key={d} className="text-center text-[9px] font-bold text-muted">
            {d}
          </span>
        ))}
        {[0, 1, 2, 3, 4].map((c) => (
          <div key={c} className="relative h-[8.2rem] rounded-md bg-ink/[0.04]">
            {blocks
              .filter((b) => b.c === c)
              .map((b) => (
                <motion.div key={b.t} initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + c * 0.15, type: 'spring', stiffness: 420, damping: 18 }} className="absolute inset-x-0.5 rounded-md px-1 py-0.5 text-[9px] font-bold text-white" style={{ top: `${b.r * 25 + 2}%`, height: `${b.h * 25 - 3}%`, background: b.bg }}>
                  {b.t}
                </motion.div>
              ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-muted">Mit WebUntis oder per Hand eingetragen</p>
    </Phone>
  )
}

function TestArt({ reduce }: { reduce: boolean }) {
  return (
    <Phone>
      <p className="text-[11px] font-bold text-muted">Klassenarbeit · Physik</p>
      <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-1 text-[30px] font-black leading-none">
        21 <span className="text-[16px] text-muted">/ 25</span>
      </motion.p>
      <p className="mb-2 text-[12px] font-bold">84 %, ungefähr eine <span className="text-brand-dark">2</span></p>
      {[
        ['Wissen', 92, 'bg-good'],
        ['Anwenden', 80, 'bg-good'],
        ['Begründen', 55, 'bg-gold'],
      ].map(([l, p, c], i) => (
        <div key={String(l)} className="mb-1.5">
          <div className="mb-0.5 flex justify-between text-[10px] font-bold">
            <span>{l}</span>
            <span className="text-muted">{p} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
            <motion.div initial={{ width: reduce ? `${p}%` : 0 }} animate={{ width: `${p}%` }} transition={{ delay: 0.4 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className={`h-full rounded-full ${c}`} />
          </div>
        </div>
      ))}
    </Phone>
  )
}

const SLIDES: { title: string; text: string; Art: (p: { reduce: boolean }) => ReactNode }[] = [
  { title: 'Karteikarten in Sekunden', text: 'Sag der KI, was ihr gerade durchnehmt, oder fotografiere dein Heft. Daraus werden Karteikarten, Quiz und Rechenaufgaben.', Art: CardsArt },
  { title: 'Üben, wann es sich lohnt', text: 'Jeden Tag zeigt dir die App, was dran ist: genau dann, kurz bevor du es vergessen würdest. Das sind oft nur ein paar Minuten.', Art: PlanArt },
  { title: 'Dein Plan mit Arbeiten', text: 'Trag Arbeiten und Tests im Kalender ein oder verbinde WebUntis. Die App verteilt den Stoff auf die Tage bis dahin.', Art: CalendarArt },
  { title: 'Probearbeit mit Note', text: 'Mach Tests und Klassenarbeiten wie in der Schule, mit Punkten und ungefährer Note. Danach siehst du, was noch fehlt.', Art: TestArt },
]

/**
 * Vier Seiten, die zeigen, was man mit der App machen kann: zum Wischen oder Tippen, jederzeit überspringbar.
 */
export function Tour({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const reduce = !!useReducedMotion()
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const last = i === SLIDES.length - 1
  const go = (n: number) => {
    setDir(n >= i ? 1 : -1)
    setI(Math.max(0, Math.min(SLIDES.length - 1, n)))
  }
  const { Art } = SLIDES[i]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
        <button type="button" onClick={i === 0 ? onBack : () => go(i - 1)} aria-label="Zurück" className="press -ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-ink">
          <Back size={26} />
        </button>
        <button type="button" onClick={onDone} className="press min-h-11 rounded-xl px-3 text-[15px] font-semibold text-muted hover:text-ink">
          Überspringen
        </button>
      </header>

      <main
        className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-center overflow-hidden px-6"
        onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
        onTouchEnd={(e) => {
          const x0 = Number((e.currentTarget as HTMLElement).dataset.x)
          const dx = e.changedTouches[0].clientX - x0
          if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1))
        }}
      >
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={i}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: dir * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: dir * -24, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            aria-label={`Seite ${i + 1} von ${SLIDES.length}`}
          >
            <Art reduce={reduce} />
            <h1 className="mt-6 text-center text-[27px] font-black leading-tight tracking-tight">{SLIDES[i].title}</h1>
            <p className="mx-auto mt-2 max-w-[22rem] text-center text-[16px] leading-snug text-muted">{SLIDES[i].text}</p>
          </motion.section>
        </AnimatePresence>
      </main>

      <footer className="mx-auto w-full max-w-md px-6 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="mb-4 flex justify-center gap-2" role="tablist" aria-label="Seiten der Einführung">
          {SLIDES.map((s, n) => (
            <button key={s.title} type="button" role="tab" aria-selected={n === i} aria-label={`Seite ${n + 1}`} onClick={() => go(n)} className="flex h-6 w-6 items-center justify-center">
              <motion.span animate={{ width: n === i ? 22 : 8, opacity: n === i ? 1 : 0.35 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} className="h-2 rounded-full bg-brand-strong" />
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary press w-full !py-4 text-base" onClick={() => (last ? onDone() : go(i + 1))} autoFocus>
          {last ? 'Einrichten' : 'Weiter'}
        </button>
      </footer>
    </div>
  )
}
