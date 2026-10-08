# Studienfuchs – Prüfbericht zur Veröffentlichung

Stand: 8. Oktober 2026. Geprüft wurden Code, automatische Tests, der Bau und die Seiten im Browser (Handybreiten 320 und 375 Pixel, Dunkel und Hell).

## Automatisch

- `npx tsc --noEmit`: ohne Fehler.
- `npm test`: alle Tests grün (Oberfläche der ganzen App in happy-dom, Rechenkern, Planung, Hausaufgaben, Rückmeldungen, Sicherung, KI-Anmeldung mit nachgebautem Puter).
- `npm run build`: läuft durch. Die Startdatei (`useStore`, mit den fertigen Französisch-Karteikarten) ist rund 173 kB gepackt, alles andere wird beim Öffnen einer Seite nachgeladen; die Seiten der Tabs werden im Leerlauf vorgeladen.
- Deploy über GitHub Actions: Tests laufen vor dem Bau, ein Testfehler stoppt die Veröffentlichung.

## Beim letzten Durchgang gefunden und behoben

| Was | Folge | Stand |
|-----|-------|-------|
| Einstellungen → Daten: „Exportieren“ und „Importieren“ liefen auf 320 Pixel rechts aus dem Bild | Seite ließ sich seitlich schieben | behoben (Umbruch) |
| Lange Titel in Kartenlisten (z. B. Fach-Seite) schoben die ganze Zeile aus dem Bild, weil Rasterkinder nie schmaler als ihr Inhalt wurden | Pfeil abgeschnitten | behoben für alle Raster (`.grid > *` mit `min-width: 0`) |
| Datenschutz: sagte noch „Wir bekommen keine Nutzerdaten“ und kannte weder Online-Sicherung noch Rückmeldungen | Text stimmte nicht mehr | angepasst, neuer Abschnitt „Online-Sicherung“ |
| Profil: Hinweis zur Wochengrafik auch ohne geübte Minuten | Rauschen | nur noch mit Minuten |
| Einstellungen: Schulzeiten und Lernzeit hatten dasselbe Symbol | Verwechslung | eigenes Uhr-Symbol |
| Themenfarbe (Statusleiste), Manifest und Zwischenspeicher passten nicht zum neuen Aussehen | Weiße Leiste, alter Cache | Themenfarbe und Manifest angepasst, Zwischenspeicher-Version erhöht |
| Reste: nicht mehr benutzte Dateien (Burst, BlitzCard) | Ballast | gelöscht |

## Bekannte Grenzen (vor der Veröffentlichung wissen)

- **Impressum:** nicht ausgefüllt (bewusst). Ohne eigene Angaben steht dort ein Hinweis auf die Projektseite bei GitHub. Für eine öffentliche Seite mit Rückmeldefunktion und Online-Sicherung braucht es nach deutschem Recht (§ 5 DDG) Name, Anschrift und E-Mail. Die Felder stehen in `src/lib/legal.ts`.
- **KI und Puter:** nur mit nachgebauten Antworten getestet, nie mit dem echten Dienst. Die Anmeldung öffnet ein Fenster von Puter (Gastkonto ohne E-Mail). Browser mit blockierten Pop-ups zeigen ein Hilfe-Fenster.
- **Postfach für Fehlerberichte:** `DEFAULT_FEEDBACK_URL` ist leer. Bis ein Postfach eingerichtet ist (`relay/README.md`), öffnet „Senden“ das Teilen-Fenster des Geräts. Anonyme Nutzungsdaten werden ohne Adresse nirgendwohin geschickt.
- **Bewegung:** Seitenwechsel, Sheets und Klick-Gefühl wurden im Browser per Zahlen geprüft, nicht auf echten Handys. Bei versteckten Browser-Fenstern bleiben Animationen stehen (das ist ein Eigenheit des Prüffensters, nicht der App).
- **Inhalte:** Die fertigen Französisch-Karteikarten (Klasse 7 bis 10) sind fachlich nicht von einer Lehrkraft gegengelesen.

## Früherer Bericht

Die Prüfung vom 1. Oktober 2026 betraf noch den Lernpfad, die Wörterliste und den Serien-Mechanismus, die es nicht mehr gibt. Sie steht in der Git-Geschichte (`git log -- AUDIT.md`).
