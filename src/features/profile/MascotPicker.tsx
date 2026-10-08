import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Mascot } from '../../components/mascot/Mascot'
import { SKINS, SPECIES_IDS, skinOf } from '../../components/mascot/species'
import { IconHelp } from '../../components/ui/IconHelp'
import { SPRING } from '../../components/ui/motion'
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
