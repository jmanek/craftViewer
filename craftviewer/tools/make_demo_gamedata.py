#!/usr/bin/env python3
"""Build a fake-but-valid KSP tree so craftViewer can be tried without KSP.

It writes::

    demo/GameData/Squad/Parts/Demo/<Part>/<Part>.cfg + model.mu
    demo/saves/Demo/Ships/VAB/Kerbal X.craft   (copy of kerbalx.craft)
    demo/saves/Demo/Ships/SPH/test.craft

The .mu files are generated from scratch through the same binary format the
game uses (version 5, so it also exercises the modern material layout).  Shapes
are rough stand-ins for the stock parts used by the Kerbal X.

    python tools/make_demo_gamedata.py [--out demo]
"""

from __future__ import annotations

import argparse
import math
import os
import shutil
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

# --- .mu entry types (see cv/muio.py) ---------------------------------------
ET_CHILD_TRANSFORM_START = 0
ET_CHILD_TRANSFORM_END = 1
ET_MESH_COLLIDER = 3
ET_MESH_FILTER = 7
ET_MATERIALS = 10
ET_TEXTURES = 12
ET_MESH_START = 13
ET_MESH_VERTS = 14
ET_MESH_UV = 15
ET_MESH_NORMALS = 17
ET_MESH_TRIANGLES = 19
ET_MESH_END = 22
ET_TAG_AND_LAYER = 24

MODEL_BINARY = 76543
FILE_VERSION = 5


# --- binary writer ----------------------------------------------------------
class MuWriter:
    def __init__(self):
        self.buf = bytearray()

    def int(self, *vals):
        self.buf += struct.pack("<%di" % len(vals), *vals)

    def byte(self, val):
        self.buf += struct.pack("<B", val)

    def floats(self, vals):
        self.buf += struct.pack("<%df" % len(vals), *vals)

    def string(self, text: str):
        data = text.encode("utf-8")
        # 7-bit varint length, as used by .mu v4+
        val = len(data)
        while val > 127:
            self.byte((val & 127) + 128)
            val >>= 7
        self.byte(val)
        self.buf += data

    def tag_and_layer(self, tag="Untagged", layer=0):
        self.int(ET_TAG_AND_LAYER)
        self.string(tag)
        self.int(layer)

    def transform(self, name, pos=(0, 0, 0), rot=(0, 0, 0, 1), scale=(1, 1, 1)):
        self.string(name)
        self.floats(pos)
        self.floats(rot)
        self.floats(scale)

    def mesh(self, verts, normals, uvs, triangles, filter_tag=True):
        if filter_tag:
            self.int(ET_MESH_FILTER)
        self.int(ET_MESH_START)
        self.int(len(verts))
        self.int(1)  # submesh count
        self.int(ET_MESH_VERTS)
        for v in verts:
            self.floats(v)
        self.int(ET_MESH_UV)
        for uv in uvs:
            self.floats(uv)
        self.int(ET_MESH_NORMALS)
        for n in normals:
            self.floats(n)
        self.int(ET_MESH_TRIANGLES)
        self.int(len(triangles) * 3)
        for tri in triangles:
            self.int(*tri)
        self.int(ET_MESH_END)


def write_mu(path, nodes, material_name="KSP/Bumped Specular"):
    """nodes: list of dicts {name, pos, rot, scale, geom=(verts,normals,uvs,tris)}"""
    w = MuWriter()
    w.int(MODEL_BINARY, FILE_VERSION)
    w.string(os.path.splitext(os.path.basename(path))[0])

    # root object
    w.transform("model")
    w.tag_and_layer()
    for node in nodes:
        w.int(ET_CHILD_TRANSFORM_START)
        w.transform(
            node.get("name", "mesh"),
            node.get("pos", (0, 0, 0)),
            node.get("rot", (0, 0, 0, 1)),
            node.get("scale", (1, 1, 1)),
        )
        w.tag_and_layer()
        if node.get("collider"):
            w.int(ET_MESH_COLLIDER)
            w.byte(1)  # convex
            w.mesh(*node["geom"], filter_tag=False)
        else:
            w.mesh(*node["geom"])
        w.int(ET_CHILD_TRANSFORM_END)

    # materials + textures live inside the root object's entry stream
    w.int(ET_MATERIALS)
    w.int(1)
    w.string("Material")
    w.string(material_name)
    w.int(2)  # property count
    w.string("_Color")
    w.int(0)
    w.floats((0.82, 0.84, 0.87, 1.0))
    w.string("_MainTex")
    w.int(4)
    w.int(0)          # texture index
    w.floats((1.0, 1.0))   # scale
    w.floats((0.0, 0.0))   # offset

    w.int(ET_TEXTURES)
    w.int(1)
    w.string("Squad/Parts/Demo/demoTex")
    w.int(0)

    w.int(ET_CHILD_TRANSFORM_END)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(bytes(w.buf))


