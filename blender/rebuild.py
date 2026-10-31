"""HYPERION GEN.2 — rebuild the kitbash into a clean, rigged, debranded asset.

    SRC=.work/hyperion_decoded.glb OUT=.work/hyperion_gen2.blend python blender/rebuild.py
    (PREVIEW=1 also renders a colour-coded assembly check to .work/asm_*.png)

What it does
 1. imports the decoded source GLB and swaps in the debranded textures (.work/images_clean)
 2. deletes third-party badge meshes
 3. flattens the 300+ root hierarchy into world space
 4. replaces the odd front-left wheel with a mirror of the front-right one, so all four match
 5. sorts every mesh into named assemblies with real pivots (door hinges, clam hinge, wheel hubs)
 6. adds the procedural powertrain (blender/powertrain.py)
 7. upgrades key materials (paint clearcoat, glass transmission, rubber, metal)
 8. saves a .blend that the export / render scripts consume
"""
import os, sys, math
import bpy, bmesh, mathutils
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import hy_studio as S

CLEAN = os.path.join(ROOT, ".work/images_clean")

# Wheel hub centres (Blender Z-up, +X forward, +Y = car's left)
HUBS = {
    "FL": Vector((1.282, 0.86, 0.362)),
    "FR": Vector((1.282, -0.86, 0.362)),
    "RL": Vector((-1.412, 0.83, 0.38)),
    "RR": Vector((-1.412, -0.83, 0.38)),
}
CALIPER_MATS = ("Material.001", "AttackMI_Change_Brake1.004", "Material.106")


def bbox(o):
    return S.world_bounds([o])


def mats(o):
    return [s.material.name for s in o.material_slots if s.material]


def chain(o):
    out, p = [], o.parent
    while p:
        out.append(p.name)
        p = p.parent
    return out


# ------------------------------------------------------------------ 1. import
def import_and_clean():
    S.reset()
    bpy.ops.import_scene.gltf(filepath=os.environ["SRC"])
    # debranded textures: same import order as blender/export_images.py, so index == file name
    imgs = [im for im in bpy.data.images if im.size[0] > 0]
    swapped = 0
    for i, im in enumerate(list(bpy.data.images)):
        p = os.path.join(CLEAN, f"{i:02d}.png")
        if os.path.exists(p):
            # packed images ignore filepath changes, so load the clean file and remap every user to it
            new = bpy.data.images.load(p)
            new.colorspace_settings.name = im.colorspace_settings.name
            new.alpha_mode = im.alpha_mode
            new.pack()
            nm = im.name
            im.user_remap(new)
            bpy.data.images.remove(im)
            new.name = nm
            swapped += 1
    print("[rebuild] swapped textures:", swapped)
    # remember original parent chains before flattening (names carry intent: SK_Door_FL, ...)
    for o in bpy.context.scene.objects:
        o["src_chain"] = " ".join(chain(o))
    # delete badge / logo meshes
    kill = []
    for o in bpy.context.scene.objects:
        tag = (o.name + " " + " ".join(mats(o) if o.type == "MESH" else [])).lower()
        if o.type == "MESH" and any(k in tag for k in ("badge", "logo", "chassisbadge")):
            kill.append(o)
    for o in kill:
        bpy.data.objects.remove(o, do_unlink=True)
    print("[rebuild] removed brand meshes:", len(kill))


