#!/usr/bin/env python3
"""
يولّد مؤثرات صوتية أصلية لمكتبة التأثيرات (بدون أي ملفات خارجية).

كل صوت مصنوع بالكامل من معادلات (موجات + ضوضاء + مرشحات) داخل هذا السكربت،
لذلك لا توجد أي حقوق طبع أو نشر عليه. الترخيص: CC0-1.0.

التشغيل (من مجلد web):
    python3 scripts/generate-effect-sounds.py

يحتاج: numpy, scipy, ffmpeg (لتحويل wav إلى ogg).
الناتج: public/assets/audio/effects/*.ogg + game/data/effect-sound-assets.json
لاستبدال أي صوت بتسجيل حقيقي: ضع ملفاً بنفس الاسم في نفس المجلد.
"""
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 22050
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "audio" / "effects"
MANIFEST = ROOT / "game" / "data" / "effect-sound-assets.json"


def rng_for(name):
    return np.random.default_rng(abs(hash_name(name)) % (2**32))


def hash_name(name):  # ثابت بين التشغيلات (hash() في بايثون عشوائي)
    value = 2166136261
    for ch in name.encode():
        value = ((value ^ ch) * 16777619) & 0xFFFFFFFF
    return value


def t_axis(dur):
    return np.linspace(0, dur, int(SR * dur), endpoint=False)


def env_ad(n, attack=0.005, decay=0.2, curve=3.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-curve * t / max(decay, 1e-4))
    return a * d


def noise(rng, dur):
    return rng.standard_normal(int(SR * dur))


def bandpass(x, lo, hi, order=3):
    lo = max(20.0, lo)
    hi = min(SR / 2 - 100, hi)
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lowpass(x, fc, order=3):
    sos = signal.butter(order, min(fc, SR / 2 - 100), btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x, fc, order=3):
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def sweep(dur, f0, f1, shape="sine", curve="exp"):
    t = t_axis(dur)
    if curve == "exp":
        k = (f1 / f0) ** (1 / dur)
        phase = 2 * np.pi * f0 * (k**t - 1) / np.log(k) if abs(k - 1) > 1e-6 else 2 * np.pi * f0 * t
    else:
        phase = 2 * np.pi * (f0 * t + (f1 - f0) * t**2 / (2 * dur))
    if shape == "square":
        return np.sign(np.sin(phase))
    return np.sin(phase)


def tone(dur, f, shape="sine"):
    t = t_axis(dur)
    if shape == "square":
        return np.sign(np.sin(2 * np.pi * f * t))
    return np.sin(2 * np.pi * f * t)


def place(total, parts):
    """parts: [(start_sec, array)] ← يجمعها في مصفوفة واحدة."""
    out = np.zeros(int(SR * total))
    for start, arr in parts:
        i = int(SR * start)
        j = min(len(out), i + len(arr))
        if j > i:
            out[i:j] += arr[: j - i]
    return out


# --------------------------------------------------------------------- الأصوات
def zap(rng):
    dur = 0.55
    n = noise(rng, dur)
    crackle = highpass(n, 2500) * env_ad(len(n), 0.002, 0.18, 4)
    t = t_axis(dur)
    buzz = np.sign(np.sin(2 * np.pi * 90 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t))
    buzz = bandpass(buzz, 120, 1800) * env_ad(len(t), 0.003, 0.3, 3.5)
    arp = np.concatenate([sweep(0.07, 1500 - i * 150, 400, "square") * env_ad(int(SR * 0.07), 0.001, 0.05) for i in range(4)])
    return place(dur, [(0, crackle * 0.7), (0, buzz * 0.5), (0.02, arp * 0.45)])


def freeze(rng):
    dur = 0.7
    parts = []
    for k in range(6):
        st = float(rng.uniform(0, 0.3))
        click = highpass(noise(rng, 0.03), 3000) * env_ad(int(SR * 0.03), 0.0005, 0.012, 5)
        parts.append((st, click * float(rng.uniform(0.4, 0.9))))
    for f, st in [(3136, 0.0), (4186, 0.05), (2637, 0.12)]:
        p = tone(0.5, f) * env_ad(int(SR * 0.5), 0.002, 0.25, 4)
        parts.append((st, p * 0.3))
    return place(dur, parts)


def burn(rng):
    dur = 0.85
    n = noise(rng, dur)
    t = t_axis(dur)
    center = 500 + 900 * np.sin(np.pi * t / dur)
    # ضوضاء مرشّحة بتردد متحرك (تقريب بمزج نطاقين)
    low = bandpass(n, 200, 700)
    high = bandpass(n, 700, 2400)
    mix = low * (1 - t / dur) + high * (t / dur)
    swell = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.8
    crackles = np.zeros_like(t)
    for _ in range(14):
        i = int(rng.uniform(0.05, 0.8) * SR)
        crackles[i : i + 40] += highpass(noise(rng, 0.002), 2000)[:40] * rng.uniform(0.5, 1.0)
    return mix * swell * 0.8 + crackles * 0.6