# --- primitive geometry -----------------------------------------------------
def geom_cylinder(radius, height, segments=24, top_radius=None, cap=True):
    """Y-up cylinder / truncated cone centred at the origin."""
    top_radius = radius if top_radius is None else top_radius
    verts, normals, uvs, tris = [], [], [], []
    half = height / 2.0
    slope = (radius - top_radius) / max(height, 1e-6)
    for ring, (y, r) in enumerate(((half, top_radius), (-half, radius))):
        for i in range(segments):
            a = 2 * math.pi * i / segments
            x, z = math.cos(a) * r, math.sin(a) * r
            verts.append((x, y, z))
            n = (math.cos(a), slope, math.sin(a))
            length = math.sqrt(sum(c * c for c in n)) or 1.0
            normals.append((n[0] / length, n[1] / length, n[2] / length))
            uvs.append((i / segments, 1.0 - ring))
    for i in range(segments):
        j = (i + 1) % segments
        a, b, c, d = i, j, segments + i, segments + j
        tris.append((a, b, c))
        tris.append((b, d, c))
    if cap:
        if top_radius > 1e-4:
            top_center = len(verts)
            verts.append((0, half, 0))
            normals.append((0, 1, 0))
            uvs.append((0.5, 0.5))
            for i in range(segments):
                j = (i + 1) % segments
                tris.append((top_center, i, j))
        bottom_center = len(verts)
        verts.append((0, -half, 0))
        normals.append((0, -1, 0))
        uvs.append((0.5, 0.5))
        base = segments
        for i in range(segments):
            j = (i + 1) % segments
            tris.append((bottom_center, base + j, base + i))
    return verts, normals, uvs, tris


