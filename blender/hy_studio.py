"""Shared Blender helpers for the Hyperion pipeline (import, clean-up, studio, cameras).

Run scripts with the pip `bpy` module, passing paths via environment variables
(Blender's own arg parser chokes on `--` when embedded):
    SRC=.work/hyperion_decoded.glb python blender/render_stills.py
"""
import bpy, math, mathutils, os

# Real-world brand marks shipped inside the kitbash parts. Hidden in every output.
BRAND_MARKERS = ("badge", "logo", "ChassisBadge")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_car(path):
    bpy.ops.import_scene.gltf(filepath=path)
    hidden = []
    for o in bpy.context.scene.objects:
        mats = [s.material.name for s in getattr(o, "material_slots", []) if s.material]
        tag = (o.name + " " + " ".join(mats)).lower()
        if any(m.lower() in tag for m in BRAND_MARKERS):
            o.hide_render = True
            o.hide_viewport = True
            hidden.append(o.name)
    return hidden


def world_bounds(objs=None):
    objs = objs or [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render]
    mn = mathutils.Vector((1e9,) * 3)
    mx = -mn
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            mn = mathutils.Vector(map(min, mn, w))
            mx = mathutils.Vector(map(max, mx, w))
    return mn, mx


def look_at(obj, target):
    d = mathutils.Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, loc, target, lens=50):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.sensor_width = 36
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def area_light(name, loc, target, size, size_y, energy, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, "AREA")
    l.shape = "RECTANGLE"
    l.size = size
    l.size_y = size_y
    l.energy = energy
    l.color = color
    ob = bpy.data.objects.new(name, l)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def studio(floor_color=(0.012, 0.012, 0.013), world_strength=0.02):
    """Dark infinity studio: seamless glossy-ish floor + strip softboxes that draw long reflections."""
    sc = bpy.context.scene
    # World: near-black so metal reads as metal, not grey plastic.
    w = bpy.data.worlds.new("Void")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.02, 0.02, 0.022, 1)
    bg.inputs[1].default_value = world_strength
    sc.world = w

    # Seamless cyclorama floor (curved backdrop).
    bpy.ops.mesh.primitive_plane_add(size=1)
    floor = bpy.context.active_object
    floor.name = "Cyclorama"
    me = floor.data
    import bmesh
    bm = bmesh.new()
    rows, R, depth, width, height = 40, 4.0, 14.0, 40.0, 10.0
    verts = []
    # profile: flat floor from z=+depth to 0, then quarter circle up the back wall
    prof = []
    for i in range(12):
        prof.append((depth - i * depth / 11, 0.0))
    for i in range(1, rows):
        a = (i / (rows - 1)) * math.pi / 2
        prof.append((-R * math.sin(a), R - R * math.cos(a)))
    prof.append((-R, height))
    for px, pz in prof:
        verts.append((bm.verts.new((-width / 2, px - 6, pz)), bm.verts.new((width / 2, px - 6, pz))))
    for i in range(len(verts) - 1):
        a, b = verts[i]
        c, d = verts[i + 1]
        bm.faces.new((a, b, d, c))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    floor.rotation_euler = (0, 0, math.radians(90))  # backdrop wall sits behind the car's left side
    mat = bpy.data.materials.new("Floor")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*floor_color, 1)
    bsdf.inputs["Roughness"].default_value = 0.32
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    me.materials.append(mat)
    return floor


def strip_rig(scale=1.0, warm=(1.0, 0.93, 0.85), cool=(0.85, 0.9, 1.0)):
    """Three long strips + overhead soft box: the classic automotive 'line' lighting."""
    L = []
    L.append(area_light("Top", (0, 0, 5.2), (0, 0, 0), 6.0, 1.6, 900 * scale, warm))
    L.append(area_light("StripL", (0.0, 4.5, 1.9), (0, 0, 0.6), 7.5, 0.18, 650 * scale, cool))
    L.append(area_light("StripR", (0.0, -4.5, 1.9), (0, 0, 0.6), 7.5, 0.18, 650 * scale, cool))
    L.append(area_light("Rim", (-5.5, 0, 2.2), (0, 0, 0.5), 0.25, 3.5, 450 * scale, warm))
    L.append(area_light("Kick", (5.5, 2.5, 0.35), (0, 0, 0.35), 3.0, 0.12, 160 * scale, cool))
    return L


def cycles(samples=64, w=1280, h=720, denoise=True):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = denoise
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.max_bounces = 8
    sc.cycles.glossy_bounces = 6
    sc.cycles.transmission_bounces = 8
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.image_settings.file_format = "PNG"
    sc.render.threads_mode = "AUTO"


def render(cam, path):
    sc = bpy.context.scene
    sc.camera = cam
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
