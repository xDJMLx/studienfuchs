import { choice, numeric, type Level } from '../core'
import { frac, fracMarkup, gcd, num, reduced, round } from '../fmt'
import { defineSkill } from '../registry'

const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)
const T = (s: string) => `$${s}$`
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b

/** Ein gekürztes Paar p/q mit p < q, q höchstens maxQ. */
function properPair(r: { int(a: number, b: number): number }, maxQ: number): [number, number] {
  for (let i = 0; i < 100; i++) {
    const q = r.int(2, maxQ)
    const p = r.int(1, q - 1)
    if (gcd(p, q) === 1) return [p, q]
  }
  return [1, 2]
}

// ---------- Erweitern ----------
defineSkill('br.erweitern', 'Brüche erweitern', 'Zähler und Nenner mit derselben Zahl malnehmen.', (r, level, form) => {
  const [a, b] = properPair(r, by(level, 5, 8, 12))
  const k = r.int(2, by(level, 4, 9, 12))
  const askDen = level >= 2 && r.chance(0.35)
  if (askDen) {
    return numeric(
      {
        title: 'Erweitern',
        prompt: `Ergänze den Nenner: ${T(`${frac(a, b)} = {${a * k}|?}`)}`,
        value: b * k,
        wrong: [b + k, a * k, b * (k + 1), b * (k - 1)],
        hint: 'Mit welcher Zahl wurde der Zähler malgenommen? Genauso wird der Nenner erweitert.',
        solution: `${a} · ${k} = ${a * k}, also auch ${b} · ${k} = ${b * k}.`,
      },
      r,
      level,
      form,
    )
  }
  return numeric(
    {
      title: 'Erweitern',
      prompt: `Ergänze den Zähler: ${T(`${frac(a, b)} = {?|${b * k}}`)}`,
      value: a * k,
      wrong: [a + k, b * k, a * (k + 1), a * (k - 1)],
      hint: `Mit welcher Zahl wurde der Nenner ${b} malgenommen? Genauso wird der Zähler erweitert.`,
      solution: `${b} · ${k} = ${b * k}, also auch ${a} · ${k} = ${a * k}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Kürzen ----------
defineSkill('br.kuerzen', 'Brüche kürzen', 'Zähler und Nenner durch denselben Teiler teilen, so weit es geht.', (r, level, form) => {
  const [p, q] = properPair(r, by(level, 6, 9, 12))
  const g = r.int(2, by(level, 5, 9, 12))
  const n = p * g
  const d = q * g
  // Typische Fehler: nur halb gekürzt, Zähler und Nenner vertauscht
  const partial: string[] = []
  for (let f = 2; f < g; f++) if (g % f === 0) partial.push(frac(p * f, q * f))
  return numeric(
    {
      title: 'Kürzen',
      prompt: `Kürze so weit wie möglich: ${T(frac(n, d))}`,
      value: p / q,
      display: fracMarkup(p, q),
      frac: true,
      reduce: true,
      wrongText: [...partial, frac(q, p), frac(p + 1, q), frac(p, q + 1)],
      hint: 'Teile Zähler und Nenner durch denselben Teiler. Der größte gemeinsame Teiler kürzt in einem Schritt ganz.',
      solution: `Teiler ${g}: ${n} : ${g} = ${p} und ${d} : ${g} = ${q}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Vergleichen ----------
defineSkill('br.vergleichen', 'Brüche vergleichen', 'Welcher Bruch ist größer?', (r, level) => {
  let a: number
  let b: number
  let c: number
  let d: number
  if (level === 1) {
    b = d = r.int(3, 10)
    a = r.int(1, b - 1)
    do c = r.int(1, b - 1)
    while (c === a)
  } else if (level === 2) {
    b = r.int(2, 6)
    d = b * r.int(2, 3)
    a = r.int(1, b - 1)
    c = r.int(1, d - 1)
  } else {
    if (r.chance(0.2)) {
      // gleich große Brüche in verschiedener Schreibweise
      const [p, q] = properPair(r, 6)
      const i = r.int(1, Math.floor(12 / q))
      let j = r.int(1, Math.floor(12 / q))
      if (j === i) j = i === 1 ? 2 : 1
      if (q * j > 12) j = i
      a = p * i
      b = q * i
      c = p * j
      d = q * j
    } else {
      do {
        b = r.int(2, 12)
        d = r.int(2, 12)
      } while (b === d)
      a = r.int(1, b - 1)
      c = r.int(1, d - 1)
    }
  }
  const left = a * d
  const right = c * b
  const ans = left < right ? '<' : left > right ? '>' : '='
  return choice(
    {
      title: 'Brüche vergleichen',
      prompt: `Welches Zeichen passt? ${T(`${frac(a, b)} ? ${frac(c, d)}`)}`,
      answer: ans,
      wrong: ['<', '>', '='],
      hint: 'Multipliziere über Kreuz: Zähler des ersten mal Nenner des zweiten, und umgekehrt. Die größere Zahl zeigt den größeren Bruch.',
      solution: `${a} · ${d} = ${left} und ${c} · ${b} = ${right}, also ${frac(a, b)} ${ans} ${frac(c, d)}.`,
    },
    r,
  )
})

// ---------- Addieren und Subtrahieren ----------
defineSkill('br.add', 'Brüche addieren und subtrahieren', 'Gleichnamig machen, dann Zähler rechnen.', (r, level, form) => {
  let a = 1
  let b = 2
  let c = 1
  let d = 2
  let plus = true
  let n1 = 0
  let n2 = 0
  let L = 2
  for (let tries = 0; tries < 200; tries++) {
    if (level === 1) b = d = r.int(3, 10)
    else if (level === 2) {
      b = r.pick([2, 3, 4, 5, 6])
      d = b * r.int(2, 4)
    } else {
      do {
        b = r.int(2, 9)
        d = r.int(2, 9)
      } while (b === d || gcd(b, d) === b || gcd(b, d) === d)
    }
    L = lcm(b, d)
    a = r.int(1, b - 1)
    c = r.int(1, d - 1)
    plus = r.chance(0.6)
    n1 = a * (L / b)
    n2 = c * (L / d)
    if (plus && level < 3 && n1 + n2 >= L) plus = false
    if (!plus && n1 < n2) {
      ;[a, c, b, d] = [c, a, d, b]
      ;[n1, n2] = [n2, n1]
    }
    if (plus || n1 > n2) break
  }
  const n = plus ? n1 + n2 : n1 - n2
  const op = plus ? '+' : '−'
  const rd = reduced(n, L)
  const wrongText = [frac(plus ? a + c : Math.abs(a - c) || 1, b + d)]
  if (rd.d !== L) wrongText.push(frac(n, L))
  if (b !== d) wrongText.push(frac(plus ? a + c : Math.abs(a - c) || 1, Math.max(b, d)))
  const result = fracMarkup(n, L)
  return numeric(
    {
      title: 'Berechne und kürze',
      prompt: T(`${frac(a, b)} ${op} ${frac(c, d)}`),
      value: n / L,
      display: result,
      frac: true,
      reduce: rd.d !== 1,
      wrongText,
      hint: b === d ? 'Gleiche Nenner: nur die Zähler rechnen, der Nenner bleibt.' : 'Erst auf einen gemeinsamen Nenner erweitern, dann die Zähler rechnen. Zum Schluss kürzen.',
      solution:
        b === d
          ? `${a} ${op} ${c} = ${n}, also ${frac(n, L)}${rd.d !== L ? ` = ${result}` : ''}.`
          : `Hauptnenner ${L}: ${frac(a * (L / b), L)} ${op} ${frac(c * (L / d), L)} = ${frac(n, L)}${rd.d !== L ? ` = ${result}` : ''}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Multiplizieren ----------
defineSkill('br.mul', 'Brüche multiplizieren', 'Zähler mal Zähler, Nenner mal Nenner.', (r, level, form) => {
  let a: number
  let b: number
  let c: number
  let d: number
  let whole = false
  if (level === 1) {
    ;[a, b] = properPair(r, 6)
    c = r.int(2, 6)
    d = 1
    whole = true
  } else {
    ;[a, b] = properPair(r, by(level, 6, 10, 10))
    ;[c, d] = properPair(r, by(level, 6, 10, 10))
  }
  const n = a * c
  const m = b * d
  const rd = reduced(n, m)
  const expr = whole ? `${frac(a, b)} · ${c}` : `${frac(a, b)} · ${frac(c, d)}`
  return numeric(
    {
      title: 'Berechne und kürze',
      prompt: T(expr),
      value: n / m,
      display: fracMarkup(n, m),
      frac: true,
      reduce: rd.d !== 1,
      wrongText: [frac(n, m), frac(a * c, b * c), frac(a + c, b + d)].filter((t) => t !== fracMarkup(n, m)),
      hint: 'Multipliziere Zähler mit Zähler und Nenner mit Nenner. Kürze am besten schon vorher.',
      solution: `Zähler: ${a} · ${c} = ${n}, Nenner: ${b} · ${d} = ${m}. Das ist ${frac(n, m)}${rd.d !== m || rd.n !== n ? ` = ${fracMarkup(n, m)}` : ''}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Dividieren ----------
defineSkill('br.div', 'Brüche dividieren', 'Durch einen Bruch teilen heißt mit seinem Kehrwert malnehmen.', (r, level, form) => {
  let a: number
  let b: number
  let c: number
  let d: number
  let whole = false
  if (level === 1) {
    ;[a, b] = properPair(r, 6)
    c = r.int(2, 5)
    d = 1
    whole = true
  } else {
    ;[a, b] = properPair(r, by(level, 6, 9, 9))
    ;[c, d] = properPair(r, by(level, 6, 9, 9))
  }
  const n = a * d
  const m = b * c
  const rd = reduced(n, m)
  const expr = whole ? `${frac(a, b)} : ${c}` : `${frac(a, b)} : ${frac(c, d)}`
  return numeric(
    {
      title: 'Berechne und kürze',
      prompt: T(expr),
      value: n / m,
      display: fracMarkup(n, m),
      frac: true,
      reduce: rd.d !== 1,
      wrongText: [frac(a * c, b * d), frac(b * c, a * d), frac(n, m)].filter((t) => t !== fracMarkup(n, m)),
      hint: 'Teilen durch einen Bruch: Mit dem Kehrwert malnehmen. Der Kehrwert von ' + (whole ? `${c} ist ${frac(1, c)}` : `${frac(c, d)} ist ${frac(d, c)}`) + '.',
      solution: `${whole ? `${frac(a, b)} · ${frac(1, c)}` : `${frac(a, b)} · ${frac(d, c)}`} = ${frac(n, m)}${rd.d !== m || rd.n !== n ? ` = ${fracMarkup(n, m)}` : ''}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Dezimalzahlen rechnen ----------
defineSkill('dez.rechnen', 'Mit Dezimalzahlen rechnen', 'Addieren, Subtrahieren, Multiplizieren und Dividieren mit Komma.', (r, level, form) => {
  const k = r.int(0, level === 1 ? 1 : 3)
  if (k === 0 || (level === 1 && k === 1)) {
    // Addieren / Subtrahieren
    const dec = level === 1 ? 10 : 100
    const x = r.int(dec / 10, dec * 20) / dec
    const y = r.int(dec / 10, dec * 12) / dec
    const plus = r.chance(0.55) || x < y
    const v = round(plus ? x + y : x - y)
    return numeric(
      {
        title: 'Berechne',
        prompt: T(`${num(x)} ${plus ? '+' : '−'} ${num(y)}`),
        value: v,
        wrong: [round(v * 10), round(v / 10), round(plus ? x - y : x + y)],
        hint: 'Schreibe die Zahlen so untereinander, dass Komma unter Komma steht.',
        solution: `${num(x)} ${plus ? '+' : '−'} ${num(y)} = ${num(v)}`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 1 || (k === 2 && level === 2)) {
    // Dezimalzahl mal ganze Zahl
    const x = r.int(11, 99) / 10
    const m = r.int(2, 9)
    const v = round(x * m)
    return numeric(
      {
        title: 'Berechne',
        prompt: T(`${num(x)} · ${m}`),
        value: v,
        wrong: [round(v * 10), round(v / 10), round(x + m)],
        hint: 'Rechne ohne Komma und setze es am Ende wieder so, dass gleich viele Nachkommastellen bleiben.',
        solution: `${Math.round(x * 10)} · ${m} = ${Math.round(x * 10) * m}, mit einer Nachkommastelle: ${num(v)}.`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 2) {
    // Dezimalzahl mal Dezimalzahl
    const x = r.int(2, 15) / 10
    const y = r.int(2, 9) / 10
    const v = round(x * y)
    return numeric(
      {
        title: 'Berechne',
        prompt: T(`${num(x)} · ${num(y)}`),
        value: v,
        wrong: [round(v * 10), round(v / 10), round(x + y)],
        hint: 'Multipliziere ohne Komma. Das Ergebnis hat so viele Nachkommastellen wie beide Faktoren zusammen.',
        solution: `${Math.round(x * 10)} · ${Math.round(y * 10)} = ${Math.round(x * 10) * Math.round(y * 10)}, zwei Nachkommastellen: ${num(v)}.`,
      },
      r,
      level,
      form,
    )
  }
  // Dividieren, immer ohne Rest
  const q = r.int(2, 12)
  const div = r.pick([0.2, 0.4, 0.5, 0.6, 0.3, 0.8])
  const x = round(q * div)
  return numeric(
    {
      title: 'Berechne',
      prompt: T(`${num(x)} : ${num(div)}`),
      value: q,
      wrong: [round(q / 10), q * 10, round(x * div)],
      hint: 'Verschiebe bei beiden Zahlen das Komma gleich weit nach rechts, bis der Teiler eine ganze Zahl ist.',
      solution: `${Math.round(x * 10)} : ${Math.round(div * 10)} = ${q}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Bruch und Dezimalzahl ----------
defineSkill('dez.bruch', 'Bruch und Dezimalzahl', 'Brüche in Dezimalzahlen verwandeln und zurück.', (r, level, form) => {
  const dens = by(level, [2, 4, 5, 10], [4, 5, 8, 10, 20, 25], [8, 16, 20, 25, 40, 50])
  const q = r.pick(dens)
  let p = r.int(1, q - 1)
  while (gcd(p, q) !== 1 && q > 2) p = r.int(1, q - 1)
  const dec = round(p / q, 6)
  if (r.chance(0.5)) {
    return numeric(
      {
        title: 'Bruch → Dezimalzahl',
        prompt: `Schreibe als Dezimalzahl: ${T(frac(p, q))}`,
        value: dec,
        wrong: [round(p / (q * 10), 6), round(q / p, 6), round(p / 10, 6)],
        hint: 'Ein Bruch ist eine Aufgabe: Zähler geteilt durch Nenner. Oder erweitere auf Nenner 10, 100 oder 1000.',
        solution: `${p} : ${q} = ${num(dec)}`,
      },
      r,
      level,
      form,
    )
  }
  return numeric(
    {
      title: 'Dezimalzahl → Bruch',
      prompt: `Schreibe als gekürzten Bruch: ${T(num(dec))}`,
      value: p / q,
      display: fracMarkup(p, q),
      frac: true,
      reduce: true,
      wrongText: [frac(Math.round(dec * 10 ** String(dec).split('.')[1].length), 10 ** String(dec).split('.')[1].length), frac(q, p), frac(p, q + 1)].filter((t) => t !== fracMarkup(p, q)),
      hint: 'Lies die Dezimalzahl als Bruch mit Nenner 10, 100 oder 1000 und kürze.',
      solution: `${num(dec)} = ${frac(Math.round(dec * 10 ** String(dec).split('.')[1].length), 10 ** String(dec).split('.')[1].length)} = ${fracMarkup(p, q)}`,
    },
    r,
    level,
    form,
  )
})