def geom_box(w, h, d):
    """Axis aligned box; every face gets its own vertices so normals are flat."""
    hx, hy, hz = w / 2, h / 2, d / 2
    corners = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
               (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    faces = [((0, 1, 2, 3), (0, 0, -1)), ((5, 4, 7, 6), (0, 0, 1)),
             ((4, 0, 3, 7), (-1, 0, 0)), ((1, 5, 6, 2), (1, 0, 0)),
             ((3, 2, 6, 7), (0, 1, 0)), ((4, 5, 1, 0), (0, -1, 0))]
    verts, normals, uvs, tris = [], [], [], []
    for quad, normal in faces:
        base = len(verts)
        for corner_index, corner in enumerate(quad):
            verts.append(corners[corner])
            normals.append(normal)
            uvs.append(((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))[corner_index])
        tris.append((base, base + 1, base + 2))
        tris.append((base, base + 2, base + 3))
    return verts, normals, uvs, tris


def geom_sphere(radius, segments=20, rings=12):
    verts, normals, uvs, tris = [], [], [], []
    for r in range(rings + 1):
        phi = math.pi * r / rings
        for s in range(segments):
            theta = 2 * math.pi * s / segments
            x = radius * math.sin(phi) * math.cos(theta)
            y = radius * math.cos(phi)
            z = radius * math.sin(phi) * math.sin(theta)
            verts.append((x, y, z))
            normals.append((x / radius, y / radius, z / radius))
            uvs.append((s / segments, 1.0 - r / rings))
    for r in range(rings):
        for s in range(segments):
            s2 = (s + 1) % segments
            a = r * segments + s
            b = r * segments + s2
            c = (r + 1) * segments + s
            d = (r + 1) * segments + s2
            tris.append((a, b, c))
            tris.append((b, d, c))
    return verts, normals, uvs, tris


# --- part shapes ------------------------------------------------------------
def shape(kind, a, b, c=0.0):
    if kind == "cyl":
        return geom_cylinder(a, b)
    if kind == "cone_up":
        return geom_cylinder(a, b, top_radius=c)
    if kind == "cone_down":
        return geom_cylinder(a, b, top_radius=c)
    if kind == "box":
        return geom_box(a, b, c or a)
    if kind == "sphere":
        return geom_sphere(a)
    raise ValueError(kind)


# name -> (kind, params, extra offset)
PART_SHAPES = {
    "Mark1-2Pod": ("capsule", (1.25, 1.15, 0.6)),
    "parachuteLarge": ("box", (0.35, 0.28, 0.35)),
    "decoupler1-2": ("cyl", (0.63, 0.22)),
    "fuelTank2-2": ("cyl", (1.25, 1.85)),
    "liquidEngine2-2": ("cone_down", (0.62, 1.55, 1.25)),
    "liquidEngine2": ("cone_down", (0.6, 1.55, 1.25)),
    "liquidEngine1-2": ("cone_down", (0.6, 0.55, 1.0)),
    "fuelTank": ("cyl", (0.63, 3.5)),
    "fuelTank1-2": ("cyl", (0.63, 1.85)),
    "pointyNoseConeB": ("cone_up", (0.35, 1.0, 0.05)),
    "radialDecoupler1-2": ("box", (0.18, 0.55, 0.16)),
    "R8winglet": ("box", (0.08, 0.85, 0.55)),
    "fuelLine": ("box", (0.06, 0.9, 0.06)),
    "ladder1": ("box", (0.22, 0.45, 0.08)),
    "landingLeg1-2": ("box", (0.16, 0.95, 0.16)),
    "launchClamp1": ("box", (0.22, 2.6, 0.22)),
    "solarPanels5": ("box", (0.55, 0.75, 0.06)),
    "ksp.r.largeBatteryPack": ("cyl", (0.4, 0.55)),
    "telescopicLadderBay": ("box", (0.3, 0.6, 0.3)),
}

DEMO_PART_FALLBACK = ("cyl", (0.4, 0.7))


def make_geometry(kind, params):
    if kind == "capsule":
        radius, height, top = params
        body = geom_cylinder(radius, height * 0.6, top_radius=radius)
        cap = geom_cylinder(radius, height * 0.4, top_radius=top * 0.4)
        verts, normals, uvs, tris = [], [], [], []
        for geo, y_off in ((body, -height * 0.2), (cap, height * 0.2)):
            base = len(verts)
            for v in geo[0]:
                verts.append((v[0], v[1] + y_off, v[2]))
            normals.extend(geo[1])
            uvs.extend(geo[2])
            for tri in geo[3]:
                tris.append((tri[0] + base, tri[1] + base, tri[2] + base))
        return verts, normals, uvs, tris
    return shape(kind, *params)


CFG_TEMPLATE = """PART
{{
    name = {name}
    module = Part
    author = craftViewer demo
    title = {name} (demo)
    rescaleFactor = 1
    scale = 1
    category = none
    MODEL
    {{
        model = Squad/Parts/Demo/{safe}/model
    }}
}}
"""


def build(out_dir: str, quiet: bool = False) -> None:
    gamedata = os.path.join(out_dir, "GameData")
    saves = os.path.join(out_dir, "saves", "Demo", "Ships")
    part_dir = os.path.join(gamedata, "Squad", "Parts", "Demo")

    names = sorted(PART_SHAPES)
    for name in names:
        kind, params = PART_SHAPES[name]
        verts, normals, uvs, tris = make_geometry(kind, params)
        target = os.path.join(part_dir, name)
        nodes = [{"name": "mesh", "geom": (verts, normals, uvs, tris)}]
        if name == "fuelTank":
            # real parts carry an invisible collision mesh; the viewer must skip it
            nodes.append({"name": "collider", "geom": geom_box(1.2, 3.4, 1.2), "collider": True})
        write_mu(os.path.join(target, "model.mu"), nodes)
        with open(os.path.join(target, f"{name}.cfg"), "w", encoding="utf-8") as fh:
            fh.write(CFG_TEMPLATE.format(name=name, safe=name))

    os.makedirs(os.path.join(saves, "VAB"), exist_ok=True)
    os.makedirs(os.path.join(saves, "SPH"), exist_ok=True)
    for source, target_dir in (("kerbalx.craft", "VAB"), ("test.craft", "SPH")):
        src = os.path.join(REPO, source)
        if os.path.isfile(src):
            shutil.copyfile(src, os.path.join(saves, target_dir, os.path.basename(source)))

    if not quiet:
        print(f"demo KSP tree written to {os.path.abspath(out_dir)}")
        print(f"  {len(names)} demo parts")
        print("run:  python craftviewer.py --ksp " + os.path.abspath(out_dir))


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", default=os.path.join(os.path.dirname(HERE), "demo"))
    args = p.parse_args(argv)
    build(args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
