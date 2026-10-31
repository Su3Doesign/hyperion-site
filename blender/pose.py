"""Pose the rebuilt car using the same rig metadata the website reads (hinges, explode vectors)."""
import math
import bpy
from mathutils import Vector, Matrix, Quaternion


def from_gl(v):
    """glTF (x, y, z) -> Blender (x, -z, y)."""
    return Vector((v[0], -v[2], v[1]))


def rest(o):
    if "rest" not in o:
        o["rest"] = [*o.location, *o.rotation_quaternion] if o.rotation_mode == "QUATERNION" else [*o.location]
    return o["rest"]


def _store(o):
    if "rest_loc" not in o:
        o["rest_loc"] = list(o.location)
        o.rotation_mode = "QUATERNION"
        o["rest_rot"] = list(o.rotation_quaternion)


def ease(t):
    return t * t * (3 - 2 * t)


def pose(doors=0.0, clam=0.0, explode=0.0, wheel_spin=0.0):
    """0..1 amounts. Explode uses a per-assembly stagger like the site does."""
    order = ["Canopy", "Halo", "RearClam", "EngineCover", "DRS", "RearWing", "FrontDeck", "Mirrors", "Door_L", "Door_R",
             "Cockpit", "Nose", "FrontWing", "Tail", "RearStructure", "Sidepods", "Lights_Front", "Lights_Rear", "Interior",
             "Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR", "Brake_FL", "Brake_FR", "Brake_RL", "Brake_RR", "Susp_F", "Susp_R",
             "Powertrain", "Floor", "Chassis"]
    for o in bpy.data.objects:
        if "hy_asm" not in o and "hy_part" not in o:
            continue
        if o.type != "EMPTY":
            continue
        _store(o)
        loc = Vector(o["rest_loc"])
        rot = Quaternion(o["rest_rot"])
        name = o.get("hy_asm") or ""
        if "spin_axis" in o and wheel_spin:
            rot = Quaternion(from_gl(o["spin_axis"]), wheel_spin) @ rot
        if "hinge_axis" in o:
            drive = o.get("hinge_drive") or ("doors" if name.startswith("Door") else "clam")
            amt = doors if drive == "doors" else clam
            ax = from_gl(o["hinge_axis"]).normalized()
            rot = Quaternion(ax, o["hinge_angle"] * ease(amt)) @ rot
        if explode > 0 and "explode" in o:
            if name:
                i = order.index(name) if name in order else 0
                t0 = i / len(order) * 0.45
                t = ease(min(1, max(0, (explode - t0) / (1 - 0.45))))
            else:  # powertrain sub-part: explodes in the second half
                t = ease(min(1, max(0, (explode - 0.4) / 0.6)))
            loc = loc + from_gl(o["explode"]) * t
        o.location = loc
        o.rotation_quaternion = rot
    bpy.context.view_layer.update()
