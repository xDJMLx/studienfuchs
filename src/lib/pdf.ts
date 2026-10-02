import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export interface LoadedPdf {
  numPages: number
  /** Seite als Bild (JPEG) rendern, längste Kante höchstens maxSide Pixel. */
  renderPage: (page: number, maxSide?: number) => Promise<Blob>
  destroy: () => void
}

/** PDF komplett im Browser öffnen (pdf.js, selbst ausgeliefert – keine Daten verlassen das Gerät). */
export async function loadPdf(file: File): Promise<LoadedPdf> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const doc: PDFDocumentProxy = await task.promise

  return {
    numPages: doc.numPages,
    async renderPage(page, maxSide = 1800) {
      const p = await doc.getPage(page)
      const base = p.getViewport({ scale: 1 })
      const scale = Math.min(3, maxSide / Math.max(base.width, base.height))
      const viewport = p.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas nicht verfügbar')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await p.render({ canvasContext: ctx, viewport, canvas }).promise
      return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht erzeugt werden'))), 'image/jpeg', 0.88))
    },
    destroy: () => void task.destroy(),
  }
}
