import { numeric, type Level } from '../core'
import { frac, fracMarkup, gcd, num, reduced, round } from '../fmt'
import { defineSkill } from '../registry'

const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)
const list = (xs: number[]) => xs.map(num).join(', ')

/** Liste mit ganzzahligem Mittelwert m aus n Werten (Abweichungen gleichen sich aus). */
function dataWithMean(r: { int(a: number, b: number): number; shuffle<T>(l: readonly T[]): T[] }, n: number, m: number, spread: number): number[] {
  for (let tries = 0; tries < 200; tries++) {
    const dev: number[] = []
    for (let i = 0; i < n - 1; i++) dev.push(r.int(-spread, spread))
    const last = -dev.reduce((a, b) => a + b, 0)
    if (Math.abs(last) > spread + 2) continue
    dev.push(last)
    const xs = dev.map((d) => m + d)
    if (xs.every((x) => x > 0)) return r.shuffle(xs)
  }
  return Array.from({ length: n }, () => m)
}

// ---------- Mittelwert ----------
defineSkill('da.mittel', 'Mittelwert', 'Alle Werte addieren und durch die Anzahl teilen.', (r, level, form) => {
  const n = by(level, 4, 5, 6)
  const m = r.int(8, 40)
  if (level === 3 && r.chance(0.4)) {
    const xs = dataWithMean(r, n, m, 6)
    const missing = xs[xs.length - 1]
    const rest = xs.slice(0, -1)
    return numeric(
      {
        title: 'Fehlenden Wert finden',
        prompt: `Der Mittelwert von ${n} Zahlen ist ${m}. ${n - 1} davon sind ${list(rest)}. Wie lautet die letzte Zahl?`,
        value: missing,
        wrong: [m, rest.reduce((a, b) => a + b, 0) - m * (n - 1), m * n],
        hint: `Alle ${n} Werte zusammen ergeben ${n} · ${m} = ${n * m}. Ziehe die bekannten Werte davon ab.`,
        solution: `Summe: ${n} · ${m} = ${n * m}. Bekannt: ${rest.reduce((a, b) => a + b, 0)}. Fehlend: ${n * m - rest.reduce((a, b) => a + b, 0)}.`,
      },
      r,
      level,
      form,
    )
  }
  const xs = dataWithMean(r, n, m, by(level, 4, 6, 8))
  const sum = xs.reduce((a, b) => a + b, 0)
  return numeric(
    {
      title: 'Mittelwert',
      prompt: `Berechne den Mittelwert: ${list(xs)}`,
      value: m,
      wrong: [sum, m + 1, m - 1, Math.round(sum / (n + 1))],
      hint: 'Mittelwert = Summe aller Werte : Anzahl der Werte.',
      solution: `Summe ${sum}, Anzahl ${n}: ${sum} : ${n} = ${m}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Median ----------
defineSkill('da.median', 'Median', 'Der mittlere Wert, wenn man die Werte der Größe nach ordnet.', (r, level, form) => {
  const odd = level === 1 || r.chance(0.5)
  const n = odd ? by(level, 5, 5, 7) : by(level, 4, 4, 6)
  const set = new Set<number>()
  while (set.size < n) set.add(r.int(2, 40))
  const xs = r.shuffle([...set])
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = n / 2
  const med = odd ? sorted[Math.floor(n / 2)] : (sorted[mid - 1] + sorted[mid]) / 2
  return numeric(
    {
      title: 'Median',
      prompt: `Bestimme den Median: ${list(xs)}`,
      value: med,
      wrong: [xs[Math.floor(n / 2)], round(sorted.reduce((a, b) => a + b, 0) / n, 2), odd ? sorted[Math.floor(n / 2) + 1] : sorted[mid]],
      hint: 'Ordne die Werte zuerst der Größe nach. Bei gerader Anzahl ist der Median der Mittelwert der beiden mittleren Zahlen.',
      solution: `Geordnet: ${list(sorted)}. ${odd ? `Mitte: ${num(med)}` : `Mitte: ${num(sorted[mid - 1])} und ${num(sorted[mid])}, ihr Mittelwert ist ${num(med)}`}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Spannweite ----------
defineSkill('da.spann', 'Spannweite', 'Unterschied zwischen größtem und kleinstem Wert.', (r, level, form) => {
  const n = by(level, 5, 6, 8)
  const set = new Set<number>()
  while (set.size < n) set.add(r.int(1, by(level, 30, 60, 99)))
  const xs = r.shuffle([...set])
  const mx = Math.max(...xs)
  const mn = Math.min(...xs)
  return numeric(
    {
      title: 'Spannweite',
      prompt: `Bestimme die Spannweite: ${list(xs)}`,
      value: mx - mn,
      wrong: [mx, mx + mn, Math.round((mx + mn) / 2)],
      hint: 'Spannweite = größter Wert − kleinster Wert.',
      solution: `${mx} − ${mn} = ${mx - mn}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Relative Häufigkeit ----------
defineSkill('da.haeufig', 'Relative Häufigkeit', 'Wie oft kam ein Ergebnis im Verhältnis zu allen Versuchen vor?', (r, level, form) => {
  const n = r.pick(by(level, [20, 50, 100], [20, 25, 50, 100, 200], [40, 25, 50, 80, 200]))
  const step = n === 20 ? 1 : n === 25 ? 1 : n === 40 ? 2 : n === 80 ? 4 : n === 50 ? 1 : n === 200 ? 2 : 1
  const k = step * r.int(1, Math.floor(n / step) - 1)
  const p = round((k / n) * 100, 6)
  const asPercent = level === 1 || r.chance(0.5)
  const what = r.pick(['Zahl', 'Kopf', 'eine 6', 'rot'])
  const ctx =
    what === 'Zahl' || what === 'Kopf'
      ? `Eine Münze wird ${n}-mal geworfen. ${k}-mal fällt ${what}.`
      : what === 'eine 6'
        ? `Ein Würfel wird ${n}-mal geworfen. ${k}-mal fällt eine 6.`
        : `Aus einem Beutel wird ${n}-mal eine Kugel gezogen (mit Zurücklegen). ${k}-mal ist sie rot.`
  if (asPercent) {
    return numeric(
      {
        title: 'Relative Häufigkeit',
        prompt: `${ctx} Wie groß ist die relative Häufigkeit in Prozent?`,
        value: p,
        unit: '%',
        wrong: [round(k / n, 4), round((n / k) * 100, 1), 100 - p],
        hint: 'Relative Häufigkeit = Anzahl der Treffer : Anzahl aller Versuche. Mal 100 gibt Prozent.',
        solution: `${k} : ${n} = ${num(round(k / n, 4))} = ${num(p)} %`,
      },
      r,
      level,
      form,
    )
  }
  return numeric(
    {
      title: 'Relative Häufigkeit',
      prompt: `${ctx} Wie groß ist die relative Häufigkeit als Dezimalzahl?`,
      value: round(k / n, 6),
      wrong: [round(p, 2), round(n / k, 2), round(1 - k / n, 4)],
      hint: 'Relative Häufigkeit = Anzahl der Treffer : Anzahl aller Versuche.',
      solution: `${k} : ${n} = ${num(round(k / n, 6))}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Wahrscheinlichkeit ----------
defineSkill('da.laplace', 'Wahrscheinlichkeit', 'Günstige Fälle geteilt durch alle möglichen Fälle.', (r, level, form) => {
  if (r.chance(0.5)) {
    const events = [
      { text: 'eine gerade Zahl', good: [2, 4, 6] },
      { text: 'eine Zahl größer als 4', good: [5, 6] },
      { text: 'eine Primzahl (2, 3, 5)', good: [2, 3, 5] },
      { text: 'eine 6', good: [6] },
      { text: 'eine Zahl kleiner als 3', good: [1, 2] },
      { text: 'ein Teiler von 6 (1, 2, 3, 6)', good: [1, 2, 3, 6] },
    ]
    const e = r.pick(by(level, events.slice(0, 4), events, events))
    const g = e.good.length
    return numeric(
      {
        title: 'Würfel',
        prompt: `Ein Würfel wird einmal geworfen. Wie groß ist die Wahrscheinlichkeit für ${e.text}?`,
        value: g / 6,
        display: fracMarkup(g, 6),
        frac: true,
        reduce: reduced(g, 6).d !== 1,
        wrongText: [frac(g, 6), frac(6 - g, 6), frac(g, 5), frac(1, g)].filter((t) => t !== fracMarkup(g, 6)),
        hint: 'Wahrscheinlichkeit = günstige Ergebnisse : alle Ergebnisse. Ein Würfel hat 6 Seiten. Kürze den Bruch.',
        solution: `${g} günstige von 6 möglichen: ${frac(g, 6)}${reduced(g, 6).d !== 6 ? ` = ${fracMarkup(g, 6)}` : ''}`,
      },
      r,
      level,
      form,
    )
  }
  const red = r.int(1, 6)
  const blue = r.int(1, 7)
  const green = level === 1 ? 0 : r.int(0, 4)
  const total = red + blue + green
  const g = gcd(red, total)
  const bag = `${red} rote, ${blue} blaue${green ? ` und ${green} grüne` : ''} Kugeln`
  return numeric(
    {
      title: 'Urne',
      prompt: `In einem Beutel sind ${bag}. Du ziehst blind eine Kugel. Wie groß ist die Wahrscheinlichkeit für eine rote Kugel?`,
      value: red / total,
      display: fracMarkup(red, total),
      frac: true,
      reduce: g !== 1 && red / total !== 1,
      wrongText: [frac(red, total), frac(red, blue), frac(1, total), frac(total - red, total)].filter((t) => t !== fracMarkup(red, total)),
      hint: 'Wahrscheinlichkeit = rote Kugeln : alle Kugeln. Zähle alle Kugeln zusammen und kürze.',
      solution: `${red} rote von ${total} Kugeln: ${frac(red, total)}${g !== 1 ? ` = ${fracMarkup(red, total)}` : ''}`,
    },
    r,
    level,
    form,
  )
})
