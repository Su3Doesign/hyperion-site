"""Cycles stills of the rigged F1 car (dark studio, same rig and AgX look as the Hyperion stills).

    BLEND=.work/f1/f1_rig.blend OUT=.work/f1/stills SCALE=1 SPP=64 ONLY=hero,side python blender/f1_stills.py
"""
import os, sys, math, time
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S, pose as P

SCALE = float(os.environ.get("SCALE", 1))
SPP = int(os.environ.get("SPP", 64))
OUT = os.environ.get("OUT", ".work/f1/stills")
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])


def dark_studio():
    floor = S.studio(floor_color=(0.006, 0.0058, 0.0055), world_strength=0.0)
    b = floor.data.materials[0].node_tree.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Specular IOR Level"].default_value = 0.28
    rig = {
        "top": S.area_light("Top", (0.0, 0, 4.4), (0, 0, 0), 5.6, 1.2, 380, (1.0, 0.95, 0.9)),
        "stripL": S.area_light("StripL", (0.2, 4.2, 2.0), (0, 0, 0.45), 7.5, 0.12, 380, (0.92, 0.95, 1.0)),
        "stripR": S.area_light("StripR", (0.2, -4.2, 2.0), (0, 0, 0.45), 7.5, 0.12, 380, (0.92, 0.95, 1.0)),
        "rim": S.area_light("Rim", (-5.6, 0.8, 1.8), (0, 0, 0.5), 0.3, 3.0, 420, (1.0, 0.86, 0.72)),
        "kick": S.area_light("Kick", (5.2, 3.2, 0.35), (0, 0, 0.35), 3.0, 0.1, 90, (0.9, 0.92, 1.0)),
    }
    return rig


def hide_asm(names, hidden):
    for n in names:
        e = bpy.data.objects.get(n)
        if not e:
            continue
        for c in e.children_recursive:
            c.hide_render = hidden


SHOTS = {
    "hero":      (1920, 1080, (6.0, 4.4, 1.0), (0.15, 0, 0.36), 45, {}, [], 1.0),
    "hero_tall": (1080, 1600, (5.6, 4.9, 1.35), (0.0, 0, 0.6), 40, {}, [], 1.0),
    "side":      (2400, 1000, (0.0, 10.4, 0.6), (0.0, 0, 0.42), 60, {}, [], 1.0),
    "front":     (1600, 1200, (6.6, 0.0, 0.62), (0, 0, 0.45), 70, {}, [], 0.85),
    "wheel":     (1600, 1200, (2.7, 2.7, 0.46), (1.51, 0.9, 0.36), 85, dict(doors=1.0), [], 1.0),
    "nose":      (1600, 1200, (4.5, 1.9, 0.95), (2.2, 0.2, 0.3), 55, {}, [], 1.0),
    "cockpit":   (1600, 1200, (1.0, 1.35, 2.45), (-0.15, 0, 0.75), 35, {}, [], 1.0),
    "rear":      (1920, 1080, (-5.7, -3.0, 1.9), (-2.3, 0, 0.75), 50, dict(clam=1.0), [], 1.0),
    "engine":    (1600, 1200, (-3.3, 2.3, 2.6), (-1.35, 0, 0.42), 40, {}, ["EngineCover", "Sidepods"], 1.0),
    "exploded":  (2400, 1350, (7.0, 6.0, 4.0), (-0.1, 0, 0.6), 40, dict(explode=1.0), [], 1.0),
    "top":       (1600, 2400, (0.0, 0.0, 11.5), (0.0, 0.0, 0.0), 45, {}, [], 1.0),
}

if __name__ == "__main__":
    rig = dark_studio()
    base = {k: l.data.energy for k, l in rig.items()}
    for name, (w, h, loc, tgt, lens, pose_kw, hide, rs) in SHOTS.items():
        if ONLY and name not in ONLY:
            continue
        t = time.time()
        P.pose(**{"doors": 0, "clam": 0, "explode": 0, **pose_kw})
        hide_asm(["EngineCover", "Sidepods"], False)
        hide_asm(hide, True)
        for k, l in rig.items():
            l.data.energy = base[k] * rs
        S.cycles(samples=SPP, w=int(w * SCALE), h=int(h * SCALE))
        cam = S.add_camera("cam_" + name, loc, tgt, lens)
        if name == "top":
            cam.rotation_euler = (0, 0, math.radians(90))
        cam.data.dof.use_dof = name in ("wheel", "nose")
        cam.data.dof.focus_distance = (Vector(loc) - Vector(tgt)).length
        cam.data.dof.aperture_fstop = 2.8
        S.render(cam, os.path.join(OUT, f"{name}.png"))
        print(f"[f1 stills] {name} {int(w*SCALE)}x{int(h*SCALE)} {time.time()-t:.0f}s", flush=True)
