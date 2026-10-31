"""Cycles stills for the site + case study (dark studio, reproducible).

    BLEND=.work/hyperion_gen2.blend OUT=renders SCALE=1 SPP=96 ONLY=hero,side python blender/render_stills.py

SCALE multiplies resolution (0.4 for a quick composition check). Each shot sets its own pose and lights.
"""
import os, sys, math, time
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S, pose as P

SCALE = float(os.environ.get("SCALE", 1))
SPP = int(os.environ.get("SPP", 96))
OUT = os.environ.get("OUT", "renders")
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])


def dark_studio():
    floor = S.studio(floor_color=(0.006, 0.0058, 0.0055), world_strength=0.0)
    b = floor.data.materials[0].node_tree.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Specular IOR Level"].default_value = 0.28
    rig = {}
    # long overhead softbox + two thin strips: the lines that describe the bodywork
    rig["top"] = S.area_light("Top", (0.0, 0, 4.6), (0, 0, 0), 5.0, 1.2, 380, (1.0, 0.95, 0.9))
    rig["stripL"] = S.area_light("StripL", (0.2, 4.2, 2.2), (0, 0, 0.55), 7.0, 0.12, 380, (0.92, 0.95, 1.0))
    rig["stripR"] = S.area_light("StripR", (0.2, -4.2, 2.2), (0, 0, 0.55), 7.0, 0.12, 380, (0.92, 0.95, 1.0))
    rig["rim"] = S.area_light("Rim", (-5.2, 0.8, 2.0), (0, 0, 0.6), 0.3, 3.0, 420, (1.0, 0.86, 0.72))
    rig["kick"] = S.area_light("Kick", (4.8, 3.2, 0.4), (0, 0, 0.4), 3.0, 0.1, 90, (0.9, 0.92, 1.0))
    for l in rig.values():
        l.data.cycles.is_caustics_light = False
    return rig


def lights_on(head=0.0, tail=0.0, screens=0.0):
    """Emission on the light meshes + cockpit screens (same names the site drives)."""
    def emit(mat, color, strength):
        if not mat or not mat.node_tree:
            return
        b = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b:
            b.inputs["Emission Color"].default_value = (*color, 1)
            b.inputs["Emission Strength"].default_value = strength
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        n = o.name
        for sl in o.material_slots:
            m = sl.material
            if n.startswith("Light_Headlight") or (o.parent and o.parent.name == "Lights_Front" and "Light" in (m.name if m else "")):
                emit(m, (1.0, 0.96, 0.9), 30 * head)
            elif n in ("Light_Tail",) or n.startswith("Light_Tail_Ind"):
                emit(m, (1.0, 0.05, 0.04) if n == "Light_Tail" else (1.0, 0.5, 0.05), 40 * tail)
    for name in ("Screen_Infotainment", "Screen_Console", "Screen_Cluster"):
        m = bpy.data.materials.get(name)
        if m and screens:
            b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            src = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].is_linked else None
            if src:
                m.node_tree.links.new(src, b.inputs["Emission Color"])
            b.inputs["Emission Strength"].default_value = 2.0 * screens


SHOTS = {
    # name: (w, h, cam_loc, target, lens, pose kwargs, light kwargs, rig scale)
    "hero":      (1920, 1080, (5.3, 3.9, 1.05), (0.1, 0, 0.52), 50, {}, dict(head=0.5, tail=0.3), 1.0),
    "hero_tall": (1080, 1600, (5.0, 4.4, 1.45), (0.0, 0, 0.75), 45, {}, dict(head=0.5, tail=0.3), 1.0),
    "side":      (2400, 1000, (0.0, 9.6, 0.75), (0.0, 0, 0.55), 70, {}, dict(head=0.4, tail=0.3), 1.0),
    "rear_open": (1920, 1080, (-5.6, 4.0, 2.6), (-0.7, 0, 0.6), 45, dict(doors=1.0, clam=1.0), dict(tail=0.8), 1.0),
    "front":     (1600, 1200, (5.8, 0.0, 0.85), (0, 0, 0.5), 60, {}, dict(head=1.0), 0.8),
    "wheel":     (1600, 1200, (2.6, 2.7, 0.55), (1.28, 0.9, 0.38), 85, {}, {}, 1.0),
    "light":     (1600, 1200, (3.4, 1.6, 0.75), (1.75, 0.55, 0.6), 100, {}, dict(head=1.0), 0.45),
    "cockpit":   (1600, 1200, (0.95, 1.95, 1.12), (0.42, 0.0, 0.72), 28, dict(doors=1.0), dict(screens=1.0), 1.0),
    "engine":    (1600, 1200, (-3.1, 1.0, 2.35), (-1.0, 0.0, 0.6), 42, dict(clam=1.0), {}, 1.0),
    "exploded":  (2400, 1350, (6.0, 5.2, 3.4), (-0.15, 0, 0.8), 40, dict(explode=1.0), dict(head=0.4), 1.0),
    "top":       (1600, 2400, (0.0, 0.0, 10.5), (0.0, 0.0, 0.0), 50, {}, {}, 1.0),
    "tail_night":(1920, 1080, (-6.4, -3.2, 1.0), (-0.3, 0, 0.55), 55, {}, dict(tail=1.2, head=0.2), 0.18),
}

if __name__ == "__main__":
    rig = dark_studio()
    base_energy = {k: l.data.energy for k, l in rig.items()}
    for name, (w, h, loc, tgt, lens, pose_kw, light_kw, rig_scale) in SHOTS.items():
        if ONLY and name not in ONLY:
            continue
        t = time.time()
        P.pose(**{"doors": 0, "clam": 0, "explode": 0, **pose_kw})
        lights_on(**{"head": 0, "tail": 0, "screens": 0, **light_kw})
        for k, l in rig.items():
            l.data.energy = base_energy[k] * rig_scale
        S.cycles(samples=SPP, w=int(w * SCALE), h=int(h * SCALE))
        sc = bpy.context.scene
        sc.view_settings.look = "AgX - Punchy" if name == "tail_night" else "AgX - Medium High Contrast"
        cam = S.add_camera("cam_" + name, loc, tgt, lens)
        if name == "top":
            cam.rotation_euler = (0, 0, math.radians(90))
        cam.data.dof.use_dof = name in ("wheel", "light", "cockpit", "engine")
        cam.data.dof.focus_distance = (Vector(loc) - Vector(tgt)).length
        cam.data.dof.aperture_fstop = 2.8
        S.render(cam, os.path.join(OUT, f"{name}.png"))
        print(f"[stills] {name} {int(w*SCALE)}x{int(h*SCALE)} {time.time()-t:.0f}s", flush=True)
