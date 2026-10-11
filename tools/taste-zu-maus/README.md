# Taste → Maus

Solange du **F** gedrückt hältst, wird die **linke Maustaste** gehalten.
Lässt du F los, wird auch die Maustaste losgelassen. Es ist kein Klick und kein
Dauerfeuer, sondern wirklich „gedrückt halten“.

## Windows: App installieren (mit Desktop-Verknüpfung)

1. Python von <https://www.python.org/downloads/> installieren (Haken bei **Add python.exe to PATH**).
2. Diesen Ordner (`tools/taste-zu-maus`) auf den PC laden.
3. **`Installieren.bat`** doppelklicken. Das installiert `pynput` und legt auf dem Desktop
   die Verknüpfung **„Taste zu Maus“** an.
4. Verknüpfung öffnen → **START** drücken → F gedrückt halten.

Optional als einzelne `.exe`: erst **`exe_bauen.bat`**, danach noch einmal `Installieren.bat`
(die Verknüpfung zeigt dann auf `dist\TasteZuMaus.exe`).

## Bedienung der App

- **START / STOP** schaltet das Tool ein und aus.
- **Ändern** neben „Auslöser-Taste“: danach die gewünschte Taste drücken (Esc bricht ab). F8 ist reserviert.
- **Maustaste:** Links, Rechts oder Mitte.
- **Taste blockieren** (nur Windows): F wird nicht zusätzlich als „f“ getippt, solange das Tool aktiv ist.
- **F8** pausiert / setzt fort – auch wenn die App im Hintergrund ist. Beim Pausieren wird eine gehaltene Maustaste sofort losgelassen.
- Die Einstellungen werden in `~/.taste_zu_maus.json` gemerkt. Einstellungen sind nur im gestoppten Zustand änderbar.

## Ohne Oberfläche (Konsole)

```
pip install -r requirements.txt
python taste_zu_maus.py                      # F -> linke Maustaste
python taste_zu_maus.py --taste g --maus right
```

## Hinweise

- **Windows:** Für Programme, die als Administrator laufen, muss auch diese App als Administrator gestartet werden.
- **macOS:** Dem Terminal unter *Datenschutz & Sicherheit* → *Bedienungshilfen* und *Eingabeüberwachung* Zugriff geben. F wird zusätzlich getippt.
- **Linux:** Unter X11 getestet; unter Wayland sind globale Tastatur-/Mausereignisse meist blockiert. F wird zusätzlich getippt.
- Manche Spiele/Anti-Cheat-Systeme verbieten Eingabe-Automatisierung. Prüfe die Regeln, bevor du es dort nutzt.

## Tests

```
python -m unittest -v
```

Geprüft wurde: die Haltelogik per Unit-Test, die komplette App unter Linux/X11 (Start, F halten und loslassen,
Auto-Repeat, Shift+F, Pause mit F8, Stop). **Nicht** auf einem echten Windows-PC ausprobiert:
das Blockieren der Taste, `Installieren.bat`, die Verknüpfung und `exe_bauen.bat`.
