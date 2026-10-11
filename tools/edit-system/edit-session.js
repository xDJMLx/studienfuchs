/*
 * Edit-System: F halten = Felder auswählen, F loslassen = bestätigen.
 *
 * Reine Logik ohne Engine, ohne Tastatur- und Mausabfrage. Dein Spiel ruft nur
 * begin() / hover() / end() / confirm() / cancel() auf, wenn etwas passiert.
 * So lässt sich die Datei in jede Engine übernehmen (Unity, Unreal, Godot, Web ...).
 *
 * Zustände:
 *   idle       nichts passiert
 *   selecting  Taste wird gehalten, Felder werden markiert
 *   pending    Taste losgelassen, aber noch nicht bestätigt
 *              (nur wenn confirmOnRelease = false)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EditSystem = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class EditSession {
    constructor({ cols = 3, rows = 3, confirmOnRelease = true } = {}) {
      this.cols = cols;
      this.rows = rows;
      this.confirmOnRelease = confirmOnRelease;
      this.open = new Array(cols * rows).fill(false); // bestätigter Zustand: true = Feld ist offen
      this.selected = new Set(); // markierte Felder, die beim Bestätigen umgeschaltet werden
      this.state = "idle";
      this.paintValue = null; // true = Zug markiert, false = Zug entmarkiert
    }

    /** Taste runter. Das Dauerfeuer beim Gedrückthalten (Auto-Repeat) wird ignoriert. */
    begin() {
      if (this.state === "selecting") return false;
      if (this.state === "idle") this.selected.clear();
      this.paintValue = null;
      this.state = "selecting";
      return true;
    }

    /**
     * Zeiger/Fadenkreuz ist über Feld `index` (oder null, wenn über keinem).
     * Das ERSTE Feld eines Zugs bestimmt, was der Zug tut: war es unmarkiert,
     * markiert der Zug alle weiteren Felder; war es markiert, entmarkiert er sie.
     * Liefert true, wenn sich etwas geändert hat.
     */
    hover(index) {
      if (this.state !== "selecting") return false;
      if (!Number.isInteger(index) || index < 0 || index >= this.open.length) return false;
      if (this.paintValue === null) this.paintValue = !this.selected.has(index);
      const had = this.selected.has(index);
      if (this.paintValue) this.selected.add(index);
      else this.selected.delete(index);
      return had !== this.selected.has(index);
    }

    /** Taste hoch. Bestätigt sofort (confirmOnRelease) oder wartet auf confirm(). */
    end() {
      if (this.state !== "selecting") return null;
      if (this.confirmOnRelease) return this.confirm();
      this.state = "pending";
      return { confirmed: false, changed: [] };
    }

    /** Auswahl übernehmen: alle markierten Felder werden umgeschaltet. */
    confirm() {
      if (this.state === "idle") return null;
      const changed = [...this.selected].sort((a, b) => a - b);
      for (const i of changed) this.open[i] = !this.open[i];
      this.selected.clear();
      this.paintValue = null;
      this.state = "idle";
      return { confirmed: true, changed };
    }

    /** Auswahl verwerfen (Esc, Fokusverlust, Spieler wird getroffen ...). */
    cancel() {
      if (this.state === "idle") return false;
      this.selected.clear();
      this.paintValue = null;
      this.state = "idle";
      return true;
    }
  }

  /** Feld unter Punkt (x, y) in Pixeln, sonst null. */
  function cellAt(x, y, { cols, rows, cellW, cellH }) {
    const c = Math.floor(x / cellW);
    const r = Math.floor(y / cellH);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return null;
    return r * cols + c;
  }

  /**
   * Alle Felder auf der Strecke von (x0, y0) nach (x1, y1), in Reihenfolge.
   * Wichtig bei schneller Bewegung: Pro Bild springt der Zeiger oft über mehrere
   * Felder. Würde man nur das Feld am Ende prüfen, blieben Felder dazwischen leer.
   */
  function cellsOnSegment(x0, y0, x1, y1, grid) {
    const step = Math.min(grid.cellW, grid.cellH) / 4;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(dist / step));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const idx = cellAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, grid);
      if (idx !== null && out[out.length - 1] !== idx) out.push(idx);
    }
    return out;
  }

  return { EditSession, cellAt, cellsOnSegment };
});
