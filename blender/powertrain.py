"""Procedural mid-engine powertrain for Hyperion GEN.2 (the source model's bay was empty).

HC-8: 4.0 L flat-plane V8, 90deg banks, twin turbochargers, longitudinal 7-speed transaxle,
double-wishbone pushrod rear suspension, side-mounted intercoolers, centre-exit exhaust.

Units: metres. Blender axes: +X forward, +Y = car's left, +Z up. Crank centreline at z = 0.36.
Every part is its own named object (prefix PT_) so the website can label it in the exploded view.
"""
import math, os
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textures")
FONT = os.environ.get("HY_FONT", "/home/user/tools/fonts/Archivo-VF.ttf")

CRANK_Z = 0.36
X_FRONT, X_BACK = -0.56, -1.14       # engine block span (timing end faces the cabin)
BANK = math.radians(45)
COL = bpy.context.scene.collection


# ------------------------------------------------------------------ materials
def _img(name):
    p = os.path.join(TEX, name)
    im = bpy.data.images.load(p, check_existing=True)
    im.pack()
    return im


def mat(name, color, metal, rough, coat=0.0, coat_rough=0.03, normal=None, normal_scale=1.0, base_tex=None,
        rough_tex=None, uv_scale=1.0, emission=None):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_rough
    if emission:
        b.inputs["Emission Color"].default_value = (*emission[0], 1)
        b.inputs["Emission Strength"].default_value = emission[1]
    uv = None
    if uv_scale != 1.0 and (normal or base_tex or rough_tex):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.vector_type = "POINT"
        mp.inputs["Scale"].default_value = (uv_scale, uv_scale, 1)
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
        uv = mp.outputs["Vector"]
    def tex(fname, noncolor):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = _img(fname)
        if noncolor:
            t.image.colorspace_settings.name = "Non-Color"
        if uv is not None:
            nt.links.new(uv, t.inputs["Vector"])
        return t
    if base_tex:
        nt.links.new(tex(base_tex, False).outputs["Color"], b.inputs["Base Color"])
    if rough_tex:
        nt.links.new(tex(rough_tex, True).outputs["Color"], b.inputs["Roughness"])
    if normal:
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal_scale
        nt.links.new(tex(normal, True).outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def materials():
    return dict(
        cast=mat("PT_CastAluminium", (0.56, 0.56, 0.55), 1.0, 0.42, normal="cast_normal.png", normal_scale=0.6, uv_scale=3),
        machined=mat("PT_MachinedAluminium", (0.80, 0.80, 0.80), 1.0, 0.16),
        magnesium=mat("PT_MagnesiumCasing", (0.20, 0.20, 0.21), 1.0, 0.5, normal="cast_normal.png", normal_scale=0.5, uv_scale=3),
        carbon=mat("PT_CarbonTwill", (1, 1, 1), 0.0, 0.32, coat=1.0, coat_rough=0.02, base_tex="carbon_base.png",
                   normal="carbon_normal.png", normal_scale=0.35, uv_scale=6),
        inconel=mat("PT_InconelExhaust", (0.50, 0.40, 0.34), 1.0, 0.33),
        foil=mat("PT_GoldHeatFoil", (1.0, 0.74, 0.32), 1.0, 0.25, normal="foil_normal.png", normal_scale=0.8,
                 rough_tex="foil_rough.png", uv_scale=2),
        steel=mat("PT_SatinSteel", (0.05, 0.05, 0.055), 1.0, 0.38),
        spring=mat("PT_SpringLime", (0.38, 0.75, 0.02), 0.0, 0.28, coat=1.0, coat_rough=0.08),
        silicone=mat("PT_SiliconeLime", (0.36, 0.70, 0.02), 0.0, 0.55),
        rubber=mat("PT_Rubber", (0.015, 0.015, 0.015), 0.0, 0.7),
        core=mat("PT_IntercoolerCore", (0.10, 0.10, 0.10), 1.0, 0.55),
        bronze=mat("PT_AnodisedBronze", (0.48, 0.30, 0.16), 1.0, 0.3),
        script=mat("PT_ScriptBronze", (0.62, 0.42, 0.24), 1.0, 0.22),
    )


# ------------------------------------------------------------------ helpers
def finish(ob, m, name, bevel=0.0, segments=3, smooth=True, uv=True):
    ob.name = name
    ob.data.name = name
    ob.data.materials.clear()
    ob.data.materials.append(m)
    if bevel > 0:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = ob
    for mo in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=mo.name)
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = True
        if hasattr(ob.data, "set_sharp_from_angle"):
            ob.data.set_sharp_from_angle(angle=math.radians(40))
    if uv:
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    return ob


