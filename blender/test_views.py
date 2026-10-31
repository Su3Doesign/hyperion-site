import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset()
hidden = S.import_car(os.environ["SRC"])
print("HIDDEN", hidden)
S.studio(); S.strip_rig()
S.cycles(samples=int(os.environ.get("SPP", 24)), w=800, h=450)
out = os.environ["OUT"]
views = {
  "front34": ((6.2, 4.2, 1.6), (0, 0, 0.5)),
  "side":    ((0, 8.5, 0.9), (0, 0, 0.55)),
  "rear34":  ((-6.0, -4.0, 1.8), (0, 0, 0.5)),
  "top":     ((0.01, 0, 9), (0, 0, 0)),
}
for k, (loc, tgt) in views.items():
    t = time.time()
    cam = S.add_camera(k, loc, tgt, lens=50)
    S.render(cam, f"{out}/{k}.png")
    print("RENDERED", k, round(time.time() - t, 1), "s")
