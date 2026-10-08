/**
 * Das App-Symbol: der Fuchs (Fenni) als weich modellierte, eigene Zeichnung: wenige große Formen mit Licht und Schatten,
 * wie bei den bekannten Lern-Apps und nach Apples Richtlinien (eine Hauptfigur in der Mitte, keine feinen Linien, Tiefe durch überlappende Flächen).
 * Hell: tiefes Indigo mit warmem Lichtschein hinter dem Fuchs. Dunkel: Schwarz, dieselbe Zeichnung.
 */
export const ICON_LIGHT = { top: '#463bc8', bottom: '#0d0a3c' }
export const ICON_DARK = { top: '#1a1a20', bottom: '#000000' }

/** Die zwei Farben des Hintergrund-Verlaufs (oben, unten). */
export const iconColors = (dark: boolean): { top: string; bottom: string } => (dark ? ICON_DARK : ICON_LIGHT)

export interface IconOptions {
  /** Abgerundete Ecken (Browser, „any“); ohne Rundung für iPhone und „maskable“, dort schneidet das System selbst zu */
  round?: boolean
  /** Zeichnung verkleinern (für „maskable“: Rand bleibt frei) */
  scale?: number
}

const INK = '#2b170a'
const mirrored = (inner: string) => `<g transform="translate(512 0) scale(-1 1)">${inner}</g>${inner}`

const HEAD = 'M256 128 C352 128 432 182 448 262 C454 292 450 318 438 340 C402 398 332 434 256 434 C180 434 110 398 74 340 C62 318 58 292 64 262 C80 182 160 128 256 128 Z'
const EAR = 'M262 172 C300 112 348 66 392 40 Q407 32 414 50 C436 108 448 188 446 268 Z'
const CHEEK = 'M254 338 C292 338 320 324 348 308 C384 288 432 294 466 312 C472 320 478 326 482 332 C450 334 440 350 430 364 C396 410 330 436 254 436 Z'

/** Die Zeichnung des Fuchskopfes (512 x 512), mittig mit Rand, damit weder Ohren noch Wangenspitzen am Rand kleben. */
function foxArt(id: string): string {
  return (
    `<defs>` +
    `<radialGradient id="${id}h" cx="0.38" cy="0.22" r="0.85"><stop offset="0" stop-color="#ffc06b"/><stop offset="0.55" stop-color="#ff8a24"/><stop offset="1" stop-color="#e1560b"/></radialGradient>` +
    `<radialGradient id="${id}w" cx="0.5" cy="0.1" r="0.9"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffd9bb"/></radialGradient>` +
    `<linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3d"/><stop offset="1" stop-color="#e1560b"/></linearGradient>` +
    `<radialGradient id="${id}i" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#7a4a1c"/><stop offset="1" stop-color="${INK}"/></radialGradient>` +
    `<clipPath id="${id}t"><rect width="512" height="110"/></clipPath>` +
    `<filter id="${id}s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="16" stdDeviation="13" flood-color="#000" flood-opacity="0.5"/></filter>` +
    `</defs>` +
    `<g transform="translate(256 262) scale(0.9) translate(-256 -236)" filter="url(#${id}s)">` +
    // Ohren: außen Verlauf, innen hell, Spitze dunkel
    mirrored(
      `<path d="${EAR}" fill="url(#${id}e)"/>` +
        `<path d="M302 186 C326 144 354 110 386 84 C400 126 408 172 406 224 Z" fill="#ffe3c2"/>` +
        `<path d="M330 190 C346 160 366 134 386 112 C396 144 400 176 398 206 Z" fill="#ffc79a"/>` +
        `<g clip-path="url(#${id}t)"><path d="${EAR}" fill="${INK}"/></g>`,
    ) +
    `<path d="${HEAD}" fill="url(#${id}h)"/>` +
    mirrored(`<path d="${CHEEK}" fill="url(#${id}w)"/>`) +
    `<path d="M150 190 C190 160 240 150 256 150" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.28"/>` +
    // Augen mit Lichtpunkten, Wangenröte
    mirrored(
      `<ellipse cx="322" cy="268" rx="36" ry="44" fill="url(#${id}i)"/>` +
        `<ellipse cx="322" cy="268" rx="36" ry="44" fill="none" stroke="#ffb347" stroke-width="3" opacity="0.8"/>` +
        `<ellipse cx="334" cy="250" rx="14" ry="17" fill="#fff"/><circle cx="310" cy="292" r="7" fill="#fff" opacity="0.9"/>` +
        `<ellipse cx="396" cy="346" rx="24" ry="13" fill="#ff8fa3" opacity="0.4"/>`,
    ) +
    // Nase und Mund
    `<path d="M226 336 C226 320 286 320 286 336 C286 356 268 370 256 370 C244 370 226 356 226 336 Z" fill="#241208"/>` +
    `<ellipse cx="243" cy="334" rx="10" ry="5" fill="#fff" opacity="0.45"/>` +
    `<path d="M256 370 V388 M224 388 C236 410 276 410 288 388" stroke="#241208" stroke-width="9" stroke-linecap="round" fill="none"/>` +
    `</g>`
  )
}

