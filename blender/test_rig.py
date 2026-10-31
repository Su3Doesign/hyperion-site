import os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S, pose as P
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
S.studio(); S.strip_rig()
S.cycles(samples=int(os.environ.get("SPP", 20)), w=800, h=450)
out = os.environ["OUT"]
P.pose(doors=1.0, clam=1.0)
S.render(S.add_camera("open", (6.8, 6.2, 2.6), (0, 0, 0.55), 45), f"{out}/rig_open.png")
S.render(S.add_camera("openr", (-6.4, 4.8, 3.0), (-0.5, 0, 0.6), 45), f"{out}/rig_open_rear.png")
P.pose(explode=1.0)
S.render(S.add_camera("exp", (8.6, 7.4, 4.8), (0, 0, 0.85), 40), f"{out}/rig_explode.png")
S.render(S.add_camera("expb", (-1.0, 3.2, 3.4), (-1.15, 0, 0.9), 35), f"{out}/rig_explode_pt.png")
