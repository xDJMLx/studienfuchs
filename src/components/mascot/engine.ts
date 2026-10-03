import { BLINK_TOTAL, EYE_OPEN, blinkClosed, blinked, eyeTarget, stepEye, type EyeParams } from './eye'
import { NEUTRAL, type Look } from './look'
import { MOUTHS, stepMouth, type MouthParams } from './mouth'
import { spring, stepBallistic, stepSpring, type Ballistic, type Spring } from './spring'

/**
 * Das Gerüst des Fuchses: Kopf, Ohren, Arme, Schwanz, Augen und Mund sind Federn bzw. Zahlenformen, die Ziele aus der
 * Pose bekommen. Dazu kommen die Dinge, die ein Lebewesen ausmachen: Atmen, Blinzeln, kleine Blickwechsel, Nachschwingen
 * der Ohren, wenn der Kopf sich dreht, ein Sprung als Flugbahn mit Zusammenstauchen beim Landen.
 * Reine Rechnung ohne DOM: Die Zeichnung liest nur `out`.
 */
export interface FoxOut {
  vars: Record<string, number>
  eyeL: EyeParams
  eyeR: EyeParams
  mouth: MouthParams
}

type Name = 'headRot' | 'headY' | 'headX' | 'earL' | 'earR' | 'armL' | 'armR' | 'tail' | 'bodyRot' | 'squash' | 'gazeX' | 'gazeY' | 'browLY' | 'browLR' | 'browRY' | 'browRR'

// k = Steifigkeit, c = Dämpfung: Ohren und Schwanz schwingen kräftig nach, Blick und Brauen sind straff
const TUNING: Record<Name, [number, number, number]> = {
  headRot: [140, 14, 0],
  headY: [170, 17, 0],
  headX: [70, 12, 0],
  earL: [230, 10, 0],
  earR: [230, 10, 0],
  armL: [170, 12, 0],
  armR: [170, 12, 0],
  tail: [80, 5, 0],
  bodyRot: [120, 10, 0],
  squash: [320, 15, 1],
  gazeX: [520, 30, 0],
  gazeY: [520, 30, 0],
  browLY: [280, 18, 0],
  browLR: [280, 18, 0],
  browRY: [280, 18, 0],
  browRR: [280, 18, 0],
}

const NAMES = Object.keys(TUNING) as Name[]
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const r2 = (n: number) => Math.round(n * 100) / 100

export interface EngineOptions {
  /** Atmen, Blinzeln, Blickwechsel, Schwanzschwung */
  idle: boolean
  rnd?: () => number
  /** Bewegung reduzieren: alles springt direkt zum Ziel */
  reduced?: boolean
}

export class FoxEngine {
  readonly out: FoxOut
  private ch = {} as Record<Name, Spring>
  private tgt = {} as Record<Name, number>
  private hopB: Ballistic = { y: 0, v: 0 }
  private t = 0
  private look: Look = NEUTRAL
  private idle: boolean
  private reduced: boolean
  private rnd: () => number
  private pending: { at: number; fn: () => void }[] = []
  private blinkAt = 0
  private blinkStart = -1
  private baseL: EyeParams = { ...EYE_OPEN }
  private baseR: EyeParams = { ...EYE_OPEN }
  private doubleBlink = false
  private noDouble = false
  private saccadeAt = 0
  private jitter: [number, number] = [0, 0]
  private ptr = { x: 0, y: 0, hx: 0 }
  private talk: { level: number; bright: number } | null = null
  private danceOn = false
  private wag = 0
  private wagUntil = 0
  private shakeAt = -10
  private shakeAmp = 0
  private targetEyeL: EyeParams = { ...EYE_OPEN }
  private targetEyeR: EyeParams = { ...EYE_OPEN }
  private targetMouth: MouthParams = { ...MOUTHS.smile }
  private prevHeadRot = 0
  private headVel = 0
  /** wird aufgerufen, wenn von außen etwas passiert und die Schleife wieder laufen muss */
  onWake: () => void = () => {}
  /** Zusammenstauchen beim Landen (für Staub, Ton o. Ä.) */
  onLand: (impact: number) => void = () => {}

