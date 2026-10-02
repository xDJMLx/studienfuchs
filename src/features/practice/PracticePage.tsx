import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { grades, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Cards, Check, Headphones, Pencil, Repeat, Right, Sparkle, Star, Trophy } from '../../components/ui/Icons'
import { Segmented } from '../../components/ui/controls'
import { EASE, Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { itemsForScope, type Scope } from '../../lib/scope'
import { useStore } from '../../store/useStore'
import { WordsPage } from '../words/WordsPage'
import { dueLabel, useDue } from '../review/ReviewPage'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'due', label: 'Fällig' },
  { id: 'weak', label: 'Schwierig' },
  { id: 'learned', label: 'Alle gelernten' },
  { id: 'favorites', label: 'Merkliste' },
]

const MODES = [
  { id: 'cards', title: 'Karteikarten', text: 'Wort anschauen, Bedeutung überlegen, umdrehen. Schnell und ohne Tippen.', to: (s: string) => `/practice/cards?scope=${s}`, icon: <Cards size={24} /> },
  { id: 'mix', title: 'Gemischtes Quiz', text: 'Auswahl, Tippen, Hören und Sätze bauen im Wechsel.', to: (s: string) => `/practice/play?mode=mix&scope=${s}`, icon: <Trophy size={24} /> },
  { id: 'write', title: 'Schreibtraining', text: 'Nur aus dem Gedächtnis schreiben, der stärkste Weg zum Behalten.', to: (s: string) => `/practice/play?mode=write&scope=${s}`, icon: <Pencil size={24} /> },
  { id: 'listen', title: 'Hörtraining', text: 'Wörter hören und verstehen oder aufschreiben.', to: (s: string) => `/practice/play?mode=listen&scope=${s}`, icon: <Headphones size={24} /> },
] as const

/** Üben und Wörterbuch an einem Ort: Umschalter oben, darunter je ein Bereich. */
export function PracticePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'words' ? 'words' : 'practice'
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <h1 className="page-title">Üben</h1>
      <Segmented
        label="Bereich"
        className="mb-5 mt-3 w-full [&>button]:flex-1 [&>button]:py-2"
        value={tab}
        onChange={(v) => setParams(v === 'words' ? { tab: 'words' } : {}, { replace: true })}
        options={[
          { value: 'practice', label: 'Üben' },
          { value: 'words', label: 'Wörterbuch' },
        ]}
      />
      {tab === 'words' ? <WordsPage embedded /> : <PracticeTab />}
    </div>
  )
}