# ------------------------------------------------------------------ 2. flatten
def flatten():
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    # single-user mesh data so we can apply transforms safely
    for o in bpy.context.scene.objects:
        if o.data.users > 1:
            o.data = o.data.copy()
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = bpy.context.scene.objects[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    print("[rebuild] meshes:", len(bpy.context.scene.objects))


# ------------------------------------------------------------------ 3. wheels
def in_wheel(o, hub, side_sign):
    mn, mx = bbox(o)
    c, s = (mn + mx) / 2, mx - mn
    return (abs(c.x - hub.x) < 0.42 and abs(c.z - hub.z) < 0.42 and c.y * side_sign > 0.5
            and abs(c.y) < 1.12 and max(s) < 0.8)


def fix_front_left_wheel():
    fl = [o for o in bpy.context.scene.objects if in_wheel(o, HUBS["FL"], +1)]
    fr = [o for o in bpy.context.scene.objects if in_wheel(o, HUBS["FR"], -1)]
    print("[rebuild] FL parts removed:", sorted(o.name for o in fl))
    print("[rebuild] FR parts mirrored:", sorted(o.name for o in fr))
    for o in fl:
        bpy.data.objects.remove(o, do_unlink=True)
    mirror = Matrix.Scale(-1, 4, Vector((0, 1, 0)))
    bpy.ops.object.select_all(action="DESELECT")
    new = []
    for o in fr:
        d = o.copy()
        d.data = o.data.copy()
        d.name = o.name + "_mirFL"
        bpy.context.scene.collection.objects.link(d)
        d.matrix_world = mirror @ d.matrix_world
        new.append(d)
    for d in new:
        d.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # negative-scale apply flips winding; make sure normals face out again
    for d in new:
        me = d.data
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:]) if os.environ.get("FLIP_MIRROR") else None
        bm.to_mesh(me)
        bm.free()


# ------------------------------------------------------------------ 4. classify
def classify(o):
    n = o.name
    src = o.get("src_chain", "")
    mn, mx = bbox(o)
    c, s = (mn + mx) / 2, mx - mn
    m = mats(o)
    # wheels first (tight zones)
    for k, hub in HUBS.items():
        if in_wheel(o, hub, 1 if k[1] == "L" else -1):
            fixed = any(x in CALIPER_MATS for x in m)
            return f"Wheel_{k}" + ("_Brake" if fixed else "")
    if n.startswith("Light_") or "SM_Light" in src or n.startswith("SM_Light"):
        return "Lights_Front" if c.x > 0 else "Lights_Rear"
    doorish = n.startswith("Door_") or "SK_Door" in src or "SideMirror" in src
    if doorish and abs(c.y) > 0.45:
        return "Door_L" if c.y > 0 else "Door_R"
    if "Material.085" in m and s.x > 2.0:  # windscreen + rear glass, one merged mesh
        return "Canopy"
    if n.startswith("Cockpit_") or "jeskf_seat" in src or "jeskf_dashboard" in src or "SM_Cabin" in src:
        return "Interior"
    if n == "EngineCover_Rear" or "SK_Spoiler" in src or "SK_Trunk" in src:
        return "RearClam"
    if "SK_Roof" in src or "SM_Roof" in src or (c.z > 0.95 and abs(c.x) < 0.75):
        return "Canopy"
    if c.x > 1.62 and s.x < 1.0:
        return "Nose"
    if "SK_Hood" in src or "SM_Fender" in src or (c.x > 0.85 and c.z > 0.45):
        return "FrontDeck"
    if c.x < -1.72 and s.x < 0.9:
        return "Tail"
    if "SK_Exhaust" in src or "SM_Bumper_B" in src:
        return "Tail"
    if "SM_Bumper_F" in src:
        return "Nose"
    if abs(c.y) < 0.62 and -0.75 < c.x < 1.05 and 0.18 < c.z < 1.0 and max(s.x, s.y) < 1.4:
        return "Interior"
    if c.x < -0.45 and c.z > 0.62:
        return "RearClam"
    return "Chassis"


ASM_COLORS = {
    "Chassis": (0.25, 0.25, 0.25), "Nose": (1, 0.2, 0.1), "FrontDeck": (1, 0.6, 0), "Canopy": (0.2, 0.6, 1),
    "Door_L": (0.1, 1, 0.3), "Door_R": (0.1, 0.8, 0.8), "RearClam": (0.8, 0.2, 1), "Tail": (1, 0.2, 0.6),
    "Interior": (1, 1, 0.2), "Lights_Front": (1, 1, 1), "Lights_Rear": (1, 0, 0), "Powertrain": (0.6, 0.4, 0.2),
}


