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

## Was dahintersteckt

1. **Einrichtung:** Nur noch Klasse und Fächer werden gefragt; Einführung (auf Wunsch), Tierwahl (Pfeile auf dem Startbildschirm), Lernzeit und Schulstunden sind aus dem Weg. Auf dem letzten Bildschirm startet ein Tipp auf ein Themenvorschlag gleich die KI, und „Los geht’s“ speichert und beginnt die Runde.
2. **Eintragen in einem Satz:** Hausaufgaben („Mathe S. 52 bis morgen“) und Arbeiten („Bio Test Zelle 15.10.“) werden mit Fach, Tag und Art erkannt.
3. **Neue Karteikarten:** „Neu erstellen“ öffnet gleich das Fenster mit den Themenvorschlägen statt eines langen Formulars; „Speichern und üben“ spart den Umweg über die Stapelseite.

## Grenzen (ehrlich)

- Tippen sind ein Stellvertreter für Aufwand, keine Zeitmessung und keine Messung mit echten Nutzern. Wie es sich auf einem Handy anfühlt, zeigt erst ein Versuch mit echten Schülern (zwei Freunde nutzen die App schon: ein kurzer Versuch mit frischem Browser-Profil wäre die beste nächste Messung).
- Unverändert und deshalb nicht in der Tabelle: „Heutige Runde starten“ (1 Tipp), Karten beantworten, Profil und Einstellungen.
- Die KI und das Puter-Fenster sind nur nachgebaut getestet. Beim ersten Mal kommt im echten Betrieb das Anmeldefenster von Puter dazu (bei Aufgabe 1 und 3 ein zusätzlicher Handgriff im Fenster, kein Tippen in der App).
- Aufgabe 3 ist der kleinste Gewinn, weil ein eigenes Thema (statt eines Vorschlags) einen Tipp mehr braucht (4 statt 3).
