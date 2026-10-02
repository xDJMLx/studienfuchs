import { z } from 'zod'

const itemSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  example: z.string().optional(),
  exampleDe: z.string().optional(),
  note: z.string().optional(),
})

const explanationSchema = z.object({
  title: z.string(),
  paragraphs: z.array(z.string()).min(1),
  examples: z.array(z.object({ fr: z.string(), de: z.string() })).optional(),
  tip: z.string().optional(),
})

const fillSchema = z
  .object({
    sentence: z.string().refine((s) => s.includes('___'), 'Lückensatz braucht ___'),
    answer: z.string(),
    options: z.array(z.string()).min(2),
    translation: z.string().optional(),
    why: z.string(),
  })
  .refine((f) => f.options.includes(f.answer), 'Antwort muss in options stehen')

const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  explanation: explanationSchema.optional(),
  items: z.array(itemSchema).min(1),
  fills: z.array(fillSchema).optional(),
})

export const unitSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  grade: z.number().int().min(7).max(13),
  subject: z.string(),
  /** Position innerhalb der Klasse (Standard: Nummer aus dem Dateinamen × 10) – so lassen sich Einheiten dazwischen einfügen. */
  order: z.number().optional(),
  /** Zuordnung zum Schulbuch, z. B. "À plus ! 1 · Unité 2" (für Aufhol-Modus und Anzeige). */
  book: z.string().optional(),
  lessons: z.array(lessonSchema).min(1),
})

export type UnitFile = z.infer<typeof unitSchema>
