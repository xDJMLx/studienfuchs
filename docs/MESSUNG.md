# Messung: Wie viel einfacher ist die App geworden?

„Besser“ ist kein einzelner Messwert. Gemessen wird hier, was sich zählen lässt und was am meisten stört: **wie viele Tippen und Eingaben** es für die Aufgaben braucht, bei denen man etwas einträgt oder anlegt. Jeder Klick und jede Eingabe (Text tippen, Datum setzen, Enter) zählt als 1.

## Wie gemessen wurde

- Die Fassung **vor** der Überarbeitung (Commit `93a233f`) und die **neue** Fassung laufen in derselben Testumgebung (die ganze App in happy-dom, KI nachgebaut). Ein Skript klickt sich den kürzesten sinnvollen Weg durch und zählt.
- Der Test für die alte Fassung liegt zum Nachlesen in `docs/messung/messung-alt.test.tsx.txt` (in einer Kopie des alten Standes ausführen). Der Test für die neue Fassung ist `src/messung.test.tsx` und läuft bei jedem Bau mit: Wird ein Weg wieder länger, schlägt der Test fehl.

## Ergebnis

| Aufgabe | vorher | jetzt | weniger |
|---|---|---|---|
| 1a. Einrichtung bis zur ersten Lernrunde, Mindestweg (Einführung überspringen, ein Fach) | 11 | 5 | **55 %** |
| 1b. Dasselbe, wie es die meisten machen (Einführung, Tier, Klasse, zwei Fächer, Lernzeit) | 18 | 7 | **61 %** |
| 2. Hausaufgabe mit anderem Fach und Tag („Gedicht lernen, Deutsch, bis übermorgen“) | 5 | 2 | **60 %** |
| 3. Neue Karteikarten zu einem Thema anlegen und gleich üben (von „Üben“ aus) | 5 | 3 | **40 %** |
| 4. Arbeit im Kalender eintragen (Bio-Test am Datum) | 5 | 2 | **60 %** |
| **Mittel über alle fünf Aufgaben** | | | **≈ 55 %** |

Dazu die **Bildschirme** bis zur ersten Lernrunde: vorher 11 (Start, Einführung, Tier, Fächer, Lernzeit, „Fertig“, Erstellen-Formular, Vorschau, Stapelseite, Runde), jetzt 5 (Start, Klasse und Fächer, erste Karteikarten, Vorschau, Runde).

## Zweite Messung: Wie voll sind die Bildschirme?

Die Beschwerde „super unübersichtlich“ betraf die Fülle. Gemessen wird mit gleichen Beispieldaten (3 Fächer, 3 Karteikarten-Sammlungen, 2 Arbeiten) pro Hauptbildschirm (ohne Tab-Leiste): **Bedienelemente** (Knöpfe, Links, Felder) und **Zeichen Text**. Vorher = Commit `266a721` (Stand, den ein Freund als unübersichtlich beschrieb), jetzt = neue Fassung. Test: `src/uebersicht.test.tsx` (hält die neuen Werte als Obergrenzen).

| Bildschirm | Bedienelemente vorher → jetzt | Zeichen Text vorher → jetzt |
|---|---|---|
| Üben | 22 → 13 (**−41 %**) | 758 → 585 (**−23 %**) |
| Fach-Seite | 13 → 12 (−8 %) | 855 → 461 (**−46 %**) |
| Neu erstellen | 18 → 19 (+6 %) | 988 → 809 (**−18 %**) |
| Kalender | 26 → 43 (+65 %) | 334 → 395 (+18 %) |
| Profil | 8 → 9 (+13 %) | 970 → 441 (**−55 %**) |
| Einstellungen | 61 → 14 (**−77 %**) | 4498 → 662 (**−85 %**) |
| **Mittel** | ≈ −7 % | **≈ −36 %** |

Ehrlich gelesen: Beim **Text** ist die App im Mittel gut ein Drittel leerer, bei den Einstellungen und dem Profil deutlich mehr. Bei den **Bedienelementen** ist sie im Mittel gleich geblieben: Üben und Einstellungen sind viel ruhiger, dafür hat der Kalender jetzt ein Monatsraster (jeder Tag des Monats ist eine Taste, die Tage der Nachbarmonate sind leer) plus Eingabezeile, und „Neu erstellen“ und das Profil haben ein Element mehr. Die 50 % gelten also für den **Aufwand beim Einrichten und Eintragen**, nicht für jede Zahl auf jedem Bildschirm.

## Was dahintersteckt

1. **Einrichtung:** Nur noch Klasse und Fächer werden gefragt; Einführung (auf Wunsch), Tierwahl (Pfeile auf dem Startbildschirm), Lernzeit und Schulstunden sind aus dem Weg. Auf dem letzten Bildschirm startet ein Tipp auf ein Themenvorschlag gleich die KI, und „Los geht’s“ speichert und beginnt die Runde.
2. **Eintragen in einem Satz:** Hausaufgaben („Mathe S. 52 bis morgen“) und Arbeiten („Bio Test Zelle 15.10.“) werden mit Fach, Tag und Art erkannt.
3. **Neue Karteikarten:** „Neu erstellen“ öffnet gleich das Fenster mit den Themenvorschlägen statt eines langen Formulars; „Speichern und üben“ spart den Umweg über die Stapelseite.

## Grenzen (ehrlich)

- Eine einzelne Zahl „App ist X % besser“ gibt es nicht. Belegt sind: weniger Tippen für die fünf Aufgaben (≈ 55 %), weniger Text auf den Bildschirmen (≈ 35 %), sehr viel ruhigere Einstellungen und Üben. Nicht belegt sind Gefühl, Lernerfolg und Nutzung mit echten Schülern.
- Tippen sind ein Stellvertreter für Aufwand, keine Zeitmessung und keine Messung mit echten Nutzern. Wie es sich auf einem Handy anfühlt, zeigt erst ein Versuch mit echten Schülern (zwei Freunde nutzen die App schon: ein kurzer Versuch mit frischem Browser-Profil wäre die beste nächste Messung).
- Unverändert und deshalb nicht in der Tabelle: „Heutige Runde starten“ (1 Tipp), Karten beantworten, Profil und Einstellungen.
- Die KI und das Puter-Fenster sind nur nachgebaut getestet. Beim ersten Mal kommt im echten Betrieb das Anmeldefenster von Puter dazu (bei Aufgabe 1 und 3 ein zusätzlicher Handgriff im Fenster, kein Tippen in der App).
- Aufgabe 3 ist der kleinste Gewinn, weil ein eigenes Thema (statt eines Vorschlags) einen Tipp mehr braucht (4 statt 3).
