import type { ReactNode } from 'react'
import type { MouthParams } from './mouth'

/**
 * Der Zoo: Jedes Tier ist ein „Fell“ für dieselbe Figur. Augen, Mund, Ohrenzucken, Arme, Atmen und alle Posen kommen aus dem Gerüst
 * des Fuchses (Fox.tsx, engine.ts); hier stehen nur die Teile, die ein Tier ausmachen: Farben, Ohren, Schwanz, Schnauze, Muster.
 * Koordinaten wie beim Fuchs: 200 breit, 240 hoch, Kopf um (100, 90), Augen bei (69, 90) und (131, 90), Nase bei (100, 106).
 */
export type SpeciesId = 'fuchs' | 'elefant' | 'krokodil' | 'giraffe' | 'erdmaennchen' | 'loewe' | 'panda' | 'pinguin' | 'nilpferd' | 'zebra' | 'affe' | 'tiger'

/** Hilfen für die Zeichnung: g = eindeutige Gradient-Ids dieser Figur. */
export interface Ctx {
  g: (name: string) => string
  /** Teile, die sich mit dem Mund bewegen (Schnabel, Rüssel), melden sich hier an */
  reg: (key: string) => (el: Element | null) => void
}

export interface Skin {
  id: SpeciesId
  /** Wie das Tier heißt (Auswahl) */
  label: string
  /** Wie die Figur heißt (Begrüßung) */
  name: string
  /** Satz für die Auswahl */
  blurb: string
  /** Fell: hell, mittel, dunkel (Verlauf von oben nach unten) */
  fur: [string, string, string]
  /** Helle Fläche (Bauch, Schnauze): oben, unten */
  light: [string, string]
  /** Kontur und Augenbrauen */
  ink: string
  /** Schattenton für Rundungen am Körper */
  shade: string
  /** Farbe der Pfoten (Arme) und Füße */
  paw: string
  foot: string
  /** Arme in der Fellfarbe (Standard) oder in dieser Farbe */
  arm?: string
  /** Wangenfarbe */
  cheek?: string
  /** Kopfform; Standard ist die runde Fuchsform */
  head?: string
  /** Helle Fläche im unteren Gesicht; `false` = keine */
  muzzle?: string | false
  /** Haarbüschel am Scheitel */
  tuft?: boolean
  freckles?: boolean
  whiskers?: boolean
  /** Hinter dem Kopf (Mähne, Hörner) */
  behind?: (c: Ctx) => ReactNode
  /** Ohren: im Ohrgelenk, links und rechts */
  earL: (c: Ctx) => ReactNode
  earR: (c: Ctx) => ReactNode
  /** Drehpunkt der Ohren (Ansatz am Kopf), links und rechts; Standard wie beim Fuchs. Sonst schwingen weit außen sitzende Ohren um einen Punkt mitten im Kopf. */
  earPivot?: [[number, number], [number, number]]
  /** Muster im Gesicht (vor dem Fell, hinter den Augen) */
  face?: (c: Ctx) => ReactNode
  /** Muster auf dem Kopf, das über Ohren und Gesicht liegt (z. B. Zebrastreifen) */
  overlay?: (c: Ctx) => ReactNode
  nose: (c: Ctx) => ReactNode
  /** Zusatz vor dem Mund (z. B. Rüssel, Schnabel) */
  snout?: (c: Ctx) => ReactNode
  /** Der kleine Strich von der Nase zum Mund entfällt */
  noStem?: boolean
  /** Wie das Tier spricht: Schnabel (Pinguin) oder Rüssel (Elefant) statt des Standardmundes; beides steht dann in `snout` */
  speech?: 'beak' | 'trunk'
  /** Mundform des Tieres anpassen (z. B. breiter beim Krokodil) */
  shapeMouth?: (m: MouthParams) => MouthParams
  /** Höhe der Augen (Standard 90) und halber Abstand voneinander (Standard 31) */
  eyeY?: number
  eyeX?: number
  /** Hüte und Kronen sitzen höher oder tiefer, wenn der Kopf höher oder tiefer endet (Standard 0) */
  topDy?: number
  /** eigene Rumpfform */
  torso?: string
  /** Zähne an Ober- und Unterkiefer (Krokodil); eine Zahl macht sie größer (1 = normal) */
  teeth?: boolean | number
  tail: (c: Ctx) => ReactNode
  /** Zusatz auf dem Körper (Streifen, Flecken) */
  body?: (c: Ctx) => ReactNode
  /** Brust und Bauch heller als das Fell? */
  belly?: boolean
}

const fur = (c: Ctx) => `url(#${c.g('fur')})`

/** Runde Ohren: außen, innen. */
const roundEar = (x: number, y: number, r: number, outer: string, inner: string, ink?: string) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={outer} />
    <circle cx={x} cy={y} r={r * 0.58} fill={inner} />
    {ink && <circle cx={x} cy={y} r={r} fill="none" stroke={ink} strokeWidth="1.5" opacity="0.18" />}
  </g>
)

