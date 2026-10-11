# Taste → Maus

Solange du **F** gedrückt hältst, wird die **linke Maustaste** gehalten.
Lässt du F los, wird auch die Maustaste losgelassen. Es ist kein Klick und kein
Dauerfeuer, sondern wirklich „gedrückt halten“.

## Am einfachsten: eine einzelne Datei

**`TasteZuMaus.pyw`** ist die komplette App in einer Datei.

1. Python von <https://www.python.org/downloads/> installieren (Haken bei **Add python.exe to PATH**).
2. `TasteZuMaus.pyw` irgendwohin legen und **doppelklicken**. Beim allerersten Start installiert sie
   einmalig die Bibliothek `pynput` (kleines Fenster „Einmalige Einrichtung“, braucht Internet).
3. Desktop-Verknüpfung: Rechtsklick auf die Datei → *Senden an* → *Desktop (Verknüpfung erstellen)*.

Die Datei wird aus `taste_zu_maus.py` und `app.py` erzeugt (`python einzeldatei_bauen.py`).
Eine echte `.exe` ohne Python-Installation geht über `exe_bauen.bat` (siehe unten), muss aber auf Windows gebaut werden.

## Alternative: Ordner-Variante (mit fertiger Desktop-Verknüpfung und Icon)

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
- **Verzögerung:** feste Wartezeit vor dem Maus-Ereignis (Aus, 0,1, 1, 5 oder 10 ms; Standard 1 ms). Sie gilt beim Drücken
  und beim Loslassen gleich, die Haltedauer bleibt also unverändert. Sie macht die Eingabe **nicht** unauffälliger für
  Anti-Cheat-Systeme (siehe Hinweise). Auf der Konsole: `--delay-ms 0.1` (maximal 50).
- **Taste blockieren** (nur Windows, Standard **aus**): Ist es aus, geht F **auch** an das Programm/Spiel – nötig, wenn F dort selbst etwas auslösen soll (z. B. eine Spiel-Taste). Ist es an, wird F verschluckt und tippt kein „f“.
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
- Die Verzögerung ist nur eine feste, kleine Wartezeit. Von Programmen erzeugte Eingaben bleiben für Windows als solche erkennbar,
  und die Regeln mancher Spiele (z. B. Fortnite: Macros gelten als Cheating) ändert eine Millisekunde nicht.
- Manche Spiele/Anti-Cheat-Systeme verbieten Eingabe-Automatisierung. Prüfe die Regeln, bevor du es dort nutzt.

## Tests

```
python -m unittest -v
```

Geprüft wurde: die Haltelogik per Unit-Test, die komplette App unter Linux/X11 (Start, F halten und loslassen,
Auto-Repeat, Shift+F, Pause mit F8, Stop). **Nicht** auf einem echten Windows-PC ausprobiert:
das Blockieren der Taste, `Installieren.bat`, die Verknüpfung und `exe_bauen.bat`.
