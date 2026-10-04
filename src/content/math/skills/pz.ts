import { matching, numeric, type Level } from '../core'
import { fixed, frac, fracMarkup, num, round } from '../fmt'
import { defineSkill } from '../registry'

const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)
const T = (s: string) => `$${s}$`

/** Prozentsatz, gekürzter Bruch (Zähler, Nenner) und Dezimalzahl. */
const PAIRS: { p: number; n: number; d: number }[] = [
  { p: 50, n: 1, d: 2 },
  { p: 25, n: 1, d: 4 },
  { p: 75, n: 3, d: 4 },
  { p: 10, n: 1, d: 10 },
  { p: 20, n: 1, d: 5 },
  { p: 40, n: 2, d: 5 },
  { p: 60, n: 3, d: 5 },
  { p: 80, n: 4, d: 5 },
  { p: 30, n: 3, d: 10 },
  { p: 70, n: 7, d: 10 },
  { p: 90, n: 9, d: 10 },
  { p: 5, n: 1, d: 20 },
  { p: 15, n: 3, d: 20 },
  { p: 35, n: 7, d: 20 },
  { p: 45, n: 9, d: 20 },
  { p: 4, n: 1, d: 25 },
  { p: 8, n: 2, d: 25 },
]

// ---------- Prozent, Bruch, Dezimalzahl ----------
defineSkill('pz.umwandeln', 'Prozent, Bruch und Dezimalzahl', 'Dieselbe Größe in drei Schreibweisen.', (r, level, form) => {
  const pool = level === 1 ? PAIRS.slice(0, 9) : PAIRS
  if (level < 3 && r.chance(0.35)) {
    const four = r.shuffle(pool).slice(0, 4)
    return matching('Ordne zu', four.map((x) => [`${x.p} %`, frac(x.n, x.d)]), 'Hundert Prozent sind das Ganze. 50 % ist die Hälfte, 25 % ein Viertel.')
  }
  const x = r.pick(pool)
  const k = r.int(0, 3)
  if (k === 0) {
    return numeric(
      {
        title: 'Prozent → Bruch',
        prompt: `Schreibe als gekürzten Bruch: ${T(`${x.p} %`)}`,
        value: x.n / x.d,
        display: fracMarkup(x.n, x.d),
        frac: true,
        reduce: true,
        wrongText: [frac(x.p, 100), frac(x.d, x.n), frac(x.n, x.d + 1)].filter((t) => t !== fracMarkup(x.n, x.d)),
        hint: 'Prozent heißt „von Hundert“. Schreibe den Bruch mit Nenner 100 und kürze.',
        solution: `${x.p} % = ${frac(x.p, 100)} = ${fracMarkup(x.n, x.d)}`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 1) {
    return numeric(
      {
        title: 'Bruch → Prozent',
        prompt: `Wie viel Prozent sind ${T(frac(x.n, x.d))}?`,
        value: x.p,
        unit: '%',
        wrong: [round(x.n / x.d, 2), x.d, 100 - x.p, x.p / 10],
        hint: 'Erweitere den Bruch auf den Nenner 100. Der Zähler ist dann die Prozentzahl.',
        solution: `${frac(x.n, x.d)} = ${frac(x.p, 100)} = ${x.p} %`,
      },
      r,
      level,
      form,
    )
  }
  if (k === 2) {
    return numeric(
      {
        title: 'Dezimalzahl → Prozent',
        prompt: `Wie viel Prozent sind ${T(num(x.p / 100))}?`,
        value: x.p,
        unit: '%',
        wrong: [x.p / 10, x.p * 10, x.p / 100],
        hint: 'Multipliziere mit 100: Das Komma wandert zwei Stellen nach rechts.',
        solution: `${num(x.p / 100)} = ${x.p} %`,
      },
      r,
      level,
      form,
    )
  }
  return numeric(
    {
      title: 'Prozent → Dezimalzahl',
      prompt: `Schreibe als Dezimalzahl: ${T(`${x.p} %`)}`,
      value: x.p / 100,
      wrong: [x.p / 10, x.p, x.p / 1000],
      hint: 'Teile durch 100: Das Komma wandert zwei Stellen nach links.',
      solution: `${x.p} % = ${num(x.p / 100)}`,
    },
    r,
    level,
    form,
  )
})

const MONEY = '€'

// ---------- Prozentwert ----------
defineSkill('pz.wert', 'Prozentwert berechnen', 'Wie viel sind p Prozent von einer Größe?', (r, level, form) => {
  const ps = by(level, [10, 20, 25, 50, 75], [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80], [8, 12, 16, 35, 45, 5, 15, 30, 60])
  const p = r.pick(ps)
  const base = level === 3 ? 50 * r.int(1, 14) : 20 * r.int(2, 20)
  const v = round((base * p) / 100)
  const ctx = r.int(0, 2)
  const unit = ctx === 0 ? MONEY : ctx === 1 ? 'kg' : 'Schüler'
  const text =
    ctx === 0
      ? `Eine Jacke kostet ${num(base)} €. Wie viel Euro sind ${p} % davon?`
      : ctx === 1
        ? `Wie viel kg sind ${p} % von ${num(base)} kg?`
        : `In einer Schule sind ${base} Kinder. ${p} % davon fahren mit dem Rad. Wie viele Kinder sind das?`
  return numeric(
    {
      title: 'Prozentwert',
      prompt: text,
      value: v,
      unit,
      wrong: [round(base * p), round(base / p), round(base - v), round(v * 10)],
      hint: 'Prozentwert = Grundwert · Prozentsatz. Mit p % meinst du p/100.',
      solution: `${num(base)} · ${num(p / 100)} = ${num(v)}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Grundwert ----------
defineSkill('pz.grund', 'Grundwert berechnen', 'Das Ganze finden, wenn ein Teil und sein Prozentsatz bekannt sind.', (r, level, form) => {
  const ps = by(level, [10, 20, 25, 50], [5, 10, 15, 20, 25, 30, 40, 50, 60], [5, 12, 15, 35, 45, 8, 16, 60, 75])
  const p = r.pick(ps)
  const base = level === 3 ? 100 * r.int(1, 12) : 20 * r.int(2, 15)
  const w = round((base * p) / 100)
  const ctx = r.int(0, 2)
  const text =
    ctx === 0
      ? `${num(w)} € sind ${p} % vom Preis eines Fahrrads. Wie teuer ist das Fahrrad?`
      : ctx === 1
        ? `${p} % einer Strecke sind ${num(w)} km. Wie lang ist die ganze Strecke?`
        : `${num(w)} Kinder sind ${p} % der Klasse. Wie viele Kinder hat die Klasse?`
  const unit = ctx === 0 ? MONEY : ctx === 1 ? 'km' : 'Kinder'
  return numeric(
    {
      title: 'Grundwert',
      prompt: text,
      value: base,
      unit,
      wrong: [round((w * p) / 100), round(w * p), round(w / p), round(w + base / 10)],
      hint: 'Rechne erst auf 1 % zurück (Prozentwert : Prozentsatz), dann mal 100.',
      solution: `${num(w)} : ${p} = ${num(round(w / p, 6))} (das sind 1 %), mal 100 = ${num(base)}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Prozentsatz ----------
defineSkill('pz.satz', 'Prozentsatz berechnen', 'Wie viel Prozent ist der Teil vom Ganzen?', (r, level, form) => {
  const ps = by(level, [10, 20, 25, 50, 75], [5, 10, 15, 20, 25, 30, 40, 60, 80], [4, 8, 12, 16, 35, 45, 5, 15, 65])
  const p = r.pick(ps)
  const base = level === 3 ? 100 * r.int(1, 8) : 20 * r.int(2, 12)
  const w = round((base * p) / 100)
  const ctx = r.int(0, 2)
  const text =
    ctx === 0
      ? `Von ${base} Schülern fehlen ${num(w)}. Wie viel Prozent der Schüler fehlen?`
      : ctx === 1
        ? `Ein Pullover kostet ${num(base)} €. Er wird um ${num(w)} € billiger. Wie viel Prozent sind das?`
        : `Eine Mannschaft hat ${base} Spiele gespielt und ${num(w)} gewonnen. Wie viel Prozent hat sie gewonnen?`
  return numeric(
    {
      title: 'Prozentsatz',
      prompt: text,
      value: p,
      unit: '%',
      wrong: [round(w / base, 3), round((base / w) * 100), 100 - p, p / 10],
      hint: 'Prozentsatz = Prozentwert : Grundwert. Das Ergebnis ist eine Dezimalzahl, mal 100 gibt Prozent.',
      solution: `${num(w)} : ${num(base)} = ${num(round(w / base, 4))} = ${p} %`,
    },
    r,
    level,
    form,
  )
})

// ---------- Rabatt und Aufschlag ----------
defineSkill('pz.preis', 'Rabatt und Preiserhöhung', 'Neuer Preis nach Prozent mehr oder weniger.', (r, level, form) => {
  const ps = by(level, [10, 20, 25, 50], [5, 10, 15, 20, 25, 30, 40], [12, 15, 19, 35, 45, 7])
  const mwst = level === 3 && r.chance(0.35)
  const p = mwst ? 19 : r.pick(ps)
  const base = mwst ? 100 * r.int(1, 12) : 20 * r.int(2, 20)
  const up = mwst || r.chance(0.4)
  const delta = round((base * p) / 100)
  const v = round(up ? base + delta : base - delta)
  const prompt = mwst
    ? `Ein Fernseher kostet ohne Mehrwertsteuer ${num(base)} €. Dazu kommen 19 % Mehrwertsteuer. Wie viel kostet er im Laden?`
    : up
      ? `Ein Ticket kostet ${num(base)} €. Der Preis steigt um ${p} %. Wie viel kostet es danach?`
      : `Eine Hose kostet ${num(base)} €. Es gibt ${p} % Rabatt. Wie viel kostet sie jetzt?`
  return numeric(
    {
      title: 'Neuer Preis',
      prompt,
      value: v,
      unit: MONEY,
      fmt: (x) => fixed(x, 2),
      display: fixed(v, 2),
      wrong: [delta, round(up ? base - delta : base + delta), up ? base + p : base - p],
      hint: up ? 'Neuer Preis = alter Preis + Prozentwert. Oder alter Preis mal (1 + p/100).' : 'Neuer Preis = alter Preis − Rabatt. Oder alter Preis mal (1 − p/100).',
      solution: `${p} % von ${num(base)} = ${num(delta)}; ${num(base)} ${up ? '+' : '−'} ${num(delta)} = ${num(v)}`,
    },
    r,
    level,
    form,
  )
})

// ---------- Zinsen ----------
defineSkill('pz.zins', 'Zinsrechnung', 'Zinsen für ein Jahr oder einige Monate.', (r, level, form) => {
  const K = 400 * r.int(1, level === 1 ? 6 : 12)
  const p = r.int(1, level === 1 ? 4 : 6)
  if (level === 1 || r.chance(0.35)) {
    const Z = round((K * p) / 100)
    return numeric(
      {
        title: 'Jahreszinsen',
        prompt: `Ein Guthaben von ${K} € wird mit ${p} % im Jahr verzinst. Wie viel Euro Zinsen gibt es nach einem Jahr?`,
        value: Z,
        unit: MONEY,
        wrong: [round(K * p), round(K / p), round(K + Z)],
        hint: 'Zinsen sind der Prozentwert vom Kapital: Z = K · p/100.',
        solution: `${K} · ${num(p / 100)} = ${num(Z)}`,
      },
      r,
      level,
      form,
    )
  }
  if (level === 2 || r.chance(0.4)) {
    const Z = round((K * p) / 100)
    return numeric(
      {
        title: 'Zinssatz',
        prompt: `Auf ${K} € gibt es nach einem Jahr ${num(Z)} € Zinsen. Wie hoch ist der Zinssatz?`,
        value: p,
        unit: '%',
        wrong: [round(Z / K, 4), 100 - p, p * 10],
        hint: 'Zinssatz = Zinsen : Kapital, mal 100.',
        solution: `${num(Z)} : ${K} = ${num(round(Z / K, 4))} = ${p} %`,
      },
      r,
      level,
      form,
    )
  }
  const months = r.pick([3, 6, 9])
  const Z = round((K * p * months) / 1200)
  return numeric(
    {
      title: 'Zinsen für Monate',
      prompt: `${K} € werden ${months} Monate lang mit ${p} % im Jahr verzinst. Wie viel Euro Zinsen sind das?`,
      value: Z,
      unit: MONEY,
      wrong: [round((K * p) / 100), round((K * p * months) / 100), round((K * p) / 100 / months)],
      hint: `Erst die Zinsen für ein ganzes Jahr, dann mal ${months}/12 (${months} von 12 Monaten).`,
      solution: `Jahreszinsen ${num(round((K * p) / 100))} €, davon ${months}/12 = ${num(Z)} €.`,
    },
    r,
    level,
    form,
  )
})