const FOX_EAR_L = (c: Ctx) => (
  <>
    <path d="M38 72 C20 46 20 20 32 4 C52 10 74 26 88 44 Z" fill="#ff8a1c" />
    <path d="M48 58 C40 42 38 28 42 18 C54 24 66 32 74 44 Z" fill="#fff0dc" />
    <path d="M52 52 q-6 -12 -2 -24 M60 50 q-4 -10 0 -18" stroke="#f1c9a2" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
    <g clipPath={`url(#${c.g('earTip')})`}>
      <path d="M38 72 C20 46 20 20 32 4 C52 10 74 26 88 44 Z" fill="#2e1a0d" />
    </g>
  </>
)
const FOX_EAR_R = (c: Ctx) => (
  <>
    <path d="M162 72 C180 46 180 20 168 4 C148 10 126 26 112 44 Z" fill="#ff8a1c" />
    <path d="M152 58 C160 42 162 28 158 18 C146 24 134 32 126 44 Z" fill="#fff0dc" />
    <path d="M148 52 q6 -12 2 -24 M140 50 q4 -10 0 -18" stroke="#f1c9a2" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
    <g clipPath={`url(#${c.g('earTip')})`}>
      <path d="M162 72 C180 46 180 20 168 4 C148 10 126 26 112 44 Z" fill="#2e1a0d" />
    </g>
  </>
)

/** Zwei kleine runde Nasenlöcher oder eine Knopfnase. */
const buttonNose = (color: string, w = 11, h = 8, y = 108) => () => (
  <g>
    <ellipse cx="100" cy={y} rx={w} ry={h} fill={color} />
    <ellipse cx="96" cy={y - 2.4} rx={w * 0.35} ry={h * 0.28} fill="#fff" opacity="0.45" />
  </g>
)

/** Der Fuchs: die ursprüngliche Figur. */
const fuchs: Skin = {
  id: 'fuchs',
  label: 'Fuchs',
  name: 'Fenni',
  blurb: 'Schlau und flink',
  fur: ['#ffac4d', '#ff8a1c', '#f2750f'],
  light: ['#ffffff', '#ffe9d0'],
  ink: '#2e1a0d',
  shade: '#b84d00',
  paw: '#2e1a0d',
  foot: '#2e1a0d',
  muzzle: 'M28 98 C46 92 70 98 82 114 C88 122 94 127 100 127 C106 127 112 122 118 114 C130 98 154 92 172 98 C172.5 121 146 148 100 148 C54 148 27.5 121 28 98 Z',
  tuft: true,
  freckles: true,
  whiskers: true,
  belly: true,
  earL: FOX_EAR_L,
  earR: FOX_EAR_R,
  nose: () => (
    <g>
      <path d="M90 106 Q100 101 110 106 Q108 117 100 121 Q92 117 90 106 Z" fill="#2e1a0d" />
      <ellipse cx="97" cy="107.5" rx="4" ry="1.7" fill="#fff" opacity="0.5" />
    </g>
  ),
  tail: (c) => (
    <g>
      <path d="M126 210 C160 222 200 204 198 164 C197 146 188 134 176 132 C176 146 170 160 158 170 C148 178 138 184 126 186 Z" fill={fur(c)} />
      <path d="M126 210 C160 222 200 204 198 164" fill="none" stroke="#e6660a" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
      <path d="M150 190 C164 188 176 178 182 166" fill="none" stroke="#ffac4d" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <g clipPath={`url(#${c.g('tailTip')})`}>
        <path d="M126 210 C160 222 200 204 198 164 C197 146 188 134 176 132 C176 146 170 160 158 170 C148 178 138 184 126 186 Z" fill={`url(#${c.g('white')})`} />
      </g>
    </g>
  ),
}

