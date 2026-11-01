"""Pirelli P Zero sidewall and a clean wheel cover for the F1 car, drawn procedurally.

    python3 pipeline/pirelli.py            -> .work/f1/tex/{pirelli_side,cover}.png

The textures are polar: the centre of the image is the axle, so blender/f1_rebuild.py projects
the sidewall and cover faces flat along the axle onto them. That also lets the site smear them
around the centre for motion blur when the wheels spin.
Sidewall scale: image half-width = tyre outer radius (0.3605 m). Rim edge sits at 0.634 of it.
"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, ".work/f1/tex")
FONTS = os.environ.get("FONTS", "/home/user/tools/fonts")
os.makedirs(OUT, exist_ok=True)

S = 2048                  # output size
SS = 2                    # supersampling
R_TYRE = 0.3605           # m
R_RIM = 0.2287
SOFT = (225, 6, 0)        # Pirelli soft compound red
WHITE = (236, 236, 232)


def font(size, wght=800, wdth=125, italic=True):
    f = ImageFont.truetype(os.path.join(FONTS, "Archivo-Italic-VF.ttf" if italic else "Archivo-VF.ttf"), int(size))
    f.set_variation_by_axes([wght, wdth])
    return f


def shear(im, k=0.2):
    """Italic slant for drawn marks (top leans right)."""
    w, h = im.size
    return im.transform((w + int(h * k), h), Image.AFFINE, (1, k, -h * k, 0, 1, 0), resample=Image.BICUBIC)


def pirelli_mark(h):
    """The long-P wordmark: the P's bowl runs over the shorter IRELLI letters."""
    f = font(h * 0.66, 850, 118, italic=False)
    word = "IRELLI"
    tw = int(f.getlength(word)) + 4
    stem_w = int(h * 0.2)
    gap = int(h * 0.06)
    W = stem_w + gap + tw + int(h * 0.18)
    im = Image.new("L", (W, h), 0)
    d = ImageDraw.Draw(im)
    # IRELLI under the bowl, on the baseline
    base = h * 0.99
    d.text((stem_w + gap, base), word, font=f, fill=255, anchor="ls")
    # P stem, full height
    d.rectangle((0, 0, stem_w, h), fill=255)
    # bowl: long rounded loop from the stem over the letters
    top, bot, t = 0, int(h * 0.30), int(h * 0.12)
    r = (bot - top) // 2
    d.rounded_rectangle((0, top, W - 1, bot), radius=r, fill=255)
    d.rounded_rectangle((stem_w, top + t, W - 1 - t, bot - t), radius=max(1, r - t), fill=0)
    return shear(im, 0.2)


def pzero_mark(h):
    f = font(h * 0.98, 850, 125, italic=True)
    txt = "P ZERO"
    W = int(f.getlength(txt)) + int(h * 0.3)
    im = Image.new("L", (W, h), 0)
    ImageDraw.Draw(im).text((h * 0.1, h * 0.99), txt, font=f, fill=255, anchor="ls")
    return im


def small_text(txt, h, wght=600):
    f = font(h, wght, 112, italic=False)
    W = int(f.getlength(txt)) + 8
    im = Image.new("L", (W, int(h * 1.3)), 0)
    ImageDraw.Draw(im).text((4, h * 1.05), txt, font=f, fill=255, anchor="ls")
    return im


