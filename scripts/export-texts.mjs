// Sammelt alle französischen Texte der Kurs-Inhalte, die vorgelesen werden können (Wörter, Beispielsätze, Lückensätze).
// Ausgabe: JSON { dateiname: sprechtext }, das scripts/generate_audio.py in Audiodateien umwandelt.
//   node scripts/export-texts.mjs audio-texts.json
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { audioKey, speechText } from '../src/lib/audioKey.ts'
import { fillSentence } from '../src/lib/fillSentence.ts'

const root = fileURLToPath(new URL('../src/content/french/', import.meta.url))
const out = process.argv[2] ?? 'audio-texts.json'

const texts = new Map()
const add = (t) => {
  if (!t || !/[a-zA-Zà-ÿ]/.test(t)) return
  const spoken = speechText(t)
  if (spoken) texts.set(audioKey(t), spoken)
}

for (const dir of readdirSync(root)) {
  for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith('.json'))) {
    const unit = JSON.parse(readFileSync(join(root, dir, file), 'utf8'))
    for (const lesson of unit.lessons) {
      for (const it of lesson.items) {
        const item = Array.isArray(it) ? { front: it[0], example: it[2] } : it
        add(item.front)
        add(item.example)
      }
      for (const e of lesson.explanation?.examples ?? []) add(e.fr)
      for (const f of lesson.fills ?? []) add(fillSentence(f.sentence, f.answer))
    }
  }
}

writeFileSync(out, JSON.stringify(Object.fromEntries(texts), null, 0))
console.log(`${texts.size} Texte nach ${out} geschrieben`)
