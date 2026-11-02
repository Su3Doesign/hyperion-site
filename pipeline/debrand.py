"""Replace third-party brand marks baked into the kitbash textures with original Hyperion marks.

Input : .work/images/NN.png   (exported by blender/export_images.py, NN = Blender image index)
Output: .work/images_clean/NN.png  (only the images that needed changes)

Every replacement is drawn procedurally so the result is reproducible:
    python3 pipeline/debrand.py
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, ".work/images")
DST = os.path.join(ROOT, ".work/images_clean")
FONTS = os.environ.get("FONTS", "/home/user/tools/fonts")
os.makedirs(DST, exist_ok=True)


def font(size, wght=800, wdth=125, italic=False):
    f = ImageFont.truetype(os.path.join(FONTS, "Archivo-Italic-VF.ttf" if italic else "Archivo-VF.ttf"), size)
    f.set_variation_by_axes([wght, wdth])
    return f


def mono(size, wght=500):
    f = ImageFont.truetype(os.path.join(FONTS, "JetBrainsMono-VF.ttf"), size)
    f.set_variation_by_axes([wght])
    return f


def load(n):
    return Image.open(os.path.join(SRC, f"{n:02d}.png"))


def save(im, n):
    im.save(os.path.join(DST, f"{n:02d}.png"))
    print("cleaned", n)


# ---------------------------------------------------------------- the mark
def monogram(size, fg=(255, 255, 255, 255), bg=(0, 0, 0, 0), line=True):
    """Hyperion 'H': two forward-leaning pillars cut by a horizon line."""
    s = size / 100.0
    im = Image.new("RGBA", (size, size), bg)
    d = ImageDraw.Draw(im)
    P = lambda pts: [(x * s, y * s) for x, y in pts]
    d.polygon(P([(20, 84), (33, 84), (45, 16), (32, 16)]), fill=fg)
    d.polygon(P([(56, 84), (69, 84), (81, 16), (68, 16)]), fill=fg)
    if line:
        # the horizon: starts just inside the left pillar and runs out past the right one
        d.rectangle(P([(22, 48.8), (99, 51.4)]), fill=fg)
    return im


# ------------------------------------------------------------- arc lettering
def arc_text(img, text, center, radius, start_deg, fnt, fill, spacing=1.0, outward=True):
    """Draw text along a circle. start_deg = angle of first glyph (0 = +x, clockwise, image coords).
    outward=True: glyph tops point away from the centre (top arc). False: tops point inward and the
    text runs counter-clockwise, so it stays readable along the bottom arc."""
    cx, cy = center
    ang = math.radians(start_deg)
    step = 1 if outward else -1
    for ch in text:
        w = fnt.getlength(ch) * spacing
        a_mid = ang + step * (w / 2) / radius
        g = Image.new("RGBA", (int(fnt.size * 2), int(fnt.size * 2)), (0, 0, 0, 0))
        ImageDraw.Draw(g).text((g.width / 2, g.height / 2), ch, font=fnt, fill=fill, anchor="mm")
        rot = -math.degrees(a_mid) - 90 if outward else -math.degrees(a_mid) + 90
        g = g.rotate(rot, resample=Image.BICUBIC, expand=True)
        x = cx + radius * math.cos(a_mid)
        y = cy + radius * math.sin(a_mid)
        img.alpha_composite(g, (int(x - g.width / 2), int(y - g.height / 2)))
        ang += step * w / radius
    return img


def annulus_mask(size, center, r0, r1):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    cx, cy = center
    d.ellipse((cx - r1, cy - r1, cx + r1, cy + r1), fill=255)
    d.ellipse((cx - r0, cy - r0, cx + r0, cy + r0), fill=0)
    return m


def height_to_normal(h, strength=2.5):
    """Greyscale height (L) -> tangent-space normal map (RGB)."""
    h = h.filter(ImageFilter.GaussianBlur(1.2))
    w, ht = h.size
    px = h.load()
    out = Image.new("RGB", (w, ht))
    po = out.load()
    for y in range(ht):
        for x in range(w):
            dx = (px[min(x + 1, w - 1), y] - px[max(x - 1, 0), y]) / 255.0 * strength
            dy = (px[x, min(y + 1, ht - 1)] - px[x, max(y - 1, 0)] ) / 255.0 * strength
            nx, ny, nz = -dx, dy, 1.0
            l = math.sqrt(nx * nx + ny * ny + nz * nz)
            po[x, y] = (int((nx / l * 0.5 + 0.5) * 255), int((ny / l * 0.5 + 0.5) * 255), int((nz / l * 0.5 + 0.5) * 255))
    return out


FLAT = (128, 128, 255)

# ------------------------------------------------------------- tyre sidewall
TYRE_C, TYRE_R0, TYRE_R1 = (512, 510), 292, 396
TOP_TXT = "HYPERION"
BOT_TXT = "HC-R  ·  325/30 ZR21  ·  GEN.2"


def sidewall_letters(size, color):
    lay = Image.new("RGBA", size, (0, 0, 0, 0))
    f_big = font(54, 800, 125)
    f_sm = font(22, 600, 112)
    r_big = (TYRE_R0 + TYRE_R1) / 2 - 16
    # big name across the top, small spec across the bottom (reads outward like a real tyre)
    span = sum(f_big.getlength(c) * 1.18 for c in TOP_TXT) / r_big
    arc_text(lay, TOP_TXT, TYRE_C, r_big, -90 - math.degrees(span) / 2, f_big, color, 1.18)
    span2 = sum(f_sm.getlength(c) * 1.1 for c in BOT_TXT) / (r_big + 10)
    arc_text(lay, BOT_TXT, TYRE_C, r_big + 4, 90 + math.degrees(span2) / 2, f_sm, color, 1.1, outward=False)
    return lay


def tyre_diffuse(n):
    im = load(n).convert("RGBA")
    rubber = im.getpixel((TYRE_C[0], TYRE_C[1] - 270))
    rubber = (max(rubber[0], 14), max(rubber[1], 14), max(rubber[2], 14), 255)
    m = annulus_mask(im.size, TYRE_C, TYRE_R0, TYRE_R1)
    im.paste(Image.new("RGBA", im.size, rubber), (0, 0), m)
    im.alpha_composite(sidewall_letters(im.size, (34, 34, 34, 255)))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 736, 430, 1023), fill=rubber)  # tyre-maker logo plate
    save(im, n)


def tyre_normal(n):
    im = load(n).convert("RGBA")
    m = annulus_mask(im.size, TYRE_C, TYRE_R0 - 6, TYRE_R1 + 6)
    # bump from our own raised lettering inside the ring
    h = Image.new("L", im.size, 0)
    lay = sidewall_letters(im.size, (255, 255, 255, 255))
    h.paste(lay.split()[3], (0, 0))
    crop = (TYRE_C[0] - TYRE_R1 - 10, TYRE_C[1] - TYRE_R1 - 10, TYRE_C[0] + TYRE_R1 + 10, TYRE_C[1] + TYRE_R1 + 10)
    nrm = Image.new("RGB", im.size, FLAT)
    nrm.paste(height_to_normal(h.crop(crop), 3.0), crop[:2])
    im.paste(nrm.convert("RGBA"), (0, 0), m)
    ImageDraw.Draw(im).rectangle((0, 736, 430, 1023), fill=FLAT + (255,))
    save(im, n)


def ring_scrub(n, center, r0, r1, fill):
    im = load(n).convert("RGB")
    im.paste(Image.new("RGB", im.size, fill), (0, 0), annulus_mask(im.size, center, r0, r1))
    return im


# ------------------------------------------------------------- caliper script
def caliper(n_color, n_rough, n_normal):
    # vertical script panel on the caliper atlas (256px): x 208..250, y 40..252
    box = (206, 38, 252, 252)
    im = load(n_color).convert("RGB")
    orange = im.getpixel((200, 30))
    d = ImageDraw.Draw(im)
    d.rectangle(box, fill=orange)
    w, h = box[3] - box[1], box[2] - box[0]
    t = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((w / 2, h / 2 + 1), "HYPERION", font=font(30, 800, 125), fill=(16, 14, 12, 255), anchor="mm")
    t = t.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)  # matches original glyph orientation in UV space
    im.paste(t, box[:2], t)
    save(im, n_color)
    r = load(n_rough).convert("RGB")
    ImageDraw.Draw(r).rectangle(box, fill=r.getpixel((200, 30)))
    save(r, n_rough)
    nm = load(n_normal).convert("RGB")
    ImageDraw.Draw(nm).rectangle(box, fill=FLAT)
    save(nm, n_normal)


# ------------------------------------------------------------- rear banner
def rear_banner(n):
    im = load(n).convert("RGBA")
    W, H = im.size
    # banner occupies roughly y 680..960; turn its black lettering back to white, then letter our name.
    region = (20, 660, W - 20, 970)
    crop = im.crop(region)
    px = crop.load()
    for y in range(crop.height):
        row = [px[x, y][0] for x in range(crop.width)]
        lit = [i for i, v in enumerate(row) if v > 128]
        if len(lit) > 40:
            a, b = lit[0], lit[-1]
            for x in range(a, b + 1):
                px[x, y] = (255, 255, 255, 255)
    im.paste(crop, region[:2])
    # text, warped to follow the banner's arc
    tw, th = W - 140, 200
    t = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(t).text((tw / 2, th / 2), "HYPERION", font=font(112, 900, 125, italic=True), fill=255, anchor="mm")
    warped = Image.new("L", (tw, th + 80), 0)
    for x in range(tw):
        u = x / (tw - 1) - 0.5
        dy = int(-62 * (1 - (2 * u) ** 2))  # crown in the middle like the original banner
        warped.paste(t.crop((x, 0, x + 1, th)), (x, 40 + dy + 22))
    ox, oy = 70, 690
    black = Image.new("RGBA", warped.size, (0, 0, 0, 255))
    im.paste(black, (ox, oy), warped)
    save(im, n)


# ------------------------------------------------------------- decal sheets
def decal_sheet_small(n):
    im = load(n).convert("RGB")
    d = ImageDraw.Draw(im)
    bg = (31, 31, 33)
    for box in [(196, 0, 368, 62), (270, 128, 366, 172), (0, 174, 130, 322), (262, 228, 380, 322), (56, 414, 232, 438)]:
        d.rectangle(box, fill=bg)
    d.text((282, 18), "HYPERION", font=font(17, 800, 125), fill=(150, 150, 150), anchor="mm")
    d.text((282, 44), "GEN.2  ·  01 / 01", font=mono(12), fill=(130, 130, 130), anchor="mm")
    d.text((10, 186), "HYPERION", font=font(14, 800, 125), fill=(210, 210, 210))
    d.text((10, 210), "Designed by\nSumanth Richie", font=mono(11), fill=(190, 190, 190), spacing=3)
    d.text((10, 262), "ONE OF ONE", font=mono(11), fill=(170, 170, 170))
    mk = monogram(78, fg=(205, 205, 205, 255))
    im.paste(mk, (282, 236), mk)
    save(im, n)


def decal_sheet_big(n):
    im = load(n).convert("RGB")
    save(Image.new("RGB", im.size, (28, 28, 30)), n)


def fender_script(n):
    im = load(n).convert("RGB")
    d = ImageDraw.Draw(im)
    bg = im.getpixel((6, 330))
    d.rectangle((8, 322, 504, 410), fill=bg)
    d.text((256, 366), "HYPERION", font=font(58, 900, 125, italic=True), fill=(200, 200, 200), anchor="mm")
    save(im, n)


def hub_cap(n):
    im = load(n).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 132, 140), fill=(0, 0, 0, 255))
    mk = monogram(96)
    im.alpha_composite(mk, (16, 22))
    save(im, n)


def flat_normal(n):
    im = load(n).convert("RGB")
    save(Image.new("RGB", im.size, FLAT), n)


# ------------------------------------------------------------- screens
UI_BG = (6, 8, 12)
UI_FG = (226, 232, 240)
UI_DIM = (110, 120, 136)
UI_ION = (139, 108, 255)  # same UV-violet accent the website uses


def infotainment(n, car_png=None):
    im = load(n).convert("RGB")
    W, H = im.size
    out = Image.new("RGB", (W, H), (10, 10, 11))
    d = ImageDraw.Draw(out)
    # the portrait glass occupies the centre third of the atlas
    sx0, sx1 = int(W * 0.29), int(W * 0.84)
    d.rectangle((sx0, 0, sx1, H), fill=UI_BG)
    cx = (sx0 + sx1) // 2
    mk = monogram(34, fg=UI_FG + (255,))
    out.paste(mk, (cx - 17, 18), mk)
    d.text((cx, 66), "H Y P E R I O N", font=font(15, 700, 125), fill=UI_FG, anchor="mm")
    nav = ["DRIVE", "AERO", "CABIN", "SYSTEMS"]
    step = (sx1 - sx0 - 60) / len(nav)
    for i, t in enumerate(nav):
        x = sx0 + 30 + step * (i + 0.5)
        d.text((x, 104), t, font=mono(12, 500), fill=UI_FG if i == 0 else UI_DIM, anchor="mm")
    d.line((sx0 + 30 + step * 0.15, 116, sx0 + 30 + step * 0.85, 116), fill=UI_ION, width=2)
    if car_png and os.path.exists(car_png):
        car = Image.open(car_png).convert("L")
        car = car.crop((int(car.width * 0.08), int(car.height * 0.22), int(car.width * 0.95), int(car.height * 0.75)))
        tw = sx1 - sx0 - 40
        car = car.resize((tw, int(car.height * tw / car.width)))
        tint = Image.merge("RGB", [car.point(lambda v: int(v * 0.55)), car.point(lambda v: int(v * 0.48)), car.point(lambda v: min(255, int(v * 1.05)))])
        out.paste(tint, (sx0 + 20, 190), car.point(lambda v: min(255, int(v * 1.6))))
    d.text((sx0 + 30, 400), "MODE", font=mono(11), fill=UI_DIM)
    d.text((sx0 + 30, 418), "GRAND TOUR", font=font(26, 800, 118), fill=UI_FG)
    for i, (k, v) in enumerate([("BATTERY", "82%"), ("OIL", "104°C"), ("TYRES", "2.1 BAR")]):
        x = sx0 + 30 + i * ((sx1 - sx0 - 60) / 3)
        d.text((x, 478), k, font=mono(10), fill=UI_DIM)
        d.text((x, 494), v, font=mono(16, 600), fill=UI_FG)
    d.rounded_rectangle((sx0 + 30, 540, sx1 - 30, 572), radius=16, outline=(40, 44, 54), width=1)
    d.text((cx, 556), "21°   ·   CABIN AIR  AUTO   ·   20:49", font=mono(11), fill=UI_DIM, anchor="mm")
    save(out, n)


def dash_cluster(n):
    im = load(n).convert("RGB")
    d = ImageDraw.Draw(im)
    bar = im.getpixel((300, 196))
    d.rectangle((238, 182, 276, 216), fill=bar)
    mk = monogram(30, fg=(225, 228, 235, 255))
    im.paste(mk, (242, 184), mk)
    save(im, n)


if __name__ == "__main__":
    car_png = os.environ.get("CAR_PNG", os.path.join(ROOT, ".work/test_side.png"))
    tyre_diffuse(57)
    tyre_normal(58)
    save(ring_scrub(33, (512, 446), 300, 430, (8, 8, 8)), 33)
    save(ring_scrub(37, (278, 283), 160, 232, FLAT), 37)
    caliper(34, 35, 36)
    flat_normal(39)
    rear_banner(63)
    decal_sheet_small(44)
    decal_sheet_big(59)
    fender_script(29)
    hub_cap(60)
    infotainment(14, car_png)
    dash_cluster(23)
