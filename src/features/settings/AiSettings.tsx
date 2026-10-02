import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Row } from '../../components/ui/controls'
import { EASE } from '../../components/ui/motion'
import { AI_MODELS, ensureAiReady, getAiConfig, isAiReady, preloadAi, setAiConfig, signOutAi, testConnection } from '../../lib/ai'

type Msg = { ok: boolean; text: string } | null

/** Zeilen für die Karte "KI" in den Einstellungen: kostenlos über ein automatisches Puter-Gastkonto, optional mit eigenem Anthropic-Schlüssel. */
export function AiSettings() {
  const [saved, setSaved] = useState(getAiConfig())
  const [key, setKey] = useState('')
  const [model, setModel] = useState<string>(AI_MODELS[0].id)
  const [show, setShow] = useState(false)
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    preloadAi()
    let alive = true
    void isAiReady().then((r) => alive && setReady(r))
    return () => {
      alive = false
    }
  }, [saved.provider])

  const own = saved.provider === 'anthropic'
  const active = own || ready

  const activate = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await ensureAiReady()
      setReady(true)
      await testConnection()
      setMsg({ ok: true, text: 'Die KI ist aktiv und antwortet.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Das hat nicht geklappt.' })
    } finally {
      setBusy(false)
    }
  }

  const saveOwn = async () => {
    if (!key.trim()) return
    setAiConfig({ provider: 'anthropic', key, model })
    setSaved(getAiConfig())
    setBusy(true)
    setMsg(null)
    try {
      await testConnection()
      setMsg({ ok: true, text: 'Schlüssel gespeichert, die Verbindung funktioniert.' })
    } catch (e) {
      setMsg({ ok: false, text: `Gespeichert, aber: ${e instanceof Error ? e.message : 'Test fehlgeschlagen.'}` })
    } finally {
      setBusy(false)
    }
  }

  const backToDefault = () => {
    setAiConfig(null)
    setKey('')
    setSaved(getAiConfig())
    setMsg({ ok: true, text: 'Eigener Schlüssel entfernt. Es wird wieder die kostenlose KI genutzt.' })
  }

  const disconnect = async () => {
    await signOutAi()
    setReady(false)
    setMsg({ ok: true, text: 'Gastkonto getrennt. Beim nächsten Mal wird bei Bedarf ein neues angelegt.' })
  }

  return (
    <>
      <div className="px-5 py-4">
        <p className="mb-3 text-sm text-muted">
          Aus Fotos oder PDF-Seiten deines Schulbuchs macht die KI saubere Vokabelkarten mit Beispielsätzen. Du brauchst keinen eigenen Schlüssel: Beim ersten Mal wird automatisch ein kostenloses
          Gastkonto bei Puter angelegt, die Nutzung läuft über dieses Konto.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-snow px-4 py-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {active && <span className="absolute inset-0 animate-halo rounded-full bg-good" />}
            <span className={`relative h-2.5 w-2.5 rounded-full ${active ? 'bg-good' : 'bg-muted/40'}`} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium">{own ? 'Eigener Anthropic-Schlüssel aktiv' : ready ? 'Kostenlose KI aktiv (Puter-Gastkonto)' : 'Noch nicht aktiviert, startet beim ersten Gebrauch'}</p>
          {!own && (
            <div className="flex gap-2">
              <button className="btn btn-primary press !px-4 !py-2 !text-sm" onClick={activate} disabled={busy}>
                {busy ? 'Einen Moment …' : ready ? 'Testen' : 'Aktivieren'}
              </button>
              {ready && (
                <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={disconnect} disabled={busy}>Trennen</button>
              )}
            </div>
          )}
          {own && <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={backToDefault}>Zurück zur kostenlosen KI</button>}
        </div>
        {msg && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className={`mt-3 text-sm font-medium ${msg.ok ? 'text-good-dark' : 'text-bad-dark'}`} role="status">
            {msg.text}
          </motion.p>
        )}
      </div>

      <details className="group px-5 py-4" open={own}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
          Erweitert: eigenen Anthropic-Schlüssel nutzen
          <span className="text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden>⌄</span>
        </summary>
        <p className="mb-3 mt-2 text-sm text-muted">
          Wenn du lieber dein eigenes Konto bei Anthropic nutzt (console.anthropic.com → API Keys). Die Nutzung wird dort abgerechnet, eine Seite kostet meist nur wenige Cent.
        </p>
        <label htmlFor="ai-key" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">API-Schlüssel</label>
        <div className="mb-3 flex gap-2">
          <input
            id="ai-key"
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={own ? 'Gespeichert, zum Ändern neu eingeben' : 'sk-ant-…'}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-line bg-snow px-3 py-2.5 font-mono text-sm outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]"
          />
          <button type="button" className="btn btn-ghost press !px-3 !py-2 !text-sm" onClick={() => setShow((s) => !s)}>{show ? 'Verbergen' : 'Zeigen'}</button>
        </div>
        <label htmlFor="ai-model" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Modell</label>
        <select id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} className="mb-4 w-full rounded-xl border border-line bg-snow px-3 py-2.5 text-sm font-medium outline-none focus:border-brand">
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={saveOwn} disabled={!key.trim() || busy}>Speichern und testen</button>
      </details>

      <Row title="Datenschutz" hint="Es wird nur etwas gesendet, wenn du auf „Mit KI erstellen“ oder „Mit KI ergänzen“ klickst. Dann gehen die gewählten Seitenbilder an Puter und dessen KI-Anbieter (bei eigenem Schlüssel direkt an Anthropic). Ein eigener Schlüssel bleibt nur in diesem Browser und ist nicht Teil der Sicherung. Lade nur Seiten hoch, die du zum Lernen verwenden darfst." />
    </>
  )
}
