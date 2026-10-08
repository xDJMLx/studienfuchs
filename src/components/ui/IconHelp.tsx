import { buildIconSvg } from '../../lib/appIcon'
import { isIos } from '../../lib/install'
import { Sheet } from './Sheet'

const dataUrl = (dark: boolean) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildIconSvg(dark))}`

/** Das Symbol in Hell und Dunkel, so wie es aufs Handy kommt. */
export function IconPreview() {
  return (
    <div className="flex justify-center gap-5" aria-hidden="true">
      <img src={dataUrl(false)} alt="" width={84} height={84} className="rounded-[22px] shadow-sm" />
      <img src={dataUrl(true)} alt="" width={84} height={84} className="rounded-[22px] shadow-sm" />
    </div>
  )
}

/** Erklärt, warum sich ein schon aufgelegtes Symbol nicht von allein ändert, und wie man es neu holt. */
export function IconHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = isIos()
    ? [
        'Halte das alte Symbol gedrückt und wähle „Lesezeichen entfernen“ (oder „App entfernen“, dann „Vom Home-Bildschirm entfernen“).',
        'Öffne diese Seite in Safari.',
        'Tippe auf „Teilen“ und dann „Zum Home-Bildschirm“.',
      ]
    : [
        'Halte das alte Symbol gedrückt und wähle „Deinstallieren“ oder „Entfernen“.',
        'Öffne diese Seite im Browser-Menü (drei Punkte) und wähle „App installieren“.',
        'Bestätige mit „Installieren“.',
      ]
  return (
    <Sheet open={open} onClose={onClose} title="Neues Symbol aufs Handy">
      <IconPreview />
      <p className="mt-4 text-muted">
        So sieht das neue Symbol aus, hell und dunkel. Eine Webseite kann ein Symbol auf deinem Startbildschirm nicht austauschen: Das Handy merkt es sich beim Hinzufügen. Dafür einmal neu holen:
      </p>
      <ol className="mt-4 grid gap-3">
        {steps.map((t, i) => (
          <li key={t} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-bold text-on-brand">{i + 1}</span>
            <span className="pt-0.5">{t}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted">Sichere vorher unter Einstellungen → Daten und Sicherung, falls dein Handy die Lernstände der neuen App nicht übernimmt.</p>
      <button className="btn btn-primary mt-5 w-full" onClick={onClose}>
        Verstanden
      </button>
    </Sheet>
  )
}
