// Baut aus den lesbaren Quelltexten in content-src/ die JSON-Einheiten in src/content/french/klasse-N/.
//   node scripts/build-content.mjs
//
// Format einer Quelldatei (content-src/klasse-7/10-bienvenue.txt):
//   id: f7-u1
//   title: Bienvenue à Paris
//   book: À plus ! 1 · Unité 1
//   desc: Kurzbeschreibung
//   order: 10
//
//   = Titel der Lektion              (neue Lektion)
//   ? Titel der Erklärung            (optional, gehört zur Lektion)
//   p Absatz                         (Erklärtext, mehrfach möglich)
//   e französisch = deutsch          (Beispiel zur Erklärung)
//   t Merksatz                       (Tipp)
//   - wort = Bedeutung | Beispielsatz = Übersetzung | n: Merktipp   (Wort; "| n:" ist optional)
//   f Satz mit ___ | Antwort | Option1; Option2; Option3 | Übersetzung | Begründung   (Lückensatz)
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'content-src'
const OUT = 'src/content/french'

function parseFile(file, grade) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  const meta = {}
  let i = 0
  for (; i < lines.length && lines[i].trim() !== ''; i++) {
    const m = /^(\w+):\s*(.*)$/.exec(lines[i])
    if (!m) throw new Error(`${file}:${i + 1}: Kopfzeile erwartet`)
    meta[m[1]] = m[2].trim()
  }
  for (const k of ['id', 'title', 'desc', 'order']) if (!meta[k]) throw new Error(`${file}: "${k}:" fehlt`)
  const unit = { id: meta.id, title: meta.title, description: meta.desc, grade, subject: 'french', order: Number(meta.order), ...(meta.book ? { book: meta.book } : {}), lessons: [] }
  let lesson = null
  const need = (n, msg) => {
    if (!lesson) throw new Error(`${file}:${n}: ${msg} steht vor der ersten Lektion`)
    return lesson
  }
  for (; i < lines.length; i++) {
    const raw = lines[i].trim()
    const n = i + 1
    if (!raw || raw.startsWith('#')) continue
    const rest = raw.slice(2).trim()
    const tag = raw[0]
    if (tag === '=') {
      lesson = { id: `${unit.id}-l${unit.lessons.length + 1}`, title: raw.slice(1).trim(), items: [] }
      unit.lessons.push(lesson)
    } else if (tag === '?') {
      need(n, 'Erklärung').explanation = { title: raw.slice(1).trim(), paragraphs: [] }
    } else if (raw.startsWith('p ')) {
      const ex = need(n, 'Absatz').explanation
      if (!ex) throw new Error(`${file}:${n}: Absatz ohne Erklärung ("?")`)
      ex.paragraphs.push(rest)
    } else if (raw.startsWith('e ')) {
      const ex = need(n, 'Beispiel').explanation
      if (!ex) throw new Error(`${file}:${n}: Beispiel ohne Erklärung ("?")`)
      const [fr, de] = rest.split(' = ')
      if (!fr || !de) throw new Error(`${file}:${n}: "e französisch = deutsch" erwartet`)
      ;(ex.examples ??= []).push({ fr: fr.trim(), de: de.trim() })
    } else if (raw.startsWith('t ')) {
      const ex = need(n, 'Tipp').explanation
      if (!ex) throw new Error(`${file}:${n}: Tipp ohne Erklärung ("?")`)
      ex.tip = rest
    } else if (tag === '-') {
      const parts = raw.slice(1).split(' | ').map((s) => s.trim())
      const [front, back] = (parts[0] ?? '').split(' = ')
      const [example, exampleDe] = (parts[1] ?? '').split(' = ')
      if (!front || !back || !example || !exampleDe) throw new Error(`${file}:${n}: "- wort = bedeutung | satz = übersetzung" erwartet`)
      const item = { front: front.trim(), back: back.trim(), example: example.trim(), exampleDe: exampleDe.trim() }
      const note = parts.find((p, k) => k >= 2 && p.startsWith('n:'))
      if (note) item.note = note.slice(2).trim()
      need(n, 'Wort').items.push(item)
    } else if (raw.startsWith('f ')) {
      const [sentence, answer, options, translation, why] = rest.split(' | ').map((s) => s.trim())
      if (!sentence || !answer || !options || !why) throw new Error(`${file}:${n}: "f satz | antwort | optionen | übersetzung | begründung" erwartet`)
      const opts = options.split(';').map((s) => s.trim())
      if (!opts.includes(answer)) opts.push(answer)
      ;(need(n, 'Lückensatz').fills ??= []).push({ sentence, answer, options: opts, ...(translation ? { translation } : {}), why })
    } else {
      throw new Error(`${file}:${n}: Zeile nicht verständlich: ${raw.slice(0, 50)}`)
    }
  }
  return unit
}

let total = 0
for (const dir of fs.readdirSync(SRC).filter((d) => /^klasse-\d+$/.test(d))) {
  const grade = Number(dir.split('-')[1])
  const outDir = path.join(OUT, dir)
  fs.mkdirSync(outDir, { recursive: true })
  // Alte Dateien dieser Klasse entfernen: die Quelltexte sind ab jetzt die Wahrheit
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f))
  for (const f of fs.readdirSync(path.join(SRC, dir)).filter((x) => x.endsWith('.txt')).sort()) {
    const unit = parseFile(path.join(SRC, dir, f), grade)
    fs.writeFileSync(path.join(outDir, f.replace(/\.txt$/, '.json')), JSON.stringify(unit, null, 2) + '\n')
    const words = unit.lessons.reduce((n, l) => n + l.items.length, 0)
    total += words
    console.log(`${dir}/${f.padEnd(28)} ${String(unit.lessons.length).padStart(2)} Lektionen ${String(words).padStart(3)} Wörter`)
  }
}
console.log('Wörter gesamt (neu gebaute Klassen):', total)
