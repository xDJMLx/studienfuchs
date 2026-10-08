import type { SpeciesId } from '../components/mascot/species'

/**
 * App-Symbol je Lerntier und je Hell/Dunkel: Das Tier steht auf einem Verlauf, dessen Farbton zum Tier passt (dunkel und tief im Dunkelmodus,
 * zart im Hellmodus). Die Zeichnung des Tieres kommt aus der App selbst (components/mascot/snapshot.tsx), hier stehen nur Farben und der Rahmen.
 */
export const ICON_HUE: Record<SpeciesId, number> = {
  fuchs: 212,
  elefant: 28,
  krokodil: 292,
  giraffe: 232,
  erdmaennchen: 205,
  loewe: 215,
  panda: 158,
  pinguin: 24,
  nilpferd: 150,
  zebra: 262,
  affe: 190,
  tiger: 214,
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
  return dark ? { top: hsl(h, 0.42, 0.27), bottom: hsl(h, 0.5, 0.13) } : { top: hsl(h, 0.85, 0.94), bottom: hsl(h, 0.72, 0.84) }
}

/**
 * Das fertige Symbol als SVG (512 x 512): abgerundetes Quadrat mit Verlauf, darauf das Tier (aus dem SVG-Text der Figur).
 * `markup` ist das <svg> der Figur; es wird ohne Größenangaben eingesetzt und mittig ausgerichtet.
 */
export function buildIconSvg(markup: string, species: SpeciesId, dark: boolean): string {
  const { top, bottom } = iconColors(species, dark)
  const gid = `app-bg-${species}-${dark ? 'd' : 'l'}`
  const art = markup
    .replace(/\sviewBox="[^"]*"/, ' viewBox="-10 -6 220 208"')
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/\sclass="[^"]*"/, '')
    .replace(/\spreserveAspectRatio="[^"]*"/, '')
    .replace('<svg', '<svg x="36" y="62" width="440" height="416" preserveAspectRatio="xMidYMid meet" overflow="visible"')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<rect width="512" height="512" rx="112" fill="url(#${gid})"/>${art}</svg>`
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
  const svg = buildIconSvg(markup, species, dark)
  setLink('icon', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, { type: 'image/svg+xml' })
  const [p180, p192, p512] = await Promise.all([svgToPng(svg, 180), svgToPng(svg, 192), svgToPng(svg, 512)])
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
        ],
      }
      link.href = URL.createObjectURL(new Blob([JSON.stringify(man)], { type: 'application/manifest+json' }))
    }
  } catch {
    /* ohne Manifest-Fassung bleibt das ursprüngliche Symbol (Fuchs) */
  }
}
