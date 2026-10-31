"""Import the source GLB and print a structural report (bounds, part groups, materials)."""
import bpy, sys, mathutils
import os
src = os.environ["SRC"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
mn=mathutils.Vector((1e9,)*3); mx=-mn
for o in objs:
    for c in o.bound_box:
        w=o.matrix_world@mathutils.Vector(c)
        mn=mathutils.Vector(map(min,mn,w)); mx=mathutils.Vector(map(max,mx,w))
print("BOUNDS",tuple(round(v,3) for v in mn),tuple(round(v,3) for v in mx))
for name in ["Hyperion_Root","EngineCover_Rear","Door_L","Door_R","Cockpit_Steering","Cockpit_Screen_Infotainment","Light_Headlight_Top","Light_Tail","Wheel_FL"]:
    o=bpy.data.objects.get(name)
    if o: print("PART",name,o.type,tuple(round(v,3) for v in o.matrix_world.translation),"parent=",o.parent.name if o.parent else None,"children=",len(o.children_recursive))
