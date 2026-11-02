import os, sys, json
import bpy, mathutils
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset(); S.import_car(os.environ["SRC"])
import bpy
rows=[]
for o in bpy.context.scene.objects:
    if o.type!='MESH': continue
    mn,mx=S.world_bounds([o]); c=(mn+mx)/2; s=mx-mn
    chain=[]; p=o.parent
    while p: chain.append(p.name); p=p.parent
    rows.append(dict(n=o.name,hid=o.hide_render,c=[round(v,2) for v in c],s=[round(v,2) for v in s],
      m=[sl.material.name for sl in o.material_slots if sl.material],tris=sum(len(p.vertices)-2 for p in o.data.polygons),par=chain[:3]))
json.dump(rows,open(os.environ["OUT"],"w"),indent=0)
print("N",len(rows))
