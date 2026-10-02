import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { grades } from '../../content'
import { Mascot } from '../../components/mascot/Mascot'
import { Row, Section, Segmented, Switch } from '../../components/ui/controls'
import { InstallHelp, useInstallFlow } from '../../components/ui/InstallApp'
import { Check, Database, Download, Gear, Palette, Shield, Sparkle, Speaker, Target, Upload } from '../../components/ui/Icons'
import { EASE, Item, Stagger, SPRING } from '../../components/ui/motion'
import { dayKey } from '../../lib/streak'
import { applyUpdate, BUILD_ID, checkForUpdate } from '../../lib/updates'
import { useStore } from '../../store/useStore'
import { SpeechSettings } from '../profile/SpeechSettings'
import { AiSettings } from './AiSettings'

const GOALS = [
  { xp: 10, label: 'Locker', time: '5 Min. am Tag', bars: 1 },
  { xp: 20, label: 'Normal', time: '10 Min. am Tag', bars: 2 },
  { xp: 30, label: 'Ernsthaft', time: '15 Min. am Tag', bars: 3 },
  { xp: 50, label: 'Intensiv', time: '20+ Min. am Tag', bars: 4 },
]

const THEMES = [
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
  { id: 'system', label: 'Automatisch' },
] as const

const SECTIONS = [
  { id: 's-look', label: 'Darstellung', Icon: Palette },
  { id: 's-learn', label: 'Lernen', Icon: Target },
  { id: 's-voice', label: 'Sprache', Icon: Speaker },
  { id: 's-ai', label: 'KI', Icon: Sparkle },
  { id: 's-app', label: 'App', Icon: Download },
  { id: 's-data', label: 'Daten', Icon: Database },
]

