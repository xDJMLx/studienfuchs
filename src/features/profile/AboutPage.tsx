import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useId, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconChip } from '../../components/ui/controls'
import { Back, Camera, Chevron, Database, Hand, Info, Lock, Right, Shield, Sparkle, Speaker } from '../../components/ui/Icons'
import { EASE, Item, ItemLi, Stagger, StaggerList } from '../../components/ui/motion'
import { FREE_AI_URL } from '../../lib/freeAi'
import { hasLegalContact, LEGAL, PROJECT_URL } from '../../lib/legal'

/** Aufklappbarer Abschnitt mit weich gleitender Höhe. */
function Accordion({ title, icon, children, defaultOpen = false }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="border-b border-line last:border-0">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface">
        <IconChip size={36} tone={open ? 'brand' : 'muted'}>{icon}</IconChip>
        <span className="flex-1 font-semibold">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: EASE }} className="text-muted">
          <Chevron size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-2.5 px-5 pb-5 text-[15px] leading-relaxed text-muted sm:pl-[4.25rem]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const HIGHLIGHTS = [
  { Icon: Hand, title: 'Kein Konto', text: 'Kein Login, kein Tracking, keine Werbung. Wir bekommen keine Nutzerdaten.' },
  { Icon: Lock, title: 'Nur auf deinem Gerät', text: 'Fortschritt, Sets, Bücher und Tests bleiben im Speicher deines Browsers.' },
  { Icon: Sparkle, title: 'KI nur auf Klick', text: 'Daten gehen nur an eine KI, wenn du sie fragst oder einen Test oder eine Arbeit erstellen lässt.' },
]