/** Der Elefant: große Ohren, kurzer Rüssel, Stoßzähne. */
const elefant: Skin = {
  id: 'elefant',
  label: 'Elefant',
  name: 'Elli',
  blurb: 'Vergisst nie etwas',
  fur: ['#b6c2d4', '#9eacc1', '#8696ae'],
  light: ['#e4e9f1', '#cdd5e1'],
  ink: '#2b3340',
  shade: '#5d6a80',
  paw: '#8696ae',
  foot: '#7a8aa3',
  cheek: '#f4a6b8',
  eyeY: 84,
  muzzle: false,
  belly: true,
  speech: 'trunk',
  noStem: true,
  head: 'M100 30 C146 30 172 58 172 94 C172 130 146 150 100 150 C54 150 28 130 28 94 C28 58 54 30 100 30 Z',
  earL: () => (
    <g>
      <path d="M52 52 C20 34 -2 58 4 94 C10 128 36 142 56 122 Z" fill="#9eacc1" />
      <path d="M50 64 C28 54 14 70 18 94 C22 114 38 122 52 108 Z" fill="#f3b6c5" />
      <path d="M30 76 q-5 14 4 26" stroke="#dc8fa4" strokeWidth="2.400" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  ),
  earR: () => (
    <g>
      <path d="M148 52 C180 34 202 58 196 94 C190 128 164 142 144 122 Z" fill="#9eacc1" />
      <path d="M150 64 C172 54 186 70 182 94 C178 114 162 122 148 108 Z" fill="#f3b6c5" />
      <path d="M170 76 q5 14 -4 26" stroke="#dc8fa4" strokeWidth="2.400" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  ),
  face: () => (
    <g>
      {/* ein paar Haare auf der Stirn */}
      <path d="M96 32 C92 20 98 14 104 18 M104 31 C104 21 110 17 114 22" stroke="#7a8aa3" strokeWidth="3.600" strokeLinecap="round" fill="none" />
    </g>
  ),
  nose: () => <g />,
  snout: (c) => (
    <g>
      {/* Stoßzähne: klein, links und rechts unter dem Rüsselansatz */}
      <path d="M86 126 C78 128 72 138 74 150 C78 148 84 140 92 134 Z" fill="#fff8e6" stroke="#d9c9a3" strokeWidth="1.600" strokeLinejoin="round" />
      <path d="M114 126 C122 128 128 138 126 150 C122 148 116 140 108 134 Z" fill="#fff8e6" stroke="#d9c9a3" strokeWidth="1.600" strokeLinejoin="round" />
      {/* Der Mund steckt links und rechts neben dem Rüssel */}
      <path ref={c.reg('smileL')} stroke="#2b3340" strokeWidth="3.200" strokeLinecap="round" fill="none" />
      <path ref={c.reg('smileR')} stroke="#2b3340" strokeWidth="3.200" strokeLinecap="round" fill="none" />
      {/* Rüssel: ein dicker Schlauch von der Stirn bis über das Kinn, unten etwas breiter, mit Falten */}
      <g ref={c.reg('trunk')} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M100 92 C99 112 98 128 100 142" stroke="#6f7d95" strokeWidth="29" />
        <path d="M100 92 C99 112 98 128 100 142" stroke="#a9b6ca" strokeWidth="24" />
        <path d="M93 98 C92 112 92 126 93 138" stroke="#cdd7e6" strokeWidth="5" opacity="0.75" />
        <path d="M90 108 q10 4 20 0 M89 119 q11 4 22 0 M89 130 q11 4 22 0" stroke="#7f8da4" strokeWidth="2.400" opacity="0.85" />
        <ellipse cx="95" cy="145" rx="2.600" ry="2" fill="#46526a" stroke="none" />
        <ellipse cx="105" cy="145" rx="2.600" ry="2" fill="#46526a" stroke="none" />
      </g>
    </g>
  ),
  tail: () => (
    <g>
      <path d="M126 206 C150 210 160 196 158 178" fill="none" stroke="#8696ae" strokeWidth="5" strokeLinecap="round" />
      <path d="M158 178 C154 170 160 164 166 168 C166 175 163 180 160 182 Z" fill="#5d6a80" />
    </g>
  ),
}

/** Das Krokodil: breite Schnauze mit Nasenlöchern, kleine Augenwülste, Zacken. */
const krokodil: Skin = {
  id: 'krokodil',
  label: 'Krokodil',
  name: 'Boris',
  blurb: 'Hat immer gute Laune',
  fur: ['#86d968', '#52c04c', '#3aa245'],
  light: ['#f2f8c6', '#dbed9e'],
  ink: '#143a1d',
  shade: '#1f6a2e',
  paw: '#3aa245',
  foot: '#2f8a3e',
  cheek: '#ffa8a0',
  // Augen oben auf zwei Höckern, darunter eine breite, flache Schnauze: so erkennt man ein Krokodil von vorn
  eyeY: 72,
  eyeX: 34,
  topDy: 10,
  head: 'M30 100 C30 84 52 74 100 74 C148 74 170 84 170 100 L172 120 C172 141 148 153 100 153 C52 153 28 141 28 120 Z',
  muzzle: 'M31 116 C62 126 138 126 169 116 C171 141 148 153 100 153 C52 153 29 141 31 116 Z',
  belly: true,
  teeth: 1.5,
  // Ein breites Krokodilgrinsen über die ganze Schnauze, die Mundwinkel hoch
  shapeMouth: (m) => ({ ...m, w: m.w * 3.2, cornerY: m.cornerY - 4, centerY: m.centerY + 1, bump: m.bump * 0.1 }),
  behind: (c) => (
    <g>
      {/* Rückenzacken zwischen den Augenhöckern */}
      <path d="M84 76 L92 56 L100 76 Z M98 74 L108 52 L116 76 Z" fill="#2f8a3e" />
      {/* Augenhöcker */}
      <circle cx="66" cy="68" r="29" fill={`url(#${c.g('face')})`} />
      <circle cx="134" cy="68" r="29" fill={`url(#${c.g('face')})`} />
    </g>
  ),
  earL: () => <g />,
  earR: () => <g />,
  face: () => (
    <g>
      {/* Nasenhöcker obenauf der Schnauze */}
      <ellipse cx="86" cy="96" rx="9" ry="7" fill="#9be27d" />
      <ellipse cx="114" cy="96" rx="9" ry="7" fill="#9be27d" />
      {/* Schuppenflecken an den Wangen */}
      <g fill="#2f8a3e" opacity="0.28">
        <circle cx="44" cy="104" r="3.4" />
        <circle cx="54" cy="112" r="2.6" />
        <circle cx="156" cy="104" r="3.4" />
        <circle cx="146" cy="112" r="2.6" />
      </g>
      {/* Kinnkante unter dem Grinsen */}
      <path d="M40 132 C62 150 138 150 160 132" stroke="#2f8a3e" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.28" />
    </g>
  ),
  nose: () => (
    <g>
      <ellipse cx="86" cy="96.500" rx="3.200" ry="2.400" fill="#143a1d" />
      <ellipse cx="114" cy="96.500" rx="3.200" ry="2.400" fill="#143a1d" />
    </g>
  ),
  noStem: true,
  body: () => (
    <g stroke="#b8d77f" strokeWidth="2.600" strokeLinecap="round" fill="none" opacity="0.8">
      <path d="M84 160 q16 6 32 0 M82 172 q18 6 36 0 M82 184 q18 6 36 0 M84 196 q16 6 32 0" />
    </g>
  ),
  tail: (c) => (
    <g>
      <path d="M126 204 C152 214 184 226 208 220 C198 206 170 194 126 188 Z" fill={fur(c)} />
      <path d="M148 197 L155 185 L162 200 Z M166 204 L174 191 L180 207 Z M184 211 L192 199 L196 214 Z" fill="#2f8a3e" />
      <path d="M130 207 C152 217 184 226 208 220" fill="none" stroke="#1f6a2e" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    </g>
  ),
}

