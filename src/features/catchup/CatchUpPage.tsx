import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { grades, isLessonDone, isRegular, isUnlocked, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { ChipTabs } from '../../components/ui/controls'
import { Check, Flame, Lock, Right, Target } from '../../components/ui/Icons'
import { CountUp, Item, ItemLi, SPRING, Stagger, StaggerList } from '../../components/ui/motion'
import { ProgressBar, ProgressRing } from '../../components/ui/widgets'
import { backlog, backlogByUnit, catchUpStatus, daysUntil, inDays, nextUnitId, unitLabel } from '../../lib/catchup'
import { useStore } from '../../store/useStore'

/** Geschätzte Minuten pro Lektion (neue Wörter zu zweit, erkennen, Buchstaben legen, Fehler wiederholt). */
const MIN_PER_LESSON = 8

const QUICK = [
  { days: 7, label: '1 Woche' },
  { days: 14, label: '2 Wochen' },
  { days: 28, label: '4 Wochen' },
  { days: 56, label: '8 Wochen' },
  { days: 90, label: '3 Monate' },
  { days: 180, label: '6 Monate' },
]

/** "45 Min." oder "3 Std. 20 Min." */
export function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} Min.`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`
}

/**
 * Aufhol-Modus: Wer in Französisch nicht aufgepasst hat oder neu dazukommt, wählt, wo die Klasse im Buch ist,
 * und holt den Stoff mit Tagesplan nach. Optional auch alle früheren Klassen (Quereinsteiger).
 */
