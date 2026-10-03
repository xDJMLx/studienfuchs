import { motion } from 'framer-motion'
import { useState } from 'react'
import { grades, units } from '../../content'
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

/** Kleiner Knopf (Flagge + Klasse), öffnet die Kurs-/Klassenauswahl. */
export function CourseChip({ className = '' }: { className?: string }) {
  const grade = useStore((s) => s.grade)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Kurs wechseln, aktuell Französisch Klasse ${grade}`}
        className={`press flex items-center gap-2 rounded-2xl border-2 border-transparent px-2 py-1 font-semibold text-ink transition-colors hover:border-line hover:bg-snow ${className}`}
      >
        <FrenchFlag size={32} />
        <span className="text-sm text-muted">Kl. {grade}</span>
        <Chevron size={16} className="text-muted" />
      </button>
      <CoursePicker open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function CoursePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lessons = useStore((s) => s.lessons)
  const grade = useStore((s) => s.grade)
  const setGrade = useStore((s) => s.setGrade)

  return (
    <Sheet open={open} onClose={onClose} title="Meine Kurse">
      <p className="-mt-2 mb-4 text-sm text-muted">Französisch – wähle deine Klassenstufe.</p>
      <StaggerList className="grid gap-2" stagger={0.05} delay={0.05}>
        {grades.map((g) => {
          const all = units.filter((u) => u.grade === g).flatMap((u) => u.lessons)
          const done = all.filter((l) => lessons[l.id]).length
          const active = g === grade
          return (
            <ItemLi key={g}>
              <button
                type="button"
                onClick={() => {
                  setGrade(g)
                  onClose()
                }}
                className="press relative flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-snow"
                aria-pressed={active}
              >
                {active && <motion.span layoutId="course-ring" className="absolute -inset-0.5 rounded-2xl border-2 border-brand bg-brand-soft" transition={SPRING.snappy} />}
                <span className="relative"><FrenchFlag size={40} /></span>
                <span className="relative flex-1">
                  <span className={`block text-lg font-semibold ${active ? 'text-brand-dark' : ''}`}>Französisch · Klasse {g}</span>
                  <span className="block text-sm text-muted">{done} von {all.length} Lektionen</span>
                </span>
                {active && <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-brand text-on-brand"><Check size={13} /></span>}
              </button>
            </ItemLi>
          )
        })}
      </StaggerList>
    </Sheet>
  )
}