/** Die Giraffe: Hörnchen, Flecken, helle Schnauze. */
const giraffe: Skin = {
  id: 'giraffe',
  earPivot: [[46, 66], [154, 66]],
  label: 'Giraffe',
  name: 'Greta',
  blurb: 'Hat den Überblick',
  fur: ['#ffe083', '#fcc949', '#eba926'],
  light: ['#fff6dc', '#f8e2ae'],
  ink: '#4a2a12',
  shade: '#b57412',
  paw: '#7a4a1e',
  foot: '#7a4a1e',
  cheek: '#ff9c8a',
  muzzle: 'M44 106 C58 98 76 104 84 114 C90 121 94 123 100 123 C106 123 110 121 116 114 C124 104 142 98 156 106 C158 130 134 148 100 148 C66 148 42 130 44 106 Z',
  belly: true,
  behind: () => (
    <g>
      <path d="M78 40 L74 12" stroke="#d9a02c" strokeWidth="7" strokeLinecap="round" />
      <path d="M122 40 L126 12" stroke="#d9a02c" strokeWidth="7" strokeLinecap="round" />
      <circle cx="73.5" cy="10" r="7.5" fill="#7a4a1e" />
      <circle cx="126.5" cy="10" r="7.5" fill="#7a4a1e" />
    </g>
  ),
  earL: () => (
    <g>
      <ellipse cx="30" cy="62" rx="22" ry="11" transform="rotate(-24 30 62)" fill="#fcc949" />
      <ellipse cx="32" cy="63" rx="13" ry="6" transform="rotate(-24 32 63)" fill="#f2a487" />
    </g>
  ),
  earR: () => (
    <g>
      <ellipse cx="170" cy="62" rx="22" ry="11" transform="rotate(24 170 62)" fill="#fcc949" />
      <ellipse cx="168" cy="63" rx="13" ry="6" transform="rotate(24 168 63)" fill="#f2a487" />
    </g>
  ),
  face: () => (
    <g fill="#c9822a" opacity="0.85">
      <path d="M52 56 l9 -4 l5 8 l-6 8 l-9 -3 Z" />
      <path d="M134 52 l10 3 l4 9 l-8 5 l-8 -6 Z" />
      <path d="M88 40 l9 -2 l4 7 l-6 6 l-8 -3 Z" />
      <path d="M34 98 l8 -3 l5 7 l-5 7 l-8 -2 Z" />
      <path d="M156 100 l9 2 l2 8 l-8 4 l-6 -6 Z" />
    </g>
  ),
  nose: () => (
    <g>
      <ellipse cx="88" cy="112" rx="4.4" ry="3" fill="#7a4a1e" />
      <ellipse cx="112" cy="112" rx="4.4" ry="3" fill="#7a4a1e" />
    </g>
  ),
  noStem: true,
  body: () => (
    <g fill="#c9822a" opacity="0.85">
      <path d="M60 170 l10 -4 l6 9 l-7 9 l-10 -3 Z" />
      <path d="M118 186 l11 -2 l5 9 l-8 7 l-9 -4 Z" />
      <path d="M130 162 l9 2 l2 8 l-8 4 l-6 -6 Z" />
    </g>
  ),
  tail: () => (
    <g>
      <path d="M128 208 C158 218 176 200 174 172" stroke="#fcc949" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M168 168 C164 156 176 150 180 160 C184 170 174 180 168 168 Z" fill="#7a4a1e" />
    </g>
  ),
}

