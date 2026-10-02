// Einmalig: wandelt die von Hand gepflegten JSON-Einheiten einer Klasse in lesbare Quelltexte (content-src/klasse-N/*.txt) um,
// damit sie wie Klasse 7 und 8 mit scripts/build-content.mjs gebaut werden können.
//   node scripts/json-to-dsl.mjs 9
import fs from 'node:fs'
import path from 'node:path'

const grade = Number(process.argv[2])
if (!grade) throw new Error('Aufruf: node scripts/json-to-dsl.mjs <klasse>')
const src = path.join('src/content/french', `klasse-${grade}`)
const out = path.join('content-src', `klasse-${grade}`)
fs.mkdirSync(out, { recursive: true })

const units = fs
  .readdirSync(src)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ f, u: JSON.parse(fs.readFileSync(path.join(src, f), 'utf8')) }))
  .sort((a, b) => (a.u.order ?? 999) - (b.u.order ?? 999) || a.f.localeCompare(b.f))

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

let n = 0
for (const { f, u } of units) {
  // Lektions-IDs müssen so bleiben, wie das Bauskript sie vergibt, sonst geht Lernfortschritt verloren
  u.lessons.forEach((l, i) => {
    if (l.id !== `${u.id}-l${i + 1}`) throw new Error(`${f}: Lektion ${l.id} würde zu ${u.id}-l${i + 1}`)
  })
  const order = u.order ?? Number(/unit-(\d+)/.exec(f)?.[1] ?? 99) * 10
  const lines = [`id: ${u.id}`, `title: ${u.title}`, ...(u.book ? [`book: ${u.book}`] : []), `desc: ${u.description}`, `order: ${order}`, '']
  for (const l of u.lessons) {
    lines.push(`= ${l.title}`)
    if (l.explanation) {
      const e = l.explanation
      lines.push(`? ${e.title}`)
      for (const p of e.paragraphs) lines.push(`p ${p}`)
      for (const ex of e.examples ?? []) lines.push(`e ${ex.fr} = ${ex.de}`)
      if (e.tip) lines.push(`t ${e.tip}`)
    }
    for (const it of l.items) lines.push(`- ${it.front} = ${it.back} | ${it.example} = ${it.exampleDe}${it.note ? ` | n: ${it.note}` : ''}`)
    for (const fl of l.fills ?? []) lines.push(`f ${fl.sentence} | ${fl.answer} | ${fl.options.join('; ')} | ${fl.translation ?? ''} | ${fl.why}`)
    lines.push('')
  }
  const name = `${String(order).padStart(2, '0')}-${slug(u.id.replace(/^f\d+-/, ''))}.txt`
  fs.writeFileSync(path.join(out, name), lines.join('\n'))
  n++
  console.log(name)
}
console.log(`${n} Einheiten nach ${out} geschrieben`)