/** Kleine Vorschau, wie die App im jeweiligen Farbschema aussieht (feste Farben, unabhängig vom aktuellen Schema). */
function ThemePreview({ kind }: { kind: 'light' | 'dark' | 'system' }) {
  const pane = (dark: boolean) => (
    <div className="h-full w-full p-2.5" style={{ background: dark ? '#0d0e11' : '#f6f6f7' }}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: dark ? '#ff7a24' : '#f2690f' }} />
        <span className="h-1.5 w-8 rounded" style={{ background: dark ? '#292c34' : '#e7e7ea' }} />
      </div>
      <div className="rounded-md p-1.5" style={{ background: dark ? '#17181d' : '#ffffff', boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,.08)' }}>
        <div className="mb-1 h-1.5 w-full rounded" style={{ background: dark ? '#292c34' : '#e7e7ea' }} />
        <div className="h-1.5 w-2/3 rounded" style={{ background: dark ? '#292c34' : '#e7e7ea' }} />
      </div>
      <div className="mt-2 h-3 w-12 rounded-md" style={{ background: dark ? '#ff7a24' : '#f2690f' }} />
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

export function SettingsPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const setOnboarded = useStore((s) => s.setOnboarded)
  const { theme, setTheme, dailyGoal, setDailyGoal, soundOn, setSoundOn, grade, setGrade, exportData, importData, resetAll, lessons, cards, sets } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const install = useInstallFlow()
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [active, setActive] = useState(SECTIONS[0].id)

  // Meldung nach ein paar Sekunden wieder ausblenden
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3800)
    return () => window.clearTimeout(t)
  }, [toast])

  // Welcher Abschnitt ist gerade sichtbar? (für die Seitennavigation)
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  const go = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `studienfuchs-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setToast({ ok: true, text: 'Sicherung wurde heruntergeladen.' })
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
      <div className="mb-7 flex items-center gap-4">
        <motion.div initial={reduce ? false : { rotate: -30, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={SPRING.bouncy} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
          <motion.span animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} className="flex">
            <Gear size={30} />
          </motion.span>
        </motion.div>
        <div>
          <h1 className="page-title">Einstellungen</h1>
          <p className="text-muted">Mach die App zu deiner.</p>
        </div>
      </div>

      {/* Schnellsprung: bleibt beim Scrollen oben kleben */}
      <nav aria-label="Abschnitte" className="sticky top-0 z-10 -mx-4 mb-6 bg-page/90 px-4 py-2 backdrop-blur">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {SECTIONS.map(({ id, label, Icon }) => (
            <li key={id} className="shrink-0">
              <button type="button" onClick={() => go(id)} className={`press relative flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${active === id ? 'border-transparent text-brand-dark' : 'border-line text-muted hover:bg-snow hover:text-ink'}`}>
                {active === id && <motion.span layoutId="settings-nav" className="absolute inset-0 rounded-full bg-brand-soft ring-1 ring-brand/40" transition={SPRING.snappy} />}
                <span className="relative"><Icon size={16} /></span>
                <span className="relative">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <Stagger className="grid gap-8" stagger={0.09}>
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
              <Row title="Töne" hint="Kurze Signale bei richtig, falsch und am Ende einer Lektion.">
                <Switch checked={soundOn} onChange={setSoundOn} label="Töne" />
              </Row>
            </Section>
          </Item>

          <Item>
            <Section id="s-learn" icon={<Target size={22} />} title="Lernen" description="Ziel und Klassenstufe">
              <div className="px-5 py-4">
                <p className="font-medium">Mindestziel pro Tag</p>
                <p className="mb-3 text-sm text-muted">Das ist dein Minimum. Erreichst du es, setzt die App heute ein Bonusziel (je +10 XP, z. B. 20 → 30 → 40). Morgen gilt wieder dein Mindestziel.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Tagesziel in XP">
                  {GOALS.map((g) => {
                    const on = dailyGoal === g.xp
                    return (
                      <motion.button
                        key={g.xp}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setDailyGoal(g.xp)}
                        whileTap={{ scale: 0.96 }}
                        className={`relative rounded-xl border-2 px-3 py-3 text-left transition-colors duration-300 ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-snow'}`}
                      >
                        <span className="mb-2 flex items-end gap-[3px]" aria-hidden>
                          {[0, 1, 2, 3].map((i) => (
                            <motion.span key={i} className={`w-1.5 rounded-sm ${i < g.bars ? (on ? 'bg-brand' : 'bg-muted/50') : 'bg-line'}`} animate={{ height: 6 + i * 4 }} />
                          ))}
                        </span>
                        <span className={`block font-semibold ${on ? 'text-brand-dark' : ''}`}>{g.label}</span>
                        <span className="block text-xs text-muted">{g.xp} XP</span>
                        <span className="block text-xs text-muted">{g.time}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
              <Row title="Klassenstufe" hint="Bestimmt deinen Lernpfad. Fortschritt in anderen Klassen bleibt erhalten.">
                <Segmented value={grade} onChange={setGrade} label="Klassenstufe" options={grades.map((g) => ({ value: g, label: `Kl. ${g}` }))} />
              </Row>
            </Section>
          </Item>

          <Item>
            <Section id="s-voice" icon={<Speaker size={22} />} title="Sprache" description="Vorlesen und Aussprache">
              <SpeechSettings />
            </Section>
          </Item>

          <Item>
            <Section id="s-ai" icon={<Sparkle size={22} />} title="KI" description="Lernkarten aus deinen Buchseiten">
              <AiSettings />
            </Section>
          </Item>

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
            </Section>
            <InstallHelp open={install.help} onClose={install.closeHelp} />
          </Item>

          <Item>
            <Section id="s-data" icon={<Database size={22} />} title="Daten" description="Alles liegt nur auf diesem Gerät">
              <Row title="Gespeichert auf diesem Gerät" hint={`${Object.keys(lessons).length} Lektionen · ${Object.keys(cards).length} gelernte Wörter · ${sets.length} ${sets.length === 1 ? 'Set' : 'Sets'}`} />
              <Row title="Fortschritt sichern" hint="Exportiere eine Sicherung oder lade eine ein, z. B. für ein neues Gerät.">
                <div className="flex gap-2">
                  <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={doExport}><Download size={16} /> Exportieren</button>
                  <button className="btn btn-ghost press !px-4 !py-2 !text-sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importieren</button>
                  <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />
                </div>
              </Row>
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

          <Item>
            <Link to="/about" className="card lift flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-snow text-muted"><Shield size={22} /></span>
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
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-snow text-muted"><Mascot size={28} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Einführung noch einmal ansehen</span>
                <span className="block text-sm text-muted">Willkommen-Seite und Einrichtung. Dein Fortschritt bleibt.</span>
              </span>
            </button>
          </Item>
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
