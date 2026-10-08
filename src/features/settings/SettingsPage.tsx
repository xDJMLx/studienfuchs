import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Mascot } from '../../components/mascot/Mascot'
import { Row, Section, Switch } from '../../components/ui/controls'
import { InstallHelp, useInstallFlow } from '../../components/ui/InstallApp'
import { Bug, Cards, Clock, Check, Database, Download, Gear, Right, Palette, Shield, Sparkle, Speaker, Star, Target, Upload } from '../../components/ui/Icons'
import { MascotPicker } from '../profile/MascotPicker'
import { FeedbackSettings } from './FeedbackSettings'
import { BackLink } from '../../components/ui/BackLink'
import { HelpSubjectIcon } from '../../components/ui/SubjectIcons'
import { PeriodsEditor } from '../../components/ui/PeriodsEditor'
import { EXAMPLE_PERIODS } from '../../lib/school'
import { activeDecks } from '../../lib/decks'
import { HELP_SUBJECTS } from '../../lib/subjects'
import { EASE, Item, Stagger, SPRING } from '../../components/ui/motion'
import { dayKey } from '../../lib/streak'
import { lastBackupText, markBackup, shareBackup } from '../../lib/backup'
import { CloudError, cloudEnable, cloudLoad, cloudSave, cloudSignIn, cloudStatus, type CloudStatus } from '../../lib/cloudSync'
import { enableAutoCloud } from '../../lib/autoCloud'
import { applyUpdate, BUILD_ID, checkForUpdate } from '../../lib/updates'
import { useStore } from '../../store/useStore'
import { SpeechSettings } from '../profile/SpeechSettings'
import { AiSettings } from './AiSettings'
import { useShallow } from 'zustand/react/shallow'

/** Lernzeit pro Tag, solange eine Arbeit ansteht (ohne Arbeit gibt es kein Tagesziel). */
const GOALS = [
  { min: 5, label: 'Locker', time: 'für kleine Arbeiten', bars: 1 },
  { min: 10, label: 'Normal', time: 'genau richtig für die meisten', bars: 2 },
  { min: 15, label: 'Ernsthaft', time: 'für wichtige Arbeiten', bars: 3 },
  { min: 20, label: 'Intensiv', time: 'wenn es knapp wird', bars: 4 },
]

const THEMES = [
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
  { id: 'system', label: 'Automatisch' },
] as const


/** Kleine Vorschau, wie die App im jeweiligen Farbschema aussieht (feste Farben, unabhängig vom aktuellen Schema). */
function ThemePreview({ kind }: { kind: 'light' | 'dark' | 'system' }) {
  const pane = (dark: boolean) => (
    <div className="h-full w-full p-2.5" style={{ background: dark ? '#111a20' : '#f4f5f7' }}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dark ? '#ff8a2a' : '#ff7a1a' }} />
        <span className="h-1.5 w-8 rounded" style={{ background: dark ? '#2d3d47' : '#e5e6eb' }} />
      </div>
      <div className="rounded-md p-1.5" style={{ background: dark ? '#19252d' : '#ffffff', boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,.08)' }}>
        <div className="mb-1 h-1.5 w-full rounded" style={{ background: dark ? '#2d3d47' : '#e5e6eb' }} />
        <div className="h-1.5 w-2/3 rounded" style={{ background: dark ? '#2d3d47' : '#e5e6eb' }} />
      </div>
      <div className="mt-2 h-3 w-12 rounded-md" style={{ background: dark ? '#ff8a2a' : '#ff7a1a' }} />
    </div>
  )
  if (kind === 'system') {
    return (
      <div className="relative h-full w-full">
        {pane(false)}
        <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>{pane(true)}</div>
      </div>
    )
  }
  return pane(kind === 'dark')
}

