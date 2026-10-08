import type { ReactNode } from 'react'

/**
 * Der Zoo: Jedes Tier ist ein „Fell“ für dieselbe Figur. Augen, Mund, Ohrenzucken, Arme, Atmen und alle Posen kommen aus dem Gerüst
 * des Fuchses (Fox.tsx, engine.ts); hier stehen nur die Teile, die ein Tier ausmachen: Farben, Ohren, Schwanz, Schnauze, Muster.
 * Koordinaten wie beim Fuchs: 200 breit, 240 hoch, Kopf um (100, 90), Augen bei (69, 90) und (131, 90), Nase bei (100, 106).
 */
export type SpeciesId = 'fuchs' | 'elefant' | 'krokodil' | 'giraffe' | 'erdmaennchen' | 'loewe' | 'panda' | 'pinguin' | 'nilpferd' | 'zebra' | 'affe' | 'tiger'

/** Hilfen für die Zeichnung: g = eindeutige Gradient-Ids dieser Figur. */
export interface Ctx {
  g: (name: string) => string
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
  /** Muster im Gesicht (vor dem Fell, hinter den Augen) */
  face?: (c: Ctx) => ReactNode
  /** Muster auf dem Kopf, das über Ohren und Gesicht liegt (z. B. Zebrastreifen) */
  overlay?: (c: Ctx) => ReactNode
  nose: (c: Ctx) => ReactNode
  /** Zusatz vor dem Mund (z. B. Rüssel, Schnabel) */
  snout?: (c: Ctx) => ReactNode
  /** Der kleine Strich von der Nase zum Mund entfällt */
  noStem?: boolean
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
  fur: ['#bcc6d4', '#a3afc0', '#8896ab'],
  light: ['#dde3ec', '#c5cedb'],
  ink: '#2b3340',
  shade: '#5d6a80',
  paw: '#8896ab',
  foot: '#7c8aa0',
  muzzle: false,
  cheek: '#f4a6b8',
  belly: false,
  noStem: true,
  earL: () => (
    <g>
      <ellipse cx="22" cy="86" rx="32" ry="42" fill="#a3afc0" />
      <ellipse cx="26" cy="88" rx="21" ry="30" fill="#f1b4c3" />
      <path d="M12 70 q-4 18 4 34" stroke="#d98aa0" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  ),
  earR: () => (
    <g>
      <ellipse cx="178" cy="86" rx="32" ry="42" fill="#a3afc0" />
      <ellipse cx="174" cy="88" rx="21" ry="30" fill="#f1b4c3" />
      <path d="M188 70 q4 18 -4 34" stroke="#d98aa0" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  ),
  face: () => (
    <g>
      <path d="M62 52 C76 42 92 40 106 40" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.3" />
      <path d="M92 38 C90 46 94 52 100 56 C106 52 110 46 108 38" fill="#8f9bb0" opacity="0.55" />
    </g>
  ),
  nose: () => <g />,
  snout: () => (
    <g>
      {/* Stoßzähne links und rechts vom Rüssel */}
      <path d="M78 112 C68 122 68 138 78 148 C76 136 82 124 90 118 Z" fill="#fff7e4" stroke="#d9c9a3" strokeWidth="1.4" />
      <path d="M122 112 C132 122 132 138 122 148 C124 136 118 124 110 118 Z" fill="#fff7e4" stroke="#d9c9a3" strokeWidth="1.4" />
      {/* Rüssel: hängt bis über das Kinn, die Spitze ist breiter */}
      <path d="M88 80 C87 104 85 124 86 136 C87 148 113 148 114 136 C115 124 113 104 112 80 Z" fill="#aab5c6" />
      <path d="M88 80 C87 104 85 124 86 136 C87 148 113 148 114 136 C115 124 113 104 112 80" fill="none" stroke="#7d8ba1" strokeWidth="1.6" opacity="0.55" />
      <ellipse cx="100" cy="139" rx="14" ry="7" fill="#9aa7bb" />
      <path d="M89 98 q11 3 22 0 M88 108 q12 3 24 0 M87 118 q13 3 26 0" stroke="#8f9bb0" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      <ellipse cx="94" cy="141" rx="2.8" ry="2" fill="#4a566b" />
      <ellipse cx="106" cy="141" rx="2.8" ry="2" fill="#4a566b" />
      <path d="M93 86 C92 98 91 112 92 126" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.32" />
    </g>
  ),
  tail: () => (
    <g>
      <path d="M126 206 C150 210 160 196 158 178 C156 190 142 196 126 194 Z" fill="#8896ab" />
      <path d="M158 178 C158 170 162 166 166 168 C166 174 162 180 158 182 Z" fill="#5d6a80" />
    </g>
  ),
}

