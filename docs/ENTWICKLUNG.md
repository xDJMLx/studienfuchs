# Studienfuchs: Entwicklung und Details

Technische Doku zum Projekt. Die Übersicht mit Bildern steht in der [README](../README.md).

Lern-App für die Schule im Stil moderner Sprach-Apps (Start: Französisch, Klasse 7–10 = Lernjahr 1–4, ca. 340 Lektionen; Klasse 7 und 8 sind entlang von À plus! (Cornelsen) Band 1 und 2 gegliedert). Läuft komplett im Browser und lässt sich kostenlos über GitHub Pages hosten.

**Was anders ist als bei Duolingo:** Erst erklären, dann üben · keine Herzen, keine Werbung, keine Bezahlschranke · Lernpfad nach Lehrplanthemen · eigene Buchseiten hochladen und daraus ein Quiz machen.

## Berlin: Lehrplan, Lehrbücher und Takt (Stand Oktober 2026)
Recherchiert wurden der Rahmenlehrplan Berlin-Brandenburg (Teil C Moderne Fremdsprachen, Niveaustufen A bis H) sowie die Stoffverteilungspläne von Klett (*Découvertes*, Ausgabe ab 2020, eigene Fassung für Berlin/Brandenburg) und Cornelsen (*À plus!*).
- **Niveau (Gymnasium, 2. Fremdsprache ab Klasse 7):** Klasse 7 = Stufe E (A1), 8 = F (A2), 9 = G (B1), 10 = H (B1+). Integrierte Sekundarschule: 7/8 Stufe E (teils F), 9/10 Stufen F bis G. Wer erst in Klasse 8 oder 9 beginnt (3. Fremdsprache), erreicht G/H bis Ende 10 (Rahmenlehrplan). Dafür gibt es "Auch frühere Klassen nachholen".
- **Stunden:** 4 Wochenstunden in Klasse 7 und 8, 3 in Klasse 9 und 10 (Beispiel Gottfried-Keller-Gymnasium). Der Klett-Plan für Berlin rechnet in Klasse 8 mit 32 Unterrichtswochen: Unité 1 Woche 1 bis 4, Unité 2 bis Woche 9, Unité 3 bis 15, Unité 4 bis 20, Unité 5 bis 26, Unité 6 bis 30, danach das Modul.
- **Lehrwerke an Berliner Gymnasien:** *À plus!* (Cornelsen) und *Découvertes* (Klett). Integrierte Sekundarschulen: *À toi!* (Cornelsen), noch nicht abgebildet.
- **Takt in der App:** `src/lib/berlin.ts` rechnet das Berliner Schuljahr mit Ferien aus (Start Ende August, Herbst-, Weihnachts-, Winter- und Osterferien) und verteilt die Kerneinheiten einer Klasse auf 34 Unterrichtswochen. Daraus kommt der Vorschlag "Meist um diese Zeit" beim Aufholen. Die Découvertes-Einheiten sind mit ihrem Anteil am Schuljahr hinterlegt und werden damit der passenden App-Einheit zugeordnet.
- **Zusatzwortschatz:** Der Abgleich mit den veröffentlichten Vokabellisten von Découvertes 1 bis 4 zeigte, dass der Grundkurs vor allem in Klasse 9 und 10 viele Lehrbuchthemen nicht abdeckt (Austausch, Engagement, reflexive Verben, Überseegebiete, Québec, EU, Umwelt). Dafür gibt es 20 Zusatzeinheiten (`extra: yes` im Quelltext). Sie sind freiwillig: Sie sperren die nächste Einheit nicht, zählen nicht zum Kursfortschritt und kommen nur in den Aufholplan, wenn man "Zusatzwortschatz mitlernen" anhakt (bei Découvertes automatisch).
- **Machbarer Aufholplan:** Pro Lektion werden 8 Minuten gerechnet. Empfohlen wird ein Zeitraum mit höchstens 30 Minuten am Tag. Der Unterricht läuft weiter: Die Lektionen, die die Klasse bis zum Zieltermin neu bekommt (Kurs geteilt durch 34 Wochen), werden eingerechnet.

