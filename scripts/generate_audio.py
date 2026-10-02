"""Erzeugt die Sprachdateien der App (public/audio/*.mp3) mit Piper (offline, neuronale Stimme).

Voraussetzungen (einmalig):
    python -m venv venv && venv/Scripts/pip install piper-tts      # Linux/Mac: venv/bin/pip
    venv/Scripts/python -m piper.download_voices fr_FR-siwis-medium
    ffmpeg im PATH

Ablauf:
    node scripts/export-texts.mjs audio-texts.json
    venv/Scripts/python scripts/generate_audio.py --texts audio-texts.json --model fr_FR-siwis-medium.onnx

Schon vorhandene Dateien werden übersprungen; Dateien zu nicht mehr benutzten Texten werden gelöscht.
Stimme: Piper-Modell fr_FR-siwis-medium (SIWIS-Datenbank), Lizenz CC BY 4.0 – Quellenangabe steht im Impressum/Datenschutz der App.
"""
import argparse
import json
import os
import subprocess
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice

parser = argparse.ArgumentParser()
parser.add_argument("--texts", required=True)
parser.add_argument("--model", required=True)
parser.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public" / "audio"))
parser.add_argument("--bitrate", default="40k")
args = parser.parse_args()

out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
texts: dict[str, str] = json.loads(Path(args.texts).read_text(encoding="utf-8"))
voice = PiperVoice.load(args.model)

todo = [k for k in texts if not (out / f"{k}.mp3").exists()]
print(f"{len(texts)} Texte, {len(todo)} neu zu erzeugen")

with tempfile.TemporaryDirectory() as tmp:
    for i, key in enumerate(todo, 1):
        wav_path = os.path.join(tmp, f"{key}.wav")
        with wave.open(wav_path, "wb") as w:
            voice.synthesize_wav(texts[key], w)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-ac", "1", "-codec:a", "libmp3lame", "-b:a", args.bitrate, str(out / f"{key}.mp3")],
            check=True,
        )
        os.remove(wav_path)
        if i % 100 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)}")

# nicht mehr benötigte Dateien entfernen und Index schreiben
keep = set(texts)
removed = 0
for f in out.glob("*.mp3"):
    if f.stem not in keep:
        f.unlink()
        removed += 1
(out / "index.json").write_text(json.dumps(sorted(keep)), encoding="utf-8")
size = sum(f.stat().st_size for f in out.glob("*.mp3")) / 1e6
print(f"fertig: {len(keep)} Dateien ({size:.1f} MB), {removed} veraltete gelöscht")
