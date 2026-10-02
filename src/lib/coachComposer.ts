import { create } from 'zustand'

/** Eine angehängte Buchseite: kleine Vorschau (Daten-Bild) und das für die KI verkleinerte JPEG. */
export interface AttachedPage {
  id: string
  thumb: string
  /** JPEG als Base64, verkleinert */
  data: string
}

export const MAX_PAGES = 8

/**
 * Gemeinsamer Zustand für das Eingabefeld der KI. Auf dem Handy sitzt das Feld in der Tab-Leiste,
 * am Computer unten auf der Seite; beide teilen sich Text, angehängte Seiten und Senden-Funktion.
 * Seiten bleiben absichtlich nur im Arbeitsspeicher (nie gespeichert).
 */
interface ComposerState {
  input: string
  busy: boolean
  pages: AttachedPage[]
  /** Von der KI-Seite gesetzt: sendet den aktuellen Text. */
  submit: (() => void) | null
  setInput: (v: string) => void
  setBusy: (v: boolean) => void
  setSubmit: (fn: (() => void) | null) => void
  addPage: (p: AttachedPage) => void
  removePage: (id: string) => void
  clearPages: () => void
}

export const useCoachComposer = create<ComposerState>((set) => ({
  input: '',
  busy: false,
  pages: [],
  submit: null,
  setInput: (input) => set({ input }),
  setBusy: (busy) => set({ busy }),
  setSubmit: (submit) => set({ submit }),
  addPage: (p) => set((s) => (s.pages.length >= MAX_PAGES ? s : { pages: [...s.pages, p] })),
  removePage: (id) =>
    set((s) => {
      return { pages: s.pages.filter((p) => p.id !== id) }
    }),
  clearPages: () => set({ pages: [] }),
}))
