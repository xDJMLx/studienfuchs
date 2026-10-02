import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { grades, isLessonDone, isRegular, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { ChipTabs } from '../../components/ui/controls'
import { Check, Flame, Right, Target } from '../../components/ui/Icons'
import { CountUp, Item, ItemLi, SPRING, Stagger, StaggerList } from '../../components/ui/motion'
import { ProgressRing } from '../../components/ui/widgets'
import { backlog, catchUpStatus, daysUntil, inDays, unitLabel } from '../../lib/catchup'
import { useStore } from '../../store/useStore'

/** Geschätzte Minuten pro Lektion (neue Wörter zu zweit, sofort abgefragt, Fehler wiederholt). */
const MIN_PER_LESSON = 7

const QUICK = [
  { days: 7, label: '1 Woche' },
  { days: 14, label: '2 Wochen' },
  { days: 28, label: '4 Wochen' },
]

/** Aufhol-Modus: Wer in Französisch nicht aufgepasst hat, wählt, wo die Klasse im Buch ist, und holt den Stoff mit Tagesplan nach. */
export function CatchUpPage() {
  const navigate = useNavigate()
  const { classUnit, catchUpTarget, setClassUnit, setCatchUpTarget, setGrade, lessons } = useStore()
  const storedGrade = useStore((s) => s.grade)
  const classGrade = classUnit ? (units.find((u) => u.id === classUnit)?.grade ?? storedGrade) : storedGrade
  const [grade, setGradeView] = useState<number>(grades.includes(classGrade) ? classGrade : grades[0])
  const [days, setDays] = useState<number>(14)
  const [custom, setCustom] = useState('')

  const gradeUnits = useMemo(() => units.filter((u) => u.grade === grade), [grade])
  const target = custom || inDays(days)
  const missing = classUnit ? backlog(classUnit, lessons) : []
  const status = classUnit ? catchUpStatus(classUnit, catchUpTarget ?? target, lessons) : null
  const preview = classUnit ? catchUpStatus(classUnit, target, lessons) : null
  const planActive = !!catchUpTarget && !!classUnit

  const regularStats = (unitId: string) => {
    const u = units.find((x) => x.id === unitId)!
    const reg = u.lessons.filter(isRegular)
    return { done: reg.filter((l) => isLessonDone(l, lessons[l.id])).length, total: reg.length }
  }

  const next = missing[0]
  const dateLabel = (d: string) => new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.08}>
      <Item>
        <div className="mb-6 flex items-center gap-4">
          <Mascot size={72} mood="think" blink />
          <div>
            <h1 className="page-title">Aufholen</h1>
            <p className="text-muted">Nicht aufgepasst oder gefehlt? Hier holst du den Stoff deiner Klasse Schritt für Schritt nach.</p>
          </div>
        </div>
      </Item>

      {/* 1) Wo ist die Klasse? */}
      <Item>
        <h2 className="eyebrow mb-2">1 · Wo ist deine Klasse im Buch?</h2>
        <p className="mb-3 text-sm text-muted">Wähle die Einheit, die ihr gerade im Unterricht macht. Alles bis dahin sollst du können.</p>
        <ChipTabs
          label="Klassenstufe"
          className="mb-3"
          value={grade}
          onChange={setGradeView}
          options={grades.map((g) => ({ value: g, label: g <= 8 ? `Klasse ${g} · À plus ! ${g - 6}` : `Klasse ${g}` }))}
        />
        <StaggerList className="grid gap-2" stagger={0.03} key={grade}>
          {gradeUnits.map((u) => {
            const on = classUnit === u.id
            const st = regularStats(u.id)
            return (
              <ItemLi key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setClassUnit(u.id)
                    setGrade(u.grade)
                  }}
                  aria-pressed={on}
                  className="press relative flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-snow"
                >
                  {on && <motion.span layoutId="class-ring" className="absolute -inset-px rounded-2xl border-2 border-brand bg-brand-soft" transition={SPRING.snappy} />}
                  <span className="relative min-w-0 flex-1">
                    {u.book && <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{u.book}</span>}
                    <span className={`block truncate font-semibold ${on ? 'text-brand-dark' : ''}`}>{u.title}</span>
                  </span>
                  <span className="relative shrink-0 text-xs font-medium text-muted">
                    {st.done}/{st.total}
                  </span>
                  {on && (
                    <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-strong text-on-brand">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              </ItemLi>
            )
          })}
        </StaggerList>
      </Item>

      {/* 2) Rückstand und Plan */}
      {classUnit && status && preview && (
        <Item>
          <section className="card mt-6 overflow-hidden" aria-label="Rückstand">
            <div className="flex items-center gap-4 p-5">
              <ProgressRing pct={status.total ? (status.total - status.remaining) / status.total : 1} size={84} stroke={8} color={status.finished ? 'var(--good)' : 'var(--brand)'}>
                <span className="text-lg font-bold"><CountUp to={status.total - status.remaining} />/{status.total}</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="eyebrow">Stand deiner Klasse</p>
                <p className="font-semibold leading-tight">{unitLabel(classUnit)}</p>
                {status.finished ? (
                  <p className="mt-1 text-sm font-medium text-good-dark">Geschafft: du bist auf dem Stand deiner Klasse.</p>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    Dir fehlen noch <b className="text-ink">{status.remaining} Lektionen</b> mit <b className="text-ink">{status.remainingWords} Wörtern</b>.
                  </p>
                )}
              </div>
            </div>

            {!status.finished && (
              <div className="border-t border-line p-5">
                {planActive ? (
                  <>
                    <p className="mb-1 font-semibold">Dein Aufholplan läuft bis {dateLabel(catchUpTarget!)}</p>
                    <p className="mb-3 text-sm text-muted">
                      Noch {status.daysLeft} {status.daysLeft === 1 ? 'Tag' : 'Tage'}, das sind ca. {status.perDay} Lektionen pro Tag (etwa {status.perDay * MIN_PER_LESSON} Minuten).
                      {status.toGoToday > 0 ? ` Heute fehlen noch ${status.toGoToday}.` : ' Heute hast du dein Ziel schon geschafft!'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {next && (
                        <button className="btn btn-primary btn-shine press" onClick={() => navigate(`/lesson/${next.id}`)}>
                          Jetzt aufholen <Right size={16} />
                        </button>
                      )}
                      <button className="btn btn-ghost press" onClick={() => setCatchUpTarget(null)}>Plan beenden</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="eyebrow mb-2">2 · Bis wann willst du aufgeholt haben?</h2>
                    <ChipTabs
                      label="Zeitraum"
                      className="mb-3"
                      value={custom ? -1 : days}
                      onChange={(d) => {
                        setCustom('')
                        setDays(d)
                      }}
                      options={QUICK.map((q) => ({ value: q.days, label: q.label }))}
                    />
                    <label className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                      oder Datum wählen:
                      <input
                        type="date"
                        min={inDays(1)}
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        className="rounded-xl border border-line bg-snow px-3 py-2 font-medium text-ink outline-none focus:border-brand"
                      />
                    </label>
                    <p className="mb-4 rounded-xl bg-snow p-3 text-sm">
                      Bis {dateLabel(target)} ({daysUntil(target, new Date())} {daysUntil(target, new Date()) === 1 ? 'Tag' : 'Tage'}) brauchst du ca. <b>{preview.perDay} Lektionen pro Tag</b>, etwa {preview.perDay * MIN_PER_LESSON} Minuten.
                    </p>
                    <button className="btn btn-primary btn-shine press w-full sm:w-auto" onClick={() => setCatchUpTarget(target)}>
                      <Target size={18} /> Aufholplan starten
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        </Item>
      )}

      {/* 3) Erst testen */}
      {classUnit && (
        <Item>
          <section className="card mt-4 p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Flame size={22} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Erst testen, was du schon kannst</h2>
                <p className="text-sm text-muted">Pro Einheit eine Auswahl- und eine Tippaufgabe. Was sitzt, kannst du überspringen, nur Lücken müssen geübt werden.</p>
              </div>
            </div>
            <Link to={`/placement?upTo=${classUnit}`} className="btn btn-ghost press w-full sm:w-auto">Test starten</Link>
          </section>
        </Item>
      )}

      <Item>
        <p className="mt-6 text-sm text-muted">
          Wichtig: Neue Wörter schalten sich erst frei, wenn die vorherigen wirklich sitzen. So lernst du nichts falsch und der Rückstand wird solide aufgeholt, nicht nur abgehakt.
        </p>
      </Item>
    </Stagger>
  )
}
