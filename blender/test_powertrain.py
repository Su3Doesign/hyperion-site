import os, sys, time
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset()
import importlib, powertrain as P
t=time.time(); parts=P.build(); print("BUILT", len(parts), round(time.time()-t,1),"s")
tris=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'); print("POLYS",tris)
S.studio(); S.strip_rig(0.6)
S.cycles(samples=32, w=960, h=540)
out=os.environ["OUT"]
S.render(S.add_camera("a",(0.6,2.2,1.9),(-1.15,0,0.48),40), f"{out}/pt_a.png")
S.render(S.add_camera("b",(-3.0,-1.6,1.3),(-1.15,0,0.48),40), f"{out}/pt_b.png")
