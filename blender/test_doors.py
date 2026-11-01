import os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S, pose as P
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
S.studio(); S.strip_rig()
S.cycles(samples=10, w=640, h=360)
out = os.environ["OUT"]
cam = S.add_camera("d", (5.6, 5.0, 1.9), (0.2, 0.3, 0.7), 40)
cam2 = S.add_camera("d2", (1.2, 6.5, 1.2), (0.2, 0, 0.8), 40)
for i, a in enumerate((0.0, 0.35, 0.7, 1.0)):
    P.pose(doors=a)
    S.render(cam, f"{out}/door_{i}.png")
P.pose(doors=1.0)
S.render(cam2, f"{out}/door_side.png")
S.render(S.add_camera("rr", (-6.0, -2.4, 1.0), (-1.4, 0, 0.5), 45), f"{out}/rear_closed.png")
P.pose(doors=0)
S.render(S.add_camera("b", (3.0, 2.6, 1.1), (1.6, 0.4, 0.5), 40), f"{out}/badge_front.png")