/** Die Bereiche der Einstellungen, in Gruppen wie in einer Liste. */
const GROUPS: { title: string; rows: { slug: string; id: string; label: string; text: string; Icon: (p: { size?: number }) => React.ReactNode }[] }[] = [
  {
    title: 'Du',
    rows: [{ slug: 'tier', id: 's-tier', label: 'Dein Lerntier', text: 'Fuchs, Elefant, Giraffe und mehr', Icon: Star }],
  },
  {
    title: 'Schule',
    rows: [
      { slug: 'faecher', id: 's-subjects', label: 'Meine Fächer', text: 'Welche Fächer du hast', Icon: Cards },
      { slug: 'schulzeiten', id: 's-hours', label: 'Schulzeiten', text: 'Stunden und Pausen', Icon: Clock },
    ],
  },
  {
    title: 'Lernen',
    rows: [
      { slug: 'lernen', id: 's-learn', label: 'Lernzeit', text: 'Minuten pro Tag bei einer Arbeit', Icon: Target },
      { slug: 'ki', id: 's-ai', label: 'KI', text: 'Anmeldung und eigener Schlüssel', Icon: Sparkle },
      { slug: 'sprache', id: 's-voice', label: 'Vorlesen', text: 'Stimme und Aussprache', Icon: Speaker },
    ],
  },
  {
    title: 'App',
    rows: [
      { slug: 'darstellung', id: 's-look', label: 'Darstellung', text: 'Hell, Dunkel und Töne', Icon: Palette },
      { slug: 'app', id: 's-app', label: 'Installieren und Updates', text: 'Auf den Startbildschirm', Icon: Download },
      { slug: 'daten', id: 's-data', label: 'Daten und Sicherung', text: 'Sichern, laden, zwischen Geräten abgleichen', Icon: Database },
    ],
  },
  {
    title: 'Hilfe',
    rows: [{ slug: 'feedback', id: 's-feedback', label: 'Fehler melden und Ideen', text: 'Etwas kaputt oder fehlt dir etwas?', Icon: Bug }],
  },
]
const SLUGS = GROUPS.flatMap((g) => g.rows.map((r) => r.slug))

