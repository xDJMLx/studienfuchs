#!/usr/bin/env python3
"""Taste -> Maustaste: Solange eine Taste (Standard: F) gedrückt ist,
wird die Maustaste (Standard: links) gehalten. Beim Loslassen der Taste
wird auch die Maustaste losgelassen.

Dies ist die Konsolen-Version und zugleich der Kern der App (app.py).

Start:   python taste_zu_maus.py
Beenden: Strg+C im Terminal
Pause:   F8 schaltet das Tool an/aus
"""
import argparse
import sys
import threading
import time

# Windows-Tastaturnachrichten (nur für den Windows-Weg mit Unterdrückung)
WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP = 0x100, 0x101, 0x104, 0x105
VK_F8 = 0x77

BUTTON_NAMES = ("left", "right", "middle")
MAX_DELAY_MS = 50.0  # Obergrenze: die Verzögerung läuft im Tastatur-Hook und darf ihn nicht blockieren


class HoldMapper:
    """Hält die Maustaste, solange die Taste gedrückt ist.

    Tastenwiederholung (Auto-Repeat beim Gedrückthalten) sendet mehrere
    "gedrückt"-Ereignisse; durch das Merken des Zustands wird die
    Maustaste trotzdem nur einmal gedrückt und einmal losgelassen.
    """

    def __init__(self, mouse, button, delay_ms=0.0):
        self._mouse = mouse
        self._button = button
        self.delay_s = max(0.0, min(float(delay_ms), MAX_DELAY_MS)) / 1000.0
        self._held = False
        self._lock = threading.Lock()
        self.enabled = True

    @property
    def held(self):
        return self._held

    def _wait(self):
        """Feste Verzögerung vor dem Maus-Ereignis (unter ~2 ms aktiv gewartet,
        weil time.sleep dort auf Windows zu grob ist)."""
        d = self.delay_s
        if d <= 0:
            return
        if d >= 0.002:
            time.sleep(d)
        else:
            end = time.perf_counter() + d
            while time.perf_counter() < end:
                pass

    def press(self):
        with self._lock:
            if self.enabled and not self._held:
                # Zustand zuerst setzen: Die App kann den eigenen Klick sofort
                # sehen und muss dann schon wissen, dass er von uns kommt.
                self._held = True
                try:
                    self._wait()
                    self._mouse.press(self._button)
                except Exception:
                    self._held = False
                    raise

    def release(self):
        # Loslassen immer erlauben, auch wenn zwischendurch pausiert wurde,
        # damit die Maustaste nie hängen bleibt.
        with self._lock:
            if self._held:
                self._wait()
                self._mouse.release(self._button)
                self._held = False

    def toggle(self):
        self.enabled = not self.enabled
        if not self.enabled:
            self.release()
        return self.enabled


class KeySpec:
    """Eine auslösende Taste: pynput-Taste, Windows-Tastencode und Anzeigename."""

    def __init__(self, key, vk, label):
        self.key = key
        self.vk = vk
        self.label = label

    def to_dict(self):
        from pynput import keyboard
        if isinstance(self.key, keyboard.Key):
            return {"name": self.key.name, "vk": self.vk, "label": self.label}
        return {"char": self.key.char, "vk": self.vk, "label": self.label}

    @classmethod
    def from_dict(cls, d):
        from pynput import keyboard
        if d.get("name"):
            key = keyboard.Key[d["name"]]
        else:
            key = keyboard.KeyCode(vk=d.get("vk"), char=d.get("char"))
        return cls(key, d.get("vk"), str(d.get("label") or "?"))


def spec_from_char(c):
    """Einzelner Buchstabe oder Ziffer, z. B. 'f'."""
    from pynput import keyboard
    return KeySpec(keyboard.KeyCode(vk=ord(c.upper()), char=c.lower()),
                   ord(c.upper()), c.upper())


def spec_from_pynput(key):
    """Aus einer von pynput gemeldeten Taste."""
    from pynput import keyboard
    if isinstance(key, keyboard.KeyCode):
        char = key.char if key.char and key.char.isprintable() else None
        label = char.upper() if char else (f"Taste {key.vk}" if key.vk else "?")
        return KeySpec(key, key.vk, label)
    vk = getattr(key.value, "vk", None)
    return KeySpec(key, vk, key.name.replace("_", " ").upper())


def is_pause_key(spec):
    from pynput import keyboard
    return spec.key == keyboard.Key.f8 or (sys.platform == "win32" and spec.vk == VK_F8)


