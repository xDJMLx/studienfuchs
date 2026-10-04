import { choice, numeric, type Level } from '../core'
import { num, round } from '../fmt'
import { defineSkill } from '../registry'

const by = <T,>(level: Level, a: T, b: T, c: T): T => (level === 1 ? a : level === 2 ? b : c)

// ---------- Winkel an Geraden ----------
defineSkill('ge.winkel', 'Winkel an Geraden', 'Nebenwinkel, Scheitelwinkel, Stufen- und Wechselwinkel.', (r, level, form) => {
  if (r.chance(0.25)) {
    const q = r.pick([
      { text: 'Welche Winkel ergänzen sich zu 180°?', answer: 'Nebenwinkel', why: 'Nebenwinkel liegen nebeneinander an einer Geraden und ergeben zusammen 180°.' },
      { text: 'Zwei Geraden schneiden sich. Wie heißen die Winkel, die sich gegenüberliegen und gleich groß sind?', answer: 'Scheitelwinkel', why: 'Scheitelwinkel liegen sich am Schnittpunkt gegenüber und sind gleich groß.' },
      { text: 'Zwei parallele Geraden werden von einer dritten geschnitten. Winkel auf derselben Seite der Geraden an gleicher Stelle sind …', answer: 'Stufenwinkel', why: 'Stufenwinkel an parallelen Geraden sind gleich groß.' },
    ])
    return choice({ title: 'Winkel benennen', prompt: q.text, answer: q.answer, wrong: ['Nebenwinkel', 'Scheitelwinkel', 'Stufenwinkel', 'Wechselwinkel'], hint: 'Denke an die Bilder: Nebenwinkel liegen nebeneinander, Scheitelwinkel gegenüber.', solution: q.why }, r)
  }
  const a = r.pick([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155])
  const k = r.int(0, by(level, 1, 3, 3))
  const kinds = [
    { name: 'Nebenwinkel', text: `Zwei Geraden schneiden sich. Ein Winkel beträgt ${a}°. Wie groß ist sein Nebenwinkel?`, v: 180 - a, hint: 'Nebenwinkel ergeben zusammen 180°.', sol: `180° − ${a}° = ${180 - a}°` },
    { name: 'Scheitelwinkel', text: `Zwei Geraden schneiden sich. Ein Winkel beträgt ${a}°. Wie groß ist sein Scheitelwinkel?`, v: a, hint: 'Scheitelwinkel sind gleich groß.', sol: `Scheitelwinkel sind gleich: ${a}°` },
    { name: 'Stufenwinkel', text: `Zwei parallele Geraden werden von einer dritten geschnitten. Ein Winkel beträgt ${a}°. Wie groß ist der Stufenwinkel?`, v: a, hint: 'An parallelen Geraden sind Stufenwinkel gleich groß.', sol: `Stufenwinkel an parallelen Geraden sind gleich: ${a}°` },
    { name: 'Wechselwinkel', text: `Zwei parallele Geraden werden von einer dritten geschnitten. Ein Winkel beträgt ${a}°. Wie groß ist der Wechselwinkel?`, v: a, hint: 'An parallelen Geraden sind Wechselwinkel gleich groß.', sol: `Wechselwinkel an parallelen Geraden sind gleich: ${a}°` },
  ]
  const q = kinds[k]
  return numeric({ title: q.name, prompt: q.text, value: q.v, unit: '°', wrong: [180 - q.v, 90 - (q.v % 90), q.v + 10, 360 - q.v], hint: q.hint, solution: q.sol }, r, level, form)
})

