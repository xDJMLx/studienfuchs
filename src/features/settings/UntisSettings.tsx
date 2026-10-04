import { useRef, useState } from 'react'
import { agoText, normalizeUntisUrl, UntisError } from '../../lib/untis'
import { syncUntis } from '../../lib/untisSync'
import { useStore } from '../../store/useStore'

const field = 'w-full rounded-xl border-2 border-line bg-snow px-3 py-2.5 text-[15px] font-semibold outline-none transition-colors focus:border-sky'

/**
 * WebUntis verbinden: iCal-Link aus WebUntis einfügen (oder eine .ics-Datei laden). Die App liest daraus den Unterricht,
 * Klassenarbeiten und Tests und das Stundenraster und gleicht danach von selbst ab.
 */
export function UntisSettings({ onToast }: { onToast: (ok: boolean, text: string) => void }) {
  const untis = useStore((s) => s.untis)
  const connect = useStore((s) => s.connectUntis)
  const disconnect = useStore((s) => s.disconnectUntis)
  const setRelay = useStore((s) => s.setUntisRelay)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const run = async (text?: string) => {
    setBusy(true)
    const r = await syncUntis({ text })
    setBusy(false)
    onToast(r.ok, r.message)
  }

  const doConnect = async () => {
    try {
      connect(normalizeUntisUrl(link))
      setLink('')
      await run()
    } catch (e) {
      onToast(false, e instanceof UntisError ? e.message : 'Der Link ist ungültig.')
    }
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
          <p className="mb-3 text-sm text-muted">
            Verbinde deinen WebUntis-Stundenplan: Die App holt sich Unterricht, Klassenarbeiten und Tests und die Zeiten deiner Stunden und gleicht danach von selbst ab.
          </p>
          <ol className="mb-3 list-decimal pl-5 text-sm leading-relaxed text-muted">
            <li>Öffne WebUntis im Browser und geh zu „Mein Stundenplan“.</li>
            <li>Such den Kalender-Link zum Abonnieren (iCal) und kopiere ihn.</li>
            <li>Füge ihn hier ein.</li>
          </ol>
          <label htmlFor="untis-link" className="mb-1 block text-sm font-bold text-muted">
            iCal-Link
          </label>
          <input id="untis-link" className={field} inputMode="url" autoCapitalize="off" autoCorrect="off" placeholder="webcal://…" value={link} onChange={(e) => setLink(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary press !px-5" disabled={!link.trim() || busy} onClick={doConnect}>
              {busy ? 'Verbinde …' : 'Mit WebUntis verbinden'}
            </button>
            <button type="button" className="btn btn-ghost press !px-5" disabled={busy} onClick={() => file.current?.click()}>
              .ics-Datei laden
            </button>
            {fromFile && (
              <button type="button" className="press rounded-xl px-3 text-sm font-extrabold text-muted hover:bg-snow" onClick={() => disconnect()}>
                Trennen
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="font-extrabold">Mit WebUntis verbunden</p>
          <p className="mb-3 text-sm text-muted">
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
            <button type="button" className="btn btn-ghost press !px-5" disabled={busy} onClick={() => file.current?.click()}>
              .ics-Datei laden
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

      <button type="button" className="press mt-4 rounded-xl text-sm font-extrabold text-sky-dark" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced}>
        {advanced ? 'Weniger anzeigen' : 'Funktioniert der Abruf nicht?'}
      </button>
      {advanced && (
        <div className="mt-2 grid gap-2 rounded-xl bg-snow p-3 text-sm text-muted">
          <p>
            WebUntis erlaubt den Abruf direkt aus dem Browser oft nicht. Dann hilft ein kleines <b>Relais</b> (kostenlos bei Cloudflare, Anleitung in <code>relay/README.md</code>). Der Link geht dabei kurz durch dieses Relais, es speichert nichts.
          </p>
          <label htmlFor="untis-relay" className="font-bold">
            Adresse des Relais (optional)
          </label>
          <input
            id="untis-relay"
            className={field}
            placeholder="https://studienfuchs-untis.dein-name.workers.dev"
            defaultValue={untis?.relay ?? ''}
            disabled={!untis}
            onBlur={(e) => setRelay(e.target.value)}
          />
          <p>Ohne Relais bleibt immer der Weg über die .ics-Datei: In WebUntis exportieren, hier laden, fertig.</p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Der Link enthält einen geheimen Schlüssel für deinen Stundenplan. Er bleibt auf diesem Gerät (und in deiner Sicherung). Teile ihn nicht.</p>
    </div>
  )
}
