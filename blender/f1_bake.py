"""F1 stage A: make the procedural Alpine livery portable.

    BLEND=.work/f1/F1_Alpine_livery.blend OUT=.work/f1/f1_baked.blend BAKE=.work/f1/bake python blender/f1_bake.py

The source paints its livery with tri-planar projections driven by world position, and its meshes
have no UVs, so nothing of it survives a glTF export. This stage, in the ORIGINAL coordinates (the
projection depends on them):
 1. removes the stray NAUO7 objects
 2. decimates the CAD tessellation to a web budget (tyres were ~690k faces each)
 3. packs each bake group into one shared UV atlas (multi-object Smart UV Project)
 4. bakes base colour and roughness through the full shader (paint over carbon, Pirelli sidewalls)
 5. replaces the procedural materials with plain PBR materials that read the bakes
 6. turns the car to the site convention (+X forward, +Y left, floor at z = 0)
"""
import os, sys, math, time
import bpy, bmesh
from mathutils import Matrix, Vector

SRC, OUT, BAKE = os.environ["BLEND"], os.environ["OUT"], os.environ["BAKE"]
SIZE = int(os.environ.get("BAKE_SIZE", 4096))
os.makedirs(BAKE, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=SRC)
sc = bpy.context.scene
for o in [o for o in sc.objects if o.name.startswith("NAUO7_")]:
    bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in sc.objects if o.type == "MESH"]


def mats(o):
    return [s.material.name for s in o.material_slots if s.material]


# ------------------------------------------------------------------ 1. decimate
t = time.time()
before = sum(len(o.data.polygons) for o in meshes)
for o in meshes:
    if o.data.users > 1:
        o.data = o.data.copy()
    f = len(o.data.polygons)
    if "F1Alpine_Tyre" in mats(o):
        ratio = 0.045
    elif f > 60000:
        ratio = 0.16
    elif f > 15000:
        ratio = 0.22
    elif f > 3000:
        ratio = 0.35
    elif f > 800:
        ratio = 0.55
    else:
        continue
    m = o.modifiers.new("dec", "DECIMATE")
    m.decimate_type = "COLLAPSE"
    m.ratio = ratio
    m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)
after = sum(len(o.data.polygons) for o in meshes)
print(f"[bake] decimated {before:,} -> {after:,} faces in {time.time()-t:.0f}s", flush=True)

# smooth shading with crisp panel breaks
for o in meshes:
    for p in o.data.polygons:
        p.use_smooth = True
    if hasattr(o.data, "set_sharp_from_angle"):
        o.data.set_sharp_from_angle(angle=math.radians(38))

# ------------------------------------------------------------------ 2. bake groups
GROUPS = {
    "livery": (["F1Alpine_Body", "F1Alpine_Floor", "F1Alpine_FrontWing", "F1Alpine_FWEndplate", "F1Alpine_Mirror", "F1Alpine_RearWing"], SIZE),
    "carbon": (["F1_CarbonGloss"], SIZE),
    "tyre": (["F1Alpine_Tyre"], 2048),
    "cover": (["F1Alpine_WheelCover"], 1024),
}
owner = {}
for o in meshes:
    for g, (names, _) in GROUPS.items():
        if any(n in names for n in mats(o)):
            owner[o.name] = g
            break

sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 4
sc.cycles.use_denoising = False
sc.render.bake.margin = 4
sc.render.bake.margin_type = "EXTEND"
sc.render.bake.use_clear = True


def unwrap(objs):
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        if "bake" not in o.data.uv_layers:
            o.data.uv_layers.new(name="bake")
        o.data.uv_layers.active = o.data.uv_layers["bake"]
        o.data.uv_layers["bake"].active_render = True
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0015, area_weight=1.0,
                             correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.0015, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake(objs, group_mats, image, kind):
    for mname in group_mats:
        m = bpy.data.materials.get(mname)
        if not m:
            continue
        nt = m.node_tree
        node = nt.nodes.get("BAKE_TARGET") or nt.nodes.new("ShaderNodeTexImage")
        node.name = "BAKE_TARGET"
        node.image = image
        for n in nt.nodes:
            n.select = False
        node.select = True
        nt.nodes.active = node
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    t = time.time()
    if kind == "color":
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_clear=True, margin=4)
    else:
        bpy.ops.object.bake(type="ROUGHNESS", use_clear=True, margin=4)
    print(f"[bake]   {kind} {image.size[0]}px {time.time()-t:.0f}s", flush=True)


