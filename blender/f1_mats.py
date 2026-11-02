import os
import bpy
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
for m in bpy.data.materials:
    if not m.node_tree: continue
    nodes = [(n.type, n.name, getattr(getattr(n, "image", None), "name", "")) for n in m.node_tree.nodes]
    links = [(l.from_node.type, l.from_socket.name, l.to_node.type, l.to_socket.name) for l in m.node_tree.links]
    print("MAT", m.name, "users", m.users)
    print("   NODES", nodes)
    print("   LINKS", links)
# UV presence on a few big objects
for name in ("NAUO1_164", "NAUO1_160", "NAUO1_166", "NAUO1_161", "NAUO2_002", "NAUO2_000"):
    o = bpy.data.objects.get(name)
    if o: print("UV", name, [uv.name for uv in o.data.uv_layers], "verts", len(o.data.vertices))
