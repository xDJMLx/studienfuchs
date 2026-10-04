import { choice, numeric, type Level } from '../core'
import { MINUS, frac, num, opd, round } from '../fmt'
import { defineSkill } from '../registry'

/** Je nach Schwierigkeit einen von drei Werten. */
const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)

const T = (s: string) => `$${s}$`

// ---------- Zahlen vergleichen ----------
defineSkill('rz.vergleichen', 'Zahlen vergleichen und ordnen', 'Welche Zahl ist größer? Negative Zahlen am Zahlenstrahl.', (r, level) => {
  if (r.chance(0.35)) {
    const lim = by(level, 9, 20, 60)
    const set = new Set<number>()
    while (set.size < 4) set.add(r.int(-lim, lim))
    const arr = [...set]
    const smallest = r.chance(0.5)
    const target = smallest ? Math.min(...arr) : Math.max(...arr)
    return choice(
      {
        title: 'Zahlen ordnen',
        prompt: smallest ? 'Welche Zahl ist die kleinste?' : 'Welche Zahl ist die größte?',
        answer: num(target),
        wrong: arr.filter((x) => x !== target).map(num),
        hint: 'Negative Zahlen liegen links von der Null. Je weiter links, desto kleiner.',
        solution: `Auf dem Zahlenstrahl liegt ${num(target)} ${smallest ? 'ganz links' : 'ganz rechts'}.`,
      },
      r,
    )
  }
  let a: number
  let b: number
  let sa: string
  let sb: string
  if (level === 1) {
    a = r.int(-9, 9)
    do b = r.int(-9, 9)
    while (b === a)
    sa = num(a)
    sb = num(b)
  } else if (level === 2) {
    // Dezimalzahlen mit kleinen Unterschieden
    a = r.int(-30, 30) / 10
    b = r.chance(0.4) ? round(a / 10) : round(a + r.pick([-0.5, -0.1, 0.1, 0.5, 1]))
    if (a === b) b = round(b + 0.1)
    sa = num(a)
    sb = num(b)
  } else {
    // Bruch gegen Dezimalzahl, manchmal gleich
    const pairs: [number, number, number][] = [[1, 2, 0.5], [1, 4, 0.25], [3, 4, 0.75], [1, 5, 0.2], [3, 5, 0.6], [2, 5, 0.4]]
    const [n, d, dec] = r.pick(pairs)
    const sgn = r.sign()
    const neg = sgn < 0
    a = sgn * (n / d)
    sa = (neg ? MINUS : '') + frac(n, d)
    const equal = r.chance(0.3)
    const other = equal ? dec : r.pick([dec + 0.05, dec - 0.05, dec + 0.1].filter((x) => x > 0))
    b = sgn * other
    sb = num(b)
    if (equal) b = a
  }
  const ans = a < b ? '<' : a > b ? '>' : '='
  return choice(
    {
      title: 'Zeichen einsetzen',
      prompt: `Welches Zeichen passt? ${T(`${sa} ? ${sb}`)}`,
      answer: ans,
      wrong: ['<', '>', '='],
      hint: 'Von zwei negativen Zahlen ist die mit dem größeren Betrag die kleinere.',
      solution: `${sa} ${ans} ${sb}`,
    },
    r,
  )
}, { blitz: true })

// ---------- Betrag und Gegenzahl ----------
defineSkill('rz.betrag', 'Betrag und Gegenzahl', 'Wie weit ist eine Zahl von der Null entfernt? Was ist ihre Gegenzahl?', (r, level, form) => {
  const lim = by(level, 9, 25, 99)
  // Auf der schwersten Stufe gelegentlich eine Dezimalzahl
  const v = level === 3 && r.chance(0.4) ? round(r.nz(-99, 99) / 10) : r.nz(-lim, lim)
  if (r.chance(0.5)) {
    return numeric(
      {
        title: 'Betrag',
        prompt: `Berechne ${T(`|${num(v)}|`)}`,
        value: Math.abs(v),
        wrong: [-Math.abs(v), v, -v],
        hint: 'Der Betrag ist der Abstand zur Null. Ein Abstand ist nie negativ.',
        solution: `|${num(v)}| = ${num(Math.abs(v))}`,
      },
      r,
      level,
      form,
    )
  }
  return numeric(
    {
      title: 'Gegenzahl',
      prompt: `Wie heißt die Gegenzahl von ${T(num(v))}?`,
      value: -v,
      wrong: [v, Math.abs(v), -Math.abs(v)],
      hint: 'Die Gegenzahl liegt auf der anderen Seite der Null, gleich weit entfernt.',
      solution: `Die Gegenzahl von ${num(v)} ist ${num(-v)}.`,
    },
    r,
    level,
    form,
  )
}, { blitz: true })

