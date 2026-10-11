#!/usr/bin/env python3
"""Taste -> Maus: Desktop-App mit Oberfläche.

Start: python app.py   (oder die gebaute TasteZuMaus.exe)
"""
import json
import math
import queue
import sys
import tkinter as tk
from pathlib import Path
from tkinter import font as tkfont

import taste_zu_maus as core

# --- Farben -----------------------------------------------------------------
BG = "#0b0e14"
CARD = "#131822"
CARD2 = "#1a212e"
BORDER = "#252d3b"
TEXT = "#e8edf5"
MUTED = "#7f8aa0"
GREEN = "#2ee6a6"
RED = "#ff5d6c"
AMBER = "#ffb454"
BTN = "#2a3446"
BODY = "#1d2431"

CONFIG_PATH = Path.home() / ".taste_zu_maus.json"
BUTTON_LABELS = {"left": "Links", "right": "Rechts", "middle": "Mitte"}
DELAYS = (0.0, 0.1, 1.0, 5.0, 10.0)  # ms; Auswahl in der Oberfläche
IS_WIN = sys.platform == "win32"


def mix(c1, c2, t):
    """Mischt zwei Farben (#rrggbb); t=0 -> c1, t=1 -> c2."""
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rpoly(x1, y1, x2, y2, tl=0, tr=0, br=0, bl=0, n=8):
    """Punkte eines Rechtecks mit einzeln einstellbaren runden Ecken."""
    pts = []

    def arc(cx, cy, r, a0, a1):
        if r <= 0:
            pts.extend([cx, cy])
            return
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.extend([cx + r * math.cos(a), cy + r * math.sin(a)])

    arc(x1 + tl, y1 + tl, tl, 180, 270)
    arc(x2 - tr, y1 + tr, tr, 270, 360)
    arc(x2 - br, y2 - br, br, 0, 90)
    arc(x1 + bl, y2 - bl, bl, 90, 180)
    return pts


def setup_dpi():
    if IS_WIN:
        import ctypes
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass


