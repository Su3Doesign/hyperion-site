import os, sys, json
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset(); bpy.ops.import_scene.gltf(filepath=os.environ["SRC"])
use={}
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        t=len(o.data.polygons)
        for s in o.material_slots:
            if s.material: use.setdefault(s.material.name,[0,0]); use[s.material.name][0]+=t; use[s.material.name][1]+=1
def avg(im):
    if im.size[0]==0: return None
    px=im.pixels[:]; n=len(px)//4; st=max(1,n//2000)
    r=g=b=0;k=0
    for i in range(0,n,st): r+=px[i*4];g+=px[i*4+1];b+=px[i*4+2];k+=1
    return (round(r/k,2),round(g/k,2),round(b/k,2))
for m in bpy.data.materials:
    if not m.node_tree: continue
    b=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not b: continue
    def sock(name):
        s=b.inputs[name]
        if s.is_linked:
            n=s.links[0].from_node
            while n.type!='TEX_IMAGE' and n.inputs and any(i.is_linked for i in n.inputs):
                n=[i for i in n.inputs if i.is_linked][0].links[0].from_node
            return ("TEX", n.image.name if n.type=='TEX_IMAGE' and n.image else n.type, avg(n.image) if n.type=='TEX_IMAGE' and n.image else None)
        v=s.default_value
        try: return tuple(round(x,2) for x in v)
        except TypeError: return round(v,2)
    print("M", m.name, use.get(m.name), "base",sock("Base Color"),"met",sock("Metallic"),"rough",sock("Roughness"),"alpha",sock("Alpha"),"trans",sock("Transmission Weight"),"cc",sock("Coat Weight"),"em",sock("Emission Strength"))
