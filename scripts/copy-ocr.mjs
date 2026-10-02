// Kopiert die Texterkennung (Tesseract-Worker, WASM-Kern, Sprachdaten) nach public/ocr,
// damit die App sie selbst ausliefert: kein CDN, keine IP-Weitergabe an Dritte, funktioniert offline.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nm = join(root, 'node_modules')
const out = join(root, 'public', 'ocr')
mkdirSync(join(out, 'lang'), { recursive: true })

const files = [
  [join(nm, 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js')],
  ...['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm'].map((n) => [
    join(nm, 'tesseract.js-core', `${n}.wasm.js`),
    join(out, `${n}.wasm.js`),
  ]),
  ...['fra', 'deu'].map((l) => [
    join(nm, '@tesseract.js-data', l, '4.0.0_best_int', `${l}.traineddata.gz`),
    join(out, 'lang', `${l}.traineddata.gz`),
  ]),
]

for (const [from, to] of files) {
  if (!existsSync(from)) {
    console.error(`OCR-Datei fehlt: ${from}`)
    process.exit(1)
  }
  copyFileSync(from, to)
}
console.log(`OCR-Dateien nach ${out} kopiert (${files.length})`)