def assemble():
    groups = {}
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            continue
        g = classify(o)
        groups.setdefault(g, []).append(o)
    for g, objs in sorted(groups.items()):
        print(f"[rebuild] {g:18s} {len(objs):3d} meshes")
    return groups


def preview(groups, out_dir):
    for g, objs in groups.items():
        base = g.split("_Brake")[0]
        col = ASM_COLORS.get(base, (0.0, 0.9, 1.0) if base.startswith("Wheel") else (1, 0, 1))
        mat = bpy.data.materials.new("PV_" + g)
        mat.use_nodes = True
        b = mat.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*col, 1)
        b.inputs["Roughness"].default_value = 0.6
        for o in objs:
            for sl in o.material_slots:
                sl.material = mat
    S.studio(); S.strip_rig()
    S.cycles(samples=8, w=640, h=360)
    for k, (loc, tgt) in {"34": ((6.2, 4.2, 2.6), (0, 0, 0.5)), "rear": ((-6.0, -4.0, 2.8), (0, 0, 0.5)),
                          "top": ((0.01, 0, 9), (0, 0, 0))}.items():
        S.render(S.add_camera("pv" + k, loc, tgt, 50), f"{out_dir}/asm_{k}.png")


# ------------------------------------------------------------------ 5. rig
def gl(v):
    """Blender (x, y, z) -> glTF / three.js (x, z, -y)."""
    return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]


# explode offsets (Blender metres) tuned on the 3/4 front-left view used by the site
EXPLODE = {
    "Chassis": (0, 0, 0), "Nose": (0.62, 0, 0.0), "Lights_Front": (0.86, 0, 0.1), "FrontDeck": (0.28, 0, 0.62),
    "Canopy": (0.0, 0, 1.0), "Door_L": (0.05, 0.72, 0.28), "Door_R": (0.05, -0.72, 0.28), "Interior": (0.08, 0, 0.4),
    "RearClam": (-0.3, 0, 0.95), "Tail": (-0.62, 0, 0.0), "Lights_Rear": (-0.86, 0, 0.1),
    "Wheel_FL": (0.0, 0.72, 0), "Wheel_FR": (0.0, -0.72, 0), "Wheel_RL": (0.0, 0.72, 0), "Wheel_RR": (0.0, -0.72, 0),
    "Brake_FL": (0.0, 0.36, 0), "Brake_FR": (0.0, -0.36, 0), "Brake_RL": (0.0, 0.36, 0), "Brake_RR": (0.0, -0.36, 0),
    "Powertrain": (0, 0, 0.3),
}
PT_EXPLODE = {
    "Block": (0, 0, 0), "Timing": (0.16, 0, 0), "Head_L": (0, 0.09, 0.09), "Head_R": (0, -0.09, 0.09),
    "CamCover_L": (0, 0.17, 0.2), "CamCover_R": (0, -0.17, 0.2), "Plenum": (0, 0, 0.42), "Runners": (0, 0, 0.22),
    "Headers_L": (0, 0.2, -0.04), "Headers_R": (0, -0.2, -0.04), "Turbo_L": (-0.05, 0.36, 0.12), "Turbo_R": (-0.05, -0.36, 0.12),
    "Intercooler_L": (0.05, 0.5, 0.05), "Intercooler_R": (0.05, -0.5, 0.05), "ChargePipes_L": (0, 0.3, 0.3),
    "ChargePipes_R": (0, -0.3, 0.3), "Transaxle": (-0.3, 0, 0), "Driveshafts": (-0.3, 0, 0), "Suspension": (-0.3, 0, -0.08),
    "OilTank": (0.12, 0.22, 0.1), "Exhaust": (-0.55, 0, 0.18), "HeatShield": (0.28, 0, 0.1),
}
LABELS = {
    "Chassis": ("Carbon monocoque", "Tub, floor and sills — the fixed point everything else hangs on"),
    "Nose": ("Front clip", "Splitter, crash structure, brake ducts"),
    "Lights_Front": ("Light signature", "Twin-blade DRL over a full-width beam"),
    "FrontDeck": ("Front deck", "Bonnet and wings, one carbon pressing"),
    "Canopy": ("Canopy", "Roof, A-pillars and the glass house"),
    "Door_L": ("Door · left", "Dihedral hinge, opens up and forward"),
    "Door_R": ("Door · right", "Dihedral hinge, opens up and forward"),
    "Interior": ("Cockpit", "Fixed-back seats, floating dash, portrait display"),
    "RearClam": ("Rear clam + wing", "Single-piece engine cover with active rear wing"),
    "Tail": ("Tail + diffuser", "Diffuser strakes, centre exhaust exit"),
    "Lights_Rear": ("Tail lamp", "Full-width light blade"),
    "Wheel_FL": ("Wheel · front", "Forged centre-lock, 325-section tyre"),
    "Wheel_FR": ("Wheel · front", "Forged centre-lock, 325-section tyre"),
    "Wheel_RL": ("Wheel · rear", "Forged centre-lock, 325-section tyre"),
    "Wheel_RR": ("Wheel · rear", "Forged centre-lock, 325-section tyre"),
    "Brake_FL": ("Carbon-ceramic brake", "Drilled disc, monobloc caliper"),
    "Brake_FR": ("Carbon-ceramic brake", "Drilled disc, monobloc caliper"),
    "Brake_RL": ("Carbon-ceramic brake", "Drilled disc, monobloc caliper"),
    "Brake_RR": ("Carbon-ceramic brake", "Drilled disc, monobloc caliper"),
    "Powertrain": ("HC-8 powertrain", "4.0 L twin-turbo flat-plane V8 + 7-speed transaxle"),
}


