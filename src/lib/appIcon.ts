/**
 * Das App-Symbol: der Fuchs (Fenni) als eigene, bewusst einfache Zeichnung: wenige große Formen, kräftige Farben, riesige Augen.
 * So wirkt es auch klein auf dem Startbildschirm; die feine Figur aus der App hat dafür zu viele Einzelheiten.
 * Hell: leuchtendes Blau (Gegenfarbe zum Orange), dunkel: Schwarz.
 */
export const ICON_LIGHT = { top: '#35b6ff', bottom: '#0f8bf0' }
export const ICON_DARK = { top: '#18181b', bottom: '#000000' }

/** Die zwei Farben des Hintergrund-Verlaufs (oben, unten). */
export const iconColors = (dark: boolean): { top: string; bottom: string } => (dark ? ICON_DARK : ICON_LIGHT)

export interface IconOptions {
  /** Abgerundete Ecken (Browser, „any“); ohne Rundung für iPhone und „maskable“, dort schneidet das System selbst zu */
  round?: boolean
  /** Zeichnung verkleinern (für „maskable“: Rand bleibt frei) */
  scale?: number
}

const INK = '#2b170a'

/** Das rechte Ohr (das linke ist die Spiegelung). Koordinaten 512 x 512, Kopf um x = 256. */
const ear = (id: string) =>
  // außen orange, innen hell, die Spitze dunkel
  `<path d="M262 172 C300 112 348 66 392 38 Q407 30 414 48 C436 106 448 188 446 268 Z" fill="#ff7f1a"/>` +
  `<path d="M302 186 C326 144 354 110 386 84 C400 126 408 172 406 224 Z" fill="#ffe6c4"/>` +
  `<g clip-path="url(#${id}-tip)"><path d="M262 172 C300 112 348 66 392 38 Q407 30 414 48 C436 106 448 188 446 268 Z" fill="${INK}"/></g>`

/** Die Zeichnung (Fuchskopf) in 512 x 512, mittig und mit Rand, damit weder Ohren noch Wangenspitzen am Rand kleben. */
function foxArt(id: string): string {
  return (
    `<defs>` +
    `<linearGradient id="${id}-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffab45"/><stop offset="1" stop-color="#ff7a14"/></linearGradient>` +
    `<linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#ffe9cf"/></linearGradient>` +
    `<clipPath id="${id}-tip"><rect x="0" y="0" width="512" height="104"/></clipPath>` +
    `</defs>` +
    `<g transform="translate(256 258) scale(0.92) translate(-256 -232)">` +
    `<g transform="translate(512 0) scale(-1 1)">${ear(id)}</g>` +
    ear(id) +
    // Kopf über den Ohren
    `<path d="M256 124 C352 124 428 174 446 256 C450 278 458 302 482 328 C450 330 440 346 430 360 C396 408 330 434 256 434 C182 434 116 408 82 360 C72 346 62 330 30 328 C54 302 62 278 66 256 C84 174 160 124 256 124 Z" fill="url(#${id}-h)"/>` +
    // weiße Wangen (beide Seiten) über dem Kopf
    `<g transform="translate(512 0) scale(-1 1)"><path d="M254 334 C292 334 320 320 348 304 C384 284 432 290 466 308 C472 316 478 322 482 328 C450 330 440 346 430 360 C396 408 330 434 254 434 Z" fill="url(#${id}-w)"/></g>` +
    `<path d="M254 334 C292 334 320 320 348 304 C384 284 432 290 466 308 C472 316 478 322 482 328 C450 330 440 346 430 360 C396 408 330 434 254 434 Z" fill="url(#${id}-w)"/>` +
    // Augen
    `<g transform="translate(512 0) scale(-1 1)"><ellipse cx="322" cy="262" rx="34" ry="42" fill="${INK}"/><ellipse cx="333" cy="246" rx="13" ry="15" fill="#fff"/><circle cx="312" cy="282" r="6.5" fill="#fff"/><ellipse cx="392" cy="342" rx="24" ry="14" fill="#ff8fa3" opacity="0.5"/></g>` +
    `<ellipse cx="322" cy="262" rx="34" ry="42" fill="${INK}"/><ellipse cx="333" cy="246" rx="13" ry="15" fill="#fff"/><circle cx="312" cy="282" r="6.5" fill="#fff"/><ellipse cx="392" cy="342" rx="24" ry="14" fill="#ff8fa3" opacity="0.5"/>` +
    // Nase und Mund
    `<path d="M226 334 C226 318 286 318 286 334 C286 354 268 368 256 368 C244 368 226 354 226 334 Z" fill="${INK}"/>` +
    `<ellipse cx="244" cy="333" rx="9" ry="4.5" fill="#fff" opacity="0.5"/>` +
    `<path d="M256 368 V386 M222 386 C234 408 278 408 290 386" stroke="${INK}" stroke-width="9" stroke-linecap="round" fill="none"/>` +
    `</g>`
  )
}

/**
 * Das fertige Symbol als SVG (512 x 512): Verlauf mit leichtem Glanz, darauf der Fuchs.
 */
export function buildIconSvg(dark: boolean, opts: IconOptions = {}): string {
  const { round = true, scale = 1 } = opts
  const { top, bottom } = iconColors(dark)
  const gid = `app-bg-${dark ? 'd' : 'l'}`
  const off = (512 - 512 * scale) / 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
    `<radialGradient id="${gid}-g" cx="0.3" cy="0.1" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.1 : 0.3}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#${gid})"/>` +
    `<rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#${gid}-g)"/>` +
    `<g transform="translate(${off} ${off}) scale(${scale})">${foxArt(gid + '-f')}</g></svg>`
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
