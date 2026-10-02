import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Mascot } from '../../components/mascot/Mascot'
import { Link } from 'react-router-dom'
import { Back, Check, Coin } from '../../components/ui/Icons'
import { SPRING } from '../../components/ui/motion'
import { ITEMS, SLOTS, type Slot } from '../../lib/shop'
import { useStore } from '../../store/useStore'

/** Fuchs-Laden: Münzen gibt es nur fürs Lernen, hier werden sie gegen Zubehör für den Fuchs getauscht. */
export function ShopPage() {
  const reduce = useReducedMotion()
  const { coins, owned, outfit, buyItem, equipItem } = useStore()
  const [slot, setSlot] = useState<Slot>('kopf')
  // Zweiter Tipp bestätigt den Kauf (Münzen gibt es nicht zurück)
  const [pending, setPending] = useState<string | null>(null)
  const items = ITEMS.filter((i) => i.slot === slot)
  const worn = Object.keys(outfit).length

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-3">
      <Link to="/profile" className="press -ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold text-muted transition-colors hover:text-ink">
        <Back size={20} /> Profil
      </Link>
      <h1 className="mb-3 text-2xl font-bold">Fuchs &amp; Shop</h1>
      <section className="card flex flex-col items-center px-5 pb-5 pt-6 text-center">
        <motion.div key={JSON.stringify(outfit)} initial={reduce ? false : { scale: 0.9 }} animate={{ scale: 1 }} transition={SPRING.bouncy}>
          <Mascot size={156} mood="cheer" blink outfit={outfit} label="Dein Fuchs" />
        </motion.div>
        <p className="mt-3 flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 text-lg font-bold text-gold-dark" aria-label={`${coins} Münzen`}>
          <Coin size={22} />
          <span className="tabular-nums">{coins}</span>
        </p>
        <p className="mt-3 max-w-xs text-sm text-muted">Münzen verdienst du nur beim Lernen. Je 2 XP gibt es eine Münze, dazu 10 fürs Tagesziel, 5 je Bonusziel und 25 alle 7 Tage Serie.</p>
        {worn > 0 && (
          <button type="button" className="press mt-3 text-sm font-semibold text-brand-dark" onClick={() => Object.values(outfit).forEach((id) => id && equipItem(id))}>
            Alles abnehmen
          </button>
        )}
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Zubehör nach Platz">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={slot === s.id}
            onClick={() => {
              setSlot(s.id)
              setPending(null)
            }}
            className={`press shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${slot === s.id ? 'bg-brand-strong text-on-brand' : 'bg-snow text-muted'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => {
          const has = owned.includes(it.id)
          const on = outfit[it.slot] === it.id
          const missing = it.price - coins
          const confirm = pending === it.id
          return (
            <li key={it.id} className={`card flex flex-col items-center p-3 text-center ${on ? 'ring-2 ring-brand' : ''}`}>
              <Mascot size={84} outfit={{ [it.slot]: it.id }} />
              <p className="mt-1 text-sm font-semibold leading-tight">{it.label}</p>
              {has ? (
                <button type="button" onClick={() => equipItem(it.id)} className={`press mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold ${on ? 'bg-brand-soft text-brand-dark' : 'bg-brand-strong text-on-brand'}`}>
                  {on ? (
                    <>
                      <Check size={16} /> Angelegt
                    </>
                  ) : (
                    'Anlegen'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={missing > 0}
                  onClick={() => {
                    if (confirm) {
                      buyItem(it.id)
                      setPending(null)
                    } else setPending(it.id)
                  }}
                  onBlur={() => setPending((p) => (p === it.id ? null : p))}
                  className={`press mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold disabled:opacity-60 ${confirm ? 'bg-good text-white' : 'bg-gold/20 text-gold-dark'}`}
                >
                  {confirm ? (
                    'Jetzt kaufen'
                  ) : missing > 0 ? (
                    <>
                      <Coin size={16} /> noch {missing}
                    </>
                  ) : (
                    <>
                      <Coin size={16} /> {it.price}
                    </>
                  )}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
