import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Mascot } from '../../components/mascot/Mascot'
import { SKINS, SPECIES_IDS, skinOf, type SpeciesId } from '../../components/mascot/species'
import { Sheet } from '../../components/ui/Sheet'
import { SPRING } from '../../components/ui/motion'
import { isIos } from '../../lib/install'
import { useStore } from '../../store/useStore'

/**
 * Das Lerntier aussuchen: oben das gewählte Tier groß (es winkt und redet), darunter alle zwölf als Kacheln.
 * Zubehör aus dem Laden passt auf jedes Tier.
 */
export function MascotPicker({ onPick, compact = false }: { onPick?: (id: string) => void; compact?: boolean }) {
  const reduce = useReducedMotion()
  const chosen = useStore((s) => s.mascot)
  const outfit = useStore((s) => s.outfit)
  const setMascot = useStore((s) => s.setMascot)
  const skin = skinOf(chosen)
  const [help, setHelp] = useState(false)

  return (
    <div>
      {!compact && (
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="relative mb-9 h-[168px] w-[168px]">
          <motion.div key={skin.id} initial={reduce ? false : { scale: 0.7, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={SPRING.bouncy}>
            <Mascot size={168} alive listen outfit={outfit} species={skin.id} mood="happy" label={`${skin.label} ${skin.name}`} greet={`Ich bin ${skin.name}!`} />
          </motion.div>
        </div>
        <p className="mt-2 text-[20px] font-black leading-tight">{skin.name}</p>
        <p className="text-sm text-muted">
          {skin.label} · {skin.blurb}
        </p>
      </div>
      )}

      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Lerntier">
        {SPECIES_IDS.map((id) => {
          const s = SKINS[id]
          const on = id === skin.id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${s.name}, ${s.label}`}
              onClick={() => {
                setMascot(id)
                onPick?.(id)
              }}
              className={`press flex flex-col items-center rounded-2xl border-[1.5px] px-1 pb-2.5 pt-2.5 transition-colors ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}
            >
              <span className="mb-3.5 block h-[72px] w-[72px]">
                <Mascot size={72} species={id} mood="happy" />
              </span>
              <span className={`mt-1 block w-full truncate text-[13px] font-extrabold leading-tight ${on ? 'text-brand-dark' : ''}`}>{s.name}</span>
            </button>
          )
        })}
      </div>
      {!compact && (
        <>
          <button type="button" onClick={() => setHelp(true)} className="press mt-3 w-full rounded-xl px-1 py-2 text-left text-[13px] font-bold text-brand-dark">
            Symbol auf dem Startbildschirm erneuern
          </button>
          <IconHelp open={help} onClose={() => setHelp(false)} species={skin.id} name={skin.name} />
        </>
      )}
    </div>
  )
}

/** Das Symbol des gewählten Tieres in Hell und Dunkel (so wie es aufs Handy kommt), gezeichnet wie beim Hinzufügen. */
function IconPreview({ species }: { species: SpeciesId }) {
  const [urls, setUrls] = useState<{ light: string; dark: string } | null>(null)
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    let alive = true
    void Promise.all([import('../../components/mascot/snapshot'), import('../../lib/appIcon')])
      .then(async ([snap, icon]) => {
        const markup = await snap.renderMascotMarkup(species)
        const url = (dark: boolean) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.buildIconSvg(markup, species, dark))}`
        if (alive) setUrls({ light: url(false), dark: url(true) })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [species])
  if (!urls) return <div className="h-[84px]" aria-hidden="true" />
  return (
    <div className="flex justify-center gap-5" aria-hidden="true">
      <img src={urls.light} alt="" width={84} height={84} className="rounded-[22px] shadow-sm" />
      <img src={urls.dark} alt="" width={84} height={84} className="rounded-[22px] shadow-sm" />
    </div>
  )
}

/** Erklärt, warum sich ein schon aufgelegtes Symbol nicht von allein ändert, und wie man es neu holt. */
function IconHelp({ open, onClose, species, name }: { open: boolean; onClose: () => void; species: SpeciesId; name: string }) {
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
      <IconPreview species={species} />
      <p className="mt-4 text-muted">
        So sieht das Symbol von {name} aus, hell und dunkel. Eine Webseite kann ein Symbol auf deinem Startbildschirm nicht austauschen: Das Handy merkt es sich beim Hinzufügen. Dafür einmal neu holen:
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
