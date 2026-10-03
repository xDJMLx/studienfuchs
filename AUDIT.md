# Studienfuchs – Prüfbericht (Design, Animation, Nutzerführung, Lernwirkung)

Stand: 1. Oktober 2026. Alles unten wurde angeschaut (Browser auf Handy- und Desktopbreite, Code, automatische Prüfungen) und, soweit „behoben“ steht, umgesetzt und getestet.

## A) Lernwirkung und Nutzerführung

| # | Problem | Folge | Status |
|---|---------|-------|--------|
| A1 | Die Wiederholung nach Plan (der wirksamste Teil) war nirgends erreichbar: die Seite „Wiederholen“ gab es nur per Adresse. Startseite und Navigation sagten nichts über fällige Wörter. | Wörter werden vergessen, weil niemand weiß, dass sie dran sind. | **behoben**: „Heute“-Karte auf der Startseite (Tagesziel, Serie, „N Wörter wiederholen“), Zahl am Üben-Tab, Wiederholung ganz oben im Üben-Bereich, Lernstand-Seite verlinkt (auch vom Profil) |
| A2 | Üben-Hub: vorgewählt war „Fällig“, meist mit 0 Wörtern, dadurch waren alle Übungsarten grau. „Schreibtraining“ hatte ein Kamera-Symbol. | Erster Eindruck: „geht nicht“. | **behoben**: sinnvolle Vorauswahl, passende Symbole, Erklärung bei 0 Wörtern |
| A3 | Einstufungstest: zwei Auswahlfragen mit je 4 Antworten. Mit Raten ließ sich ca. jede 16. Einheit überspringen, obwohl die App sonst „Raten bringt nichts“ sagt. | Lücken im Stoff. | **behoben**: je Einheit eine Auswahl- und eine Tippaufgabe, beide müssen stimmen (getestet: richtige Auswahl + falsches Tippen überspringt nichts) |
| A4 | Nach einer Lektion ging es zurück zum Lernpfad. Kein „Weiter“, kein Hinweis auf erreichtes Tagesziel. | Mehr Klicks, weniger Dranbleiben. | **behoben**: „Nächste: …“-Knopf direkt im Ergebnis, Hinweis „Tagesziel geschafft“ |
| A5 | Tippaufgaben ohne Hilfe. Wer nicht weiter wusste, musste „Weiß ich nicht“ drücken. | Frust, Abbruch. | **behoben**: „Tipp anzeigen“ (Länge und erster Buchstabe). Ein Treffer mit Tipp zählt nicht als „auf Anhieb richtig“ und wird vom Lernplan als schwächer gewertet |
| A6 | Zahlen widersprachen sich: Wiederholen sagte 682 Wörter, die Wörterliste 341; Willkommen sagte 92 Lektionen, der Lernpfad 68. | Misstrauen in die App. | **behoben**: eine zentrale Zählfunktion für alle Seiten, per Test abgesichert |
| A7 | Wörterliste: Lernstand nur als winziger Punkt ohne Erklärung; Filterleiste lief rechts aus dem Bild; in jeder Zeile ein großer oranger Knopf. | Unübersichtlich, Filter nicht bedienbar. | **behoben**: Etiketten „neu / lernt / fest“ mit Legende, scrollbare Filter, leise Sprechknöpfe |
| A8 | Gesperrte Knoten im Lernpfad sahen alle gleich aus (Schloss), Wiederholung und Test waren nicht zu unterscheiden. | Keine Orientierung. | **behoben**: Symbole bleiben sichtbar, Screenreader-Beschriftung nennt die Art |

## B) Design

| # | Problem | Status |
|---|---------|--------|
| B1 | Lernpfad: Knoten schwebten ohne Verbindung, wirkte wie lose Punkte; Startseite auf dem Desktop leer. | **behoben**: Verbindungslinien (erledigt durchgezogen, offen gepunktet), feste Zeilenhöhe, „Heute“-Karte |
| B2 | Set-Details, Lernstand und Einstufungstest im alten Stil (Großbuchstaben-Links, uneinheitliche Überschriften, rohes Datumsfeld, gequetschtes Symbol). | **behoben**: im neuen Stil, korrekte Symbole |
| B3 | Kontrast: weißer Text auf Orange hatte nur 3,1:1 (hell) und 2,6:1 (dunkel), Mindestwert wäre 4,5:1. | **behoben**: Knöpfe mit Text nutzen eine etwas tiefere Orange-Variante (hell) bzw. dunklen Text (dunkel) |
| B4 | Winzige Tippflächen: Profil-Chip 28 px, Zurück-Links 20 px, Schließen-Knopf 26 px. | **behoben**: mindestens 44 px |
| B5 | KI-Hinweis als langer grauer Textblock mitten in der Karte. | **behoben**: eine Zeile, „Details“ klappt auf |
| B6 | Das Favicon zeigte noch ein älteres Motiv, das Manifest eine grüne Themenfarbe, PNG-App-Symbole fehlten (iPhones brauchen eines). | **behoben**: Fenni als Symbol, PNGs (192/512/maskable/Apple), Manifest in Orange-Weiß |

## C) Animationen

| # | Problem | Status |
|---|---------|--------|
| C1 | Sätze bauen: Wörter sprangen hart zwischen den Zeilen. | **behoben**: Wörter fliegen mit Federung nach oben und zurück |
| C2 | Zuordnen: richtige Paare wurden nur blasser. | **behoben**: kurzes Federn, falscher Versuch wackelt |
| C3 | Listen-Filter wechselten hart. | **behoben**: gleitende Markierung und gestaffeltes Einblenden |
| C4 | Pfad ohne Fortschrittsgefühl. | **behoben**: erledigte Strecken zeichnen sich ein |

## D) Technik, Barrierefreiheit, Robustheit

| # | Problem | Status |
|---|---------|--------|
| D1 | Der Seitentitel war überall gleich. | **behoben**: „Üben · Studienfuchs“ usw. |
| D2 | Ein Darstellungsfehler hätte einen weißen Bildschirm gezeigt. | **behoben**: Fehlerseite mit Neu laden / Startseite |
| D3 | Kein sichtbarer Tastaturfokus, kein „Zum Inhalt springen“. | **behoben** |
| D4 | Französischer Text ohne `lang="fr"` (Screenreader sprechen ihn deutsch). | **behoben** in Wörterliste, Übungen, Lernstand, Sets |
| D5 | Das Maskottchen wurde von Screenreadern bei jeder Verwendung vorgelesen. | **behoben**: dekorativ |

## E) Name

**Lernfuchs → Studienfuchs** in Oberfläche, Titel, Manifest, App-Cache, Paketname, Exportdatei. Vorhandener Fortschritt, Sets und KI-Einstellung werden beim ersten Start automatisch übernommen (getestet). Alte Sicherungsdateien („Lernfuchs“) lassen sich weiter importieren.

## Bekannte Grenzen (ehrlich)

- Die Puter-KI wurde nie mit einem echten Gastkonto durchlaufen (dafür müsste ein Konto angelegt werden).
- Auf einem echten Handy (Touch, Bildschirmtastatur, Ziehen am Sheet-Griff) wurde nicht getestet, nur im Browser-Pane mit Handygröße.
- Inhalte (Vokabeln, Erklärungen) wurden nicht gegen ein bestimmtes Lehrwerk geprüft.
- Das Impressum nennt noch keinen Namen und keine Anschrift: Sie werden in `src/lib/legal.ts` eingetragen (siehe `docs/VEROEFFENTLICHUNG.md`).
