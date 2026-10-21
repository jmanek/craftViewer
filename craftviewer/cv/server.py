"""Tiny local HTTP server: static viewer + a JSON API over the KSP install."""

from __future__ import annotations

import json
import mimetypes
import os
import posixpath
import sys
import threading
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import coords, craft as craft_mod
from .gamedata import GameData
from .mesh import ModelCache
from .paths import iter_craft_files

HERE = os.path.dirname(os.path.abspath(__file__))
if getattr(sys, "frozen", False):  # PyInstaller one-file exe
    STATIC_DIR = os.path.join(getattr(sys, "_MEIPASS", HERE), "static")
else:
    STATIC_DIR = os.path.join(os.path.dirname(HERE), "static")


class ViewerState:
    """Everything the HTTP layer needs; shared across request threads."""

    def __init__(self, ksp_root: str, cache_dir: str, extra_craft_dirs=None, use_cache=True):
        self.root = os.path.abspath(ksp_root)
        self.cache_dir = cache_dir
        self.extra_craft_dirs = list(extra_craft_dirs or [])
        self.gamedata = GameData(self.root).scan()
        self.models = ModelCache(os.path.join(cache_dir, "models"), enabled=use_cache)
        self.lock = threading.Lock()
        self._crafts: list[dict] | None = None
        self.craft_cache: dict[str, tuple[float, dict]] = {}

    # -- crafts -----------------------------------------------------------
    def crafts(self, refresh: bool = False) -> list[dict]:
        with self.lock:
            if self._crafts is not None and not refresh:
                return self._crafts
            items = []
            for path, save, kind in iter_craft_files(self.root, self.extra_craft_dirs):
                entry = {
                    "path": path,
                    "file": os.path.basename(path),
                    "save": save,
                    "kind": kind or "?",
                }
                try:
                    entry["mtime"] = os.stat(path).st_mtime
                except OSError:
                    entry["mtime"] = 0
                items.append(entry)
            items.sort(key=lambda e: (e["save"].lower(), e["kind"], e["file"].lower()))
            self._crafts = items
            return items

    def load_craft(self, path: str) -> dict:
        path = os.path.abspath(path)
        try:
            mtime = os.stat(path).st_mtime
        except OSError:
            mtime = 0
        cached = self.craft_cache.get(path)
        if cached and cached[0] == mtime:
            return cached[1]
        parsed = craft_mod.parse_craft(path)
        data = self._decorate(parsed)
        self.craft_cache[path] = (mtime, data)
        return data

    def _decorate(self, parsed: craft_mod.Craft) -> dict:
        data = parsed.as_dict()
        unknown = set()
        for out in data["parts"]:
            # craft transforms are Unity space; hand the browser three.js space
            out["pos"] = coords.point(out["pos"])
            out["rot"] = coords.quaternion(out["rot"])
        for part, out in zip(parsed.parts, data["parts"]):
            info = self.gamedata.get(part.name)
            if info is None:
                out["unknown"] = True
                unknown.add(part.name)
                out["scale"] = 1.0
                out["models"] = []
                continue
            out["title"] = info.title
            out["scale"] = info.rescale * info.scale
            out["models"] = [
                {
                    "url": "/api/model?name=" + urllib.parse.quote(info.name),
                    "exists": m.exists,
                    "path": m.path,
                    "position": coords.point(m.position),
                    "rotation": coords.euler_deg_quaternion(m.rotation),
                    "scale": list(m.scale),
                }
                for m in info.models
            ]
            out["cfg"] = info.cfg_path
        data["unknownParts"] = sorted(unknown)
        data["resolvedParts"] = len(data["parts"]) - len(unknown)
        return data

    def model_for(self, name: str) -> dict:
        info = self.gamedata.get(name)
        if info is None:
            return {"name": name, "unknown": True, "models": []}
        out = {"name": info.name, "title": info.title, "rescale": info.rescale, "scale": info.scale, "models": []}
        for ref in info.models:
            if not ref.exists:
                continue
            out["models"].append(
                {
                    "data": self.models.get(ref.path),
                    "position": coords.point(ref.position),
                    "rotation": coords.euler_deg_quaternion(ref.rotation),
                    "scale": list(ref.scale),
                }
            )
        return out


