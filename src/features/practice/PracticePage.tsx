import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { grades, units } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Cards, Flame, Headphones, Pencil, Right, Sparkle, Speaker, Star, Trophy } from '../../components/ui/Icons'
import { Segmented } from '../../components/ui/controls'
import { EASE, Item, Stagger } from '../../components/ui/motion'
import { itemsForScope, type Scope } from '../../lib/scope'
import { approxGrade } from '../../lib/exam'
import { useExams } from '../../store/useExams'
import { useStore } from '../../store/useStore'
import { GrammarPage } from '../grammar/GrammarPage'
import { WordsPage } from '../words/WordsPage'
import { dueLabel, useDue } from '../review/ReviewPage'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'due', label: 'Fällig' },
  { id: 'weak', label: 'Schwierig' },
  { id: 'learned', label: 'Alle gelernten' },
  { id: 'favorites', label: 'Merkliste' },
]

/** Jede Übungsart hat ihre Farbe (Fläche, Unterkante), so findet man sie schnell wieder. */
const MODE_COLORS: Record<string, { c: string; s: string }> = {
  cards: { c: '#1e96fa', s: '#1474cc' },
  mix: { c: '#ff8a1f', s: '#d66a00' },
  write: { c: '#8b5cf6', s: '#6a3ad6' },
  speak: { c: '#ff5c9a', s: '#d43b77' },
  listen: { c: '#14b8a6', s: '#0d8f80' },
}

const MODES = [
  { id: 'cards', title: 'Karteikarten', text: 'Wort anschauen, Bedeutung überlegen, umdrehen. Schnell und ohne Tippen.', to: (s: string) => `/practice/cards?scope=${s}`, icon: <Cards size={24} /> },
  { id: 'mix', title: 'Gemischtes Quiz', text: 'Auswahl, Tippen, Hören und Sätze bauen im Wechsel.', to: (s: string) => `/practice/play?mode=mix&scope=${s}`, icon: <Trophy size={24} /> },
  { id: 'write', title: 'Schreibtraining', text: 'Nur aus dem Gedächtnis schreiben, der stärkste Weg zum Behalten.', to: (s: string) => `/practice/play?mode=write&scope=${s}`, icon: <Pencil size={24} /> },
  { id: 'speak', title: 'Sprechtraining', text: 'Wörter nachsprechen und die Aussprache verbessern, mit Lautschule.', to: (s: string) => `/speak?scope=${s}`, icon: <Speaker size={24} /> },
  { id: 'listen', title: 'Hörtraining', text: 'Wörter hören und verstehen oder aufschreiben.', to: (s: string) => `/practice/play?mode=listen&scope=${s}`, icon: <Headphones size={24} /> },
] as const