def _same_key(a, b):
    """Tastenvergleich ohne Groß-/Kleinschreibung (für Nicht-Windows)."""
    ca, cb = getattr(a, "char", None), getattr(b, "char", None)
    if ca and cb:
        return ca.lower() == cb.lower()
    return a == b


class Service:
    """Lauscht global auf die Taste und hält dabei die Maustaste.

    F8 pausiert/setzt fort. `on_toggle(enabled)` wird dabei aus dem
    Listener-Thread aufgerufen.
    """

    def __init__(self, spec, button_name, suppress=False, on_toggle=None, delay_ms=0.0):
        from pynput import keyboard, mouse
        buttons = {"left": mouse.Button.left, "right": mouse.Button.right,
                   "middle": mouse.Button.middle}
        self.spec = spec
        self.mapper = HoldMapper(mouse.Controller(), buttons[button_name], delay_ms)
        self.suppress = suppress and sys.platform == "win32"
        self._on_toggle = on_toggle or (lambda enabled: None)
        self._toggle_down = False  # verhindert Mehrfach-Umschalten durch Auto-Repeat
        self._listener = None
        self._keyboard = keyboard

    @property
    def held(self):
        return self.mapper.held

    @property
    def enabled(self):
        return self.mapper.enabled

    def _toggle_pressed(self):
        if not self._toggle_down:
            self._toggle_down = True
            self._on_toggle(self.mapper.toggle())

    def start(self):
        keyboard = self._keyboard
        spec, mapper = self.spec, self.mapper

        if sys.platform == "win32":
            vk = spec.vk

            def win_filter(msg, data):
                is_down = msg in (WM_KEYDOWN, WM_SYSKEYDOWN)
                is_up = msg in (WM_KEYUP, WM_SYSKEYUP)
                if data.vkCode == VK_F8:
                    if is_down:
                        self._toggle_pressed()
                    elif is_up:
                        self._toggle_down = False
                elif data.vkCode == vk:
                    if is_down:
                        mapper.press()
                    elif is_up:
                        mapper.release()
                    # Taste nicht an das Programm weitergeben, solange das Tool aktiv ist
                    if self.suppress and mapper.enabled:
                        self._listener.suppress_event()
                return True

            self._listener = keyboard.Listener(win32_event_filter=win_filter)
        else:
            def on_press(k):
                if k == keyboard.Key.f8:
                    self._toggle_pressed()
                elif _same_key(k, spec.key):
                    mapper.press()

            def on_release(k):
                if k == keyboard.Key.f8:
                    self._toggle_down = False
                elif _same_key(k, spec.key):
                    mapper.release()

            self._listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        self._listener.start()

    def join(self):
        self._listener.join()

    def stop(self):
        self.mapper.release()  # Maustaste nie gedrückt zurücklassen
        if self._listener is not None:
            self._listener.stop()


def run(spec, button_name, suppress, delay_ms=0.0):
    def status(enabled):
        print("Tool AN" if enabled else "Tool PAUSIERT (F8 zum Einschalten)", flush=True)

    service = Service(spec, button_name, suppress, on_toggle=status, delay_ms=delay_ms)
    if suppress and sys.platform != "win32":
        print("Hinweis: Unterdrücken der Taste geht nur unter Windows; "
              f"'{spec.label}' wird zusätzlich normal getippt.")
    print(f"Läuft: Taste '{spec.label}' hält die Maustaste ({button_name}). "
          "F8 = an/aus, Strg+C = beenden.")
    service.start()
    try:
        service.join()
    except KeyboardInterrupt:
        pass
    finally:
        service.stop()


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--taste", default="f", help="Auslösende Taste, ein Zeichen (Standard: f)")
    p.add_argument("--maus", default="left", choices=list(BUTTON_NAMES),
                   help="Maustaste (Standard: left)")
    p.add_argument("--delay-ms", type=float, default=0.0,
                   help=f"Feste Verzögerung vor dem Maus-Ereignis in ms, 0 bis {MAX_DELAY_MS:g} (Standard: 0)")
    p.add_argument("--blockieren", action="store_true",
                   help="Taste NICHT an das Programm weitergeben (nur Windows). "
                        "Standard: Die Taste geht zusätzlich normal ans Programm/Spiel.")
    args = p.parse_args()
    if len(args.taste) != 1 or not args.taste.isalnum():
        p.error("--taste muss ein einzelner Buchstabe oder eine Ziffer sein")
    run(spec_from_char(args.taste), args.maus, suppress=args.blockieren,
        delay_ms=args.delay_ms)


if __name__ == "__main__":
    main()
