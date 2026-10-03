# Veröffentlichung

Stand: 3. Oktober 2026. Die App ist als reine Französisch-App startklar. Weitere Fächer sind bewusst nicht enthalten: Die Fächerauswahl ist entfernt, im Kursdialog gibt es keine „Bald verfügbar“-Liste.

## Was schon erledigt ist
- Produktions-Build geprüft (auf Handybreite, mit dem Basis-Pfad `/studienfuchs/` wie auf GitHub Pages): Einführung, Startseite und alle Seiten laden, keine Konsolenfehler, Service Worker aktiv, Offline-Cache gefüllt.
- Seiten werden erst beim Öffnen geladen (das Hauptpaket schrumpft von 1,4 MB auf 0,35 MB; der Lehrstoff mit etwa 0,6 MB lädt weiterhin beim Start, KI und Texterkennung erst bei Bedarf). Fehlt nach einer neuen Version eine alte Datei, lädt die App einmal neu.
- Manifest und Meta-Angaben: dunkle Themenfarbe passend zur App, Beschreibung, Vorschau (Open Graph) mit App-Symbol.
- Automatisch bei jedem Push auf `main`: `npm test` (180 Tests), Build, Veröffentlichung auf GitHub Pages (`.github/workflows/deploy.yml`).
- Datenschutz-Seite stimmt mit dem echten Verhalten überein: Der Absatz zur kostenlosen KI (Relais) erscheint nur, wenn ein Relais eingetragen ist (`src/lib/freeAi.ts`, aktuell leer). Dann nutzt die KI das Puter-Gastkonto.
- Die Dev-Seite `/#/fox` (Fuchs-Labor) ist im Produktions-Build nicht enthalten.

## Was nur du erledigen kannst
1. **Impressum ausfüllen** (von dir bewusst auf später verschoben): Name, Anschrift und E-Mail in `src/lib/legal.ts` eintragen. Sie erscheinen dann automatisch unter „Datenschutz & Impressum“. Solange sie leer sind, steht dort nur „privates, nicht kommerzielles Lernprojekt“ mit Link zum GitHub-Projekt. Für eine öffentlich erreichbare Seite in Deutschland ist das rechtlich nicht sicher; ob eine Anschrift nötig ist, hängt von deiner Lage ab (privat, ohne Werbung, minderjährig o. Ä.). Das kann ich nicht für dich entscheiden.
2. **GitHub-Beschreibung** (About) im Repository per Hand setzen: Zeile „Französisch lernen für die Schule (Klasse 7 bis 10)“ und die Adresse der Seite.
3. ~~Lizenz~~ erledigt: `LICENSE` sagt „alle Rechte vorbehalten“, andere dürfen den Code nicht verwenden.
4. **Inhalte prüfen**: Die Vokabellisten und Erklärungen sind eigene Texte, orientiert am Berliner Lehrplan und an den Themen der gängigen Lehrwerke. Sie wurden nicht gegen ein bestimmtes Lehrbuch geprüft. Wenn Lehrwerk-Wortlisten wörtlich übernommen wären, wäre das urheberrechtlich heikel.
5. **Kostenlose KI** (optional): Relais nach `relay/README.md` einrichten und die Adresse in `src/lib/freeAi.ts` eintragen. Ohne sie geht die KI nur über Puter mit Anmeldung (Gastkonto) oder eigenem Anthropic-Schlüssel.

## Vor jeder Veröffentlichung
```bash
npm test
npm run build
```
Produktions-Build lokal ansehen (unter Windows in Git Bash wandelt die Shell `/studienfuchs/` in einen Pfad um, darum `MSYS_NO_PATHCONV=1`):
```bash
MSYS_NO_PATHCONV=1 VITE_BASE=/studienfuchs/ npm run build
npx vite preview --base /studienfuchs/
```
Dann `http://localhost:4173/studienfuchs/` öffnen. Nach jedem Neubau den Vorschau-Server neu starten (er kennt nur die Dateien vom Start).
