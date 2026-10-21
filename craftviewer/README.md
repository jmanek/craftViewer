# craftViewer (rewrite)

A working replacement for the half-finished prototype in the repository root: it
opens Kerbal Space Program `.craft` files and renders the actual part models out
of your `GameData` folder in a browser window.

* finds the KSP install by itself (it is meant to sit in the KSP root folder)
* reads `.craft` and `.cfg` files with a real ConfigNode parser
* reads `.mu` part models directly (verts, UVs, normals, material colours,
  MODEL offsets/rotations/scales, multiple submeshes, skips collision meshes)
* converts Unity's left-handed space to three.js' right-handed space in one place
* draws a hoverable part list, wireframe toggle, grid, and PNG screenshots
* degrades gracefully: unknown or broken parts show as amber boxes instead of
  killing the scene, and one broken mod part does not stop the rest

Requires Python 3.8+ (standard library only - no pip installs) and any WebGL2
browser.

## Run it

Options, in the order you will probably want them:

| how | what happens |
| --- | --- |
| double-click `run.bat` inside your KSP folder | starts and opens the browser |
| `python craftviewer.py` | same, run from anywhere |
| `craftviewer.exe` (built with `build_exe.bat`) | same, no Python needed |

The viewer looks for a `GameData` folder in, in order: the folder it lives in,
its parent, the current directory, `%KSP_DIR%`, `--ksp PATH`, and a few common
Steam/GOG install paths. If it finds nothing it prints exactly what it tried.

```
python craftviewer.py                          # auto-detect
python craftviewer.py --ksp "D:\Games\KSP"
python craftviewer.py --craft "C:\crafts\my ship.craft"
python craftviewer.py --port 9000 --host 0.0.0.0 --no-browser
```

Everything is local: the server binds to `127.0.0.1` by default, nothing is
uploaded, and models are read straight from disk.

### Building the .exe

On a Windows machine with Python installed:

```
build_exe.bat
```

That produces `dist\craftviewer.exe` (single file, no Python required
afterwards). Copy it next to `KSP.exe` / `KSP_x64.exe` and run it.

### Trying it without KSP

The repo does not ship Squad's models (they are Squad's), so `tools/make_demo_gamedata.py`
generates a small fake install - 19 generated `.mu` parts that match the part
names used by the bundled `kerbalx.craft`, plus the craft files:

```
python tools/make_demo_gamedata.py     # writes craftviewer/demo/
python craftviewer.py --ksp demo
```

## Layout

```
craftviewer/
  craftviewer.py            entry point / argument parsing
  run.bat, build_exe.bat    Windows launchers
  cv/
    cfg.py                  ConfigNode tokenizer + parser (repeated keys kept)
    craft.py                .craft -> parts (name, pos, rot, mirror, modules)
    gamedata.py             GameData scan: part name -> cfg -> .mu, MODULE offsets
    mesh.py                 .mu -> compact JSON (verts/uvs/normals/indices/groups)
    muio.py                 vendored mu.py from taniwha's io_object_mu (GPL-2+)
    coords.py               Unity (LHS, Y up) -> three.js (RHS, Y up)
    server.py               HTTP server + /api/*, static file serving
  static/                   the viewer itself (three.js r186 + OrbitControls)
  tests/                    unittest suite, no third-party packages
  tools/make_demo_gamedata.py
  demo/                     generated demo install (git-ignored)
```

### API

* `GET /api/info` - KSP root, part/cfg counts, craft list, warnings
* `GET /api/craft?path=<absolute .craft path>` - parts with resolved model URLs
* `GET /api/model?name=<part name>` - parsed `.mu` JSON (disk-cached)
* `GET /api/part?name=<part name>` - the raw part config details

### Tests

```
cd craftviewer
python -m unittest discover -s tests -v
```

18 tests: ConfigNode edge cases, kerbalx.craft, coordinate conversion, GameData
scanning (including case-insensitive paths), `.mu` geometry validity, the disk
cache, every HTTP endpoint, and path traversal rejection.

## Things that still differ from the game

* **No textures.** The `.mu` format stores material properties, but KSP keeps the
  actual images in `.dds`/`.tga`/`.png` files next to the model (or inside
  `GameData/.../*.dds` for stock parts). Textures are currently rendered as flat
  material colours. Decoding `.dds` (DXT1/5) and mapping `_MainTex` names is the
  obvious next step.
* **No `MODEL` subpart animations** (deployed solar panels, landing legs, cargo
  bays). Each `.mu` is shown in its authored pose.
* **Axis conventions.** KSP craft transforms are converted with a Z reflection,
  which is exact. `MODEL` rotation values in `.cfg` files are Euler angles in
  Unity's ZXY order; they are approximated as XYZ. They are almost always zero
  in practice, so this only matters for the rare part that uses them.
* **Only `GameData` roots are indexed.** Parts loaded from `PartDatabase.cfg`
  caches or from KSP 1.12's `GameData/Squad/Parts/*/partInfo` shims are not
  searched; the real `.cfg` files are what get read.
* **Very large craft may be slow to load** the first time: each distinct part
  model is converted once, then cached in `craftviewer/cache/models/`.
