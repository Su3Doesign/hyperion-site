import os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
S.studio(); S.strip_rig()
S.cycles(samples=int(os.environ.get("SPP", 16)), w=800, h=450)
out = os.environ["OUT"]
for k, (loc, tgt, lens) in {
    "f1_34": ((6.4, 4.6, 1.7), (0.2, 0, 0.45), 45), "f1_side": ((0, 9.0, 0.7), (0, 0, 0.45), 55),
    "f1_rear": ((-6.2, -3.8, 2.0), (-0.4, 0, 0.5), 45), "f1_top": ((0.01, 0, 10.5), (0, 0, 0), 45),
}.items():
    S.render(S.add_camera(k, loc, tgt, lens), f"{out}/{k}.png")
