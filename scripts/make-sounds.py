"""Sonidos propios del portfolio (Foley sintetizado, sin muestras de terceros).

Genera public/audio/foley/*.mp3 con síntesis modal (copa), ruido filtrado (vertido, tela) y
resonancias amortiguadas (corcho, tijera). Al ser sintetizados no tienen licencia ni autoría ajena.

Uso:  python3 scripts/make-sounds.py      (requiere numpy, scipy e imageio-ffmpeg)
"""
import os
import subprocess
import sys
import wave

import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'foley')
rng = np.random.default_rng(7)  # semilla fija: siempre salen los mismos archivos


def t_(d):
    return np.arange(int(SR * d)) / SR


def white(d):
    return rng.standard_normal(int(SR * d))


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def env_ad(n, a, d):
    """Ataque lineal corto y caída exponencial (segundos)."""
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def place(buf, x, at):
    i = int(at * SR)
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i : i + n] += x[:n]


def reverb(x, rt60=0.6, wet=0.22, lo=200, hi=7000):
    n = int(SR * rt60)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt60)
    ir = bp(ir, lo, hi)
    ir[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    ir /= np.sqrt(np.sum(ir**2)) + 1e-9
    w = signal.fftconvolve(x, ir)[: len(x) + n // 2]
    y = np.zeros(len(w))
    y[: len(x)] += x * (1 - wet)
    return y + w * wet * 1.6


def finish(x, peak_db=-3.0, fade=0.03, trim=True):
    x = np.asarray(x, dtype=np.float64)
    x = hp(x, 35, 1)
    if trim:
        a = np.abs(x)
        idx = np.where(a > a.max() * 0.004)[0]
        if len(idx):
            x = x[: min(len(x), idx[-1] + int(0.05 * SR))]
    nf = int(fade * SR)
    x[-nf:] *= np.linspace(1, 0, nf)
    x *= 10 ** (peak_db / 20) / (np.abs(x).max() + 1e-12)
    return x


def save(name, x):
    os.makedirs(OUT, exist_ok=True)
    wav = os.path.join(OUT, name + '.wav')
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    import imageio_ffmpeg

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', os.path.join(OUT, name + '.mp3')], check=True)
    os.remove(wav)
    print(f'{name}.mp3  {len(x) / SR:.2f}s')


# ---------------------------------------------------------------------------------------------
# VINO
# ---------------------------------------------------------------------------------------------
def clink():
    """Brindis: dos copas de cristal. Síntesis modal (parciales inarmónicos con decaimiento propio)."""
    d = 2.6
    y = np.zeros(int(SR * d))
    t = t_(d)
    base = [2180.0, 2930.0]  # dos copas un poco desafinadas → batido natural
    ratios = [1.0, 2.32, 4.25, 6.63, 9.4]
    amps = [1.0, 0.46, 0.26, 0.12, 0.05]
    taus = [0.95, 0.55, 0.32, 0.18, 0.1]
    for k, f0 in enumerate(base):
        for r, a, tau in zip(ratios, amps, taus):
            f = f0 * r * (1 + rng.uniform(-0.002, 0.002))
            if f < 15000:
                y += a * (0.8 if k else 1) * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    # golpe seco inicial (contacto del borde)
    tick = hp(white(0.02), 3500) * np.exp(-t_(0.02) / 0.004)
    place(y, tick * 0.8, 0)
    return finish(reverb(y, 0.9, 0.2), -3)


def cork():
    """Descorche: fricción breve, pop hueco (resonancia del cuello) y cola de sala."""
    d = 1.6
    y = np.zeros(int(SR * d))
    # 1 · el corcho chirría al salir (fricción con temblor)
    n = int(0.13 * SR)
    tt = np.arange(n) / SR
    sq = bp(white(0.13), 1100, 2300)
    sq *= (0.5 + 0.5 * np.sin(2 * np.pi * 70 * tt + 3 * np.sin(2 * np.pi * 9 * tt))) * np.sin(np.pi * tt / 0.13) ** 1.4
    place(y, sq * 0.28, 0.0)
    # 2 · pop: sinusoide amortiguada con caída de tono + golpe de aire
    at = 0.15
    tp = t_(0.22)
    f = 520 + 640 * np.exp(-tp / 0.018)  # 1160 → 520 Hz
    ph = 2 * np.pi * np.cumsum(f) / SR
    pop = np.sin(ph) * np.exp(-tp / 0.045)
    air = lp(white(0.22), 3800) * np.exp(-tp / 0.012)
    thump = np.sin(2 * np.pi * 105 * tp) * np.exp(-tp / 0.05)
    place(y, pop * 1.0 + air * 0.7 + thump * 0.6, at)
    # 3 · resonancia de la botella (Helmholtz del cuello, grave y corta)
    tb = t_(0.6)
    bot = (np.sin(2 * np.pi * 172 * tb) + 0.4 * np.sin(2 * np.pi * 344 * tb)) * np.exp(-tb / 0.16)
    place(y, bot * 0.34, at + 0.004)
    return finish(reverb(y, 0.75, 0.24), -3)


def pour(d=2.4):
    """Vino cayendo en una copa: chorro + burbujas + tono de la cavidad que sube al llenarse."""
    n = int(SR * d)
    t = np.arange(n) / SR
    y = np.zeros(n)
    # chorro: ruido de banda media con fluctuación lenta
    flow = bp(white(d), 700, 3200)
    wob = 0.65 + 0.35 * np.sin(2 * np.pi * 3.1 * t + 2 * np.sin(2 * np.pi * 0.7 * t)) * np.sin(2 * np.pi * 5.3 * t + 1)
    y += flow * wob * 0.55
    # cavidad que se llena: resonancia de banda estrecha con centro creciente (300 → 850 Hz)
    fc = 300 + 550 * (t / d) ** 0.9
    cav = np.zeros(n)
    blk = 512
    for i in range(0, n, blk):
        c = fc[min(i, n - 1)]
        seg = white(blk / SR)
        cav[i : i + blk] = signal.sosfilt(signal.butter(2, [c * 0.92, c * 1.08], 'bandpass', fs=SR, output='sos'), seg)[: len(cav[i : i + blk])]
    y += cav * 1.5 * (0.5 + 0.5 * np.sin(2 * np.pi * 2.3 * t + 1.3)) ** 0.5
    # burbujas (glugs): chirps ascendentes de 15–45 ms, menos densas al final
    m = int(d * 26)
    for _ in range(m):
        at = rng.uniform(0.05, d - 0.25) ** 1.0
        dens = 1 - 0.55 * (at / d)
        if rng.uniform() > dens:
            continue
        dur = rng.uniform(0.018, 0.05)
        tb = t_(dur)
        f0 = rng.uniform(260, 620) * (0.8 + 0.9 * at / d)
        ph = 2 * np.pi * np.cumsum(f0 * (1 + 2.2 * tb / dur)) / SR
        b = np.sin(ph) * np.sin(np.pi * tb / dur) ** 1.5 * rng.uniform(0.25, 0.7)
        place(y, b, at)
    e = np.minimum(1, t / 0.12) * np.minimum(1, (d - t) / 0.45)
    return finish(reverb(y * e, 0.5, 0.16), -4)


def glug():
    """Un solo glug de botella al inclinarse (corto)."""
    d = 0.7
    y = np.zeros(int(SR * d))
    for at, f0, a in [(0.02, 240, 1.0), (0.26, 205, 0.8)]:
        dur = 0.17
        tb = t_(dur)
        ph = 2 * np.pi * np.cumsum(f0 * (1 + 1.4 * tb / dur)) / SR
        b = np.sin(ph) * np.sin(np.pi * tb / dur) ** 1.2 * np.exp(-tb / 0.12)
        b += 0.3 * np.sin(2 * ph) * np.sin(np.pi * tb / dur) ** 2
        place(y, b * a, at)
    y += lp(white(d), 1500) * np.exp(-t_(d) / 0.12) * 0.05
    return finish(reverb(y, 0.45, 0.2), -4)


def scan():
    """Etiqueta que se dibuja: papel deslizándose (ruido con barrido de filtro ascendente)."""
    d = 0.75
    n = int(SR * d)
    t = np.arange(n) / SR
    x = white(d)
    out = np.zeros(n)
    blk = 256
    for i in range(0, n, blk):
        p = i / n
        c = 1400 + 4200 * p
        seg = x[i : i + blk]
        out[i : i + blk] = signal.sosfilt(signal.butter(2, [c * 0.7, c * 1.4], 'bandpass', fs=SR, output='sos'), seg)[: len(out[i : i + blk])]
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6
    return finish(out * e, -8)


# ---------------------------------------------------------------------------------------------
# BARBERÍA
# ---------------------------------------------------------------------------------------------
def _cloth_whoosh(d, f0, f1, peak):
    n = int(SR * d)
    t = np.arange(n) / SR
    x = white(d)
    out = np.zeros(n)
    blk = 256
    for i in range(0, n, blk):
        p = i / n
        c = f0 + (f1 - f0) * np.sin(np.pi * p * 0.9)
        seg = x[i : i + blk]
        out[i : i + blk] = signal.sosfilt(signal.butter(2, [c * 0.55, c * 1.5], 'bandpass', fs=SR, output='sos'), seg)[: len(out[i : i + blk])]
    flutter = 0.72 + 0.28 * np.sin(2 * np.pi * 26 * t + 4 * np.sin(2 * np.pi * 3 * t))
    e = np.exp(-0.5 * ((t - d * peak) / (d * 0.26)) ** 2)
    return out * e * flutter


def _snap(dur=0.16):
    """Latigazo de tela tensándose."""
    t = t_(dur)
    b = lp(white(dur), 3200) * np.exp(-t / 0.028)
    th = np.sin(2 * np.pi * 96 * t) * np.exp(-t / 0.05)
    bod = bp(white(dur), 250, 700) * np.exp(-t / 0.05)
    return b * 0.9 + th * 0.5 + bod * 0.7


def _rustle(d):
    n = int(SR * d)
    t = np.arange(n) / SR
    r = bp(white(d), 900, 4200)
    am = np.abs(lp(white(d), 22, 2))
    am /= am.max() + 1e-9
    return r * am**1.3 * np.exp(-t / (d * 0.35))


def cape_on():
    """Ponerle la capa a alguien: vuelo de tela, latigazo al abrirse y roce al acomodarse."""
    d = 1.7
    y = np.zeros(int(SR * d))
    place(y, _cloth_whoosh(0.5, 650, 2600, 0.55), 0.0)
    place(y, _snap(), 0.36)
    place(y, _rustle(0.9) * 0.55, 0.42)
    return finish(reverb(y, 0.35, 0.12), -3)


def cape_flap():
    """Sacudida breve de la capa."""
    d = 0.85
    y = np.zeros(int(SR * d))
    place(y, _cloth_whoosh(0.3, 800, 2200, 0.5), 0.0)
    place(y, _snap(0.12) * 0.75, 0.2)
    place(y, _rustle(0.4) * 0.35, 0.24)
    return finish(reverb(y, 0.3, 0.1), -4)


def snip():
    """Tijera: dos cortes rápidos (metal fino + golpe de hojas)."""
    d = 0.5
    y = np.zeros(int(SR * d))
    for at, k in [(0.0, 1.0), (0.13, 0.85)]:
        dur = 0.12
        t = t_(dur)
        s = hp(white(dur), 2500) * np.exp(-t / 0.006)
        ring = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / tau) for f, a, tau in [(3900, 1.0, 0.03), (6100, 0.6, 0.02), (8800, 0.35, 0.013)])
        chk = bp(white(dur), 700, 1500) * np.exp(-t / 0.008)
        place(y, (s * 0.7 + ring * 0.55 + chk * 0.8) * k, at)
    return finish(reverb(y, 0.3, 0.1), -4)


if __name__ == '__main__':
    for fn in (clink, cork, pour, glug, scan, cape_on, cape_flap, snip):
        save(fn.__name__.replace('_', '-'), fn())
    sys.exit(0)