/** Das Erdmännchen: dunkle Augenringe, aufrechter Blick. */
const erdmaennchen: Skin = {
  id: 'erdmaennchen',
  earPivot: [[42, 76], [158, 76]],
  label: 'Erdmännchen',
  name: 'Emil',
  blurb: 'Hält Ausschau',
  fur: ['#efd2a0', '#dfb87a', '#c9985a'],
  light: ['#faefd9', '#f0dcb8'],
  ink: '#3a2412',
  shade: '#9a6a2c',
  paw: '#4a3220',
  foot: '#4a3220',
  cheek: '#f08f7a',
  muzzle: 'M44 104 C58 98 76 104 84 114 C90 121 94 125 100 125 C106 125 110 121 116 114 C124 104 142 98 156 104 C158 128 134 148 100 148 C66 148 42 128 44 104 Z',
  belly: true,
  earL: () => (
    <g>
      <ellipse cx="32" cy="74" rx="12" ry="14" fill="#4a3220" />
      <ellipse cx="34" cy="74" rx="6.5" ry="8.5" fill="#7a5638" />
    </g>
  ),
  earR: () => (
    <g>
      <ellipse cx="168" cy="74" rx="12" ry="14" fill="#4a3220" />
      <ellipse cx="166" cy="74" rx="6.5" ry="8.5" fill="#7a5638" />
    </g>
  ),
  face: () => (
    <g>
      <ellipse cx="68" cy="92" rx="25" ry="23" transform="rotate(-18 68 92)" fill="#5b4028" opacity="0.92" />
      <ellipse cx="132" cy="92" rx="25" ry="23" transform="rotate(18 132 92)" fill="#5b4028" opacity="0.92" />
      <path d="M96 38 C94 46 96 54 100 60 C104 54 106 46 104 38 Z" fill="#c9985a" opacity="0.7" />
    </g>
  ),
  nose: () => (
    <g>
      <path d="M92 108 Q100 103 108 108 Q106 116 100 119 Q94 116 92 108 Z" fill="#3a2412" />
      <ellipse cx="97" cy="108.5" rx="3" ry="1.3" fill="#fff" opacity="0.45" />
    </g>
  ),
  whiskers: true,
  tail: () => (
    <g>
      <path d="M126 212 C152 224 176 210 180 184 C181 174 178 168 174 166 C172 184 160 202 126 198 Z" fill="#dfb87a" />
      <path d="M174 166 C180 168 182 176 180 184 C176 178 174 172 174 166 Z" fill="#4a3220" />
    </g>
  ),
}

/** Der Löwe: Mähne rund um das Gesicht. */
const loewe: Skin = {
  id: 'loewe',
  earPivot: [[48, 50], [152, 50]],
  label: 'Löwe',
  name: 'Leo',
  blurb: 'Mutig und stark',
  fur: ['#ffd27a', '#f4b146', '#e0932d'],
  light: ['#fff3d2', '#f9dfa5'],
  ink: '#4a2a10',
  shade: '#a85c10',
  paw: '#c97a1e',
  foot: '#c97a1e',
  cheek: '#ff9a82',
  muzzle: 'M44 104 C58 98 76 104 84 114 C90 121 94 125 100 125 C106 125 110 121 116 114 C124 104 142 98 156 104 C158 128 134 148 100 148 C66 148 42 128 44 104 Z',
  belly: true,
  behind: () => (
    <g>
      <path
        d="M100 2 C116 -2 130 6 138 14 C152 12 166 22 168 38 C182 44 190 60 184 76 C194 90 190 108 178 118 C180 134 170 148 154 152 C146 164 130 168 118 162 C108 170 92 170 82 162 C70 168 54 164 46 152 C30 148 20 134 22 118 C10 108 6 90 16 76 C10 60 18 44 32 38 C34 22 48 12 62 14 C70 6 84 -2 100 2 Z"
        fill="#c9741c"
      />
      <path d="M100 12 C112 10 122 16 128 24 C140 24 152 32 154 44 C166 50 172 62 168 74 C176 86 172 100 164 108" fill="none" stroke="#e8a248" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
  earL: () => roundEar(44, 44, 16, '#f4b146', '#f2a08c'),
  earR: () => roundEar(156, 44, 16, '#f4b146', '#f2a08c'),
  nose: () => (
    <g>
      <path d="M89 105 Q100 100 111 105 Q108 116 100 120 Q92 116 89 105 Z" fill="#b6563a" />
      <ellipse cx="96" cy="106.2" rx="4" ry="1.6" fill="#fff" opacity="0.45" />
    </g>
  ),
  whiskers: true,
  tail: () => (
    <g>
      <path d="M128 208 C158 216 178 200 176 170" stroke="#f4b146" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M170 168 C162 156 172 144 182 150 C190 158 184 174 170 168 Z" fill="#a85c10" />
    </g>
  ),
}

/** Der Panda: schwarze Ohren, Augenflecken, schwarze Arme und Füße. */
const panda: Skin = {
  id: 'panda',
  earPivot: [[48, 52], [152, 52]],
  label: 'Panda',
  name: 'Momo',
  blurb: 'Entspannt und gemütlich',
  fur: ['#ffffff', '#f6f6f8', '#e4e5ea'],
  light: ['#ffffff', '#f0f0f4'],
  ink: '#1c1c22',
  shade: '#8a8a96',
  paw: '#26262c',
  foot: '#26262c',
  arm: '#3a3a42',
  cheek: '#ff9fb2',
  muzzle: false,
  belly: false,
  earL: () => (
    <g>
      <circle cx="42" cy="44" r="19" fill="#26262c" />
      <circle cx="42" cy="44" r="9" fill="#44444e" />
    </g>
  ),
  earR: () => (
    <g>
      <circle cx="158" cy="44" r="19" fill="#26262c" />
      <circle cx="158" cy="44" r="9" fill="#44444e" />
    </g>
  ),
  face: () => (
    <g>
      <ellipse cx="68" cy="92" rx="25" ry="31" transform="rotate(24 68 92)" fill="#26262c" />
      <ellipse cx="132" cy="92" rx="25" ry="31" transform="rotate(-24 132 92)" fill="#26262c" />
    </g>
  ),
  nose: () => (
    <g>
      <path d="M91 106 Q100 101 109 106 Q107 115 100 118 Q93 115 91 106 Z" fill="#26262c" />
      <ellipse cx="96.5" cy="106.6" rx="3.4" ry="1.4" fill="#fff" opacity="0.4" />
    </g>
  ),
  body: () => <path d="M54 152 C74 142 126 142 146 152 C150 162 148 170 146 172 C126 160 74 160 54 172 C52 170 50 162 54 152 Z" fill="#3a3a42" />,
  tail: () => <circle cx="140" cy="206" r="13" fill="#f0f0f4" />,
}

/** Der Pinguin: dunkler Kopf mit weißem Gesicht, oranger Schnabel. */
const pinguin: Skin = {
  id: 'pinguin',
  label: 'Pinguin',
  name: 'Pablo',
  blurb: 'Cool bleiben',
  fur: ['#4f566c', '#383f52', '#252a38'],
  light: ['#ffffff', '#e9eef7'],
  ink: '#10131c',
  shade: '#10131c',
  paw: '#2a3040',
  foot: '#ffa022',
  arm: '#2e3444',
  cheek: '#ff8fa3',
  eyeY: 84,
  belly: true,
  speech: 'beak',
  noStem: true,
  // Kopf dunkel, das Gesicht eine weiße Maske, die sich in zwei Bögen um die Augen nach oben zieht
  muzzle: 'M34 100 C28 76 44 58 66 64 C82 69 92 80 100 96 C108 80 118 69 134 64 C156 58 172 76 166 100 C166 130 142 150 100 150 C58 150 34 130 34 100 Z',
  earL: () => <g />,
  earR: () => <g />,
  nose: () => <g />,
  snout: (c) => (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* Rachen: wird sichtbar, wenn der Unterschnabel aufklappt */}
      <ellipse ref={c.reg('beakGape')} cx="100" cy="118" rx="10" ry="0.01" fill="#6d1f2c" />
      {/* Unterschnabel: klappt beim Sprechen nach unten */}
      <g ref={c.reg('beakLow')}>
        <path d="M89 117 C93 127 107 127 111 117 Q100 121 89 117 Z" fill="#f08400" />
      </g>
      {/* Oberschnabel: breite Wurzel zwischen den Augen, läuft nach unten spitz zu, mit Mundlinie */}
      <path d="M84 99 C87 92 113 92 116 99 C117 109 109 121 100 126 C91 121 83 109 84 99 Z" fill="#ffb020" />
      <path d="M87 107 Q100 115 113 107" stroke="#e07c00" strokeWidth="2.200" fill="none" />
      <path d="M89 96 C94 93 106 93 111 96" stroke="#ffd36b" strokeWidth="3" fill="none" opacity="0.8" />
      <ellipse cx="93" cy="100" rx="2" ry="1.300" fill="#c76a00" opacity="0.8" />
      <ellipse cx="107" cy="100" rx="2" ry="1.300" fill="#c76a00" opacity="0.8" />
    </g>
  ),
  tail: () => <path d="M126 212 C146 224 160 218 166 204 C150 206 138 200 126 194 Z" fill="#252a38" />,
}

