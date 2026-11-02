import os, sys, time
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset(); S.import_car(os.environ["SRC"]); S.studio(); S.strip_rig()
S.cycles(samples=24, w=800, h=450)
out=os.environ["OUT"]
shots={
 "rear_badge": ((-4.2,0,0.9),(-2.2,0,0.55),70),
 "wheel_fl":   ((2.2,3.0,0.5),(1.28,0.9,0.36),70),
 "cockpit":    ((0.2,1.6,1.5),(0.45,0.1,0.7),35),
}
for k,(l,t,lens) in shots.items():
    S.render(S.add_camera(k,l,t,lens), f"{out}/{k}.png")
# engine bay: hide the rear clam
bpy.data.objects["EngineCover_Rear"].hide_render=True
for n in ("Object_43","lodA_Exterior_a_Coloured_1_Hard_NonTextured_Skinned_Geo","Object_31.1127"):
    for o in bpy.data.objects:
        if o.name.startswith(n): o.hide_render=True
S.render(S.add_camera("bay",(-3.2,2.2,3.2),(-1.2,0,0.6),40), f"{out}/bay.png")
