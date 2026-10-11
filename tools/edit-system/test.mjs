// Start: node test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { EditSession, cellAt, cellsOnSegment } = createRequire(import.meta.url)("./edit-session.js");

test("halten, über Felder fahren, loslassen: Felder werden umgeschaltet", () => {
  const s = new EditSession();
  assert.equal(s.begin(), true);
  s.hover(0);
  s.hover(1);
  s.hover(4);
  const r = s.end();
  assert.deepEqual(r, { confirmed: true, changed: [0, 1, 4] });
  assert.deepEqual(s.open.map(Number), [1, 1, 0, 0, 1, 0, 0, 0, 0]);
  assert.equal(s.state, "idle");
});

test("Auto-Repeat der Taste startet nichts neu und löscht nichts", () => {
  const s = new EditSession();
  s.begin();
  s.hover(2);
  assert.equal(s.begin(), false);
  assert.deepEqual([...s.selected], [2]);
});

test("ohne Auswahl ändert das Loslassen nichts", () => {
  const s = new EditSession();
  s.begin();
  assert.deepEqual(s.end(), { confirmed: true, changed: [] });
  assert.ok(s.open.every((v) => !v));
});

test("Felder werden nicht doppelt gezählt, wenn man wieder darüber fährt", () => {
  const s = new EditSession();
  s.begin();
  s.hover(3);
  assert.equal(s.hover(3), false);
  s.hover(4);
  s.hover(3);
  assert.deepEqual(s.end().changed, [3, 4]);
});

test("erstes Feld bestimmt: ein markiertes Feld anfahren entmarkiert den Zug", () => {
  const s = new EditSession({ confirmOnRelease: false });
  s.begin();
  s.hover(0);
  s.hover(1);
  s.hover(2);
  s.end(); // pending
  s.begin(); // zweiter Zug, Auswahl bleibt erhalten
  s.hover(1); // markiertes Feld zuerst -> Zug entmarkiert
  s.hover(2);
  assert.deepEqual([...s.selected], [0]);
});

test("confirmOnRelease aus: Loslassen wartet auf confirm()", () => {
  const s = new EditSession({ confirmOnRelease: false });
  s.begin();
  s.hover(5);
  assert.deepEqual(s.end(), { confirmed: false, changed: [] });
  assert.equal(s.state, "pending");
  assert.ok(!s.open[5]);
  assert.deepEqual(s.confirm(), { confirmed: true, changed: [5] });
  assert.ok(s.open[5]);
});

test("cancel verwirft alles", () => {
  const s = new EditSession();
  s.begin();
  s.hover(0);
  assert.equal(s.cancel(), true);
  assert.equal(s.state, "idle");
  assert.ok(s.open.every((v) => !v));
  assert.equal(s.cancel(), false);
});

test("ohne begin() und außerhalb des Gitters passiert nichts", () => {
  const s = new EditSession();
  assert.equal(s.hover(0), false);
  assert.equal(s.end(), null);
  s.begin();
  assert.equal(s.hover(null), false);
  assert.equal(s.hover(99), false);
  assert.equal(s.hover(-1), false);
  assert.equal(s.hover(1.5), false);
});

test("zweiter Edit schaltet bestätigte Felder wieder zurück", () => {
  const s = new EditSession();
  s.begin(); s.hover(0); s.end();
  s.begin(); s.hover(0); s.hover(1); s.end();
  assert.deepEqual(s.open.map(Number).slice(0, 3), [0, 1, 0]);
});

const grid = { cols: 3, rows: 3, cellW: 100, cellH: 100 };

test("cellAt", () => {
  assert.equal(cellAt(50, 50, grid), 0);
  assert.equal(cellAt(299, 299, grid), 8);
  assert.equal(cellAt(-1, 10, grid), null);
  assert.equal(cellAt(300, 10, grid), null);
});

test("schnelle Bewegung über mehrere Felder lässt keines aus", () => {
  // ein einziger Sprung von links nach rechts über die ganze obere Reihe
  assert.deepEqual(cellsOnSegment(10, 50, 290, 50, grid), [0, 1, 2]);
  // diagonal
  assert.deepEqual(cellsOnSegment(10, 10, 290, 290, grid).filter((v, i, a) => a.indexOf(v) === i).includes(4), true);
});
