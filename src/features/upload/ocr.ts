import { createWorker } from 'tesseract.js'

export interface OcrProgress {
  fileIndex: number
  fileCount: number
  /** 0..1 für die aktuelle Datei */
  progress: number
  status: string
}

const MAX_SIDE = 2200

/** Große Handyfotos verkleinern und in Graustufen umwandeln: schneller und meist genauer. */
/** Bild robust laden: createImageBitmap, bei exotischen Formaten ersatzweise über ein <img>. */
async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file)
  } catch {
    const url = URL.createObjectURL(file)
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Dieses Bildformat kann der Browser nicht lesen (z. B. HEIC). Mach das Foto als JPG oder PNG.'))
        img.src = url
      })
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    }
  }
}

async function prepareImage(file: Blob): Promise<Blob> {
  const bitmap = await decode(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.filter = 'grayscale(1) contrast(1.25)'
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ('close' in bitmap) bitmap.close()
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/png'))
}

/**
 * Liest Text aus Bildern – komplett im Browser (Tesseract.js, Sprachen: Französisch + Deutsch).
 * Alles (Worker, Kern, Sprachdaten) wird von der App selbst ausgeliefert – keine Drittanbieter, Bilder verlassen das Gerät nie.
 */
export async function ocrImages(files: Blob[], onProgress: (p: OcrProgress) => void): Promise<string> {
  let current = 0
  const base = import.meta.env.BASE_URL + 'ocr'
  const worker = await createWorker(['fra', 'deu'], 1, {
    workerPath: base + '/worker.min.js',
    corePath: base,
    langPath: base + '/lang',
    logger: (m) => onProgress({ fileIndex: current, fileCount: files.length, progress: m.progress ?? 0, status: m.status }),
  })
  try {
    const texts: string[] = []
    for (let i = 0; i < files.length; i++) {
      current = i
      const img = await prepareImage(files[i])
      const { data } = await worker.recognize(img)
      texts.push(data.text)
    }
    return texts.join('\n')
  } finally {
    await worker.terminate()
  }
}
