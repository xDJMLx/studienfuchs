import { AiError, chatCoach, ensureAiReady } from './ai'
import { chatFree, shouldUseFree } from './freeAi'

/** Die kostenlose KI ist ausgelastet: ein anderer Anbieter (mit kostenloser Anmeldung) könnte weiterhelfen. */
export class NeedAccountError extends AiError {
  readonly needAccount = true
}

/**
 * Eine einzelne Anfrage an die KI (ohne Gespräch), z. B. um eine Klassenarbeit zu erstellen oder einen Text zu bewerten.
 * Zuerst die kostenlose KI ohne Anmeldung; ist sie nicht erreichbar, gibt es einen NeedAccountError (die Seite bietet dann
 * "Mit anderem Anbieter weiter" an, das ensureAiReady() direkt aus dem Klick aufruft). Mit verbundenem Puter-Konto oder eigenem Schlüssel
 * geht es direkt dorthin.
 */
export async function askAi(system: string, user: string, maxTokens = 3500): Promise<string> {
  const messages = [{ role: 'user' as const, content: user }]
  if (await shouldUseFree(false)) {
    try {
      return await chatFree(system, messages, fetch, maxTokens)
    } catch (e) {
      if (e instanceof AiError && e.kind === 'network') throw e
      throw new NeedAccountError('Der kostenlose KI-Anbieter ist gerade überlastet. Du kannst mit einem anderen Anbieter weitermachen: Dafür öffnet sich kurz ein Fenster für eine kostenlose Anmeldung.', 'rate')
    }
  }
  await ensureAiReady()
  return chatCoach(system, messages, [], maxTokens)
}
