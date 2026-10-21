"""Indexing GameData so a craft's part names can be turned into .mu files.

The craftViewer prototype hardcoded ``E:/Program Files/Steam/...`` and only
looked at ``GameData/Squad``.  This module walks the whole GameData tree (so
mods work), follows ``MODEL`` blocks properly and is case tolerant - KSP
installs on Linux are full of mismatched capitalisation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from . import cfg

_VEC_DEFAULT = (0.0, 0.0, 0.0)
_SCALE_DEFAULT = (1.0, 1.0, 1.0)


@dataclass
class ModelRef:
    path: str
    position: tuple[float, float, float] = _VEC_DEFAULT
    rotation: tuple[float, float, float, float] = (0.0, 0.0, 0.0, 1.0)
    scale: tuple[float, float, float] = _SCALE_DEFAULT
    exists: bool = True


@dataclass
class PartInfo:
    name: str
    title: str
    cfg_path: str
    models: list[ModelRef] = field(default_factory=list)
    rescale: float = 1.0
    scale: float = 1.0
    radius: float = 1.25
    category: str = ""

    @property
    def model_path(self) -> str | None:
        for m in self.models:
            if m.exists:
                return m.path
        return None

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "title": self.title,
            "cfg": self.cfg_path,
            "rescale": self.rescale,
            "scale": self.scale,
            "radius": self.radius,
            "category": self.category,
            "models": [
                {
                    "path": m.path,
                    "exists": m.exists,
                    "position": list(m.position),
                    "rotation": list(m.rotation),
                    "scale": list(m.scale),
                }
                for m in self.models
            ],
        }


def _floats(raw: str | None) -> list[float]:
    if not raw:
        return []
    out = []
    for chunk in raw.replace("(", " ").replace(")", " ").replace(",", " ").split():
        try:
            out.append(float(chunk))
        except ValueError:
            pass
    return out


def _vec3(raw: str | None, default=_VEC_DEFAULT):
    v = _floats(raw)
    return (v[0], v[1], v[2]) if len(v) >= 3 else default


def _quat(raw: str | None):
    v = _floats(raw)
    return (v[0], v[1], v[2], v[3]) if len(v) >= 4 else (0.0, 0.0, 0.0, 1.0)


class _FSIndex:
    """Case-insensitive path resolution with a per-directory cache."""

    def __init__(self):
        self._listings: dict[str, dict[str, str]] = {}

    def _listing(self, directory: str) -> dict[str, str]:
        cached = self._listings.get(directory)
        if cached is not None:
            return cached
        mapping: dict[str, str] = {}
        try:
            with os.scandir(directory) as it:
                for entry in it:
                    mapping.setdefault(entry.name.lower(), entry.name)
        except OSError:
            pass
        self._listings[directory] = mapping
        return mapping

    def resolve(self, path: str) -> str | None:
        path = os.path.normpath(path)
        if os.path.exists(path):
            return path
        drive, rest = os.path.splitdrive(path)
        parts = [p for p in rest.replace("\\", "/").split("/") if p]
        cur = drive + os.sep if drive else os.sep
        for i, part in enumerate(parts):
            name = self._listing(cur).get(part.lower())
            if name is None:
                return None
            cur = os.path.join(cur, name)
            if i == len(parts) - 1:
                return cur
            if not os.path.isdir(cur):
                return None
        return None


class GameData:
    def __init__(self, ksp_root: str):
        self.root = os.path.abspath(ksp_root)
        self.gamedata = os.path.join(self.root, "GameData")
        self.parts: dict[str, PartInfo] = {}
        self.cfg_count = 0
        self.missing_models: list[str] = []
        self._fs = _FSIndex()

    # -- scanning ---------------------------------------------------------
    def scan(self, progress=None) -> "GameData":
        self.parts.clear()
        self.missing_models.clear()
        files: list[str] = []
        for dirpath, dirnames, filenames in os.walk(self.gamedata):
            dirnames.sort()
            for fn in filenames:
                if fn.lower().endswith(".cfg"):
                    files.append(os.path.join(dirpath, fn))
        self.cfg_count = len(files)
        for i, path in enumerate(files):
            if progress and i % 100 == 0:
                progress(i, len(files))
            try:
                root = cfg.parse_file(path)
            except Exception:
                continue
            for node in root.walk():
                if node.name.lower() != "part":
                    continue
                info = self._make_part_info(node, path)
                if info and info.name:
                    self.parts.setdefault(info.name.lower(), info)
        return self

    def _make_part_info(self, node: cfg.Node, cfg_path: str) -> PartInfo | None:
        name = node.get("name")
        if not name:
            return None
        info = PartInfo(
            name=name,
            title=node.get("title") or name,
            cfg_path=cfg_path,
            rescale=node.get_float("rescaleFactor", 1.0) or 1.0,
            scale=node.get_float("scale", 1.0) or 1.0,
            radius=node.get_float("radius", 1.25) or 1.25,
            category=node.get("category") or "",
        )
        if info.rescale <= 0:
            info.rescale = 1.0
        if info.scale <= 0:
            info.scale = 1.0

        for model_node in node.nodes("MODEL"):
            ref = model_node.get("model")
            if not ref:
                continue
            info.models.append(
                ModelRef(
                    path=self._resolve_model(ref, cfg_path),
                    position=_vec3(model_node.get("position")),
                    rotation=_quat(model_node.get("rotation")),
                    scale=_vec3(model_node.get("scale"), _SCALE_DEFAULT),
                    exists=False,
                )
            )
        if not info.models:
            # legacy cfgs: "mesh = model" / "model = model.mu", relative to cfg
            ref = node.get("mesh") or node.get("model")
            if ref:
                info.models.append(ModelRef(path=self._resolve_model(ref, cfg_path), exists=False))

        for m in info.models:
            m.exists = bool(m.path) and os.path.isfile(m.path)
            if not m.exists:
                self.missing_models.append(f"{info.name}: {m.path}")
        return info

    def _resolve_model(self, ref: str, cfg_path: str) -> str | None:
        ref = ref.strip().strip('"').replace("\\", "/")
        if not ref:
            return None
        if not ref.lower().endswith(".mu"):
            ref += ".mu"

        candidates: list[str] = []
        if ref.lower().startswith("gamedata/"):
            candidates.append(os.path.join(self.root, ref))
        candidates.append(os.path.join(self.gamedata, ref))
        if "/" not in ref:
            candidates.append(os.path.join(os.path.dirname(cfg_path), ref))
            candidates.append(os.path.join(os.path.dirname(cfg_path), "model.mu"))
        candidates.append(os.path.join(self.root, ref))
        seen = set()
        for cand in candidates:
            norm = os.path.normpath(cand)
            if norm in seen:
                continue
            seen.add(norm)
            hit = self._fs.resolve(norm)
            if hit and os.path.isfile(hit):
                return os.path.abspath(hit)
        return os.path.normpath(candidates[0]) if candidates else None

    # -- lookup -----------------------------------------------------------
    def get(self, name: str) -> PartInfo | None:
        info = self.parts.get(name.lower())
        if info:
            return info
        # KSP allows "Squad/part" style names in some places; also try the tail
        tail = name.rsplit("/", 1)[-1]
        return self.parts.get(tail.lower())

    def stats(self) -> dict:
        return {
            "root": self.root,
            "cfgFiles": self.cfg_count,
            "parts": len(self.parts),
            "missingModels": len(self.missing_models),
            "missingExamples": self.missing_models[:5],
        }
