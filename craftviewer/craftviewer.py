#!/usr/bin/env python3
"""craftViewer - view Kerbal Space Program .craft files in your browser.

Drop the folder next to KSP.exe (or anywhere inside the KSP install) and run::

    python craftviewer.py

It finds the KSP root automatically, indexes every part under GameData and
starts a small local web server.  Nothing is uploaded anywhere; models are read
straight out of your GameData folder.

Options::

    --ksp PATH        KSP install folder (the one containing GameData)
    --craft FILE      extra .craft file or folder to show in the list
    --port N          port to listen on (default 8420, tries the next ones)
    --host ADDR       bind address (default 127.0.0.1; use 0.0.0.0 for LAN)
    --no-browser      do not open a browser window
    --no-cache        re-read every .mu instead of using the on-disk cache
    --verbose         log every HTTP request
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cv.paths import find_ksp_root, looks_like_ksp  # noqa: E402
from cv.server import ViewerState, serve  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="craftviewer",
        description="View KSP .craft files (and the .mu part models behind them) in a browser.",
    )
    p.add_argument("--ksp", help="KSP install folder, the one containing GameData")
    p.add_argument("--craft", action="append", default=[], metavar="PATH",
                   help="extra .craft file or folder to list (repeatable)")
    p.add_argument("--port", type=int, default=8420)
    p.add_argument("--host", default="127.0.0.1",
                   help="bind address (127.0.0.1 = this machine only, 0.0.0.0 = LAN)")
    p.add_argument("--no-browser", action="store_true", help="do not open a browser")
    p.add_argument("--no-cache", action="store_true", help="ignore cached model conversions")
    p.add_argument("--cache-dir", default=None, help="where converted models are cached")
    p.add_argument("--verbose", action="store_true")
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)

    # folder holding craftviewer.py / the exe - normally the KSP root
    base = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, "frozen", False) else __file__))
    cache_dir = args.cache_dir or os.path.join(base, "cache")

    root, tried = find_ksp_root(args.ksp, base)
    if root is None:
        print("Could not find a Kerbal Space Program install (no GameData folder found).\n")
        print("Looked in:")
        for path in tried:
            print(f"  - {path}")
        print("\nPoint it at your install explicitly, e.g.:")
        print('  python craftviewer.py --ksp "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Kerbal Space Program"')
        print("\nIf you only want to test with the bundled demo data:")
        print("  python tools/make_demo_gamedata.py")
        print("  python craftviewer.py --ksp demo")
        return 2

    if not looks_like_ksp(root):
        print(f"{root} does not look like a KSP folder")
        return 2

    extra_dirs = []
    for extra in args.craft:
        full = os.path.abspath(extra)
        if os.path.isdir(full):
            extra_dirs.append(full)
        elif os.path.isfile(full):
            # a single file: expose its folder, the filter below keeps the list tidy
            extra_dirs.append(os.path.dirname(full))
        else:
            print(f"warning: {extra} does not exist, ignoring")

    print(f"Indexing parts in {os.path.join(root, 'GameData')} ...")

    def progress(done, total):
        pct = int(done * 100 / max(total, 1))
        sys.stdout.write(f"\r  {done}/{total} cfg files ({pct}%)")
        sys.stdout.flush()

    state = ViewerState(root, cache_dir, extra_dirs, use_cache=not args.no_cache)
    progress(state.gamedata.cfg_count, state.gamedata.cfg_count)
    sys.stdout.write("\n")
    stats = state.gamedata.stats()
    print(f"  {stats['parts']} parts indexed")
    if stats["missingModels"]:
        print(f"  {stats['missingModels']} part models missing (those parts render as boxes)")

    serve(state, args.host, args.port, verbose=args.verbose, open_browser=not args.no_browser)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