/** Das Nilpferd: breite rosa Schnauze, kleine Ohren. */
const nilpferd: Skin = {
  id: 'nilpferd',
  earPivot: [[48, 46], [152, 46]],
  label: 'Nilpferd',
  name: 'Hilda',
  blurb: 'Gemütlich, aber stark',
  fur: ['#c9bde8', '#ad9fd6', '#9585c0'],
  light: ['#f7d3e2', '#eeb4cb'],
  ink: '#352a52',
  shade: '#5f4f8e',
  paw: '#8c7cb8',
  foot: '#7f6fab',
  cheek: '#ff8fb0',
  muzzle: 'M34 108 C40 92 62 90 80 100 C90 106 94 106 100 106 C106 106 110 106 120 100 C138 90 160 92 166 108 C170 132 142 150 100 150 C58 150 30 132 34 108 Z',
  belly: true,
  earL: () => roundEar(46, 40, 13, '#ad9fd6', '#f1b9d0'),
  earR: () => roundEar(154, 40, 13, '#ad9fd6', '#f1b9d0'),
  nose: () => (
    <g>
      <ellipse cx="84" cy="112" rx="5.2" ry="3.6" fill="#6a4f8a" />
      <ellipse cx="116" cy="112" rx="5.2" ry="3.6" fill="#6a4f8a" />
      <ellipse cx="82.6" cy="110.6" rx="1.6" ry="1.1" fill="#fff" opacity="0.45" />
      <ellipse cx="114.6" cy="110.6" rx="1.6" ry="1.1" fill="#fff" opacity="0.45" />
    </g>
  ),
  noStem: true,
  tail: () => (
    <g>
      <path d="M126 206 C146 210 154 200 152 188 C146 196 138 198 126 196 Z" fill="#9585c0" />
    </g>
  ),
}