## Lernmethode (kurz)
- **Abrufen statt Wiederlesen**: jede Lektion besteht aus aktiven Aufgaben (Dunlosky et al. 2013: Selbsttest + verteiltes Üben haben den größten Nutzen).
- **Erkennen → Produzieren**: neue Wörter erst per Auswahl/Zuordnen, danach aus dem Gedächtnis tippen, hören, Sätze bauen.
- **Fehler kommen am Ende der Runde nochmal**, danach plant **FSRS** (`ts-fsrs`) die Wiederholungen in wachsenden Abständen.
- **Verschränkung**: Reihenfolge wird gemischt, dasselbe Wort nie direkt hintereinander.
- **Wiederholung ist überall sichtbar**: „Heute“-Karte auf der Startseite, Zahl am Üben-Tab, fällige Wörter ganz oben im Üben-Bereich. Nach einer Lektion geht es mit „Nächste: …“ direkt weiter.
- **Tipps statt Frust**: Bei Tippaufgaben zeigt „Tipp anzeigen“ Länge und ersten Buchstaben; ein Treffer mit Tipp zählt nicht als „auf Anhieb richtig“.
- **Kleine Schritte, echte Freischaltung**: neue Wörter kommen nur zu zweit und werden sofort abgefragt; falsche Aufgaben wiederholen sich, bis sie sitzen. Die nächste Lektion/Einheit öffnet erst, wenn die vorige gut geschafft ist (Lektion ≥ 60 %, Einheitentest ≥ 70 %; „fast richtig“ zählt halb). Raten bringt nichts.
- **Tagesziel = Minimum**: Ist das Ziel (z. B. 20 XP) geschafft, wird das Bonusziel 30, dann 40 usw. Am nächsten Tag beginnt es wieder beim Grundziel.
- **Aufholen**: Unter „Mehr → Aufholen“ wählt man, wo die Klasse im Buch steht. Die App zeigt den Rückstand, macht einen Tagesplan bis zu einem Wunschdatum und bietet einen Test, der Sitzendes überspringen lässt.
- **Handy-Bedienung**: schwebende Glas-Tab-Leiste (Nachbau des iOS-Glases per CSS), Sheets lassen sich von überall wegwischen, Wörterbuch ist Tab im Üben-Bereich, Eingabefelder lösen kein iOS-Zoomen aus.
- **KI-Chat**: Gespräch mit der KI (Puter) über Klassenarbeiten, Grammatik und Wörter, bei denen es hakt. Der Coach bekommt Klasse, Fortschritt, Termine und schwache Wörter, aber keinen Namen.
- **Als App installieren**: Banner auf der Startseite und Einstellungen → App (Chrome/Edge/Android per Knopf, iPhone per Anleitung „Zum Home-Bildschirm“).
- **Akzent-Autokorrektur**: Beim Eintippen eigener Wörter ergänzt `src/lib/accents.ts` fehlende Akzente (Wörterbuch aus dem Kurswortschatz; mehrdeutige Wörter wie a/à, ou/où bleiben unverändert); dazu Akzent-Tasten für den PC.
- **Karteikasten, Wochenbericht, Gerätewechsel**: Im Profil zeigt der Karteikasten, wie fest die Wörter in fünf Fächern sitzen; der Wochenbericht ist ein Text zum Teilen (ohne Namen). Unter Einstellungen → Daten lässt sich der Fortschritt per Teilen-Menü oder als Text aufs neue Handy übertragen, die Startseite erinnert nach 14 Tagen an eine Sicherung.
- **Fuchs & Shop im Profil**: Fürs Lernen gibt es Münzen (1 je 2 XP, +10 fürs Tagesziel, +5 je Bonusziel, +25 alle 7 Tage Serie). Im Profil führt die Karte „Fuchs & Shop“ dorthin; man kauft damit Zubehör (Kopf, Gesicht, Hals, Hintergrund), das der Fuchs überall in der App trägt. Es gibt nur die orange Markenfarbe. Die untere Leiste bleibt bei Lernen, Üben, KI, Plan, Profil.
- **Eigene Icons**: Alle Symbole sind in `src/components/ui/Icons.tsx` selbst gezeichnet (eckige Grundformen auf 24er-Raster); XP hat eine Wertmarke mit "XP", Münzen eine Goldmünze.
- **Bücher-Tab (ersetzt den Plan-Tab)**: Eigene Schulbücher anlegen, Seiten und Inhaltsverzeichnis fotografieren. Die Texterkennung läuft auf dem Gerät (Tesseract), gespeichert wird nur der Text (`studienfuchs-books`, Teil der Sicherung). Pro Buch gibt es den Stand der Klasse (Seite), Kapitel und Seiten. Die KI bekommt pro Frage Titel, Stand, Kapitel und nur die passenden Seiten (genannte Seiten oder Kapitel, Stoff der nächsten Klassenarbeit, Wörter aus der Frage, sonst die Seiten rund um den Stand; siehe `src/lib/books.ts`). Klassenarbeiten tragen Datum und Seitenbereich; die alten Termine für Listen und der Klassenstand (Aufholen) stehen ebenfalls dort.
- **KI ohne Anmeldung (vorbereitet)**: Im KI-Chat geht die erste Anfrage an die Gratis-Modelle von Kilo über ein kleines Relais (`relay/kilo-relay.js`, Cloudflare Worker, Einrichtung in `relay/README.md`). Fotos und bereits verbundene Puter-Konten laufen wie bisher über Puter; ist die kostenlose Stufe ausgelastet, erscheint „Mit anderem Anbieter weiter“. Solange `DEFAULT_FREE_AI_URL` in `src/lib/freeAi.ts` leer ist, ist die Stufe aus.
- **Aufholen (stark ausgebaut)**: Stand der Klasse wählen (Einheit), Plan bis zu einem Datum (1 Woche bis 6 Monate) mit Lektionen pro Tag und Zeitbedarf, Tagesfortschritt, abgelaufene Pläne werden erkannt, „Klasse ist eine Einheit weiter“ mit einem Tipp. Mit dem Schalter „Auch frühere Klassen nachholen“ zählen alle früheren Klassen mit (für Quereinsteiger). Die Liste „Das fehlt dir noch“ zeigt offene Lektionen je Einheit, jede Einheit lässt sich auch nur als Wörter üben. Der Einstufungstest gibt es pro Klasse; übersprungene Wörter bekommen Wiederholtermine in 3 bis 14 Tagen (nicht alle auf einmal).
- **Kurs jetzt 2.166 Wörter**: Klasse 9 und 10 liegen wie 7 und 8 als lesbare Quelltexte in `content-src/` (Umwandlung mit `scripts/json-to-dsl.mjs`) und wurden um je sechs Themeneinheiten erweitert (Klasse 9: Essen, Reisen, Gesundheit, Stadt, Schule und Praktikum, Feste; Klasse 10: Technik, Wohlbefinden, Reisen und Austausch, Stadt und Land, Kunst und Literatur, soziale Netzwerke). Für alle Texte gibt es Piper-Aufnahmen (Erzeugen: `scripts/export-texts.mjs`, dann `scripts/generate_audio.py`).
- **Einsteiger-Leiter**: Neue Wörter werden nur erkannt (Auswahl in beide Richtungen, Hören, Zuordnen), es wird nichts geschrieben. Beim zweiten Kontakt (lernend) werden sie aus Buchstaben gelegt und in Sätzen aus Bausteinen gebaut. Freies Tippen und Diktat gibt es erst bei gefestigten Wörtern. Das Aufwärmen lässt noch nicht feste Wörter nur auswählen, Tests legen sie aus Buchstaben. „Fast richtig“ zählt halb, Lektionen bestehen ab 60 %, Einheitentests ab 70 %.
- **Tests und Klassenarbeiten (Üben → Test erstellen)**: Kurztest (Deutsch links, Französisch rechts schreiben) direkt aus Kurs oder Liste ohne KI, oder mit KI aus Buchseiten/Thema. Klassenarbeit von der KI mit Hörverstehen (wird vorgelesen, zweimal), Wortschatz, Grammatik (Lückentext) und Schreiben (Bewertung durch die KI), mit ungefährer Note. Aus einem Klassenarbeits-Termin im Bücher-Tab geht „Probe“ direkt zu einer passenden Arbeit. Falsche Wörter lassen sich als Liste speichern.
- **Sprechtraining (Üben → Sprechtraining)**: Wort hören, nachsprechen; mit Spracherkennung, wo der Browser sie hat, sonst Aufnahme zum Vergleichen. Dazu eine Lautschule mit den acht wichtigsten Regeln.
- **Aufwärmen**: Neue Lektionen starten mit bis zu drei fälligen älteren Wörtern (je eine Tipp-Aufgabe). Sie zählen für die Wiederholungsplanung, aber nicht fürs Bestehen der Lektion.
- **Buchseiten in der KI**: Im KI-Tab hängst du mit dem + Fotos von Seiten aus deinem eigenen Buch an (nur im Arbeitsspeicher, gesendet erst beim Absenden) und sagst der KI, was sie tun soll, z. B. "Mach mir einen Vokabeltest von Seite 12 bis 14". Die KI liefert die Wörter als Block, die App baut daraus eine Liste (Üben → Eigene Listen) mit Schreibtest und Quiz. Die Schulbücher selbst sind aus Urheberrechtsgründen nicht in der App.
- **Eigene Sets**: Fotos von Buchseiten (optional mit Hinweis, welche Vokabeln) oder Wörter von Hand → KI oder Offline-Texterkennung → Tabelle prüfen (fehlende Akzente werden automatisch ergänzt) → Quiz. Mit Klassenarbeits-Datum werden neue Wörter auf die Tage verteilt.

