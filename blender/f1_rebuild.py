"""F1 stage B: rig the baked car for the site.

    BLEND=.work/f1/f1_baked.blend INSPECT=.work/f1_inspect.txt OUT=.work/f1/f1_rig.blend GLB=.work/f1/f1_raw.glb \
        python blender/f1_rebuild.py          (PREVIEW=1 renders a colour-coded assembly check instead)

Sorts the 210 CAD parts into named assemblies with pivots, explode vectors and labels (the same node
extras the site and blender/pose.py read), adds steering (front wheels, driven by `doors`) and the
DRS flap (driven by `clam`), builds the V6 hybrid power unit, then exports a GLB.
"""
import os, sys, math, re
import bpy
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hy_studio as S
import rebuild as R          # empty(), adopt(), gl(), export(), preview colours
import f1_powertrain as FP

bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
sc = bpy.context.scene

# original (pre-bake) material per object, from the inspection log of the source file
SRCMAT = {}
for line in open(os.environ["INSPECT"]):
    m = re.match(r"OBJ MESH (\S+) .*mats=\[([^\]]*)\]", line)
    if m:
        SRCMAT[m.group(1)] = [x.strip(" '") for x in m.group(2).split(",") if x.strip()]

meshes = [o for o in sc.objects if o.type == "MESH"]


def bb(o):
    mn, mx = S.world_bounds([o])
    return (mn + mx) / 2, mx - mn


# wheel hubs from the rims (NAUO2..5 _000), and which corner each STEP group is
CORNER = {}
HUBS = {}
for o in meshes:
    m = re.match(r"NAUO([2-5])_000", o.name)
    if m:
        c, _ = bb(o)
        k = ("F" if c.x > 0 else "R") + ("L" if c.y > 0 else "R")
        CORNER[m.group(1)] = k
        HUBS[k] = c
print("[f1] hubs", {k: tuple(round(v, 3) for v in c) for k, c in HUBS.items()})
REAR_X = (HUBS["RL"].x + HUBS["RR"].x) / 2
FRONT_X = (HUBS["FL"].x + HUBS["FR"].x) / 2


def near_hub(c, s):
    for k, h in HUBS.items():
        if abs(c.x - h.x) < 0.34 and abs(c.z - h.z) < 0.34 and abs(c.y) > 0.5 and c.y * h.y > 0 and max(s) < 0.8:
            return k
    return None


def classify(o):
    n = o.name
    src = SRCMAT.get(n, [])
    c, s = bb(o)
    m = re.match(r"NAUO([2-5])_", n)
    if m:
        return "Wheel_" + CORNER[m.group(1)]
    if n.startswith("NAUO6_"):
        return "Cockpit"
    if n == "NAUO1_163":
        return "DRS"
    k = near_hub(c, s)
    if k:
        return "Brake_" + k
    if "F1Alpine_Floor" in src:
        return "Floor"
    if "F1Alpine_Mirror" in src:
        return "Mirrors"
    if "F1Alpine_FrontWing" in src or "F1Alpine_FWEndplate" in src or (c.x > FRONT_X + 0.55 and c.z < 0.42):
        return "FrontWing"
    if "F1Alpine_RearWing" in src or (c.x < REAR_X - 0.2 and c.z > 0.55):
        return "RearWing"
    if c.x > FRONT_X + 0.15 and c.z > 0.2 and abs(c.y) < 0.35:
        return "Nose"
    # wishbones / track rods: between the tub and a wheel
    for kk, h in HUBS.items():
        if abs(c.x - h.x) < 0.65 and 0.12 < abs(c.y) < 0.85 and c.y * h.y > 0 and c.z < 0.62 and max(s) < 0.9:
            return "Susp_" + kk[0]
    if c.z > 0.86 and -0.75 < c.x < 0.75 and max(s) < 1.1:
        return "Halo"
    if "F1Alpine_Body" in src and c.x < -0.1 and c.z > 0.5 and s.x > 0.6:
        return "EngineCover"
    if "F1Alpine_Body" in src and -1.6 < c.x < 0.9 and c.z < 0.62 and s.y > 0.7:
        return "Sidepods"
    if c.x < REAR_X + 0.35 and abs(c.y) < 0.4:
        return "RearStructure"
    return "Chassis"


