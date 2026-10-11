#!/usr/bin/env python3
"""Taste -> Maustaste: Solange eine Taste (Standard: F) gedrückt ist,
wird die Maustaste (Standard: links) gehalten. Beim Loslassen der Taste
wird auch die Maustaste losgelassen.

Start:   python taste_zu_maus.py
Beenden: Strg+C im Terminal
Pause:   F8 schaltet das Tool an/aus
"""
import argparse
import sys
import threading

# Windows-Tastaturnachrichten (nur für den Windows-Weg mit Unterdrückung)
WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP = 0x100, 0x101, 0x104, 0x105
VK_F8 = 0x77


class HoldMapper:
    """Hält die Maustaste, solange die Taste gedrückt ist.

    Tastenwiederholung (Auto-Repeat beim Gedrückthalten) sendet mehrere
    "gedrückt"-Ereignisse; durch das Merken des Zustands wird die
    Maustaste trotzdem nur einmal gedrückt und einmal losgelassen.
    """

    def __init__(self, mouse, button):
        self._mouse = mouse
        self._button = button
        self._held = False
        self._lock = threading.Lock()
        self.enabled = True

    @property
    def held(self):
        return self._held

    def press(self):
        with self._lock:
            if self.enabled and not self._held:
                self._mouse.press(self._button)
                self._held = True

    def release(self):
        # Loslassen immer erlauben, auch wenn zwischendurch pausiert wurde,
        # damit die Maustaste nie hängen bleibt.
        with self._lock:
            if self._held:
                self._mouse.release(self._button)
                self._held = False

    def toggle(self):
        self.enabled = not self.enabled
        if not self.enabled:
            self.release()
        return self.enabled


def _status(enabled):
    print("Tool AN" if enabled else "Tool PAUSIERT (F8 zum Einschalten)", flush=True)


def run(key_char, button_name, suppress):
    from pynput import keyboard, mouse

    buttons = {"left": mouse.Button.left, "right": mouse.Button.right,
               "middle": mouse.Button.middle}
    mapper = HoldMapper(mouse.Controller(), buttons[button_name])
    key_char = key_char.lower()
    toggle_down = False  # verhindert Mehrfach-Umschalten durch Auto-Repeat

    listener = None
    if sys.platform == "win32":
        vk = ord(key_char.upper())

        def win_filter(msg, data):
            nonlocal toggle_down
            is_down = msg in (WM_KEYDOWN, WM_SYSKEYDOWN)
            is_up = msg in (WM_KEYUP, WM_SYSKEYUP)
            if data.vkCode == VK_F8:
                if is_down and not toggle_down:
                    toggle_down = True
                    _status(mapper.toggle())
                elif is_up:
                    toggle_down = False
            elif data.vkCode == vk:
                if is_down:
                    mapper.press()
                elif is_up:
                    mapper.release()
                # Taste nicht an das Programm weitergeben, solange das Tool aktiv ist
                if suppress and mapper.enabled:
                    listener.suppress_event()
            return True

        listener = keyboard.Listener(win32_event_filter=win_filter)
    else:
        if suppress:
            print("Hinweis: Unterdrücken der Taste geht nur unter Windows; "
                  f"'{key_char}' wird zusätzlich normal getippt.")

        def matches(k):
            return getattr(k, "char", None) and k.char.lower() == key_char

        def on_press(k):
            nonlocal toggle_down
            if k == keyboard.Key.f8:
                if not toggle_down:
                    toggle_down = True
                    _status(mapper.toggle())
            elif matches(k):
                mapper.press()

        def on_release(k):
            nonlocal toggle_down
            if k == keyboard.Key.f8:
                toggle_down = False
            elif matches(k):
                mapper.release()

        listener = keyboard.Listener(on_press=on_press, on_release=on_release)

    print(f"Läuft: Taste '{key_char.upper()}' hält die Maustaste ({button_name}). "
          "F8 = an/aus, Strg+C = beenden.")
    listener.start()
    try:
        listener.join()
    except KeyboardInterrupt:
        pass
    finally:
        mapper.release()  # Maustaste nie gedrückt zurücklassen
        listener.stop()


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--taste", default="f", help="Auslösende Taste, ein Zeichen (Standard: f)")
    p.add_argument("--maus", default="left", choices=["left", "right", "middle"],
                   help="Maustaste (Standard: left)")
    p.add_argument("--nicht-unterdruecken", action="store_true",
                   help="Taste zusätzlich normal an das Programm durchreichen (Windows)")
    args = p.parse_args()
    if len(args.taste) != 1 or not args.taste.isalnum():
        p.error("--taste muss ein einzelner Buchstabe oder eine Ziffer sein")
    run(args.taste, args.maus, suppress=not args.nicht_unterdruecken)


if __name__ == "__main__":
    main()