export function CatchUpPage() {
  const navigate = useNavigate()
  const { classUnit, catchUpTarget, catchUpAll, setClassUnit, setCatchUpTarget, setCatchUpAll, setGrade, lessons } = useStore()
  const storedGrade = useStore((s) => s.grade)
  const classGrade = classUnit ? (units.find((u) => u.id === classUnit)?.grade ?? storedGrade) : storedGrade
  const [grade, setGradeView] = useState<number>(grades.includes(classGrade) ? classGrade : grades[0])
  const [days, setDays] = useState<number>(14)
  const [custom, setCustom] = useState('')
  const [open, setOpen] = useState(false)

  const gradeUnits = useMemo(() => units.filter((u) => u.grade === grade), [grade])
  const all = catchUpAll && classGrade > grades[0]
  const target = custom || inDays(days)
  const missing = classUnit ? backlog(classUnit, lessons, all) : []
  const groups = useMemo(() => (classUnit ? backlogByUnit(classUnit, lessons, all) : []), [classUnit, lessons, all])
  const status = classUnit ? catchUpStatus(classUnit, catchUpTarget ?? target, lessons, new Date(), all) : null
  const preview = classUnit ? catchUpStatus(classUnit, target, lessons, new Date(), all) : null
  const planActive = !!catchUpTarget && !!classUnit && !status?.expired
  const earlierLessons = useMemo(() => {
    if (!classUnit) return 0
    const g = units.find((u) => u.id === classUnit)?.grade ?? 0
    return units.filter((u) => u.grade < g).flatMap((u) => u.lessons.filter(isRegular)).filter((l) => !isLessonDone(l, lessons[l.id])).length
  }, [classUnit, lessons])

  const regularStats = (unitId: string) => {
    const u = units.find((x) => x.id === unitId)!
    const reg = u.lessons.filter(isRegular)
    return { done: reg.filter((l) => isLessonDone(l, lessons[l.id])).length, total: reg.length }
  }

  const next = missing[0]
  const dateLabel = (d: string) => new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  const nextUnit = classUnit ? nextUnitId(classUnit) : null

  const chooser = preview && (
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
        <input type="date" min={inDays(1)} value={custom} onChange={(e) => setCustom(e.target.value)} className="rounded-xl border border-line bg-snow px-3 py-2 font-medium text-ink outline-none focus:border-brand" />
      </label>
      <p className="mb-4 rounded-xl bg-snow p-3 text-sm">
        Bis {dateLabel(target)} ({daysUntil(target, new Date())} {daysUntil(target, new Date()) === 1 ? 'Tag' : 'Tage'}) brauchst du ca. <b>{preview.perDay} {preview.perDay === 1 ? 'Lektion' : 'Lektionen'} pro Tag</b>, etwa {fmtMinutes(preview.perDay * MIN_PER_LESSON)}.
        {preview.perDay * MIN_PER_LESSON > 60 && <span className="mt-1 block text-bad-dark">Das ist viel. Wähle lieber mehr Zeit oder mach vorher den Einstufungstest, damit du Bekanntes überspringst.</span>}
      </p>
      <button className="btn btn-primary btn-shine press w-full sm:w-auto" onClick={() => setCatchUpTarget(target)}>
        <Target size={18} /> Aufholplan starten
      </button>
    </>
  )

  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-6 lg:py-8" stagger={0.08}>
      <Item>
        <div className="mb-6 flex items-center gap-4">
          <Mascot size={72} mood="think" blink />
          <div>
            <h1 className="page-title">Aufholen</h1>
            <p className="text-muted">Nicht aufgepasst, gefehlt oder neu in der Klasse? Hier holst du den Stoff Schritt für Schritt nach.</p>
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
                    {u.book && <span className="block text-[12px] font-medium text-muted">{u.book}</span>}
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

        {classUnit && classGrade > grades[0] && (
          <label className="card mt-3 flex cursor-pointer items-start gap-3 p-4">
            <input type="checkbox" checked={catchUpAll} onChange={(e) => setCatchUpAll(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]" />
            <span className="min-w-0">
              <span className="block font-semibold">Auch frühere Klassen nachholen</span>
              <span className="block text-sm text-muted">
                Sinnvoll, wenn du in Klasse {grades[0]} bis {classGrade - 1} kaum aufgepasst hast oder neu in Französisch bist: Die Klassen bauen aufeinander auf.
                {earlierLessons > 0 ? ` Dann kommen ${earlierLessons} Lektionen dazu.` : ' Das hast du schon geschafft.'}
              </span>
            </span>
          </label>
        )}
      </Item>

      {/* 2) Rückstand und Plan */}
      {classUnit && status && preview && (
        <Item>
          <section className="card mt-6 overflow-hidden" aria-label="Rückstand">
            <div className="flex items-center gap-4 p-5">
              <ProgressRing pct={status.total ? (status.total - status.remaining) / status.total : 1} size={84} stroke={8} color={status.finished ? 'var(--good)' : 'var(--brand)'}>
                <span className="text-center text-sm font-bold leading-tight">
                  <CountUp to={status.total - status.remaining} />/{status.total}
                </span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="eyebrow">Stand deiner Klasse</p>
                <p className="font-semibold leading-tight">{unitLabel(classUnit)}</p>
                {status.finished ? (
                  <p className="mt-1 text-sm font-medium text-good-dark">Geschafft: du bist auf dem Stand deiner Klasse.</p>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    Dir fehlen noch <b className="text-ink">{status.remaining} Lektionen</b> mit <b className="text-ink">{status.remainingWords} Wörtern</b>, ungefähr {fmtMinutes(status.remaining * MIN_PER_LESSON)} Lernzeit.
                  </p>
                )}
              </div>
            </div>

            {status.finished && nextUnit && (
              <div className="border-t border-line p-5">
                <p className="mb-3 text-sm text-muted">Ist eure Klasse im Unterricht schon weiter?</p>
                <button
                  className="btn btn-primary press"
                  onClick={() => {
                    setClassUnit(nextUnit)
                    const g = units.find((u) => u.id === nextUnit)?.grade
                    if (g) {
                      setGrade(g)
                      setGradeView(g)
                    }
                  }}
                >
                  Klasse ist eine Einheit weiter <Right size={16} />
                </button>
              </div>
            )}

            {!status.finished && (
              <div className="border-t border-line p-5">
                {status.expired && catchUpTarget && (
                  <p className="mb-3 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad-dark">Dein Plan war bis {dateLabel(catchUpTarget)} gedacht und ist abgelaufen. Wähle einen neuen Termin, dann rechne ich neu.</p>
                )}
                {planActive ? (
                  <>
                    <p className="mb-1 font-semibold">Dein Aufholplan läuft bis {dateLabel(catchUpTarget!)}</p>
                    <p className="mb-3 text-sm text-muted">
                      Noch {status.daysLeft} {status.daysLeft === 1 ? 'Tag' : 'Tage'}, das sind ca. {status.perDay} {status.perDay === 1 ? 'Lektion' : 'Lektionen'} pro Tag (etwa {fmtMinutes(status.perDay * MIN_PER_LESSON)}).
                    </p>
                    {status.perDay * MIN_PER_LESSON > 60 && <p className="mb-3 rounded-xl bg-snow p-3 text-sm text-muted">Das sind mehr als eine Stunde am Tag. Mach den Einstufungstest unten, dann fällt Bekanntes weg, oder gib dir einen späteren Termin.</p>}
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium">Heute</span>
                      <span className="text-muted">
                        {Math.min(status.doneToday, status.perDay)} von {status.perDay}
                      </span>
                    </div>
                    <ProgressBar pct={status.perDay ? Math.min(1, status.doneToday / status.perDay) : 1} className="mb-1" />
                    <p className="mb-4 text-sm text-muted">{status.toGoToday > 0 ? `Heute fehlen noch ${status.toGoToday}.` : 'Heute hast du dein Ziel schon geschafft!'}</p>
                    <div className="flex flex-wrap gap-2">
                      {next && (
                        <button className="btn btn-primary btn-shine press" onClick={() => navigate(`/lesson/${next.id}`)}>
                          Jetzt aufholen: {next.title} <Right size={16} />
                        </button>
                      )}
                      <button className="btn btn-ghost press" onClick={() => setCatchUpTarget(null)}>
                        Plan beenden
                      </button>
                    </div>
                  </>
                ) : (
                  chooser
                )}
              </div>
            )}
          </section>
        </Item>
      )}

      {/* 3) Was fehlt? */}
      {classUnit && groups.length > 0 && (
        <Item>
          <section className="card mt-4 overflow-hidden" aria-label="Das fehlt dir noch">
            <button type="button" className="press flex w-full items-center justify-between gap-3 p-5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <span>
                <span className="block font-semibold">Das fehlt dir noch</span>
                <span className="block text-sm text-muted">
                  {groups.length} {groups.length === 1 ? 'Einheit' : 'Einheiten'}, {missing.length} Lektionen. Jede Einheit kannst du auch schnell nur als Wörter üben.
                </span>
              </span>
              <span className="text-muted">{open ? '▴' : '▾'}</span>
            </button>
            {open && (
              <ul className="divide-y divide-line border-t border-line">
                {groups.map((g) => (
                  <li key={g.unit.id} className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{g.unit.title}</p>
                        <p className="text-xs text-muted">
                          {g.unit.book ?? `Klasse ${g.unit.grade}`} · {g.total - g.lessons.length}/{g.total} geschafft
                        </p>
                      </div>
                      <Link to={`/practice/play?mode=mix&scope=unit:${g.unit.id}`} className="press shrink-0 rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark">
                        Nur Wörter üben
                      </Link>
                    </div>
                    <ul className="grid gap-1.5">
                      {g.lessons.map((l) => {
                        const ok = isUnlocked(l.id, lessons)
                        return (
                          <li key={l.id}>
                            {ok ? (
                              <Link to={`/lesson/${l.id}`} className="press flex items-center gap-3 rounded-xl bg-snow px-3 py-2.5">
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.title}</span>
                                <span className="shrink-0 text-xs text-muted">{l.items.length} Wörter</span>
                                <Right size={14} className="shrink-0 text-muted" />
                              </Link>
                            ) : (
                              <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted opacity-70">
                                <Lock size={14} className="shrink-0" />
                                <span className="min-w-0 flex-1 truncate text-sm">{l.title}</span>
                                <span className="shrink-0 text-xs">erst die davor</span>
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Item>
      )}

      {/* 4) Erst testen */}
      {classUnit && (
        <Item>
          <section className="card mt-4 p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                <Flame size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Erst testen, was du schon kannst</h2>
                <p className="text-sm text-muted">Pro Einheit eine Auswahl- und eine Tippaufgabe. Was sitzt, kannst du überspringen, nur Lücken müssen geübt werden. Übersprungene Wörter kommen später in der Wiederholung nochmal vor.</p>
              </div>
            </div>
            {all ? (
              <div className="flex flex-wrap gap-2">
                {grades
                  .filter((g) => g <= classGrade)
                  .map((g) => (
                    <Link key={g} to={`/placement?upTo=${classUnit}&all=1&g=${g}`} className="btn btn-ghost press">
                      Klasse {g} testen
                    </Link>
                  ))}
              </div>
            ) : (
              <Link to={`/placement?upTo=${classUnit}`} className="btn btn-ghost press w-full sm:w-auto">
                Test starten
              </Link>
            )}
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