def _json_bytes(payload) -> bytes:
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    server_version = "craftViewer/1.0"
    state: ViewerState  # injected by make_server

    # quieter default logging
    def log_message(self, fmt, *args):  # noqa: D401
        if self.server.verbose:  # type: ignore[attr-defined]
            super().log_message(fmt, *args)

    def do_GET(self):  # noqa: N802
        try:
            self._route()
        except BrokenPipeError:
            pass
        except Exception as exc:  # pragma: no cover - defensive
            self._send_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    # -- helpers ----------------------------------------------------------
    def _send_bytes(self, data: bytes, content_type: str, status=HTTPStatus.OK, cache: str = "no-store"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, payload, status=HTTPStatus.OK):
        self._send_bytes(_json_bytes(payload), "application/json; charset=utf-8", status)

    def _send_file(self, path: str, cache="no-store"):
        try:
            with open(path, "rb") as fh:
                data = fh.read()
        except OSError:
            self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
            return
        ctype, _ = mimetypes.guess_type(path)
        self._send_bytes(data, ctype or "application/octet-stream", cache=cache)

    # -- routing ----------------------------------------------------------
    def _route(self):
        parsed = urllib.parse.urlparse(self.path)
        route = urllib.parse.unquote(parsed.path)
        query = urllib.parse.parse_qs(parsed.query)
        state = self.state

        if route in ("/", "/index.html"):
            self._send_file(os.path.join(STATIC_DIR, "index.html"))
        elif route.startswith("/static/"):
            rel = posixpath.normpath(route[len("/static/"):]).lstrip("/")
            full = os.path.abspath(os.path.join(STATIC_DIR, rel))
            if not full.startswith(os.path.abspath(STATIC_DIR) + os.sep):
                self._send_json({"error": "bad path"}, HTTPStatus.FORBIDDEN)
                return
            cache = "public, max-age=86400" if "/vendor/" in full.replace(os.sep, "/") else "no-store"
            self._send_file(full, cache=cache)
        elif route == "/api/info":
            self._send_json(self._info(refresh=bool(query.get("refresh"))))
        elif route == "/api/craft":
            self._craft(query)
        elif route == "/api/model":
            name = (query.get("name") or [""])[0]
            if not name:
                self._send_json({"error": "name required"}, HTTPStatus.BAD_REQUEST)
                return
            self._send_json(state.model_for(name))
        elif route == "/api/part":
            name = (query.get("name") or [""])[0]
            info = state.gamedata.get(name)
            self._send_json(info.as_dict() if info else {"error": "unknown part", "name": name})
        else:
            self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def _info(self, refresh=False) -> dict:
        state = self.state
        crafts = state.crafts(refresh=refresh)
        for entry in crafts:
            try:
                entry["partCount"] = state.load_craft(entry["path"])["partCount"]
            except Exception:
                entry["partCount"] = None
        return {
            "root": state.root,
            "gameData": os.path.join(state.root, "GameData"),
            "stats": state.gamedata.stats(),
            "crafts": crafts,
            "warnings": self._warnings(),
        }

    def _warnings(self) -> list[str]:
        state = self.state
        warns = []
        if state.gamedata.missing_models:
            warns.append(
                f"{len(state.gamedata.missing_models)} part configs point at a .mu file that is missing "
                f"(first: {state.gamedata.missing_models[0]})"
            )
        if not state.gamedata.parts:
            warns.append("No parts found under GameData - is this really the KSP folder?")
        return warns

    def _craft(self, query):
        state = self.state
        raw = (query.get("path") or [""])[0]
        if not raw:
            self._send_json({"error": "path required"}, HTTPStatus.BAD_REQUEST)
            return
        path = os.path.abspath(raw)
        allowed = [state.root] + state.extra_craft_dirs
        if not any(_inside(path, root) for root in allowed):
            known = {c["path"] for c in state.crafts()}
            if path not in known:
                self._send_json({"error": "path outside the KSP folder"}, HTTPStatus.FORBIDDEN)
                return
        if not os.path.isfile(path):
            self._send_json({"error": "craft not found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            self._send_json(state.load_craft(path))
        except Exception as exc:
            self._send_json({"error": f"{type(exc).__name__}: {exc}"}, HTTPStatus.INTERNAL_SERVER_ERROR)


def _inside(path: str, root: str) -> bool:
    try:
        return os.path.commonpath([os.path.abspath(path), os.path.abspath(root)]) == os.path.abspath(root)
    except ValueError:
        return False


class ViewerServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler_cls, state: ViewerState, verbose=False):
        self.state = state
        self.verbose = verbose
        super().__init__(addr, handler_cls)


def make_server(state: ViewerState, host: str, port: int, verbose: bool = False):
    handler = type("BoundHandler", (Handler,), {"state": state})
    return ViewerServer((host, port), handler, state, verbose=verbose)


def serve(state: ViewerState, host: str, port: int, verbose: bool = False, open_browser: bool = True):
    server = None
    last_error = None
    for candidate in range(port, port + 25):
        try:
            server = make_server(state, host, candidate, verbose=verbose)
            break
        except OSError as exc:
            last_error = exc
    if server is None:
        raise SystemExit(f"Could not bind to {host}:{port}-{port + 24}: {last_error}")

    actual_port = server.server_address[1]
    url_host = "127.0.0.1" if host in ("0.0.0.0", "", "::") else host
    url = f"http://{url_host}:{actual_port}/"
    print(f"\n  craftViewer serving {state.root}")
    print(f"  {state.gamedata.stats()['parts']} parts indexed from {state.gamedata.cfg_count} cfg files")
    print(f"  open {url}\n")
    if open_browser:
        try:
            import webbrowser

            threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        except Exception:
            pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  bye")
    finally:
        server.server_close()
    return actual_port