// ---------- Addieren ----------
const add = (a: number, b: number) => `${num(a)} + ${opd(b)}`
defineSkill('rz.add', 'Addieren mit negativen Zahlen', 'Zahlen mit verschiedenen Vorzeichen addieren.', (r, level, form) => {
  if (level === 3 && r.chance(0.5)) {
    const a = r.int(-30, 30) / 10
    const b = r.int(-30, 30) / 10
    const v = round(a + b)
    return numeric({ title: 'Berechne', prompt: T(add(a, b)), value: v, wrong: [round(a - b), round(-v), round(Math.abs(a) + Math.abs(b))], hint: 'Verschiedene Vorzeichen: Subtrahiere die Beträge, das Vorzeichen hat die Zahl mit dem größeren Betrag.', solution: `${add(a, b)} = ${num(v)}` }, r, level, form)
  }
  const lim = by(level, 9, 20, 60)
  let a = r.nz(-lim, lim)
  let b = r.nz(-lim, lim)
  // Anfangs mindestens ein negativer Summand, sonst ist es nur Grundschule
  if (a > 0 && b > 0) b = -b
  const v = a + b
  return numeric(
    {
      title: 'Berechne',
      prompt: T(add(a, b)),
      value: v,
      wrong: [Math.abs(a) + Math.abs(b), -v, a - b, Math.abs(Math.abs(a) - Math.abs(b))],
      hint: 'Gleiche Vorzeichen: Beträge addieren. Verschiedene: Beträge subtrahieren, das Vorzeichen der größeren Zahl behalten.',
      solution: `${add(a, b)} = ${num(v)}`,
    },
    r,
    level,
    form,
  )
}, { blitz: true })

// ---------- Subtrahieren ----------
const sub = (a: number, b: number) => `${num(a)} − ${opd(b)}`
defineSkill('rz.sub', 'Subtrahieren mit negativen Zahlen', 'Minus eine negative Zahl ist Plus.', (r, level, form) => {
  const lim = by(level, 9, 20, 60)
  let a = r.int(-lim, lim)
  let b = r.nz(-lim, lim)
  if (level === 1 && b > 0 && a > 0) b = -b
  const v = a - b
  return numeric(
    {
      title: 'Berechne',
      prompt: T(sub(a, b)),
      value: v,
      wrong: [a + b, -v, b - a, -(a + b)],
      hint: 'Subtrahieren heißt: die Gegenzahl addieren. Aus „− (−3)“ wird „+ 3“.',
      solution: `${sub(a, b)} = ${num(a)} + ${opd(-b)} = ${num(v)}`,
    },
    r,
    level,
    form,
  )
}, { blitz: true })

// ---------- Multiplizieren ----------
defineSkill('rz.mul', 'Multiplizieren mit negativen Zahlen', 'Vorzeichenregeln beim Malnehmen.', (r, level, form) => {
  if (level === 3 && r.chance(0.45)) {
    const f = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-4, 4)]
    const v = f[0] * f[1] * f[2]
    return numeric({ title: 'Berechne', prompt: T(f.map((x, i) => (i === 0 ? num(x) : opd(x))).join(' · ')), value: v, wrong: [-v, Math.abs(v), f[0] * f[1] + f[2]], hint: 'Zähle die negativen Faktoren: gerade Anzahl gibt Plus, ungerade Minus.', solution: `Ergebnis: ${num(v)}` }, r, level, form)
  }
  const lim = by(level, 6, 10, 15)
  const a = r.nz(-lim, lim)
  const b = r.nz(-lim, lim)
  const v = a * b
  return numeric(
    {
      title: 'Berechne',
      prompt: T(`${num(a)} · ${opd(b)}`),
      value: v,
      wrong: [-v, a + b, a * Math.abs(b), Math.abs(a) * b],
      hint: 'Gleiche Vorzeichen ergeben Plus, verschiedene Vorzeichen ergeben Minus.',
      solution: `${num(a)} · ${opd(b)} = ${num(v)}`,
    },
    r,
    level,
    form,
  )
}, { blitz: true })

