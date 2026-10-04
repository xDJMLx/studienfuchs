import { Check, Plus } from '../../components/ui/Icons'
import { templatesFor, type DeckTemplate } from '../../content/templates'
import { helpSubject } from '../../lib/subjects'
import { useStore } from '../../store/useStore'

/** Fertige Stapel eines Fachs: ein Tipp, und der Stapel gehört dir (du kannst ihn danach bearbeiten). */
export function TemplateList({ subject, onAdded }: { subject: string; onAdded?: (deckId: string, t: DeckTemplate) => void }) {
  const sets = useStore((s) => s.sets)
  const addSet = useStore((s) => s.addSet)
  const toggleSubject = useStore((s) => s.toggleSubject)
  const mySubjects = useStore((s) => s.mySubjects)
  const list = templatesFor(subject)
  if (!list.length) return null
  const lang = helpSubject(subject)?.lang

  const add = (t: DeckTemplate) => {
    const id = addSet(
      t.title,
      t.cards.map(([front, back]) => ({ front, back })),
      { subject: t.subject, lang: t.lang ?? lang, both: t.both ?? !!(t.lang ?? lang) },
    )
    if (!(mySubjects ?? []).includes(subject)) toggleSubject(subject)
    onAdded?.(id, t)
  }

  return (
    <ul className="grid gap-2.5">
      {list.map((t) => {
        const have = sets.some((s) => s.title === t.title && s.subject === t.subject)
        return (
          <li key={t.id} className="card flex items-center gap-3 p-3.5">
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold leading-tight">{t.title}</span>
              <span className="block text-sm text-muted">{t.description}</span>
              <span className="mt-0.5 block text-xs font-bold text-muted">{t.cards.length} Karten</span>
            </span>
            <button
              type="button"
              disabled={have}
              onClick={() => add(t)}
              aria-label={have ? `${t.title}: schon hinzugefügt` : `${t.title} hinzufügen`}
              className={`press flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-extrabold ${have ? 'bg-good-soft text-good-dark' : 'bg-sky-soft text-sky-dark hover:bg-sky hover:text-white'}`}
            >
              {have ? (
                <>
                  <Check size={14} /> Dabei
                </>
              ) : (
                <>
                  <Plus size={14} /> Hinzufügen
                </>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
