# Edit-System (F halten = auswählen, loslassen = bestätigen)

Referenz-Implementierung für ein Edit-System in einem eigenen Spiel. Die Logik hat keine Engine-Abhängigkeit:
dein Spiel meldet nur, was passiert, und die Klasse verwaltet Zustand und Auswahl.

## Ausprobieren

`index.html` im Browser öffnen (Doppelklick, braucht beide Dateien im selben Ordner).
**F** halten und mit der Maus über die Felder fahren, **F** loslassen bestätigt.
Tests: `node test.mjs`

## Einbauen (Pseudo-Code für deine Engine)

```
session = EditSession(cols, rows, confirmOnRelease = true)

OnKeyDown(Edit):   session.begin()                       // Auto-Repeat wird ignoriert
                   session.hover(FeldUnterFadenkreuz)    // Feld unter dem Zeiger sofort mitnehmen
OnPointerMoved:    für jedes Feld auf der Strecke alter -> neuer Punkt: session.hover(feld)
OnKeyUp(Edit):     ergebnis = session.end()              // bestätigt (oder wartet, wenn confirmOnRelease = false)
OnConfirmKey:      ergebnis = session.confirm()
OnCancelKey / Fokusverlust / Spieler wird getroffen: session.cancel()
```

`ergebnis.changed` sind die Feld-Indizes, die umgeschaltet wurden (Wand offen/zu). Das übernimmst du in dein Bausystem.

## Wichtige Entscheidungen im Code

- **Erstes Feld eines Zugs bestimmt, was der Zug tut:** Beginnst du auf einem unmarkierten Feld, markiert der Zug alle weiteren Felder. Beginnst du auf einem markierten, entmarkiert er sie. So lässt sich auch korrigieren, ohne neu anzufangen.
- **Schnelle Mausbewegung:** Pro Bild kann der Zeiger mehrere Felder überspringen. `cellsOnSegment` liefert alle Felder auf der Strecke, sonst bleiben Lücken. In 3D machst du dasselbe mit mehreren Raycasts oder einem Sweep zwischen altem und neuem Treffer.
- **Kein Doppelzählen:** Felder liegen in einem `Set`; wiederholtes Überfahren ändert nichts.
- **Abbruch:** Fokusverlust bricht ab, damit nie eine halbe Auswahl hängen bleibt.
- **`confirmOnRelease = false`:** F loslassen beendet nur die Auswahl, bestätigt wird mit `confirm()` (z. B. Enter oder Zweittaste), ähnlich einer Option „Beim Loslassen bestätigen“.

## Nicht enthalten (bewusst, das ist deine Aufgabe)

Rendering in 3D, echte Wand-Geometrie, Mehrspieler-Synchronisierung (der Server muss `changed` prüfen und bestätigen, nicht dem Client trauen), Eingabe-Bindings deiner Engine.
