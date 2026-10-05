import { calc, formatNumber } from '../lib/calc'
import { computeTask, normalizeTask, type Task } from '../lib/tasks'

/**
 * Formel-Training für Physik, Chemie und Mathe, ganz ohne KI: Die Aufgaben entstehen aus "schönen" Zahlen, die App rechnet
 * das Ergebnis selbst aus (calc.ts) und zeigt bei einem Fehler den Rechenweg. Dazu kommen ein paar Wissensfragen je Thema.
 */
export interface FormulaSkill {
  id: string
  subject: 'physik' | 'chemie' | 'mathe'
  title: string
  /** Die Formel, wie sie im Heft steht */
  formula: string
  /** Eine Zeile, worum es geht */
  text: string
  /** Eine Rechenaufgabe */
  make: (rng: () => number) => Draft
  /** Wissensfragen zum Thema (Auswahl) */
  quiz: { q: string; options: string[]; answer: number; why?: string }[]
}

/** Entwurf einer Rechenaufgabe: Text, Rechnung, Einheit und die Formelzeile für den Rechenweg. */
interface Draft {
  q: string
  expr: string
  unit?: string
  digits?: number
  line: string
}

const pick = <T,>(rng: () => number, a: readonly T[]): T => a[Math.floor(rng() * a.length)]
const num = (x: number): string => formatNumber(x, 4)
/** Rechnung für die Anzeige: "150 : 2". */
const pretty = (expr: string): string => expr.replace(/\*/g, ' · ').replace(/\//g, ' : ').replace(/\./g, ',').replace(/\s+/g, ' ').trim()

const geschwindigkeit = (rng: () => number): Draft => {
  const v = pick(rng, [30, 40, 45, 50, 60, 80, 90, 100, 120])
  const t = pick(rng, [2, 3, 4, 5])
  const s = v * t
  switch (pick(rng, ['v', 's', 't', 'ms'] as const)) {
    case 'v':
      return { q: `Ein Auto fährt ${s} km in ${t} Stunden. Wie schnell ist es im Durchschnitt?`, expr: `${s}/${t}`, unit: 'km/h', line: 'v = s : t' }
    case 's':
      return { q: `Ein Zug fährt ${t} Stunden lang mit ${v} km/h. Wie weit kommt er?`, expr: `${v}*${t}`, unit: 'km', line: 's = v · t' }
    case 't':
      return { q: `Ein Bus fährt eine Strecke von ${s} km mit ${v} km/h. Wie viele Stunden braucht er?`, expr: `${s}/${v}`, unit: 'h', line: 't = s : v' }
    default: {
      const m = pick(rng, [2, 3, 4, 5, 6, 8])
      const sec = pick(rng, [5, 10, 20, 30])
      return { q: `Ein Läufer rennt ${m * sec} m in ${sec} s. Wie schnell ist er in m/s?`, expr: `${m * sec}/${sec}`, unit: 'm/s', line: 'v = s : t' }
    }
  }
}

const dichte = (rng: () => number): Draft => {
  const rho = pick(rng, [0.8, 1, 2.5, 2.7, 7.8, 8.9, 11.3])
  const V = pick(rng, [10, 20, 40, 50, 100])
  const m = Math.round(rho * V * 100) / 100
  switch (pick(rng, ['rho', 'm', 'V'] as const)) {
    case 'rho':
      return { q: `Ein Körper hat die Masse ${num(m)} g und das Volumen ${V} cm³. Welche Dichte hat er?`, expr: `${m}/${V}`, unit: 'g/cm³', line: 'ρ = m : V' }
    case 'm':
      return { q: `Ein Körper aus einem Stoff mit der Dichte ${num(rho)} g/cm³ hat ein Volumen von ${V} cm³. Welche Masse hat er?`, expr: `${rho}*${V}`, unit: 'g', line: 'm = ρ · V' }
    default:
      return { q: `Ein Körper mit der Masse ${num(m)} g besteht aus einem Stoff mit der Dichte ${num(rho)} g/cm³. Welches Volumen hat er?`, expr: `${m}/${rho}`, unit: 'cm³', line: 'V = m : ρ' }
  }
}

const druck = (rng: () => number): Draft => {
  const A = pick(rng, [0.5, 2, 4, 5, 10])
  const p = pick(rng, [100, 200, 500, 1000, 2000])
  const F = p * A
  switch (pick(rng, ['p', 'F', 'A'] as const)) {
    case 'p':
      return { q: `Eine Kraft von ${num(F)} N wirkt senkrecht auf eine Fläche von ${num(A)} m². Wie groß ist der Druck?`, expr: `${F}/${A}`, unit: 'Pa', line: 'p = F : A' }
    case 'F':
      return { q: `Auf einer Fläche von ${num(A)} m² herrscht ein Druck von ${p} Pa. Welche Kraft wirkt?`, expr: `${p}*${A}`, unit: 'N', line: 'F = p · A' }
    default:
      return { q: `Eine Kraft von ${num(F)} N erzeugt einen Druck von ${p} Pa. Wie groß ist die Fläche?`, expr: `${F}/${p}`, unit: 'm²', line: 'A = F : p' }
  }
}

const arbeit = (rng: () => number): Draft => {
  const F = pick(rng, [20, 50, 100, 200, 400])
  const s = pick(rng, [2, 3, 5, 10])
  const t = pick(rng, [2, 4, 5, 10])
  if (rng() < 0.5) return { q: `Eine Kraft von ${F} N verschiebt einen Körper um ${s} m in Kraftrichtung. Welche Arbeit wird verrichtet?`, expr: `${F}*${s}`, unit: 'J', line: 'W = F · s' }
  return { q: `Eine Maschine verrichtet ${F * s * t} J Arbeit in ${t} s. Welche Leistung hat sie?`, expr: `${F * s * t}/${t}`, unit: 'W', line: 'P = W : t' }
}

const ohm = (rng: () => number): Draft => {
  const R = pick(rng, [10, 20, 25, 50, 100, 200])
  const I = pick(rng, [0.1, 0.2, 0.5, 1, 2])
  const U = Math.round(R * I * 100) / 100
  switch (pick(rng, ['U', 'I', 'R'] as const)) {
    case 'U':
      return { q: `Durch einen Widerstand von ${R} Ω fließt ein Strom von ${num(I)} A. Welche Spannung liegt an?`, expr: `${R}*${I}`, unit: 'V', line: 'U = R · I' }
    case 'I':
      return { q: `An einem Widerstand von ${R} Ω liegt eine Spannung von ${num(U)} V. Wie groß ist die Stromstärke?`, expr: `${U}/${R}`, unit: 'A', line: 'I = U : R' }
    default:
      return { q: `An einem Bauteil liegen ${num(U)} V, es fließen ${num(I)} A. Welchen Widerstand hat es?`, expr: `${U}/${I}`, unit: 'Ω', line: 'R = U : I' }
  }
}

const elektrischeLeistung = (rng: () => number): Draft => {
  const U = pick(rng, [12, 24, 230])
  const I = pick(rng, [0.5, 1, 2, 4])
  const P = Math.round(U * I * 100) / 100
  const t = pick(rng, [2, 3, 5, 10])
  if (rng() < 0.5) return { q: `Ein Gerät liegt an ${U} V und zieht ${num(I)} A. Welche Leistung hat es?`, expr: `${U}*${I}`, unit: 'W', line: 'P = U · I' }
  return { q: `Ein Gerät mit ${num(P)} W läuft ${t} Stunden. Wie viel Energie braucht es in Wh?`, expr: `${P}*${t}`, unit: 'Wh', line: 'E = P · t' }
}

const hebel = (rng: () => number): Draft => {
  // Zahlen so wählen, dass F₂ eine ganze Zahl wird
  for (let i = 0; i < 40; i++) {
    const F1 = pick(rng, [20, 30, 40, 60, 80])
    const l1 = pick(rng, [20, 30, 40, 60])
    const l2 = pick(rng, [10, 15, 20, 30])
    if ((F1 * l1) % l2 === 0) return { q: `Am Hebel hängt links eine Last mit ${F1} N im Abstand ${l1} cm vom Drehpunkt. Welche Kraft hält rechts bei ${l2} cm im Gleichgewicht?`, expr: `${F1}*${l1}/${l2}`, unit: 'N', line: 'F₂ = F₁ · l₁ : l₂' }
  }
  return { q: 'Am Hebel hängt links eine Last mit 40 N im Abstand 30 cm. Welche Kraft hält rechts bei 20 cm im Gleichgewicht?', expr: '40*30/20', unit: 'N', line: 'F₂ = F₁ · l₁ : l₂' }
}

const gewichtskraft = (rng: () => number): Draft => {
  const m = pick(rng, [2, 5, 8, 12, 20, 50, 75])
  return { q: `Wie groß ist die Gewichtskraft eines Körpers mit der Masse ${m} kg? (Rechne mit g = 10 N/kg.)`, expr: `${m}*10`, unit: 'N', line: 'F = m · g' }
}

const SUBSTANCES: { name: string; M: number }[] = [
  { name: 'Wasser (H₂O)', M: 18 },
  { name: 'Kohlenstoffdioxid (CO₂)', M: 44 },
  { name: 'Natriumchlorid (NaCl)', M: 58.5 },
  { name: 'Sauerstoff (O₂)', M: 32 },
  { name: 'Calciumcarbonat (CaCO₃)', M: 100 },
]
const stoffmenge = (rng: () => number): Draft => {
  const s = pick(rng, SUBSTANCES)
  const n = pick(rng, [0.5, 1, 2, 3, 4])
  const m = Math.round(n * s.M * 100) / 100
  if (rng() < 0.5) return { q: `${num(m)} g ${s.name} (M = ${num(s.M)} g/mol). Welche Stoffmenge ist das?`, expr: `${m}/${s.M}`, unit: 'mol', line: 'n = m : M' }
  return { q: `Welche Masse haben ${num(n)} mol ${s.name} (M = ${num(s.M)} g/mol)?`, expr: `${n}*${s.M}`, unit: 'g', line: 'm = n · M' }
}

const massenanteil = (rng: () => number): Draft => {
  const lsg = pick(rng, [50, 100, 200, 250, 500])
  const stoff = pick(rng, [5, 10, 20, 25].filter((x) => x < lsg))
  return { q: `In ${lsg} g Lösung sind ${stoff} g Salz gelöst. Wie viel Prozent beträgt der Massenanteil des Salzes?`, expr: `${stoff}/${lsg}*100`, unit: '%', line: 'w = m(Stoff) : m(Lösung) · 100 %' }
}

const prozent = (rng: () => number): Draft => {
  const G = pick(rng, [40, 80, 120, 200, 250, 400, 600])
  const p = pick(rng, [5, 10, 15, 20, 25, 40, 50])
  const W = (G * p) / 100
  switch (pick(rng, ['W', 'p', 'G'] as const)) {
    case 'W':
      return { q: `Berechne ${p} % von ${G} €.`, expr: `${G}*${p}/100`, unit: '€', line: 'W = G · p : 100' }
    case 'p':
      return { q: `Wie viel Prozent sind ${num(W)} € von ${G} €?`, expr: `${num(W).replace(',', '.')}/${G}*100`, unit: '%', line: 'p = W : G · 100' }
    default:
      return { q: `${p} % einer Summe sind ${num(W)} €. Wie groß ist die ganze Summe?`, expr: `${num(W).replace(',', '.')}/${p}*100`, unit: '€', line: 'G = W : p · 100' }
  }
}

const dreisatz = (rng: () => number): Draft => {
  const a = pick(rng, [3, 4, 5, 6, 8])
  const unit = pick(rng, [0.5, 0.75, 1.2, 1.5, 2.4, 3])
  const price = Math.round(a * unit * 100) / 100
  const b = pick(rng, [2, 7, 9, 10, 12].filter((x) => x !== a))
  return { q: `${a} Hefte kosten ${num(price)} €. Wie viel kosten ${b} Hefte?`, expr: `${num(price).replace(',', '.')}/${a}*${b}`, unit: '€', line: 'Preis für 1 Heft, dann mal Anzahl' }
}

export const FORMULA_SKILLS: FormulaSkill[] = [
  { id: 'phy-v', subject: 'physik', title: 'Geschwindigkeit', formula: 'v = s : t', text: 'Weg, Zeit und Geschwindigkeit', make: geschwindigkeit, quiz: [
    { q: 'Welche Einheit hat die Geschwindigkeit?', options: ['m/s', 'N', 'J', 'kg'], answer: 0 },
    { q: 'Ein Auto fährt doppelt so schnell. Wie lang braucht es für dieselbe Strecke?', options: ['halb so lange', 'doppelt so lange', 'gleich lange', 'viermal so lange'], answer: 0, why: 'Doppelte Geschwindigkeit heißt halbe Zeit.' },
  ] },
  { id: 'phy-rho', subject: 'physik', title: 'Dichte', formula: 'ρ = m : V', text: 'Masse, Volumen und Dichte', make: dichte, quiz: [
    { q: 'Was passiert mit einem Körper, dessen Dichte kleiner ist als die von Wasser (1 g/cm³)?', options: ['Er schwimmt', 'Er sinkt', 'Er löst sich auf', 'Er schwebt immer'], answer: 0 },
    { q: 'Welche Einheit hat die Dichte?', options: ['g/cm³', 'cm³', 'N/m²', 'kg·m'], answer: 0 },
  ] },
  { id: 'phy-p', subject: 'physik', title: 'Druck', formula: 'p = F : A', text: 'Kraft, Fläche und Druck', make: druck, quiz: [
    { q: 'Warum drückt ein spitzer Nagel stärker als ein stumpfer?', options: ['Kleine Fläche, größerer Druck', 'Er ist schwerer', 'Er ist härter', 'Er ist länger'], answer: 0 },
    { q: 'Welche Einheit hat der Druck?', options: ['Pa', 'N', 'W', 'V'], answer: 0, why: '1 Pa = 1 N/m²' },
  ] },
  { id: 'phy-w', subject: 'physik', title: 'Arbeit und Leistung', formula: 'W = F · s, P = W : t', text: 'Arbeit in Joule, Leistung in Watt', make: arbeit, quiz: [
    { q: 'Welche Einheit hat die Arbeit?', options: ['J', 'W', 'N', 'Pa'], answer: 0 },
    { q: 'Was beschreibt die Leistung?', options: ['Arbeit pro Zeit', 'Kraft mal Weg', 'Masse pro Volumen', 'Weg pro Zeit'], answer: 0 },
  ] },
  { id: 'phy-g', subject: 'physik', title: 'Gewichtskraft', formula: 'F = m · g', text: 'Masse und Gewichtskraft', make: gewichtskraft, quiz: [
    { q: 'Wie groß ist g ungefähr auf der Erde?', options: ['10 N/kg', '1 N/kg', '100 N/kg', '0 N/kg'], answer: 0 },
  ] },
  { id: 'phy-hebel', subject: 'physik', title: 'Hebelgesetz', formula: 'F₁ · l₁ = F₂ · l₂', text: 'Kräfte und Abstände am Hebel', make: hebel, quiz: [
    { q: 'Wie kann man mit weniger Kraft dieselbe Last heben?', options: ['Längerer Hebelarm', 'Kürzerer Hebelarm', 'Schwerere Last', 'Es geht nicht'], answer: 0 },
  ] },
  { id: 'phy-u', subject: 'physik', title: 'Ohmsches Gesetz', formula: 'U = R · I', text: 'Spannung, Stromstärke, Widerstand', make: ohm, quiz: [
    { q: 'Welche Einheit hat der elektrische Widerstand?', options: ['Ω', 'V', 'A', 'W'], answer: 0 },
    { q: 'Was passiert mit der Stromstärke, wenn der Widerstand bei gleicher Spannung größer wird?', options: ['Sie sinkt', 'Sie steigt', 'Sie bleibt gleich', 'Sie wird negativ'], answer: 0 },
  ] },
  { id: 'phy-pel', subject: 'physik', title: 'Elektrische Leistung', formula: 'P = U · I, E = P · t', text: 'Leistung und Energie von Geräten', make: elektrischeLeistung, quiz: [
    { q: 'Was misst die Einheit kWh?', options: ['Energie', 'Leistung', 'Spannung', 'Strom'], answer: 0 },
  ] },
  { id: 'che-n', subject: 'chemie', title: 'Stoffmenge', formula: 'n = m : M', text: 'Masse, Stoffmenge und molare Masse', make: stoffmenge, quiz: [
    { q: 'Welche Einheit hat die Stoffmenge?', options: ['mol', 'g', 'L', 'Pa'], answer: 0 },
    { q: 'Welche Einheit hat die molare Masse M?', options: ['g/mol', 'mol/g', 'g', 'mol'], answer: 0 },
  ] },
  { id: 'che-w', subject: 'chemie', title: 'Massenanteil', formula: 'w = m(Stoff) : m(Lösung)', text: 'Konzentration einer Lösung in Prozent', make: massenanteil, quiz: [
    { q: 'Was beschreibt der Massenanteil?', options: ['Anteil des gelösten Stoffs an der Lösung', 'Volumen der Lösung', 'Temperatur der Lösung', 'Dichte des Lösungsmittels'], answer: 0 },
  ] },
  { id: 'mat-p', subject: 'mathe', title: 'Prozentrechnung', formula: 'W = G · p : 100', text: 'Prozentwert, Grundwert, Prozentsatz', make: prozent, quiz: [
    { q: 'Was ist der Grundwert?', options: ['Das Ganze (100 %)', 'Der Teil', 'Der Prozentsatz', 'Die Differenz'], answer: 0 },
  ] },
  { id: 'mat-d', subject: 'mathe', title: 'Dreisatz', formula: 'erst auf 1, dann auf die gesuchte Anzahl', text: 'Proportionale Zuordnungen', make: dreisatz, quiz: [
    { q: 'Wenn doppelt so viele Hefte gekauft werden, kostet es …', options: ['doppelt so viel', 'halb so viel', 'gleich viel', 'viermal so viel'], answer: 0, why: 'Bei einer proportionalen Zuordnung wächst der Preis mit der Anzahl.' },
  ] },
]

export const skillsOf = (subject: string): FormulaSkill[] => FORMULA_SKILLS.filter((s) => s.subject === subject)
export const formulaSkill = (id: string): FormulaSkill | undefined => FORMULA_SKILLS.find((s) => s.id === id)

/** Eine fertig geprüfte Rechenaufgabe zum Thema (mit Rechenweg). Misslingt etwas, wird neu gewürfelt. */
export function makeFormulaTask(skill: FormulaSkill, rng: () => number = Math.random): Task {
  for (let i = 0; i < 12; i++) {
    const d = skill.make(rng)
    const raw = { t: 'calc', q: d.q, expr: d.expr, unit: d.unit, ...(d.digits !== undefined ? { digits: d.digits } : {}) }
    const task = normalizeTask(raw)
    if (!task || task.t !== 'calc') continue
    const c = computeTask(task)
    if (!c) continue
    const result = calc(d.expr)
    return { ...task, why: `${d.line}  →  ${pretty(d.expr)} = ${formatNumber(result.value, 4)}${d.unit ? ` ${d.unit}` : ''}` }
  }
  // Notfall (kommt praktisch nie vor): feste Aufgabe
  return { t: 'calc', q: 'Berechne 12 · 3.', expr: '12*3', why: '12 · 3 = 36' }
}

/** Ein Durchgang: etwa 8 Rechenaufgaben und 2 Wissensfragen, gemischt. */
export function makeFormulaSession(skill: FormulaSkill, count = 10, rng: () => number = Math.random): Task[] {
  const out: Task[] = []
  const seen = new Set<string>()
  for (let guard = 0; out.length < Math.max(1, count - Math.min(2, skill.quiz.length)) && guard < 80; guard++) {
    const t = makeFormulaTask(skill, rng)
    const key = (t as { q: string }).q
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  for (const q of [...skill.quiz].sort(() => rng() - 0.5).slice(0, 2)) {
    const t = normalizeTask({ t: 'mc', ...q })
    if (t) out.push(t)
  }
  // Mischen, ohne die Reihenfolge der Quizfragen zu verraten
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
