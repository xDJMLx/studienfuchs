import { choice, numeric, type Level } from '../core'
import { fixed, num, round } from '../fmt'
import { defineSkill } from '../registry'

const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)
const T = (s: string) => `$${s}$`
const list = (xs: number[]) => xs.map(num).join(', ')

// ---------- Zuordnung erkennen ----------
defineSkill('zu.erkennen', 'Zuordnungen erkennen', 'Proportional, antiproportional oder keins von beiden?', (r, level) => {
  const kind = r.pick(['prop', 'anti', 'none'] as const)
  let xs: number[]
  let ys: number[]
  let solution = ''
  if (kind === 'prop') {
    const k = r.int(2, by(level, 5, 9, 12))
    xs = [1, 2, 3, 4].map((x) => x * r.pick([1, 1, 2]))
    xs = [...new Set(xs)].sort((a, b) => a - b)
    while (xs.length < 4) xs.push(xs[xs.length - 1] + r.int(1, 3))
    ys = xs.map((x) => x * k)
    solution = `y : x ist immer ${k}. Das ist proportional.`
  } else if (kind === 'anti') {
    const c = r.pick([12, 24, 36, 48, 60])
    const divs = [1, 2, 3, 4, 6, 8, 9, 12].filter((d) => c % d === 0)
    xs = r.shuffle(divs).slice(0, 4).sort((a, b) => a - b)
    ys = xs.map((x) => c / x)
    solution = `x · y ist immer ${c}. Das ist antiproportional.`
  } else {
    const add = r.int(1, 8)
    xs = [1, 2, 3, 4].map((x) => x * r.pick([1, 2]))
    xs = [...new Set(xs)].sort((a, b) => a - b)
    while (xs.length < 4) xs.push(xs[xs.length - 1] + r.int(1, 3))
    ys = xs.map((x) => x + add)
    solution = `y : x ändert sich (${num(ys[0] / xs[0])}; ${num(round(ys[1] / xs[1], 2))} …) und x · y auch. Weder proportional noch antiproportional.`
  }
  const answer = kind === 'prop' ? 'proportional' : kind === 'anti' ? 'antiproportional' : 'weder noch'
  return choice(
    {
      title: 'Zuordnung erkennen',
      prompt: `Welche Zuordnung zeigt die Tabelle?\n${T(`x: ${list(xs)}`)}\n${T(`y: ${list(ys)}`)}`,
      answer,
      wrong: ['proportional', 'antiproportional', 'weder noch'],
      hint: 'Proportional: Verdoppelst du x, verdoppelt sich y (y : x bleibt gleich). Antiproportional: Verdoppelst du x, halbiert sich y (x · y bleibt gleich).',
      solution,
    },
    r,
  )
})

