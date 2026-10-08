/** Seitentitel pro Seite: wichtig für Tabs, Verlauf und Screenreader (die Adresse ändert sich nur nach dem #). */
const TITLES: [prefix: string, title: string][] = [
  ['/welcome', 'Willkommen'],
  ['/faecher', 'Karteikarten'],
  ['/kalender', 'Kalender'],
  ['/stapel', 'Karteikarten'],
  ['/ueben/los', 'Üben'],
  ['/math/train', 'Rechentraining'],
  ['/books', 'Bücher'],
  ['/speak', 'Sprechtraining'],
  ['/exam/new', 'Test erstellen'],
  ['/test/neu', 'Test erstellen'],
  ['/training/', 'Rechentraining'],
  ['/test/', 'Test'],
  ['/exam/', 'Test'],
  ['/shop', 'Tier & Shop'],
  ['/math/train', 'Training'],
  ['/blitz', 'Blitzrunde'],
  ['/review/play', 'Wiederholung'],
  ['/review', 'Lernstand'],
  ['/words', 'Wörter'],
  ['/grammar', 'Grammatik'],
  ['/sets', 'Eigene Liste'],
  ['/profile', 'Profil'],
  ['/settings', 'Einstellungen'],
  ['/about', 'Datenschutz & Impressum'],
]


/** Titel einer Seite (für den Tab, die obere Leiste und Screenreader); null, wenn die Seite keinen eigenen hat. */
export function pageTitle(pathname: string): string | null {
  const hit = TITLES.find(([p]) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')))
  return hit ? hit[1] : null
}
