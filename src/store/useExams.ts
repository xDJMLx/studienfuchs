import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ExamData } from '../lib/exam'
import { safeStorage } from '../lib/storage'

export interface ExamResult {
  date: string
  percent: number
  note: number
}

interface ExamsData {
  exams: ExamData[]
  results: Record<string, ExamResult[]>
}

interface ExamsActions {
  addExam: (e: ExamData) => void
  deleteExam: (id: string) => void
  addResult: (id: string, r: ExamResult) => void
  replaceAll: (data: ExamsData) => void
}

const MAX_EXAMS = 30

export const useExams = create<ExamsData & ExamsActions>()(
  persist(
    (set) => ({
      exams: [],
      results: {},
      addExam: (e) => set((s) => ({ exams: [e, ...s.exams].slice(0, MAX_EXAMS) })),
      deleteExam: (id) =>
        set((s) => {
          const results = { ...s.results }
          delete results[id]
          return { exams: s.exams.filter((e) => e.id !== id), results }
        }),
      addResult: (id, r) => set((s) => ({ results: { ...s.results, [id]: [r, ...(s.results[id] ?? [])].slice(0, 10) } })),
      replaceAll: (data) => set({ exams: Array.isArray(data?.exams) ? data.exams : [], results: data?.results && typeof data.results === 'object' ? data.results : {} }),
    }),
    { name: 'studienfuchs-exams', version: 1, storage: createJSONStorage(() => safeStorage), partialize: (s) => ({ exams: s.exams, results: s.results }) },
  ),
)

export const examsSnapshot = (): ExamsData => {
  const { exams, results } = useExams.getState()
  return { exams, results }
}
