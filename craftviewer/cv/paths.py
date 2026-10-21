"""Locating the KSP install and the craft files inside it.

The viewer is meant to be dropped straight into the KSP root folder, so the
first thing it tries is "is there a GameData folder next to me?".  Failing that
it walks up the tree, then looks at a few well known Steam / GOG / KSP store
install locations, then at ``--ksp`` / ``KSP_DIR``.
"""

from __future__ import annotations

import os
import sys

GAMEDATA = "GameData"

_STEAM_GUESSES = [
    r"C:\Program Files (x86)\Steam\steamapps\common\Kerbal Space Program",
    r"C:\Program Files\Steam\steamapps\common\Kerbal Space Program",
    r"D:\SteamLibrary\steamapps\common\Kerbal Space Program",
    r"E:\SteamLibrary\steamapps\common\Kerbal Space Program",
    r"C:\GOG Games\Kerbal Space Program",
    r"C:\Program Files\Squad\Kerbal Space Program",
    os.path.expanduser("~/Library/Application Support/Steam/steamapps/common/Kerbal Space Program"),
    os.path.expanduser("~/.steam/steam/steamapps/common/Kerbal Space Program"),
    os.path.expanduser("~/.local/share/Steam/steamapps/common/Kerbal Space Program"),
]


def looks_like_ksp(path: str) -> bool:
    return bool(path) and os.path.isdir(os.path.join(path, GAMEDATA))


def _walk_up(start: str) -> str | None:
    cur = os.path.abspath(start)
    while True:
        if looks_like_ksp(cur):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            return None
        cur = parent


def app_dir() -> str:
    """Folder the viewer lives in (the exe's folder when frozen)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


def find_ksp_root(explicit: str | None = None, base: str | None = None) -> tuple[str | None, list[str]]:
    """Return ``(root, tried)``; root is None when nothing was found.

    ``base`` is the directory the viewer itself was started from (the folder
    holding craftviewer.py, i.e. hopefully the KSP root).
    """
    tried: list[str] = []

    candidates: list[str] = []
    if explicit:
        candidates.append(explicit)
    env = os.environ.get("KSP_DIR") or os.environ.get("KSP_ROOT")
    if env:
        candidates.append(env)

    # the viewer itself, its parent (craftviewer/ inside the KSP root), and cwd
    here = os.path.abspath(base) if base else app_dir()
    candidates += [here, os.path.dirname(here), os.getcwd()]
    candidates += _STEAM_GUESSES

    for cand in candidates:
        if not cand:
            continue
        tried.append(cand)
        if looks_like_ksp(cand):
            return os.path.abspath(cand), tried
        if os.path.isdir(cand):
            up = _walk_up(cand)
            if up:
                return up, tried
    return None, tried


def game_data_dir(root: str) -> str:
    return os.path.join(root, GAMEDATA)


# ---------------------------------------------------------------------------
# craft files
# ---------------------------------------------------------------------------

_SHIP_DIRS = ("VAB", "SPH")
_SHIP_ROOT = ("Ships",)


def iter_craft_files(root: str, extra_dirs: list[str] | None = None):
    """Yield ``(path, save_name, kind)`` for every craft file we can find.

    KSP layout: ``saves/<save>/Ships/{VAB,SPH}/<craft>.craft``.  Older versions
    dropped the ``Ships`` level, some people keep crafts in
    ``saves/<save>/Ships/VAB/subfolder``, so we just walk.
    """
    roots: list[tuple[str, str]] = []
    saves = os.path.join(root, "saves")
    if os.path.isdir(saves):
        for save in sorted(os.listdir(saves)):
            save_dir = os.path.join(saves, save)
            if not os.path.isdir(save_dir):
                continue
            for base in ("Ships", ""):
                d = os.path.join(save_dir, base) if base else save_dir
                if os.path.isdir(d):
                    roots.append((d, save))
    for extra in extra_dirs or []:
        if os.path.isdir(extra):
            roots.append((extra, os.path.basename(os.path.normpath(extra)) or "external"))

    seen = set()
    for base, save_name in roots:
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames.sort()
            for fn in sorted(filenames):
                if not fn.lower().endswith(".craft"):
                    continue
                full = os.path.abspath(os.path.join(dirpath, fn))
                if full in seen:
                    continue
                seen.add(full)
                kind = "VAB" if os.sep + "VAB" + os.sep in full else ("SPH" if os.sep + "SPH" + os.sep in full else "")
                yield full, save_name, kind


def safe_join(root: str, relative: str) -> str | None:
    """Resolve ``relative`` inside ``root`` or return None if it escapes."""
    root_abs = os.path.abspath(root)
    target = os.path.abspath(os.path.join(root_abs, relative))
    try:
        if os.path.commonpath([root_abs, target]) != root_abs:
            return None
    except ValueError:
        return None
    return target