/** Das fertige Symbol als SVG (512 x 512): Verlauf mit Lichtschein und Glanz, darauf der Fuchs. */
export function buildIconSvg(dark: boolean, opts: IconOptions = {}): string {
  const { round = true, scale = 1 } = opts
  const { top, bottom } = iconColors(dark)
  const id = `ic${dark ? 'd' : 'l'}`
  const rx = round ? 112 : 0
  const off = (512 - 512 * scale) / 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
    `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
    `<radialGradient id="${id}g" cx="0.5" cy="0.55" r="0.55"><stop offset="0" stop-color="#ff8a3d" stop-opacity="${dark ? 0.4 : 0.55}"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="${id}c"><rect width="512" height="512" rx="${rx}"/></clipPath></defs>` +
    `<g clip-path="url(#${id}c)"><rect width="512" height="512" fill="url(#${id}b)"/><rect width="512" height="512" fill="url(#${id}g)"/>` +
    `<ellipse cx="256" cy="-120" rx="380" ry="230" fill="#fff" opacity="${dark ? 0.05 : 0.07}"/>` +
    `<g transform="translate(${off} ${off}) scale(${scale})">${foxArt(id)}</g></g></svg>`
  )
}

/** SVG-Text → PNG als Daten-Adresse (im Browser). */
export function svgToPng(svg: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Kein Zeichenfeld'))
      ctx.drawImage(img, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Symbol konnte nicht gezeichnet werden'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

const setLink = (rel: string, href: string, extra: Record<string, string> = {}) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
  el.removeAttribute('media')
  el.href = href
}

let baseManifest: Record<string, unknown> | null = null

/** Setzt Browser-Symbol, Symbol fürs Home-Bildschirm-Hinzufügen (iPhone) und Manifest-Symbole (Android) passend zu Hell oder Dunkel. */
export async function applyAppIcon(dark: boolean): Promise<void> {
  const round = buildIconSvg(dark)
  const bleed = buildIconSvg(dark, { round: false })
  const safe = buildIconSvg(dark, { round: false, scale: 0.74 })
  setLink('icon', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(round)}`, { type: 'image/svg+xml' })
  // iPhone: randvoll (das System rundet selbst; transparente Ecken würden schwarz)
  const [p180, p192, p512, pMask] = await Promise.all([svgToPng(bleed, 180), svgToPng(round, 192), svgToPng(round, 512), svgToPng(safe, 512)])
  setLink('apple-touch-icon', p180)
  // Das Manifest wird für das Hinzufügen zum Startbildschirm gelesen: eine eigene Fassung mit den Symbolen des Tieres (Adressen absolut, Symbole als Daten)
  try {
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!baseManifest && link) baseManifest = (await (await fetch(link.dataset.original ?? link.href)).json()) as Record<string, unknown>
    if (link && baseManifest) {
      if (!link.dataset.original) link.dataset.original = link.href
      const base = new URL('./', new URL(link.dataset.original, location.href)).href
      const abs = (v: unknown) => (typeof v === 'string' ? new URL(v, base).href : v)
      const man = {
        ...baseManifest,
        id: abs(baseManifest.id),
        start_url: abs(baseManifest.start_url),
        scope: abs(baseManifest.scope),
        theme_color: dark ? '#111a20' : '#f3f4f7',
        background_color: iconColors(dark).bottom,
        icons: [
          { src: p192, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: p512, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: pMask, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      }
      link.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' }))
    }
  } catch {
    /* ohne Manifest-Fassung bleibt das ursprüngliche Symbol (Fuchs) */
  }
}