// ---------- Dreisatz (proportional) ----------
defineSkill('zu.dreisatz', 'Dreisatz: proportional', 'Je mehr, desto mehr: erst auf 1 zurückrechnen.', (r, level, form) => {
  const ctx = r.int(0, 2)
  if (ctx === 0) {
    const u = r.pick([0.4, 0.5, 0.6, 0.75, 1.2, 1.5, 2.5, 0.8])
    const n1 = r.int(2, 9)
    let n2 = r.int(2, by(level, 12, 15, 20))
    if (n2 === n1) n2 += 1
    const p1 = round(u * n1)
    const v = round(u * n2)
    const reverse = level === 3 && r.chance(0.5)
    if (reverse) {
      return numeric(
        {
          title: 'Dreisatz',
          prompt: `${n1} Brötchen kosten ${fixed(p1, 2)} €. Wie viele Brötchen bekommt man für ${fixed(v, 2)} €?`,
          value: n2,
          wrong: [n1 + 1, round(v / p1), n2 + 1, n2 - 1],
          hint: 'Erst den Preis für 1 Brötchen ausrechnen (Preis : Anzahl). Dann sehen, wie oft er in den neuen Betrag passt.',
          solution: `1 Brötchen: ${fixed(p1, 2)} : ${n1} = ${fixed(u, 2)} €. ${fixed(v, 2)} : ${fixed(u, 2)} = ${n2}.`,
        },
        r,
        level,
        form,
      )
    }
    return numeric(
      {
        title: 'Dreisatz',
        prompt: `${n1} Brötchen kosten ${fixed(p1, 2)} €. Wie viel kosten ${n2} Brötchen?`,
        value: v,
        display: fixed(v, 2),
        fmt: (x) => fixed(x, 2),
        unit: '€',
        wrong: [u, round(p1 + n2 - n1), round(p1 * n2), round((p1 / n2) * n1)],
        hint: 'Erst den Preis für 1 Stück ausrechnen (Preis : Anzahl), dann mal die neue Anzahl.',
        solution: `1 Stück: ${fixed(p1, 2)} : ${n1} = ${fixed(u, 2)} €. ${n2} Stück: ${fixed(u, 2)} · ${n2} = ${fixed(v, 2)} €.`,
      },
      r,
      level,
      form,
    )
  }
  if (ctx === 1) {
    const v = r.pick([60, 80, 90, 100, 120])
    const h1 = r.int(2, 5)
    let h2 = r.int(2, 9)
    if (h2 === h1) h2 += 1
    return numeric(
      {
        title: 'Dreisatz',
        prompt: `Ein Zug fährt in ${h1} Stunden ${v * h1} km. Wie weit kommt er in ${h2} Stunden (gleiche Geschwindigkeit)?`,
        value: v * h2,
        unit: 'km',
        wrong: [v, v * h1 + h2 - h1, v * h1 * h2, round((v * h1) / h2)],
        hint: 'Erst die Strecke für 1 Stunde (Strecke : Zeit), dann mal die neue Zeit.',
        solution: `1 Stunde: ${v * h1} : ${h1} = ${v} km. ${h2} Stunden: ${v} · ${h2} = ${v * h2} km.`,
      },
      r,
      level,
      form,
    )
  }
  const l = r.pick([10, 12, 15, 20, 25])
  const m1 = r.int(2, 6)
  let m2 = r.int(2, 12)
  if (m2 === m1) m2 += 1
  return numeric(
    {
      title: 'Dreisatz',
      prompt: `Eine Pumpe fördert in ${m1} Minuten ${l * m1} Liter Wasser. Wie viele Liter sind es in ${m2} Minuten?`,
      value: l * m2,
      unit: 'l',
      wrong: [l, l * m1 + m2 - m1, round((l * m1) / m2)],
      hint: 'Erst die Menge für 1 Minute ausrechnen, dann mal die neue Zeit.',
      solution: `1 Minute: ${l * m1} : ${m1} = ${l} l. ${m2} Minuten: ${l} · ${m2} = ${l * m2} l.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Dreisatz (antiproportional) ----------
defineSkill('zu.anti', 'Dreisatz: antiproportional', 'Je mehr, desto weniger: Das Produkt bleibt gleich.', (r, level, form) => {
  const ctx = r.int(0, 2)
  const pairs: [number, number][] = []
  const max = by(level, 12, 18, 24)
  for (let a = 2; a <= max; a++) for (let b = 2; b <= max; b++) if (a * b <= 72 && a * b >= 12) pairs.push([a, b])
  for (let tries = 0; tries < 200; tries++) {
    const [a, b] = r.pick(pairs)
    const c = a * b
    const divs: number[] = []
    for (let d = 1; d <= c; d++) if (c % d === 0 && d !== a && d >= 2 && d <= 24) divs.push(d)
    if (!divs.length) continue
    const a2 = r.pick(divs)
    const v = c / a2
    const text =
      ctx === 0
        ? `${a} Arbeiter brauchen für ein Dach ${b} Tage. Wie viele Tage brauchen ${a2} Arbeiter (gleich schnell)?`
        : ctx === 1
          ? `Bei ${a * 10} km/h dauert eine Fahrt ${b} Minuten. Wie lange dauert sie bei ${a2 * 10} km/h?`
          : `${a} Pumpen leeren ein Becken in ${b} Stunden. Wie viele Stunden brauchen ${a2} Pumpen?`
    const unit = ctx === 0 ? 'Tage' : ctx === 1 ? 'Minuten' : 'Stunden'
    return numeric(
      {
        title: 'Dreisatz',
        prompt: text,
        value: v,
        unit,
        wrong: [round((b * a2) / a), b + a2 - a, b * a2, round(b / a2)],
        hint: 'Je mehr Arbeiter (oder je schneller), desto kürzer die Zeit. Das Produkt aus beiden Zahlen bleibt gleich.',
        solution: `${a} · ${b} = ${c}. Also ${c} : ${a2} = ${v}.`,
      },
      r,
      level,
      form,
    )
  }
  return numeric({ title: 'Dreisatz', prompt: '2 Arbeiter brauchen 6 Tage. Wie viele Tage brauchen 3 Arbeiter?', value: 4, unit: 'Tage', solution: '2 · 6 = 12, 12 : 3 = 4.' }, r, level, form)
})

// ---------- Tabellen ergänzen ----------
defineSkill('zu.tabelle', 'Tabellen ergänzen', 'Den fehlenden Wert einer Zuordnung berechnen.', (r, level, form) => {
  const anti = level >= 2 && r.chance(0.5)
  let xs: number[]
  let ys: number[]
  let solution: string
  let hint: string
  if (!anti) {
    const k = r.int(2, by(level, 6, 9, 12))
    const base = r.int(1, 3)
    xs = [base, base + r.int(1, 2)]
    while (xs.length < 4) xs.push(xs[xs.length - 1] + r.int(1, 3))
    ys = xs.map((x) => x * k)
    hint = 'Bei proportionalen Zuordnungen ist y : x immer gleich.'
    solution = `y : x = ${k}.`
  } else {
    const c = r.pick([12, 24, 36, 48, 60])
    const divs = [1, 2, 3, 4, 6, 8, 9, 12].filter((d) => c % d === 0)
    xs = r.shuffle(divs).slice(0, 4).sort((a, b) => a - b)
    ys = xs.map((x) => c / x)
    hint = 'Bei antiproportionalen Zuordnungen ist x · y immer gleich.'
    solution = `x · y = ${c}.`
  }
  const i = r.int(1, 3)
  const missing = ys[i]
  const shown = ys.map((y, j) => (j === i ? '?' : num(y)))
  return numeric(
    {
      title: 'Tabelle ergänzen',
      prompt: `Ergänze den fehlenden Wert.\n${T(`x: ${list(xs)}`)}\n${T(`y: ${shown.join(', ')}`)}`,
      value: missing,
      wrong: [missing + 1, missing - 1, ys[(i + 1) % 4], xs[i]],
      hint,
      solution: `${solution} Für x = ${num(xs[i])} ist y = ${num(missing)}.`,
    },
    r,
    level,
    form,
  )
})