def empty(name, loc, parent=None, **props):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    e.empty_display_size = 0.1
    COL = bpy.context.scene.collection
    COL.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
        e.matrix_parent_inverse = parent.matrix_world.inverted()
    for k, v in props.items():
        e[k] = v
    bpy.context.view_layer.update()  # parent matrices must be current before anything is adopted
    return e


def adopt(child, parent):
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = Matrix.Identity(4)
    child.matrix_basis = parent.matrix_world.inverted() @ mw


def rig(groups, pt_parts):
    import powertrain as P
    root = empty("Hyperion", (0, 0, 0), hy_role="root")
    made = {}

    def asm(name, pivot, members, **extra):
        clash = bpy.data.objects.get(name)
        if clash:
            clash.name = name + "_mesh"
        mn, mx = S.world_bounds(members) if members else (Vector(pivot), Vector(pivot))
        centre = (mn + mx) / 2
        lab = LABELS.get(name, (name, ""))
        e = empty(name, pivot, root, hy_asm=name, explode=gl(EXPLODE.get(name, (0, 0, 0))),
                  centre=gl(centre), label=lab[0], note=lab[1], **extra)
        for o in members:
            adopt(o, e)
        made[name] = e
        return e

    for g, objs in groups.items():
        if g.startswith("Wheel_"):
            k = g.split("_")[1]
            hub = HUBS[k]
            if g.endswith("_Brake"):
                asm(f"Brake_{k}", hub, objs)
            else:
                asm(f"Wheel_{k}", hub, objs, spin_axis=gl((0, 1, 0)))
            continue
        if g == "Door_L":
            asm(g, (0.70, 0.95, 0.46), objs, hinge_axis=gl(Vector((0.30, 0.18, 1.0)).normalized()), hinge_angle=-math.radians(82))
        elif g == "Door_R":
            asm(g, (0.70, -0.95, 0.46), objs, hinge_axis=gl(Vector((0.30, -0.18, 1.0)).normalized()), hinge_angle=math.radians(82))
        elif g == "RearClam":
            asm(g, (-0.42, 0, 1.02), objs, hinge_axis=gl((0, 1, 0)), hinge_angle=math.radians(38))
        else:
            mn, mx = S.world_bounds(objs)
            asm(g, (mn + mx) / 2, objs)

    pt_objs = list(pt_parts.values())
    mn, mx = S.world_bounds(pt_objs)
    pt = asm("Powertrain", (mn + mx) / 2, [])
    for k, o in pt_parts.items():
        lab = P.LABELS.get(k, (k, ""))
        omn, omx = S.world_bounds([o])
        sub = empty("PTA_" + k, (omn + omx) / 2, pt, hy_part=k, explode=gl(PT_EXPLODE.get(k, (0, 0, 0))),
                    centre=gl((omn + omx) / 2), label=lab[0], note=lab[1])
        adopt(o, sub)
        o.name = "PTM_" + k
    print("[rebuild] assemblies:", sorted(made))
    return root