/** Üben und Wörterbuch an einem Ort: Umschalter oben, darunter je ein Bereich. */
export function PracticePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'words' ? 'words' : params.get('tab') === 'grammar' ? 'grammar' : 'practice'
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <h1 className="page-title">Üben</h1>
      <Segmented
        label="Bereich"
        className="mb-5 mt-3 w-full [&>button]:flex-1 [&>button]:py-2"
        value={tab}
        onChange={(v) => setParams(v === 'practice' ? {} : { tab: v }, { replace: true })}
        options={[
          { value: 'practice', label: 'Üben' },
          { value: 'words', label: 'Wörter' },
          { value: 'grammar', label: 'Grammatik' },
        ]}
      />
      {tab === 'words' ? <WordsPage embedded /> : tab === 'grammar' ? <GrammarPage embedded /> : <PracticeTab />}
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
  // Ganze Klasse ist immer wählbar: So geht das Üben auch, bevor etwas gelernt wurde
  const scopes = useMemo(() => [...SCOPES, { id: `grade:${grade}` as Scope, label: `Klasse ${grade}` }], [grade])
  const counts = useMemo(() => Object.fromEntries(scopes.map((s) => [s.id, itemsForScope(s.id, ctx).length])) as Record<Scope, number>, [ctx, scopes])
  // Beim ersten Öffnen gleich etwas Sinnvolles vorwählen: fällig, sonst schwierig, sonst alles Gelernte
  const [scope, setScope] = useState<Scope>(() => (['due', 'weak', 'learned', 'favorites'] as Scope[]).find((s) => counts[s] > 0) ?? (`grade:${grade}` as Scope))
  const count = useMemo(() => itemsForScope(scope, ctx).length, [scope, ctx])
  const gradeUnits = units.filter((u) => u.grade === grade)

  return (
    <Stagger stagger={0.08}>

      {/* Wiederholung: das wirksamste, deshalb ganz oben */}
      <Item>
        <section className={`mb-6 rounded-[20px] p-5 ${due.length > 0 ? 'bg-sky text-white' : 'card'}`} style={due.length > 0 ? { boxShadow: '0 5px 0 var(--shade-sky)' } : undefined} aria-label="Wiederholung">
          <div className="relative flex items-start gap-4">
            <div className="min-w-0 flex-1">
              {due.length > 0 ? (
                <>
                  <h2 className="text-[22px] font-extrabold leading-tight">{due.length} {due.length === 1 ? 'Wort ist' : 'Wörter sind'} jetzt fällig</h2>
                  <p className="mt-1 text-sm font-bold opacity-90">Jetzt kurz wiederholen, kurz bevor du sie vergessen würdest. Dann bleiben sie dauerhaft hängen.</p>
                </>
              ) : learnedCount > 0 ? (
                <>
                  <h2 className="text-[20px] font-extrabold leading-tight">Alles wiederholt</h2>
                  <p className="mt-1 text-sm text-muted">{next ? `Das nächste Wort ist ${dueLabel(next)} dran. ` : ''}Bis dahin kannst du frei üben oder eine neue Lektion lernen.</p>
                </>
              ) : (
                <>
                  <h2 className="text-[20px] font-extrabold leading-tight">Noch nichts zu wiederholen</h2>
                  <p className="mt-1 text-sm text-muted">Schließe eine Lektion ab. Danach plane ich automatisch, wann du welches Wort wiederholen solltest.</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {due.length > 0 ? (
                  <button className="btn press bg-white text-sky-dark" style={{ '--edge': 'rgba(0,0,0,0.18)' } as React.CSSProperties} onClick={() => navigate('/review/play')}>
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
        <BlitzCard />
      </Item>

      <Item>
        <h2 className="mb-1 text-lg font-semibold">Frei üben</h2>
        <p className="mb-3 text-sm text-muted">Such dir aus, was du trainieren willst und wie.</p>
        <p className="text-[17px] font-semibold mb-2.5">Welche Wörter?</p>
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Wörter auswählen">
          {scopes.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={scope === s.id}
              onClick={() => setScope(s.id)}
              className={`chip ${scope === s.id ? 'chip-on' : ''}`}
            >
              {s.id === 'favorites' && <Star size={14} />}
              {s.label}
              <span className="rounded-md bg-black/15 px-1.5 text-xs">{counts[s.id]}</span>
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
              <optgroup label="Meine Listen">
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
        <p className="text-[17px] font-semibold mb-2.5">Wie üben?</p>
        <ul className="grid grid-cols-2 gap-3">
          {MODES.map((m) => {
            const disabled = count === 0
            const col = MODE_COLORS[m.id]
            return (
              <li key={m.id} className={m.id === 'mix' ? 'col-span-2' : ''}>
                <Link
                  to={disabled ? '#' : m.to(scope)}
                  aria-disabled={disabled}
                  onClick={(e) => disabled && e.preventDefault()}
                  className={`card flex h-full gap-3 p-3.5 ${m.id === 'mix' ? 'items-center' : 'flex-col'} ${disabled ? 'opacity-50' : 'press hover:bg-snow'}`}
                  style={{ boxShadow: '0 4px 0 var(--shade-line)' }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: col.c, boxShadow: `0 3px 0 ${col.s}` }}>{m.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-extrabold leading-tight">{m.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">{m.text}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Item>

      <Item>
        <ExamCard />
      </Item>

      <Item>
        <Link to="/coach" className="card lift group mt-4 flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center text-brand-dark transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"><Sparkle size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Frag die KI</span>
            <span className="block text-sm text-muted">Fragen stellen, Buchseiten hochladen und dir einen Vokabeltest bauen lassen.</span>
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

/** Test oder Klassenarbeit von der KI erstellen lassen, plus die schon erstellten. */
function ExamCard() {
  const exams = useExams((s) => s.exams)
  const results = useExams((s) => s.results)
  const deleteExam = useExams((s) => s.deleteExam)
  return (
    <section className="mt-6" aria-label="Tests und Klassenarbeiten">
      <Link to="/exam/new" className="card lift group flex items-center gap-4 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-strong text-on-brand"><Pencil size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Test oder Klassenarbeit erstellen</span>
          <span className="block text-sm text-muted">Kurztest aus deinen Wörtern oder eine ganze Arbeit mit Hören, Wortschatz, Grammatik und Text. Aus Buch, Kurs oder Thema.</span>
        </span>
        <Right size={16} className="shrink-0 text-muted" />
      </Link>
      {exams.length > 0 && (
        <ul className="card mt-3 divide-y divide-line overflow-hidden">
          {exams.slice(0, 6).map((e) => {
            const last = results[e.id]?.[0]
            return (
              <li key={e.id} className="flex items-center gap-1 pr-2">
                <Link to={'/exam/' + e.id} className="press flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand-dark">{e.type === 'arbeit' ? 'KA' : 'Test'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.title}</span>
                    <span className="block truncate text-sm text-muted">{last ? `Zuletzt ${last.percent} % (Note ${approxGrade(last.percent).note})` : e.source}</span>
                  </span>
                </Link>
                <button type="button" aria-label={`${e.title} löschen`} onClick={() => deleteExam(e.id)} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-snow hover:text-bad">×</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Die Blitzrunde: der kurze, schnelle Weg zu Punkten und Rekord, ohne Lernplan. */
export function BlitzCard() {
  const best = useStore((s) => s.blitzBest ?? 0)
  const math = useStore((s) => (s.subject ?? 'fr') === 'math')
  return (
    <Link to="/blitz" className="press relative mb-6 flex items-center gap-4 overflow-hidden rounded-[20px] bg-violet p-4 text-white shadow-[0_5px_0_var(--shade-violet)]">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Flame size={30} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold leading-tight">Blitzrunde</span>
        <span className="block text-sm font-medium opacity-95">{best > 0 ? `60 Sekunden. Dein Rekord: ${best} Punkte` : math ? '60 Sekunden, so viele Aufgaben wie möglich' : '60 Sekunden, so viele Wörter wie möglich'}</span>
      </span>
      <Right size={18} className="shrink-0" />
    </Link>
  )
}
