import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from '../../components/ui/Icons'
import { agoText, looksLikeUntisLink, normalizeUntisUrl, UntisError } from '../../lib/untis'
import { syncUntis } from '../../lib/untisSync'
import { useStore } from '../../store/useStore'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 text-[15px] font-semibold outline-none transition-colors focus:border-sky'

/** Den Link aus der Zwischenablage holen, wenn der Browser es ohne Nachfrage erlaubt (Wechsel von WebUntis zurück in die App). */
async function peekClipboard(): Promise<string> {
  try {
    const perm = await navigator.permissions?.query({ name: 'clipboard-read' as PermissionName })
    if (perm && perm.state !== 'granted') return ''
    const t = (await navigator.clipboard.readText()).trim()
    return looksLikeUntisLink(t) ? t : ''
  } catch {
    return ''
  }
}

/**
 * WebUntis verbinden in zwei Schritten: WebUntis öffnen und den Link kopieren, hier mit einem Tipp einfügen.
 * Die App liest daraus Unterricht, Klassenarbeiten, Tests und das Stundenraster und gleicht danach von selbst ab.
 * Der Link wird beim Einfügen sofort verbunden, die App erkennt ihn auch in der Zwischenablage, wenn man zurückkommt.
 */
export function UntisSettings({ onToast, onDone }: { onToast: (ok: boolean, text: string) => void; onDone?: () => void }) {
  const untis = useStore((s) => s.untis)
  const connect = useStore((s) => s.connectUntis)
  const disconnect = useStore((s) => s.disconnectUntis)
  const setRelay = useStore((s) => s.setUntisRelay)
  const [link, setLink] = useState('')
  const [found, setFound] = useState('')
  const [busy, setBusy] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const [manual, setManual] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const run = useCallback(
    async (text?: string): Promise<boolean> => {
      setBusy(true)
      const r = await syncUntis({ text })
      setBusy(false)
      onToast(r.ok, r.message)
      if (r.ok) onDone?.()
      return r.ok
    },
    [onToast, onDone],
  )

  const connectWith = useCallback(
    async (raw: string) => {
      try {
        connect(normalizeUntisUrl(raw))
        setLink('')
        setFound('')
        await run()
      } catch (e) {
        onToast(false, e instanceof UntisError ? e.message : 'Der Link ist ungültig.')
      }
    },
    [connect, run, onToast],
  )

  // Kommt man aus WebUntis zurück, liegt der Link oft schon in der Zwischenablage: erkennen und zum Verbinden anbieten
  useEffect(() => {
    if (untis && untis.url) return
    let alive = true
    const look = () => {
      void peekClipboard().then((t) => alive && t && setFound(t))
    }
    look()
    document.addEventListener('visibilitychange', look)
    window.addEventListener('focus', look)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', look)
      window.removeEventListener('focus', look)
    }
  }, [untis])

  /** Ein Tipp: Link aus der Zwischenablage nehmen und verbinden. Geht das nicht (Browser fragt nicht), zeigt sich das Feld zum Einfügen. */
  const pasteAndConnect = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (looksLikeUntisLink(t)) return connectWith(t)
      onToast(false, 'In der Zwischenablage liegt noch kein WebUntis-Link. Kopiere ihn in WebUntis und tippe nochmal.')
    } catch {
      /* Zugriff verweigert oder nicht möglich: Feld zum Einfügen zeigen */
    }
    setManual(true)
    window.setTimeout(() => input.current?.focus(), 50)
  }

  const doFile = async (f: File | undefined) => {
    if (!f) return
    // Eine Datei braucht keinen Link: Die Verbindung wird ohne Adresse angelegt (dann gibt es keinen automatischen Abgleich)
    if (!untis) connect('')
    await run(await f.text())
    if (file.current) file.current.value = ''
  }

  const fromFile = !!untis && !untis.url

  return (
    <div className="px-5 py-4">
      {!untis || fromFile ? (
        <>
          {fromFile && (
            <p className="mb-3 rounded-xl bg-good-soft p-3 text-sm font-semibold text-good-dark">
              Aus Datei geladen: {untis!.lessons.length} Stunden, {untis!.exams} {untis!.exams === 1 ? 'Arbeit' : 'Arbeiten'}. Mit einem Link gleicht die App danach von selbst ab.
            </p>
          )}

          {found && (
            <div className="mb-4 rounded-2xl border-2 border-good bg-good-soft p-4" role="status">
              <p className="flex items-center gap-2 font-extrabold text-good-dark">
                <Check size={18} /> WebUntis-Link gefunden
              </p>
              <p className="mt-0.5 break-all text-xs text-good-dark/80">{found.replace(/token=[^&]+/i, 'token=…').slice(0, 90)}</p>
              <button type="button" className="btn btn-primary press mt-3 w-full" disabled={busy} onClick={() => connectWith(found)}>
                {busy ? 'Verbinde …' : 'Jetzt verbinden'}
              </button>
            </div>
          )}

          <ol className="grid gap-4">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sm font-black text-sky-dark">1</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold leading-tight">Link in WebUntis kopieren</p>
                <p className="mt-0.5 text-sm text-muted">
                  Öffne WebUntis, geh zu <b>Mein Stundenplan</b>, tippe unten rechts auf <b>⋯</b> und dann auf <b>iCal-Abo verwalten</b>. Kopiere dort den Link.
                </p>
                <a href="https://webuntis.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost press mt-2 !min-h-10 !px-4 !text-[15px]">
                  WebUntis öffnen
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sm font-black text-sky-dark">2</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold leading-tight">Hier einfügen</p>
                <p className="mt-0.5 text-sm text-muted">Ein Tipp, und die App holt Unterricht, Arbeiten und Stundenzeiten.</p>
                <button type="button" className="btn btn-primary press mt-2 w-full sm:w-auto" disabled={busy} onClick={pasteAndConnect}>
                  {busy ? 'Verbinde …' : 'Link einfügen und verbinden'}
                </button>
              </div>
            </li>
          </ol>

          {manual && (
            <div className="mt-4">
              <label htmlFor="untis-link" className="mb-1 block text-sm font-bold text-muted">
                Link hier einfügen
              </label>
              <input
                ref={input}
                id="untis-link"
                className={field}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="webcal://…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onPaste={(e) => {
                  const t = e.clipboardData.getData('text').trim()
                  if (looksLikeUntisLink(t)) {
                    e.preventDefault()
                    void connectWith(t)
                  }
                }}
              />
              <button type="button" className="btn btn-primary press mt-2 w-full" disabled={!link.trim() || busy} onClick={() => connectWith(link)}>
                Verbinden
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            {!manual && (
              <button type="button" className="press min-h-9 rounded-xl text-sm font-extrabold text-sky-dark" onClick={() => setManual(true)}>
                Link selbst eintippen
              </button>
            )}
            <button type="button" className="press min-h-9 rounded-xl text-sm font-extrabold text-sky-dark" disabled={busy} onClick={() => file.current?.click()}>
              Oder .ics-Datei laden
            </button>
            {fromFile && (
              <button type="button" className="press min-h-9 rounded-xl text-sm font-extrabold text-muted" onClick={() => disconnect()}>
                Trennen
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-good text-white">
              <Check size={14} />
            </span>
            Mit WebUntis verbunden
          </p>
          <p className="mb-3 mt-1 text-sm text-muted">
            Zuletzt abgeglichen: {agoText(untis.lastSync)}. {untis.lessons.length} Stunden, {untis.exams} {untis.exams === 1 ? 'Arbeit' : 'Arbeiten'}. Die App gleicht von selbst ab, wenn du sie öffnest.
          </p>
          {untis.lastError && (
            <p role="alert" className="mb-3 rounded-xl bg-bad-soft p-3 text-sm font-semibold text-bad-dark">
              {untis.lastError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary press !px-5" disabled={busy} onClick={() => run()}>
              {busy ? 'Gleiche ab …' : 'Jetzt abgleichen'}
            </button>
            {confirmOff ? (
              <>
                <button type="button" className="btn btn-ghost press !px-4" onClick={() => setConfirmOff(false)}>
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="btn btn-bad press !px-4"
                  onClick={() => {
                    disconnect()
                    setConfirmOff(false)
                    onToast(true, 'WebUntis getrennt. Deine Karteikarten und eigenen Arbeiten bleiben.')
                  }}
                >
                  Wirklich trennen
                </button>
              </>
            ) : (
              <button type="button" className="press rounded-xl px-3 text-sm font-extrabold text-muted hover:bg-snow" onClick={() => setConfirmOff(true)}>
                Trennen
              </button>
            )}
          </div>
        </>
      )}
      <input ref={file} type="file" accept=".ics,text/calendar" className="sr-only" aria-label="iCal-Datei" onChange={(e) => doFile(e.target.files?.[0])} />

      <button type="button" className="press mt-4 min-h-9 rounded-xl text-sm font-extrabold text-muted" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced}>
        {advanced ? 'Weniger anzeigen' : 'Klappt nicht?'}
      </button>
      {advanced && (
        <div className="mt-2 grid gap-2 rounded-xl bg-snow p-3 text-sm text-muted">
          <p>
            Manche Schulen erlauben den Abruf aus dem Browser nicht. Dann holt die App den Plan über Puter, falls das möglich ist. Hilft das nicht, geht immer der Weg über die <b>.ics-Datei</b>: In WebUntis exportieren und hier laden.
          </p>
          <label htmlFor="untis-relay" className="font-bold">
            Eigenes Relais (nur für Fortgeschrittene, optional)
          </label>
          <input id="untis-relay" className={field} placeholder="https://studienfuchs-untis.dein-name.workers.dev" defaultValue={untis?.relay ?? ''} disabled={!untis} onBlur={(e) => setRelay(e.target.value)} />
          <p>Anleitung: <code>relay/README.md</code>.</p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Der Link enthält einen geheimen Schlüssel für deinen Stundenplan. Er bleibt auf diesem Gerät (und in deiner Sicherung). Teile ihn nicht.</p>
    </div>
  )
}
