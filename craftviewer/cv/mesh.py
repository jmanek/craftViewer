"""Convert KSP ``.mu`` models into compact JSON the browser can render.

``muio.py`` is a vendored copy of taniwha's ``mu.py`` (GPL-2+, see that file).
It converts vectors/quaternions into Blender's convention on read; we want the
raw Unity values instead, so :class:`RawMu` overrides those four readers and the
left-hand -> right-hand conversion happens once, here, when the JSON is built.

Coordinate conversion (Unity left handed -> three.js right handed):
    position  (x, y, z)        -> (x, y, -z)
    quaternion(x, y, z, w)     -> (-x, -y, z, w)
    triangle winding is already reversed by muio, which is exactly what the
    Z reflection needs, so indices are copied as-is.
"""

from __future__ import annotations

import hashlib
import json
import os

from . import coords, muio


class RawMu(muio.Mu):
    """muio.Mu without the Blender coordinate juggling."""

    def read_vector(self):  # type: ignore[override]
        return self.read_float(3)

    def read_quaternion(self):  # type: ignore[override]
        return self.read_float(4)

    def read_tangent(self):  # type: ignore[override]
        return self.read_float(4)


def _is_collider(name: str) -> bool:
    low = name.lower()
    return "collider" in low or "proxy" in low or low in ("col", "collision")


def _mesh_data(mesh, material_indices) -> dict | None:
    if not mesh or not mesh.verts:
        return None
    verts: list[float] = []
    for v in mesh.verts:
        verts.extend(coords.point(v))

    uvs: list[float] | None = None
    if len(mesh.uvs) == len(mesh.verts):
        uvs = []
        for uv in mesh.uvs:
            uvs.extend([round(float(uv[0]), 5), round(float(uv[1]), 5)])

    normals: list[float] | None = None
    if len(mesh.normals) == len(mesh.verts):
        normals = []
        for n in mesh.normals:
            normals.extend(coords.point(n))

    indices: list[int] = []
    submeshes: list[dict] = []
    vert_count = len(mesh.verts)
    for si, tris in enumerate(mesh.submeshes):
        start = len(indices)
        for tri in tris:
            a, b, c = tri
            if a >= vert_count or b >= vert_count or c >= vert_count:
                continue
            indices.extend((a, b, c))
        if indices:
            mat = 0
            if material_indices and si < len(material_indices):
                mat = int(material_indices[si])
            submeshes.append({"start": start, "count": len(indices) - start, "material": mat})

    if not indices:
        return None
    data = {"v": verts, "i": indices, "s": submeshes}
    if uvs:
        data["uv"] = uvs
    if normals:
        data["n"] = normals
    return data


def _node_data(obj, out_nodes: list[dict], depth: int = 0) -> dict | None:
    if depth > 32:
        return None
    tr = getattr(obj, "transform", None)
    if tr is None:
        return None
    name = tr.name or ""
    node = {
        "name": name,
        "pos": coords.point(tr.localPosition),
        "rot": coords.quaternion(tr.localRotation),
        "scale": [round(float(s), 6) for s in tr.localScale],
    }
    if _is_collider(name) or getattr(obj, "collider", None) is not None:
        node["collider"] = True

    mesh = None
    materials = None
    shared = getattr(obj, "shared_mesh", None)
    if shared is not None and getattr(shared, "verts", None):
        renderer = getattr(obj, "renderer", None)
        materials = getattr(renderer, "materials", None)
        mesh = _mesh_data(shared, materials)
    else:
        skinned = getattr(obj, "skinned_mesh_renderer", None)
        if skinned is not None and getattr(skinned, "mesh", None) is not None:
            mesh = _mesh_data(skinned.mesh, getattr(skinned, "materials", None))
    if mesh:
        node["mesh"] = mesh

    children = []
    for child in getattr(obj, "children", []) or []:
        child_node = _node_data(child, out_nodes, depth + 1)
        if child_node:
            children.append(child_node)
    if children:
        node["children"] = children

    if "mesh" not in node and not children:
        return None
    return node


def _material_data(mu) -> list[dict]:
    mats: list[dict] = []
    textures = [t.name for t in getattr(mu, "textures", []) or []]
    for mat in getattr(mu, "materials", []) or []:
        colors = getattr(mat, "colorProperties", {}) or {}
        color = colors.get("_Color")
        spec = colors.get("_SpecColor")
        entry: dict = {
            "name": getattr(mat, "name", "") or "",
            "shader": getattr(mat, "shaderName", "") or "",
        }
        chosen = color if color else spec
        if chosen:
            entry["color"] = [round(float(c), 4) for c in chosen[:4]]
        tex_props = getattr(mat, "textureProperties", {}) or {}
        main = tex_props.get("_MainTex")
        if main is not None:
            idx = int(getattr(main, "index", -1))
            entry["tex"] = idx
            if 0 <= idx < len(textures):
                entry["texName"] = textures[idx]
        mats.append(entry)
    return mats


def model_to_dict(path: str) -> dict:
    reader = RawMu()
    try:
        try:
            result = reader.read(path)
        except EOFError as exc:
            raise ValueError(
                f"{os.path.basename(path)}: truncated file, not a KSP .mu model"
            ) from exc
        if result is None:
            raise ValueError(
                f"{os.path.basename(path)}: not a readable .mu file "
                f"(magic={getattr(reader, 'magic', '?')} version={getattr(reader, 'version', '?')})"
            )
        nodes: list[dict] = []
        root = _node_data(reader.obj, nodes)
        if root is None:
            raise ValueError(f"{os.path.basename(path)}: no renderable meshes")
        return {
            "name": reader.name,
            "version": reader.version,
            "root": root,
            "materials": _material_data(reader),
        }
    finally:
        fh = getattr(reader, "file", None)
        if fh is not None:
            try:
                fh.close()
            except OSError:
                pass


def model_key(path: str) -> str:
    try:
        st = os.stat(path)
        token = f"{os.path.abspath(path)}|{st.st_size}|{int(st.st_mtime)}"
    except OSError:
        token = os.path.abspath(path)
    return hashlib.sha1(token.encode("utf-8")).hexdigest()[:20]


class ModelCache:
    """Parsed .mu files, cached in memory and on disk."""

    def __init__(self, cache_dir: str, enabled: bool = True):
        self.cache_dir = cache_dir
        self.enabled = enabled
        self._mem: dict[str, dict] = {}
        if enabled:
            os.makedirs(cache_dir, exist_ok=True)

    def _disk_path(self, key: str) -> str:
        return os.path.join(self.cache_dir, key + ".json")

    def get(self, path: str) -> dict:
        key = model_key(path)
        cached = self._mem.get(key)
        if cached is not None:
            return cached
        if self.enabled:
            disk = self._disk_path(key)
            if os.path.isfile(disk):
                try:
                    with open(disk, "r", encoding="utf-8") as fh:
                        data = json.load(fh)
                    self._mem[key] = data
                    return data
                except (OSError, ValueError):
                    pass
        try:
            data = model_to_dict(path)
        except Exception as exc:  # keep the viewer alive for one broken mod part
            data = {"error": f"{os.path.basename(path)}: {exc}", "name": os.path.basename(path)}
        self._mem[key] = data
        if self.enabled and "error" not in data:
            try:
                with open(self._disk_path(key), "w", encoding="utf-8") as fh:
                    json.dump(data, fh, separators=(",", ":"))
            except OSError:
                pass
        return data
