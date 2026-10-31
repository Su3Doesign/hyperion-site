"""Export every embedded image (for auditing brand marks) + a material->image usage map."""
import os, sys, json
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset(); S.import_car(os.environ["SRC"])
out=os.environ["OUT"]; os.makedirs(out,exist_ok=True)
use={}
for m in bpy.data.materials:
    if not m.node_tree: continue
    for n in m.node_tree.nodes:
        if n.type=='TEX_IMAGE' and n.image:
            use.setdefault(n.image.name,[]).append(m.name)
for i,im in enumerate(bpy.data.images):
    if im.size[0]==0: continue
    p=f"{out}/{i:02d}.png"; im.filepath_raw=p; im.file_format='PNG'
    try: im.save()
    except Exception as e: print("ERR",im.name,e)
    print("IMG",i,im.name,im.size[:],use.get(im.name))
