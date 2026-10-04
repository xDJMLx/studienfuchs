import { Fragment, type ReactNode } from 'react'

/**
 * Mathe-Schreibweise für Texte:
 *   $…$      Rechnung oder Term (wird etwas kräftiger gesetzt)
 *   {a|b}    Bruch mit Zähler a und Nenner b (auch verschachtelt mit Hochzahlen)
 *   x^2      Hochzahl (eine Ziffernfolge oder ein Buchstabe nach ^)
 *   \n       Zeilenumbruch
 */

function Sup({ children }: { children: ReactNode }) {
  return <sup className="text-[0.62em] font-extrabold leading-none">{children}</sup>
}

/** Text ohne Brüche: nur Hochzahlen. */
function plain(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\^(-?\d+|[a-z])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${key}t${i}`}>{text.slice(last, m.index)}</Fragment>)
    out.push(<Sup key={`${key}s${i}`}>{m[1].replace('-', '−')}</Sup>)
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) out.push(<Fragment key={`${key}e`}>{text.slice(last)}</Fragment>)
  return out
}

/** Teilt an Brüchen {a|b} (nicht verschachtelt). */
function withFractions(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\{([^{}|]*)\|([^{}|]*)\}/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...plain(text.slice(last, m.index), `${key}p${i}`))
    out.push(
      <span key={`${key}f${i}`} className="math-frac" role="math" aria-label={`${m[1]} durch ${m[2]}`}>
        <span>{plain(m[1], `${key}n${i}`)}</span>
        <span>{plain(m[2], `${key}d${i}`)}</span>
      </span>,
    )
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) out.push(...plain(text.slice(last), `${key}r`))
  return out
}

function line(text: string, key: string): ReactNode[] {
  // $-Bereiche abwechselnd: außen normal, innen Rechnung
  return text.split('$').map((seg, i) =>
    i % 2 === 1 ? (
      <span key={`${key}m${i}`} className="math-expr">
        {withFractions(seg, `${key}m${i}`)}
      </span>
    ) : (
      <Fragment key={`${key}o${i}`}>{withFractions(seg, `${key}o${i}`)}</Fragment>
    ),
  )
}

/** Zahl und Einheit zusammenhalten: kein Zeilenumbruch zwischen "60" und "€". */
const UNIT_GAP = /(\d) (?=€|%|°|km|cm|mm|ml|kg|m²|m³|l(?![a-zäöü])|g(?![a-zäöü])|m(?![a-zäöü]))/g

export function MathText({ children, className }: { children: string; className?: string }) {
  const lines = children.replace(UNIT_GAP, '$1 ').split('\n')
  return (
    <span className={className}>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line(l, `l${i}`)}
        </Fragment>
      ))}
    </span>
  )
}

/** Ohne Formatierung, z. B. für Screenreader oder Zwischenablage: Brüche als a/b. */
export function mathPlain(text: string): string {
  return text.replace(/\$/g, '').replace(/\{([^{}|]*)\|([^{}|]*)\}/g, '$1/$2').replace(/\^(-?\d+|[a-z])/g, '^$1')
}
