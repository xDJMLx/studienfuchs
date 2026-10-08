import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Mascot } from '../../components/mascot/Mascot'
import { Segmented, Switch } from '../../components/ui/controls'
import { buildReport, FEEDBACK_URL, KIND_LABEL, reportText, sendReport, setUsageOptIn, usageOptIn, type AppSnapshot, type FeedbackKind, type SendResult } from '../../lib/feedback'
import { useStore } from '../../store/useStore'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 text-[15px] font-semibold outline-none transition-colors focus:border-sky'

const PLACEHOLDER: Record<FeedbackKind, string> = {
  fehler: 'Was ist passiert? Was hast du gemacht, und was hätte passieren sollen?',
  idee: 'Was würde die App für dich besser machen?',
  lob: 'Was gefällt dir?',
}

const DONE: Record<Exclude<SendResult, 'fehler' | 'abgebrochen'>, string> = {
  gesendet: 'Danke! Deine Nachricht ist angekommen.',
  geteilt: 'Danke! Schick die Nachricht im Teilen-Fenster ab, dann kommt sie an.',
  kopiert: 'Der Text ist kopiert. Schick ihn jetzt per Nachricht an den Entwickler.',
}

/** Fehler melden, Ideen schicken, Lob dalassen: ein Formular, das offen zeigt, was mitgeschickt wird. */
export function FeedbackSettings() {
  const [kind, setKind] = useState<FeedbackKind>('fehler')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [tech, setTech] = useState(true)
  const [showWhat, setShowWhat] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [usage, setUsage] = useState(usageOptIn())
  const snapshot: AppSnapshot = useStore(useShallow((s) => ({ grade: s.grade, subjects: (s.mySubjects ?? []).length, sets: s.sets.length, cards: Object.keys(s.cards).length, arbeiten: (s.arbeiten ?? []).length, mascot: s.mascot })))

  const preview = showWhat ? reportText(buildReport({ kind, message: message || '…', contact, withTech: tech, snapshot })) : ''
  const ok = message.trim().length >= 5

  const send = async () => {
    setBusy(true)
    const r = await sendReport(buildReport({ kind, message, contact, withTech: tech, snapshot }))
    setBusy(false)
    setResult(r)
    if (r === 'gesendet' || r === 'geteilt' || r === 'kopiert') setMessage('')
  }

  if (result && result !== 'fehler' && result !== 'abgebrochen') {
    return (
      <div className="flex flex-col items-center px-5 py-8 text-center" role="status">
        <Mascot size={96} mood="cheer" alive />
        <p className="mt-3 text-[17px] font-extrabold">{DONE[result]}</p>
        <button type="button" className="btn btn-ghost press mt-4" onClick={() => setResult(null)}>
          Noch etwas melden
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <Segmented<FeedbackKind>
        label="Art der Nachricht"
        className="mb-3 w-full [&>button]:flex-1"
        value={kind}
        onChange={setKind}
        options={(Object.keys(KIND_LABEL) as FeedbackKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
      />
      <label htmlFor="fb-msg" className="sr-only">
        Nachricht
      </label>
      <textarea id="fb-msg" className={`${field} min-h-32 resize-y font-medium`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={PLACEHOLDER[kind]} maxLength={2000} />

      <label htmlFor="fb-contact" className="mb-1 mt-3 block text-sm font-bold text-muted">
        Wie erreiche ich dich? (freiwillig)
      </label>
      <input id="fb-contact" className={field} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Name oder Handynummer, wenn ich nachfragen darf" maxLength={120} />

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-snow px-3 py-2.5">
        <span className="min-w-0 text-[14px] font-semibold">
          Technische Infos mitsenden
          <span className="block text-[12px] font-medium text-muted">Version, Gerät, Seite und die letzten Fehler. Hilft beim Finden.</span>
        </span>
        <Switch checked={tech} onChange={() => setTech((v) => !v)} label="Technische Infos mitsenden" />
      </div>
      <button type="button" className="press mt-1 min-h-9 rounded-xl text-sm font-extrabold text-sky-dark" onClick={() => setShowWhat((v) => !v)} aria-expanded={showWhat}>
        {showWhat ? 'Ausblenden' : 'Was wird gesendet?'}
      </button>
      {showWhat && (
        <pre className="mb-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-snow p-3 text-[12px] font-medium leading-snug text-muted" aria-label="Vorschau">
          {preview}
        </pre>
      )}

      {result === 'fehler' && (
        <p role="alert" className="mb-2 rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad-dark">
          Das Senden hat nicht geklappt. Bist du online? Versuch es nochmal.
        </p>
      )}
      <button type="button" className="btn btn-primary press mt-2 w-full" disabled={!ok || busy} onClick={send}>
        {busy ? 'Sende …' : FEEDBACK_URL ? 'Senden' : 'Senden (Teilen-Fenster)'}
      </button>
      {!FEEDBACK_URL && <p className="mt-2 text-xs text-muted">Das Gerät öffnet das Teilen-Fenster: Wähle dort, wie die Nachricht zum Entwickler kommt (z. B. per Nachricht).</p>}

      {FEEDBACK_URL && (
        <div className="mt-6 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-[15px] font-extrabold">
              Anonyme Nutzungsdaten teilen
              <span className="block text-[13px] font-medium text-muted">
                Hilft, die App zu verbessern: einmal pro Woche Zähler (wie viele Runden, Karten, Fehler) und die Gerätegröße. Keine Namen, keine Inhalte. Du kannst es jederzeit ausschalten.
              </span>
            </span>
            <Switch
              checked={usage}
              onChange={() => {
                setUsageOptIn(!usage)
                setUsage(!usage)
              }}
              label="Anonyme Nutzungsdaten teilen"
            />
          </div>
        </div>
      )}
    </div>
  )
}