## KI für eigene Lernsets (ohne eigenen Schlüssel)
Jeder Besucher bekommt die KI automatisch: Beim ersten Klick auf „Mit KI erstellen“ legt **Puter.js** ein kostenloses Gastkonto im Browser an (kurzes Fenster, Pop-ups erlauben). Die Nutzung läuft über das Puter-Konto des Besuchers, im Code und auf GitHub Pages liegt **kein** Schlüssel. Die Bibliothek wird erst bei Bedarf geladen (eigener Chunk).
- Gesendet wird nur beim Klick, und zwar die gewählten Seitenbilder bzw. Vokabeln an Puter und dessen KI-Anbieter (steht im Datenschutz-Text der App).
- Optional unter Einstellungen → KI: eigener Anthropic-Schlüssel (nur lokal gespeichert, nicht in der Sicherung).
- Ohne KI geht es weiter offline mit Texterkennung (Tesseract.js) oder Text einfügen.
- Modelle, Fallback-Reihenfolge und Fehlertexte stehen in `src/lib/ai.ts`. Modellnamen bei Puter ändern sich gelegentlich; bei Fehlern dort `PUTER_MODELS` anpassen.

## Übungen und Tests
- **Aufgabentypen:** Auswahl, Zuordnen, Tippen, Hören + Tippen, **Hören + Bedeutung wählen**, Satzbau aus Wortbausteinen (aus Beispielsätzen und Lückensätzen), Lückensätze mit Begründung und optional **Sprechübungen** (Mikrofon + Spracherkennung des Browsers, in den Einstellungen einschaltbar).
- **Einheit wiederholen:** am Ende jeder Einheit eine Lektion mit den schwächsten Wörtern.
- **Einheitentest:** 15 gemischte Fragen ohne Hilfen und ohne zweiten Versuch, bestanden ab 70 %.
- **Einstufungstest:** je Einheit eine Auswahl- und eine Tippaufgabe; nur wer beide richtig hat, kann die Einheit überspringen (Raten reicht nicht).
- Jedes Wort hat einen Beispielsatz mit Übersetzung (wird in Tests geprüft).

