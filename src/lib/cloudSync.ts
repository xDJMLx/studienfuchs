// Abgleich zwischen Geräten über das eigene Puter-Konto: Die Sicherung liegt als Datei im Puter-Speicher des Nutzers,
// nicht auf einem Server dieser App. Nur auf Knopfdruck, nie automatisch, damit nichts unbemerkt überschrieben wird.

const FILE = 'studienfuchs-sicherung.json'

interface PuterCloud {
  auth: {
    isSignedIn: () => boolean
    signIn: (o?: { attempt_temp_user_creation?: boolean }) => Promise<unknown>
    signOut?: () => unknown
    getUser?: () => Promise<{ username?: string; is_temp?: boolean }>
  }
  fs: {
    write: (path: string, data: string | Blob, o?: { overwrite?: boolean; createMissingParents?: boolean }) => Promise<unknown>
    read: (path: string) => Promise<Blob>
    stat: (path: string) => Promise<{ modified?: number }>
  }
}

export type CloudLoader = () => Promise<PuterCloud>

const defaultLoader: CloudLoader = async () => {
  const mod = await import('@heyputer/puter.js')
  return mod.puter as unknown as PuterCloud
}

export class CloudError extends Error {
  constructor(
    message: string,
    readonly code: 'network' | 'auth' | 'none' | 'format',
  ) {
    super(message)
  }
}

const wrap = (e: unknown): CloudError => {
  if (e instanceof CloudError) return e
  const code = (e as { code?: string })?.code ?? (e as { error?: string })?.error
  if (code === 'popup_blocked') return new CloudError('Dein Browser hat das Anmeldefenster blockiert. Erlaube Pop-ups für diese Seite und tippe nochmal.', 'auth')
  if (code === 'auth_window_closed') return new CloudError('Das Anmeldefenster wurde geschlossen. Tippe nochmal und lass es offen.', 'auth')
  if (code === 'subject_does_not_exist' || code === 'item_does_not_exist' || code === 'ENOENT') return new CloudError('In deinem Puter-Konto liegt noch keine Sicherung.', 'none')
  return new CloudError('Der Abgleich hat nicht geklappt. Bist du online und bei Puter angemeldet?', 'network')
}

export interface CloudStatus {
  signedIn: boolean
  /** Gastkonten gelten nur für diesen Browser: Auf einem zweiten Gerät wäre es ein anderes Konto. */
  guest: boolean
  username?: string
}

export async function cloudStatus(load: CloudLoader = defaultLoader): Promise<CloudStatus> {
  try {
    const p = await load()
    if (!p.auth.isSignedIn()) return { signedIn: false, guest: false }
    const u = await p.auth.getUser?.().catch(() => undefined)
    return { signedIn: true, guest: u?.is_temp === true, username: u?.username }
  } catch {
    return { signedIn: false, guest: false }
  }
}

/** Anmeldefenster von Puter (Konto anlegen oder einloggen). Ein Gastkonto wird dafür vorher getrennt. Nur direkt aus einem Klick aufrufen. */
export async function cloudSignIn(load: CloudLoader = defaultLoader): Promise<CloudStatus> {
  try {
    const p = await load()
    const st = await cloudStatus(load)
    if (st.signedIn && st.guest) await p.auth.signOut?.()
    if (!p.auth.isSignedIn()) await p.auth.signIn()
    return await cloudStatus(load)
  } catch (e) {
    throw wrap(e)
  }
}

export async function cloudSave(json: string, load: CloudLoader = defaultLoader): Promise<Date> {
  try {
    const p = await load()
    if (!p.auth.isSignedIn()) throw new CloudError('Melde dich zuerst bei Puter an.', 'auth')
    await p.fs.write(FILE, json, { overwrite: true, createMissingParents: true })
    return new Date()
  } catch (e) {
    throw wrap(e)
  }
}

/** Liest die Sicherung aus dem Puter-Speicher. Prüft, dass es eine Studienfuchs-Datei ist, ehe sie irgendwo eingesetzt wird. */
export async function cloudLoad(load: CloudLoader = defaultLoader): Promise<{ json: string; modified?: Date }> {
  try {
    const p = await load()
    if (!p.auth.isSignedIn()) throw new CloudError('Melde dich zuerst bei Puter an.', 'auth')
    const blob = await p.fs.read(FILE)
    const json = await blob.text()
    let ok = false
    try {
      const parsed = JSON.parse(json)
      ok = (parsed?.app === 'studienfuchs' || parsed?.app === 'lernfuchs') && typeof parsed.data === 'object'
    } catch {
      ok = false
    }
    if (!ok) throw new CloudError('Die Datei in deinem Puter-Konto ist keine Studienfuchs-Sicherung.', 'format')
    const st = await p.fs.stat(FILE).catch(() => undefined)
    // Puter liefert die Zeit in Sekunden
    return { json, modified: st?.modified ? new Date(st.modified * 1000) : undefined }
  } catch (e) {
    throw wrap(e)
  }
}
