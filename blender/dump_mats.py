import os, sys, json
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import hy_studio as S
S.reset(); S.import_car(os.environ["SRC"])
out=os.environ["OUT"]; os.makedirs(out,exist_ok=True)
names=os.environ["MATS"].split(",")
for mn in names:
    m=bpy.data.materials.get(mn)
    if not m: print("NOMAT",mn); continue
    for n in m.node_tree.nodes:
        if n.type=='TEX_IMAGE' and n.image:
            links=[l.to_socket.name for l in n.outputs[0].links]
            print("MAT",mn,"IMG",n.image.name,n.image.size[:],"->",links)
            n.image.filepath_raw=f"{out}/{mn}__{n.image.name}.png".replace(" ","_"); n.image.file_format='PNG'; n.image.save()
