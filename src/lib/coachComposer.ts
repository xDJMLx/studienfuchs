import { create } from 'zustand'

/**
 * Gemeinsamer Zustand für das Eingabefeld des Lern-Coachs. Auf dem Handy sitzt das Feld in der Tab-Leiste,
 * am Computer unten auf der Seite; beide teilen sich Text und Senden-Funktion.
 */
interface ComposerState {
  input: string
  busy: boolean
  /** Von der Coach-Seite gesetzt: sendet den aktuellen Text. */
  submit: (() => void) | null
  setInput: (v: string) => void
  setBusy: (v: boolean) => void
  setSubmit: (fn: (() => void) | null) => void
}

export const useCoachComposer = create<ComposerState>((set) => ({
  input: '',
  busy: false,
  submit: null,
  setInput: (input) => set({ input }),
  setBusy: (busy) => set({ busy }),
  setSubmit: (submit) => set({ submit }),
}))
