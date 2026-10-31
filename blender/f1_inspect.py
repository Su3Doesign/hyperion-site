"""Report what is inside a downloaded .blend: collections, objects, bounds, materials, images."""
import os, sys
import bpy, mathutils
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
print("VERSION", bpy.data.version, "scenes", [s.name for s in bpy.data.scenes], "engine", bpy.context.scene.render.engine)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
mn = mathutils.Vector((1e9,) * 3); mx = -mn; tris = 0
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c); mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
print("BOUNDS", tuple(round(v, 3) for v in mn), tuple(round(v, 3) for v in mx), "meshes", len(meshes), "tris", tris)
print("TYPES", {t: sum(1 for o in bpy.context.scene.objects if o.type == t) for t in {o.type for o in bpy.context.scene.objects}})
def walk(c, d=0):
    print("  " * d + "COL", c.name, len(c.objects))
    for ch in c.children: walk(ch, d + 1)
walk(bpy.context.scene.collection)
for o in sorted(bpy.context.scene.objects, key=lambda o: o.name)[:int(os.environ.get("N", 400))]:
    if o.type not in ("MESH", "EMPTY", "CURVE", "ARMATURE", "LIGHT", "CAMERA"): continue
    extra = ""
    if o.type == "MESH":
        omn = mathutils.Vector((1e9,) * 3); omx = -omn
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c); omn = mathutils.Vector(map(min, omn, w)); omx = mathutils.Vector(map(max, omx, w))
        extra = f"c={tuple(round(v,2) for v in (omn+omx)/2)} s={tuple(round(v,2) for v in omx-omn)} f={len(o.data.polygons)} mods={[m.type for m in o.modifiers]} mats={[s.material.name for s in o.material_slots if s.material][:4]}"
    print("OBJ", o.type, o.name, "par=" + (o.parent.name if o.parent else "-"), extra)
print("MATS", len(bpy.data.materials), [m.name for m in bpy.data.materials][:80])
print("IMGS", len(bpy.data.images), [(i.name, tuple(i.size), bool(i.packed_file)) for i in bpy.data.images][:60])
