"""Generate bundled Polish narration. Only run when replacing voice assets."""
import asyncio
import json
import subprocess
from pathlib import Path
import edge_tts

OUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
LINES = {
    'intro-1': 'Tworki. Jesień tysiąc dziewięćset czterdziestego czwartego roku. Legenda mówi o oddziale, którego nie zaznaczono na żadnym planie.',
    'intro-2': 'Nie trafiali tam pacjenci z nazwiskami. Trafiały tam numery. Program nazwano Nachtigall. Słowik.',
    'intro-3': 'Odbierano im światło, sen i poczucie czasu. Aż w ciemności wszyscy zobaczyli tego samego lekarza. Człowieka bez twarzy.',
    'intro-4': 'Zanim przychodził, zawsze rozlegały się trzy uderzenia. W ostatnim raporcie zostało tylko jedno zdanie. Nie pozwól mu zobaczyć twojej twarzy.',
    'radio-start': 'Halo? Słyszysz mnie? Zejdź kawałek i wracaj. Tu podobno nic nie ma.',
    'radio-warning': 'Czekaj. Na planach nie ma żadnej piwnicy. Wracaj!',
    'whisper': 'Nie odwracaj się.',
    'key': 'Masz klucz. Drzwi. Na końcu korytarza.',
    'locked': 'Zamknięte. Klucz musi być gdzieś tutaj.',
    'lost': 'Pacjent czterdzieści siedem. Zostajesz z nami.',
    'won': 'Myśleliśmy, że coś ci się stało. To naprawdę ty?',
}

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in LINES.items():
        filename = OUT / f'{name}.mp3'
        if filename.exists() and filename.stat().st_size > 1000:
            continue
        narrator = name.startswith('intro') or name in ('whisper', 'lost')
        await edge_tts.Communicate(text, 'pl-PL-MarekNeural', rate='-12%' if narrator else '+0%', pitch='-12Hz' if narrator else '+0Hz').save(str(filename))
        if name.startswith('intro'):
            raw = OUT.parent.parent / '.tools' / 'voice-originals' / filename.name
            raw.parent.mkdir(parents=True, exist_ok=True)
            raw.write_bytes(filename.read_bytes())
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(raw), '-af', 'atempo=1.25,highpass=f=75,lowpass=f=6500', str(filename)], check=True)
        print(name, filename.stat().st_size, flush=True)
    (OUT / 'transcript.json').write_text(json.dumps(LINES, ensure_ascii=False, indent=2), encoding='utf-8')

asyncio.run(main())
