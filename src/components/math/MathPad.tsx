import { useEffect, type ReactNode } from 'react'
import { MathText } from './MathText'

const MINUS = '−'

/** Eingabetext in Mathe-Schreibweise für die Anzeige: "3/4" wird zum stehenden Bruch. */
export function showTyped(v: string): string {
  const m = /^(−?[\d,]*)\/([\d,]*)$/.exec(v)
  if (!m) return v
  return `{${m[1] || '?'}|${m[2] || '?'}}`
}

/**
 * Zahlentastatur für Rechenaufgaben: Ziffern, Komma, Minus, bei Bruch-Aufgaben auch der Bruchstrich.
 * Auf dem Handy ist das verlässlicher als die Bildschirmtastatur (die oft kein Minus hat) und verdeckt nichts.
 * Am Computer gehen die Tasten der Tastatur genauso.
 */
export function MathPad({ value, onChange, locked, frac }: { value: string; onChange: (v: string) => void; locked: boolean; frac: boolean }) {
  const press = (k: string) => {
    if (locked) return
    if (k === 'back') return onChange(value.slice(0, -1))
    if (k === MINUS) {
      // Minus nur am Anfang des Zählers/der Zahl; ein zweites Mal nimmt es wieder weg
      if (value.startsWith(MINUS)) return onChange(value.slice(1))
      return onChange(MINUS + value)
    }
    if (k === ',') {
      // pro Zahl nur ein Komma
      const part = value.split('/').pop() ?? ''
      if (part.includes(',')) return
      return onChange(value + (part === '' || part === MINUS ? '0,' : ','))
    }
    if (k === '/') {
      if (!frac || value.includes('/') || value === '' || value === MINUS) return
      return onChange(value + '/')
    }
    if (value.length >= 14) return
    onChange(value + k)
  }

  // Tastatur
  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === ',' || e.key === '.') press(',')
      else if (e.key === '-' || e.key === MINUS) press(MINUS)
      else if (e.key === '/' || e.key === ':') press('/')
      else if (e.key === 'Backspace') press('back')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // press liest value; bei jeder Änderung neu binden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, value, frac])

  const key = (k: string, label: string, children: ReactNode, className = '') => (
    <PadKey key={k} k={k} label={label} className={className} locked={locked} onPress={press}>
      {children}
    </PadKey>
  )

  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Zahlentastatur">
      {['7', '8', '9'].map((d) => key(d, d, d))}
      {key('back', 'Löschen', '⌫', 'math-key-util')}
      {['4', '5', '6'].map((d) => key(d, d, d))}
      {key(MINUS, 'Minus', MINUS, 'math-key-util')}
      {['1', '2', '3'].map((d) => key(d, d, d))}
      {key(',', 'Komma', ',', 'math-key-util')}
      {key('0', '0', '0', 'col-span-3')}
      {frac ? key('/', 'Bruchstrich', <MathText>{'{a|b}'}</MathText>, 'math-key-util') : <span aria-hidden />}
    </div>
  )
}

function PadKey({ k, children, label, className = '', locked, onPress }: { k: string; children: ReactNode; label: string; className?: string; locked: boolean; onPress: (k: string) => void }) {
  return (
    <button type="button" disabled={locked} onClick={() => onPress(k)} aria-label={label} className={`math-key ${className}`}>
      {children}
    </button>
  )
}
