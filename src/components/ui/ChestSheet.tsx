import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mascot } from '../mascot/Mascot'
import { mascotBus } from '../../lib/mascotBus'
import { itemById } from '../../lib/shop'
import type { ChestReward } from '../../lib/rewards'
import { playDone } from '../../lib/sound'
import { useStore } from '../../store/useStore'
import { Confetti } from './Confetti'
import { Chest, Coin, Shield } from './Icons'
import { SPRING } from './motion'
import { Sheet } from './Sheet'

function describe(r: ChestReward): { title: string; text: string; icon: React.ReactNode } {
  if (r.kind === 'coins') {
    return {
      title: r.lucky ? 'Glückstreffer!' : 'Münzen!',
      text: `+${r.amount} Münzen für den Fuchs-Laden`,
      icon: <Coin size={44} />,
    }
  }
  if (r.kind === 'freeze') {
    return { title: 'Serien-Schutz!', text: 'Wenn du mal einen Tag nicht schaffst, bleibt deine Serie trotzdem.', icon: <Shield size={44} /> }
  }
  const item = itemById(r.id)
  return { title: 'Ein Geschenk!', text: `${item?.label ?? 'Etwas Neues'} für Fenni. Du findest es im Fuchs-Laden.`, icon: <Chest size={44} open /> }
}

/** Die tägliche Truhe: wartet nach dem Tagesziel, wird einmal geöffnet, zeigt danach den Inhalt von heute. */
export function ChestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const outfit = useStore((s) => s.outfit)
  const today = useStore((s) => s.daily?.chest ?? null)
  const [reward, setReward] = useState<ChestReward | null>(null)
  const [fresh, setFresh] = useState(false)
  const shown = reward ?? today

  useEffect(() => {
    if (!open) {
      setReward(null)
      setFresh(false)
    }
  }, [open])

  const openIt = () => {
    const r = useStore.getState().openChest()
    if (!r) return
    setReward(r)
    setFresh(true)
    playDone()
    window.setTimeout(() => mascotBus.emit('cheer'), 250)
  }

  const info = shown ? describe(shown) : null

  return (
    <Sheet open={open} onClose={onClose} title={shown ? 'Deine Truhe von heute' : 'Deine Truhe wartet'}>
      <div className="relative flex flex-col items-center pb-2 text-center">
        {fresh && <Confetti count={shown?.kind === 'coins' && shown.lucky ? 60 : 36} />}
        {!shown ? (
          <>
            <motion.button
              type="button"
              onClick={openIt}
              aria-label="Truhe öffnen"
              className="press my-2 text-brand-dark"
              animate={reduce ? undefined : { rotate: [0, -5, 5, -4, 4, 0], y: [0, -4, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut' }}
            >
              <Chest size={150} />
            </motion.button>
            <p className="max-w-xs text-muted">Du hast dein Tagesziel geschafft. Fenni hat etwas für dich versteckt.</p>
            <button type="button" className="btn btn-primary btn-shine press mt-5 w-full sm:w-64" onClick={openIt} autoFocus>
              Truhe öffnen
            </button>
          </>
        ) : (
          info && (
            <>
              <motion.div initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.bouncy} className="mb-1 mt-9">
                <Mascot mood="cheer" size={120} pose="full" alive listen outfit={outfit} />
              </motion.div>
              <motion.div initial={reduce ? false : { opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...SPRING.bouncy, delay: fresh ? 0.25 : 0 }} className="mt-2 flex flex-col items-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-gold-dark">{info.icon}</span>
                <h3 className="mt-3 text-2xl font-extrabold">{info.title}</h3>
                <p className="mt-1 max-w-xs text-muted">{info.text}</p>
              </motion.div>
              {!fresh && <p className="mt-3 text-sm text-muted">Morgen wartet die nächste, sobald du dein Tagesziel schaffst.</p>}
              <div className="mt-5 flex w-full flex-col gap-2 sm:w-72">
                {shown.kind === 'item' && (
                  <button type="button" className="btn btn-primary press" onClick={() => { onClose(); navigate('/shop') }}>
                    Zum Fuchs-Laden
                  </button>
                )}
                <button type="button" className={`btn ${shown.kind === 'item' ? 'btn-ghost' : 'btn-primary'} press`} onClick={onClose} autoFocus={shown.kind !== 'item'}>
                  Super
                </button>
              </div>
            </>
          )
        )}
      </div>
    </Sheet>
  )
}