// ---------- Winkel im Dreieck und Viereck ----------
defineSkill('ge.dreieck', 'Winkelsumme im Dreieck', 'Im Dreieck ergeben die Winkel zusammen 180°.', (r, level, form) => {
  const k = level === 1 ? r.int(0, 1) : r.int(0, 3)
  if (k === 0) {
    const a = r.int(25, 85)
    const b = r.int(25, 85)
    const g = 180 - a - b
    if (g < 15) return numeric({ title: 'Dreieck', prompt: 'In einem Dreieck sind α = 60° und β = 60°. Wie groß ist γ?', value: 60, unit: '°', hint: 'Winkelsumme 180°.', solution: '180° − 60° − 60° = 60°' }, r, level, form)
    return numeric({ title: 'Dreieck', prompt: `In einem Dreieck sind α = ${a}° und β = ${b}°. Wie groß ist γ?`, value: g, unit: '°', wrong: [a + b, 360 - a - b, 90 - a], hint: 'Die Winkel eines Dreiecks ergeben zusammen 180°.', solution: `180° − ${a}° − ${b}° = ${g}°` }, r, level, form)
  }
  if (k === 1) {
    const a = r.int(20, 70)
    return numeric({ title: 'Rechtwinkliges Dreieck', prompt: `In einem rechtwinkligen Dreieck ist ein spitzer Winkel ${a}° groß. Wie groß ist der andere spitze Winkel?`, value: 90 - a, unit: '°', wrong: [180 - a, 90 + a, a], hint: 'Ein Winkel ist 90°. Die beiden anderen ergeben zusammen 90°.', solution: `180° − 90° − ${a}° = ${90 - a}°` }, r, level, form)
  }
  if (k === 2) {
    const spitze = r.pick([20, 30, 40, 50, 60, 70, 80, 100, 110, 120])
    const base = (180 - spitze) / 2
    if (r.chance(0.5)) return numeric({ title: 'Gleichschenkliges Dreieck', prompt: `Ein gleichschenkliges Dreieck hat an der Spitze einen Winkel von ${spitze}°. Wie groß ist jeder Basiswinkel?`, value: base, unit: '°', wrong: [180 - spitze, spitze / 2, 90 - spitze], hint: 'Die Basiswinkel sind gleich groß. Ziehe die Spitze von 180° ab und teile durch 2.', solution: `(180° − ${spitze}°) : 2 = ${base}°` }, r, level, form)
    return numeric({ title: 'Gleichschenkliges Dreieck', prompt: `Ein gleichschenkliges Dreieck hat Basiswinkel von je ${base}°. Wie groß ist der Winkel an der Spitze?`, value: spitze, unit: '°', wrong: [180 - base, 90 - base, base * 2], hint: 'Zwei Basiswinkel zusammen, der Rest bis 180° ist die Spitze.', solution: `180° − 2 · ${base}° = ${spitze}°` }, r, level, form)
  }
  const a = r.int(60, 120)
  const b = r.int(60, 110)
  const c = r.int(50, 110)
  const d = 360 - a - b - c
  if (d < 30 || d > 150) return numeric({ title: 'Viereck', prompt: 'Ein Viereck hat die Winkel 90°, 90° und 90°. Wie groß ist der vierte Winkel?', value: 90, unit: '°', hint: 'Die Winkel eines Vierecks ergeben zusammen 360°.', solution: '360° − 270° = 90°' }, r, level, form)
  return numeric({ title: 'Viereck', prompt: `Ein Viereck hat die Winkel ${a}°, ${b}° und ${c}°. Wie groß ist der vierte Winkel?`, value: d, unit: '°', wrong: [180 - a - b - c, 360 - a - b, a + b + c - 180], hint: 'Die Winkel eines Vierecks ergeben zusammen 360°.', solution: `360° − ${a}° − ${b}° − ${c}° = ${d}°` }, r, level, form)
})

