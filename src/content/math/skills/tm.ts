import { choice, numeric, termText, type Level } from '../core'
import { MINUS, num, opd, round } from '../fmt'
import { defineSkill } from '../registry'

const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)
const T = (s: string) => `$${s}$`
const lin = (a: number, b: number) => termText([{ c: a, v: 'x' }, { c: b }])

// ---------- Terme berechnen ----------
defineSkill('tm.einsetzen', 'Terme berechnen', 'Eine Zahl für die Variable einsetzen.', (r, level, form) => {
  let term: string
  let x: number
  let v: number
  if (level === 1) {
    const a = r.int(2, 6)
    const b = r.int(1, 9) * r.sign()
    x = r.int(1, 6)
    term = lin(a, b)
    v = a * x + b
  } else if (level === 2) {
    const a = r.int(2, 7) * r.sign()
    const b = r.int(1, 9) * r.sign()
    x = r.int(-6, 6)
    if (x === 0) x = -2
    term = lin(a, b)
    v = a * x + b
  } else {
    const kind = r.int(0, 1)
    x = r.int(-4, 4)
    if (kind === 0) {
      const c = r.nz(-5, 5)
      term = `x^2 ${c < 0 ? '−' : '+'} ${Math.abs(c)}x`
      v = x * x + c * x
    } else {
      const a = r.int(2, 5)
      const b = r.int(1, 6)
      const c = r.int(1, 3)
      term = `${a}(x + ${b}) − ${c}x`
      v = a * (x + b) - c * x
    }
  }
  return numeric(
    {
      title: 'Term berechnen',
      prompt: `Berechne ${T(term)} für ${T(`x = ${num(x)}`)}.`,
      value: v,
      wrong: [v + 1, -v, v - 1, round(v + x)],
      hint: `Setze für x die Zahl ${num(x)} ein, bei negativen Zahlen mit Klammern. Dann Punkt vor Strich.`,
      solution: `${term.replace(/(\d)x/g, '$1 · x').replace(/(\d)\(/g, '$1 · (').replace(/x/g, opd(x))} = ${num(v)}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Terme zusammenfassen ----------
defineSkill('tm.zusammen', 'Terme zusammenfassen', 'Gleichartige Glieder addieren und subtrahieren.', (r, level, form) => {
  if (level === 1) {
    let a: number
    let b: number
    let c: number
    let v: number
    do {
      a = r.int(2, 9)
      b = r.int(2, 9) * r.sign()
      c = r.int(2, 9) * r.sign()
      v = a + b + c
    } while (Math.abs(v) < 2)
    const term = termText([{ c: a, v: 'x' }, { c: b, v: 'x' }, { c: c, v: 'x' }])
    return numeric(
      {
        title: 'Zusammenfassen',
        prompt: `Fasse zusammen: ${T(term)}`,
        value: v,
        unit: 'x',
        wrong: [a + Math.abs(b) + Math.abs(c), -v, a - b - c],
        hint: 'Rechne nur die Zahlen vor dem x: Die x bleiben stehen.',
        solution: `${num(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${num(v)}, also ${num(v)}x`,
      },
      r,
      level,
      form,
    )
  }
  let a: number
  let b: number
  let c: number
  let d: number
  do {
    a = r.int(2, 9) * r.sign()
    b = r.int(1, 12) * r.sign()
    c = r.int(2, 9) * r.sign()
    d = r.int(1, 12) * r.sign()
  } while (a + c === 0 || b + d === 0)
  const term = termText([{ c: a, v: 'x' }, { c: b }, { c: c, v: 'x' }, { c: d }])
  const right = termText([{ c: a + c, v: 'x' }, { c: b + d }])
  const wrong = [
    termText([{ c: a - c, v: 'x' }, { c: b + d }]),
    termText([{ c: a + c, v: 'x' }, { c: b - d }]),
    termText([{ c: Math.abs(a) + Math.abs(c), v: 'x' }, { c: b + d }]),
    termText([{ c: a + c + b + d, v: 'x' }]),
  ]
  return choice(
    {
      title: 'Zusammenfassen',
      prompt: `Welcher Term ist gleich ${T(term)}?`,
      answer: T(right),
      wrong: wrong.map(T),
      hint: 'Fasse die x-Glieder zusammen und die Zahlen für sich.',
      solution: `x-Glieder: ${num(a)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)}x = ${num(a + c)}x. Zahlen: ${num(b)} ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${num(b + d)}.`,
    },
    r,
  )
})

// ---------- Klammern auflösen ----------
defineSkill('tm.klammer', 'Klammern auflösen', 'Jedes Glied in der Klammer mit dem Faktor multiplizieren.', (r, level, form) => {
  if (level === 3 && r.chance(0.7)) {
    const a = r.int(2, 6) * r.sign()
    const b = r.int(2, 8) * r.sign()
    const c = r.int(2, 5)
    const inner = termText([{ c, v: 'x' }, { c: b }])
    const right = termText([{ c: a * c, v: 'x' }, { c: a * b }])
    const wrong = [
      termText([{ c: a * c, v: 'x' }, { c: b }]),
      termText([{ c: a * c, v: 'x' }, { c: -a * b }]),
      termText([{ c: a + c, v: 'x' }, { c: a * b }]),
      termText([{ c: c, v: 'x' }, { c: a * b }]),
    ]
    return choice(
      {
        title: 'Klammer auflösen',
        prompt: `Welcher Term ist gleich ${T(`${num(a)}(${inner})`)}?`,
        answer: T(right),
        wrong: wrong.map(T),
        hint: 'Der Faktor vor der Klammer wird mit jedem Glied in der Klammer multipliziert, auch mit seinem Vorzeichen.',
        solution: `${num(a)} · ${num(c)}x = ${num(a * c)}x und ${num(a)} · ${opd(b)} = ${num(a * b)}.`,
      },
      r,
    )
  }
  const a = level === 1 ? r.int(2, 6) : r.int(2, 6) * r.sign()
  const b = level === 1 ? r.int(1, 9) : r.int(1, 9) * r.sign()
  const v = a * b
  return numeric(
    {
      title: 'Klammer auflösen',
      prompt: `Ergänze: ${T(`${num(a)}(x ${b < 0 ? '−' : '+'} ${Math.abs(b)}) = ${num(a)}x ${v < 0 ? '−' : '+'} ?`)}`,
      value: Math.abs(v),
      wrong: [Math.abs(b), Math.abs(a + b), Math.abs(a) + 1],
      hint: 'Multipliziere die Zahl vor der Klammer mit der Zahl in der Klammer. Das Vorzeichen steht schon da.',
      solution: `${num(a)} · ${opd(b)} = ${num(v)}, also ${num(a)}x ${v < 0 ? '−' : '+'} ${Math.abs(v)}.`,
    },
    r,
    level,
    form,
  )
})

// ---------- Einfache Gleichungen ----------
defineSkill('gl.einfach', 'Einfache Gleichungen lösen', 'Eine Rechenoperation rückgängig machen.', (r, level, form) => {
  const range = by(level, 12, 15, 20)
  const k = r.int(0, 2)
  let eq: string
  let x: number
  let hint: string
  let solution: string
  let wrong: number[]
  if (k === 0) {
    // x + a = b  oder  x − a = b
    x = level === 1 ? r.int(1, range) : r.int(-range, range) || 3
    const a = r.int(1, 15) * (level === 1 ? 1 : r.sign())
    const b = x + a
    eq = `x ${a < 0 ? '−' : '+'} ${Math.abs(a)} = ${num(b)}`
    hint = 'Mache die Rechnung rückgängig: Auf beiden Seiten das Gleiche addieren oder subtrahieren.'
    solution = `x ${a < 0 ? '−' : '+'} ${Math.abs(a)} = ${num(b)}  |  ${a < 0 ? '+' : '−'} ${Math.abs(a)}  →  x = ${num(x)}`
    wrong = [b + a, -x, x + 1, x - 1]
  } else if (k === 1) {
    // a·x = b
    x = level === 1 ? r.int(2, 10) : r.int(-12, 12) || 5
    const a = r.int(2, 9) * (level === 1 ? 1 : r.sign())
    const b = a * x
    eq = `${num(a)}x = ${num(b)}`
    hint = 'Teile beide Seiten durch die Zahl vor dem x.'
    solution = `${num(a)}x = ${num(b)}  |  : ${opd(a)}  →  x = ${num(x)}`
    wrong = [b - a, -x, b * a, x + 1]
  } else {
    // x : a = q
    const a = r.int(2, 6)
    const q = level === 1 ? r.int(2, 9) : r.int(-9, 9) || 4
    x = a * q
    eq = `{x|${a}} = ${num(q)}`
    hint = 'Das Gegenteil von Teilen ist Malnehmen: Multipliziere beide Seiten mit der Zahl im Nenner.'
    solution = `x : ${a} = ${num(q)}  |  · ${a}  →  x = ${num(x)}`
    wrong = [q + a, q - a, -x, round(q / a, 2)]
  }
  return numeric({ title: 'Gleichung lösen', prompt: `Löse die Gleichung: ${T(eq)}`, lead: 'x =', value: x, wrong, hint, solution }, r, level, form)
}, { blitz: true })

// ---------- Gleichungen in zwei Schritten ----------
defineSkill('gl.zwei', 'Gleichungen in zwei Schritten', 'Erst die Zahl ohne x, dann den Faktor beseitigen.', (r, level, form) => {
  let eq: string
  let x: number
  let solution: string
  let hint = 'Erst die Zahl ohne x auf die andere Seite bringen, dann durch die Zahl vor dem x teilen.'
  let wrong: number[]
  if (level <= 2) {
    const a = level === 1 ? r.int(2, 6) : r.int(2, 7) * r.sign()
    const b = level === 1 ? r.int(1, 12) : r.int(1, 12) * r.sign()
    x = level === 1 ? r.int(1, 9) : r.int(-8, 9) || 4
    const c = a * x + b
    eq = `${lin(a, b)} = ${num(c)}`
    solution = `${eq}  |  ${b < 0 ? '+' : '−'} ${Math.abs(b)}  →  ${num(a)}x = ${num(c - b)}  |  : ${opd(a)}  →  x = ${num(x)}`
    wrong = [(c + b) / a, c - b, -x, x + 1]
  } else {
    const a = r.int(3, 9)
    const c2 = r.int(1, a - 1)
    const b = r.int(-10, 10)
    x = r.int(-8, 9) || 3
    const d = (a - c2) * x + b
    eq = `${lin(a, b)} = ${termText([{ c: c2, v: 'x' }, { c: d }])}`
    hint = 'Bringe alle x auf eine Seite und alle Zahlen auf die andere. Dann durch die Zahl vor dem x teilen.'
    solution = `Alle x nach links: ${num(a - c2)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${num(d)}  →  ${num(a - c2)}x = ${num(d - b)}  →  x = ${num(x)}`
    wrong = [-x, (d + b) / (a - c2), (d - b) / (a + c2), x + 2]
  }
  return numeric(
    { title: 'Gleichung lösen', prompt: `Löse die Gleichung: ${T(eq)}`, lead: 'x =', value: x, wrong: wrong.map((w) => round(w, 2)), hint, solution },
    r,
    level,
    form,
  )
})

// ---------- Textaufgaben ----------
defineSkill('gl.text', 'Textaufgaben mit Gleichungen', 'Aus einer Geschichte eine Gleichung machen und lösen.', (r, level, form) => {
  const k = level === 1 ? r.int(0, 1) : r.int(0, 4)
  if (k === 0) {
    const m = r.int(2, 5)
    const s = r.int(1, 12)
    const plus = r.chance(0.6)
    const x = r.int(2, 15)
    const res = m * x + (plus ? s : -s)
    return numeric(
      {
        title: 'Textaufgabe',
        prompt: `Ich denke mir eine Zahl, nehme sie mal ${m} und ${plus ? 'addiere' : 'subtrahiere'} ${s}. Das Ergebnis ist ${res}. Welche Zahl habe ich mir gedacht?`,
        value: x,
        wrong: [m * x, x + 1, (res + s) / m],
        hint: `Stelle die Gleichung auf: ${m}x ${plus ? '+' : '−'} ${s} = ${res}. Dann in zwei Schritten lösen.`,
        solution: `${m}x ${plus ? '+' : '−'} ${s} = ${res}  →  ${m}x = ${plus ? res - s : res + s}  →  x = ${x}`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 1) {
    const g = r.int(3, 6)
    const per = r.int(2, 4)
    const x = r.int(3, 14)
    return numeric(
      {
        title: 'Textaufgabe',
        prompt: `Eine Taxifahrt kostet ${g} € Grundgebühr und ${per} € für jeden Kilometer. Die Fahrt kostet ${g + per * x} €. Wie viele Kilometer ist man gefahren?`,
        value: x,
        unit: 'km',
        wrong: [x + 1, (g + per * x) / per, g + per * x - g],
        hint: `Gleichung: ${per}x + ${g} = ${g + per * x}. Erst die Grundgebühr abziehen.`,
        solution: `${per}x + ${g} = ${g + per * x}  →  ${per}x = ${per * x}  →  x = ${x}`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 2) {
    const x = r.int(8, 30)
    const n = r.int(3, 15)
    const total = 2 * x + n
    return choice(
      {
        title: 'Gleichung aufstellen',
        prompt: `Lena hat x Euro. Ihr Bruder hat ${n} Euro mehr als sie. Zusammen haben sie ${total} Euro. Welche Gleichung passt?`,
        answer: T(`x + (x + ${n}) = ${total}`),
        wrong: [T(`x + ${n} = ${total}`), T(`x + x − ${n} = ${total}`), T(`x · ${n} = ${total}`)],
        hint: 'Lena hat x, ihr Bruder x + n. Zusammen heißt: addieren.',
        solution: `Lena: x, Bruder: x + ${n}. Zusammen: x + (x + ${n}) = ${total}.`,
      },
      r,
    )
  }
  if (k === 3) {
    const x = r.int(3, 12)
    const dlt = r.int(2, 6)
    const u = 2 * x + 2 * (x + dlt)
    return choice(
      {
        title: 'Gleichung aufstellen',
        prompt: `Ein Rechteck ist x cm breit und ${dlt} cm länger als breit. Der Umfang beträgt ${u} cm. Welche Gleichung passt?`,
        answer: T(`2x + 2(x + ${dlt}) = ${u}`),
        wrong: [T(`x + x + ${dlt} = ${u}`), T(`2x + ${dlt} = ${u}`), T(`x · (x + ${dlt}) = ${u}`)],
        hint: 'Umfang = 2 · Breite + 2 · Länge. Die Länge ist x + Unterschied.',
        solution: `Breite x, Länge x + ${dlt}: Umfang 2x + 2(x + ${dlt}) = ${u}.`,
      },
      r,
    )
  }
  const m = r.int(2, 5)
  const s = r.int(2, 9)
  const x = r.int(3, 12)
  const res = m * x - s
  return choice(
    {
      title: 'Gleichung aufstellen',
      prompt: `Das ${m === 2 ? 'Doppelte' : m === 3 ? 'Dreifache' : m === 4 ? 'Vierfache' : 'Fünffache'} einer Zahl, vermindert um ${s}, ist ${res}. Welche Gleichung passt?`,
      answer: T(`${m}x ${MINUS} ${s} = ${res}`),
      wrong: [T(`${m}x + ${s} = ${res}`), T(`${m}(x ${MINUS} ${s}) = ${res}`), T(`x + ${m} ${MINUS} ${s} = ${res}`)],
      hint: 'Erst die Zahl mit dem Faktor malnehmen, dann vermindern.',
      solution: `${m}x − ${s} = ${res}`,
    },
    r,
  )
})
