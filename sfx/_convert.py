"""Convert 8-bit ~10 kHz arcade dumps to 16-bit 22050 Hz PCM for browsers."""
import wave
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT_RATE = 22050

for p in sorted(SRC.glob("joust-*.wav")):
    if p.name.endswith("-16.wav"):
        continue
    with wave.open(str(p), "rb") as w:
        nch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw != 1:
        print("skip", p.name, "width", sw)
        continue
    # unsigned 8-bit -> float
    floats = [(b - 128) / 128.0 for b in raw]
    # trim leading silence
    i0 = 0
    while i0 < len(floats) and abs(floats[i0]) < 0.02:
        i0 += 1
    floats = floats[max(0, i0 - 8) :]
    # linear resample
    out_n = int(len(floats) * OUT_RATE / sr)
    pcm = bytearray()
    for i in range(out_n):
        src_pos = i * (len(floats) - 1) / max(1, out_n - 1)
        j = int(src_pos)
        f = src_pos - j
        a = floats[j]
        b = floats[min(j + 1, len(floats) - 1)]
        v = a + (b - a) * f
        s = max(-32767, min(32767, int(v * 30000)))
        pcm.append(s & 0xFF)
        pcm.append((s >> 8) & 0xFF)
    out = SRC / (p.stem + "-16.wav")
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(OUT_RATE)
        w.writeframes(bytes(pcm))
    print("wrote", out.name, out.stat().st_size, f"{out_n/OUT_RATE:.3f}s")