function SettingsList() {
  return (
    <div className="mb-8 grid gap-6">
      {GROUPS.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="mb-2 px-1 text-sm font-bold text-muted">{g.title}</h2>
          <ul className="overflow-hidden rounded-2xl border border-ink/10 bg-surface">
            {g.rows.map((r, i) => (
              <li key={r.slug} className={i > 0 ? 'border-t border-ink/10' : ''}>
                <Link to={`/settings/${r.slug}`} className="press flex min-h-14 items-center gap-3.5 px-4 py-2.5 hover:bg-snow">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                    <r.Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{r.label}</span>
                    <span className="block text-sm text-muted">{r.text}</span>
                  </span>
                  <Right size={14} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function SettingsPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const setOnboarded = useStore((s) => s.setOnboarded)
  const mySubjects = useStore((s) => s.mySubjects)
  const toggleSubject = useStore((s) => s.toggleSubject)
  const addedUnits = useStore((s) => s.addedUnits)
  const schoolPeriods = useStore((s) => s.schoolPeriods) ?? []
  const setSchoolPeriods = useStore((s) => s.setSchoolPeriods)
  // Beim Tippen bleiben unvollständige Zeilen stehen; gespeichert wird die geprüfte Fassung
  const [periodsDraft, setPeriodsDraft] = useState(() => (schoolPeriods.length ? schoolPeriods : EXAMPLE_PERIODS.slice(0, 0)))
  const { theme, setTheme, dailyMinutes, setDailyMinutes, soundOn, setSoundOn, exportData, importData, resetAll, cards, sets } = useStore(useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme, dailyMinutes: s.dailyMinutes, setDailyMinutes: s.setDailyMinutes, soundOn: s.soundOn, setSoundOn: s.setSoundOn, exportData: s.exportData, importData: s.importData, resetAll: s.resetAll, cards: s.cards, sets: s.sets })))
  const fileRef = useRef<HTMLInputElement>(null)
  const install = useInstallFlow()
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const { section } = useParams()
  const current = section && SLUGS.includes(section) ? section : undefined

  // Meldung nach ein paar Sekunden wieder ausblenden
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3800)
    return () => window.clearTimeout(t)
  }, [toast])

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `studienfuchs-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    markBackup()
    setBackupInfo(lastBackupText())
    setToast({ ok: true, text: 'Sicherung wurde heruntergeladen.' })
  }

  // Abgleich über das eigene Puter-Konto (nur auf Knopfdruck)
  const [cloud, setCloud] = useState<CloudStatus | null>(null)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudPending, setCloudPending] = useState<{ json: string; modified?: Date } | null>(null)
  useEffect(() => {
    let alive = true
    void cloudStatus().then((st) => alive && setCloud(st))
    return () => {
      alive = false
    }
  }, [])
  const cloudRun = async (job: () => Promise<void>) => {
    setCloudBusy(true)
    try {
      await job()
    } catch (e) {
      setToast({ ok: false, text: e instanceof CloudError ? e.message : 'Der Abgleich hat nicht geklappt.' })
    } finally {
      setCloudBusy(false)
    }
  }
  const cloudLogin = () =>
    cloudRun(async () => {
      const st = await cloudSignIn()
      setCloud(st)
      setToast({ ok: true, text: st.username ? `Angemeldet als ${st.username}.` : 'Angemeldet.' })
    })
  const cloudUp = () =>
    cloudRun(async () => {
      await cloudSave(exportData())
      markBackup()
      setBackupInfo(lastBackupText())
      setToast({ ok: true, text: 'In deinem Puter-Konto gesichert.' })
    })
  // Ein Tipp: Gastkonto anlegen und gleich die erste Sicherung machen
  const cloudStart = () =>
    cloudRun(async () => {
      const st = await cloudEnable()
      setCloud(st)
      await cloudSave(exportData())
      markBackup()
      setBackupInfo(lastBackupText())
      enableAutoCloud()
      setToast({ ok: true, text: 'Sicherung ist an. Die App sichert von nun an von selbst.' })
    })
  const cloudDown = () => cloudRun(async () => setCloudPending(await cloudLoad()))
  const cloudApply = () => {
    if (!cloudPending) return
    try {
      importData(cloudPending.json)
      setToast({ ok: true, text: 'Fortschritt aus deinem Puter-Konto geladen.' })
    } catch {
      setToast({ ok: false, text: 'Die Sicherung konnte nicht geladen werden.' })
    }
    setCloudPending(null)
  }

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [backupInfo, setBackupInfo] = useState(lastBackupText())
  const doShare = async () => {
    const r = await shareBackup(exportData())
    setBackupInfo(lastBackupText())
    if (r !== 'cancelled') setToast({ ok: true, text: r === 'shared' ? 'Sicherung geteilt.' : 'Sicherung wurde heruntergeladen.' })
  }
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData())
      setToast({ ok: true, text: 'Sicherungstext kopiert. Füge ihn auf dem neuen Gerät unter „Aus Text laden“ ein.' })
    } catch {
      setToast({ ok: false, text: 'Kopieren hat nicht geklappt.' })
    }
  }
  const doPaste = () => {
    try {
      importData(pasted.trim())
      setPasted('')
      setPasteOpen(false)
      setToast({ ok: true, text: 'Fortschritt geladen.' })
    } catch (e) {
      setToast({ ok: false, text: e instanceof Error ? e.message : 'Der Text ist keine gültige Sicherung.' })
    }
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      importData(await file.text())
      setToast({ ok: true, text: 'Fortschritt importiert.' })
    } catch (e) {
      setToast({ ok: false, text: e instanceof Error ? e.message : 'Import fehlgeschlagen.' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-6 lg:pt-8">
      {current ? (
        <BackLink to="/settings" label="Einstellungen" size={18} />
      ) : (
        <div className="mb-6 flex items-center gap-4">
          <motion.div initial={reduce ? false : { rotate: -30, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={SPRING.bouncy} className="flex h-12 w-12 items-center justify-center text-brand-dark">
            <Gear size={28} />
          </motion.div>
          <h1 className="page-title">Einstellungen</h1>
        </div>
      )}

      <div>
        {!current && <SettingsList />}
        <Stagger className="grid gap-8" stagger={0.09}>
{current === 'faecher' && (
          <Item>
            <Section id="s-subjects" icon={<Cards size={22} />} title="Meine Fächer" description="Die Fächer, die du in der Schule hast">
              <div className="px-5 py-4">
                <p className="mb-3 text-sm text-muted">Tipp ein Fach an, um es hinzuzufügen oder wegzunehmen. Fächer, in denen schon Karteikarten liegen, bleiben, bis du die Karteikarten löschst.</p>
                <ul className="flex flex-wrap gap-2" aria-label="Fächer">
                  {HELP_SUBJECTS.map((sub) => {
                    const hasCards = activeDecks({ sets, addedUnits: addedUnits ?? [] }).some((d) => d.subject === sub.id)
                    const on = hasCards || (mySubjects ?? []).includes(sub.id)
                    return (
                      <li key={sub.id}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={sub.name}
                          disabled={hasCards}
                          onClick={() => toggleSubject(sub.id)}
                          className={`press flex min-h-11 items-center gap-2 rounded-2xl border-2 py-1.5 pl-1.5 pr-3 text-[14px] font-extrabold transition-colors disabled:opacity-100 ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface text-muted'}`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: sub.c, opacity: on ? 1 : 0.55 }}>
                            <HelpSubjectIcon id={sub.id} ink={sub.c} size={20} />
                          </span>
                          {sub.name}
                          {on && <Check size={14} />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Section>
          </Item>
          )}

         {current === 'schulzeiten' && (
          <Item>
            <Section id="s-hours" icon={<Target size={22} />} title="Schulzeiten" description="Stunden und Pausen für den Kalender">
              <div className="px-5 py-4">
                <p className="mb-3 text-sm text-muted">Trag ein, wann deine Stunden anfangen und enden. Die Lücken dazwischen sind die Pausen. Der Kalender zeigt dann „3. Stunde“ statt einer Uhrzeit.</p>
                <PeriodsEditor
                  value={periodsDraft}
                  onChange={(l) => {
                    setPeriodsDraft(l)
                    setSchoolPeriods(l)
                  }}
                />
              </div>
            </Section>
          </Item>
          )}

         {current === 'feedback' && (
          <Item>
            <Section id="s-feedback" icon={<Bug size={22} />} title="Fehler melden und Ideen" description="Sag, was nicht klappt oder was du dir wünschst">
              <FeedbackSettings />
            </Section>
          </Item>
          )}

         {current === 'tier' && (
          <Item>
            <Section id="s-tier" icon={<Star size={22} />} title="Dein Lerntier" description="Wer dich beim Lernen begleitet">
              <div className="px-5 py-4">
                <MascotPicker />
              </div>
            </Section>
          </Item>
          )}

         {current === 'darstellung' && (
          <Item>
            <Section id="s-look" icon={<Palette size={22} />} title="Darstellung" description="Farben und Töne">
              <div className="px-5 py-4">
                <p className="mb-3 font-medium">Farbschema</p>
                <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Farbschema">
                  {THEMES.map((t) => {
                    const on = theme === t.id
                    return (
                      <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setTheme(t.id)} className="press group text-left">
                        <span className={`relative block aspect-[5/4] overflow-hidden rounded-xl border-2 transition-all duration-300 ${on ? 'border-brand shadow-[0_0_0_3px_var(--brand-soft)]' : 'border-line group-hover:border-muted/50'}`}>
                          <ThemePreview kind={t.id} />
                          <AnimatePresence>
                            {on && (
                              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING.bouncy} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-on-brand">
                                <Check size={12} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                        <span className={`mt-2 block text-center text-sm font-medium ${on ? 'text-brand-dark' : 'text-muted'}`}>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <Row title="Töne und Vibration" hint="Kurze Signale bei richtig, falsch und am Ende einer Lektion; auf dem Handy auch ein kurzes Vibrieren.">
                <Switch checked={soundOn} onChange={setSoundOn} label="Töne" />
              </Row>
            </Section>
          </Item>
          )}

         {current === 'lernen' && (
          <Item>
            <Section id="s-learn" icon={<Target size={22} />} title="Lernen" description="Lernzeit für Arbeiten">
              <div className="px-5 py-4">
                <p className="font-medium">Minuten pro Tag, wenn eine Arbeit ansteht</p>
                <p className="mb-3 text-sm text-muted">Solange du eine Arbeit mit Karteikarten eingetragen hast, zeigt dir die Startseite jeden Tag, wie viele Minuten noch fehlen. Ohne Arbeit gibt es kein Tagesziel: Dann übst du, wann du willst.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Minuten pro Tag">
                  {GOALS.map((g) => {
                    const on = dailyMinutes === g.min
                    return (
                      <motion.button
                        key={g.min}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setDailyMinutes(g.min)}
                        whileTap={{ scale: 0.96 }}
                        className={`relative rounded-xl border-2 px-3 py-3 text-left transition-colors duration-300 ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-snow'}`}
                      >
                        <span className="mb-2 flex items-end gap-[3px]" aria-hidden>
                          {[0, 1, 2, 3].map((i) => (
                            <motion.span key={i} className={`w-1.5 rounded-sm ${i < g.bars ? (on ? 'bg-brand' : 'bg-muted/50') : 'bg-line'}`} animate={{ height: 6 + i * 4 }} />
                          ))}
                        </span>
                        <span className={`block font-semibold ${on ? 'text-brand-dark' : ''}`}>{g.label}</span>
                        <span className="block text-xs font-bold text-muted">{g.min} Min.</span>
                        <span className="block text-xs text-muted">{g.time}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </Section>
          </Item>
          )}

         {current === 'sprache' && (
          <Item>
            <Section id="s-voice" icon={<Speaker size={22} />} title="Sprache" description="Vorlesen und Aussprache">
              <SpeechSettings />
            </Section>
          </Item>
          )}

         {current === 'ki' && (
          <Item>
            <Section id="s-ai" icon={<Sparkle size={22} />} title="KI" description="Lernkarten aus deinen Buchseiten">
              <AiSettings />
            </Section>
          </Item>
          )}

         {current === 'app' && (
          <Item>
            <Section id="s-app" icon={<Download size={22} />} title="App" description="Auf dem Startbildschirm">
              <Row title="Als App installieren" hint={install.state === 'installed' ? 'Studienfuchs läuft schon als App auf diesem Gerät.' : 'Öffnet sich wie eine normale App, ohne Adressleiste und mit eigenem Symbol.'}>
                {install.state === 'installed' ? (
                  <span className="flex items-center gap-1 text-sm font-semibold text-good-dark"><Check size={16} /> Installiert</span>
                ) : (
                  <button className="btn btn-primary press !px-4 !py-2 !text-sm" onClick={install.start}><Download size={16} /> Installieren</button>
                )}
              </Row>
              <Row title="Version" hint={`Stand: ${BUILD_ID === 'dev' ? 'Entwicklung' : new Date(BUILD_ID).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`}>
                <button
                  className="btn btn-ghost press !px-4 !py-2 !text-sm"
                  onClick={async () => {
                    setToast({ ok: true, text: 'Suche nach Updates …' })
                    if (await checkForUpdate()) await applyUpdate()
                    else setToast({ ok: true, text: 'Du hast schon die neueste Version.' })
                  }}
                >
                  Nach Updates suchen
                </button>
              </Row>
              <InstallHelp open={install.help} onClose={install.closeHelp} />
            </Section>
          </Item>
          )}

         {current === 'daten' && (
          <Item>
            <Section id="s-data" icon={<Database size={22} />} title="Daten" description="Alles liegt nur auf diesem Gerät">
              <Row title="Gespeichert auf diesem Gerät" hint={`${Object.keys(cards).length} geübte Karten · ${sets.length} ${sets.length === 1 ? 'Sammlung' : 'Sammlungen'}`} />
              <Row title="Fortschritt sichern" hint="Exportiere eine Sicherung oder lade eine ein, z. B. für ein neues Gerät.">
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={doExport}><Download size={16} /> Exportieren</button>
                  <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importieren</button>
                  <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />
                </div>
              </Row>
              <Row title="Aufs neue Handy" hint={`So geht dein Fortschritt mit: Sicherung teilen (z. B. per AirDrop oder Nachricht) und dort laden. Zuletzt: ${backupInfo}.`}>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary press !px-4 !py-2 !text-sm" onClick={doShare}><Upload size={16} /> Sicherung teilen</button>
                  <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={doCopy}>Text kopieren</button>
                  <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={() => setPasteOpen((o) => !o)} aria-expanded={pasteOpen}>Aus Text laden</button>
                </div>
              </Row>
              <Row
                title="Online sichern"
                hint={
                  cloud?.signedIn
                    ? cloud.guest
                      ? 'Dein Fortschritt liegt in einem kostenlosen Puter-Gastkonto und wird von selbst gesichert. Das Gastkonto gilt nur für diesen Browser.'
                      : `Mit deinem Puter-Konto${cloud.username ? ` (${cloud.username})` : ''}: Auf dem einen Gerät sichern, auf dem anderen holen.`
                    : 'Ein Tipp, kein Passwort: Die App sichert deinen Fortschritt von selbst in einem kostenlosen Puter-Gastkonto.'
                }
              >
                <div className="flex flex-wrap gap-2">
                  {cloud?.signedIn ? (
                    <>
                      <button className="btn btn-primary press !px-4 !py-2 !text-sm" disabled={cloudBusy} onClick={cloudUp}>Jetzt sichern</button>
                      <button className="btn btn-ghost press !px-4 !py-2 !text-sm" disabled={cloudBusy} onClick={cloudDown}>Von Puter holen</button>
                    </>
                  ) : (
                    <button className="btn btn-primary press !px-4 !py-2 !text-sm" disabled={cloudBusy} onClick={cloudStart}>Sicherung einschalten</button>
                  )}
                </div>
                {(!cloud?.signedIn || cloud.guest) && (
                  <button className="press mt-2 min-h-9 rounded-xl text-sm font-extrabold text-sky-dark" disabled={cloudBusy} onClick={cloudLogin}>
                    Auf mehreren Geräten? Mit eigenem Puter-Konto anmelden
                  </button>
                )}
              </Row>
              {cloudPending && (
                <div className="grid gap-2 border-t border-line px-5 py-4" role="alertdialog" aria-label="Sicherung aus Puter laden">
                  <p className="text-sm">
                    Sicherung aus deinem Puter-Konto{cloudPending.modified ? ` vom ${cloudPending.modified.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}` : ''} laden? <b>Dein Fortschritt auf diesem Gerät wird dadurch ersetzt.</b>
                  </p>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={() => setCloudPending(null)}>Abbrechen</button>
                    <button className="btn btn-primary press !px-4 !py-2 !text-sm" onClick={cloudApply}>Ja, ersetzen</button>
                  </div>
                </div>
              )}
              {pasteOpen && (
                <div className="grid gap-2 border-t border-line px-5 py-4">
                  <label htmlFor="paste" className="text-sm font-medium">Sicherungstext hier einfügen</label>
                  <textarea id="paste" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} placeholder='{"app":"studienfuchs", …}' className="w-full rounded-xl border border-line bg-snow p-3 font-mono text-xs outline-none focus:border-brand" />
                  <button className="btn btn-primary press w-full sm:w-auto" disabled={!pasted.trim()} onClick={doPaste}>Fortschritt laden</button>
                </div>
              )}
              <Row title="Alles zurücksetzen" hint="Löscht Fortschritt, Sets und Einstellungen auf diesem Gerät.">
                <AnimatePresence mode="wait" initial={false}>
                  {confirmReset ? (
                    <motion.div key="sure" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease: EASE }} className="flex gap-2">
                      <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={() => setConfirmReset(false)}>Abbrechen</button>
                      <button
                        className="btn btn-bad press !px-4 !py-2 !text-sm"
                        onClick={() => {
                          resetAll()
                          setConfirmReset(false)
                          setToast({ ok: true, text: 'Alles zurückgesetzt.' })
                        }}
                      >
                        Wirklich löschen
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button key="ask" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease: EASE }} className="btn btn-ghost press !px-4 !py-2 !text-sm !text-bad-dark" onClick={() => setConfirmReset(true)}>
                      Zurücksetzen
                    </motion.button>
                  )}
                </AnimatePresence>
              </Row>
            </Section>
          </Item>
          )}

          {!current && (
            <>
          <Item>
            <Link to="/about" className="card lift flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"><Shield size={22} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Datenschutz & Impressum</span>
                <span className="block text-sm text-muted">Was die App speichert und was nicht</span>
              </span>
              <Mascot size={34} />
            </Link>
          </Item>

          <Item>
            <button
              type="button"
              className="card lift flex w-full items-center gap-4 p-4 text-left"
              onClick={() => {
                setOnboarded(false)
                navigate('/welcome')
              }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"><Mascot size={28} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Einführung noch einmal ansehen</span>
                <span className="block text-sm text-muted">Willkommen-Seite und Einrichtung. Dein Fortschritt bleibt.</span>
              </span>
            </button>
          </Item>
            </>
          )}
        </Stagger>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={SPRING.snappy}
            role="status"
            className={`above-tabbar fixed left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl ${toast.ok ? 'bg-ink text-surface' : 'bg-bad text-white'}`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