  constructor(opts: EngineOptions) {
    this.idle = opts.idle
    this.reduced = !!opts.reduced
    this.rnd = opts.rnd ?? Math.random
    for (const n of NAMES) {
      const [k, c, x0] = TUNING[n]
      this.ch[n] = spring(x0, k, c)
      this.tgt[n] = x0
    }
    this.out = { vars: {}, eyeL: { ...EYE_OPEN }, eyeR: { ...EYE_OPEN }, mouth: { ...MOUTHS.smile } }
    this.blinkAt = 1.5 + this.rnd() * 3
    this.saccadeAt = 1 + this.rnd() * 2
    this.setLook(NEUTRAL)
    this.snap()
    this.write()
  }

  /** Neue Pose: setzt nur Ziele, die Federn laufen dorthin. */
  setLook(look: Look): void {
    this.look = look
    this.tgt.headRot = look.headRot
    this.tgt.headY = look.headY
    this.tgt.browLY = look.browL[0]
    this.tgt.browLR = look.browL[1]
    this.tgt.browRY = look.browR[0]
    this.tgt.browRR = look.browR[1]
    this.danceOn = !!look.dance
    this.targetEyeL = eyeTarget(look.eyes, false)
    this.targetEyeR = eyeTarget(look.eyes, true)
    this.targetMouth = { ...MOUTHS[look.mouth] }
    this.out.vars.blush = look.blush
    const happy = look.mouth === 'grin' || look.mouth === 'laugh'
    this.wagUntil = happy ? this.t + 2.5 : this.wagUntil
    this.onWake()
  }

  /** Ruheverhalten (Atmen, Blinzeln, Blickwechsel) an oder aus. */
  setIdle(on: boolean): void {
    this.idle = on
    this.onWake()
  }

  /** Sofort an die Pose springen (ohne Bewegung): für Bewegung-reduzieren und kleine Füchse. */
  snap(): void {
    this.applyTargets(0)
    for (const n of NAMES) {
      this.ch[n].x = this.tgt[n]
      this.ch[n].v = 0
    }
    this.baseL = { ...this.targetEyeL }
    this.baseR = { ...this.targetEyeR }
    this.out.eyeL = { ...this.baseL }
    this.out.eyeR = { ...this.baseR }
    this.out.mouth = { ...this.targetMouth }
    this.write()
  }

  /** Blick zum Zeiger: Augen sofort, Kopf gedämpft (Augen führen, der Kopf folgt). */
  setPointer(px: number, py: number, hx: number): void {
    this.ptr = { x: px, y: py, hx }
    this.onWake()
  }

  /** Sprechen: Lautstärke 0 bis 1 und Helligkeit des Klangs 0 bis 1 (eher "i" oder eher "u"); null = nicht sprechen. */
  setTalk(level: number | null, bright = 0.5): void {
    this.talk = level == null ? null : { level: clamp(level, 0, 1), bright: clamp(bright, 0, 1) }
    this.onWake()
  }

  /** Sprung: kurz in die Knie, dann Flugbahn, Landen mit Zusammenstauchen, kleiner Nachhüpfer. */
  hop(power = 1): void {
    if (this.reduced) return
    this.tgt.squash = 0.88
    this.pending.push({
      at: this.t + 0.11,
      fn: () => {
        this.tgt.squash = 1
        this.ch.squash.v = 7
        this.hopB.v = -400 * power
        this.ch.armL.v += 160
        this.ch.armR.v -= 160
      },
    })
    this.onWake()
  }

  /** Beim Antippen: kurz zusammenstauchen und zurückfedern. */
  boing(): void {
    if (this.reduced) return
    this.ch.squash.x = 0.87
    this.ch.squash.v = 0
    this.tgt.squash = 1
    this.onWake()
  }

  /** Kopfschütteln (nein, falsch). */
  shake(): void {
    if (this.reduced) return
    this.shakeAt = this.t
    this.shakeAmp = 11
    this.onWake()
  }

  /** Ohr zucken lassen. */
  flickEar(side: 'l' | 'r' = 'l'): void {
    const e = this.ch[side === 'l' ? 'earL' : 'earR']
    e.v += side === 'l' ? -380 : 380
    this.onWake()
  }