class App:
    W = 440  # Fensterbreite in "logischen" Pixeln

    def __init__(self, root):
        self.root = root
        self.s = max(1.0, root.winfo_fpixels("1i") / 96.0)
        root.title("Taste → Maus")
        if IS_WIN:
            try:
                base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
                root.iconbitmap(str(base / "icon.ico"))
            except Exception:
                pass  # Icon ist nur Zierde
        root.configure(bg=BG)
        root.resizable(False, False)

        self.q = queue.Queue()
        self.service = None
        self.phase = "idle"  # idle | running | paused
        self.capturing = False
        self.error = ""
        self.t = 0
        self.start_hover = False

        self.key_spec = core.spec_from_char("f")
        self.button = "left"
        self.suppress = False  # Taste geht standardmäßig auch an das Programm/Spiel
        self.delay_ms = 1.0
        self._load_config()

        fam = "Segoe UI"
        self.f_title = tkfont.Font(family=fam, size=-self.px(26), weight="bold")
        self.f_sub = tkfont.Font(family=fam, size=-self.px(13))
        self.f_row = tkfont.Font(family=fam, size=-self.px(14))
        self.f_small = tkfont.Font(family=fam, size=-self.px(11))
        self.f_bold = tkfont.Font(family=fam, size=-self.px(14), weight="bold")
        self.f_btn = tkfont.Font(family=fam, size=-self.px(17), weight="bold")
        self.f_key = tkfont.Font(family=fam, size=-self.px(34), weight="bold")
        self.f_key_small = tkfont.Font(family=fam, size=-self.px(15), weight="bold")
        self.f_cap = tkfont.Font(family=fam, size=-self.px(11), weight="bold")

        self._build()
        self._center()
        root.protocol("WM_DELETE_WINDOW", self.close)
        self.root.after(40, self.tick)

    # --- Hilfen -------------------------------------------------------------
    def px(self, v):
        return int(round(v * self.s))

    def _center(self):
        self.root.update_idletasks()
        w, h = self.root.winfo_reqwidth(), self.root.winfo_reqheight()
        x = (self.root.winfo_screenwidth() - w) // 2
        y = max(0, (self.root.winfo_screenheight() - h) // 3)
        self.root.geometry(f"+{x}+{y}")

    def _load_config(self):
        try:
            d = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            self.key_spec = core.KeySpec.from_dict(d["key"])
            if d.get("button") in core.BUTTON_NAMES:
                self.button = d["button"]
            self.suppress = bool(d.get("block_key", False))
            if d.get("delay_ms") in DELAYS:
                self.delay_ms = float(d["delay_ms"])
        except Exception:
            pass  # keine oder kaputte Einstellungen: Standardwerte

    def _save_config(self):
        try:
            CONFIG_PATH.write_text(json.dumps({
                "key": self.key_spec.to_dict(),
                "button": self.button,
                "block_key": self.suppress,
                "delay_ms": self.delay_ms,
            }), encoding="utf-8")
        except Exception:
            pass

    @property
    def locked(self):
        return self.phase != "idle"

    # --- Aufbau -------------------------------------------------------------
    def _build(self):
        px = self.px
        pad = px(24)
        inner = px(self.W) - 2 * pad

        head = tk.Frame(self.root, bg=BG)
        head.pack(fill="x", padx=pad, pady=(px(22), px(10)))
        tk.Label(head, text="Taste → Maus", font=self.f_title, bg=BG, fg=TEXT).pack(anchor="w")
        tk.Label(head, text="Taste halten – die Maustaste hält mit.",
                 font=self.f_sub, bg=BG, fg=MUTED).pack(anchor="w")

        self.stage = tk.Canvas(self.root, width=inner, height=px(200), bg=BG,
                               highlightthickness=0)
        self.stage.pack(padx=pad)

        card = tk.Frame(self.root, bg=CARD, highlightbackground=BORDER, highlightthickness=1)
        card.pack(fill="x", padx=pad, pady=(px(8), px(14)))

        # Zeile: Taste
        self.key_chip = None
        row = self._row(card, "Auslöser-Taste", None)
        right = tk.Frame(row, bg=CARD)
        right.pack(side="right")
        self.key_chip = tk.Label(right, font=self.f_bold, bg=CARD2, fg=TEXT,
                                 padx=px(14), pady=px(5))
        self.key_chip.pack(side="left", padx=(0, px(8)))
        self.change_btn = tk.Label(right, text="Ändern", font=self.f_row, bg=BTN, fg=TEXT,
                                   padx=px(12), pady=px(5), cursor="hand2")
        self.change_btn.pack(side="left")
        self.change_btn.bind("<Button-1>", lambda e: self.begin_capture())

        # Zeile: Maustaste
        row = self._row(card, "Maustaste", None, sep=True)
        seg = tk.Frame(row, bg=CARD2)
        seg.pack(side="right")
        self.seg_labels = {}
        for name in core.BUTTON_NAMES:
            lb = tk.Label(seg, text=BUTTON_LABELS[name], font=self.f_row,
                          padx=px(12), pady=px(5), cursor="hand2")
            lb.pack(side="left", padx=px(2), pady=px(2))
            lb.bind("<Button-1>", lambda e, n=name: self.set_button(n))
            self.seg_labels[name] = lb

        # Zeile: Verzögerung
        row = self._row(card, "Verzögerung", "feste Zeit vor dem Mausklick", sep=True)
        dseg = tk.Frame(row, bg=CARD2)
        dseg.pack(side="right")
        self.delay_labels = {}
        for ms in DELAYS:
            text = "Aus" if ms == 0 else f"{ms:g}".replace(".", ",")
            lb = tk.Label(dseg, text=text, font=self.f_row,
                          padx=px(9), pady=px(5), cursor="hand2")
            lb.pack(side="left", padx=px(2), pady=px(2))
            lb.bind("<Button-1>", lambda e, v=ms: self.set_delay(v))
            self.delay_labels[ms] = lb
        tk.Label(row, text="ms", font=self.f_small, bg=CARD, fg=MUTED).pack(side="right", padx=(0, px(6)))

        # Zeile: Taste blockieren
        sub = "Aus: Taste geht auch ans Programm" if IS_WIN else "nur unter Windows"
        row = self._row(card, "Taste blockieren", sub, sep=True)
        self.sw = tk.Canvas(row, width=px(46), height=px(26), bg=CARD,
                            highlightthickness=0, cursor="hand2")
        self.sw.pack(side="right")
        self.sw.bind("<Button-1>", lambda e: self.toggle_suppress())

        # Start-Knopf
        self.btn = tk.Canvas(self.root, width=inner, height=px(62), bg=BG,
                             highlightthickness=0, cursor="hand2")
        self.btn.pack(padx=pad)
        self.btn.bind("<Button-1>", lambda e: self.toggle_run())
        self.btn.bind("<Enter>", lambda e: self._hover(True))
        self.btn.bind("<Leave>", lambda e: self._hover(False))

        # Status
        st = tk.Frame(self.root, bg=BG)
        st.pack(fill="x", padx=pad, pady=(px(14), 0))
        self.led = tk.Canvas(st, width=px(14), height=px(14), bg=BG, highlightthickness=0)
        self.led.pack(side="left")
        self.status = tk.Label(st, font=self.f_row, bg=BG, fg=TEXT, anchor="w")
        self.status.pack(side="left", padx=(px(8), 0))

        tk.Label(self.root, text="F8 = Pause / Weiter  ·  gilt auch, wenn die App im Hintergrund ist",
                 font=self.f_small, bg=BG, fg=MUTED).pack(pady=(px(12), px(18)))

        self._refresh()

    def _row(self, card, title, subtitle, sep=False):
        px = self.px
        if sep:
            tk.Frame(card, bg=BORDER, height=1).pack(fill="x")
        row = tk.Frame(card, bg=CARD)
        row.pack(fill="x", padx=px(16), pady=px(11))
        left = tk.Frame(row, bg=CARD)
        left.pack(side="left")
        tk.Label(left, text=title, font=self.f_row, bg=CARD, fg=TEXT).pack(anchor="w")
        if subtitle:
            tk.Label(left, text=subtitle, font=self.f_small, bg=CARD, fg=MUTED).pack(anchor="w")
        return row

    # --- Einstellungen ------------------------------------------------------
    def set_button(self, name):
        if self.locked:
            return
        self.button = name
        self._save_config()
        self._refresh()

    def set_delay(self, ms):
        if self.locked:
            return
        self.delay_ms = ms
        self._save_config()
        self._refresh()

    def toggle_suppress(self):
        if self.locked or not IS_WIN:
            return
        self.suppress = not self.suppress
        self._save_config()
        self._refresh()

    def begin_capture(self):
        if self.locked or self.capturing:
            return
        from pynput import keyboard
        self.capturing = True
        self.error = ""

        def on_press(k):
            spec = None if k == keyboard.Key.esc else core.spec_from_pynput(k)
            self.q.put(("captured", spec))
            return False  # Listener beenden

        keyboard.Listener(on_press=on_press).start()
        self._refresh()

    # --- Start / Stop -------------------------------------------------------
    def toggle_run(self):
        if self.capturing:
            return
        # Liegt der Mauszeiger auf dem Knopf, trifft der von der App gehaltene
        # Mausklick den Knopf selbst. Solange gehalten wird, wird er ignoriert.
        if self.service is not None and self.service.held:
            return
        if self.phase == "idle":
            try:
                self.service = core.Service(
                    self.key_spec, self.button, suppress=self.suppress,
                    on_toggle=lambda enabled: self.q.put(("toggle", enabled)),
                    delay_ms=self.delay_ms)
                self.service.start()
            except Exception as e:  # z. B. fehlende Rechte (macOS) oder kein X-Server
                self.service = None
                self.error = f"Konnte nicht starten: {e}"
            else:
                self.error = ""
                self.phase = "running"
        else:
            self._stop_service()
            self.phase = "idle"
        self._refresh()

    def _stop_service(self):
        if self.service is not None:
            self.service.stop()
            self.service = None

    def close(self):
        self._stop_service()
        self.root.destroy()

    # --- Schleife -----------------------------------------------------------
    def tick(self):
        changed = False
        try:
            while True:
                kind, val = self.q.get_nowait()
                if kind == "toggle" and self.service is not None:
                    self.phase = "running" if val else "paused"
                    changed = True
                elif kind == "captured":
                    self.capturing = False
                    changed = True
                    if val is not None:
                        if core.is_pause_key(val):
                            self.error = "F8 ist für Pause/Weiter reserviert."
                        else:
                            self.key_spec = val
                            self.error = ""
                            self._save_config()
        except queue.Empty:
            pass
        self.t += 1
        if changed:
            self._refresh()
        else:
            self.draw_stage()
            self.draw_led()
        self.root.after(40, self.tick)

    # --- Zeichnen -----------------------------------------------------------
    def _refresh(self):
        locked = self.locked
        fg_idle = MUTED if locked else TEXT
        self.key_chip.configure(
            text="Drücke eine Taste …" if self.capturing else self.key_spec.label,
            fg=GREEN if self.capturing else fg_idle)
        self.change_btn.configure(fg=MUTED if locked else TEXT,
                                  cursor="arrow" if locked else "hand2")
        for name, lb in self.seg_labels.items():
            sel = name == self.button
            lb.configure(bg=GREEN if sel else CARD2,
                         fg=BG if sel else (MUTED if locked else TEXT),
                         cursor="arrow" if locked else "hand2")
        for ms, lb in self.delay_labels.items():
            sel = ms == self.delay_ms
            lb.configure(bg=GREEN if sel else CARD2,
                         fg=BG if sel else (MUTED if locked else TEXT),
                         cursor="arrow" if locked else "hand2")
        self.draw_switch()
        self.draw_button()
        self.draw_stage()
        self.draw_led()
        if self.error:
            text, color = self.error, RED
        elif self.capturing:
            text, color = "Drücke die gewünschte Taste (Esc = abbrechen)", GREEN
        elif self.phase == "idle":
            text, color = "Bereit – drücke Start", MUTED
        elif self.phase == "running":
            text, color = f"Aktiv – halte {self.key_spec.label}, die Maus hält mit", TEXT
        else:
            text, color = "Pausiert – F8 zum Fortsetzen", AMBER
        self.status.configure(text=text, fg=color)

    def _hover(self, on):
        self.start_hover = on
        self.draw_button()

    def draw_button(self):
        px = self.px
        c = self.btn
        c.delete("all")
        w, h = int(c["width"]), int(c["height"])
        if self.phase == "idle":
            fill, label, fg = GREEN, "▶   START", "#05261b"
        else:
            fill, label, fg = RED, "■   STOP", "#2b0509"
        if self.start_hover:
            fill = mix(fill, "#ffffff", 0.18)
        # weiches Leuchten unter dem Knopf
        for i, a in enumerate((0.10, 0.18, 0.28)):
            g = px(6 - i * 2)
            c.create_polygon(rpoly(g, g, w - g, h - g + px(2), h // 2, h // 2, h // 2, h // 2),
                             fill=mix(BG, fill, a), outline="")
        c.create_polygon(rpoly(px(8), px(4), w - px(8), h - px(6), h // 2, h // 2, h // 2, h // 2),
                         fill=fill, outline="")
        c.create_text(w // 2, h // 2 - px(1), text=label, font=self.f_btn, fill=fg)

    def draw_switch(self):
        px = self.px
        c = self.sw
        c.delete("all")
        w, h = int(c["width"]), int(c["height"])
        on = self.suppress and IS_WIN
        track = GREEN if on else BTN
        if self.locked or not IS_WIN:
            track = mix(track, CARD, 0.55)
        c.create_polygon(rpoly(1, 1, w - 1, h - 1, h // 2, h // 2, h // 2, h // 2),
                         fill=track, outline="")
        r = h // 2 - px(3)
        cx = w - h // 2 if on else h // 2
        c.create_oval(cx - r, h // 2 - r, cx + r, h // 2 + r,
                      fill="#ffffff" if on else MUTED, outline="")

    def draw_led(self):
        c = self.led
        c.delete("all")
        w = int(c["width"])
        if self.service is not None and self.service.held:
            col = GREEN
        elif self.phase == "running":
            col = mix(mix(BG, GREEN, 0.45), GREEN, (math.sin(self.t * 0.15) + 1) / 2)
        elif self.phase == "paused":
            col = AMBER
        else:
            col = BORDER
        c.create_oval(2, 2, w - 2, w - 2, fill=col, outline="")

    def draw_stage(self):
        px = self.px
        c = self.stage
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        held = self.service is not None and self.service.held
        paused = self.phase == "paused"
        accent = GREEN

        # Karte im Hintergrund
        c.create_polygon(rpoly(1, 1, W - 1, H - 1, px(18), px(18), px(18), px(18)),
                         fill=CARD, outline=BORDER)

        # --- Tastenkappe ---
        kx1, kx2 = px(48), px(148)
        ky1, ky2 = px(48), px(138)
        press = px(6) if held else 0
        base = mix(CARD, "#000000", 0.35)
        c.create_polygon(rpoly(kx1, ky1 + px(8), kx2, ky2 + px(8), px(16), px(16), px(16), px(16)),
                         fill=base, outline="")
        cap = mix(CARD2, accent, 0.30) if held else CARD2
        edge = accent if held else (AMBER if paused else BORDER)
        c.create_polygon(rpoly(kx1, ky1 + press, kx2, ky2 + press, px(16), px(16), px(16), px(16)),
                         fill=cap, outline=edge, width=2 if held else 1)
        label = self.key_spec.label
        font = self.f_key if len(label) <= 2 else self.f_key_small
        c.create_text((kx1 + kx2) // 2, (ky1 + ky2) // 2 + press, text=label, font=font,
                      fill=accent if held else TEXT, width=kx2 - kx1 - px(10))
        c.create_text((kx1 + kx2) // 2, H - px(24), text="TASTE", font=self.f_cap, fill=MUTED)

        # --- Verbindung ---
        x1, x2, y = px(170), px(262), px(93)
        n = 5
        for i in range(n):
            x = x1 + (x2 - x1) * i / (n - 1)
            if held:
                # Lichtpunkt läuft von der Taste zur Maus
                d = (i / n - (self.t * 0.07) % 1.0) % 1.0
                col = mix(accent, CARD, min(1.0, d * 1.3))
                r = px(4) if d < 0.35 else px(3)
            else:
                col, r = mix(CARD, BORDER, 1.0), px(3)
            c.create_oval(x - r, y - r, x + r, y + r, fill=col, outline="")
        ax = x2 + px(12)
        ac = accent if held else BORDER
        c.create_line(ax, y - px(7), ax + px(8), y, ax, y + px(7), fill=ac, width=2)

        # --- Maus ---
        bx1, bx2 = px(300), px(380)
        by1, by2 = px(34), px(150)
        mx = (bx1 + bx2) // 2
        c.create_polygon(rpoly(bx1, by1, bx2, by2, px(38), px(38), px(40), px(40)),
                         fill=BODY, outline=BORDER, width=1)
        btn_h = px(58)
        gap = px(2)
        active = self.button if held else None
        lcol = accent if active == "left" else BTN
        rcol = accent if active == "right" else BTN
        c.create_polygon(rpoly(bx1 + px(3), by1 + px(3), mx - gap, by1 + btn_h,
                               px(35), 0, 0, 0), fill=lcol, outline="")
        c.create_polygon(rpoly(mx + gap, by1 + px(3), bx2 - px(3), by1 + btn_h,
                               0, px(35), 0, 0), fill=rcol, outline="")
        mcol = accent if active == "middle" else mix(BTN, "#ffffff", 0.12)
        c.create_polygon(rpoly(mx - px(5), by1 + px(12), mx + px(5), by1 + px(34),
                               px(5), px(5), px(5), px(5)), fill=mcol, outline=BODY, width=2)
        # Auswahl der konfigurierten Maustaste dezent markieren (wenn nicht gehalten)
        if not held:
            hint = mix(BTN, accent, 0.35)
            if self.button == "left":
                c.create_polygon(rpoly(bx1 + px(3), by1 + px(3), mx - gap, by1 + btn_h,
                                       px(35), 0, 0, 0), fill=hint, outline="")
            elif self.button == "right":
                c.create_polygon(rpoly(mx + gap, by1 + px(3), bx2 - px(3), by1 + btn_h,
                                       0, px(35), 0, 0), fill=hint, outline="")
            else:
                c.create_polygon(rpoly(mx - px(5), by1 + px(12), mx + px(5), by1 + px(34),
                                       px(5), px(5), px(5), px(5)), fill=hint,
                                 outline=BODY, width=2)
        cap_text = ("MAUS · " + BUTTON_LABELS[self.button]).upper()
        c.create_text(mx, H - px(24), text=cap_text, font=self.f_cap,
                      fill=accent if held else MUTED)


def main():
    setup_dpi()
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