## Sprachausgabe (gleich gut auf jedem Gerät)
Alle französischen Wörter und Sätze (ca. 2560 Dateien, 19 MB) liegen als fertige Aufnahmen unter `public/audio` (mit dem offline laufenden Sprachmodell **Piper**, Stimme `fr_FR-siwis-medium`, CC BY 4.0). Die App spielt diese Dateien ab; nur für eigene Sets ohne Aufnahme springt die Stimme des Geräts ein.
Nach Änderungen an den Inhalten neu erzeugen (bestehende Dateien werden übersprungen):
```bash
python -m venv venv && venv/Scripts/pip install piper-tts    # einmalig; Linux/Mac: venv/bin/...
venv/Scripts/python -m piper.download_voices fr_FR-siwis-medium
node scripts/export-texts.mjs audio-texts.json
venv/Scripts/python scripts/generate_audio.py --texts audio-texts.json --model fr_FR-siwis-medium.onnx
```
(ffmpeg muss installiert sein.)

## Entwickeln
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest (Antwortprüfung, FSRS, Streak, Generator, Freischaltung, Seitenbereich, KI-Hilfen, Inhalte)
npm run build    # Produktions-Build nach dist/
```
`node scripts/make-icons.mjs` erzeugt die App-Symbole (PNG) neu aus der Maskottchen-Zeichnung.

`npm run dev`/`build` kopieren automatisch die Texterkennungs-Dateien nach `public/ocr` (siehe `scripts/copy-ocr.mjs`, nicht eingecheckt).

## Auf GitHub Pages veröffentlichen
1. Neues GitHub-Repo anlegen (z. B. `studienfuchs`) und diesen Ordner pushen (Branch `main`).
2. Im Repo: **Settings → Pages → Source: GitHub Actions**.
3. Der Workflow `.github/workflows/deploy.yml` baut bei jedem Push und veröffentlicht unter `https://<username>.github.io/<repo>/`.
4. Vorher unter `src/features/profile/AboutPage.tsx` das **Impressum** ausfüllen (Pflicht bei öffentlichen Seiten in Deutschland).

## Struktur
```
content-src/klasse-7|8/*.txt          Quelltext (einfaches Format) für Klasse 7 und 8; `node scripts/build-content.mjs` erzeugt daraus die JSON-Dateien
src/content/french/klasse-7…10/*.json  Kursinhalte (Klasse 9/10 direkt als JSON gepflegt) (Einheiten → Lektionen → Wörter, Erklärungen, Lückensätze)
src/content/schema.ts                Zod-Schema, prüft Inhalte beim Start
src/lib/                             answerCheck, srs (FSRS), streak, xp, generateExercises, parseVocab, plan
src/features/{path,lesson,review,sets,upload,profile}/
src/components/{exercises,ui,mascot}/
src/store/useStore.ts                Zustand + localStorage (Fortschritt, Karten, Sets)
```

### Neue Lektion hinzufügen
Klasse 7 und 8: Textdatei in `content-src/klasse-N/` bearbeiten (Kopf `id/title/book/desc/order`, `= Lektion`, Wörter als `- vorne = hinten | Beispiel = Übersetzung`, Lückensätze mit `f`), dann `node scripts/build-content.mjs` und `node scripts/check-content.mjs`. Danach Audio neu erzeugen (`scripts/generate_audio.py`, siehe Kopf der Datei). Klasse 9/10 und neue Fächer:
Eine neue Datei in `src/content/french/klasse-N/` anlegen (Feld `order` bestimmt die Position innerhalb der Klasse; am Ende jeder Einheit entsteht automatisch eine Wiederholungs-Lektion) – Format siehe vorhandene Dateien. Wort-IDs entstehen automatisch aus dem Wort, Lernfortschritt bleibt beim Umsortieren erhalten. Neue Fächer funktionieren genauso (`front` = Lernbegriff, `back` = Antwort).

Den ausführlichen Prüfbericht (was schlecht war und was geändert wurde) findest du in [AUDIT.md](../AUDIT.md).

## Offen / nächste Schritte
- Klasse 7/8 folgen den Themen und der Reihenfolge von À plus! 1/2, die Wörter sind aber eigene Zusammenstellungen und nicht die exakte Vokabelliste des Buchs (Annahme: Band 1–4 = Klasse 7–10). Klasse 9/10 sind noch nicht an À plus! 3/4 ausgerichtet; dafür am besten das Inhalts- bzw. Vokabelverzeichnis fotografieren und unter „Meine Sets“ nutzen.
- Inhalte fachlich gegen dein Lehrwerk/den Lehrplan deines Bundeslandes prüfen; ab Klasse 6 gibt es noch kaum Beispielsätze (daher selten „Satz bauen“-Aufgaben).
- Weitere Fächer (Mathe, Deutsch, Englisch, …) mit eigenen Übungstypen (z. B. Rechenaufgaben).
- Die KI-Anbindung (Puter) ist programmiert und typgeprüft, aber ein echter Durchlauf braucht ein Puter-Gastkonto: einmal selbst unter „Neues Set → Mit KI“ mit einem Foto ausprobieren.
- Optional: Login/Backend für geräteübergreifenden Fortschritt.

