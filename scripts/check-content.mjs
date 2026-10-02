// Automatische Plausibilitätsprüfung der Kursinhalte (ersetzt kein Gegenlesen, findet aber typische Fehler).
//   node scripts/check-content.mjs [klasse-7 klasse-8 …]
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'src/content/french'
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(ROOT)
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'")
const problems = []
const seenInUnit = new Map()

for (const dir of dirs) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith('.json'))) {
    const u = JSON.parse(fs.readFileSync(path.join(ROOT, dir, f), 'utf8'))
    const fronts = new Map()
    for (const l of u.lessons) {
      for (const it of l.items) {
        const where = `${u.id}/${l.id} "${it.front}"`
        // 1) Kommt das Wort im Beispielsatz vor? (Stammvergleich, damit Beugung nicht stört)
        const head = norm(it.front).replace(/\(.*?\)/g, ' ').split(/ \/ |\//)[0].replace(/[…?!]/g, ' ').replace(/\b(le|la|l'|les|un|une|des|du|de la|de l'|d')\s*/g, '').trim()
        const tokens = head.split(/\s+/).filter((t) => t.length >= 3)
        const ex = norm(it.example)
        const stems = tokens.map((t) => t.slice(0, Math.max(3, Math.min(t.length - 2, 5))))
        const hit = tokens.length === 0 || stems.some((s) => ex.includes(s))
        if (!hit) problems.push(`Beispiel enthält das Wort nicht: ${where} → ${it.example}`)
        // 2) Doppelte Wörter in der Einheit
        const key = norm(it.front)
        if (fronts.has(key)) problems.push(`doppelt in der Einheit: ${where} (auch in ${fronts.get(key)})`)
        else fronts.set(key, l.id)
        // 3) Leere oder unverhältnismäßig kurze Übersetzungen
        if (it.back.length < 2 || it.exampleDe.length < 6) problems.push(`Übersetzung zu kurz: ${where}`)
        // 4) Beispielsatz endet mit Satzzeichen
        if (!/[.!?»]$/.test(it.example.trim())) problems.push(`Beispielsatz ohne Satzzeichen am Ende: ${where} → ${it.example}`)
      }
      for (const fl of l.fills ?? []) {
        const w = `${u.id}/${l.id} Lücke "${fl.sentence}"`
        if (!fl.options.includes(fl.answer)) problems.push(`Antwort fehlt in Optionen: ${w}`)
        if (new Set(fl.options.map(norm)).size !== fl.options.length) problems.push(`doppelte Optionen: ${w}`)
        if ((fl.sentence.match(/___/g) ?? []).length !== 1) problems.push(`Lückensatz braucht genau eine Lücke: ${w}`)
        if (/\(/.test(fl.sentence)) problems.push(`Klammer im Lückensatz: ${w}`)
        if (fl.options.length < 3) problems.push(`weniger als 3 Optionen: ${w}`)
      }
    }
    seenInUnit.set(u.id, fronts.size)
  }
}
console.log(problems.length ? problems.join('\n') : 'Keine Auffälligkeiten.')
console.log(`\n${problems.length} Hinweis(e) in ${seenInUnit.size} Einheiten`)