/** Das Krokodil: breite Schnauze mit Nasenlöchern, kleine Augenwülste, Zacken. */
const krokodil: Skin = {
  id: 'krokodil',
  label: 'Krokodil',
  name: 'Boris',
  blurb: 'Hat immer gute Laune',
  fur: ['#8fdc74', '#5cc15a', '#3f9f49'],
  light: ['#e8f7b8', '#cfe98f'],
  ink: '#173d1f',
  shade: '#1f6a2e',
  paw: '#3f9f49',
  foot: '#2f8a3e',
  cheek: '#ffa8a0',
  head: 'M100 34 C148 34 178 58 178 92 C178 124 150 148 100 148 C50 148 22 124 22 92 C22 58 52 34 100 34 Z',
  muzzle: 'M26 96 C34 84 56 84 74 92 C88 98 94 100 100 100 C106 100 112 98 126 92 C144 84 166 84 174 96 C178 126 150 148 100 148 C50 148 22 126 26 96 Z',
  belly: true,
  earL: () => (
    <g>
      <ellipse cx="50" cy="44" rx="13" ry="11" fill="#4cb054" />
      <ellipse cx="50" cy="43" rx="7" ry="5.5" fill="#8fdc74" />
    </g>
  ),
  earR: () => (
    <g>
      <ellipse cx="150" cy="44" rx="13" ry="11" fill="#4cb054" />
      <ellipse cx="150" cy="43" rx="7" ry="5.5" fill="#8fdc74" />
    </g>
  ),
  face: () => (
    <g>
      {/* Zacken auf der Stirn */}
      <path d="M86 38 L90 26 L95 38 Z M96 36 L100 22 L105 36 Z M106 38 L110 26 L114 38 Z" fill="#3f9f49" />
      {/* Nasenwülste */}
      <ellipse cx="86" cy="104" rx="9" ry="7" fill="#e8f7b8" />
      <ellipse cx="114" cy="104" rx="9" ry="7" fill="#e8f7b8" />
      {/* Augenwülste */}
      <ellipse cx="69" cy="68" rx="21" ry="9" fill="#4cb054" opacity="0.65" />
      <ellipse cx="131" cy="68" rx="21" ry="9" fill="#4cb054" opacity="0.65" />
      <g fill="#3f9f49" opacity="0.4">
        <circle cx="52" cy="66" r="3" />
        <circle cx="66" cy="58" r="3" />
        <circle cx="134" cy="58" r="3" />
        <circle cx="148" cy="66" r="3" />
      </g>
    </g>
  ),
  nose: () => (
    <g>
      <ellipse cx="86" cy="104" rx="3.6" ry="2.8" fill="#173d1f" />
      <ellipse cx="114" cy="104" rx="3.6" ry="2.8" fill="#173d1f" />
    </g>
  ),
  noStem: true,
  snout: () => (
    <g fill="#fff" stroke="#c9d9a0" strokeWidth="1" strokeLinejoin="round">
      <path d="M66 126 l5 9 l5 -9 Z" />
      <path d="M124 126 l5 9 l5 -9 Z" />
      <path d="M80 130 l4 7 l4 -7 Z" />
      <path d="M112 130 l4 7 l4 -7 Z" />
    </g>
  ),
  tail: (c) => (
    <g>
      <path d="M126 204 C150 214 182 224 204 220 C196 208 170 196 126 190 Z" fill={fur(c)} />
      <path d="M150 198 L156 188 L162 200 Z M166 204 L173 193 L178 207 Z M182 210 L190 200 L193 214 Z" fill="#2f8a3e" />
      <path d="M126 204 C150 214 182 224 204 220" fill="none" stroke="#1f6a2e" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
    </g>
  ),
}

/** Die Giraffe: Hörnchen, Flecken, helle Schnauze. */
const giraffe: Skin = {
  id: 'giraffe',
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
  fur: ['#4a5166', '#323848', '#232734'],
  light: ['#ffffff', '#e6ecf5'],
  ink: '#10131c',
  shade: '#10131c',
  paw: '#2a3040',
  foot: '#ff9a2e',
  arm: '#2e3444',
  cheek: '#ff8fa3',
  muzzle: 'M30 92 C34 74 52 68 70 78 C84 86 92 98 100 100 C108 98 116 86 130 78 C148 68 166 74 170 92 C172 124 146 148 100 148 C54 148 28 124 30 92 Z',
  belly: true,
  earL: () => <g />,
  earR: () => <g />,
  nose: () => (
    <g>
      <path d="M86 104 Q100 96 114 104 Q112 116 100 122 Q88 116 86 104 Z" fill="#ff9a2e" />
      <path d="M88 108 Q100 112 112 108" stroke="#d97a0d" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="95" cy="102.6" rx="4" ry="1.5" fill="#fff" opacity="0.55" />
    </g>
  ),
  noStem: true,
  tail: () => <path d="M126 210 C146 220 158 216 164 204 C150 204 138 198 126 192 Z" fill="#232734" />,
}

/** Das Nilpferd: breite rosa Schnauze, kleine Ohren. */
const nilpferd: Skin = {
  id: 'nilpferd',
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
  label: 'Zebra',
  name: 'Zora',
  blurb: 'Fällt gern auf',
  fur: ['#ffffff', '#f6f6f8', '#e6e6eb'],
  light: ['#d9d9e0', '#bdbdc8'],
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
      <path d="M52 168 C62 164 70 166 74 172 C66 172 58 176 52 182 Z" />
      <path d="M148 168 C138 164 130 166 126 172 C134 172 142 176 148 182 Z" />
      <path d="M58 192 C68 188 76 190 80 196 C72 196 64 200 58 206 Z" />
      <path d="M142 192 C132 188 124 190 120 196 C128 196 136 200 142 206 Z" />
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
      <path d="M52 170 C62 166 70 168 74 174 C66 174 58 178 52 184 Z" />
      <path d="M148 170 C138 166 130 168 126 174 C134 174 142 178 148 184 Z" />
      <path d="M58 194 C68 190 76 192 80 198 C72 198 64 202 58 208 Z" />
      <path d="M142 194 C132 190 124 192 120 198 C128 198 136 202 142 208 Z" />
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
