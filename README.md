# Studienfuchs – Lernen für die Schule

Lern-App für die Schule im Stil moderner Sprach-Apps (Start: Französisch, Klasse 7–10 = Lernjahr 1–4, ca. 340 Lektionen; Klasse 7 und 8 sind entlang von À plus! (Cornelsen) Band 1 und 2 gegliedert). Läuft komplett im Browser und lässt sich kostenlos über GitHub Pages hosten.

**Was anders ist als bei Duolingo:** Erst erklären, dann üben · keine Herzen, keine Werbung, keine Bezahlschranke · Lernpfad nach Lehrplanthemen · eigene Buchseiten hochladen und daraus ein Quiz machen.

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
- **Einsteiger-Leiter**: Neue Wörter werden erst erkannt (Auswahl, Hören, Zuordnen), dann aus Buchstaben gelegt (kein Tippen, keine Akzent-Tasten nötig); freies Schreiben gibt es erst später und mit Stütze (erster Buchstabe). Diktat nur bei gefestigten Wörtern. „Fast richtig“ zählt halb, Lektionen bestehen ab 60 %, Einheitentests ab 70 %.
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

Den ausführlichen Prüfbericht (was schlecht war und was geändert wurde) findest du in [AUDIT.md](AUDIT.md).

## Offen / nächste Schritte
- Klasse 7/8 folgen den Themen und der Reihenfolge von À plus! 1/2, die Wörter sind aber eigene Zusammenstellungen und nicht die exakte Vokabelliste des Buchs (Annahme: Band 1–4 = Klasse 7–10). Klasse 9/10 sind noch nicht an À plus! 3/4 ausgerichtet; dafür am besten das Inhalts- bzw. Vokabelverzeichnis fotografieren und unter „Meine Sets“ nutzen.
- Inhalte fachlich gegen dein Lehrwerk/den Lehrplan deines Bundeslandes prüfen; ab Klasse 6 gibt es noch kaum Beispielsätze (daher selten „Satz bauen“-Aufgaben).
- Weitere Fächer (Mathe, Deutsch, Englisch, …) mit eigenen Übungstypen (z. B. Rechenaufgaben).
- Die KI-Anbindung (Puter) ist programmiert und typgeprüft, aber ein echter Durchlauf braucht ein Puter-Gastkonto: einmal selbst unter „Neues Set → Mit KI“ mit einem Foto ausprobieren.
- Optional: Login/Backend für geräteübergreifenden Fortschritt.
