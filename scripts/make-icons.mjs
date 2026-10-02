// Erzeugt die App-Symbole (PNG) aus der Maskottchen-Zeichnung, ganz ohne Zusatzprogramme.
// Aufruf: node scripts/make-icons.mjs   → schreibt public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
// Die Geometrie entspricht public/favicon.svg (Fenni, der Fuchs); ein kleiner Rasterizer mit 4x4-Kantenglättung.
import fs from 'node:fs'
import zlib from 'node:zlib'

const rgb = (hex, a = 1) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a })
const ORANGE = rgb('#ff8a2a')
const DARK = rgb('#3b2a1a')
const WHITE = rgb('#ffffff')
const CREAM = rgb('#fff1e5')

/** Pfad-Text (M, L, C, q, Z) in Punktliste umwandeln. */
function flatten(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g)
  let i = 0
  let cmd = ''
  let cx = 0
  let cy = 0
  const pts = []
  const num = () => parseFloat(tokens[i++])
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    if (cmd === 'Z' || cmd === 'z') {
      cmd = ''
      continue
    }
    if (cmd === 'M' || cmd === 'L') {
      cx = num()
      cy = num()
      pts.push([cx, cy])
      cmd = 'L'
    } else if (cmd === 'C') {
      const [x1, y1, x2, y2, x, y] = [num(), num(), num(), num(), num(), num()]
      for (let k = 1; k <= 24; k++) {
        const t = k / 24
        const u = 1 - t
        pts.push([u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y])
      }
      cx = x
      cy = y
    } else if (cmd === 'q') {
      const [dx1, dy1, dx, dy] = [num(), num(), num(), num()]
      const [x1, y1, x, y] = [cx + dx1, cy + dy1, cx + dx, cy + dy]
      for (let k = 1; k <= 16; k++) {
        const t = k / 16
        const u = 1 - t
        pts.push([u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y])
      }
      cx = x
      cy = y
    } else {
      throw new Error('Pfadbefehl nicht unterstützt: ' + cmd)
    }
  }
  return pts
}

const ellipse = (cx, cy, rx, ry) => {
  const pts = []
  for (let k = 0; k < 48; k++) pts.push([cx + rx * Math.cos((k / 48) * Math.PI * 2), cy + ry * Math.sin((k / 48) * Math.PI * 2)])
  return pts
}

/** Alle Formen der Maskottchen-Zeichnung (Koordinaten im Raster 0..120). */
const MASCOT = [
  { pts: flatten('M18 14 L44 36 L22 52 Z'), color: ORANGE },
  { pts: flatten('M102 14 L76 36 L98 52 Z'), color: ORANGE },
  { pts: flatten('M24 26 L38 38 L26 46 Z'), color: { ...DARK, a: 0.85 } },
  { pts: flatten('M96 26 L82 38 L94 46 Z'), color: { ...DARK, a: 0.85 } },
  { pts: flatten('M12 58 C12 36 34 26 60 26 C86 26 108 36 108 58 C108 86 86 104 60 104 C34 104 12 86 12 58 Z'), color: ORANGE },
  { pts: flatten('M12 64 C26 60 38 66 48 80 C54 88 66 88 72 80 C82 66 94 60 108 64 C106 88 86 104 60 104 C34 104 14 88 12 64 Z'), color: WHITE },
  { pts: ellipse(40, 54, 6, 7.5), color: DARK },
  { pts: ellipse(80, 54, 6, 7.5), color: DARK },
  { pts: ellipse(42, 51, 2.2, 2.2), color: WHITE },
  { pts: ellipse(82, 51, 2.2, 2.2), color: WHITE },
  { pts: ellipse(60, 76, 7, 5), color: DARK },
  { pts: ellipse(26, 72, 5, 5), color: rgb('#ff9aa2', 0.6) },
  { pts: ellipse(94, 72, 5, 5), color: rgb('#ff9aa2', 0.6) },
  { stroke: flatten('M50 84 q10 10 20 0'), width: 3.5, color: DARK },
]

function inside(pts, x, y) {
  let w = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    const cross = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1)
    if (y1 <= y) {
      if (y2 > y && cross > 0) w++
    } else if (y2 <= y && cross < 0) w--
  }
  return w !== 0
}

function nearStroke(pts, x, y, half) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const dx = x2 - x1
    const dy = y2 - y1
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)))
    if (Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= half) return true
  }
  return false
}

/** Ein Pixel: Hintergrund, dann alle Formen übereinander (Rundum-Glättung über SS x SS Messpunkte). */
function render(size, { radius, tx, ty, scale }) {
  const SS = 4
  const buf = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let R = 0
      let G = 0
      let B = 0
      let A = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = ((px + (sx + 0.5) / SS) / size) * 120
          const dy = ((py + (sy + 0.5) / SS) / size) * 120
          // Hintergrund (abgerundetes Quadrat)
          let inBg = true
          if (radius > 0) {
            const qx = Math.max(radius - dx, 0, dx - (120 - radius))
            const qy = Math.max(radius - dy, 0, dy - (120 - radius))
            inBg = qx * qx + qy * qy <= radius * radius
          }
          if (!inBg) continue
          let r = CREAM.r
          let g = CREAM.g
          let b = CREAM.b
          const lx = (dx - tx) / scale
          const ly = (dy - ty) / scale
          for (const s of MASCOT) {
            const hit = s.pts ? inside(s.pts, lx, ly) : nearStroke(s.stroke, lx, ly, s.width / 2)
            if (!hit) continue
            const a = s.color.a
            r = r * (1 - a) + s.color.r * a
            g = g * (1 - a) + s.color.g * a
            b = b * (1 - a) + s.color.b * a
          }
          R += r
          G += g
          B += b
          A += 1
        }
      }
      const o = (py * size + px) * 4
      const n = SS * SS
      buf[o] = A ? Math.round(R / A) : 0
      buf[o + 1] = A ? Math.round(G / A) : 0
      buf[o + 2] = A ? Math.round(B / A) : 0
      buf[o + 3] = Math.round((A / n) * 255)
    }
  }
  return buf
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // Bittiefe
  ihdr[9] = 6 // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const ROUND = { radius: 28, tx: 9, ty: 11, scale: 0.85 }
const MASKABLE = { radius: 0, tx: 23, ty: 23.5, scale: 0.62 } // Fuchs in der "sicheren Zone", Android schneidet den Rand beliebig zu
const FULL = { radius: 0, tx: 9, ty: 11, scale: 0.85 }

const jobs = [
  ['public/icon-192.png', 192, ROUND],
  ['public/icon-512.png', 512, ROUND],
  ['public/icon-maskable-512.png', 512, MASKABLE],
  ['public/apple-touch-icon.png', 180, FULL],
]
for (const [file, size, cfg] of jobs) {
  fs.writeFileSync(file, png(size, render(size, cfg)))
  console.log('geschrieben:', file, `${size}x${size}`)
}