def explosion(rng):
    dur = 1.0
    t = t_axis(dur)
    boom = sweep(dur, 140, 32) * env_ad(len(t), 0.004, 0.45, 3.2)
    rumble = lowpass(noise(rng, dur), 380) * env_ad(len(t), 0.003, 0.6, 2.6)
    crack = highpass(noise(rng, 0.12), 1200) * env_ad(int(SR * 0.12), 0.001, 0.06, 5)
    return place(dur, [(0, boom * 1.0), (0, rumble * 1.2), (0, crack * 0.8)])


def poison(rng):
    dur = 0.6
    parts = []
    for k in range(5):
        st = k * 0.1 + float(rng.uniform(0, 0.03))
        f0 = float(rng.uniform(220, 380))
        b = sweep(0.1, f0, f0 * 2.2) * env_ad(int(SR * 0.1), 0.004, 0.07, 3)
        parts.append((st, b * 0.6))
    hiss = bandpass(noise(rng, dur), 1500, 4500) * env_ad(int(SR * dur), 0.05, 0.4, 2) * 0.12
    return place(dur, parts) + hiss


def juice_splat(rng):
    dur = 0.3
    n = lowpass(noise(rng, dur), 1600) * env_ad(int(SR * dur), 0.002, 0.09, 4)
    blip = sweep(0.12, 420, 130) * env_ad(int(SR * 0.12), 0.002, 0.07, 3)
    drips = [(0.12 + i * 0.05, sweep(0.05, 900, 400) * env_ad(int(SR * 0.05), 0.002, 0.03) * 0.3) for i in range(3)]
    return place(dur, [(0, n * 0.9), (0, blip * 0.7)] + drips)


def leaf_burst(rng):
    dur = 0.45
    n = bandpass(noise(rng, dur), 2000, 7000)
    flutter = 0.5 + 0.5 * np.sin(2 * np.pi * 28 * t_axis(dur) + rng.uniform(0, 6))
    return n * flutter * env_ad(len(n), 0.01, 0.2, 2.8)


def stun_stars(rng):
    dur = 0.7
    thump = sweep(0.12, 220, 90) * env_ad(int(SR * 0.12), 0.001, 0.07, 3)
    ding = [(0.08 + i * 0.12, tone(0.4, f) * env_ad(int(SR * 0.4), 0.002, 0.25, 4) * 0.35) for i, f in enumerate([1760, 2217, 2637])]
    return place(dur, [(0, thump * 0.9)] + ding)


def slash(rng):
    dur = 0.28
    n = noise(rng, dur)
    t = t_axis(dur)
    sw = bandpass(n, 1200, 6500) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    shk = highpass(noise(rng, 0.03), 4000) * env_ad(int(SR * 0.03), 0.0005, 0.015, 4)
    return place(dur, [(0, sw * 0.9), (0.14, shk * 0.5)])


def heavy_smash(rng):
    dur = 0.55
    thud = sweep(0.35, 110, 42) * env_ad(int(SR * 0.35), 0.002, 0.2, 3.2)
    body = lowpass(noise(rng, 0.4), 700) * env_ad(int(SR * 0.4), 0.002, 0.14, 4)
    crack = highpass(noise(rng, 0.06), 1500) * env_ad(int(SR * 0.06), 0.0008, 0.03, 5)
    return place(dur, [(0, thud * 1.1), (0, body * 0.9), (0, crack * 0.6)])


def lightning(rng):
    dur = 1.3
    crack = highpass(noise(rng, 0.25), 900) * env_ad(int(SR * 0.25), 0.0008, 0.09, 4)
    zig = [(i * 0.025, highpass(noise(rng, 0.02), 2500) * env_ad(int(SR * 0.02), 0.0005, 0.01) * 0.6) for i in range(6)]
    rumble = lowpass(noise(rng, 1.1), 260) * env_ad(int(SR * 1.1), 0.03, 0.6, 2.4)
    boom = sweep(0.8, 90, 36) * env_ad(int(SR * 0.8), 0.02, 0.45, 3)
    return place(dur, [(0, crack * 1.0)] + zig + [(0.08, rumble * 1.2), (0.08, boom * 0.8)])