## Fuchs-Maskottchen (Aufbau)
- `src/components/mascot/Fox.tsx`: die Zeichnung in Teilen (Kopf, Ohren, Augen mit Pupillen, Brauen, Mund, Körper, Arme, Schwanz, Zubehör). Eine `Look`-Beschreibung legt fest, wie jedes Teil steht; Drehungen laufen über CSS mit Überschwingen.
- `src/components/mascot/Mascot.tsx`: Verhalten. Posen (froh, jubelnd, traurig, nachdenklich, winkend, schlafend, überrascht, verliebt), Ruhe-Eigenheiten (umschauen, wedeln, winken, einschlafen), Tippen mit Sprechblase, Begrüßung, Mundbewegung beim Sprechen.
- `src/components/mascot/mouth.ts`: der Mund als Zahlen (Breite, Winkel, Öffnung, Zunge) mit weichem Übergang, unabhängig von der Bildrate; `look.ts`: alle Posen und die Auswahl der Beschreibung (beides getestet).
- `src/components/mascot/spring.ts` + `engine.ts`: Physikgerüst. Gedämpfte Federn (Kopf, Ohren, Arme, Schwanz, Körperneigung) und eine Flugbahn mit Aufprall; der Motor schreibt pro Bild CSS-Variablen und Augen-/Mundzahlen. `Fox.tsx` setzt sie direkt ins DOM (mit Änderungsspeicher), es gibt kein React-Rendern pro Bild und die Schleife ruht, wenn nichts mehr schwingt oder der Tab verborgen ist. `eye.ts`: Lid, Weite, Neigung als Zahlen, daraus Sichtfenster und Lidkante. `engine.test.ts` und `eye.test.ts` prüfen Einschwingen, Landen, Blinzeln und den Rechenaufwand.
- `src/lib/speech.ts` hängt einen Lautstärke-Messer (WebAudio) an die Aufnahme und meldet Pegel und Helligkeit über `mascotBus.emitLevel`; ohne Audiokontext (Gerätestimme) bewegt sich der Mund im ungefähren Takt.
- `src/lib/mascotBus.ts`: Nachrichtenkanal. Die App meldet `correct`, `wrong`, `almost`, `cheer`, `levelup`, `speak:start` und `speak:end`; jeder Fuchs mit `listen` reagiert. Dazu ein einziger Zeigerbeobachter, der nur einen schlafenden Fuchs weckt (der Fuchs schaut dem Zeiger bewusst nicht nach).
- Im Entwicklungsmodus zeigt `/#/fox` alle Posen, Kleidung und Auslöser auf einen Blick.
- Bewegungen sind kurz, laufen nicht endlos außer dem leisen Atmen und werden bei „Bewegung reduzieren“ abgeschaltet.

## Handy und Leistung
- **Start:** Seiten werden mit `React.lazy` erst beim Öffnen geladen (`lazyPage` in `src/App.tsx`, mit einmaligem Neuladen, falls nach einer neuen Version eine alte Datei fehlt). Der Lehrstoff wird beim Start nicht mehr mit zod geprüft; das erledigt `src/content/content.test.ts` vor jeder Veröffentlichung. Die Prüfbibliothek ist damit nicht mehr im Paket.
- **Speichern:** Die großen Zustände (Lernstand, Bücher, Tests) werden über `debouncedStorage` (`src/lib/storage.ts`) gebündelt geschrieben (alle 0,5 s) und sofort beim Verlassen der App (`pagehide`, `visibilitychange`). Vorher wurde bei jeder Antwort alles serialisiert.
- **Re-Rendern:** Seiten abonnieren nur noch die Teile des Zustands, die sie brauchen (`useShallow`), nicht den ganzen Speicher.
- **Fuchs:** Seine Bildschleife pausiert, wenn er nicht auf dem Bildschirm ist (`IntersectionObserver`) oder der Tab verborgen ist.
- **Töne:** Aufnahmen der Wörter einer Übung werden im Hintergrund vorgeladen (`prefetchRecordings`), nicht bei „Datensparmodus“.
- **Bedienung:** Alle Tippflächen sind mindestens 40 bis 44 px hoch (`.btn`, `.chip`, Reiter), Eingabefelder 16 px (kein Zoom auf iOS), `interactive-widget=resizes-content` für die Bildschirmtastatur. Auf kleinen Handys (320 × 568) steht „Weiß ich nicht“ neben „Prüfen“ statt darüber.
- **Prüfen:** `.claude/mobile-check.js` ist ein Skript für das Browserfenster, das alle Seiten bei der aktuellen Fensterbreite auf seitliches Überlaufen, zu kleine Tippflächen und zu kleine Eingabeschrift prüft.

