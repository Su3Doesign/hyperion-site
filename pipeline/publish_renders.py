"""Cycles PNG masters -> WebP sizes for the apps (800 / 1600 / 2400 wide, never upscaled past source).

    python3 pipeline/publish_renders.py [--draft]   (--draft fills missing finals from .work/stills_lo)
    python3 pipeline/publish_renders.py --f1 [names]  (F1 study: .work/f1/stills -> renders/f1)
"""
import os, sys, glob, shutil
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FINAL = os.path.join(ROOT, ".work/stills")
DRAFT = os.path.join(ROOT, ".work/stills_lo")
TARGETS = [os.path.join(ROOT, "apps/hyperion/public/renders/hyperion"), os.path.join(ROOT, "apps/teardown/public/renders")]
NAMES = ["hero", "hero_tall", "side", "rear_open", "front", "wheel", "light", "cockpit", "engine", "exploded", "top", "tail_night"]


def main(draft):
    for t in TARGETS:
        os.makedirs(t, exist_ok=True)
    for n in NAMES:
        src = os.path.join(FINAL, n + ".png")
        if not os.path.exists(src):
            if not draft:
                print("missing", n); continue
            src = os.path.join(DRAFT, n + ".png")
            if not os.path.exists(src):
                print("missing draft", n); continue
        im = Image.open(src).convert("RGB")
        for w in (800, 1600, 2400):
            ww = min(w, im.width) if w != 800 else min(800, im.width)
            out = im.resize((ww, round(im.height * ww / im.width)), Image.LANCZOS) if ww != im.width else im
            if ww < im.width:
                out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=40, threshold=2))
            for t in TARGETS:
                out.save(os.path.join(t, f"{n}-{w}.webp"), "WEBP", quality=84, method=6)
        print("published", n, im.size, "(draft)" if src.startswith(DRAFT) else "")


if __name__ == "__main__":
    if "--f1" in sys.argv:
        FINAL = os.path.join(ROOT, ".work/f1/stills")
        TARGETS = [os.path.join(ROOT, "apps/hyperion/public/renders/f1")]
        pick = [a for a in sys.argv[1:] if not a.startswith("--")]
        NAMES = pick or ["hero", "hero_tall", "side", "front", "wheel", "nose", "cockpit", "rear", "engine", "exploded", "top"]
    main("--draft" in sys.argv)