# ------------------------------------------------------------------ 6. materials
FLAKE = os.path.join(HERE, "textures/flake_normal.png")


def upgrade_materials():
    def principled(m):
        return next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)

    def unlink(m, sock):
        for l in list(sock.links):
            m.node_tree.links.remove(l)

    for name in ("Material.092", "Material.123"):
        m = bpy.data.materials.get(name)
        if not m:
            continue
        b = principled(m)
        nt = m.node_tree
        for k in ("Base Color", "Metallic", "Roughness", "Coat Weight", "Coat Roughness", "Normal"):
            unlink(m, b.inputs[k])
        b.inputs["Base Color"].default_value = (0.30, 0.205, 0.13, 1)   # Hyperion Bronze
        b.inputs["Metallic"].default_value = 0.88
        b.inputs["Roughness"].default_value = 0.36
        b.inputs["Coat Weight"].default_value = 1.0
        b.inputs["Coat Roughness"].default_value = 0.03
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (36, 36, 1)
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(FLAKE, check_existing=True)
        t.image.colorspace_settings.name = "Non-Color"
        t.image.pack()
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.18
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
        m.name = "Paint_Bronze" if name == "Material.092" else "Paint_Bronze_Deck"
    for name in ("Material.002", "Material.107"):
        m = bpy.data.materials.get(name)
        if m:
            b = principled(m)
            unlink(m, b.inputs["Metallic"]); b.inputs["Metallic"].default_value = 0.0
            unlink(m, b.inputs["Roughness"]); b.inputs["Roughness"].default_value = 0.62
            b.inputs["Specular IOR Level"].default_value = 0.32
            m.name = "Tyre_Rubber"
    m = bpy.data.materials.get("Material.117")
    if m:
        b = principled(m)
        unlink(m, b.inputs["Roughness"]); b.inputs["Roughness"].default_value = 0.3
        b.inputs["Coat Weight"].default_value = 1.0; b.inputs["Coat Roughness"].default_value = 0.04
        m.name = "Paint_Bone"
    for name in ("Material.085", "Material.094"):
        m = bpy.data.materials.get(name)
        if m:
            m.name = "Glass_" + name.split(".")[1]
    renames = {"Material.087": "Gloss_Black", "Material.080": "Screen_Infotainment", "Material.090": "Screen_Console",
               "Material.109": "Screen_Cluster", "Material.003": "Rim_Forged"}
    for a, b2 in renames.items():
        if bpy.data.materials.get(a):
            bpy.data.materials[a].name = b2


# ------------------------------------------------------------------ 7. export
def export(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_extras=True, export_apply=True, export_yup=True,
        export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="AUTO",
        export_draco_mesh_compression_enable=False, export_lights=False, export_cameras=False, use_selection=False)
    print("[rebuild] exported", path)


if __name__ == "__main__":
    import_and_clean()
    flatten()
    fix_front_left_wheel()
    groups = assemble()
    if os.environ.get("PREVIEW"):
        preview(groups, os.path.join(ROOT, ".work"))
        raise SystemExit
    import powertrain as P
    pt_parts = P.build()
    rig(groups, pt_parts)
    upgrade_materials()
    out_blend = os.environ.get("OUT", os.path.join(ROOT, ".work/hyperion_gen2.blend"))
    bpy.ops.wm.save_as_mainfile(filepath=out_blend, compress=True)
    print("[rebuild] saved", out_blend)
    export(os.environ.get("GLB", os.path.join(ROOT, ".work/hyperion_gen2_raw.glb")))