## Belohnungen und Motivation
Ziel: Jeder Tag soll sich ein bisschen anders und lohnend anfühlen, ohne Druck. Es gibt nie Strafen; wer einen Tag auslässt, verpasst nur dessen Extras.
- **Tagesaufgaben** (`src/lib/rewards.ts`): drei verschiedene Aufgaben pro Tag (neue Wörter, Wörter üben, Wiederholen, Lektionen, eine Lektion mit mindestens 90 %, Blitzrunde). Welche das sind, folgt allein aus dem Datum (stabil, aber jeden Tag anders); mindestens eine ist immer leicht, Wiederholen gibt es erst mit genug bekannten Wörtern. Münzen gibt es pro Aufgabe, +10 für alle drei. Gezählt wird in `finishSession` und `finishBlitz` (`useStore.ts`, Feld `daily`).
- **Überraschungs-Truhe** (`ChestSheet.tsx`, `rollChest`): wartet, sobald das Tagesziel geschafft ist, einmal pro Tag. Meist Münzen, manchmal ein Glückstreffer, selten ein Serien-Schutz oder ein Geschenk aus dem Laden. Der Zufall hängt an Datum und Anzahl bisher geöffneter Truhen, ein Neuladen würfelt nichts neu.
- **Meldungen nach einer Lektion** (`useRewardEvents.ts`, `ResultScreen`): neue Erfolge (vorher wurden sie nie verkündet), „Einheit geschafft“ mit dem Satz „Das kannst du jetzt: …“ aus der Einheitenbeschreibung, geschaffte Tagesaufgaben, die Truhe, Combo-Bonus.
- **Combo:** die längste Reihe richtiger Antworten auf Anhieb bringt bis zu +6 XP (`comboBonus`); die Töne steigen mit der Reihe um Halbtöne.
- **Blitzrunde** (`BlitzPage.tsx`, `src/lib/blitz.ts`): 60 Sekunden, Faktor ×1 bis ×4 mit der Reihe, falsch kostet 3 Sekunden, Rekord wird gespeichert. Ablenker, die für dasselbe Wort ebenfalls richtig wären (gleiches Wort mit anderer Übersetzung in einer anderen Lektion), werden ausgeschlossen. Die Runde ändert den Lernplan (FSRS) nicht.
- **Begrüßung des Fuchses** (`foxGreeting`): passt zur Lage (Truhe wartet, nur noch eine Aufgabe, nach einer Pause „Schön, dass du wieder da bist“), ohne Vorwürfe.
- **Dev-Seite** `/#/result-lab` zeigt den Ergebnisbildschirm mit Testdaten (nur beim Entwickeln).

## Design v3 „Fennis Welt“ (seit Oktober 2026)
- **Grundidee:** hell, klar, verspielt; dunkel ist eine gleichwertige Variante. Neue Nutzer bekommen „Automatisch“ (folgt dem Handy).
- **Schrift:** Nunito (lokal über `@fontsource-variable/nunito`), Schriftstärken im Theme eine Stufe kräftiger (`--font-weight-*` in `src/index.css`).
- **Farben mit Bedeutung:** Orange = Lernen und Hauptknöpfe, Blau (`sky`) = Auswahl und Wiederholen, Violett (`violet`) = KI und Blitzrunde, Gold = XP, Münzen, Erfolge, Grün/Rot = richtig/falsch. Alles als Tokens in `src/index.css` (hell in `:root`, dunkel in `.dark`).
- **Bausteine:** `.btn` (dicke Unterkante, sinkt beim Drücken ein), `.tile` (Antwortkacheln: weiß, gewählt blau), `.chip` (runde Filter), `.card` (2 px Rahmen), `.path-node` (runde Spielsteine des Lernpfads).
- **Lernpfad** (`LearnPage.tsx`): jede Einheit eine „Welt“ mit eigener Farbe (`WORLDS`), angeheftetes Banner, Schlängelpfad, „LOS!“ über der aktuellen Lektion, Kärtchen beim Antippen, geschaffte Einheiten eingeklappt, beim Öffnen gleitet die Seite zur aktuellen Lektion. Die Heute-Leiste (`TodayCard.tsx`) bündelt Tagesziel, Aufgaben und Truhe; am Computer steht die volle Heute-Karte rechts.
- **Zurück zum alten Design:** Das vorige Design liegt im Tag `design-v2` (und Branch `design-v2-backup`). Bis zur Entscheidung baut die Veröffentlichung es zusätzlich unter `/studienfuchs/alt/`. Rückweg: den Design-v3-Commit auf `main` mit `git revert` zurücknehmen und den Schritt „Altes Design unter /alt/ bauen“ in `.github/workflows/deploy.yml` löschen.
- **Feinschliff (Version 2.0 des neuen Designs):** Truhe am Ende jeder Einheit (`openUnitChest`, 25 Münzen, einmal je Einheit); frisch geschaffte Lektionen poppen auf dem Pfad mit einem Sternen-Feuerwerk auf (`useRewardEvents.pathDone`, `Burst.tsx`); die Flamme oben brennt erst, wenn heute gelernt wurde, und öffnet das Serien-Fenster (Woche, Serien-Schutz); jeder Tab hat seine Farbe (Lernen orange, Üben blau, KI violett, Bücher türkis, Profil pink); ab 5 richtigen Antworten in Folge wird der Fortschrittsbalken „heiß“; kurzes Vibrieren bei Antworten (`buzz`, hängt an der Einstellung „Töne und Vibration“); am Ende der Einführung startet „Erste Lektion starten“ sofort die erste Lektion.

## Üben, Fächer, Stapel (Struktur seit Oktober 2026)

Die App hat drei Tabs: Üben (`/`, `UebenPage`), Fächer (`/faecher`) und Profil. Der Lernpfad mit Lektionen ist weg: Im Unterricht lernt man, in der App übt man.

