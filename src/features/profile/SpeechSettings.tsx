import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Switch, Row } from '../../components/ui/controls'
import { Speaker } from '../../components/ui/Icons'
import { EASE } from '../../components/ui/motion'
import { recognitionAvailable } from '../../lib/recognition'
import { frenchVoices, loadAudioIndex, speak, speechAvailable } from '../../lib/speech'
import { useStore } from '../../store/useStore'

/** Stimmen laden in vielen Browsern erst nach dem Start – daher auf "voiceschanged" hören. */
function useVoices() {
  const [voices, setVoices] = useState(frenchVoices)
  useEffect(() => {
    if (!speechAvailable) return
    const update = () => setVoices(frenchVoices())
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

/** Kleine Schallwellen, die beim Abspielen tanzen. */
function Waves({ active }: { active: boolean }) {
  const reduce = useReducedMotion()
  return (
    <span className="flex h-5 items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-current"
          animate={active && !reduce ? { height: [6, 18, 8, 16, 6] } : { height: 6 }}
          transition={active ? { duration: 0.9, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' } : { duration: 0.2 }}
        />
      ))}
    </span>
  )
}

/** Zeilen für die Karte "Sprache" in den Einstellungen. */
export function SpeechSettings() {
  const { speechOn, voiceName, speechRate, speakingOn, setSpeech } = useStore()
  const voices = useVoices()
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    void loadAudioIndex()
    return () => window.clearTimeout(timer.current)
  }, [])

  const test = () => {
    speak('Bonjour ! Comment ça va ? Je voudrais une baguette, s’il vous plaît.')
    setPlaying(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPlaying(false), 4200)
  }

  return (
    <>
      <Row title="Französisch vorlesen" hint="Du hörst die Studienfuchs-Stimme: fertige Aufnahmen, die auf jedem Gerät gleich klingen. Nur für eigene Sets ohne Aufnahme springt die Stimme deines Geräts ein.">
        <Switch checked={speechOn} onChange={(v) => setSpeech({ speechOn: v })} label="Französisch vorlesen" />
      </Row>
      <Row
        title="Sprechübungen"
        hint={recognitionAvailable ? 'Du sprichst Wörter nach, dein Browser hört über das Mikrofon zu.' : 'In diesem Browser nicht verfügbar (nutzbar z. B. in Chrome, Edge oder Safari).'}
      >
        <Switch checked={speakingOn && recognitionAvailable} disabled={!recognitionAvailable} onChange={(v) => setSpeech({ speakingOn: v })} label="Sprechübungen" />
      </Row>

      <AnimatePresence initial={false}>
        {speechOn && (
          <motion.div key="voice" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-5 px-5 py-4">
              <div>
                <label htmlFor="voice" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Stimme</label>
                <select
                  id="voice"
                  value={voiceName}
                  onChange={(e) => {
                    setSpeech({ voiceName: e.target.value })
                    setTimeout(test, 50)
                  }}
                  className="w-full rounded-xl border border-line bg-snow px-3 py-2.5 font-medium outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]"
                >
                  <option value="">Studienfuchs-Stimme (empfohlen)</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      Gerät: {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rate" className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                  <span>Geschwindigkeit</span>
                  <span className="text-ink">{Math.round(speechRate * 100)} %</span>
                </label>
                <input id="rate" type="range" min={0.5} max={1.2} step={0.05} value={speechRate} onChange={(e) => setSpeech({ speechRate: Number(e.target.value) })} className="range" />
                <div className="mt-1 flex justify-between text-[11px] text-muted">
                  <span>langsam</span>
                  <span>normal</span>
                </div>
              </div>

              <button type="button" className="btn btn-ghost press justify-self-start !px-4 !py-2.5 !text-sm" onClick={test}>
                {playing ? <Waves active /> : <Speaker size={18} />}
                Stimme testen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
