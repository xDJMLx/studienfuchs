import type { DeckLang, Item } from './types'

/** Ein Stapel zum Weitergeben: nur Inhalt, kein Lernstand. */
export interface SharedDeck {
  title: string
  subject?: string
  lang?: DeckLang
  both?: boolean
  items: Omit<Item, 'id'>[]
}

/** Ab dieser Länge ist ein Link für Messenger und QR-Codes unhandlich. */
export const MAX_LINK = 6000

const toB64 = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64 = (t: string) => {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

const hasStreams = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

/** Stapel → kurzer Text für die Adresse („z.“ = gepackt, „p.“ = unverändert). */
export async function encodeDeck(d: SharedDeck): Promise<string> {
  const clean: SharedDeck = {
    title: d.title,
    ...(d.subject ? { subject: d.subject } : {}),
    ...(d.lang ? { lang: d.lang } : {}),
    ...(d.both !== undefined ? { both: d.both } : {}),
    items: d.items.map((i) => ({ front: i.front, back: i.back, ...(i.example && i.exampleDe ? { example: i.example, exampleDe: i.exampleDe } : {}), ...(i.note ? { note: i.note } : {}) })),
  }
  const raw = new TextEncoder().encode(JSON.stringify(clean))
  if (hasStreams()) return 'z.' + toB64(await pipe(raw, new CompressionStream('deflate-raw')))
  return 'p.' + toB64(raw)
}

/** Gegenstück zu encodeDeck. Wirft bei kaputtem oder unpassendem Inhalt. */
export async function decodeDeck(code: string): Promise<SharedDeck> {
  const kind = code.slice(0, 2)
  const body = code.slice(2)
  let bytes: Uint8Array
  if (kind === 'z.') {
    if (!hasStreams()) throw new Error('Dieser Browser kann den Link nicht entpacken.')
    bytes = await pipe(fromB64(body), new DecompressionStream('deflate-raw'))
  } else if (kind === 'p.') bytes = fromB64(body)
  else throw new Error('Der Link ist nicht vollständig.')
  const data = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SharedDeck>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const items = (Array.isArray(data.items) ? data.items : [])
    .map((i) => ({ front: str(i?.front).slice(0, 500), back: str(i?.back).slice(0, 500), example: str(i?.example).slice(0, 500), exampleDe: str(i?.exampleDe).slice(0, 500), note: str(i?.note).slice(0, 500) }))
    .filter((i) => i.front && i.back)
    .slice(0, 300)
    .map((i) => ({ front: i.front, back: i.back, ...(i.example && i.exampleDe ? { example: i.example, exampleDe: i.exampleDe } : {}), ...(i.note ? { note: i.note } : {}) }))
  const title = str(data.title).slice(0, 80)
  if (!title || items.length === 0) throw new Error('Im Link stecken keine Karteikarten.')
  return {
    title,
    ...(typeof data.subject === 'string' && /^[a-z-]{2,30}$/.test(data.subject) ? { subject: data.subject } : {}),
    ...(data.lang === 'fr' || data.lang === 'en' ? { lang: data.lang } : {}),
    ...(typeof data.both === 'boolean' ? { both: data.both } : {}),
    items,
  }
}

/** Vollständiger Link zum Stapel (funktioniert unter GitHub Pages und lokal). */
export function deckLink(code: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/stapel/teilen?d=${code}`
}