// ---------- Fläche ----------
defineSkill('ge.flaeche', 'Flächeninhalt', 'Rechteck, Dreieck, Parallelogramm und Trapez.', (r, level, form) => {
  const k = level === 1 ? r.int(0, 1) : r.int(0, 4)
  if (k === 0) {
    const a = r.int(3, by(level, 12, 20, 25))
    const b = r.int(2, by(level, 10, 15, 20))
    return numeric({ title: 'Rechteck', prompt: `Ein Rechteck ist ${a} cm lang und ${b} cm breit. Wie groß ist sein Flächeninhalt?`, value: a * b, unit: 'cm²', wrong: [2 * (a + b), a + b, a * b * 2], hint: 'Fläche des Rechtecks: Länge mal Breite.', solution: `${a} · ${b} = ${a * b} cm²` }, r, level, form)
  }
  if (k === 1) {
    const a = r.int(3, by(level, 12, 15, 20))
    return numeric({ title: 'Quadrat', prompt: `Ein Quadrat hat die Seitenlänge ${a} cm. Wie groß ist sein Flächeninhalt?`, value: a * a, unit: 'cm²', wrong: [4 * a, 2 * a, a * a * 2], hint: 'Fläche des Quadrats: Seite mal Seite.', solution: `${a} · ${a} = ${a * a} cm²` }, r, level, form)
  }
  if (k === 2) {
    const g = r.int(3, 16)
    const h = r.int(2, 12)
    const v = (g * h) / 2
    return numeric({ title: 'Dreieck', prompt: `Ein Dreieck hat die Grundseite ${g} cm und die Höhe ${h} cm. Wie groß ist sein Flächeninhalt?`, value: v, unit: 'cm²', wrong: [g * h, g + h, (g * h) / 4], hint: 'Fläche des Dreiecks: Grundseite mal Höhe, durch 2.', solution: `${g} · ${h} : 2 = ${num(v)} cm²` }, r, level, form)
  }
  if (k === 3) {
    const g = r.int(3, 15)
    const h = r.int(2, 12)
    return numeric({ title: 'Parallelogramm', prompt: `Ein Parallelogramm hat die Grundseite ${g} cm und die Höhe ${h} cm. Wie groß ist sein Flächeninhalt?`, value: g * h, unit: 'cm²', wrong: [(g * h) / 2, 2 * (g + h), g + h], hint: 'Fläche des Parallelogramms: Grundseite mal Höhe (nicht die schräge Seite).', solution: `${g} · ${h} = ${g * h} cm²` }, r, level, form)
  }
  const a = r.int(4, 14)
  const c = r.int(2, 12)
  const h = (a + c) % 2 === 0 ? r.int(2, 10) : 2 * r.int(1, 6)
  const v = ((a + c) * h) / 2
  return numeric({ title: 'Trapez', prompt: `Ein Trapez hat die parallelen Seiten ${a} cm und ${c} cm und die Höhe ${h} cm. Wie groß ist sein Flächeninhalt?`, value: v, unit: 'cm²', wrong: [(a + c) * h, a * h, ((a + c) * h) / 4], hint: 'Fläche des Trapezes: Summe der parallelen Seiten, mal Höhe, durch 2.', solution: `(${a} + ${c}) · ${h} : 2 = ${num(v)} cm²` }, r, level, form)
})

// ---------- Umfang ----------
defineSkill('ge.umfang', 'Umfang', 'Wie lang ist der Rand einer Figur?', (r, level, form) => {
  const k = level === 1 ? r.int(0, 1) : r.int(0, 3)
  if (k === 0) {
    const a = r.int(3, 20)
    const b = r.int(2, 15)
    return numeric({ title: 'Rechteck', prompt: `Ein Rechteck ist ${a} cm lang und ${b} cm breit. Wie groß ist sein Umfang?`, value: 2 * (a + b), unit: 'cm', wrong: [a * b, a + b, 2 * a * b], hint: 'Umfang des Rechtecks: 2 · (Länge + Breite).', solution: `2 · (${a} + ${b}) = ${2 * (a + b)} cm` }, r, level, form)
  }
  if (k === 1) {
    const a = r.int(3, 20)
    return numeric({ title: 'Quadrat', prompt: `Ein Quadrat hat die Seitenlänge ${a} cm. Wie groß ist sein Umfang?`, value: 4 * a, unit: 'cm', wrong: [a * a, 2 * a, 3 * a], hint: 'Ein Quadrat hat vier gleich lange Seiten.', solution: `4 · ${a} = ${4 * a} cm` }, r, level, form)
  }
  if (k === 2) {
    const a = r.int(3, 12)
    const b = r.int(3, 12)
    const c = r.int(Math.abs(a - b) + 1, a + b - 1)
    return numeric({ title: 'Dreieck', prompt: `Ein Dreieck hat die Seiten ${a} cm, ${b} cm und ${c} cm. Wie groß ist sein Umfang?`, value: a + b + c, unit: 'cm', wrong: [(a + b + c) / 2, a * b, 2 * (a + b)], hint: 'Der Umfang ist die Summe aller Seiten.', solution: `${a} + ${b} + ${c} = ${a + b + c} cm` }, r, level, form)
  }
  const a = r.int(4, 14)
  const b = r.int(3, 12)
  return numeric({ title: 'Seite gesucht', prompt: `Ein Rechteck hat den Umfang ${2 * (a + b)} cm. Eine Seite ist ${a} cm lang. Wie lang ist die andere Seite?`, value: b, unit: 'cm', wrong: [a + b, 2 * (a + b) - a, (2 * (a + b)) / 2], hint: 'Zwei Seiten zusammen sind der halbe Umfang. Ziehe die bekannte Seite davon ab.', solution: `Halber Umfang: ${a + b} cm. ${a + b} − ${a} = ${b} cm` }, r, level, form)
})