def stone_shatter(rng):
    dur = 0.5
    parts = []
    for i in range(9):
        st = float(rng.uniform(0, 0.28))
        lo = float(rng.uniform(900, 2200))
        c = bandpass(noise(rng, 0.04), lo, lo * 2.2) * env_ad(int(SR * 0.04), 0.0005, 0.02, 4)
        parts.append((st, c * float(rng.uniform(0.5, 1.0))))
    thud = sweep(0.18, 160, 70) * env_ad(int(SR * 0.18), 0.001, 0.1, 3)
    parts.append((0, thud * 0.7))
    return place(dur, parts)


def magic_sparkle(rng):
    dur = 0.9
    notes = [1319, 1568, 1976, 2637, 3136]
    parts = [(i * 0.07, tone(0.5, f) * env_ad(int(SR * 0.5), 0.002, 0.28, 4) * 0.28) for i, f in enumerate(notes)]
    return place(dur, parts)


def smoke_puff(rng):
    dur = 0.55
    return lowpass(noise(rng, dur), 1400) * env_ad(int(SR * dur), 0.04, 0.3, 2.6)


def charge_glow(rng):
    dur = 0.55
    t = t_axis(dur)
    up = sweep(dur, 180, 880) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t))
    shimmer = bandpass(noise(rng, dur), 3000, 7000) * (t / dur) * 0.15
    return (up * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6) * 0.8 + shimmer


def recoil_pop(rng):
    dur = 0.2
    pop = sweep(0.12, 700, 160) * env_ad(int(SR * 0.12), 0.001, 0.06, 3.5)
    click = highpass(noise(rng, 0.02), 1800) * env_ad(int(SR * 0.02), 0.0005, 0.01, 4)
    return place(dur, [(0, pop), (0, click * 0.5)])


def muzzle_flare(rng):
    dur = 0.3
    w = bandpass(noise(rng, dur), 900, 6000) * env_ad(int(SR * dur), 0.002, 0.1, 4)
    drop = sweep(0.2, 900, 220) * env_ad(int(SR * 0.2), 0.001, 0.09, 3)
    return place(dur, [(0, w * 0.9), (0, drop * 0.55)])


def dirt_pop(rng):
    dur = 0.4
    thump = sweep(0.2, 130, 55) * env_ad(int(SR * 0.2), 0.002, 0.11, 3.2)
    dirt = lowpass(noise(rng, 0.3), 900) * env_ad(int(SR * 0.3), 0.003, 0.12, 4)
    pebbles = [(0.1 + i * 0.045, bandpass(noise(rng, 0.015), 1200, 3000) * env_ad(int(SR * 0.015), 0.0005, 0.007) * 0.5) for i in range(4)]
    return place(dur, [(0, thump), (0, dirt * 0.8)] + pebbles)


def magic_summon(rng):
    dur = 1.0
    t = t_axis(dur)
    rise = sweep(0.8, 260, 1040) * env_ad(int(SR * 0.8), 0.15, 0.5, 1.5)
    chords = [(0.35 + i * 0.1, tone(0.55, f) * env_ad(int(SR * 0.55), 0.004, 0.3, 4) * 0.25) for i, f in enumerate([784, 988, 1319, 1568])]
    shim = bandpass(noise(rng, 0.9), 3500, 8000) * env_ad(int(SR * 0.9), 0.2, 0.4, 2) * 0.12
    return place(dur, [(0, rise * 0.45), (0.05, shim)] + chords)


def white_flash(rng):
    dur = 0.16
    tick = sweep(0.1, 520, 170) * env_ad(int(SR * 0.1), 0.001, 0.05, 3.5)
    click = highpass(noise(rng, 0.02), 2500) * env_ad(int(SR * 0.02), 0.0005, 0.01, 4)
    return place(dur, [(0, tick), (0, click * 0.6)])


def chew_crumbs(rng):
    dur = 0.4
    parts = []
    for i in range(5):
        st = i * 0.07 + float(rng.uniform(0, 0.02))
        c = bandpass(noise(rng, 0.05), 700, 3500) * env_ad(int(SR * 0.05), 0.001, 0.025, 4)
        parts.append((st, c * float(rng.uniform(0.6, 1.0))))
    return place(dur, parts)


def poof_vanish(rng):
    dur = 0.45
    puff = lowpass(noise(rng, dur), 2200) * env_ad(int(SR * dur), 0.01, 0.16, 3.4)
    pitch = sweep(0.25, 600, 180) * env_ad(int(SR * 0.25), 0.002, 0.12, 3)
    return place(dur, [(0, puff * 0.9), (0, pitch * 0.4)])


def coin_pop(rng):
    dur = 0.5
    a = tone(0.12, 988, "square") * env_ad(int(SR * 0.12), 0.001, 0.08, 4) * 0.25
    b = tone(0.38, 1319, "square") * env_ad(int(SR * 0.38), 0.001, 0.22, 3.5) * 0.25
    s = tone(0.38, 2637) * env_ad(int(SR * 0.38), 0.001, 0.2, 4) * 0.12
    return place(dur, [(0, a), (0.08, b), (0.08, s)])


