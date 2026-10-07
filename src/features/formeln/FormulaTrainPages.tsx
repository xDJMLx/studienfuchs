import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { formulaSkill, makeFormulaSession, skillsOf } from '../../content/formulas'
import { Back, Right } from '../../components/ui/Icons'
import { Item, Stagger } from '../../components/ui/motion'
import { itemFromTask, taskToExercise } from '../../lib/tasks'
import { lessonXp } from '../../lib/xp'
import { helpSubject } from '../../lib/subjects'
import { minutesSince } from '../../lib/studyTime'
import { useStore } from '../../store/useStore'
import { Session, type SessionResult } from '../lesson/Session'

/** Rechentraining: die Themen eines Fachs (Physik, Chemie, Mathe) mit ihrer Formel. */
export function FormulaListPage() {
  const { subjectId = '' } = useParams()
  const sub = helpSubject(subjectId)
  const skills = skillsOf(subjectId)
  if (!sub || skills.length === 0) return <Navigate to="/" replace />
  return (
    <Stagger className="mx-auto max-w-2xl px-4 py-5 lg:py-8" stagger={0.05}>
      <Item>
        <Link to={`/faecher/${subjectId}`} className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
          <Back size={18} /> {sub.name}
        </Link>
        <h1 className="page-title">Rechentraining</h1>
        <p className="mb-5 mt-1 text-muted">Immer neue Aufgaben, ganz ohne KI. Die App rechnet selbst, und bei einem Fehler siehst du den Rechenweg.</p>
      </Item>
      <ul className="grid gap-2.5">
        {skills.map((s) => (
          <Item key={s.id}>
            <li>
              <Link to={`/training/${s.id}`} className="card press flex items-center gap-3 p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{s.title}</span>
                  <span className="block font-mono text-[15px] text-brand-dark">{s.formula}</span>
                  <span className="block text-sm text-muted">{s.text}</span>
                </span>
                <Right size={16} className="shrink-0 text-muted" />
              </Link>
            </li>
          </Item>
        ))}
      </ul>
    </Stagger>
  )
}

/** Ein Durchgang zu einem Thema: etwa zehn Aufgaben, danach XP und Münzen wie sonst. */
export function FormulaRunPage() {
  const { skillId = '' } = useParams()
  const skill = formulaSkill(skillId)
  const [round, setRound] = useState(0)
  if (!skill) return <Navigate to="/" replace />
  return <Run key={`${skill.id}:${round}`} skillId={skill.id} onAgain={() => setRound((r) => r + 1)} />
}

function Run({ skillId, onAgain }: { skillId: string; onAgain: () => void }) {
  const navigate = useNavigate()
  const skill = formulaSkill(skillId)!
  const finishSession = useStore((s) => s.finishSession)
  const startedAt = useRef(Date.now())
  const [result, setResult] = useState<{ r: SessionResult; xp: number; coins: number } | null>(null)
  const exercises = useMemo(() => makeFormulaSession(skill).map((t, i) => taskToExercise(itemFromTask(t, `${skill.id}:${i}`), t)), [skill])
  const back = `/faecher/${skill.subject}/rechnen`

  if (result) {
    const pct = Math.round(result.r.accuracy * 100)
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-extrabold text-muted">{skill.title}</p>
        <h1 className="mt-1 text-[32px] font-black">{pct >= 90 ? 'Stark!' : pct >= 60 ? 'Gut gemacht!' : 'Weiter üben'}</h1>
        <p className="mt-2 text-muted">
          {result.r.firstTry} von {result.r.total} gleich richtig · +{result.xp} XP{result.coins > 0 ? ` · +${result.coins} Münzen` : ''}
        </p>
        <p className="mt-3 rounded-2xl bg-snow px-4 py-2 font-mono text-[15px] text-brand-dark">{skill.formula}</p>
        <div className="mt-6 grid w-full gap-2">
          <button type="button" className="btn btn-primary press w-full" onClick={onAgain} autoFocus>
            Noch eine Runde
          </button>
          <button type="button" className="btn btn-ghost press w-full" onClick={() => navigate(back, { replace: true })}>
            Fertig
          </button>
        </div>
      </div>
    )
  }

  return (
    <Session
      exercises={exercises}
      // Zufällig erzeugte Aufgaben legen keine Karteikarten an
      gradedItemIds={new Set()}
      onExit={() => navigate(back, { replace: true })}
      onComplete={(r) => {
        const xp = lessonXp(r.firstTry, r.total)
        const coins = finishSession({ xp, grades: {}, accuracy: r.accuracy, answered: r.total, minutes: minutesSince(startedAt.current) })
        setResult({ r, xp, coins })
      }}
    />
  )
}
