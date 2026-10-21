"""Coordinate helpers: KSP (Unity, left handed, Y up) -> three.js (right handed).

A single reflection about the Z axis is enough to move between the two
conventions:

    point       (x, y, z)      -> (x, y, -z)
    quaternion  (x, y, z, w)   -> (-x, -y, z, w)

Rotations are converted by conjugating with the reflection matrix, which is
what negating the x and y components of the quaternion does.  Triangle winding
flips under a reflection; ``muio`` already reverses winding when it reads a
mesh, so the indices we emit are correct as-is (see cv/mesh.py).
"""

from __future__ import annotations

import math


def point(v) -> list[float]:
    x, y, z = float(v[0]), float(v[1]), float(v[2])
    return [round(x, 5), round(y, 5), round(-z, 5)]


def quaternion(q) -> list[float]:
    x, y, z, w = (float(q[0]), float(q[1]), float(q[2]), float(q[3]))
    return [round(-x, 6), round(-y, 6), round(z, 6), round(w, 6)]


def euler_deg_quaternion(v) -> list[float]:
    """Config-file MODEL rotation (euler degrees, XYZ) -> RH quaternion.

    KSP uses Unity's ZXY convention; almost every config leaves this at zero,
    and for the rare non-zero case XYZ is close enough for a viewer.
    """
    rx, ry, rz = (math.radians(float(c)) for c in v[:3])
    cx, sx = math.cos(rx / 2), math.sin(rx / 2)
    cy, sy = math.cos(ry / 2), math.sin(ry / 2)
    cz, sz = math.cos(rz / 2), math.sin(rz / 2)
    # intrinsic XYZ
    x = sx * cy * cz + cx * sy * sz
    y = cx * sy * cz - sx * cy * sz
    z = cx * cy * sz + sx * sy * cz
    w = cx * cy * cz - sx * sy * sz
    return quaternion((x, y, z, w))
