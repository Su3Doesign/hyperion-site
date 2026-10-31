import os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
for o in [o for o in bpy.context.scene.objects if o.name.startswith("NAUO7_")]:
    o.hide_render = True
S.studio(); S.strip_rig()
for o in bpy.context.scene.objects:   # studio is built for +X forward; turn the lights/floor instead of the car
    if o.type in ("LIGHT",) or o.name == "Cyclorama":
        o.rotation_euler.z += 1.5708
        x, y = o.location.x, o.location.y
        o.location.x, o.location.y = -y, x
S.cycles(samples=16, w=800, h=450)
out = os.environ["OUT"]
S.render(S.add_camera("o34", (-4.6, 6.4, 1.7), (0, 0.2, 0.45), 45), f"{out}/f1o_34.png")
S.render(S.add_camera("oside", (-9.0, 0.25, 0.7), (0, 0.25, 0.45), 55), f"{out}/f1o_side.png")