// ---------- Volumen und Oberfläche ----------
defineSkill('ge.volumen', 'Volumen und Oberfläche', 'Quader und Würfel: wie viel passt hinein, wie groß ist die Hülle?', (r, level, form) => {
  const k = level === 1 ? r.int(0, 1) : r.int(0, 4)
  if (k === 0) {
    const a = r.int(2, 9)
    const b = r.int(2, 8)
    const c = r.int(2, 7)
    return numeric({ title: 'Quader', prompt: `Ein Quader ist ${a} cm lang, ${b} cm breit und ${c} cm hoch. Wie groß ist sein Volumen?`, value: a * b * c, unit: 'cm³', wrong: [a + b + c, a * b, 2 * (a * b + a * c + b * c)], hint: 'Volumen des Quaders: Länge mal Breite mal Höhe.', solution: `${a} · ${b} · ${c} = ${a * b * c} cm³` }, r, level, form)
  }
  if (k === 1) {
    const a = r.int(2, by(level, 7, 10, 12))
    return numeric({ title: 'Würfel', prompt: `Ein Würfel hat die Kantenlänge ${a} cm. Wie groß ist sein Volumen?`, value: a ** 3, unit: 'cm³', wrong: [a * a, 3 * a, 6 * a * a], hint: 'Volumen des Würfels: Kante mal Kante mal Kante.', solution: `${a} · ${a} · ${a} = ${a ** 3} cm³` }, r, level, form)
  }
  if (k === 2) {
    const a = r.int(2, 9)
    return numeric({ title: 'Oberfläche Würfel', prompt: `Ein Würfel hat die Kantenlänge ${a} cm. Wie groß ist seine Oberfläche?`, value: 6 * a * a, unit: 'cm²', wrong: [a ** 3, 4 * a * a, 12 * a], hint: 'Ein Würfel hat sechs gleich große quadratische Flächen.', solution: `6 · ${a} · ${a} = ${6 * a * a} cm²` }, r, level, form)
  }
  if (k === 3) {
    const [a, b, h] = [r.pick([30, 40, 50, 60]), r.pick([20, 30, 40]), r.pick([20, 30, 40, 50])]
    const liters = (a * b * h) / 1000
    return numeric({ title: 'Liter', prompt: `Ein Aquarium ist ${a} cm lang, ${b} cm breit und ${h} cm hoch. Wie viele Liter passen hinein? (1 Liter = 1000 cm³)`, value: liters, unit: 'l', wrong: [a * b * h, liters * 10, liters / 10], hint: 'Erst das Volumen in cm³, dann durch 1000 teilen.', solution: `${a} · ${b} · ${h} = ${a * b * h} cm³ = ${num(liters)} l` }, r, level, form)
  }
  const a = r.int(2, 8)
  const b = r.int(2, 7)
  const c = r.int(2, 6)
  return numeric({ title: 'Oberfläche Quader', prompt: `Ein Quader ist ${a} cm lang, ${b} cm breit und ${c} cm hoch. Wie groß ist seine Oberfläche?`, value: 2 * (a * b + a * c + b * c), unit: 'cm²', wrong: [a * b * c, a * b + a * c + b * c, 2 * (a + b + c)], hint: 'Je zwei gleiche Flächen: unten/oben, vorn/hinten, links/rechts.', solution: `2 · (${a}·${b} + ${a}·${c} + ${b}·${c}) = ${2 * (a * b + a * c + b * c)} cm²` }, r, level, form)
})