def box(name, m, center, size, rot=(0, 0, 0), bevel=0.006):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=rot)
    ob = bpy.context.active_object
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(ob, m, name, bevel)


def cyl(name, m, center, radius, depth, axis="X", verts=48, bevel=0.003, rot_extra=None):
    rot = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center, rotation=rot)
    ob = bpy.context.active_object
    if rot_extra:
        ob.rotation_euler.rotate(Euler(rot_extra))
    return finish(ob, m, name, bevel)


def pipe(name, m, pts, radius, res=8, sides=16, smooth_pts=True):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = max(2, sides // 4)
    cu.resolution_u = res
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO" if smooth_pts else "VECTOR"
    ob = bpy.data.objects.new(name, cu)
    COL.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.active_object
    return finish(ob, m, name, 0, smooth=True)


def helix(name, m, a, b, coil_r, wire_r, turns):
    a, b = Vector(a), Vector(b)
    axis = b - a
    L = axis.length
    q = axis.normalized().to_track_quat("Z", "Y")
    pts = []
    n = int(turns * 24)
    for i in range(n + 1):
        t = i / n
        ang = t * turns * 2 * math.pi
        local = Vector((coil_r * math.cos(ang), coil_r * math.sin(ang), t * L))
        pts.append(a + q @ local)
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = wire_r
    cu.bevel_resolution = 3
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (*v, 1)
    ob = bpy.data.objects.new(name, cu)
    COL.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return finish(bpy.context.active_object, m, name, 0)


def rod(name, m, a, b, r, verts=16):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    ob = bpy.context.active_object
    ob.rotation_euler = d.normalized().to_track_quat("Z", "Y").to_euler()
    return finish(ob, m, name, 0.0)


def join(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    ob.data.name = name
    return ob


def text_mesh(name, m, body, loc, rot, size, depth=0.0015):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.font = bpy.data.fonts.load(FONT, check_existing=True)
    cu.size = size
    cu.extrude = depth
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.space_character = 1.15
    ob = bpy.data.objects.new(name, cu)
    COL.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return finish(bpy.context.active_object, m, name, 0, uv=False)


def bank_dir(side):
    """Unit vector up the cylinder bank (side=+1 left bank, -1 right bank)."""
    return Vector((0, side * math.sin(BANK), math.cos(BANK)))


def bank_rot(side):
    return (-side * BANK, 0, 0)


# ------------------------------------------------------------------ parts
def build():
    M = materials()
    parts = {}
    xc = (X_FRONT + X_BACK) / 2
    L = X_FRONT - X_BACK
    C = Vector((xc, 0, CRANK_Z))

    # --- crankcase / block: lower box + sump with cooling ribs
    blk = [box("PT_Block_main", M["cast"], (xc, 0, CRANK_Z + 0.03), (L, 0.36, 0.24), bevel=0.012)]
    blk.append(box("PT_Block_sump", M["cast"], (xc - 0.02, 0, CRANK_Z - 0.12), (L - 0.06, 0.30, 0.08), bevel=0.01))
    for i in range(9):
        x = X_BACK + 0.04 + i * (L - 0.08) / 8
        blk.append(box(f"PT_Block_rib{i}", M["cast"], (x, 0, CRANK_Z - 0.15), (0.008, 0.26, 0.03), bevel=0.002))
    for side in (1, -1):  # bank decks
        d = bank_dir(side)
        blk.append(box(f"PT_Block_deck{side}", M["cast"], tuple(C + d * 0.19), (L, 0.19, 0.17), rot=bank_rot(side), bevel=0.01))
    parts["Block"] = join("PT_EngineBlock", blk)

    # timing cover + crank pulley at the cabin end
    tc = [box("PT_Timing", M["magnesium"], (X_FRONT + 0.02, 0, CRANK_Z + 0.08), (0.04, 0.42, 0.40), bevel=0.02)]
    tc.append(cyl("PT_Pulley", M["machined"], (X_FRONT + 0.055, 0, CRANK_Z - 0.04), 0.075, 0.03, "X", 64))
    tc.append(cyl("PT_PulleyHub", M["steel"], (X_FRONT + 0.072, 0, CRANK_Z - 0.04), 0.03, 0.02, "X", 32))
    for side in (1, -1):
        tc.append(cyl(f"PT_CamPulley{side}", M["machined"], (X_FRONT + 0.05, side * 0.20, CRANK_Z + 0.21), 0.05, 0.024, "X", 48))
    parts["Timing"] = join("PT_TimingCover", tc)

    # --- heads + cam covers (carbon) with raised script
    for side, tag in ((1, "L"), (-1, "R")):
        d = bank_dir(side)
        head = box(f"PT_Head_{tag}", M["cast"], tuple(C + d * 0.315), (L - 0.02, 0.21, 0.09), rot=bank_rot(side), bevel=0.01)
        cover = box(f"PT_CamCover_{tag}_body", M["carbon"], tuple(C + d * 0.395), (L - 0.05, 0.19, 0.07), rot=bank_rot(side), bevel=0.025)
        # coil packs: 4 per bank along the cover crown
        coils = []
        for i in range(4):
            x = X_BACK + 0.08 + i * (L - 0.16) / 3
            p = Vector((x, 0, 0)) + Vector((0, 0, CRANK_Z)) + d * 0.437
            coils.append(cyl(f"PT_Coil_{tag}{i}", M["rubber"], tuple(p), 0.017, 0.03, "Z", 24, rot_extra=bank_rot(side)))
        n = d.cross(Vector((1, 0, 0))).normalized() * -side
        txt = text_mesh(f"PT_Script_{tag}", M["script"], "HYPERION  HC-8",
                        tuple(Vector((xc - 0.005, 0, CRANK_Z)) + d * 0.43 + n * 0.055), (bank_rot(side)[0], 0, 0), 0.026)
        parts[f"CamCover_{tag}"] = join(f"PT_CamCover_{tag}", [cover] + coils + [txt])
        parts[f"Head_{tag}"] = head

    # --- carbon intake plenum + 8 runners + throttle body
    pl = [cyl("PT_Plenum_body", M["carbon"], (xc + 0.01, 0, 0.765), 0.072, L - 0.04, "X", 64, bevel=0.012)]
    for e in (X_FRONT - 0.03, X_BACK + 0.05):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.072, location=(e, 0, 0.765), segments=48, ring_count=24)
        s = bpy.context.active_object
        s.scale = (0.45, 1, 1)
        bpy.ops.object.transform_apply(scale=True)
        pl.append(finish(s, M["carbon"], "PT_Plenum_cap"))
    pl.append(cyl("PT_Throttle", M["machined"], (X_FRONT + 0.03, 0, 0.765), 0.045, 0.07, "X", 48))
    pl.append(cyl("PT_ThrottleRing", M["bronze"], (X_FRONT + 0.07, 0, 0.765), 0.05, 0.012, "X", 48))
    parts["Plenum"] = join("PT_IntakePlenum", pl)
    runners = []
    for side in (1, -1):
        d = bank_dir(side)
        for i in range(4):
            x = X_BACK + 0.08 + i * (L - 0.16) / 3
            inner = Vector((x, 0, CRANK_Z)) + d * 0.29 + Vector((0, -side, 0.0)) * 0.08
            runners.append(pipe(f"PT_Runner_{side}{i}", M["carbon"],
                                [(x, side * 0.05, 0.74), (x, side * 0.085, 0.70), tuple(inner)], 0.021))
    parts["Runners"] = join("PT_IntakeRunners", runners)

    # --- exhaust headers (4-into-1 per bank) to the turbos
    turbo_c = {1: Vector((-1.28, 0.40, 0.58)), -1: Vector((-1.28, -0.40, 0.58))}
    for side, tag in ((1, "L"), (-1, "R")):
        d = bank_dir(side)
        out = Vector((0, side, -0.35)).normalized()
        hp = []
        coll = Vector((-1.16, side * 0.40, 0.44))
        for i in range(4):
            x = X_BACK + 0.08 + i * (L - 0.16) / 3
            port = Vector((x, 0, CRANK_Z)) + d * 0.30 + out * 0.09
            mid = port + out * 0.08 + Vector((0, 0, -0.03))
            hp.append(pipe(f"PT_Header_{tag}{i}", M["inconel"],
                           [tuple(port), tuple(mid), (x - 0.06, side * 0.385, 0.40), tuple(coll)], 0.0185, res=10))
        hp.append(pipe(f"PT_Collector_{tag}", M["inconel"], [tuple(coll), (-1.22, side * 0.405, 0.48), tuple(turbo_c[side] + Vector((0.05, 0, -0.05)))], 0.032))
        parts[f"Headers_{tag}"] = join(f"PT_ExhaustHeaders_{tag}", hp)

        # --- turbocharger: foil-wrapped turbine scroll, machined compressor scroll, centre cartridge
        tcn = turbo_c[side]
        tb = []
        tb.append(cyl(f"PT_TurbineHousing_{tag}", M["foil"], tuple(tcn + Vector((0, -side * 0.045, 0))), 0.072, 0.075, "Y", 48, bevel=0.012))
        tb.append(cyl(f"PT_Cartridge_{tag}", M["steel"], tuple(tcn), 0.035, 0.04, "Y", 32))
        tb.append(cyl(f"PT_CompressorHousing_{tag}", M["machined"], tuple(tcn + Vector((0, side * 0.05, 0))), 0.066, 0.06, "Y", 64, bevel=0.012))
        spiral = []
        for k in range(26):
            a = k / 25 * 1.7 * math.pi
            r = 0.07 + 0.018 * k / 25
            spiral.append(tuple(tcn + Vector((math.cos(a) * r, side * 0.05, math.sin(a) * r))))
        tb.append(pipe(f"PT_CompVolute_{tag}", M["machined"], spiral, 0.016 + 0.0, res=3))
        tb.append(cyl(f"PT_CompInlet_{tag}", M["machined"], tuple(tcn + Vector((0, side * 0.095, 0))), 0.042, 0.03, "Y", 48))
        tb.append(cyl(f"PT_CompMesh_{tag}", M["steel"], tuple(tcn + Vector((0, side * 0.112, 0))), 0.038, 0.004, "Y", 48))
        parts[f"Turbo_{tag}"] = join(f"PT_Turbocharger_{tag}", tb)

        # --- intercooler + charge pipes with lime silicone couplers
        ic_c = Vector((-0.70, side * 0.60, 0.50))
        ic = [box(f"PT_ICcore_{tag}", M["core"], tuple(ic_c), (0.34, 0.05, 0.24), rot=(0, 0, side * math.radians(8)), bevel=0.004)]
        for k in range(14):
            ic.append(box(f"PT_ICfin_{tag}{k}", M["machined"], tuple(ic_c + Vector((-0.16 + k * 0.0246, side * 0.028, 0))), (0.004, 0.006, 0.23), rot=(0, 0, side * math.radians(8)), bevel=0))
        for zz in (0.135, -0.135):
            ic.append(box(f"PT_ICtank_{tag}{zz}", M["cast"], tuple(ic_c + Vector((0, 0, zz))), (0.36, 0.07, 0.035), rot=(0, 0, side * math.radians(8)), bevel=0.01))
        parts[f"Intercooler_{tag}"] = join(f"PT_Intercooler_{tag}", ic)
        cp = [pipe(f"PT_ChargeHot_{tag}", M["machined"], [tuple(tcn + Vector((0, side * 0.11, 0.0))), (-1.12, side * 0.56, 0.62), (-0.90, side * 0.62, 0.64), tuple(ic_c + Vector((-0.19, 0, 0.1)))], 0.03)]
        cp.append(pipe(f"PT_ChargeCold_{tag}", M["machined"], [tuple(ic_c + Vector((0.19, 0, 0.1))), (-0.44, side * 0.48, 0.70), (-0.47, side * 0.16, 0.80), (X_FRONT - 0.01, side * 0.03, 0.80)], 0.028))
        cp.append(cyl(f"PT_Coupler_{tag}a", M["silicone"], (-0.90, side * 0.62, 0.64), 0.036, 0.05, "X", 32))
        cp.append(cyl(f"PT_Coupler_{tag}b", M["silicone"], (-0.47, side * 0.30, 0.78), 0.034, 0.05, "Y", 32))
        parts[f"ChargePipes_{tag}"] = join(f"PT_ChargePipes_{tag}", cp)

    # --- transaxle: bell housing, ribbed case, diff, driveshafts with CV boots
    tx = [cyl("PT_BellHousing", M["magnesium"], (X_BACK - 0.06, 0, CRANK_Z + 0.02), 0.2, 0.12, "X", 64, bevel=0.02)]
    tx.append(box("PT_Gearcase", M["magnesium"], (-1.50, 0, CRANK_Z + 0.02), (0.58, 0.30, 0.28), bevel=0.04))
    for i in range(7):
        tx.append(box(f"PT_GearRib{i}", M["magnesium"], (-1.26 - i * 0.07, 0, CRANK_Z + 0.17), (0.012, 0.26, 0.02), bevel=0.004))
    tx.append(cyl("PT_DiffHousing", M["magnesium"], (-1.41, 0, 0.38), 0.12, 0.42, "Y", 64, bevel=0.015))
    tx.append(box("PT_GearTail", M["magnesium"], (-1.83, 0, CRANK_Z + 0.04), (0.12, 0.22, 0.2), bevel=0.03))
    tx.append(text_mesh("PT_GearScript", M["script"], "HYPERION  7-DCT", (-1.50, -0.151, CRANK_Z + 0.04), (math.pi / 2, 0, 0), 0.03))
    parts["Transaxle"] = join("PT_Transaxle", tx)
    ds = []
    for side in (1, -1):
        y0, y1 = side * 0.21, side * 0.70
        ds.append(rod(f"PT_Shaft{side}", M["steel"], (-1.412, y0, 0.38), (-1.412, y1, 0.38), 0.022, 24))
        for yy in (side * 0.25, side * 0.66):
            for k in range(5):
                ds.append(cyl(f"PT_Boot{side}{yy}{k}", M["rubber"], (-1.412, yy + side * (k - 2) * 0.012, 0.38), 0.045 - abs(k - 2) * 0.006, 0.012, "Y", 32, bevel=0.003))
    parts["Driveshafts"] = join("PT_Driveshafts", ds)

    # --- rear suspension: wishbones, pushrods, rockers, lime coilovers on the gearbox
    sus = []
    for side in (1, -1):
        hub_lo = Vector((-1.41, side * 0.66, 0.24))
        hub_hi = Vector((-1.41, side * 0.62, 0.55))
        for (xa, xb, z, hub) in ((-1.26, -1.58, 0.24, hub_lo), (-1.30, -1.55, 0.56, hub_hi)):
            sus.append(rod(f"PT_ArmA{side}{z}", M["steel"], (xa, side * 0.17, z), tuple(hub), 0.012))
            sus.append(rod(f"PT_ArmB{side}{z}", M["steel"], (xb, side * 0.17, z), tuple(hub), 0.012))
        rocker = Vector((-1.58, side * 0.15, 0.62))
        sus.append(rod(f"PT_Pushrod{side}", M["steel"], tuple(hub_lo + Vector((0, -side * 0.03, 0.02))), tuple(rocker), 0.01))
        sus.append(box(f"PT_Rocker{side}", M["machined"], tuple(rocker), (0.06, 0.03, 0.05), bevel=0.008))
        a, b = rocker + Vector((-0.02, 0, 0.02)), Vector((-1.86, side * 0.10, 0.58))
        sus.append(rod(f"PT_Damper{side}", M["machined"], tuple(a), tuple(b), 0.016, 24))
        sus.append(helix(f"PT_Spring{side}", M["spring"], tuple(a + (b - a) * 0.15), tuple(a + (b - a) * 0.8), 0.027, 0.0055, 6.5))
        sus.append(cyl(f"PT_Upright{side}", M["cast"], (-1.41, side * 0.72, 0.40), 0.07, 0.05, "Y", 32, bevel=0.01))
    parts["Suspension"] = join("PT_RearSuspension", sus)

    # --- dry-sump oil tank, exhaust silencer + tips, bulkhead heat shield
    parts["OilTank"] = join("PT_OilTank", [
        cyl("PT_Tank", M["bronze"], (-0.62, 0.40, 0.47), 0.065, 0.2, "Z", 48, bevel=0.012),
        cyl("PT_TankCap", M["machined"], (-0.62, 0.40, 0.58), 0.03, 0.02, "Z", 32),
        pipe("PT_TankLine", M["rubber"], [(-0.62, 0.40, 0.37), (-0.66, 0.30, 0.25), (-0.72, 0.12, 0.22)], 0.01),
    ])
    ex = [box("PT_Silencer", M["inconel"], (-1.66, 0, 0.6), (0.18, 0.44, 0.13), bevel=0.045)]  # kept clear of the rear grille
    for side in (1, -1):
        ex.append(pipe(f"PT_Downpipe{side}", M["inconel"], [tuple(turbo_c[side] + Vector((-0.05, -side * 0.06, 0.04))), (-1.45, side * 0.3, 0.64), (-1.6, side * 0.16, 0.62)], 0.034))
    ex.append(pipe("PT_Tailpipe", M["inconel"], [(-1.74, 0, 0.58), (-1.86, 0, 0.52), (-1.95, 0, 0.48)], 0.045))  # ends inside the body outlet
    parts["Exhaust"] = join("PT_ExhaustSystem", ex)
    parts["HeatShield"] = box("PT_BulkheadHeatShield", M["foil"], (-0.50, 0, 0.55), (0.012, 0.84, 0.5), bevel=0.004)

    for k, o in parts.items():
        o["hy_part"] = k
    return parts


# exploded-view metadata for the website: label + plain-language note per part
LABELS = {
    "Block": ("HC-8 engine block", "Closed-deck aluminium, 90° V, flat-plane crank"),
    "Timing": ("Timing cover", "Magnesium, cam drive by gear train"),
    "Head_L": ("Cylinder head · left", "Four valves per cylinder"),
    "Head_R": ("Cylinder head · right", "Four valves per cylinder"),
    "CamCover_L": ("Cam cover · left", "Carbon twill, coil-on-plug"),
    "CamCover_R": ("Cam cover · right", "Carbon twill, coil-on-plug"),
    "Plenum": ("Intake plenum", "Carbon, single drive-by-wire throttle"),
    "Runners": ("Intake runners", "Eight tuned-length carbon runners"),
    "Headers_L": ("Exhaust headers · left", "Inconel 4-into-1"),
    "Headers_R": ("Exhaust headers · right", "Inconel 4-into-1"),
    "Turbo_L": ("Turbocharger · left", "Ball-bearing, gold-foil turbine wrap"),
    "Turbo_R": ("Turbocharger · right", "Ball-bearing, gold-foil turbine wrap"),
    "Intercooler_L": ("Intercooler · left", "Air-to-air, fed by the side intake"),
    "Intercooler_R": ("Intercooler · right", "Air-to-air, fed by the side intake"),
    "ChargePipes_L": ("Charge pipes · left", "Polished aluminium, silicone couplers"),
    "ChargePipes_R": ("Charge pipes · right", "Polished aluminium, silicone couplers"),
    "Transaxle": ("7-speed transaxle", "Dual-clutch, magnesium case"),
    "Driveshafts": ("Driveshafts", "Tripod CV joints"),
    "Suspension": ("Rear suspension", "Double wishbone, pushrod, inboard coilovers"),
    "OilTank": ("Dry-sump tank", "Anodised aluminium"),
    "Exhaust": ("Exhaust system", "Centre exit, foil-wrapped silencer"),
    "HeatShield": ("Bulkhead heat shield", "Reflective gold foil"),
}

if __name__ == "__main__":
    build()
