import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Fr } from '../../components/exercises/common'
import { Back, Cards, Check, Headphones, Pencil, Speaker, Trash, Trophy } from '../../components/ui/Icons'
import { Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { AiError, enrichItems, ensureAiReady } from '../../lib/ai'
import { planToday } from '../../lib/plan'
import { masteryOf } from '../../lib/srs'
import { useStore } from '../../store/useStore'
import { AiNotice } from '../settings/AiNotice'
import { newRow, VocabTable, type Row } from '../upload/VocabTable'

export function SetDetailPage() {
  const { setId = '' } = useParams()
  const navigate = useNavigate()
  const set = useStore((s) => s.sets.find((x) => x.id === setId))
  const cards = useStore((s) => s.cards)
  const examDate = useStore((s) => s.examDates[setId] ?? null)
  const { updateSet, deleteSet, setExamDate } = useStore.getState()
  const [editing, setEditing] = useState<Row[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const plan = useMemo(() => (set ? planToday(set.items, cards, examDate) : null), [set, cards, examDate])
  if (!set || !plan) return <Navigate to="/practice" replace />

  const startEdit = () => setEditing(set.items.map((i) => newRow(i.front, i.back, { example: i.example, exampleDe: i.exampleDe, note: i.note })))
  const saveEdit = () => {
    const prev = new Map(set.items.map((i, idx) => [`${i.front}|${i.back}`, idx]))
    const items = (editing ?? [])
      .filter((r) => r.front.trim() && r.back.trim())
      .map((r, i) => {
        // Unveränderte Wörter behalten ihre ID und damit ihren Lernfortschritt
        const old = prev.get(`${r.front.trim()}|${r.back.trim()}`)
        return {
          id: old !== undefined ? set.items[old].id : `${set.id}:n${Date.now().toString(36)}${i}`,
          front: r.front.trim(),
          back: r.back.trim(),
          ...(r.example?.trim() && r.exampleDe?.trim() ? { example: r.example.trim(), exampleDe: r.exampleDe.trim() } : {}),
          ...(r.note?.trim() ? { note: r.note.trim() } : {}),
        }
      })
    updateSet(set.id, { items })
    setEditing(null)
  }

  const missing = set.items.filter((i) => !i.example)
  const enrich = async () => {
    setAiBusy(true)
    setAiMsg(null)
    try {
      await ensureAiReady()
      const result = await enrichItems(missing.map((m) => ({ front: m.front, back: m.back })))
      let n = 0
      const items = set.items.map((it) => {
        const r = result[it.front.toLowerCase()]
        if (!it.example && r) {
          n++
          return { ...it, example: r.example, exampleDe: r.exampleDe, ...(r.note ? { note: r.note } : {}) }
        }
        return it
      })
      updateSet(set.id, { items })
      setAiMsg({ ok: true, text: `${n} Wörter bekamen Beispielsätze und Merktipps.` })
    } catch (e) {
      setAiMsg({ ok: false, text: e instanceof AiError || e instanceof Error ? e.message : 'Das hat nicht geklappt.' })
    } finally {
      setAiBusy(false)
    }
  }

  const todayCount = plan.items.length
  const minDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  return (
    <Stagger className="mx-auto max-w-xl px-4 py-6" stagger={0.07}>
      <Item>
        <Link to="/practice" className="press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted hover:text-ink">
          <Back size={18} /> Üben
        </Link>
        <h1 className="page-title">{set.title}</h1>
        <p className="mb-5 mt-1 text-muted">{set.items.length} Wörter</p>
      </Item>

      <Item>
        <div className="card mb-5 p-5">
          <h2 className="mb-1 text-lg font-semibold">Heute dran</h2>
          <p className="mb-4 text-sm text-muted">
            {plan.dueCount > 0 && <>{plan.dueCount} fällige Wörter · </>}
            {plan.newCount} neue Wörter
            {plan.daysLeft !== null && <> · Klassenarbeit in {plan.daysLeft} {plan.daysLeft === 1 ? 'Tag' : 'Tagen'}</>}
          </p>
          <button className="btn btn-primary press w-full" disabled={todayCount === 0} onClick={() => navigate(`/sets/${set.id}/play`)}>
            {todayCount ? 'Jetzt lernen' : 'Heute alles erledigt'}
          </button>
        </div>
      </Item>

      <Item>
        <p className="eyebrow mb-2">Anders üben</p>
        <StaggerList className="mb-5 grid grid-cols-2 gap-3" stagger={0.06}>
          {[
            { to: `/sets/${set.id}/cards`, label: 'Karteikarten', icon: <Cards size={22} /> },
            { to: `/practice/play?mode=mix&scope=set:${set.id}`, label: 'Quiz', icon: <Trophy size={22} /> },
            { to: `/practice/play?mode=write&scope=set:${set.id}`, label: 'Schreiben', icon: <Pencil size={22} /> },
            { to: `/practice/play?mode=listen&scope=set:${set.id}`, label: 'Hören', icon: <Headphones size={22} /> },
            { to: `/speak?scope=set:${set.id}`, label: 'Sprechen', icon: <Speaker size={22} /> },
            { to: `/exam/new?type=kurztest&set=${set.id}`, label: 'Kurztest', icon: <Check size={22} /> },
          ].map((m) => (
            <ItemLi key={m.label}>
              <Link to={m.to} className="card lift group flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center text-brand-dark transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">{m.icon}</span>
                <span className="font-semibold">{m.label}</span>
              </Link>
            </ItemLi>
          ))}
        </StaggerList>
      </Item>

      {missing.length > 0 && (
        <Item>
          <div className="card mb-5 p-5">
            <h2 className="mb-1 text-lg font-semibold">Beispielsätze fehlen</h2>
            <p className="mb-3 text-sm text-muted">{missing.length} Wörter haben noch keinen Beispielsatz. Mit Beispielen merkt man sich Wörter deutlich besser.</p>
            <button className="btn btn-primary press mb-3" onClick={enrich} disabled={aiBusy}>{aiBusy ? 'Die KI schreibt …' : 'Mit KI ergänzen'}</button>
            <AiNotice />
            {aiMsg && <p className={`mt-3 text-sm font-medium ${aiMsg.ok ? 'text-good-dark' : 'text-bad-dark'}`} role="status">{aiMsg.text}</p>}
          </div>
        </Item>
      )}

      <Item>
        <div className="card mb-5 p-5">
          <h2 className="mb-1 text-lg font-semibold">Klassenarbeit / Vokabeltest</h2>
          <p className="mb-3 text-sm text-muted">Mit Datum verteile ich die neuen Wörter so, dass du alles rechtzeitig kannst.</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              min={minDate}
              value={examDate ?? ''}
              onChange={(e) => setExamDate(set.id, e.target.value || null)}
              aria-label="Datum der Klassenarbeit"
              className="rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]"
            />
            {examDate && (
              <button className="press rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-snow hover:text-ink" onClick={() => setExamDate(set.id, null)}>
                Datum entfernen
              </button>
            )}
          </div>
          {examDate && <p className="mt-3 text-sm font-semibold text-brand-dark">Plan: ca. {plan.perDay} neue Wörter pro Tag.</p>}
        </div>
      </Item>

      <Item>
        {editing ? (
          <div className="mb-5">
            <VocabTable rows={editing} onChange={setEditing} />
            <div className="mt-4 flex gap-3">
              <button className="btn btn-ghost press" onClick={() => setEditing(null)}>Abbrechen</button>
              <button className="btn btn-primary press flex-1" onClick={saveEdit}>Speichern</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Wörter</h2>
              <button className="press rounded-xl px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-soft" onClick={startEdit}>Bearbeiten</button>
            </div>
            <ul className="mb-8 grid gap-2">
              {set.items.map((i) => {
                const m = masteryOf(cards[i.id])
                return (
                  <li key={i.id} className="card flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <Fr className="font-semibold">{i.front}</Fr>
                      <span className="ml-2 text-muted">{i.back}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${m === 2 ? 'bg-good-soft text-good-dark' : m === 1 ? 'bg-gold/20 text-gold-dark' : 'bg-snow text-muted'}`}
                    >
                      {m === 2 ? 'fest' : m === 1 ? 'lernt' : 'neu'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Item>

      <Item>
        {confirmDelete ? (
          <div className="card p-4 text-center">
            <p className="mb-3 font-semibold">Set und Lernfortschritt wirklich löschen?</p>
            <div className="flex gap-3">
              <button className="btn btn-ghost press flex-1" onClick={() => setConfirmDelete(false)}>Abbrechen</button>
              <button
                className="btn btn-bad press flex-1"
                onClick={() => {
                  deleteSet(set.id)
                  navigate('/practice', { replace: true })
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        ) : (
          <button className="press flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted hover:text-bad-dark" onClick={() => setConfirmDelete(true)}>
            <Trash size={18} /> Set löschen
          </button>
        )}
      </Item>
    </Stagger>
  )
}
