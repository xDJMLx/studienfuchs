/**
 * Themenvorschläge, damit niemand vor einem leeren Feld sitzt: Je Fach und Klassenstufe ein paar typische Themen, die man antippt.
 * Gedacht als Anstoß, nicht als Lehrplan (jede Schule und jedes Bundesland setzt eigene Schwerpunkte); wer etwas anderes lernt, schreibt es selbst.
 */
type Band = 'unter' | 'mittel' | 'ober'

/** Klassenstufe → Stufe der Vorschläge: 5 bis 7 unter, 8 bis 10 mittel, ab 11 ober. */
export const bandOf = (grade: number): Band => (grade <= 7 ? 'unter' : grade <= 10 ? 'mittel' : 'ober')

const TOPICS: Record<string, Record<Band, string[]>> = {
  mathe: {
    unter: ['Brüche kürzen und erweitern', 'Dezimalzahlen und Prozent', 'Flächen und Umfang', 'Dreisatz'],
    mittel: ['Lineare Funktionen', 'Gleichungen lösen', 'Satz des Pythagoras', 'Prozent- und Zinsrechnung'],
    ober: ['Ableitungen', 'Quadratische Funktionen', 'Wahrscheinlichkeit', 'Vektoren'],
  },
  deutsch: {
    unter: ['Wortarten', 'Satzglieder', 'Zeitformen', 'Rechtschreibregeln (das/dass, ss/ß)'],
    mittel: ['Textanalyse und Stilmittel', 'Erörterung aufbauen', 'Konjunktiv', 'Epochen der Literatur'],
    ober: ['Epochen und Autoren', 'Gedichtanalyse', 'Argumentation und Erörterung', 'Kommunikationsmodelle'],
  },
  englisch: {
    unter: ['Simple Present und Present Progressive', 'Vokabeln: Schule und Alltag', 'Unregelmäßige Verben', 'Fragen und Verneinung'],
    mittel: ['Present Perfect und Simple Past', 'If-Sätze (Conditionals)', 'Indirekte Rede', 'Passiv'],
    ober: ['Linking Words und Essay Writing', 'Stilmittel in Texten', 'Gerund und Infinitive', 'Vokabeln: Politik und Gesellschaft'],
  },
  franzoesisch: {
    unter: ['Vokabeln: Schule und Familie', 'Être und avoir', 'Verben auf -er', 'Zahlen und Uhrzeit'],
    mittel: ['Passé composé', 'Imparfait', 'Pronomen (le, la, les, y, en)', 'Verneinung und Fragen'],
    ober: ['Subjonctif', 'Conditionnel', 'Relativsätze', 'Vokabeln: Umwelt und Gesellschaft'],
  },
  biologie: {
    unter: ['Aufbau der Pflanzenzelle', 'Wirbeltiere und ihre Merkmale', 'Sinnesorgane', 'Ernährung und Verdauung'],
    mittel: ['Zellorganellen und ihre Aufgaben', 'Fotosynthese und Zellatmung', 'Vererbung und Genetik', 'Ökosysteme und Nahrungsnetze'],
    ober: ['DNA und Proteinbiosynthese', 'Stoffwechsel und Enzyme', 'Evolution', 'Nervensystem und Neuronen'],
  },
  physik: {
    unter: ['Kraft und Gewicht', 'Licht und Schatten', 'Temperatur und Wärme', 'Schall'],
    mittel: ['Elektrischer Stromkreis', 'Geschwindigkeit und Beschleunigung', 'Dichte und Druck', 'Energie und Leistung'],
    ober: ['Elektrisches Feld', 'Schwingungen und Wellen', 'Kernphysik', 'Bewegung und Newtonsche Gesetze'],
  },
  chemie: {
    unter: ['Stoffe und ihre Eigenschaften', 'Gemische und Trennverfahren', 'Aggregatzustände', 'Luft und Verbrennung'],
    mittel: ['Atombau und Periodensystem', 'Chemische Reaktionen und Gleichungen', 'Säuren und Laugen', 'Metalle und Salze'],
    ober: ['Redoxreaktionen', 'Organische Chemie', 'Chemisches Gleichgewicht', 'Elektrochemie'],
  },
  geschichte: {
    unter: ['Steinzeit und frühe Hochkulturen', 'Antike: Griechen und Römer', 'Mittelalter und Ritter', 'Entdeckungen und Reformation'],
    mittel: ['Französische Revolution', 'Industrialisierung', 'Erster Weltkrieg', 'Nationalsozialismus'],
    ober: ['Weimarer Republik', 'Kalter Krieg', 'Deutsche Teilung und Einheit', 'Imperialismus'],
  },
  geografie: {
    unter: ['Kontinente und Ozeane', 'Wetter und Klima', 'Karten lesen', 'Deutschland: Bundesländer'],
    mittel: ['Klimazonen der Erde', 'Plattentektonik und Vulkane', 'Bevölkerung und Städte', 'Globalisierung'],
    ober: ['Stadtentwicklung', 'Ressourcen und Energie', 'Entwicklungsländer', 'Klimawandel'],
  },
  politik: {
    unter: ['Familie und Gemeinschaft', 'Regeln und Gesetze', 'Wahlen verstehen', 'Medien'],
    mittel: ['Grundgesetz und Grundrechte', 'Bundestag und Bundesregierung', 'Europäische Union', 'Parteien und Wahlen'],
    ober: ['Demokratie und Gewaltenteilung', 'Soziale Marktwirtschaft', 'Internationale Politik', 'Rechtsstaat'],
  },
  informatik: {
    unter: ['Computer und ihre Bauteile', 'Daten im Netz sicher nutzen', 'Algorithmen', 'Tabellenkalkulation'],
    mittel: ['Programmieren: Schleifen und Bedingungen', 'Binärsystem', 'Datenbanken', 'Netzwerke'],
    ober: ['Objektorientierung', 'Sortieralgorithmen', 'Datenstrukturen', 'Verschlüsselung'],
  },
  kunst: {
    unter: ['Primär- und Sekundärfarben', 'Perspektive und Raum', 'Linien und Formen', 'Bekannte Künstler'],
    mittel: ['Epochen der Kunst', 'Bildanalyse', 'Farbenlehre und Farbwirkung', 'Plastik und Skulptur'],
    ober: ['Kunst des 20. Jahrhunderts', 'Bildanalyse und Interpretation', 'Design und Werbung', 'Architektur'],
  },
  musik: {
    unter: ['Noten und Notenwerte', 'Instrumentengruppen', 'Rhythmus und Takt', 'Tonleitern'],
    mittel: ['Dur und Moll', 'Musikepochen', 'Akkorde', 'Liedanalyse'],
    ober: ['Musikgeschichte', 'Harmonielehre', 'Formen: Sonate und Fuge', 'Popmusik und Gesellschaft'],
  },
  sonstiges: {
    unter: ['Mein aktuelles Thema', 'Wichtige Begriffe aus dem Unterricht', 'Regeln zum Auswendiglernen', 'Das Wichtigste aus dem Heft'],
    mittel: ['Mein aktuelles Thema', 'Wichtige Begriffe aus dem Unterricht', 'Regeln zum Auswendiglernen', 'Das Wichtigste aus dem Heft'],
    ober: ['Mein aktuelles Thema', 'Wichtige Begriffe aus dem Unterricht', 'Regeln zum Auswendiglernen', 'Das Wichtigste aus dem Heft'],
  },
}

/** Bis zu vier Themen zum Antippen für ein Fach und eine Klassenstufe. Unbekannte Fächer bekommen die allgemeinen Vorschläge. */
export function topicSuggestions(subjectId: string, grade: number): string[] {
  return (TOPICS[subjectId] ?? TOPICS.sonstiges)[bandOf(grade)]
}
