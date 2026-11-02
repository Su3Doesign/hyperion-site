"""Stage 1 for the F1 car: clean the downloaded .blend and put it in the site's convention.

    BLEND=.work/f1/F1_Alpine_livery.blend OUT=.work/f1/f1_clean.blend python blender/f1_prep.py

- removes the three stray NAUO7 objects (hundreds of metres across, no material)
- turns the car so +X is forward and +Y is the car's left (same as Hyperion), floor at z = 0
- applies transforms so every later stage works in world space
"""
import os, sys, math
import bpy, mathutils
from mathutils import Matrix, Vector

bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
sc = bpy.context.scene

junk = [o for o in sc.objects if o.name.startswith("NAUO7_")]
for o in junk:
    bpy.data.objects.remove(o, do_unlink=True)
print("[prep] removed junk:", len(junk))

meshes = [o for o in sc.objects if o.type == "MESH"]
# flatten: keep world transforms, drop the STEP_Root empty
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
for o in list(sc.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)

# source: +Y forward, +X to the car's right. Rotate -90° about Z: (x, y) -> (y, -x)
rot = Matrix.Rotation(-math.pi / 2, 4, "Z")
for o in meshes:
    o.matrix_world = rot @ o.matrix_world
for o in meshes:
    if o.data.users > 1:
        o.data = o.data.copy()
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

mn = Vector((1e9,) * 3); mx = -mn
for o in meshes:
    for v in o.data.vertices:
        pass
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
# centre on the wheelbase midpoint in x/y, floor at z = 0
shift = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
for o in meshes:
    o.data.transform(Matrix.Translation(shift))
    o.data.update()
print("[prep] bounds", tuple(round(v, 3) for v in mn + shift), tuple(round(v, 3) for v in mx + shift))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=False)
print("[prep] saved", os.environ["OUT"])
