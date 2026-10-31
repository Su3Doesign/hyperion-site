"""Procedural F1 power unit for the Alpine car (the source model's engine bay is an empty shell).

1.6 L 90° V6, split turbo (compressor at the front of the V, turbine at the back, MGU-H on the shaft
between them), MGU-K, energy store, sidepod radiators, 8-speed gearbox and driveshafts.
Site convention: +X forward, +Y left, +Z up. REAR_AXLE comes from the baked car's wheel centres.
Every part is its own object; LABELS feed the exploded view on the website.
"""
import math
import bpy
from mathutils import Vector
import powertrain as P   # shared helpers: materials(), box, cyl, pipe, rod, join, text_mesh, bank_dir


def build(rear_axle_x, hub_y=0.72, hub_z=0.36):
    M = P.materials()
    hv = P.mat("PT_HVOrange", (1.0, 0.33, 0.0), 0.0, 0.45)
    ebox = P.mat("PT_EnergyStore", (0.03, 0.03, 0.035), 0.2, 0.5)
    XR = rear_axle_x
    X_BACK = XR + 0.50          # engine rear face, bolted to the gearbox
    L = 0.42                    # V6 block length
    X_FRONT = X_BACK + L
    xc = (X_FRONT + X_BACK) / 2
    CZ = 0.24                   # crank centreline, as low as the floor allows
    C = Vector((xc, 0, CZ))
    parts = {}

    def bank(side):
        return Vector((0, side * math.sin(math.radians(45)), math.cos(math.radians(45))))

    def brot(side):
        return (-side * math.radians(45), 0, 0)

    # --- block, sump, decks
    blk = [P.box("F1PU_block", M["cast"], (xc, 0, CZ + 0.02), (L, 0.28, 0.2), bevel=0.01),
           P.box("F1PU_sump", M["cast"], (xc, 0, CZ - 0.1), (L - 0.04, 0.24, 0.05), bevel=0.008)]
    for side in (1, -1):
        blk.append(P.box(f"F1PU_deck{side}", M["cast"], tuple(C + bank(side) * 0.15), (L, 0.15, 0.13), rot=brot(side), bevel=0.008))
    parts["Block"] = P.join("F1PU_Block", blk)

    # --- heads and carbon cam covers with script
    for side, tag in ((1, "L"), (-1, "R")):
        d = bank(side)
        parts[f"Head_{tag}"] = P.box(f"F1PU_Head_{tag}", M["cast"], tuple(C + d * 0.255), (L - 0.02, 0.17, 0.07), rot=brot(side), bevel=0.008)
        cover = P.box(f"F1PU_Cover_{tag}", M["carbon"], tuple(C + d * 0.318), (L - 0.04, 0.15, 0.05), rot=brot(side), bevel=0.018)
        n = d.cross(Vector((1, 0, 0))).normalized() * -side
        txt = P.text_mesh(f"F1PU_Script_{tag}", M["script"], "V6 · 1.6", tuple(Vector((xc, 0, CZ)) + d * 0.345 + n * 0.04), (brot(side)[0], 0, 0), 0.022)
        parts[f"CamCover_{tag}"] = P.join(f"F1PU_CamCover_{tag}", [cover, txt])

    # --- split turbo: compressor ahead of the V, turbine behind it, MGU-H on the shaft
    tz = CZ + 0.24
    comp = [P.cyl("F1PU_CompHousing", M["machined"], (X_FRONT + 0.06, 0, tz), 0.075, 0.07, "X", 64, bevel=0.012),
            P.cyl("F1PU_CompInlet", M["machined"], (X_FRONT + 0.11, 0, tz), 0.05, 0.04, "X", 48)]
    spiral = [tuple(Vector((X_FRONT + 0.06, math.cos(k / 25 * 1.7 * math.pi) * (0.08 + 0.02 * k / 25), tz + math.sin(k / 25 * 1.7 * math.pi) * (0.08 + 0.02 * k / 25)))) for k in range(26)]
    comp.append(P.pipe("F1PU_CompVolute", M["machined"], spiral, 0.016, res=3))
    parts["Compressor"] = P.join("F1PU_Compressor", comp)
    parts["MGUH"] = P.join("F1PU_MGUH", [
        P.cyl("F1PU_MGUH_body", M["magnesium"], (xc, 0, tz), 0.055, L * 0.55, "X", 48, bevel=0.01),
        P.cyl("F1PU_Shaft", M["steel"], (xc, 0, tz), 0.018, L + 0.12, "X", 24),
        P.cyl("F1PU_MGUH_ring", M["bronze"], (xc + L * 0.2, 0, tz), 0.06, 0.012, "X", 48),
    ])
    parts["Turbine"] = P.join("F1PU_Turbine", [
        P.cyl("F1PU_TurbineHousing", M["foil"], (X_BACK - 0.06, 0, tz), 0.085, 0.09, "X", 64, bevel=0.015),
        P.cyl("F1PU_TurbineCore", M["inconel"], (X_BACK - 0.12, 0, tz), 0.05, 0.04, "X", 32),
    ])

    # --- carbon plenum with six trumpets, fed from the compressor
    pl = [P.cyl("F1PU_Plenum", M["carbon"], (xc, 0, CZ + 0.36), 0.06, L - 0.02, "X", 48, bevel=0.012)]
    for side in (1, -1):
        for i in range(3):
            x = X_BACK + 0.07 + i * (L - 0.14) / 2
            pl.append(P.pipe(f"F1PU_Runner{side}{i}", M["carbon"], [(x, side * 0.04, CZ + 0.33), (x, side * 0.08, CZ + 0.28), tuple(Vector((x, 0, CZ)) + bank(side) * 0.22 + Vector((0, -side * 0.06, 0)))], 0.017))
    pl.append(P.pipe("F1PU_ChargePipe", M["machined"], [(X_FRONT + 0.06, 0.06, tz + 0.06), (X_FRONT + 0.02, 0.05, CZ + 0.4), (X_FRONT - 0.03, 0, CZ + 0.38)], 0.03))
    parts["Plenum"] = P.join("F1PU_IntakePlenum", pl)

    # --- exhaust: 3-into-1 per bank to the central turbine, then out under the rear wing
    for side, tag in ((1, "L"), (-1, "R")):
        hp = []
        for i in range(3):
            x = X_BACK + 0.07 + i * (L - 0.14) / 2
            port = Vector((x, 0, CZ)) + bank(side) * 0.24 + Vector((0, side, -0.35)).normalized() * 0.075
            hp.append(P.pipe(f"F1PU_Hdr{tag}{i}", M["inconel"], [tuple(port), (x - 0.03, side * 0.26, CZ + 0.1), (X_BACK - 0.02, side * 0.2, CZ + 0.14), (X_BACK - 0.08, side * 0.08, tz - 0.05)], 0.016, res=10))
        parts[f"Headers_{tag}"] = P.join(f"F1PU_Headers_{tag}", hp)
    ex = [P.pipe("F1PU_Tailpipe", M["inconel"], [(X_BACK - 0.14, 0, tz), (XR - 0.1, 0, tz + 0.02), (XR - 0.45, 0, tz + 0.06)], 0.042)]
    for side in (1, -1):
        ex.append(P.pipe(f"F1PU_Wastegate{side}", M["inconel"], [(X_BACK - 0.1, side * 0.05, tz + 0.05), (XR - 0.1, side * 0.07, tz + 0.12), (XR - 0.42, side * 0.06, tz + 0.15)], 0.016))
    parts["Exhaust"] = P.join("F1PU_Exhaust", ex)

    # --- ERS: MGU-K on the block, energy store under the fuel cell, orange HV cabling
    mguk_c = Vector((X_FRONT - 0.06, 0.19, CZ - 0.04))
    parts["MGUK"] = P.join("F1PU_MGUK", [
        P.cyl("F1PU_MGUK_body", M["magnesium"], tuple(mguk_c), 0.07, 0.16, "X", 48, bevel=0.012),
        P.cyl("F1PU_MGUK_cap", M["machined"], tuple(mguk_c + Vector((0.085, 0, 0))), 0.05, 0.02, "X", 48),
    ])
    es_c = Vector((X_FRONT + 0.42, 0, 0.13))
    es = [P.box("F1PU_ES_case", ebox, tuple(es_c), (0.46, 0.36, 0.11), bevel=0.01)]
    for k in range(6):
        es.append(P.box(f"F1PU_ES_rib{k}", M["machined"], tuple(es_c + Vector((-0.2 + k * 0.08, 0, 0.058))), (0.012, 0.32, 0.006), bevel=0))
    es.append(P.text_mesh("F1PU_ES_mark", hv, "HIGH VOLTAGE", tuple(es_c + Vector((0, 0, 0.0565))), (0, 0, 0), 0.03))
    parts["EnergyStore"] = P.join("F1PU_EnergyStore", es)
    parts["HVCables"] = P.join("F1PU_HVCables", [
        P.pipe("F1PU_HV1", hv, [tuple(es_c + Vector((-0.2, 0.12, 0.05))), (X_FRONT + 0.08, 0.2, 0.2), tuple(mguk_c + Vector((0.05, 0.05, 0.04)))], 0.011),
        P.pipe("F1PU_HV2", hv, [tuple(es_c + Vector((-0.2, -0.12, 0.05))), (X_FRONT + 0.1, -0.16, CZ + 0.2), (xc + 0.1, -0.06, tz - 0.02)], 0.011),
    ])
    parts["ControlUnit"] = P.join("F1PU_ControlUnit", [P.box("F1PU_CU", ebox, (X_FRONT + 0.16, -0.17, CZ + 0.08), (0.14, 0.08, 0.1), bevel=0.01),
                                                       P.box("F1PU_CU_fins", M["machined"], (X_FRONT + 0.16, -0.214, CZ + 0.08), (0.12, 0.006, 0.08), bevel=0)])
    parts["OilTank"] = P.join("F1PU_OilTank", [P.cyl("F1PU_Oil", M["bronze"], (X_FRONT + 0.07, 0, CZ + 0.02), 0.07, 0.16, "Y", 48, bevel=0.015),
                                               P.cyl("F1PU_OilCap", M["machined"], (X_FRONT + 0.07, 0, CZ + 0.1), 0.025, 0.02, "Z", 32)])

    # --- sidepod radiators
    for side, tag in ((1, "L"), (-1, "R")):
        rc = Vector((X_FRONT + 0.72, side * 0.42, 0.33))
        core = [P.box(f"F1PU_Rad{tag}", M["core"], tuple(rc), (0.36, 0.05, 0.3), rot=(0, 0, side * math.radians(-12)), bevel=0.004)]
        for k in range(12):
            core.append(P.box(f"F1PU_RadFin{tag}{k}", M["machined"], tuple(rc + Vector((-0.165 + k * 0.03, side * 0.028, 0))), (0.004, 0.006, 0.28), rot=(0, 0, side * math.radians(-12)), bevel=0))
        parts[f"Radiator_{tag}"] = P.join(f"F1PU_Radiator_{tag}", core)

    # --- 8-speed gearbox and driveshafts
    gb = [P.cyl("F1PU_Bell", M["magnesium"], (X_BACK - 0.03, 0, CZ + 0.02), 0.13, 0.07, "X", 48, bevel=0.012),
          P.box("F1PU_GearCase", M["carbon"], ((X_BACK + XR - 0.25) / 2, 0, CZ + 0.05), (X_BACK - XR + 0.2, 0.2, 0.2), bevel=0.03),
          P.cyl("F1PU_Diff", M["magnesium"], (XR, 0, hub_z - 0.02), 0.09, 0.3, "Y", 48, bevel=0.012)]
    gb.append(P.text_mesh("F1PU_GBScript", M["script"], "8-SPEED SEAMLESS", ((X_BACK + XR - 0.25) / 2, -0.101, CZ + 0.06), (math.pi / 2, 0, 0), 0.022))
    parts["Gearbox"] = P.join("F1PU_Gearbox", gb)
    ds = []
    for side in (1, -1):
        ds.append(P.rod(f"F1PU_Shaft{side}", M["steel"], (XR, side * 0.15, hub_z - 0.02), (XR, side * hub_y, hub_z), 0.02, 24))
        for yy in (side * 0.19, side * (hub_y - 0.05)):
            for k in range(4):
                ds.append(P.cyl(f"F1PU_Boot{side}{yy}{k}", M["rubber"], (XR, yy + side * (k - 1.5) * 0.011, hub_z - 0.01), 0.04 - abs(k - 1.5) * 0.006, 0.011, "Y", 32, bevel=0.002))
    parts["Driveshafts"] = P.join("F1PU_Driveshafts", ds)

    for k, o in parts.items():
        o["hy_part"] = k
    return parts


