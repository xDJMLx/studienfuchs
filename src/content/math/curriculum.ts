import type { Explanation } from '../../lib/types'

/**
 * Lehrplan Mathematik, Klasse 7 (orientiert am Berliner Rahmenlehrplan 1 bis 10):
 * Zahlen (rationale Zahlen, Brüche, Prozent), Terme und Gleichungen, Zuordnungen, Messen und Geometrie, Daten und Zufall.
 * Texte in Mathe-Schreibweise: $…$ für Terme, {Zähler|Nenner} für Brüche, ^2 für Hochzahlen.
 */
export interface MathLessonDef {
  title: string
  /** Fähigkeiten, aus denen die Aufgaben dieser Lektion erzeugt werden */
  skills: string[]
  explanation: Explanation
}

export interface FormulaCard {
  title: string
  lines: string[]
}

export interface MathUnitDef {
  title: string
  description: string
  lessons: MathLessonDef[]
  /** Merkblatt zur Einheit (Formelsammlung) */
  formulas: FormulaCard[]
}

const ex = (title: string, paragraphs: string[], examples: { fr: string; de: string }[], tip?: string): Explanation => ({ title, paragraphs, examples, tip, math: true })

export const MATH_GRADE_7: MathUnitDef[] = [
  {
    title: 'Rationale Zahlen',
    description: 'Negative Zahlen, Vorzeichenregeln und Rechnen mit Klammern',
    lessons: [
      {
        title: 'Negative Zahlen',
        skills: ['rz.vergleichen', 'rz.betrag'],
        explanation: ex(
          'Zahlen mit Vorzeichen',
          [
            'Auf dem Zahlenstrahl liegen die negativen Zahlen links von der Null. Je weiter links eine Zahl liegt, desto kleiner ist sie. Darum ist −7 kleiner als −2.',
            'Der Betrag einer Zahl ist ihr Abstand zur Null, also nie negativ. Die Gegenzahl liegt gleich weit entfernt auf der anderen Seite der Null.',
          ],
          [
            { fr: '$−7 < −2$', de: 'Links liegt das Kleinere.' },
            { fr: '$|−7| = 7$', de: 'Der Betrag ist der Abstand zur Null.' },
            { fr: 'Gegenzahl von $−4$: $4$', de: 'Das Vorzeichen wechselt.' },
          ],
          'Von zwei negativen Zahlen ist die kleiner, die weiter von der Null entfernt ist.',
        ),
      },
      {
        title: 'Addieren und Subtrahieren',
        skills: ['rz.add', 'rz.sub'],
        explanation: ex(
          'Plus und Minus mit Vorzeichen',
          [
            'Gleiche Vorzeichen: Du addierst die Beträge und behältst das Vorzeichen. Verschiedene Vorzeichen: Du subtrahierst die Beträge, das Vorzeichen hat die Zahl mit dem größeren Betrag.',
            'Subtrahieren heißt, die Gegenzahl zu addieren. Aus „minus minus“ wird Plus.',
          ],
          [
            { fr: '$(−3) + (−4) = −7$', de: 'Gleiche Vorzeichen: 3 + 4 = 7, mit Minus.' },
            { fr: '$4 + (−9) = −5$', de: 'Verschieden: 9 − 4 = 5, die 9 ist negativ.' },
            { fr: '$5 − (−3) = 5 + 3 = 8$', de: 'Minus eine negative Zahl ist Plus.' },
          ],
          'Stell dir einen Zahlenstrahl vor: Plus geht nach rechts, Minus nach links.',
        ),
      },
      {
        title: 'Malnehmen und Teilen',
        skills: ['rz.mul', 'rz.div'],
        explanation: ex(
          'Die Vorzeichenregeln',
          [
            'Beim Multiplizieren und Dividieren rechnest du erst mit den Beträgen. Dann bestimmst du das Vorzeichen: Gleiche Vorzeichen ergeben Plus, verschiedene ergeben Minus.',
            'Bei mehreren Faktoren zählst du die negativen: Eine gerade Anzahl ergibt Plus, eine ungerade Minus.',
          ],
          [
            { fr: '$(−3) · (−4) = 12$', de: 'Minus mal Minus ist Plus.' },
            { fr: '$(−3) · 4 = −12$', de: 'Verschiedene Vorzeichen: Minus.' },
            { fr: '$(−20) : 5 = −4$', de: 'Beim Teilen gilt dasselbe.' },
            { fr: '$(−2) · (−3) · (−4) = −24$', de: 'Drei negative Faktoren: Minus.' },
          ],
        ),
      },
      {
        title: 'Punkt vor Strich und Klammern',
        skills: ['rz.punkt'],
        explanation: ex(
          'Reihenfolge beim Rechnen',
          [
            'Zuerst rechnest du, was in Klammern steht. Dann kommt Punktrechnung (mal und geteilt) vor Strichrechnung (plus und minus).',
            'Das gilt auch mit negativen Zahlen. Schreibe die Zwischenschritte auf, dann verrutschen die Vorzeichen nicht.',
          ],
          [
            { fr: '$2 + (−3) · 4 = 2 + (−12) = −10$', de: 'Erst das Malnehmen.' },
            { fr: '$(2 + (−3)) · 4 = (−1) · 4 = −4$', de: 'Die Klammer zuerst.' },
          ],
        ),
      },
      {
        title: 'Negative Zahlen im Alltag',
        skills: ['rz.anwenden', 'rz.add', 'rz.sub'],
        explanation: ex(
          'Temperaturen, Konto und Höhen',
          [
            'Negative Zahlen kommen im Alltag vor: bei Temperaturen unter null, bei Schulden und beim Kontostand, bei Höhen unter dem Meeresspiegel.',
            'Steigt etwas oder kommt etwas dazu, addierst du. Sinkt es oder wird etwas abgezogen, subtrahierst du.',
          ],
          [
            { fr: '$−4 + 9 = 5$', de: 'Von −4 °C um 9 Grad wärmer: 5 °C.' },
            { fr: '$−35 − 20 = −55$', de: '20 € mehr Schulden: −55 €.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Vorzeichenregeln', lines: ['$(+) · (+) = +$   $(−) · (−) = +$', '$(+) · (−) = −$   $(−) · (+) = −$', 'Beim Teilen gelten dieselben Regeln.'] },
      { title: 'Plus und Minus', lines: ['$a − (−b) = a + b$', 'Gleiche Vorzeichen: Beträge addieren.', 'Verschiedene: Beträge subtrahieren, Vorzeichen der größeren.'] },
      { title: 'Betrag und Gegenzahl', lines: ['$|−5| = 5$   $|5| = 5$', 'Gegenzahl von $a$ ist $−a$.'] },
    ],
  },
  {
    title: 'Brüche und Dezimalzahlen',
    description: 'Erweitern, Kürzen, Vergleichen und Rechnen mit Brüchen',
    lessons: [
      {
        title: 'Erweitern und Kürzen',
        skills: ['br.erweitern', 'br.kuerzen'],
        explanation: ex(
          'Brüche erweitern und kürzen',
          [
            'Ein Bruch behält seinen Wert, wenn du Zähler und Nenner mit derselben Zahl multiplizierst (erweitern) oder durch dieselbe Zahl teilst (kürzen).',
            'Gekürzt ist ein Bruch, wenn Zähler und Nenner keinen gemeinsamen Teiler mehr haben. Den größten gemeinsamen Teiler findest du, indem du beide Zahlen in Faktoren zerlegst.',
          ],
          [
            { fr: '{3|4} = {3 · 3|4 · 3} = {9|12}', de: 'Erweitert mit 3.' },
            { fr: '{12|18} = {12 : 6|18 : 6} = {2|3}', de: 'Gekürzt mit 6.' },
          ],
          'Immer beide Zahlen, Zähler und Nenner, gleich behandeln.',
        ),
      },
      {
        title: 'Brüche vergleichen',
        skills: ['br.vergleichen', 'br.kuerzen'],
        explanation: ex(
          'Welcher Bruch ist größer?',
          [
            'Haben zwei Brüche denselben Nenner, ist der mit dem größeren Zähler größer: {5|8} ist größer als {3|8}.',
            'Bei verschiedenen Nennern hilft das Überkreuz-Multiplizieren: Bei {3|4} und {5|6} ergibt 3 · 6 = 18 und 5 · 4 = 20. Weil 18 < 20, ist {3|4} kleiner als {5|6}.',
          ],
          [
            { fr: '{5|8} > {3|8}', de: 'Gleicher Nenner: der Zähler entscheidet.' },
            { fr: '{3|4} < {5|6}', de: 'Über Kreuz: 18 < 20.' },
          ],
        ),
      },
      {
        title: 'Addieren und Subtrahieren',
        skills: ['br.add'],
        explanation: ex(
          'Brüche addieren und subtrahieren',
          [
            'Gleichnamige Brüche addierst du, indem du nur die Zähler rechnest. Der Nenner bleibt: {2|7} + {3|7} = {5|7}.',
            'Bei verschiedenen Nennern machst du die Brüche erst gleichnamig. Der Hauptnenner ist das kleinste gemeinsame Vielfache der Nenner. Danach rechnest du die Zähler und kürzt am Ende.',
          ],
          [
            { fr: '{1|2} + {1|3} = {3|6} + {2|6} = {5|6}', de: 'Hauptnenner 6.' },
            { fr: '{3|4} − {1|6} = {9|12} − {2|12} = {7|12}', de: 'Hauptnenner 12.' },
          ],
          'Die Nenner werden nie addiert!',
        ),
      },
      {
        title: 'Malnehmen und Teilen',
        skills: ['br.mul', 'br.div'],
        explanation: ex(
          'Brüche multiplizieren und dividieren',
          [
            'Brüche multiplizierst du, indem du Zähler mal Zähler und Nenner mal Nenner rechnest. Kürze am besten schon vorher über Kreuz.',
            'Durch einen Bruch teilst du, indem du mit seinem Kehrwert multiplizierst. Der Kehrwert entsteht, wenn du Zähler und Nenner vertauschst.',
          ],
          [
            { fr: '{2|3} · {3|5} = {6|15} = {2|5}', de: 'Zähler mal Zähler, Nenner mal Nenner.' },
            { fr: '{3|4} : {2|3} = {3|4} · {3|2} = {9|8}', de: 'Mit dem Kehrwert malnehmen.' },
          ],
        ),
      },
      {
        title: 'Dezimalzahlen',
        skills: ['dez.rechnen', 'dez.bruch'],
        explanation: ex(
          'Rechnen mit Komma',
          [
            'Beim Addieren und Subtrahieren schreibst du Komma unter Komma. Beim Multiplizieren rechnest du ohne Komma und setzt es am Ende so, dass das Ergebnis so viele Nachkommastellen hat wie beide Faktoren zusammen.',
            'Einen Bruch wandelst du in eine Dezimalzahl um, indem du Zähler durch Nenner teilst. Umgekehrt liest du 0,35 als {35|100} und kürzt zu {7|20}.',
          ],
          [
            { fr: '$0,4 · 0,7 = 0,28$', de: '4 · 7 = 28, zwei Nachkommastellen.' },
            { fr: '{3|4} = 3 : 4 = 0,75', de: 'Zähler durch Nenner.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Erweitern und Kürzen', lines: ['Erweitern: {a|b} = {a · k|b · k}', 'Kürzen: {a|b} = {a : k|b : k}'] },
      { title: 'Addieren und Subtrahieren', lines: ['Gleichnamig machen, dann Zähler rechnen.', '{a|c} + {b|c} = {a + b|c}'] },
      { title: 'Multiplizieren und Dividieren', lines: ['{a|b} · {c|d} = {a · c|b · d}', '{a|b} : {c|d} = {a|b} · {d|c}'] },
    ],
  },
  {
    title: 'Prozentrechnung',
    description: 'Prozentwert, Grundwert, Prozentsatz, Rabatt und Zinsen',
    lessons: [
      {
        title: 'Prozent, Bruch, Dezimalzahl',
        skills: ['pz.umwandeln'],
        explanation: ex(
          'Drei Schreibweisen für dasselbe',
          [
            'Prozent heißt „von Hundert“: 25 % sind {25|100}. Gekürzt ist das {1|4}, als Dezimalzahl 0,25.',
            'Einige Werte lohnt es sich auswendig zu wissen: 50 % = {1|2}, 25 % = {1|4}, 75 % = {3|4}, 10 % = {1|10}, 20 % = {1|5}.',
          ],
          [
            { fr: '$25 % = {25|100} = {1|4} = 0,25$', de: 'Alle drei sind gleich viel.' },
            { fr: '{3|5} = {60|100} = 60 %', de: 'Auf Nenner 100 erweitern.' },
          ],
        ),
      },
      {
        title: 'Prozentwert',
        skills: ['pz.wert'],
        explanation: ex(
          'Wie viel sind p Prozent?',
          [
            'Drei Größen gehören zusammen: der Grundwert G (das Ganze, 100 %), der Prozentsatz p % und der Prozentwert W (der Teil).',
            'Den Prozentwert berechnest du mit W = G · p : 100. Beispiel: 15 % von 240 € sind 240 · 0,15 = 36 €.',
          ],
          [
            { fr: '10 % von 80 € = 8 €', de: 'Ein Zehntel.' },
            { fr: '25 % von 60 kg = 15 kg', de: 'Ein Viertel.' },
          ],
          'Ein Prozent bekommst du, indem du durch 100 teilst.',
        ),
      },
      {
        title: 'Grundwert',
        skills: ['pz.grund'],
        explanation: ex(
          'Das Ganze finden',
          [
            'Wenn Prozentwert und Prozentsatz bekannt sind, suchst du das Ganze: Erst rechnest du auf 1 % zurück, dann auf 100 % hoch.',
            'Beispiel: 15 % sind 36 €. Dann ist 1 % genau 36 : 15 = 2,40 €, und 100 % sind 240 €.',
          ],
          [{ fr: '20 % sind 30 → 1 % sind 1,5 → 100 % sind 150', de: 'Durch 20, dann mal 100.' }],
        ),
      },
      {
        title: 'Prozentsatz',
        skills: ['pz.satz'],
        explanation: ex(
          'Wie viel Prozent ist der Teil?',
          [
            'Willst du wissen, wie viel Prozent ein Teil vom Ganzen ist, teilst du: Prozentwert durch Grundwert. Das Ergebnis mal 100 ist der Prozentsatz.',
            'Beispiel: 12 von 48 Schülern fehlen. 12 : 48 = 0,25, also 25 %.',
          ],
          [{ fr: '9 von 36 = 9 : 36 = 0,25 = 25 %', de: 'Teil durch Ganzes.' }],
        ),
      },
      {
        title: 'Rabatt und Preiserhöhung',
        skills: ['pz.preis'],
        explanation: ex(
          'Neuer Preis',
          [
            'Bei einem Rabatt rechnest du den Prozentwert aus und ziehst ihn vom alten Preis ab. Bei einer Erhöhung addierst du ihn.',
            'Schneller geht es mit dem Faktor: 20 % Rabatt heißt, 80 % bleiben, also mal 0,80. 19 % Aufschlag heißt mal 1,19.',
          ],
          [
            { fr: '80 € − 15 % → 80 · 0,85 = 68 €', de: 'Rabatt.' },
            { fr: '200 € + 19 % → 200 · 1,19 = 238 €', de: 'Mehrwertsteuer.' },
          ],
        ),
      },
      {
        title: 'Zinsen',
        skills: ['pz.zins'],
        explanation: ex(
          'Zinsrechnung',
          [
            'Zinsen sind der Prozentwert vom Kapital. Für ein Jahr gilt: Z = K · p : 100.',
            'Für einen Teil des Jahres rechnest du anteilig: für 6 Monate die Hälfte, für 3 Monate ein Viertel der Jahreszinsen.',
          ],
          [
            { fr: '1200 € bei 3 %: 1200 · 0,03 = 36 €', de: 'Zinsen für ein Jahr.' },
            { fr: 'Für 6 Monate: 36 € : 2 = 18 €', de: 'Anteilig.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Die drei Grundaufgaben', lines: ['Prozentwert: $W = G · p : 100$', 'Grundwert: $G = W : p · 100$', 'Prozentsatz: $p = W : G · 100$'] },
      { title: 'Mit dem Faktor rechnen', lines: ['Rabatt von p %: Faktor $1 − p/100$', 'Aufschlag von p %: Faktor $1 + p/100$'] },
      { title: 'Zinsen', lines: ['Jahreszinsen: $Z = K · p : 100$', 'Für t Monate: $Z = K · p : 100 · t : 12$'] },
      { title: 'Wichtige Werte', lines: ['50 % = {1|2}   25 % = {1|4}   75 % = {3|4}', '10 % = {1|10}   20 % = {1|5}'] },
    ],
  },
  {
    title: 'Terme und Gleichungen',
    description: 'Terme umformen und Gleichungen mit einer Unbekannten lösen',
    lessons: [
      {
        title: 'Terme berechnen',
        skills: ['tm.einsetzen'],
        explanation: ex(
          'Zahlen für Variablen einsetzen',
          [
            'Ein Term ist eine Rechenvorschrift mit Zahlen und Variablen, zum Beispiel $3x + 2$. Setzt du für x eine Zahl ein, kannst du den Wert ausrechnen.',
            'Bei negativen Zahlen setzt du Klammern. Für $x = −2$ wird aus $3x + 2$ die Rechnung $3 · (−2) + 2 = −4$.',
          ],
          [
            { fr: '$3x + 2$ für $x = 4$: $3 · 4 + 2 = 14$', de: 'Einsetzen und rechnen.' },
            { fr: '$x^2 − 3x$ für $x = −2$: $4 + 6 = 10$', de: 'Klammern bei negativen Zahlen.' },
          ],
        ),
      },
      {
        title: 'Terme zusammenfassen',
        skills: ['tm.zusammen'],
        explanation: ex(
          'Gleichartiges zusammenfassen',
          [
            'Gleichartige Glieder darfst du zusammenfassen: $3x + 5x = 8x$. Zahlen fasst du für sich zusammen.',
            'Verschiedene Glieder bleiben getrennt: $3x + 5$ lässt sich nicht weiter vereinfachen.',
          ],
          [
            { fr: '$3x + 5x − 2x = 6x$', de: '3 + 5 − 2 = 6.' },
            { fr: '$4x + 3 + 2x − 1 = 6x + 2$', de: 'x-Glieder und Zahlen getrennt.' },
          ],
        ),
      },
      {
        title: 'Klammern auflösen',
        skills: ['tm.klammer'],
        explanation: ex(
          'Ausmultiplizieren',
          [
            'Der Faktor vor der Klammer wird mit jedem Glied in der Klammer multipliziert: $3(x + 4) = 3x + 12$.',
            'Achte auf die Vorzeichen: $−2(x − 5) = −2x + 10$, denn minus mal minus ergibt plus.',
          ],
          [
            { fr: '$3(x + 4) = 3x + 12$', de: '3 · x und 3 · 4.' },
            { fr: '$−2(x − 5) = −2x + 10$', de: '(−2) · (−5) = 10.' },
          ],
        ),
      },
      {
        title: 'Einfache Gleichungen',
        skills: ['gl.einfach'],
        explanation: ex(
          'Die Waage im Gleichgewicht',
          [
            'Eine Gleichung ist wie eine Waage: Was du auf einer Seite machst, machst du auch auf der anderen. So bleibt sie im Gleichgewicht.',
            'Um x allein zu bekommen, machst du jede Rechnung mit der Umkehrung rückgängig: Plus mit Minus, Mal mit Geteilt.',
          ],
          [
            { fr: '$x + 7 = 15$   | − 7   →   $x = 8$', de: 'Auf beiden Seiten 7 abziehen.' },
            { fr: '$4x = 28$   | : 4   →   $x = 7$', de: 'Beide Seiten durch 4.' },
          ],
          'Mach am Ende die Probe: Setze die Lösung in die Gleichung ein.',
        ),
      },
      {
        title: 'Gleichungen in zwei Schritten',
        skills: ['gl.zwei', 'gl.einfach'],
        explanation: ex(
          'Erst die Zahl, dann den Faktor',
          [
            'Bei $3x + 5 = 20$ bringst du erst die 5 auf die andere Seite (minus 5), dann teilst du durch 3.',
            'Steht x auf beiden Seiten, sammelst du alle x auf einer Seite und alle Zahlen auf der anderen.',
          ],
          [
            { fr: '$3x + 5 = 20$   | − 5   →   $3x = 15$   | : 3   →   $x = 5$', de: 'Zwei Schritte.' },
            { fr: '$4x − 3 = 2x + 9$   | − 2x   →   $2x − 3 = 9$   →   $x = 6$', de: 'x auf einer Seite sammeln.' },
          ],
        ),
      },
      {
        title: 'Textaufgaben',
        skills: ['gl.text', 'gl.einfach'],
        explanation: ex(
          'Aus Text wird Gleichung',
          [
            'So gehst du vor: Lies die Aufgabe genau. Lege fest, wofür x steht. Schreibe aus dem Text eine Gleichung. Löse sie und prüfe mit einer Probe.',
            'Wörter wie „mehr als“ bedeuten Plus, „vermindert um“ Minus und „das Dreifache“ mal 3.',
          ],
          [
            { fr: 'Das Doppelte einer Zahl, vermehrt um 5, ist 17: $2x + 5 = 17$', de: 'x = 6.' },
            { fr: 'Lena hat x €, ihr Bruder 12 € mehr: $x + (x + 12)$', de: 'Zusammen addieren.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Gleichungen lösen', lines: ['Auf beiden Seiten dasselbe tun.', 'Plus ↔ Minus, Mal ↔ Geteilt', 'Am Ende die Probe machen.'] },
      { title: 'Klammern', lines: ['$a(b + c) = ab + ac$', '$a(b − c) = ab − ac$'] },
      { title: 'Zusammenfassen', lines: ['$ax + bx = (a + b)x$', 'Zahlen und x-Glieder getrennt.'] },
    ],
  },
  {
    title: 'Zuordnungen',
    description: 'Proportionale und antiproportionale Zuordnungen, Dreisatz',
    lessons: [
      {
        title: 'Zuordnungen erkennen',
        skills: ['zu.erkennen'],
        explanation: ex(
          'Proportional oder antiproportional?',
          [
            'Eine Zuordnung ist proportional, wenn zum Doppelten das Doppelte gehört. Dann ist der Quotient y : x immer gleich.',
            'Sie ist antiproportional, wenn zum Doppelten die Hälfte gehört. Dann ist das Produkt x · y immer gleich.',
          ],
          [
            { fr: '$x: 1, 2, 3$   $y: 4, 8, 12$', de: 'y : x = 4 immer: proportional.' },
            { fr: '$x: 1, 2, 4$   $y: 12, 6, 3$', de: 'x · y = 12 immer: antiproportional.' },
          ],
        ),
      },
      {
        title: 'Dreisatz: proportional',
        skills: ['zu.dreisatz'],
        explanation: ex(
          'Je mehr, desto mehr',
          [
            'Beim Dreisatz rechnest du in drei Schritten: Gegeben, auf 1 zurückrechnen, auf die gesuchte Menge hochrechnen.',
            'Beispiel: 5 Brötchen kosten 2,00 €. 1 Brötchen kostet 2,00 : 5 = 0,40 €. 8 Brötchen kosten 8 · 0,40 = 3,20 €.',
          ],
          [{ fr: '5 → 2,00 €   |   : 5   →   1 → 0,40 €   |   · 8   →   8 → 3,20 €', de: 'Erst auf 1, dann hoch.' }],
        ),
      },
      {
        title: 'Dreisatz: antiproportional',
        skills: ['zu.anti'],
        explanation: ex(
          'Je mehr, desto weniger',
          [
            'Bei antiproportionalen Zuordnungen rechnest du über das Produkt: 4 Arbeiter brauchen 6 Tage, das sind 24 Arbeitertage. 3 Arbeiter brauchen 24 : 3 = 8 Tage.',
            'Prüfe mit gesundem Menschenverstand: Weniger Arbeiter brauchen länger.',
          ],
          [{ fr: '4 · 6 = 24   →   24 : 3 = 8', de: 'Das Produkt bleibt gleich.' }],
        ),
      },
      {
        title: 'Tabellen',
        skills: ['zu.tabelle', 'zu.erkennen'],
        explanation: ex(
          'Fehlende Werte ergänzen',
          [
            'In einer proportionalen Tabelle ist y : x immer gleich. Aus einem bekannten Paar findest du den Faktor und damit jeden fehlenden Wert.',
            'In einer antiproportionalen Tabelle ist x · y immer gleich.',
          ],
          [
            { fr: '$x: 2, 4, 6$   $y: 5, 10, ?$   →   $y = 15$', de: 'Faktor 2,5.' },
            { fr: '$x: 2, 3, 4$   $y: 12, 8, ?$   →   $y = 6$', de: 'Produkt 24.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Proportional', lines: ['$y = k · x$', '$y : x$ ist immer gleich.', 'Doppeltes x → doppeltes y.'] },
      { title: 'Antiproportional', lines: ['$x · y = k$', '$x · y$ ist immer gleich.', 'Doppeltes x → halbes y.'] },
      { title: 'Dreisatz', lines: ['Proportional: erst durch, dann mal.', 'Antiproportional: erst mal (Produkt), dann durch.'] },
    ],
  },
  {
    title: 'Geometrie',
    description: 'Winkel, Umfang, Flächen und Volumen',
    lessons: [
      {
        title: 'Winkel an Geraden',
        skills: ['ge.winkel'],
        explanation: ex(
          'Neben-, Scheitel-, Stufen- und Wechselwinkel',
          [
            'Schneiden sich zwei Geraden, entstehen vier Winkel. Nebenwinkel ergeben zusammen 180°. Scheitelwinkel liegen sich gegenüber und sind gleich groß.',
            'Werden zwei parallele Geraden von einer dritten geschnitten, sind Stufenwinkel und Wechselwinkel gleich groß.',
          ],
          [
            { fr: 'Nebenwinkel: $180° − 65° = 115°$', de: 'Ergänzen sich zu 180°.' },
            { fr: 'Scheitelwinkel von $65°$: $65°$', de: 'Gleich groß.' },
          ],
        ),
      },
      {
        title: 'Winkelsumme',
        skills: ['ge.dreieck'],
        explanation: ex(
          'Im Dreieck 180°, im Viereck 360°',
          [
            'In jedem Dreieck ergeben die drei Winkel zusammen 180°. In jedem Viereck sind es 360°.',
            'Im gleichschenkligen Dreieck sind die beiden Basiswinkel gleich groß. Im rechtwinkligen Dreieck ergeben die beiden spitzen Winkel zusammen 90°.',
          ],
          [
            { fr: '$γ = 180° − 55° − 70° = 55°$', de: 'Der dritte Winkel.' },
            { fr: 'Basiswinkel: $(180° − 40°) : 2 = 70°$', de: 'Spitze 40°.' },
          ],
        ),
      },
      {
        title: 'Umfang und Fläche',
        skills: ['ge.umfang', 'ge.flaeche'],
        explanation: ex(
          'Rand und Inhalt',
          [
            'Der Umfang ist die Länge des Randes, die Fläche das, was innen liegt. Der Umfang wird in cm gemessen, die Fläche in cm².',
            'Rechteck: A = a · b. Dreieck: A = g · h : 2. Parallelogramm: A = g · h. Trapez: A = (a + c) · h : 2.',
          ],
          [
            { fr: 'Rechteck 5 cm × 3 cm: $U = 2 · (5 + 3) = 16$ cm, $A = 15$ cm²', de: 'Umfang und Fläche.' },
            { fr: 'Dreieck $g = 6$, $h = 4$: $A = 12$ cm²', de: 'Halbes Rechteck.' },
          ],
        ),
      },
      {
        title: 'Volumen und Oberfläche',
        skills: ['ge.volumen'],
        explanation: ex(
          'Wie viel passt hinein?',
          [
            'Das Volumen sagt, wie viel in einen Körper passt. Quader: V = a · b · c. Würfel: V = a · a · a.',
            'Die Oberfläche ist die Summe aller Seitenflächen. Würfel: O = 6 · a². Ein Liter sind 1000 cm³.',
          ],
          [
            { fr: 'Quader 4 · 3 · 2 = 24 cm³', de: 'Länge mal Breite mal Höhe.' },
            { fr: 'Würfel $a = 3$ cm: $O = 6 · 9 = 54$ cm²', de: 'Sechs Quadrate.' },
          ],
        ),
      },
      {
        title: 'Einheiten umrechnen',
        skills: ['ge.einheiten'],
        explanation: ex(
          'Von Einheit zu Einheit',
          [
            'Bei Längen springt man mit 10 von Einheit zu Einheit (mm, cm, dm, m), bei Flächen mit 100 und bei Rauminhalten mit 1000.',
            'Wichtig: 1 m = 100 cm, 1 m² = 10 000 cm², 1 m³ = 1000 l, 1 cm³ = 1 ml.',
          ],
          [
            { fr: '$2,5$ km = 2500 m', de: 'Mal 1000.' },
            { fr: '$3$ m² = 30 000 cm²', de: 'Mal 10 000.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Winkel', lines: ['Nebenwinkel: zusammen 180°', 'Scheitel-, Stufen-, Wechselwinkel: gleich groß', 'Dreieck: 180°   Viereck: 360°'] },
      { title: 'Flächeninhalt', lines: ['Rechteck: $A = a · b$', 'Dreieck: $A = g · h : 2$', 'Parallelogramm: $A = g · h$', 'Trapez: $A = (a + c) · h : 2$'] },
      { title: 'Umfang', lines: ['Rechteck: $U = 2 · (a + b)$', 'Quadrat: $U = 4 · a$'] },
      { title: 'Körper', lines: ['Quader: $V = a · b · c$', 'Würfel: $V = a^3$   $O = 6 · a^2$', '1 l = 1000 cm³ = 1 dm³'] },
    ],
  },
  {
    title: 'Daten und Zufall',
    description: 'Mittelwert, Median, Spannweite und Wahrscheinlichkeit',
    lessons: [
      {
        title: 'Mittelwert',
        skills: ['da.mittel'],
        explanation: ex(
          'Der Durchschnitt',
          [
            'Der Mittelwert sagt, wie viel jeder hätte, wenn alles gleich verteilt wäre. Du addierst alle Werte und teilst durch die Anzahl.',
            'Beispiel: Die Noten 2, 3, 3, 4 haben die Summe 12. Geteilt durch 4 ergibt das 3.',
          ],
          [{ fr: '$(2 + 3 + 3 + 4) : 4 = 3$', de: 'Summe durch Anzahl.' }],
        ),
      },
      {
        title: 'Median und Spannweite',
        skills: ['da.median', 'da.spann'],
        explanation: ex(
          'Die Mitte und die Breite',
          [
            'Der Median ist der mittlere Wert, wenn die Werte der Größe nach geordnet sind. Bei gerader Anzahl nimmst du den Mittelwert der beiden mittleren.',
            'Die Spannweite ist der Abstand zwischen größtem und kleinstem Wert.',
          ],
          [
            { fr: '3, 5, 9, 12, 20: Median 9', de: 'Die mittlere Zahl.' },
            { fr: '3, 5, 9, 12, 20: Spannweite $20 − 3 = 17$', de: 'Größter minus kleinster Wert.' },
          ],
        ),
      },
      {
        title: 'Wahrscheinlichkeit',
        skills: ['da.haeufig', 'da.laplace'],
        explanation: ex(
          'Wie wahrscheinlich ist das?',
          [
            'Die relative Häufigkeit sagt, wie oft ein Ergebnis im Verhältnis zu allen Versuchen eintrat: Treffer durch Versuche.',
            'Wenn alle Ergebnisse gleich wahrscheinlich sind, ist die Wahrscheinlichkeit „günstige durch alle möglichen“. Beim Würfel ist die Wahrscheinlichkeit für eine gerade Zahl {3|6} = {1|2}.',
          ],
          [
            { fr: '12 von 40 Würfen: $12 : 40 = 0,3 = 30 %$', de: 'Relative Häufigkeit.' },
            { fr: 'P(Primzahl) = {3|6} = {1|2}', de: 'Primzahlen: 2, 3 und 5.' },
          ],
        ),
      },
    ],
    formulas: [
      { title: 'Kennwerte', lines: ['Mittelwert = Summe : Anzahl', 'Median = mittlerer Wert (geordnet)', 'Spannweite = größter − kleinster Wert'] },
      { title: 'Wahrscheinlichkeit', lines: ['Relative Häufigkeit = Treffer : Versuche', 'P = günstige Fälle : alle Fälle', 'P liegt immer zwischen 0 und 1.'] },
    ],
  },
]
