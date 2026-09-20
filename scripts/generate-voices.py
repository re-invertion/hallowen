"""Generate bundled Polish narration with XTTS-v2.

This is an offline asset-generation script. It is not required at runtime.
"""
import json
import os
import subprocess
from pathlib import Path

from TTS.api import TTS

OUT = Path(__file__).resolve().parents[1] / "public" / "audio"

LINES = {
    "intro-1": "Tworki. Jesień tysiąc dziewięćset czterdziestego czwartego roku. Legenda mówi o oddziale, którego nie zaznaczono na żadnym planie.",
    "intro-2": "Nie trafiali tam pacjenci z nazwiskami. Trafiały tam numery. Program nazwano Nachtigall. Słowik.",
    "intro-3": "Odbierano im światło, sen i poczucie czasu. Aż w ciemności wszyscy zobaczyli tego samego lekarza. Człowieka bez twarzy.",
    "intro-4": "Zanim przychodził, zawsze rozlegały się trzy uderzenia. W ostatnim raporcie zostało tylko jedno zdanie. Nie pozwól mu zobaczyć twojej twarzy.",
    "radio-start": "Halo? Słyszysz mnie? Zejdź kawałek i wracaj. Tu podobno nic nie ma.",
    "radio-warning": "Czekaj. Na planach nie ma żadnej piwnicy. Wracaj!",
    "whisper": "Nie odwracaj się.",
    "key": "Masz klucz. Drzwi. Na końcu korytarza.",
    "locked": "Zamknięte. Klucz musi być gdzieś tutaj.",
    "lost": "Pacjent czterdzieści siedem. Zostajesz z nami.",
    "won": "Myśleliśmy, że coś ci się stało. To naprawdę ty?",
}

NARRATOR = "Viktor Menelaos"
RADIO = "Zofija Kendrick"
FORCE = os.environ.get("FORCE_REGENERATE") == "1"

def speaker_for(name: str) -> str:
    if name.startswith("intro") or name in ("whisper", "lost"):
        return NARRATOR
    return RADIO

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)

    for name, text in LINES.items():
        filename = OUT / f"{name}.mp3"
        if not FORCE and filename.exists() and filename.stat().st_size > 1000:
            continue

        raw = OUT / f".{name}.xtts.wav"
        tts.tts_to_file(
            text=text,
            file_path=str(raw),
            speaker=speaker_for(name),
            language="pl",
            split_sentences=True,
        )

        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(raw),
            "-af", "highpass=f=55,lowpass=f=11000,loudnorm=I=-18:TP=-1.5:LRA=8",
            "-codec:a", "libmp3lame", "-q:a", "3",
            str(filename),
        ], check=True)
        raw.unlink(missing_ok=True)
        print(name, speaker_for(name), filename.stat().st_size, flush=True)

    (OUT / "transcript.json").write_text(
        json.dumps(LINES, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