/** Das Zebra: schwarz-weiße Streifen, Stehmähne. */
const zebra: Skin = {
  id: 'zebra',
  earPivot: [[54, 60], [146, 60]],
  label: 'Zebra',
  name: 'Zora',
  blurb: 'Fällt gern auf',
  fur: ['#ffffff', '#f1f1f5', '#d3d3dd'],
  light: ['#dcdce4', '#bfbfcb'],
  ink: '#1c1c22',
  shade: '#8a8a96',
  paw: '#26262c',
  foot: '#26262c',
  cheek: '#ffa0b4',
  muzzle: 'M46 106 C58 98 76 104 84 114 C90 121 94 125 100 125 C106 125 110 121 116 114 C124 104 142 98 154 106 C158 130 134 148 100 148 C66 148 42 130 46 106 Z',
  belly: false,
  behind: () => <path d="M72 40 C70 24 76 14 82 6 C84 18 88 22 92 12 C94 22 98 24 100 8 C102 24 106 22 108 12 C112 22 116 18 118 6 C124 14 130 24 128 40 Z" fill="#26262c" />,
  earL: () => (
    <g>
      <path d="M40 66 C26 44 28 18 40 6 C54 16 70 34 80 52 Z" fill="#f6f6f8" />
      <path d="M44 56 C36 42 36 26 42 16 C52 24 62 36 68 48 Z" fill="#f1b4c4" />
      <path d="M40 6 C28 20 28 44 40 66 C34 50 34 24 46 12 Z" fill="#26262c" />
    </g>
  ),
  earR: () => (
    <g>
      <path d="M160 66 C174 44 172 18 160 6 C146 16 130 34 120 52 Z" fill="#f6f6f8" />
      <path d="M156 56 C164 42 164 26 158 16 C148 24 138 36 132 48 Z" fill="#f1b4c4" />
      <path d="M160 6 C172 20 172 44 160 66 C166 50 166 24 154 12 Z" fill="#26262c" />
    </g>
  ),
  overlay: () => (
    <g fill="#26262c">
      <path d="M44 62 C54 58 66 60 72 66 C64 66 54 68 46 74 Z" />
      <path d="M36 82 C46 78 56 80 60 86 C52 87 44 90 38 96 Z" />
      <path d="M156 62 C146 58 134 60 128 66 C136 66 146 68 154 74 Z" />
      <path d="M164 82 C154 78 144 80 140 86 C148 87 156 90 162 96 Z" />
      <path d="M90 42 C94 50 94 58 92 66 C98 60 102 60 108 66 C106 58 106 50 110 42 Z" opacity="0.9" />
    </g>
  ),
  nose: () => (
    <g>
      <ellipse cx="86" cy="112" rx="4.6" ry="3.4" fill="#3a3a46" />
      <ellipse cx="114" cy="112" rx="4.6" ry="3.4" fill="#3a3a46" />
    </g>
  ),
  noStem: true,
  body: () => (
    <g fill="#26262c">
      <path d="M38 158 C56 152 76 156 90 166 L88 176 C70 168 54 170 38 180 Z" />
      <path d="M 162 158 C 144 152 124 156 110 166 L 112 176 C 130 168 146 170 162 180 Z" />
      <path d="M36 184 C54 178 76 182 90 190 L88 200 C70 192 52 194 36 204 Z" />
      <path d="M 164 184 C 146 178 124 182 110 190 L 112 200 C 130 192 148 194 164 204 Z" />
      <path d="M40 208 C56 202 76 206 86 212 L84 224 C68 216 54 218 40 228 Z" />
      <path d="M 160 208 C 144 202 124 206 114 212 L 116 224 C 132 216 146 218 160 228 Z" />
    </g>
  ),
  tail: () => (
    <g>
      <path d="M128 208 C156 216 172 202 170 176" stroke="#f1f1f4" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M164 174 C160 160 172 154 178 164 C182 174 172 186 164 174 Z" fill="#26262c" />
    </g>
  ),
}

/** Der Affe: braunes Fell, helles Herzgesicht, große Ohren. */
const affe: Skin = {
  id: 'affe',
  earPivot: [[44, 84], [156, 84]],
  label: 'Affe',
  name: 'Anton',
  blurb: 'Immer neugierig',
  fur: ['#c98a5a', '#ab6c40', '#8a5230'],
  light: ['#f7dcb8', '#edc696'],
  ink: '#3a2012',
  shade: '#5a3416',
  paw: '#6a4024',
  foot: '#6a4024',
  cheek: '#ff9c8e',
  muzzle: 'M60 88 C54 70 66 62 80 70 C88 74 94 80 100 80 C106 80 112 74 120 70 C134 62 146 70 140 88 C156 100 150 132 126 144 C116 148 108 150 100 150 C92 150 84 148 74 144 C50 132 44 100 60 88 Z',
  belly: true,
  earL: () => (
    <g>
      <circle cx="26" cy="84" r="23" fill="#ab6c40" />
      <circle cx="28" cy="84" r="14" fill="#f2c7a2" />
    </g>
  ),
  earR: () => (
    <g>
      <circle cx="174" cy="84" r="23" fill="#ab6c40" />
      <circle cx="172" cy="84" r="14" fill="#f2c7a2" />
    </g>
  ),
  face: () => <path d="M72 44 C84 36 116 36 128 44 C122 52 112 56 100 56 C88 56 78 52 72 44 Z" fill="#8a5230" opacity="0.55" />,
  nose: () => (
    <g>
      <ellipse cx="94" cy="110" rx="2.8" ry="2.2" fill="#5a3416" />
      <ellipse cx="106" cy="110" rx="2.8" ry="2.2" fill="#5a3416" />
    </g>
  ),
  noStem: true,
  tail: () => <path d="M128 208 C168 222 196 204 186 170 C184 162 190 156 196 160 C206 192 180 224 128 218 Z" fill="#ab6c40" />,
}

