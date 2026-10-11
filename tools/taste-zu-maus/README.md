# Taste → Maustaste

Solange du **F** gedrückt hältst, wird die **linke Maustaste** gehalten.
Lässt du F los, wird auch die Maustaste losgelassen.

## Installieren und starten

```
pip install -r requirements.txt
python taste_zu_maus.py
```

- **F8** schaltet das Tool an/aus (beim Ausschalten wird eine gehaltene Maustaste sofort losgelassen).
- **Strg+C** im Terminal beendet es (die Maustaste wird dabei immer losgelassen).

## Optionen

| Option | Bedeutung |
| --- | --- |
| `--taste g` | andere Taste (ein Buchstabe oder eine Ziffer) |
| `--maus right` | `left` (Standard), `right` oder `middle` |
| `--nicht-unterdruecken` | Taste wird zusätzlich normal getippt (Windows) |

## Hinweise

- **Windows:** F wird standardmäßig *unterdrückt*, tippt also kein „f“ in andere Programme, solange das Tool an ist (F8 zum Pausieren, wenn du normal schreiben willst). Evtl. ist für Programme, die als Administrator laufen, ein als Administrator gestartetes Terminal nötig.
- **macOS:** Dem Terminal unter *Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen* und *Eingabeüberwachung* Zugriff geben. F wird zusätzlich getippt.
- **Linux:** Funktioniert unter X11; unter Wayland sind globale Tastatur-/Mausereignisse meist blockiert. F wird zusätzlich getippt.
- Manche Spiele/Anti-Cheat-Systeme verbieten Eingabe-Automatisierung. Prüfe die Regeln, bevor du es dort nutzt.

## Tests

```
python -m unittest -v
```

Die Tests prüfen die Haltelogik (Auto-Repeat, Pause, Loslassen) mit einer Attrappe. Das echte Abfangen von Tastatur und Maus habe ich in dieser Umgebung nicht ausprobieren können (kein Bildschirm).
