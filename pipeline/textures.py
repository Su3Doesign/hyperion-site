"""Procedural PBR textures for the powertrain + paint (Pillow only, deterministic seeds).

    python3 pipeline/textures.py   ->  blender/textures/*.png
"""
import math, os, random
from PIL import Image, ImageFilter, ImageChops

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "blender/textures")
os.makedirs(OUT, exist_ok=True)


def height_to_normal(h, strength):
    w, ht = h.size
    p = h.load()
    out = Image.new("RGB", (w, ht))
    o = out.load()
    for y in range(ht):
        for x in range(w):
            dx = (p[(x + 1) % w, y] - p[(x - 1) % w, y]) / 255.0 * strength
            dy = (p[x, (y + 1) % ht] - p[x, (y - 1) % ht]) / 255.0 * strength
            l = math.sqrt(dx * dx + dy * dy + 1)
            o[x, y] = (int((-dx / l * .5 + .5) * 255), int((dy / l * .5 + .5) * 255), int((1 / l * .5 + .5) * 255))
    return out


def tileable_noise(size, scale, seed, octaves=4):
    rnd = random.Random(seed)
    acc = Image.new("L", (size, size), 128)
    amp = 1.0
    for o in range(octaves):
        n = max(2, int(scale * 2 ** o))
        small = Image.new("L", (n, n))
        small.putdata([rnd.randint(0, 255) for _ in range(n * n)])
        # tile 3x3 then crop centre so the bicubic upscale wraps cleanly
        big = Image.new("L", (n * 3, n * 3))
        for i in range(3):
            for j in range(3):
                big.paste(small, (i * n, j * n))
        big = big.resize((size * 3, size * 3), Image.BICUBIC).crop((size, size, size * 2, size * 2))
        acc = Image.blend(acc, big, amp / (1 + amp))
        amp *= 0.55
    return acc


def carbon_twill(size=512, tows=16):
    """2x2 twill weave: base colour + height -> normal. Tows alternate warp/weft every 2 cells, shifted per row."""
    cell = size // tows
    base = Image.new("RGB", (size, size))
    h = Image.new("L", (size, size))
    b, hp = base.load(), h.load()
    for y in range(size):
        for x in range(size):
            cx, cy = x // cell, y // cell
            u, v = (x % cell) / cell, (y % cell) / cell
            warp = ((cx + cy) // 2) % 2 == 0  # twill diagonal
            t = u if warp else v
            across = v if warp else u
            bulge = math.sin(math.pi * across) ** 0.6
            fib = 0.5 + 0.5 * math.sin(t * math.pi * 18 + (cx * 7 + cy * 3))
            lum = 0.07 + 0.11 * bulge + 0.05 * fib * bulge
            sheen = 1.08 if warp else 0.92
            g = int(min(1, lum * sheen) * 255)
            b[x, y] = (g, g, int(g * 1.04))
            hp[x, y] = int(255 * (0.25 + 0.75 * bulge))
    base.save(os.path.join(OUT, "carbon_base.png"))
    height_to_normal(h.filter(ImageFilter.GaussianBlur(0.8)), 3.0).save(os.path.join(OUT, "carbon_normal.png"))


def gold_foil(size=512):
    """Crinkled reflective heat-shield foil: sharp creases from ridged noise."""
    n1 = tileable_noise(size, 6, 11, 5)
    n2 = tileable_noise(size, 14, 23, 3)
    ridged = ImageChops.difference(n1, Image.new("L", (size, size), 128)).point(lambda v: 255 - min(255, v * 3))
    h = ImageChops.add(ridged, n2.point(lambda v: v // 3), scale=1.4)
    height_to_normal(h, 6.0).save(os.path.join(OUT, "foil_normal.png"))
    rough = n2.point(lambda v: int(40 + v * 0.35))
    rough.convert("RGB").save(os.path.join(OUT, "foil_rough.png"))


def cast_alu(size=256):
    n = tileable_noise(size, 24, 5, 3)
    height_to_normal(n.filter(ImageFilter.GaussianBlur(0.6)), 1.6).save(os.path.join(OUT, "cast_normal.png"))


def paint_flakes(size=512):
    """Metallic flake normal: per-pixel random tilts, lightly clustered. Tiled ~40x on the body."""
    rnd = random.Random(7)
    im = Image.new("RGB", (size, size))
    p = im.load()
    for y in range(size):
        for x in range(size):
            tx, ty = rnd.gauss(0, 0.22), rnd.gauss(0, 0.22)
            l = math.sqrt(tx * tx + ty * ty + 1)
            p[x, y] = (int((tx / l * .5 + .5) * 255), int((ty / l * .5 + .5) * 255), int((1 / l * .5 + .5) * 255))
    im.save(os.path.join(OUT, "flake_normal.png"))


if __name__ == "__main__":
    carbon_twill(); print("carbon")
    gold_foil(); print("foil")
    cast_alu(); print("cast")
    paint_flakes(); print("flakes")