// ---------- Einheiten umrechnen ----------
defineSkill('ge.einheiten', 'Einheiten umrechnen', 'Länge, Gewicht, Rauminhalt und Fläche.', (r, level, form) => {
  type Conv = { text: string; v: number; unit: string; hint: string }
  const L1: (() => Conv)[] = [
    () => { const x = r.int(2, 9); return { text: `${x} km in m`, v: x * 1000, unit: 'm', hint: '1 km = 1000 m' } },
    () => { const x = r.int(2, 9); return { text: `${x} m in cm`, v: x * 100, unit: 'cm', hint: '1 m = 100 cm' } },
    () => { const x = r.int(2, 9); return { text: `${x} kg in g`, v: x * 1000, unit: 'g', hint: '1 kg = 1000 g' } },
    () => { const x = r.int(2, 9); return { text: `${x} l in ml`, v: x * 1000, unit: 'ml', hint: '1 l = 1000 ml' } },
    () => { const x = r.int(2, 9); return { text: `${x * 100} cm in m`, v: x, unit: 'm', hint: '100 cm = 1 m' } },
  ]
  const L2: (() => Conv)[] = [
    () => { const x = r.int(11, 99) / 10; return { text: `${num(x)} km in m`, v: round(x * 1000), unit: 'm', hint: '1 km = 1000 m: Komma 3 Stellen nach rechts.' } },
    () => { const x = r.int(2, 9) * 50; return { text: `${x} g in kg`, v: x / 1000, unit: 'kg', hint: '1000 g = 1 kg: Komma 3 Stellen nach links.' } },
    () => { const x = r.int(1, 9) * 25; return { text: `${x} ml in l`, v: x / 1000, unit: 'l', hint: '1000 ml = 1 l.' } },
    () => { const x = r.int(11, 99); return { text: `${x} cm in m`, v: x / 100, unit: 'm', hint: '100 cm = 1 m: Komma 2 Stellen nach links.' } },
    () => { const x = r.int(11, 49) / 10; return { text: `${num(x)} m in cm`, v: round(x * 100), unit: 'cm', hint: '1 m = 100 cm.' } },
  ]
  const L3: (() => Conv)[] = [
    () => { const x = r.int(2, 9); return { text: `${x} m² in cm²`, v: x * 10000, unit: 'cm²', hint: '1 m² = 100 cm · 100 cm = 10 000 cm²' } },
    () => { const x = r.int(2, 9) * 10000; return { text: `${x} cm² in m²`, v: x / 10000, unit: 'm²', hint: '10 000 cm² = 1 m²' } },
    () => { const x = r.int(2, 9); return { text: `${x} ha in m²`, v: x * 10000, unit: 'm²', hint: '1 ha = 10 000 m²' } },
    () => { const x = r.int(2, 9); return { text: `${x} m³ in l`, v: x * 1000, unit: 'l', hint: '1 m³ = 1000 l' } },
    () => { const x = r.int(2, 9) * 500; return { text: `${x} cm³ in ml`, v: x, unit: 'ml', hint: '1 cm³ = 1 ml' } },
  ]
  const pool = by(level, L1, [...L1, ...L2], [...L2, ...L3])
  const c = r.pick(pool)()
  return numeric({ title: 'Umrechnen', prompt: `Rechne um: ${c.text}`, value: c.v, unit: c.unit, wrong: [c.v * 10, c.v / 10, c.v * 100, c.v / 100], hint: c.hint, solution: `${c.text} = ${num(c.v)} ${c.unit}` }, r, level, form)
})
