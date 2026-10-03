/**
 * Angaben für das Impressum (§ 5 DDG). Wer die App öffentlich betreibt, trägt hier Name, Anschrift und eine
 * E-Mail-Adresse ein; sie erscheinen dann automatisch unter „Datenschutz & Impressum“.
 * Solange nichts eingetragen ist, verweist die Seite auf das GitHub-Projekt.
 */
export const LEGAL = {
  name: '',
  street: '',
  city: '',
  email: '',
}

export const PROJECT_URL = 'https://github.com/xDJMLx/studienfuchs'

export const hasLegalContact = () => !!(LEGAL.name && LEGAL.street && LEGAL.city && LEGAL.email)