/** Der Tiger: orange mit schwarzen Streifen. */
const tiger: Skin = {
  id: 'tiger',
  earPivot: [[48, 50], [152, 50]],
  label: 'Tiger',
  name: 'Rocco',
  blurb: 'Leise und schnell',
  fur: ['#ffb45c', '#fb9330', '#e87414'],
  light: ['#ffffff', '#ffe6cc'],
  ink: '#2a160a',
  shade: '#b4520a',
  paw: '#2a160a',
  foot: '#2a160a',
  cheek: '#ff8a8a',
  muzzle: 'M36 100 C52 92 72 98 82 114 C88 122 94 127 100 127 C106 127 112 122 118 114 C128 98 148 92 164 100 C168 124 144 148 100 148 C56 148 32 124 36 100 Z',
  belly: true,
  whiskers: true,
  earL: () => (
    <g>
      <circle cx="44" cy="44" r="17" fill="#fb9330" />
      <circle cx="44" cy="44" r="9" fill="#fff0dc" />
      <path d="M30 34 C36 28 46 28 52 32" stroke="#2a160a" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  ),
  earR: () => (
    <g>
      <circle cx="156" cy="44" r="17" fill="#fb9330" />
      <circle cx="156" cy="44" r="9" fill="#fff0dc" />
      <path d="M170 34 C164 28 154 28 148 32" stroke="#2a160a" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  ),
  face: () => (
    <g fill="#2a160a">
      <path d="M100 32 L95 54 L100 50 L105 54 Z" />
      <path d="M84 38 L78 56 L84 52 Z" />
      <path d="M116 38 L122 56 L116 52 Z" />
      <path d="M30 94 C40 92 48 96 52 102 C44 100 36 100 30 104 Z" />
      <path d="M32 112 C42 110 50 114 54 120 C46 118 38 118 33 122 Z" />
      <path d="M170 94 C160 92 152 96 148 102 C156 100 164 100 170 104 Z" />
      <path d="M168 112 C158 110 150 114 146 120 C154 118 162 118 167 122 Z" />
    </g>
  ),
  nose: () => (
    <g>
      <path d="M91 106 Q100 101 109 106 Q107 115 100 119 Q93 115 91 106 Z" fill="#e9707e" />
      <ellipse cx="96.5" cy="106.6" rx="3.4" ry="1.4" fill="#fff" opacity="0.5" />
    </g>
  ),
  body: () => (
    <g fill="#2a160a" opacity="0.85">
      <path d="M38 162 C54 156 70 160 80 168 L78 176 C64 170 52 172 38 182 Z" />
      <path d="M 162 162 C 146 156 130 160 120 168 L 122 176 C 136 170 148 172 162 182 Z" />
      <path d="M36 188 C52 182 70 186 80 194 L78 203 C64 196 50 198 36 208 Z" />
      <path d="M 164 188 C 148 182 130 186 120 194 L 122 203 C 136 196 150 198 164 208 Z" />
      <path d="M44 212 C56 206 70 210 78 216 L76 226 C64 220 54 222 44 230 Z" />
      <path d="M 156 212 C 144 206 130 210 122 216 L 124 226 C 136 220 146 222 156 230 Z" />
    </g>
  ),
  // Der Schwanz: dick, nach oben gebogen, Streifen genau auf dem Schwanz (gleicher Pfad, gestrichelt), dunkle Spitze
  tail: () => (
    <g fill="none" strokeLinecap="round">
      <path d="M126 206 C160 222 198 206 194 166" stroke="#fb9330" strokeWidth="15" />
      <path d="M126 206 C160 222 198 206 194 166" stroke="#e87414" strokeWidth="4" opacity="0.5" transform="translate(0 4)" />
      <path d="M126 206 C160 222 198 206 194 166" stroke="#2a160a" strokeWidth="15" strokeLinecap="butt" strokeDasharray="5 15" strokeDashoffset="-16" />
      <circle cx="194" cy="166" r="7.5" fill="#2a160a" stroke="none" />
    </g>
  ),
}

export const SKINS: Record<SpeciesId, Skin> = { fuchs, elefant, krokodil, giraffe, erdmaennchen, loewe, panda, pinguin, nilpferd, zebra, affe, tiger }
export const SPECIES_IDS = Object.keys(SKINS) as SpeciesId[]
export const isSpecies = (v: unknown): v is SpeciesId => typeof v === 'string' && v in SKINS
export const skinOf = (id: unknown): Skin => (isSpecies(id) ? SKINS[id] : SKINS.fuchs)
// bleibt für späteren Gebrauch (z. B. runde Nasen) verfügbar
export { buttonNose }