def arc(mask, strip, r_mid, ang_deg, outward=True):
    """Bend a straight strip (L) onto the circle at radius r_mid (px), centred on ang_deg
    (image coords: 0 = +x, 90 = down). Tops face outward on the upper arc, inward on the lower one."""
    n = mask.shape[0]
    c = n / 2
    sw, sh = strip.size
    sp = np.asarray(strip, dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    dx, dy = xx + 0.5 - c, yy + 0.5 - c
    r = np.hypot(dx, dy)
    th = np.arctan2(dy, dx)
    a0 = math.radians(ang_deg)
    dth = (th - a0 + np.pi) % (2 * np.pi) - np.pi
    if outward:
        u = dth * r_mid + sw / 2
        v = (r_mid + sh / 2) - r
    else:
        u = -dth * r_mid + sw / 2
        v = r - (r_mid - sh / 2)
    ok = (u >= 0) & (u < sw - 1) & (v >= 0) & (v < sh - 1)
    ui, vi = u[ok].astype(np.int32), v[ok].astype(np.int32)
    fu, fv = u[ok] - ui, v[ok] - vi
    val = (sp[vi, ui] * (1 - fu) * (1 - fv) + sp[vi, ui + 1] * fu * (1 - fv)
           + sp[vi + 1, ui] * (1 - fu) * fv + sp[vi + 1, ui + 1] * fu * fv)
    mask[ok] = np.maximum(mask[ok], val)


def ring(mask, r0, r1, a0=None, a1=None):
    n = mask.shape[0]
    c = n / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    r = np.hypot(xx + 0.5 - c, yy + 0.5 - c)
    m = (r >= r0) & (r <= r1)
    if a0 is not None:
        th = np.degrees(np.arctan2(yy + 0.5 - c, xx + 0.5 - c)) % 360
        m &= ((th - a0) % 360) <= ((a1 - a0) % 360)
    mask[m] = 1.0


def sidewall():
    n = S * SS
    px = n / 2 / R_TYRE                 # pixels per metre
    rim = R_RIM * px
    rng = np.random.default_rng(7)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    r = np.hypot(xx + 0.5 - n / 2, yy + 0.5 - n / 2)
    # moulded rubber: near-black, faint concentric moulding rings, fine grain
    base = 0.052 + 0.006 * np.sin(r / (0.0016 * px)) * (r > rim + 0.012 * px)
    base += rng.normal(0, 0.004, (n, n)).astype(np.float32)
    for rr in (rim + 0.006 * px, 0.318 * px, 0.338 * px):
        base -= 0.018 * np.exp(-((r - rr) / (0.0012 * px)) ** 2)
    red = np.zeros((n, n), np.float32)
    white = np.zeros((n, n), np.float32)
    # compound colour band: thin full ring near the rim, two long arcs outboard of the lettering
    ring(red, rim + 0.012 * px, rim + 0.0165 * px)
    ring(red, 0.3215 * px, 0.3285 * px, 200, 340)
    ring(red, 0.3215 * px, 0.3285 * px, 20, 160)
    mid = (rim + 0.0205 * px + 0.318 * px) / 2
    hb = int(0.036 * px)
    arc(red, pzero_mark(hb), mid, -90, True)
    arc(red, pzero_mark(hb), mid, 90, False)
    arc(white, pirelli_mark(int(0.041 * px)), mid, 0, False)
    arc(white, pirelli_mark(int(0.041 * px)), mid, 180, True)
    # small regulation text between the marks
    for txt, ang, out in (("SOFT  ·  C4", -38, True), ("F1  ·  18\"", -142, True), ("305/670 R18", 38, False), ("MADE IN ITALY", 142, False)):
        arc(white, small_text(txt, int(0.0085 * px)), mid, ang, out)
    rgb = np.stack([base] * 3, -1)
    for col, m, gloss in ((SOFT, red, 1.0), (WHITE, white, 0.9)):
        c = np.array(col, np.float32) / 255.0
        rgb = rgb * (1 - m[..., None]) + c[None, None, :] * m[..., None] * gloss
    rgb = np.clip(rgb, 0, 1)
    img = Image.fromarray((rgb ** (1 / 1.0) * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    img.save(os.path.join(OUT, "pirelli_side.png"))
    # roughness (glTF: G channel): rubber 0.82, paint 0.5
    paint = np.maximum(red, white)
    rough = 0.82 - 0.32 * paint
    rimg = np.zeros((n, n, 3), np.float32)
    rimg[..., 1] = rough
    Image.fromarray((rimg * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS).save(os.path.join(OUT, "pirelli_side_rough.png"))
    print("sidewall", S)


def cover():
    n = 1024 * SS
    c = n / 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    r = np.hypot(xx + 0.5 - c, yy + 0.5 - c) / c      # 0..1 of the cover radius
    th = np.arctan2(yy + 0.5 - c, xx + 0.5 - c)
    # satin black carbon cover: faint twill near the hub, darker rim, team accent ring
    tw = 0.5 + 0.5 * np.sign(np.sin((xx + yy) / 7.0)) * np.sign(np.sin((xx - yy) / 7.0))
    v = 0.035 + 0.012 * tw * (r < 0.86) + 0.01 * (1 - r)
    acc = ((r > 0.905) & (r < 0.93)).astype(np.float32)
    acc += ((r > 0.30) & (r < 0.315)).astype(np.float32)
    rgb = np.stack([v, v, v], -1)
    col = np.array((232, 38, 70), np.float32) / 255.0   # livery pink-red
    rgb = rgb * (1 - acc[..., None]) + col * acc[..., None]
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, "cover.png"))
    print("cover 1024")


if __name__ == "__main__":
    sidewall()
    cover()