  wagTail(seconds = 1.6): void {
    this.wagUntil = this.t + seconds
    this.onWake()
  }

  blinkNow(): void {
    this.blinkAt = this.t
    this.onWake()
  }

  private applyTargets(dt: number): void {
    const look = this.look
    const t = this.t
    // Ohren folgen dem Kopf mit Verzug: Dreht er sich nach rechts, bleiben sie kurz zurück
    const drag = clamp(-this.headVel * 0.045, -14, 14)
    this.tgt.earL = look.earL + drag
    this.tgt.earR = look.earR + drag

    // Arme: Tanz wechselt hoch und runter, gehobene Arme winken
    const raised = !look.armFront
    if (this.danceOn) {
      this.tgt.armL = 12 + (0.5 + 0.5 * Math.sin(t * 8)) * 100
      this.tgt.armR = -12 - (0.5 + 0.5 * Math.sin(t * 8 + Math.PI)) * 100
      this.tgt.bodyRot = Math.sin(t * 4) * 5
    } else {
      this.tgt.armL = look.armL + (raised && look.armL > 100 ? Math.sin(t * 9) * 9 : 0)
      this.tgt.armR = look.armR + (raised && look.armR < -100 ? Math.sin(t * 9 + 1) * 9 : 0)
      this.tgt.bodyRot = 0
    }

    // Kopfschütteln als abklingende Schwingung
    const st = t - this.shakeAt
    const shakeX = st < 1.2 ? Math.sin(st * 36) * this.shakeAmp * Math.exp(-st * 4.5) : 0
    this.tgt.headX = this.ptr.hx + shakeX

    // Schwanz: leises Schwingen, bei Freude und auf Befehl kräftiges Wedeln
    const wagWanted = t < this.wagUntil ? 1 : 0
    this.wag += (wagWanted - this.wag) * Math.min(1, dt * 8)
    const sway = this.idle || wagWanted ? Math.sin(t * 1.7) * 5 : 0
    this.tgt.tail = sway + Math.sin(t * 15) * 15 * this.wag

    // Blick: Pose + Zeiger + kleine Augenbewegungen
    this.tgt.gazeX = look.gaze[0] + this.ptr.x + this.jitter[0]
    this.tgt.gazeY = look.gaze[1] + this.ptr.y + this.jitter[1]
  }