- **Daten:** Ein Stapel ist ein `VocabSet` (Sets) mit `subject`, `lang` (`'fr'`/`'en'`, steuert Vorlesen und Tasten) und `both` (auch rückwärts fragen). Ältere Sets ohne `subject` gelten als Französisch. Kurs-Einheiten sind virtuelle Stapel (`unit:<id>`, `lib/decks.ts`); welche geübt werden, steht in `addedUnits`. Beim Laden eines alten Stands werden Einheiten mit schon gelernten Wörtern automatisch hinzugefügt. Arbeiten (`arbeiten`): Fach, Termin, Stapel-Kennungen. Gelernt wird pro Karte (FSRS, `cards`).
- **Heute (`planToday` in `lib/decks.ts`):** Fälliges zuerst, dann neue Karten: acht pro Tag, mit Arbeiten so viele, dass bis zum Vortag alles einmal gesehen wurde (höchstens 30). Ein Durchgang hat 15 Karten, danach "Noch eine Runde". `pickRound` stellt Durchgänge für Stapel, Fächer und Arbeiten zusammen (Fälliges, begrenzt neue, dann die schwächsten).
- **Aufgaben (`lib/cardSession.ts`):** neu: zeigen (`teach`, zu zweit) und Auswahl (`qchoice`); lernend: Auswahl oder Tippen (`qtype`); fest: Tippen. Antworten über 30 Zeichen oder mehr als sechs Wörter werden nicht getippt, sondern als Karteikarte (`qcard`) mit Selbstbewertung. Falsche Antworten für die Auswahl kommen erst aus demselben Stapel, dann aus dem Fach. Die Sitzung läuft in der bestehenden `Session`, der Ablauf in `features/ueben/CardFlow.tsx`.
- **Französisch** nutzt weiter die volle Übungsfolge des alten Sprachkurses (`generateLesson`: Erkennen, Hören, Buchstaben legen, Tippen, Sätze bauen, Sprechen); `lib/roundExercises.ts` (`generateRound`) wählt je Karte, welche Aufgaben kommen: Stapel mit `lang: 'fr'` die Sprachfolge, alle anderen die Karten-Aufgaben, bei gemischten Durchgängen als getrennte Blöcke.
- **Fortschritt (`lib/progress.ts`):** "sitzt" = `isSolid` (gefestigt oder stabil über 3 Tage). Fach-Level aus der Zahl sitzender Karten (8 Stufen), Sterne je Stapel ab 30/60/90 %. `snapshot`/`diffProgress` vergleichen vor und nach einer Runde (Level, Sterne, Arbeits-Marken); daraus entstehen `ProgressSummary` und Meilenstein-Münzen (`bonusCoins`).
- **Wochenplan (`lib/calendar.ts`, `features/kalender`):** `WeekPlanner` zeigt Wochen als Zeilen mit sieben Spalten (Stundenplan-Stil, Termine als farbige Kacheln); `monthGrid` ist noch da, wird aber nicht mehr angezeigt. `ArbeitSheet` zum Eintragen (Art, Fach, Tag mit Schnellwahl, Stapel, Plan-Hinweis), `ArbeitFollowUp` nach dem Termin (Note, Münzen für das Eintragen, nie Strafen).
- **Meine Fächer:** `mySubjects` (bei der Einführung gewählt) plus alle Fächer mit Stapeln; Frei üben und Fächer-Tab zeigen so auf jedem Gerät dasselbe.
- **Fertige Stapel:** `content/templates.ts` (16 Vorlagen, geprüft von `templates.test.ts`: keine doppelten Fragen, genug verschiedene Antworten), `TemplateList` auf der Fach-Seite und beim Erstellen. Mathe hat zusätzlich das Rechentraining (`features/practice/MathPractice.tsx`, Aufgaben aus `content/math`).
- **Probearbeit:** `?arbeit=…&modus=probe` in `CardFlow`: 15 zufällige Karten, `generateRound` mit Modus `probe` (kein Zeigen, Französisch über `generateTest`), `Session noRetry`, Ergebnis mit `approxGrade`.
- **Tests der Oberfläche:** `src/app.test.tsx` und `features/ueben/flow.test.tsx` rendern die echte App in happy-dom und spielen Abläufe durch (Einführung, Stapel erstellen, KI-Karten mit Mock, Arbeit eintragen, ganze Runden mit Fehlern und Wiederholung, Probearbeit). Animationen sind dort ausgeschaltet (`MotionGlobalConfig.skipAnimations`).
- **Neue Stapel:** `DeckCreatePage` (KI per `lib/aiCards.ts` oder von Hand per `lib/parseCards.ts`), `CardTable` zum Prüfen. Stapel ansehen und bearbeiten: `DeckPage`. Fach-Seite: `FachPage`, Arbeit eintragen: `ArbeitSheet`.
- **Alte Adressen** (`/practice`, `/coach`, `/sets/:id`, `/lesson/…`) leiten um (`App.tsx`). Der Code des alten Lernpfads (LearnPage, LessonPage, PracticeFlow, Mathe-Kurs) liegt noch im Projekt, ist aber nicht mehr erreichbar.

## Fächer-Tab (KI-Hilfe, seit Oktober 2026)

