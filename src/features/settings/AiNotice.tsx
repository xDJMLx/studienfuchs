import { useEffect, useState } from 'react'
import { Info } from '../../components/ui/Icons'
import { getAiConfig, isAiReady, preloadAi } from '../../lib/ai'
import { freeAiConfigured } from '../../lib/freeAi'

/** Ehrlicher Hinweis direkt am KI-Button: eine kurze Zeile, die sich zu den Details aufklappen lässt. */
export function AiNotice({ className = '' }: { className?: string }) {
  const [ready, setReady] = useState(false)
  const provider = getAiConfig().provider

  useEffect(() => {
    preloadAi()
    let alive = true
    void isAiReady().then((r) => alive && setReady(r))
    return () => {
      alive = false
    }
  }, [])

  const own = provider === 'anthropic'
  const free = freeAiConfigured() && !ready
  const short = free ? 'Kostenlos, ohne Anmeldung · Daten gehen an einen KI-Anbieter' : own ? 'Eigener Schlüssel · Daten gehen direkt an Anthropic' : ready ? 'Kostenlose KI aktiv · Daten gehen an Puter' : 'Kostenlos, ohne Schlüssel · einmalig ein Puter-Gastkonto'
  const long = free
    ? 'Du kannst sofort losschreiben, ohne Konto. Deine Nachricht, dein Lernstand (ohne Namen) und die passenden Seiten deiner Bücher gehen an kostenlose KI-Modelle über Kilo, deren Anbieter Eingaben mitlesen und zur Verbesserung nutzen dürfen. Schreibe also keine privaten Dinge hinein. Ist dieser Anbieter überlastet, kannst du mit einem anderen weitermachen (kostenlose Anmeldung).'
    : own
    ? 'Du nutzt deinen eigenen Anthropic-Schlüssel. Beim Klick werden die gewählten Seiten direkt an Anthropic gesendet.'
    : ready
      ? 'Die kostenlose KI läuft über dein Puter-Gastkonto. Beim Klick werden die gewählten Seiten zur Auswertung an Puter und dessen KI-Anbieter gesendet.'
      : 'Beim ersten Mal öffnet sich kurz ein Fenster von Puter und legt dir automatisch ein kostenloses Gastkonto an (bitte Pop-ups erlauben). Beim Klick werden die gewählten Seiten zur Auswertung an Puter und dessen KI-Anbieter gesendet.'

  return (
    <details className={`group rounded-xl bg-snow text-xs text-muted ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 font-medium">
        <Info size={14} />
        <span className="min-w-0 flex-1">{short}</span>
        <span className="text-[11px] underline decoration-dotted group-open:hidden">Details</span>
      </summary>
      <p className="px-3 pb-3 leading-relaxed">{long}</p>
    </details>
  )
}