  /** Einen Schritt weiter. Gibt zurück, ob noch etwas in Bewegung ist (sonst kann die Schleife ruhen). */
  tick(dtMs: number): boolean {
    const dt = Math.min(dtMs, 64) / 1000
    this.t += dt
    const t = this.t

    // geplante Dinge (Sprung nach dem In-die-Knie-Gehen)
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= t)
      this.pending = this.pending.filter((p) => p.at > t)
      due.forEach((p) => p.fn())
    }

    // Kopfgeschwindigkeit für das Nachschwingen der Ohren
    this.headVel = (this.ch.headRot.x - this.prevHeadRot) / Math.max(dt, 0.001)
    this.prevHeadRot = this.ch.headRot.x

    if (this.idle && !this.reduced) {
      // Blinzeln, manchmal doppelt: ein Ablauf von festem Verlauf (siehe blinkClosed), danach Pause
      if (this.blinkStart >= 0 && t - this.blinkStart >= BLINK_TOTAL) {
        this.blinkStart = -1
        if (this.doubleBlink) {
          this.doubleBlink = false
          this.noDouble = true
          this.blinkAt = t + 0.06
        } else {
          this.noDouble = false
          this.blinkAt = t + 2.4 + this.rnd() * 3.6
        }
      } else if (this.blinkStart < 0 && t >= this.blinkAt) {
        this.blinkStart = t
        this.doubleBlink = !this.noDouble && this.rnd() < 0.18
      }
      // kleine Blickwechsel
      if (t >= this.saccadeAt) {
        this.jitter = [(this.rnd() - 0.5) * 3, (this.rnd() - 0.5) * 2]
        this.saccadeAt = t + 1.2 + this.rnd() * 2.8
      }
      // Ohren zucken ab und zu
      if (this.rnd() < dt * 0.09) this.flickEar(this.rnd() < 0.5 ? 'l' : 'r')
    }

    this.applyTargets(dt)

    // Federn
    let moving = false
    for (const n of NAMES) {
      const s = this.ch[n]
      if (this.reduced) {
        s.x = this.tgt[n]
        s.v = 0
      } else {
        stepSpring(s, this.tgt[n], dtMs)
        if (Math.abs(this.tgt[n] - s.x) > 0.03 || Math.abs(s.v) > 0.03) moving = true
      }
    }

    // Sprung
    if (this.hopB.y !== 0 || this.hopB.v !== 0) {
      stepBallistic(this.hopB, dtMs, (impact) => {
        this.ch.squash.x = 1 - Math.min(0.14, impact / 3600)
        this.ch.squash.v = 0
        this.tgt.squash = 1
        this.onLand(impact)
      })
      moving = true
    }

    // Augen: Grundform gleitet zur Pose, das Blinzeln liegt als eigener Verlauf darüber
    const openEyes = this.look.eyes === 'open' || this.look.eyes === 'wide' || this.look.eyes === 'sad' || this.look.eyes === 'wink'
    const k = this.blinkStart >= 0 && openEyes ? blinkClosed(t - this.blinkStart) : 0
    const eyeMoving = stepEye(this.baseL, this.targetEyeL, dtMs, 0.028) || stepEye(this.baseR, this.targetEyeR, dtMs, 0.028) || this.blinkStart >= 0
    this.out.eyeL = blinked(this.baseL, k)
    this.out.eyeR = this.look.eyes === 'wink' ? this.baseR : blinked(this.baseR, k)

    // Mund: aus der Pose oder nach der Lautstärke beim Sprechen
    let mt = this.targetMouth
    if (this.talk) {
      const base = MOUTHS.talk
      mt = { ...base, open: 3 + this.talk.level * 30, w: 8 + this.talk.bright * 9, tongue: 0.15 + this.talk.level * 0.5, cornerY: base.cornerY - this.talk.level * 3 }
    }
    const mouthMoving = stepMouth(this.out.mouth, mt, dtMs, this.talk ? 0.05 : 0.018)

    this.out.vars.blush += (this.look.blush - this.out.vars.blush) * Math.min(1, dt * 6)
    this.write()
    return this.idle || moving || eyeMoving || mouthMoving || this.pending.length > 0 || t < this.wagUntil || this.danceOn || t - this.shakeAt < 1.3
  }

  /** Alle Werte für die Zeichnung (CSS-Variablen). */
  private write(): void {
    const c = this.ch
    const v = this.out.vars
    const breath = this.idle && !this.reduced ? 1 + 0.012 * Math.sin(this.t * 1.5) : 1
    const sy = c.squash.x * breath
    const sx = 1 + (1 - sy) * 0.55
    const stretch = (a: number, raise: number) => 1 + 0.24 * clamp((Math.abs(a) - 60) / 50, 0, 1) * raise
    const dance = this.danceOn ? Math.abs(Math.sin(this.t * 8)) * 6 : 0
    v.hr = r2(c.headRot.x)
    v.hy = r2(c.headY.x)
    v.hx = r2(c.headX.x)
    v.eL = r2(c.earL.x)
    v.eR = r2(c.earR.x)
    v.aL = r2(c.armL.x)
    v.aR = r2(c.armR.x)
    v.aLs = r2(stretch(c.armL.x, this.look.armFront ? 0 : 1))
    v.aRs = r2(stretch(c.armR.x, this.look.armFront ? 0 : 1))
    v.tail = r2(c.tail.x)
    v.by = r2(this.hopB.y - dance)
    v.sx = r2(sx)
    v.sy = r2(sy)
    v.brot = r2(c.bodyRot.x)
    v.gx = r2(c.gazeX.x)
    v.gy = r2(c.gazeY.x)
    v.blY = r2(c.browLY.x)
    v.blR = r2(c.browLR.x)
    v.brY = r2(c.browRY.x)
    v.brR = r2(c.browRR.x)
  }
}
