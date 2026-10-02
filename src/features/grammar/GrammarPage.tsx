import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { findLesson, grades, isLessonDone, isUnlocked, units } from '../../content'
import { SpeakButton } from '../../components/exercises/common'
import { Mascot } from '../../components/mascot/Mascot'
import { IconChip } from '../../components/ui/controls'
import { Back, Book, Bulb, Check, Close, Lock, Right, Search } from '../../components/ui/Icons'
import { EASE, Item, ItemLi, Stagger, StaggerList, SPRING } from '../../components/ui/motion'
import type { Lesson, Unit } from '../../lib/types'
import { useStore } from '../../store/useStore'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Topic {
  unit: Unit
  lesson: Lesson
  title: string
  text: string
}

/** Alle Erklärungen aus den Lektionen, in Kursreihenfolge. */
const TOPICS: Topic[] = units.flatMap((u) =>
  u.lessons.filter((l) => l.explanation).map((l) => ({ unit: u, lesson: l, title: l.explanation!.title, text: l.explanation!.paragraphs.join(' ') })),
)

/** Nachschlagewerk: alle Regeln nach Klasse und Einheit, durchsuchbar. Zeigt auch, was du schon geübt hast. */
export function GrammarPage({ embedded = false }: { embedded?: boolean } = {}) {
  const reduce = useReducedMotion()
  const lessons = useStore((s) => s.lessons)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [grade, setGrade] = useState<number | 'all'>('all')

  const q = norm(deferred.trim())
  const filtered = useMemo(() => TOPICS.filter((t) => (grade === 'all' || t.unit.grade === grade) && (!q || norm(`${t.title} ${t.text}`).includes(q))), [grade, q])

  // Gruppen: je Einheit
  const groups = useMemo(() => {
    const map = new Map<string, { unit: Unit; topics: Topic[] }>()
    for (const t of filtered) {
      const g = map.get(t.unit.id) ?? { unit: t.unit, topics: [] }
      g.topics.push(t)
      map.set(t.unit.id, g)
    }
    return [...map.values()]
  }, [filtered])

  return (
    <div className={embedded ? '' : 'mx-auto max-w-2xl px-4 py-6 lg:py-8'}>
      {embedded && <p className="mb-5 text-muted">{TOPICS.length} Regeln zum Nachlesen, mit Beispielen zum Anhören.</p>}
      <div className={`mb-6 flex items-center gap-4 ${embedded ? 'hidden' : ''}`}>
        <motion.div initial={reduce ? false : { rotate: -8, scale: 0.7, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={SPRING.bouncy}>
          <IconChip size={56}><Book size={30} /></IconChip>
        </motion.div>
        <div>
          <h1 className="page-title">Grammatik</h1>
          <p className="text-muted">{TOPICS.length} Regeln zum Nachlesen, mit Beispielen zum Anhören.</p>
        </div>
      </div>

      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Search size={18} /></span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Thema suchen, z. B. passé composé …"
          aria-label="Grammatik durchsuchen"
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-11 pr-11 outline-none transition-shadow [&::-webkit-search-cancel-button]:hidden focus:border-brand focus:shadow-[0_0_0_4px_var(--brand-soft)]"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              type="button"
              aria-label="Suche löschen"
              onClick={() => setQuery('')}
              className="press absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-snow text-muted hover:text-ink"
            >
              <Close size={12} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Klassenstufe">
        {(['all', ...grades] as const).map((g) => {
          const on = grade === g
          return (
            <button key={g} role="tab" aria-selected={on} onClick={() => setGrade(g)} className={`press relative shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${on ? 'border-transparent text-brand-dark' : 'border-line text-muted hover:bg-snow'}`}>
              {on && <motion.span layoutId="grammar-chip" className="absolute inset-0 rounded-full bg-brand-soft ring-1 ring-brand/40" transition={SPRING.snappy} />}
              <span className="relative">{g === 'all' ? 'Alle Klassen' : `Klasse ${g}`}</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="card flex flex-col items-center px-6 py-12 text-center">
          <Mascot mood="think" size={96} blink />
          <p className="mt-3 text-lg font-semibold">Dazu habe ich nichts gefunden</p>
          <p className="mb-4 text-sm text-muted">Versuch einen kürzeren Begriff, z. B. „Verb“ oder „Artikel“.</p>
          <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={() => { setQuery(''); setGrade('all') }}>Filter zurücksetzen</button>
        </motion.div>
      ) : (
        <div className="grid gap-8" key={`${grade}-${q}`}>
          {groups.map(({ unit, topics }) => (
            <section key={unit.id} aria-labelledby={`g-${unit.id}`}>
              <div className="sticky top-0 z-10 -mx-4 mb-3 bg-page/90 px-4 py-2 backdrop-blur">
                <p className="eyebrow">Klasse {unit.grade}</p>
                <h2 id={`g-${unit.id}`} className="font-semibold leading-tight">{unit.title}</h2>
              </div>
              <StaggerList className="grid gap-2.5" stagger={0.05}>
                {topics.map((t, i) => {
                  const done = isLessonDone(t.lesson, lessons[t.lesson.id])
                  const locked = !isUnlocked(t.lesson.id, lessons)
                  return (
                    <ItemLi key={t.lesson.id}>
                      <Link to={`/grammar/${t.lesson.id}`} className="card lift group flex items-start gap-4 p-4">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand-dark transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-snug">{t.title}</span>
                          <span className="mt-1 line-clamp-2 text-sm text-muted">{t.text}</span>
                        </span>
                        <span className="mt-1 flex shrink-0 items-center gap-1 text-muted">
                          {done ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-good text-white" title="Geübt"><Check size={13} /></span>
                          ) : locked ? (
                            <span title="Noch gesperrt"><Lock size={16} /></span>
                          ) : null}
                          <Right size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </ItemLi>
                  )
                })}
              </StaggerList>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/** Eine einzelne Erklärung in Ruhe lesen. */
export function GrammarTopicPage() {
  const { lessonId = '' } = useParams()
  const lessons = useStore((s) => s.lessons)
  const found = findLesson(lessonId)
  if (!found?.lesson.explanation) return <Navigate to="/practice?tab=grammar" replace />
  const { lesson, unit } = found
  const ex = lesson.explanation!
  const unlocked = isUnlocked(lesson.id, lessons)
  const done = isLessonDone(lesson, lessons[lesson.id])
  const idx = TOPICS.findIndex((t) => t.lesson.id === lesson.id)
  const prev = idx > 0 ? TOPICS[idx - 1] : null
  const next = idx >= 0 && idx < TOPICS.length - 1 ? TOPICS[idx + 1] : null
  const minutes = Math.max(1, Math.round(ex.paragraphs.join(' ').split(/\s+/).length / 180))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <Link to="/practice?tab=grammar" className="mb-2 press -ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted hover:text-ink">
        <Back size={18} /> Grammatik
      </Link>

      <Stagger stagger={0.08}>
        <Item>
          <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-soft to-surface p-6 ring-1 ring-brand/15">
            <div className="relative flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-surface/80 px-2.5 py-1 text-brand-dark">Klasse {unit.grade}</span>
              <span className="rounded-full bg-surface/80 px-2.5 py-1 text-muted">{unit.title}</span>
              <span className="rounded-full bg-surface/80 px-2.5 py-1 text-muted">ca. {minutes} Min. Lesezeit</span>
              {done && <span className="flex items-center gap-1 rounded-full bg-good px-2.5 py-1 text-white"><Check size={11} /> Geübt</span>}
            </div>
            <h1 className="relative mt-3 text-3xl font-bold leading-tight tracking-tight">{ex.title}</h1>
          </header>
        </Item>

        <Item>
          <div className="mb-6 grid gap-4">
            {ex.paragraphs.map((p, i) => (
              <p key={p} className={i === 0 ? 'text-xl leading-9' : 'text-[17px] leading-8 text-ink/90'}>{p}</p>
            ))}
          </div>
        </Item>

        {ex.examples && ex.examples.length > 0 && (
          <Item>
            <h2 className="eyebrow mb-3">Beispiele zum Anhören</h2>
            <StaggerList className="mb-6 grid gap-2.5" stagger={0.06} delay={0.1}>
              {ex.examples.map((e) => (
                <ItemLi key={e.fr} className="card flex items-center gap-4 border-l-4 !border-l-brand p-3.5 pr-4">
                  <SpeakButton text={e.fr} />
                  <div className="min-w-0">
                    <div className="text-lg font-semibold leading-snug text-brand-dark">{e.fr}</div>
                    <div className="text-muted">{e.de}</div>
                  </div>
                </ItemLi>
              ))}
            </StaggerList>
          </Item>
        )}

        {ex.tip && (
          <Item>
            <div className="mb-6 flex gap-4 rounded-2xl bg-gold/15 p-4 ring-1 ring-gold/30">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/30 text-gold-dark"><Bulb size={22} /></span>
              <div>
                <p className="text-xs font-semibold text-gold-dark">Merke</p>
                <p className="leading-relaxed">{ex.tip}</p>
              </div>
            </div>
          </Item>
        )}

        <Item>
          {unlocked ? (
            <Link to={`/lesson/${lesson.id}`} className="btn btn-primary btn-shine press mb-8 w-full justify-between !py-4 text-base">
              <span>{done ? 'Nochmal üben' : 'Dazu üben'}</span>
              <Right size={18} />
            </Link>
          ) : (
            <p className="mb-8 flex items-start gap-3 rounded-2xl bg-snow p-4 text-sm text-muted">
              <span className="mt-0.5"><Lock size={18} /></span>
              <span>Die passende Lektion ist noch gesperrt. Schließe zuerst die vorherigen Lektionen ab, dann kannst du hier direkt üben.</span>
            </p>
          )}
        </Item>

        {(prev || next) && (
          <Item>
            <nav aria-label="Weitere Themen" className="grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link to={`/grammar/${prev.lesson.id}`} className="card lift group p-4">
                  <span className="eyebrow mb-1 flex items-center gap-1"><Back size={12} /> Davor</span>
                  <span className="line-clamp-2 font-semibold">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={`/grammar/${next.lesson.id}`} className="card lift group p-4 text-right">
                  <span className="eyebrow mb-1 flex items-center justify-end gap-1">Danach <Right size={12} /></span>
                  <span className="line-clamp-2 font-semibold">{next.title}</span>
                </Link>
              )}
            </nav>
          </Item>
        )}
      </Stagger>
    </div>
  )
}