// ---------- Dividieren ----------
defineSkill('rz.div', 'Dividieren mit negativen Zahlen', 'Vorzeichenregeln beim Teilen.', (r, level, form) => {
  const lim = by(level, 6, 10, 15)
  const q = r.nz(-lim, lim)
  const b = r.nz(-by(level, 6, 9, 12), by(level, 6, 9, 12))
  const a = q * b
  return numeric(
    {
      title: 'Berechne',
      prompt: T(`${num(a)} : ${opd(b)}`),
      value: q,
      wrong: [-q, a + b, a * b],
      hint: 'Beim Teilen gelten dieselben Vorzeichenregeln wie beim Malnehmen.',
      solution: `${num(a)} : ${opd(b)} = ${num(q)}, denn ${num(q)} · ${opd(b)} = ${num(a)}.`,
    },
    r,
    level,
    form,
  )
}, { blitz: true })

// ---------- Punkt vor Strich, Klammern ----------
defineSkill('rz.punkt', 'Punkt vor Strich und Klammern', 'In welcher Reihenfolge wird gerechnet?', (r, level, form) => {
  const lim = by(level, 6, 9, 12)
  const a = r.int(-lim, lim)
  const b = r.nz(-lim, lim)
  const c = r.nz(-by(level, 5, 7, 9), by(level, 5, 7, 9))
  const kind = level === 1 ? r.pick([0, 1]) : r.pick([0, 1, 2])
  let expr: string
  let v: number
  let wrongV: number
  let hint: string
  if (kind === 0) {
    expr = `${num(a)} + ${opd(b)} · ${opd(c)}`
    v = a + b * c
    wrongV = (a + b) * c
    hint = 'Punktrechnung kommt vor Strichrechnung: erst das Malnehmen.'
  } else if (kind === 1) {
    expr = `(${num(a)} + ${opd(b)}) · ${opd(c)}`
    v = (a + b) * c
    wrongV = a + b * c
    hint = 'Was in Klammern steht, wird zuerst gerechnet.'
  } else {
    expr = `${num(a)} − ${opd(b)} · ${opd(c)}`
    v = a - b * c
    wrongV = (a - b) * c
    hint = 'Punkt vor Strich: erst Mal, dann Minus.'
  }
  return numeric({ title: 'Berechne', prompt: T(expr), value: v, wrong: [wrongV, -v, a + b + c], hint, solution: `${expr} = ${num(v)}` }, r, level, form)
})

// ---------- Anwendungen ----------
defineSkill('rz.anwenden', 'Negative Zahlen im Alltag', 'Temperaturen, Kontostand und Höhen mit Vorzeichen.', (r, level, form) => {
  const k = r.int(0, 2)
  if (k === 0) {
    const t = r.int(-12, 3)
    const d = r.int(3, level === 1 ? 10 : 18)
    const up = r.chance(0.5)
    const v = up ? t + d : t - d
    return numeric(
      {
        title: 'Temperatur',
        prompt: `Es sind ${num(t)} °C. Die Temperatur ${up ? 'steigt' : 'sinkt'} um ${d} °C. Wie warm ist es dann?`,
        value: v,
        unit: '°C',
        wrong: [up ? t - d : t + d, -v, Math.abs(v)],
        hint: up ? 'Steigen heißt: addieren.' : 'Sinken heißt: subtrahieren, du kommst unter die Null.',
        solution: `${num(t)} ${up ? '+' : '−'} ${d} = ${num(v)}`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 1) {
    const s = r.int(-60, 40)
    const d = r.int(10, level === 1 ? 50 : 90)
    const take = r.chance(0.5)
    const v = take ? s - d : s + d
    return numeric(
      {
        title: 'Kontostand',
        prompt: `Auf dem Konto sind ${num(s)} €. ${take ? `Es werden ${d} € abgebucht` : `Es werden ${d} € eingezahlt`}. Wie hoch ist der Kontostand jetzt?`,
        value: v,
        unit: '€',
        wrong: [take ? s + d : s - d, -v],
        hint: 'Ein negativer Kontostand bedeutet Schulden.',
        solution: `${num(s)} ${take ? '−' : '+'} ${d} = ${num(v)}`,
      },
      r,
      level,
      form,
    )
  }
  const h = r.int(-40, -5)
  const d = r.int(5, 40)
  return numeric(
    {
      title: 'Höhe und Tiefe',
      prompt: `Ein Taucher ist in ${num(h)} m Höhe (unter dem Meeresspiegel). Er steigt ${d} m auf. In welcher Höhe ist er dann?`,
      value: h + d,
      unit: 'm',
      wrong: [h - d, -(h + d), d - h],
      hint: 'Aufsteigen heißt: addieren.',
      solution: `${num(h)} + ${d} = ${num(h + d)}`,
    },
    r,
    level,
    form,
  )
})
