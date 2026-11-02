import os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
for o in bpy.context.scene.objects:
    if o.name.startswith("NAUO7_") or o.name in ("NAUO1_160", "NAUO1_158", "NAUO1_156"):
        o.hide_render = True
S.studio(); S.strip_rig()
for o in bpy.context.scene.objects:
    if o.type == "LIGHT" or o.name == "Cyclorama":
        o.rotation_euler.z += 1.5708
        x, y = o.location.x, o.location.y
        o.location.x, o.location.y = -y, x
S.cycles(samples=12, w=800, h=450)
S.render(S.add_camera("bay", (-3.4, -3.6, 2.6), (0, -0.7, 0.5), 40), os.environ["OUT"] + "/f1_bay.png")
S.render(S.add_camera("bay2", (2.4, -1.4, 3.2), (0, -0.7, 0.5), 40), os.environ["OUT"] + "/f1_bay2.png")
