import type { SpeciesId } from '../components/mascot/species'

/**
 * App-Symbol je Lerntier im Stil der bekannten Lern-Apps: ein großes Tiergesicht füllt das Symbol, dahinter eine kräftige, leuchtende Farbe,
 * die zum Tier passt (Kontrast statt Ton in Ton). Hell: leuchtend; dunkel: dieselbe Farbe, tief und gedämpft.
 * Die Zeichnung des Tieres kommt aus der App selbst (components/mascot/snapshot.tsx), hier stehen Farben, Zuschnitt und Rahmen.
 */
export const ICON_HUE: Record<SpeciesId, number> = {
  fuchs: 203, // orange auf Himmelblau
  elefant: 30, // grau auf Orange
  krokodil: 278, // grün auf Violett
  giraffe: 232, // gelb auf Indigo
  erdmaennchen: 172, // sandfarben auf Türkis
  loewe: 330, // goldgelb auf Pink
  panda: 100, // schwarz-weiß auf Grün
  pinguin: 38, // schwarz-weiß auf Gelborange
  nilpferd: 348, // lila auf Rosa-Rot
  zebra: 12, // schwarz-weiß auf Rot
  affe: 190, // braun auf Cyan
  tiger: 262, // orange auf Violettblau
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')

/** HSL (Grad, 0 bis 1, 0 bis 1) → "#rrggbb". */
export function hsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${hex2(f(0) * 255)}${hex2(f(8) * 255)}${hex2(f(4) * 255)}`
}

/** Die zwei Farben des Hintergrund-Verlaufs (oben, unten). */
export function iconColors(species: SpeciesId, dark: boolean): { top: string; bottom: string } {
  const h = ICON_HUE[species]
  return dark ? { top: hsl(h, 0.62, 0.34), bottom: hsl(h, 0.7, 0.2) } : { top: hsl(h, 0.92, 0.6), bottom: hsl(h, 0.9, 0.46) }
}

/** Ausschnitt der Zeichnung (x, y, Breite = Höhe): Gesicht groß, bei breiten Tieren (Ohren, Mähne) etwas weiter. */
const WIDE: SpeciesId[] = ['elefant', 'loewe']
export const cropOf = (species: SpeciesId): [number, number, number] => (WIDE.includes(species) ? [-10, -16, 220] : [14, -2, 172])

export interface IconOptions {
  /** Abgerundete Ecken (Browser, „any“); ohne Rundung für iPhone und „maskable“, dort schneidet das System selbst zu */
  round?: boolean
  /** Zeichnung verkleinern (für „maskable“: Rand bleibt frei) */
  scale?: number
}

/**
 * Das fertige Symbol als SVG (512 x 512): Verlauf mit leichtem Glanz, darauf das Tiergesicht (aus dem SVG-Text der Figur).
 * `markup` ist das <svg> der Figur; es wird ohne Größenangaben eingesetzt.
 */
export function buildIconSvg(markup: string, species: SpeciesId, dark: boolean, opts: IconOptions = {}): string {
  const { round = true, scale = 1 } = opts
  const { top, bottom } = iconColors(species, dark)
  const gid = `app-bg-${species}-${dark ? 'd' : 'l'}`
  const [cx, cy, size] = cropOf(species)
  const side = 512 * scale
  const off = (512 - side) / 2
  const art = markup
    .replace(/\sviewBox="[^"]*"/, ` viewBox="${cx} ${cy} ${size} ${size}"`)
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/\sclass="[^"]*"/, '')
    .replace(/\spreserveAspectRatio="[^"]*"/, '')
    .replace('<svg', `<svg x="${off}" y="${off}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid slice" overflow="hidden"`)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
    `<radialGradient id="${gid}-g" cx="0.3" cy="0.12" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.12 : 0.28}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#${gid})"/>` +
    `<rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#${gid}-g)"/>${art}</svg>`
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

/** Setzt Browser-Symbol, Symbol fürs Home-Bildschirm-Hinzufügen (iPhone) und Manifest-Symbole (Android) auf das gewählte Tier. */
export async function applyAppIcon(species: SpeciesId, dark: boolean, markup: string): Promise<void> {
  const round = buildIconSvg(markup, species, dark)
  const bleed = buildIconSvg(markup, species, dark, { round: false })
  const safe = buildIconSvg(markup, species, dark, { round: false, scale: 0.82 })
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
        background_color: iconColors(species, dark).bottom,
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