/** Üben-Hub: oben die fällige Wiederholung (das Wichtigste), darunter freies Üben nach Wahl. */
function PracticeTab() {
  const navigate = useNavigate()
  const cards = useStore((s) => s.cards)
  const favorites = useStore((s) => s.favorites)
  const sets = useStore((s) => s.sets)
  const storedGrade = useStore((s) => s.grade)
  const grade = grades.includes(storedGrade) ? storedGrade : grades[0]
  const { due, next, learnedCount } = useDue()

  const ctx = useMemo(() => ({ cards, favorites, sets }), [cards, favorites, sets])
  const counts = useMemo(() => Object.fromEntries(SCOPES.map((s) => [s.id, itemsForScope(s.id, ctx).length])) as Record<Scope, number>, [ctx])
  // Beim ersten Öffnen gleich etwas Sinnvolles vorwählen: fällig, sonst schwierig, sonst alles Gelernte
  const [scope, setScope] = useState<Scope>(() => (['due', 'weak', 'learned', 'favorites'] as Scope[]).find((s) => counts[s] > 0) ?? 'learned')
  const count = useMemo(() => itemsForScope(scope, ctx).length, [scope, ctx])
  const gradeUnits = units.filter((u) => u.grade === grade)

  return (
    <Stagger stagger={0.08}>

      {/* Wiederholung: das wirksamste, deshalb ganz oben */}
      <Item>
        <section className={`card relative mb-7 overflow-hidden p-5 ${due.length > 0 ? 'ring-1 ring-brand/30' : ''}`} aria-label="Wiederholung">
          {due.length > 0 && <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/10" />}
          <div className="relative flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${due.length > 0 ? 'bg-brand-soft text-brand-dark' : 'bg-good-soft text-good-dark'}`}>
              {due.length > 0 ? <Repeat size={26} /> : <Check size={24} />}
            </span>
            <div className="min-w-0 flex-1">
              {due.length > 0 ? (
                <>
                  <h2 className="text-xl font-bold leading-tight">{due.length} {due.length === 1 ? 'Wort ist' : 'Wörter sind'} jetzt fällig</h2>
                  <p className="mt-1 text-sm text-muted">Jetzt kurz wiederholen, kurz bevor du sie vergessen würdest. Dann bleiben sie dauerhaft hängen.</p>
                </>
              ) : learnedCount > 0 ? (
                <>
                  <h2 className="text-xl font-bold leading-tight">Alles wiederholt</h2>
                  <p className="mt-1 text-sm text-muted">{next ? `Das nächste Wort ist ${dueLabel(next)} dran. ` : ''}Bis dahin kannst du frei üben oder eine neue Lektion lernen.</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold leading-tight">Noch nichts zu wiederholen</h2>
                  <p className="mt-1 text-sm text-muted">Schließe eine Lektion ab. Danach plane ich automatisch, wann du welches Wort wiederholen solltest.</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {due.length > 0 ? (
                  <button className="btn btn-primary btn-shine press" onClick={() => navigate('/review/play')}>
                    Wiederholung starten <Right size={16} />
                  </button>
                ) : learnedCount > 0 ? (
                  <button className="btn btn-ghost press" onClick={() => navigate('/review/play?free=1')}>Trotzdem wiederholen</button>
                ) : (
                  <Link to="/" className="btn btn-primary press">Zum Lernpfad</Link>
                )}
                {learnedCount > 0 && (
                  <Link to="/review" className="btn btn-ghost press">Lernstand ansehen</Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </Item>

      <Item>
        <h2 className="mb-1 text-lg font-semibold">Frei üben</h2>
        <p className="mb-3 text-sm text-muted">Such dir aus, was du trainieren willst und wie.</p>
        <p className="eyebrow mb-2">1 · Welche Wörter?</p>
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Wörter auswählen">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={scope === s.id}
              onClick={() => setScope(s.id)}
              className={`press flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${scope === s.id ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-surface text-muted hover:bg-snow'}`}
            >
              {s.id === 'favorites' && <Star size={14} />}
              {s.label}
              <span className="rounded-md bg-snow px-1.5 text-xs">{counts[s.id]}</span>
            </button>
          ))}
          <select
            aria-label="Einheit wählen"
            value={scope.startsWith('unit:') || scope.startsWith('set:') ? scope : ''}
            onChange={(e) => e.target.value && setScope(e.target.value as Scope)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium outline-none ${scope.startsWith('unit:') || scope.startsWith('set:') ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-surface text-muted'}`}
          >
            <option value="">Einheit oder Set …</option>
            <optgroup label={`Klasse ${grade}`}>
              {gradeUnits.map((u) => (
                <option key={u.id} value={`unit:${u.id}`}>{u.title}</option>
              ))}
            </optgroup>
            {sets.length > 0 && (
              <optgroup label="Meine Sets">
                {sets.map((s) => (
                  <option key={s.id} value={`set:${s.id}`}>{s.title}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={count === 0 ? 'none' : 'some'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} className="mb-6 text-sm text-muted">
            {count === 0 ? 'Dafür gibt es noch keine Wörter. Lerne zuerst eine Lektion oder wähle etwas anderes.' : `${count} Wörter ausgewählt.`}
          </motion.p>
        </AnimatePresence>
      </Item>

      <Item>
        <p className="eyebrow mb-2">2 · Wie üben?</p>
        <StaggerList className="grid gap-3 sm:grid-cols-2" stagger={0.07} delay={0.1}>
          {MODES.map((m) => {
            const disabled = count === 0
            return (
              <ItemLi key={m.id}>
                <Link
                  to={disabled ? '#' : m.to(scope)}
                  aria-disabled={disabled}
                  onClick={(e) => disabled && e.preventDefault()}
                  className={`card group flex h-full items-start gap-4 p-4 ${disabled ? 'opacity-50' : 'lift'}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">{m.icon}</span>
                  <span>
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-sm text-muted">{m.text}</span>
                  </span>
                </Link>
              </ItemLi>
            )
          })}
        </StaggerList>
      </Item>

      <Item>
        <Link to="/coach" className="card lift group mt-6 flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"><Sparkle size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Lern-Coach</span>
            <span className="block text-sm text-muted">Mit der KI über deine nächste Klassenarbeit, Grammatik und schwierige Wörter sprechen.</span>
          </span>
        </Link>
      </Item>

      {counts.learned === 0 && (
        <Item>
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-snow p-4">
            <Mascot size={56} mood="think" blink />
            <p className="text-sm text-muted">Hier wird es spannend, sobald du deine erste Lektion gelernt hast. <Link to="/" className="font-semibold text-brand-dark underline">Zum Lernpfad</Link></p>
          </div>
        </Item>
      )}
    </Stagger>
  )
}