def fire_aura(rng):
    dur = 0.7
    parts = []
    for _ in range(16):
        st = float(rng.uniform(0, 0.62))
        c = highpass(noise(rng, 0.01), 1800)[:int(SR * 0.008)] * float(rng.uniform(0.3, 1.0))
        parts.append((st, c))
    base = bandpass(noise(rng, dur), 300, 1200) * env_ad(int(SR * dur), 0.1, 0.5, 1.5) * 0.35
    return place(dur, parts) * 0.6 + base


def frost_aura(rng):
    dur = 0.8
    parts = [(i * 0.14, tone(0.6, f) * env_ad(int(SR * 0.6), 0.004, 0.4, 3.5) * 0.2) for i, f in enumerate([3322, 4186, 3729])]
    return place(dur, parts)


def glow_pulse(rng):
    dur = 0.9
    t = t_axis(dur)
    sw = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return (np.sin(2 * np.pi * 220 * t) * 0.5 + np.sin(2 * np.pi * 330 * t) * 0.35 + np.sin(2 * np.pi * 440 * t) * 0.15) * sw


SOUNDS = {
    "electric-shock": ("الصعق الكهربائي", zap),
    "freeze": ("التجميد", freeze),
    "burn": ("الحرق", burn),
    "explosion": ("الانفجار الكبير", explosion),
    "poison": ("السم", poison),
    "juice-splat": ("رذاذ العصارة", juice_splat),
    "leaf-burst": ("تناثر الأوراق", leaf_burst),
    "stun-stars": ("الدوخة", stun_stars),
    "slash": ("ضربة القطع", slash),
    "heavy-smash": ("الضربة الساحقة", heavy_smash),
    "lightning-strike": ("صاعقة من السماء", lightning),
    "stone-shatter": ("تحطّم الصخور", stone_shatter),
    "magic-sparkle": ("البريق السحري", magic_sparkle),
    "smoke-puff": ("سحابة الدخان", smoke_puff),
    "charge-glow": ("توهّج الشحن", charge_glow),
    "recoil-pop": ("ارتداد الإطلاق", recoil_pop),
    "muzzle-flare": ("وميض الفوهة", muzzle_flare),
    "dirt-pop": ("الانبثاق من التراب", dirt_pop),
    "magic-summon": ("الاستدعاء السحري", magic_summon),
    "white-flash": ("وميض الإصابة", white_flash),
    "chew-crumbs": ("فتات الأكل", chew_crumbs),
    "poof-vanish": ("الاختفاء بسحابة", poof_vanish),
    "coin-pop": ("قفزة العملات", coin_pop),
    "fire-aura": ("الهالة النارية", fire_aura),
    "frost-aura": ("الهالة الجليدية", frost_aura),
    "glow-pulse": ("التوهّج النابض", glow_pulse),
}


def finalize(x):
    x = np.nan_to_num(x)
    x = x - np.mean(x)
    n = len(x)
    fade = min(int(0.01 * SR), n // 4)
    if fade > 0:
        x[:fade] *= np.linspace(0, 1, fade)
        x[-fade:] *= np.linspace(1, 0, fade)
    peak = float(np.max(np.abs(x))) or 1.0
    return x / peak * 0.708  # ‎-3 dBFS


def write_ogg(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / f"{name}.wav"
        with wave.open(str(wav_path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        ogg_path = OUT / f"{name}.ogg"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-c:a", "libvorbis", "-q:a", "4", str(ogg_path)],
            check=True,
        )
        return ogg_path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    assets = []
    total = 0
    for name, (label, fn) in SOUNDS.items():
        samples = finalize(fn(rng_for(name)))
        path = write_ogg(name, samples)
        size = path.stat().st_size
        total += size
        assets.append({
            "key": f"fx-{name}",
            "path": f"/assets/audio/effects/{name}.ogg",
            "label": label,
            "durationMs": int(len(samples) / SR * 1000),
            "bytes": size,
        })
        print(f"{name:20s} {len(samples)/SR:4.2f}s {size/1024:5.1f} KB")
    MANIFEST.write_text(json.dumps({
        "license": "CC0-1.0",
        "licenseName": "Creative Commons Zero 1.0 Universal",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "creator": "Generated procedurally by web/scripts/generate-effect-sounds.py (no external samples)",
        "note": "Synthesized placeholders: replace any file with a real recording of the same name to upgrade quality.",
        "assets": assets,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"\n{len(assets)} sounds, {total/1024:.0f} KB total")


if __name__ == "__main__":
    main()