export function AboutPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const location = useLocation()
  // Wer direkt hier landet, hat nichts "davor": dann zur Startseite
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <button type="button" onClick={goBack} className="mb-2 press -ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-muted hover:text-ink">
        <Back size={18} /> Zurück
      </button>

      <Stagger stagger={0.09}>
        <Item>
          <header className="mb-7 flex flex-col items-center text-center">
            <div className="relative mb-4">
              {!reduce && <span aria-hidden className="absolute inset-0 animate-halo rounded-3xl bg-brand/30" />}
              <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-[#ffb25e] text-on-brand shadow-[0_14px_30px_-12px_rgba(242,105,15,0.8)]">
                <Shield size={40} />
              </span>
            </div>
            <h1 className="page-title">Datenschutz & Impressum</h1>
            <p className="mt-1 max-w-md text-muted">Kurz und verständlich: Was diese App mit deinen Daten macht und was nicht.</p>
          </header>
        </Item>

        <Item>
          <StaggerList className="mb-7 grid gap-3 sm:grid-cols-3" stagger={0.08} delay={0.1}>
            {HIGHLIGHTS.map(({ Icon, title, text }) => (
              <ItemLi key={title} className="card flex items-start gap-4 p-4 sm:block">
                <IconChip size={40}><Icon size={22} /></IconChip>
                <div className="min-w-0">
                  <p className="font-semibold sm:mt-3">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted sm:mt-1">{text}</p>
                </div>
              </ItemLi>
            ))}
          </StaggerList>
        </Item>

        <Item>
          <h2 className="eyebrow mb-3 px-1">Alle Details</h2>
          <div className="card mb-7 overflow-hidden">
            <Accordion title="Speicherung und Löschen" icon={<Database size={20} />} defaultOpen>
              <p>Dein Fortschritt, deine Vokabel-Sets und die erkannten Texte deiner Bücher liegen <b className="text-ink">nur in deinem Browser</b> (lokaler Speicher). Es werden keine Nutzerdaten an uns übertragen.</p>
              <p>Unter <Link to="/settings" className="font-semibold text-brand-dark underline">Einstellungen → Daten</Link> kannst du alles sichern oder mit „Zurücksetzen“ vollständig von deinem Gerät löschen.</p>
            </Accordion>
            <Accordion title="Buchseiten und Texterkennung" icon={<Camera size={20} />}>
              <p>Hochgeladene Buchseiten werden mit der Offline-Texterkennung <b className="text-ink">auf deinem Gerät</b> gelesen. Die Bilder werden nicht gespeichert und nirgends hingeschickt. Im Tab Bücher bleibt nur der erkannte Text, und nur auf diesem Gerät. Die Bücher gehören dir und sind nicht Teil der App: Sie werden nicht geteilt und nicht ausgeliefert.</p>
              <p>Schriftarten und Texterkennung werden von dieser Seite selbst ausgeliefert, nicht von Drittanbietern.</p>
            </Accordion>
            <Accordion title="KI-Funktion (optional)" icon={<Sparkle size={20} />}>
              <p>Nur wenn du <b className="text-ink">„Mit KI erstellen“</b> oder <b className="text-ink">„Mit KI ergänzen“</b> klickst oder im <b className="text-ink">KI-Chat</b> eine Nachricht sendest, werden die ausgewählten Seitenbilder, Vokabeln bzw. deine Nachricht an eine KI-Plattform gesendet. Beim KI-Chat gehören dazu dein Lernstand (Klasse, Fortschritt, Klassenarbeits-Termine, Wörter, bei denen es hakt) und, wenn du Bücher angelegt hast, deren Titel, Kapitel, der Stand der Klasse und die zur Frage passenden Seitentexte, aber kein Name.</p>
              {FREE_AI_URL && (
                <p>Im KI-Chat gibt es zuerst eine <b className="text-ink">kostenlose KI ohne Anmeldung</b>. Sie läuft über ein kleines Relais zu den Gratis-Modellen von Kilo. Das Relais speichert nichts. Die Anbieter der Gratis-Modelle dürfen Eingaben aber mitlesen und zur Verbesserung ihrer Produkte nutzen. Schreibe dort also nichts Privates hinein. Fotos von Buchseiten gehen nicht an diese Stufe.</p>
              )}
              <p>{FREE_AI_URL ? 'Für Fotos und bessere Antworten' : 'Für die KI-Funktionen'} wird beim ersten Mal automatisch ein kostenloses Puter-Gastkonto in deinem Browser angelegt; es gelten die Datenschutzbestimmungen von Puter. Alternativ kannst du einen eigenen Anthropic-API-Schlüssel hinterlegen.</p>
              <p>Ohne diese Funktion (und mit der Offline-Texterkennung) verlässt nichts dein Gerät.</p>
            </Accordion>
            <Accordion title="Sprachausgabe" icon={<Speaker size={20} />}>
              <p>Die Sprachausgabe nutzt fertige Aufnahmen, die mit der App ausgeliefert werden. Es wird kein Text an einen Sprachdienst gesendet.</p>
              <p>Nur für eigene Sets ohne Aufnahme kann die Stimme deines Geräts einspringen; je nach Browser (z. B. Online-Stimmen) kann der Text dabei an den Browser-Hersteller gehen.</p>
            </Accordion>
            <Accordion title="Hosting" icon={<Info size={20} />}>
              <p>Gehostet wird die Seite bei GitHub Pages. Dabei verarbeitet GitHub technisch notwendige Server-Daten (z. B. die IP-Adresse) beim Aufruf der Seite.</p>
            </Accordion>
          </div>
        </Item>

        <Item>
          <h2 className="eyebrow mb-3 px-1">Impressum</h2>
          <section className="card mb-7 p-5">
            <p className="leading-relaxed text-muted">
              <b>Verantwortlich für den Inhalt:</b><br />
              {hasLegalContact() ? (
                <>
                  {LEGAL.name}<br />
                  {LEGAL.street}<br />
                  {LEGAL.city}<br />
                  E-Mail: <a className="font-semibold text-brand-dark underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a><br />
                </>
              ) : (
                <>
                  Studienfuchs, ein privates, nicht kommerzielles Lernprojekt ohne Werbung.<br />
                  Kontakt: über die <a className="font-semibold text-brand-dark underline" href={PROJECT_URL} target="_blank" rel="noreferrer">Projektseite auf GitHub</a>.<br />
                </>
              )}
              <br />
              <b>Haftungsausschluss:</b><br />
              Diese Lernapp wird ohne Gewähr bereitgestellt. Der Betreiber haftet nicht für Fehler in den Inhalten oder Lernmaterialien. Die App ist ein Bildungswerkzeug und ersetzt keine professionelle Unterweisung.
            </p>
          </section>
        </Item>

        <Item>
          <h2 className="eyebrow mb-3 px-1">Quellen und Hinweise</h2>
          <section className="card p-5">
            <dl className="grid gap-4 text-[15px] leading-relaxed">
              <div>
                <dt className="font-semibold">Stimme</dt>
                <dd className="text-muted">Piper-Sprachmodell „fr_FR-siwis-medium“, trainiert auf der SIWIS-Sprachdatenbank, Lizenz CC BY 4.0. Die Audiodateien wurden mit Piper (offline) erzeugt.</dd>
              </div>
              <div>
                <dt className="font-semibold">Technik</dt>
                <dd className="text-muted">Texterkennung: Tesseract.js (Apache-2.0). Schrift: Inter (SIL Open Font License).</dd>
              </div>
              <div>
                <dt className="font-semibold">Inhalte</dt>
                <dd className="text-muted">Die Beispiel-Lektionen sind eigene Texte und sollten fachlich gegen dein Schulbuch geprüft werden. Eigene Buchseiten sind urheberrechtlich geschützt und dienen nur privaten Lernzwecken.</dd>
              </div>
            </dl>
          </section>
        </Item>

        <Item>
          <Link to="/settings" className="card lift mt-7 flex items-center gap-3 p-4">
            <IconChip tone="muted"><Database size={20} /></IconChip>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Deine Daten verwalten</span>
              <span className="block text-sm text-muted">Sichern, importieren oder alles löschen</span>
            </span>
            <Right size={16} className="text-muted" />
          </Link>
        </Item>
      </Stagger>
    </div>
  )
}
