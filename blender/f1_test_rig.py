import os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S, pose as P
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
S.studio(); S.strip_rig()
S.cycles(samples=int(os.environ.get("SPP", 16)), w=800, h=450)
out = os.environ["OUT"]
P.pose(doors=1.0, clam=1.0)
S.render(S.add_camera("steer", (4.2, 3.4, 1.3), (1.0, 0, 0.4), 40), f"{out}/f1rig_open.png")
P.pose()
S.render(S.add_camera("rear", (-6.4, -2.6, 1.1), (-1.6, 0, 0.45), 45), f"{out}/f1rig_closed_rear.png")
P.pose(explode=1.0)
S.render(S.add_camera("exp", (7.4, 6.4, 4.2), (-0.1, 0, 0.6), 40), f"{out}/f1rig_explode.png")
for n in ("EngineCover", "Sidepods"):
    e = bpy.data.objects.get(n)
    for c in e.children_recursive: c.hide_render = True
P.pose()
S.render(S.add_camera("pu", (-3.3, 2.3, 2.4), (-1.35, 0, 0.42), 40), f"{out}/f1rig_pu.png")
