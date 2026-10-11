#!/usr/bin/env python3
"""Erzeugt TasteZuMaus.pyw: Kern (taste_zu_maus.py) + Oberfläche (app.py) in EINER Datei.

    python einzeldatei_bauen.py
"""
import re
from pathlib import Path

here = Path(__file__).resolve().parent

BOOT = '''\
#!/usr/bin/env python3
# Taste -> Maus: Taste halten, Maustaste haelt mit. (Eine einzelne Datei.)
# Doppelklick startet die App. Beim ersten Start wird "pynput" automatisch installiert.
# Diese Datei wird erzeugt (einzeldatei_bauen.py), Aenderungen bitte dort machen.
import subprocess
import sys

try:
    import pynput  # noqa: F401
except ImportError:
    import tkinter as _tk
    from tkinter import messagebox as _mb
    _w = _tk.Tk()
    _w.title("Taste -> Maus")
    _w.geometry("340x90")
    _tk.Label(_w, text="Einmalige Einrichtung (pynput) ...\\nBitte kurz warten.",
              pady=20).pack()
    _w.update()
    _flags = 0x08000000 if sys.platform == "win32" else 0  # kein Konsolenfenster
    _r = subprocess.run([sys.executable, "-m", "pip", "install", "pynput"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                        stdin=subprocess.DEVNULL, creationflags=_flags)
    _w.destroy()
    try:
        import pynput  # noqa: F401,F811
    except ImportError:
        _mb.showerror("Taste -> Maus",
                      "pynput konnte nicht installiert werden (Internet?).\\n"
                      "Bitte im Terminal ausfuehren:\\n    python -m pip install pynput")
        sys.exit(1)

'''

core = (here / "taste_zu_maus.py").read_text(encoding="utf-8")
# Konsolen-Teil (run/main/__main__) gehoert nicht in die App
core = core[core.index("\ndef run(spec"):]
core_head = (here / "taste_zu_maus.py").read_text(encoding="utf-8")
core_head = core_head[:core_head.index("\ndef run(spec")]
core_head = re.sub(r'^#!.*\n"""(?:.|\n)*?"""\n', "", core_head, count=1)  # Kopf-Docstring

app = (here / "app.py").read_text(encoding="utf-8")
app = re.sub(r'^#!.*\n"""(?:.|\n)*?"""\n', "", app, count=1)
app = app.replace("import taste_zu_maus as core\n", "")
app = re.sub(r"\bcore\.", "", app)

out = BOOT + core_head + "\n\n# ===== Oberflaeche =====\n" + app
(here / "TasteZuMaus.pyw").write_text(out, encoding="utf-8")
print("TasteZuMaus.pyw geschrieben:", len(out.splitlines()), "Zeilen")