groups = {}
for o in meshes:
    groups.setdefault(classify(o), []).append(o)
for g, objs in sorted(groups.items()):
    print(f"[f1] {g:16s} {len(objs):3d}")

if os.environ.get("PREVIEW"):
    pal = [(1, .2, .1), (1, .6, 0), (.2, .6, 1), (.1, 1, .3), (.1, .8, .8), (.8, .2, 1), (1, .2, .6), (1, 1, .2), (1, 1, 1),
           (.5, .3, .1), (.3, .3, .3), (0, .4, .2), (.6, .6, 1), (1, .5, .5), (.4, 1, .8), (.9, .9, .5)]
    for i, (g, objs) in enumerate(sorted(groups.items())):
        mat = bpy.data.materials.new("PV_" + g)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*pal[i % len(pal)], 1)
        b.inputs["Roughness"].default_value = 0.6
        for o in objs:
            for sl in o.material_slots:
                sl.material = mat
        print("[f1] colour", g, pal[i % len(pal)])
    S.studio(); S.strip_rig()
    S.cycles(samples=8, w=640, h=360)
    out = os.path.join(os.path.dirname(os.environ["OUT"]), "..")
    for k, (loc, tgt) in {"34": ((6.6, 4.8, 2.6), (0, 0, 0.4)), "rear": ((-6.4, -4.2, 2.8), (-0.4, 0, 0.4)),
                          "top": ((0.01, 0, 10.5), (0, 0, 0))}.items():
        S.render(S.add_camera("pv" + k, loc, tgt, 45), f"{out}/f1asm_{k}.png")
    raise SystemExit

# ------------------------------------------------------------------ rig
EXPLODE = {
    "Chassis": (0, 0, 0), "Floor": (0, 0, 0), "Nose": (0.7, 0, 0.06), "FrontWing": (1.05, 0, -0.02),
    "Halo": (0, 0, 0.72), "Cockpit": (0.12, 0, 0.48), "Mirrors": (0.05, 0, 0.62), "EngineCover": (-0.2, 0, 0.82),
    "Sidepods": (0, 0, 0.42), "RearWing": (-0.75, 0, 0.4), "DRS": (-0.85, 0, 0.72), "RearStructure": (-0.55, 0, 0),
    "Wheel_FL": (0, 0.78, 0), "Wheel_FR": (0, -0.78, 0), "Wheel_RL": (0, 0.78, 0), "Wheel_RR": (0, -0.78, 0),
    "Brake_FL": (0, 0.4, 0), "Brake_FR": (0, -0.4, 0), "Brake_RL": (0, 0.4, 0), "Brake_RR": (0, -0.4, 0),
    "Susp_F": (0, 0, 0.16), "Susp_R": (0, 0, 0.16), "Powertrain": (0, 0, 0.4),
}
PT_EXPLODE = {
    "Block": (0, 0, 0), "Head_L": (0, 0.07, 0.07), "Head_R": (0, -0.07, 0.07), "CamCover_L": (0, 0.14, 0.16),
    "CamCover_R": (0, -0.14, 0.16), "Compressor": (0.24, 0, 0.12), "MGUH": (0, 0, 0.3), "Turbine": (-0.22, 0, 0.16),
    "Plenum": (0, 0, 0.42), "Headers_L": (0, 0.18, -0.02), "Headers_R": (0, -0.18, -0.02), "Exhaust": (-0.45, 0, 0.12),
    "MGUK": (0.05, 0.28, -0.02), "EnergyStore": (0.32, 0, 0.04), "HVCables": (0.16, 0, 0.12), "ControlUnit": (0.1, -0.28, 0.05),
    "OilTank": (0.14, 0, 0.14), "Radiator_L": (0, 0.42, 0.05), "Radiator_R": (0, -0.42, 0.05), "Gearbox": (-0.36, 0, 0),
    "Driveshafts": (-0.36, 0, 0),
}
LABELS = {
    "Chassis": ("Survival cell", "Carbon monocoque the whole car hangs from"),
    "Floor": ("Floor", "Two venturi tunnels; most of the downforce"),
    "Nose": ("Nose", "Crash structure, tested to FIA impact loads"),
    "FrontWing": ("Front wing", "Multi-element, adjustable flap"),
    "Halo": ("Halo", "Titanium cockpit protection"),
    "Cockpit": ("Steering wheel", "Controls, shift lights and display"),
    "Mirrors": ("Mirrors", "On the sidepod wings"),
    "EngineCover": ("Engine cover", "Shark fin and cooling exits"),
    "Sidepods": ("Sidepods", "Radiator inlets and the undercut"),
    "RearWing": ("Rear wing", "Main plane and endplates"),
    "DRS": ("DRS flap", "Opens on straights to cut drag"),
    "RearStructure": ("Rear crash structure", "Gearbox fairing and rain light"),
    "Wheel_FL": ("Front wheel", "18-inch, Pirelli P Zero, aero cover"),
    "Wheel_FR": ("Front wheel", "18-inch, Pirelli P Zero, aero cover"),
    "Wheel_RL": ("Rear wheel", "18-inch, Pirelli P Zero, aero cover"),
    "Wheel_RR": ("Rear wheel", "18-inch, Pirelli P Zero, aero cover"),
    "Brake_FL": ("Front brake", "Carbon disc inside the drum"),
    "Brake_FR": ("Front brake", "Carbon disc inside the drum"),
    "Brake_RL": ("Rear brake", "Brake-by-wire with ERS recovery"),
    "Brake_RR": ("Rear brake", "Brake-by-wire with ERS recovery"),
    "Susp_F": ("Front suspension", "Carbon wishbones and pushrods"),
    "Susp_R": ("Rear suspension", "Carbon wishbones and pullrods"),
    "Powertrain": ("Power unit", "1.6 L V6 turbo hybrid + 8-speed gearbox"),
}

