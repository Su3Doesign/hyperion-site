"""Front badge for Hyperion: dark enamel with the bronze H monogram (fills the old shield cut-out).

    python3 pipeline/badge.py      -> .work/badge_front.png  (blender/rebuild.py maps it flat onto the badge)
"""
import os
from PIL import Image, ImageDraw, ImageFilter
from debrand import monogram, ROOT

N = 1024
im = Image.new("RGB", (N, N), (9, 9, 9))
d = ImageDraw.Draw(im)
# fine guilloche rings in the enamel, very low contrast
for r in range(40, N, 14):
    d.ellipse((N / 2 - r, N * 0.46 - r, N / 2 + r, N * 0.46 + r), outline=(21, 20, 18), width=2)
# the mark sits in the wide upper part of the shield
size = int(N * 0.7)
mk = monogram(size, fg=(214, 178, 132, 255))
glow = mk.split()[3].filter(ImageFilter.GaussianBlur(6))
im.paste((70, 56, 40), (int(N / 2 - size / 2), int(N * 0.40 - size / 2)), glow)
im.paste(mk, (int(N / 2 - size / 2), int(N * 0.40 - size / 2)), mk)
out = os.path.join(ROOT, ".work/badge_front.png")
im.save(out)
print("badge", out)

# metal/roughness map (glTF: G = roughness, B = metallic): matte enamel field, polished metal mark
mr = Image.new("RGB", (N, N), (0, 165, 0))
a = mk.split()[3]
mr.paste((0, 60, 255), (int(N / 2 - size / 2), int(N * 0.40 - size / 2)), a)
mr.save(os.path.join(ROOT, ".work/badge_front_mr.png"))
