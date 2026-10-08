// Erzeugt die App-Symbole (PNG und favicon.svg) aus der Zeichnung des Fuchses, ganz ohne Zusatzprogramme.
// Aufruf: node scripts/make-icons.mjs   → schreibt public/favicon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
// Die Formen sind die des Fuchses aus der App (src/components/mascot/species.tsx, Koordinaten 200 x 240, Kopf um (100, 90)).
// Ein kleiner Rasterizer mit 4x4-Kantenglättung; Flächen können einen senkrechten Farbverlauf haben.
import fs from 'node:fs'
import zlib from 'node:zlib'

const rgb = (hex, a = 1) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a })
const mix = (c1, c2, t) => ({ r: c1.r + (c2.r - c1.r) * t, g: c1.g + (c2.g - c1.g) * t, b: c1.b + (c2.b - c1.b) * t, a: c1.a + (c2.a - c1.a) * t })

/** Pfad-Text (M, L, C, Q und die kleinen q) in Punktliste umwandeln. */
function flatten(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g)
  let i = 0
  let cmd = ''
  let cx = 0
  let cy = 0
  const pts = []
  const num = () => parseFloat(tokens[i++])
  const quad = (x1, y1, x, y) => {
    for (let k = 1; k <= 16; k++) {
      const t = k / 16
      const u = 1 - t
      pts.push([u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y])
    }
    cx = x
    cy = y
  }
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
    } else if (cmd === 'Q') {
      quad(num(), num(), num(), num())
    } else if (cmd === 'q') {
      const [dx1, dy1, dx, dy] = [num(), num(), num(), num()]
      quad(cx + dx1, cy + dy1, cx + dx, cy + dy)
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

const DARK = '#2e1a0d'
const ORANGE_TOP = '#ffac4d'
const ORANGE_BOT = '#f2750f'

/** Die Formen des Fuchskopfes. `path`/`ellipse` für SVG und Raster; `grad` = senkrechter Verlauf [oben, unten, y0, y1]. */
const SHAPES = [
  { path: 'M38 72 C20 46 20 20 32 4 C52 10 74 26 88 44 Z', fill: '#ff8a1c' },
  { path: 'M162 72 C180 46 180 20 168 4 C148 10 126 26 112 44 Z', fill: '#ff8a1c' },
  { path: 'M48 58 C40 42 38 28 42 18 C54 24 66 32 74 44 Z', fill: '#fff0dc' },
  { path: 'M152 58 C160 42 162 28 158 18 C146 24 134 32 126 44 Z', fill: '#fff0dc' },
  { path: 'M32 4 C52 10 60 14 66 21 L24 25 C21 17 25 8 32 4 Z', fill: DARK },
  { path: 'M168 4 C148 10 140 14 134 21 L176 25 C179 17 175 8 168 4 Z', fill: DARK },
  { path: 'M100 28 C142 28 170 54 172 90 C173 121 146 148 100 148 C54 148 27 121 28 90 C30 54 58 28 100 28 Z', grad: [ORANGE_TOP, ORANGE_BOT, 28, 148] },
  { path: 'M28 98 C46 92 70 98 82 114 C88 122 94 127 100 127 C106 127 112 122 118 114 C130 98 154 92 172 98 C172.5 121 146 148 100 148 C54 148 27.5 121 28 98 Z', grad: ['#ffffff', '#ffe9d0', 92, 148] },
  { ellipse: [46, 115, 9, 5.8], fill: '#ff6f7a', alpha: 0.5 },
  { ellipse: [154, 115, 9, 5.8], fill: '#ff6f7a', alpha: 0.5 },
  { ellipse: [69, 90, 15, 19], fill: '#ffffff' },
  { ellipse: [131, 90, 15, 19], fill: '#ffffff' },
  { ellipse: [69, 91, 10.5, 13.5], fill: '#2a170a' },
  { ellipse: [131, 91, 10.5, 13.5], fill: '#2a170a' },
  { ellipse: [65.4, 85, 4, 4], fill: '#ffffff' },
  { ellipse: [134.6, 85, 4, 4], fill: '#ffffff' },
  { path: 'M90 106 Q100 101 110 106 Q108 117 100 121 Q92 117 90 106 Z', fill: DARK },
  { stroke: 'M85 129 Q92 138 100 130 Q108 138 115 129', width: 3.6, fill: DARK },
]

const shapeColor = (s, ly) => {
  if (s.grad) {
    const [c1, c2, y0, y1] = s.grad
    return mix(rgb(c1), rgb(c2), Math.max(0, Math.min(1, (ly - y0) / (y1 - y0))))
  }
  return rgb(s.fill, s.alpha ?? 1)
}

const MASCOT = SHAPES.map((s) => (s.path ? { ...s, pts: flatten(s.path) } : s.ellipse ? { ...s, pts: ellipse(...s.ellipse) } : { ...s, line: flatten(s.stroke) }))

/** HSL (Grad, 0 bis 1, 0 bis 1) → Farbe; gleiche Rechnung wie in src/lib/appIcon.ts, damit das feste Fuchs-Symbol zu den berechneten passt. */
function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a: 1 }
}
const toHex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
const FOX_HUE = 212
const BG_TOP = hsl(FOX_HUE, 0.42, 0.27)
const BG_BOT = hsl(FOX_HUE, 0.5, 0.13)
const LIGHT_TOP = hsl(FOX_HUE, 0.85, 0.94)
const LIGHT_BOT = hsl(FOX_HUE, 0.72, 0.84)

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
          let inBg = true
          if (radius > 0) {
            const qx = Math.max(radius - dx, 0, dx - (120 - radius))
            const qy = Math.max(radius - dy, 0, dy - (120 - radius))
            inBg = qx * qx + qy * qy <= radius * radius
          }
          if (!inBg) continue
          const bg = mix(BG_TOP, BG_BOT, dy / 120)
          let r = bg.r
          let g = bg.g
          let b = bg.b
          const lx = (dx - tx) / scale
          const ly = (dy - ty) / scale
          for (const s of MASCOT) {
            const hit = s.pts ? inside(s.pts, lx, ly) : nearStroke(s.line, lx, ly, s.width / 2)
            if (!hit) continue
            const c = shapeColor(s, ly)
            r = r * (1 - c.a) + c.r * c.a
            g = g * (1 - c.a) + c.g * c.a
            b = b * (1 - c.a) + c.b * c.a
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

// Kopf: x 22..178, y 4..148 → Mitte (100, 76). Rund: Fuchs füllt etwa vier Fünftel; maskierbar: kleiner, Android schneidet den Rand beliebig zu.
const place = (s) => ({ tx: 60 - 100 * s, ty: 62 - 76 * s, scale: s })
const ROUND = { radius: 27, ...place(0.56) }
const MASKABLE = { radius: 0, ...place(0.44) }
const FULL = { radius: 0, ...place(0.56) }

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

// favicon.svg aus denselben Formen
const t = place(0.56)
const defs = [
  `<style>.t{stop-color:${toHex(BG_TOP)}}.b{stop-color:${toHex(BG_BOT)}}@media (prefers-color-scheme: light){.t{stop-color:${toHex(LIGHT_TOP)}}.b{stop-color:${toHex(LIGHT_BOT)}}}</style>`,
  `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop class="t" offset="0"/><stop class="b" offset="1"/></linearGradient>`,
  ...SHAPES.map((s, i) => (s.grad ? `<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" x1="0" y1="${s.grad[2]}" x2="0" y2="${s.grad[3]}"><stop offset="0" stop-color="${s.grad[0]}"/><stop offset="1" stop-color="${s.grad[1]}"/></linearGradient>` : '')),
].join('')
const body = SHAPES.map((s, i) => {
  const fill = s.grad ? `url(#g${i})` : s.fill
  if (s.path) return `<path d="${s.path}" fill="${fill}"/>`
  if (s.ellipse) return `<ellipse cx="${s.ellipse[0]}" cy="${s.ellipse[1]}" rx="${s.ellipse[2]}" ry="${s.ellipse[3]}" fill="${fill}"${s.alpha ? ` opacity="${s.alpha}"` : ''}/>`
  return `<path d="${s.stroke}" fill="none" stroke="${fill}" stroke-width="${s.width}" stroke-linecap="round"/>`
}).join('')
fs.writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${defs}</defs><rect width="120" height="120" rx="27" fill="url(#bg)"/><g transform="translate(${t.tx.toFixed(2)} ${t.ty.toFixed(2)}) scale(${t.scale})">${body}</g></svg>\n`,
)
console.log('geschrieben: public/favicon.svg')