root = R.empty("Hyperion", (0, 0, 0), hy_role="root")
made = {}


def asm(name, pivot, members, **extra):
    clash = bpy.data.objects.get(name)
    if clash:
        clash.name = name + "_mesh"
    mn, mx = S.world_bounds(members) if members else (Vector(pivot), Vector(pivot))
    lab = LABELS.get(name, (name, ""))
    e = R.empty(name, pivot, root, hy_asm=name, explode=R.gl(EXPLODE.get(name, (0, 0, 0))),
                centre=R.gl((mn + mx) / 2), label=lab[0], note=lab[1], **extra)
    for o in members:
        R.adopt(o, e)
    made[name] = e
    return e


STEER = math.radians(16)
for g, objs in groups.items():
    mn, mx = S.world_bounds(objs)
    if g.startswith("Wheel_"):
        k = g.split("_")[1]
        extra = dict(spin_axis=R.gl((0, 1, 0)))
        if k[0] == "F":
            extra.update(hinge_axis=R.gl((0, 0, 1)), hinge_angle=STEER, hinge_drive="doors")
        asm(g, HUBS[k], objs, **extra)
    elif g.startswith("Brake_"):
        k = g.split("_")[1]
        extra = dict(hinge_axis=R.gl((0, 0, 1)), hinge_angle=STEER, hinge_drive="doors") if k[0] == "F" else {}
        asm(g, HUBS[k], objs, **extra)
    elif g == "DRS":
        # pivot on the flap's trailing edge; the leading edge rises to open the slot
        asm(g, (mn.x + 0.01, 0, mx.z - 0.01), objs, hinge_axis=R.gl((0, 1, 0)), hinge_angle=-math.radians(30), hinge_drive="clam")
    else:
        asm(g, (mn + mx) / 2, objs)

parts = FP.build(REAR_X, hub_y=abs(HUBS["RL"].y) - 0.12, hub_z=HUBS["RL"].z)
pmn, pmx = S.world_bounds(list(parts.values()))
pt = asm("Powertrain", (pmn + pmx) / 2, [])
for k, o in parts.items():
    lab = FP.LABELS.get(k, (k, ""))
    omn, omx = S.world_bounds([o])
    sub = R.empty("PTA_" + k, (omn + omx) / 2, pt, hy_part=k, explode=R.gl(PT_EXPLODE.get(k, (0, 0, 0))),
                  centre=R.gl((omn + omx) / 2), label=lab[0], note=lab[1])
    R.adopt(o, sub)
    o.name = "PTM_" + k
print("[f1] assemblies", sorted(made), "pt parts", len(parts))

bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
print("[f1] saved", os.environ["OUT"])
R.export(os.environ["GLB"])