LABELS = {
    "Block": ("V6 block", "1.6 L, 90° banks, 15,000 rpm limit"),
    "Head_L": ("Cylinder head · left", "Pre-chamber jet ignition"),
    "Head_R": ("Cylinder head · right", "Pre-chamber jet ignition"),
    "CamCover_L": ("Cam cover · left", "Carbon, coil-on-plug"),
    "CamCover_R": ("Cam cover · right", "Carbon, coil-on-plug"),
    "Compressor": ("Turbo compressor", "Ahead of the V, split from the turbine"),
    "MGUH": ("MGU-H", "Recovers heat energy from the turbo shaft"),
    "Turbine": ("Turbine", "Behind the V, gold-foil wrapped"),
    "Plenum": ("Intake plenum", "Carbon, six variable trumpets"),
    "Headers_L": ("Exhaust · left bank", "Inconel 3-into-1"),
    "Headers_R": ("Exhaust · right bank", "Inconel 3-into-1"),
    "Exhaust": ("Tailpipe + wastegates", "Exits under the rear wing"),
    "MGUK": ("MGU-K", "Up to 120 kW from braking"),
    "EnergyStore": ("Energy store", "Lithium-ion pack under the fuel cell"),
    "HVCables": ("HV cabling", "Orange high-voltage looms"),
    "ControlUnit": ("Control electronics", "ERS power electronics"),
    "OilTank": ("Oil tank", "Between engine and fuel cell"),
    "Radiator_L": ("Radiator · left", "Inside the sidepod"),
    "Radiator_R": ("Radiator · right", "Inside the sidepod"),
    "Gearbox": ("8-speed gearbox", "Seamless shift, carbon case"),
    "Driveshafts": ("Driveshafts", "Tripod CV joints"),
}
