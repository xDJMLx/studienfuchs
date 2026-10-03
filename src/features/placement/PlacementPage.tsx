import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { grades, isRegular, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Check, Close, Right } from '../../components/ui/Icons'
import { EASE, Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { unitsUpTo } from '../../lib/catchup'
import { shuffle } from '../../lib/generateExercises'
import type { Exercise, Item as VocabItem } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { Session, type SessionResult } from '../lesson/Session'

/** Pro Einheit: eine Auswahlfrage und eine Tippaufgabe. Tippen lässt sich nicht erraten, deshalb zählt nur, wer beides kann. */
const PER_UNIT = 2
/** Bei sehr vielen Einheiten (z. B. mehrere Klassen auf einmal) nur eine Tippaufgabe pro Einheit, sonst wird der Test zu lang */
const MANY_UNITS = 16

/** Einstufungstest: wer pro Einheit beide Aufgaben richtig hat, kann die Einheit überspringen. */
export function PlacementPage() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const storedGrade = useStore((s) => s.grade)
  const markLessonsDone = useStore((s) => s.markLessonsDone)
  const catchUpExtras = useStore((s) => s.catchUpExtras)
  // Aus dem Aufhol-Modus: nur Einheiten bis zum Stand der Klasse abfragen
  const query = useSearchParams()[0]
  const upTo = query.get('upTo')
  const onlyGrade = Number(query.get('g')) || null
  const limited = useMemo(() => (upTo ? unitsUpTo(upTo, query.get('all') === '1', catchUpExtras).filter((u) => !onlyGrade || u.grade === onlyGrade) : []), [upTo, query, onlyGrade, catchUpExtras])
  const grade = limited.length ? limited[0].grade : grades.includes(storedGrade) ? storedGrade : grades[0]
  const gradeUnits = useMemo(() => (limited.length ? limited : units.filter((u) => u.grade === grade)), [grade, limited])

  const [stage, setStage] = useState<'intro' | 'test' | 'result'>('intro')
  const [result, setResult] = useState<SessionResult | null>(null)

  // Pro Einheit zufällige Wörter wählen und Aufgaben bauen (einmal pro Start festlegen)
  const setup = useMemo(() => {
    const byUnit = new Map<string, VocabItem[]>()
    const exercises: Exercise[] = []
    const allUnitItems = gradeUnits.flatMap((u) => u.lessons.filter(isRegular).flatMap((l) => l.items))
    const perUnit = gradeUnits.length > MANY_UNITS ? 1 : PER_UNIT
    for (const unit of gradeUnits) {
      const items = unit.lessons.filter(isRegular).flatMap((l) => l.items)
      const picked = shuffle(items).slice(0, perUnit)
      byUnit.set(unit.id, picked)
      picked.forEach((item, i) => {
        if (perUnit === 1 || i % 2 === 1) {
          // Deutsch → Französisch eintippen (Erinnern aus dem Gedächtnis)
          exercises.push({ kind: 'type', id: `placement:${item.id}`, itemId: item.id, prompt: item.back, promptLang: 'de', answer: item.front })
          return
        }
        const answer = item.back
        const others = shuffle(allUnitItems.filter((o) => o.id !== item.id && o.back !== answer))
          .slice(0, 3)
          .map((o) => o.back)
        exercises.push({
          kind: 'choice',
          id: `placement:${item.id}`,
          itemId: item.id,
          prompt: item.front,
          promptLang: 'fr',
          answer,
          options: shuffle([answer, ...others]),
          speak: item.front,
        })
      })
    }
    return { byUnit, exercises: shuffle(exercises) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, stage === 'intro'])

  // Nur zum Auswerten der Fehler (die Wiederholungsplanung wird für den Einstufungstest nicht verändert)
  const graded = useMemo(() => new Set(setup.exercises.map((e) => e.itemId)), [setup])

  if (stage === 'test') {
    return (
      <Session
        exercises={setup.exercises}
        gradedItemIds={graded}
        noRetry
        onExit={() => setStage('intro')}
        onComplete={(r) => {
          setResult(r)
          setStage('result')
        }}
      />
    )
  }

  if (stage === 'result' && result) {
    const wrong = new Set(result.mistakeItemIds)
    const rows = gradeUnits.map((u) => {
      const items = setup.byUnit.get(u.id) ?? []
      return { unit: u, known: items.length > 0 && items.every((i) => !wrong.has(i.id)) }
    })
    const skip = rows.filter((r) => r.known)
    return (
      <Shell onClose={() => navigate('/')}>
        <Stagger stagger={0.08}>
          <Item>
            <div className="mb-5 flex items-center gap-4">
              <motion.div initial={reduce ? false : { scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
                <Mascot mood={skip.length > 0 ? 'cheer' : 'think'} size={84} blink />
              </motion.div>
              <div>
                <h1 className="page-title">Dein Ergebnis</h1>
                <p className="text-muted">
                  {skip.length > 0
                    ? `${skip.length} von ${rows.length} Einheiten kannst du schon.`
                    : 'Hier lohnt es sich, von vorn zu beginnen.'}
                </p>
              </div>
            </div>
          </Item>
          <Item>
            <StaggerList className="card mb-6 divide-y divide-line overflow-hidden" stagger={0.05} delay={0.1}>
              {rows.map(({ unit, known }) => (
                <ItemLi key={unit.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${known ? 'bg-good-soft text-good-dark' : 'bg-bad-soft text-bad-dark'}`}>
                    {known ? <Check size={16} /> : <Close size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{unit.title}</span>
                    <span className="block truncate text-sm text-muted">{known ? 'sitzt schon' : 'noch üben'}</span>
                  </span>
                </ItemLi>
              ))}
            </StaggerList>
          </Item>
          <Item>
            <p className="mb-4 text-sm text-muted">
              {skip.length > 0 ? 'Übersprungene Einheiten kannst du jederzeit trotzdem üben.' : 'Du kannst den Test später nochmal machen.'}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {skip.length > 0 && (
                <button
                  className="btn btn-primary press"
                  onClick={() => {
                    markLessonsDone(skip.flatMap((r) => r.unit.lessons.filter((l) => !l.test).map((l) => l.id)))
                    navigate('/', { replace: true })
                  }}
                >
                  {skip.length} {skip.length === 1 ? 'Einheit' : 'Einheiten'} überspringen
                </button>
              )}
              <button className="btn btn-ghost press" onClick={() => navigate('/', { replace: true })}>Nichts überspringen</button>
            </div>
          </Item>
        </Stagger>
      </Shell>
    )
  }

  return (
    <Shell onClose={() => navigate('/')}>
      <Stagger stagger={0.09}>
        <Item>
          <div className="mb-6 flex items-center gap-4">
            <Mascot mood="think" size={88} className="shrink-0" blink />
            <div>
              <h1 className="page-title">Einstufungstest</h1>
              <p className="text-muted">Klasse {grade}, {gradeUnits.length * (gradeUnits.length > MANY_UNITS ? 1 : PER_UNIT)} Fragen</p>
            </div>
          </div>
        </Item>
        <Item>
          <p className="mb-3 leading-relaxed">
            Du kennst schon etwas? {gradeUnits.length > MANY_UNITS ? 'Aus jeder Einheit stelle ich dir eine Frage zum Eintippen. Hast du sie richtig, kannst du die Einheit überspringen.' : 'Aus jeder Einheit stelle ich dir zwei Fragen: eine zum Auswählen und eine zum Eintippen. Hast du beide richtig, kannst du die Einheit überspringen.'}
          </p>
          <p className="mb-6 text-sm text-muted">Es gibt keine zweite Chance pro Frage und keine Strafe. Weil du eine Antwort selbst schreiben musst, reicht Raten nicht: übersprungen wird nur, was wirklich sitzt.</p>
          <button className="btn btn-primary btn-shine press justify-between sm:w-64" onClick={() => setStage('test')} autoFocus>
            Test starten <Right size={18} />
          </button>
        </Item>
      </Stagger>
    </Shell>
  )
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col bg-page">
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Schließen" className="press -ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-snow hover:text-ink">
          <Close size={24} />
        </button>
      </header>
      <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8">
        {children}
      </motion.main>
    </div>
  )
}