baked = {}
for g, (names, size) in GROUPS.items():
    objs = [o for o in meshes if owner.get(o.name) == g]
    if not objs:
        continue
    t = time.time()
    unwrap(objs)
    print(f"[bake] {g}: {len(objs)} objects unwrapped in {time.time()-t:.0f}s", flush=True)
    # every material any of these objects uses must point its bake node at this group's image
    used = sorted({n for o in objs for n in mats(o)})
    col = bpy.data.images.new(f"{g}_color", size, size, alpha=False)
    bake(objs, used, col, "color")
    col.filepath_raw = os.path.join(BAKE, f"{g}_color.png"); col.file_format = "PNG"; col.save()
    rough = bpy.data.images.new(f"{g}_rough", size, size, alpha=False, is_data=True)
    rough.colorspace_settings.name = "Non-Color"
    bake(objs, used, rough, "rough")
    rough.filepath_raw = os.path.join(BAKE, f"{g}_rough.png"); rough.file_format = "PNG"; rough.save()
    baked[g] = (objs, col, rough)

# ------------------------------------------------------------------ 3. web materials
CONST = {  # metallic, coat, coat roughness: the livery is lacquered paint over carbon
    "livery": (0.12, 1.0, 0.02), "carbon": (0.18, 1.0, 0.03), "tyre": (0.0, 0.0, 0.1), "cover": (0.0, 0.5, 0.15),
}


def pbr(name, color_img, rough_img, metal, coat, coat_r):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "bake"
    tc = nt.nodes.new("ShaderNodeTexImage"); tc.image = color_img
    tr = nt.nodes.new("ShaderNodeTexImage"); tr.image = rough_img
    for n in (tc, tr):
        nt.links.new(uv.outputs["UV"], n.inputs["Vector"])
    nt.links.new(tc.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tr.outputs["Color"], b.inputs["Roughness"])
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_r
    return m


for g, (objs, col, rough) in baked.items():
    col.pack(); rough.pack()
    m = pbr(f"F1W_{g}", col, rough, *CONST[g])
    for o in objs:
        for s in o.material_slots:
            s.material = m

# simple materials keep their look with constants (their noise-driven roughness becomes a value)
def simple(old, name, color, metal, rough, coat=0.0, coat_r=0.05):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_r
    for o in meshes:
        for s in o.material_slots:
            if s.material and s.material.name == old:
                s.material = m

simple("F1_RimMagnesium", "F1W_RimMagnesium", (0.012, 0.012, 0.014), 0.6, 0.32, 0.3, 0.25)
simple("F1_Titanium", "F1W_Titanium", (0.05, 0.05, 0.055), 1.0, 0.3)
simple("F1Alpine_TCam", "F1W_TCam", (0.004, 0.004, 0.004), 0.0, 0.35, 0.35, 0.28)
simple("F1Alpine_WheelNut", "F1W_WheelNut", (0.45, 0.01, 0.01), 1.0, 0.25)

for o in meshes:  # drop the unused projection UV-less originals' leftovers
    while len(o.data.uv_layers) > 1:
        o.data.uv_layers.remove(o.data.uv_layers[0])

# ------------------------------------------------------------------ 4. site convention
rot = Matrix.Rotation(-math.pi / 2, 4, "Z")  # source +Y forward -> +X forward
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = rot @ mw
for o in list(sc.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
mn = Vector((1e9,) * 3); mx = -mn
for o in meshes:
    for c in o.bound_box:
        mn = Vector(map(min, mn, Vector(c))); mx = Vector(map(max, mx, Vector(c)))
shift = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
for o in meshes:
    o.data.transform(Matrix.Translation(shift))
    o.data.update()
print("[bake] shift", tuple(round(v, 4) for v in shift), "bounds", tuple(round(v, 3) for v in mn + shift), tuple(round(v, 3) for v in mx + shift))

for m in list(bpy.data.materials):
    if m.users == 0:
        bpy.data.materials.remove(m)
bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
print("[bake] saved", OUT, flush=True)