Nur Französisch ist ein Kurs. Alle anderen Fächer laufen über den Tab „Fächer“ (`/faecher`, `FaecherPage.tsx`): Kacheln aus `src/lib/subjects.ts` (`HELP_SUBJECTS`), je Fach ein Gespräch unter `/faecher/:subjectId`. Das ist dieselbe Seite wie der KI-Tab (`CoachPage`, ein eigener Speicherschlüssel je Fach), nur mit dem Prompt `buildSubjectPrompt` (vertiefen, abfragen, Arbeit vorbereiten, keine fertigen Hausaufgaben) und ohne Vokabel-Funktionen. Neues Fach: Eintrag in `HELP_SUBJECTS` mit Hinweisen für die KI.

## Mathe-Kurs (gebaut, aber ausgeblendet)

Der Mathe-Kurs (Klasse 7) ist fertig und getestet, wird aber nicht angezeigt (`MATH_COURSE = false` in `src/content/index.ts`; wer ihn gewählt hatte, landet beim Laden wieder in Französisch). Mit `true` kommt er zurück: Fachwahl beim Start, im Kurs-Menü, eigener Üben-Tab.

Mathe nutzt dieselbe Maschine wie Französisch (Lernpfad, Freischaltung, FSRS, Tagesaufgaben, Belohnungen), aber die Aufgaben kommen nicht aus Dateien, sondern werden erzeugt.

- **Fach im Speicher:** `subject` (`'fr'` oder `'math'`) im Store. Mathe-Einheiten stehen in `mathUnits` (Kennungen `m7-u1`, `m7-u1-l1`, `m7-u1-review`, `m7-u1-test`), `allUnits` enthält beide Fächer. Freischaltung, „nächste Lektion“ und Sperren rechnen je Fach und Klasse.
- **Themen statt Wörter:** Jede Fähigkeit („Brüche kürzen“, „Gleichungen mit zwei Schritten“ …) ist ein Eintrag in `src/content/math/skills/*.ts` (`defineSkill`) und zugleich ein „Item“ für FSRS (Karte je Thema). Eine Lektion listet nur die Themen (`curriculum.ts`), dazu die Erklärung und das Merkblatt der Einheit.
- **Erzeuger:** `gen(rng, level, form)` liefert einen Entwurf (`calc`, `mchoice` oder `mmatch`). `numeric()` wählt je nach Stufe Eingabe oder Auswahl und baut typische Fehlantworten als Ablenker (Vorzeichenfehler, falsche Rechenart …). `generateMathSession()` mischt Themen, steigert die Stufe, vermeidet doppelte Aufgaben und hängt `again()` an: Nach einem Fehler kommt eine frische Aufgabe zum selben Thema.
- **Schreibweise:** Zahlen deutsch (Komma, echtes Minus „−“), Texte in Mini-Markup für `MathText`: `$…$` Rechnung, `{a|b}` Bruch, `x^2` Hochzahl, `\n` Zeilenumbruch. Eingabe über `MathPad` (eigene Tastatur, nimmt auch die Computer-Tastatur); `parseNumber` versteht `3/4`, `0,75`, `75 %`.
- **Prüfen:** `evaluateCalc` vergleicht Werte (nicht Text). Ist die Lösung ein Bruch, der gekürzt sein soll, gilt ein ungekürzter Bruch als „fast richtig“.
- **Tests:** `src/content/math/math.test.ts` ruft jeden Erzeuger bei allen Stufen mit 60 Zufallswerten auf, prüft Aufbau (keine NaN/undefined, Ablenker verschieden, Lösung dabei), die Prüfung der richtigen und falschen Antwort und rechnet bei Rechen- und Gleichungsaufgaben die Lösung selbst nach. `integration.test.ts` prüft Freischaltung, Tagesaufgaben und KI-Prompt.
- **Neues Thema:** In `skills/` ein `defineSkill(...)` ergänzen, in `curriculum.ts` einer Lektion zuweisen, Tests laufen lassen. Neue Klassenstufe: ein weiteres Array wie `MATH_GRADE_7` und `build()` in `content/math/index.ts` erweitern.

- **Karten aus Notizen (ohne KI)**: `lib/notesToCards.ts` macht aus Text Kartenvorschläge (Paare mit Trennzeichen, Merksätze „X ist Y“ → „Was ist X?“, „Y nennt man X“, Jahreszahlen → „Was geschah …?“). Fotos werden per Tesseract auf dem Gerät gelesen (`readPhotos` in `DeckCreatePage`). Alles bleibt ein Vorschlag, den der Schüler vor dem Speichern prüft. Auf der Startseite erinnert ein Sicherungs-Hinweis (`BackupBanner`) an den Export, weil es keinen Konto-Abgleich zwischen Geräten gibt.
- **Stapel teilen per Link**: `lib/shareDeck.ts` packt Titel, Fach und Karten (ohne Lernstand) mit `CompressionStream` (deflate-raw, Rückfall: unkomprimiert) in `#/stapel/teilen?d=…`; `DeckImportPage` zeigt eine Vorschau und legt eine eigene Kopie an. Das ersetzt keinen Konto-Abgleich, aber Karten kommen so ohne Server auf andere Geräte. Länge begrenzt auf `MAX_LINK`; eingelesene Links werden gekürzt und geprüft (300 Karten, 500 Zeichen, Fach nur als Kennung).
