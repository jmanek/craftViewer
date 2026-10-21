"""Reading KSP ``.craft`` files into plain Python data.

A craft file is just a ConfigNode document: a header (ship/version/type/size)
followed by one ``PART`` node per part, and modules nested inside each part.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from . import cfg

_ID_SUFFIX = re.compile(r"_\d+$")
_NUM_SPLIT = re.compile(r"[,\s()]+")


def parse_floats(raw: str | None) -> list[float]:
    """Parse ``"0.1,2,3"`` / ``"(0.1, 2, 3)"`` style vectors."""
    if not raw:
        return []
    out = []
    for chunk in _NUM_SPLIT.split(raw.strip()):
        if not chunk:
            continue
        try:
            out.append(float(chunk))
        except ValueError:
            pass
    return out


def _vec(raw: str | None, default=(0.0, 0.0, 0.0)) -> tuple[float, float, float]:
    vals = parse_floats(raw)
    if len(vals) >= 3:
        return (vals[0], vals[1], vals[2])
    return default


def _quat(raw: str | None) -> tuple[float, float, float, float]:
    vals = parse_floats(raw)
    if len(vals) >= 4:
        return (vals[0], vals[1], vals[2], vals[3])
    return (0.0, 0.0, 0.0, 1.0)


def part_name(raw: str) -> str:
    """``Mark1-2Pod_4294634394`` -> ``Mark1-2Pod``."""
    return _ID_SUFFIX.sub("", raw.strip())


@dataclass
class Part:
    index: int
    internal_name: str      # as written in the file (with the _NNNN suffix)
    name: str               # config name, e.g. "Mark1-2Pod"
    pos: tuple[float, float, float]
    rot: tuple[float, float, float, float]
    mirror: tuple[float, float, float] = (1.0, 1.0, 1.0)
    sym_method: str = ""
    stage: int = 0
    modules: list[str] = field(default_factory=list)
    craft_path: str = ""

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "id": self.internal_name,
            "pos": list(self.pos),
            "rot": list(self.rot),
            "mirror": list(self.mirror),
            "sym": self.sym_method,
            "stage": self.stage,
            "modules": self.modules,
        }


@dataclass
class Craft:
    path: str
    ship: str
    version: str
    craft_type: str
    description: str
    size: tuple[float, float, float]
    parts: list[Part]

    def as_dict(self) -> dict:
        return {
            "path": self.path,
            "ship": self.ship,
            "version": self.version,
            "type": self.craft_type,
            "description": self.description,
            "size": list(self.size),
            "partCount": len(self.parts),
            "parts": [p.as_dict() for p in self.parts],
        }


def parse_craft(path: str) -> Craft:
    root = cfg.parse_file(path)
    parts: list[Part] = []
    for node in root.nodes("PART"):
        raw_name = node.get("part") or node.get("name") or ""
        if not raw_name:
            continue
        modules = [m.get("name", "") for m in node.nodes("MODULE")]
        sym = node.get("sym") or ""
        if not sym:
            sym = node.get("symMethod") or ""
        try:
            stage = int(node.get("istg", "0") or 0)
        except ValueError:
            stage = 0
        parts.append(
            Part(
                index=len(parts),
                internal_name=raw_name,
                name=part_name(raw_name),
                pos=_vec(node.get("pos")),
                rot=_quat(node.get("rot")),
                mirror=_vec(node.get("mir"), (1.0, 1.0, 1.0)),
                sym_method=sym,
                stage=stage,
                modules=[m for m in modules if m],
                craft_path=path,
            )
        )
    return Craft(
        path=path,
        ship=root.get("ship") or "",
        version=root.get("version") or "",
        craft_type=root.get("type") or "",
        description=(root.get("description") or "").replace("\u00a8\u00a8", "\n\n"),
        size=_vec(root.get("size")),
        parts=parts,
    )


if __name__ == "__main__":  # pragma: no cover
    import sys

    c = parse_craft(sys.argv[1])
    print(f"{c.ship} ({c.craft_type}) - {len(c.parts)} parts, size {c.size}")
    for p in c.parts[:5]:
        print(f"  {p.name:24s} pos={p.pos} rot={p.rot} modules={p.modules[:2]}")
