import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { allUnits, gradesOf, SUBJECTS, type Subject } from '../../content'
import { useStore } from '../../store/useStore'
import { Check, Chevron } from './Icons'
import { ItemLi, StaggerList, SPRING } from './motion'
import { Sheet } from './Sheet'

/** Runde Frankreich-Flagge als Kurs-Symbol. */
export function FrenchFlag({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0 rounded-full border-2 border-line">
      <defs>
        <clipPath id="flag-c"><circle cx="20" cy="20" r="20" /></clipPath>
      </defs>
      <g clipPath="url(#flag-c)">
        <rect width="14" height="40" fill="#2f5fb5" />
        <rect x="13" width="14" height="40" fill="#ffffff" />
        <rect x="26" width="14" height="40" fill="#e8484a" />
      </g>
    </svg>
  )
}

/** Mathe-Symbol: ein Kreis mit Plus, Minus, Mal und Geteilt. */
export function MathBadge({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r="20" fill="#8b5cf6" />
      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
        <path d="M9.5 13.5h7M13 10v7" />
        <path d="M23.5 13.5h7" />
        <path d="M10.5 26.5l6 6M16.5 26.5l-6 6" />
        <path d="M23.5 29.5h7" />
      </g>
      <g fill="#fff">
        <circle cx="27" cy="25.4" r="1.7" />
        <circle cx="27" cy="33.6" r="1.7" />
      </g>
    </svg>
  )
}

export const SubjectIcon = ({ subject, size = 36 }: { subject: Subject; size?: number }) => (subject === 'math' ? <MathBadge size={size} /> : <FrenchFlag size={size} />)

const subjectName = (s: Subject) => SUBJECTS.find((x) => x.id === s)?.name ?? ''

/** Kleiner Knopf (Fach-Symbol + Klasse), öffnet die Kurs-/Klassenauswahl. */
export function CourseChip({ className = '' }: { className?: string }) {
  const grade = useStore((s) => s.grade)
  const subject = useStore((s) => s.subject ?? 'fr')
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Kurs wechseln, aktuell ${subjectName(subject)} Klasse ${subject === 'math' ? 7 : grade}`}
        className={`press flex items-center gap-2 rounded-2xl border-2 border-transparent px-2 py-1 font-semibold text-ink transition-colors hover:border-line hover:bg-snow ${className}`}
      >
        <SubjectIcon subject={subject} size={32} />
        <span className="text-sm text-muted">Kl. {subject === 'math' ? 7 : grade}</span>
        <Chevron size={16} className="text-muted" />
      </button>
      <CoursePicker open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function CoursePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lessons = useStore((s) => s.lessons)
  const grade = useStore((s) => s.grade)
  const subject = useStore((s) => s.subject ?? 'fr')
  const setGrade = useStore((s) => s.setGrade)
  const setSubject = useStore((s) => s.setSubject)

  // Alle Kurse: je Fach und Klasse einer
  const courses = SUBJECTS.flatMap((s) => gradesOf(s.id).map((g) => ({ subject: s.id, grade: g })))

  return (
    <Sheet open={open} onClose={onClose} title="Meine Kurse">
      <p className="-mt-2 mb-4 text-sm text-muted">Wähle Fach und Klasse. Dein Fortschritt bleibt in jedem Kurs erhalten.</p>
      <StaggerList className="grid gap-2" stagger={0.05} delay={0.05}>
        {courses.map((c) => {
          const all = allUnits.filter((u) => u.grade === c.grade && (u.subject === 'math') === (c.subject === 'math')).flatMap((u) => u.lessons)
          const done = all.filter((l) => lessons[l.id]).length
          const active = c.subject === subject && (c.subject === 'math' || c.grade === grade)
          return (
            <ItemLi key={`${c.subject}-${c.grade}`}>
              <button
                type="button"
                onClick={() => {
                  setSubject(c.subject)
                  setGrade(c.grade)
                  onClose()
                }}
                className="press relative flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-snow"
                aria-pressed={active}
              >
                {active && <motion.span layoutId="course-ring" className="absolute -inset-0.5 rounded-2xl border-2 border-brand bg-brand-soft" transition={SPRING.snappy} />}
                <span className="relative"><SubjectIcon subject={c.subject} size={40} /></span>
                <span className="relative flex-1">
                  <span className={`block text-lg font-semibold ${active ? 'text-brand-dark' : ''}`}>{subjectName(c.subject)} · Klasse {c.grade}</span>
                  <span className="block text-sm text-muted">{done} von {all.length} Lektionen</span>
                </span>
                {active && <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-brand text-on-brand"><Check size={13} /></span>}
              </button>
            </ItemLi>
          )
        })}
      </StaggerList>
      {subject === 'fr' && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link to="/catchup" onClick={onClose} className="btn btn-ghost !min-h-11 !px-3 !text-[13px]">Aufholen</Link>
            <Link to="/placement" onClick={onClose} className="btn btn-ghost !min-h-11 !px-3 !text-[13px]">Einstufungstest</Link>
          </div>
          <p className="mt-1 text-center text-xs text-muted">Unterricht schon weiter oder Vorwissen? Hier springst du an die richtige Stelle.</p>
        </>
      )}
    </Sheet>
  )
}
