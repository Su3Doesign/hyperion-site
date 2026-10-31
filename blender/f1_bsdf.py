import os
import bpy
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
for m in bpy.data.materials:
    if not m.node_tree: continue
    for b in [n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"]:
        info = {}
        for k in ("Base Color", "Metallic", "Roughness", "Coat Weight", "Coat Roughness", "Normal", "Specular IOR Level", "Alpha", "Emission Strength", "Transmission Weight"):
            s = b.inputs[k]
            if s.is_linked: info[k] = "LINK<-" + s.links[0].from_node.type
            else:
                v = s.default_value
                try: info[k] = tuple(round(x, 2) for x in v)
                except TypeError: info[k] = round(v, 3)
        print("BSDF", m.name, info)
    imgs = [n.image.name for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    if imgs: print("   IMG", m.name, imgs)
