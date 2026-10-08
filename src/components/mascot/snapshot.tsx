import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Fox } from './Fox'
import { resolveLook } from './look'
import type { SpeciesId } from './species'

/**
 * Zeichnet ein Tier einmal unsichtbar und gibt seinen SVG-Text zurück (Augen und Mund sind dann schon gesetzt).
 * Daraus entstehen die App-Symbole, ohne dass jedes Tier von Hand als Bilddatei vorliegen muss.
 */
export function renderMascotMarkup(species: SpeciesId): Promise<string> {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:400px;height:400px;pointer-events:none'
    host.setAttribute('aria-hidden', 'true')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      flushSync(() => root.render(<Fox look={resolveLook('happy', false, false)} pose="bust" alive={false} species={species} noTail />))
      const svg = host.querySelector('svg')
      if (!svg) throw new Error('Keine Zeichnung')
      resolve(svg.outerHTML)
    } catch (e) {
      reject(e)
    } finally {
      root.unmount()
      host.remove()
    }
  })
}
