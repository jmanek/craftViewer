# Is there anything of use in this repo?

Short answer: **yes, but not as code you can run.** The repository contains one
useful idea, one genuinely reusable file, and a lot of 2015-era scaffolding that
cannot execute in its current state. A working replacement viewer is in
[`craftviewer/`](craftviewer/README.md).

---

## 1. About the zip that will not open

There is **no rogue multi-megabyte string** anywhere in the source. The longest
lines in the whole repo are:

| line length | file | why |
| --- | --- | --- |
| 1.76 MB | `build/js/three.js.map` | source map for three.js r71 |
| 30 KB | `build/test.json` | one-line JSON dump |
| 12 KB | `build/js/part.js.map` | source map |
| ~3 KB | `424562.jpg` | a 533 KB JPEG, read as text |

What actually makes the archive hostile:

* **`node_modules` is committed to git** - 8 906 of the 8 949 tracked files,
  163 MB of the 167 MB checkout. GitHub's "Download ZIP" therefore hands you a
  ~170 MB archive that unpacks to a deep, redundant module tree.
* **Long paths.** 8 of those files are over 250 characters (worst: 320 chars,
  `node_modules/nw/node_modules/yargs/.../test-delayed-stream-auto-pause.js`).
  Windows' 260-character `MAX_PATH` limit, plus the "path too long" failure that
  Explorer's built-in zip handler reports as a generic corrupt/unsupported
  archive, is the most likely reason the zip will not open. Fixes: extract with
  7-Zip (it handles long paths), or enable
  `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled=1`.
* The `.git` folder is another 48 MB, and the repo has exactly one commit, so
  there is no history worth downloading.

Practical download: `git clone --depth 1 <url>` or download the zip and let
7-Zip extract it; either way delete `node_modules`, `.git` and `build/` if you
only want the sources. Nothing in the repository needs them.

## 2. What is actually useful

| file | verdict |
| --- | --- |
| `mu.py` (39 KB) | **The valuable one.** It is taniwha's `io_object_mu` `.mu` reader in pure Python (GPL-2+). It decodes the binary model format KSP uses: transform hierarchy, verts, UVs, normals, tangents, submeshes, materials, textures, colliders, animations. The copy here targets `.mu` **version 3**; the upstream version handles v4/v5 (the layout stock KSP parts actually use). |
| `muParser.py` | Thin wrapper that dumps a `.mu` to JSON. Python 2, and it serialises through `jsonpickle` with a per-node object, which is why... |
| `test.json` (2.5 MB) | ...the output is bloated: floats, duplicated UV/vert arrays, no index compaction. This is the prototype's data format. The new viewer emits roughly 3-5x smaller payloads and keeps triangle groups. |
| `craftToJSON.py` | Line-by-line regex rewriter that turns a `.craft` into JSON. It only works because the author picked a well-behaved file; quoted strings, `//` comments and repeated keys (every `link`, every `MODULE`) break it. Replaced by a real parser in `craftviewer/cv/cfg.py`. |
| `src/*.js` | The actual viewer: ~14 KB of ES6 (three.js r71 API: `THREE.Geometry`, `THREE.Face3`). Good as a reference for what the layout/UI should do; hardcoded to `E:/Program Files/Steam/.../GameData/Squad/` and to a file named `kerbal X.craft`. |
| `build/stockParts.json` | A 229-entry map of stock part name -> model path, generated from a 2015 Squad folder. Handy as a sanity check, obsolete next to a live `GameData` scan. |
| `kerbalx.craft`, `Kerbal X.craft`, `test.craft` | Real craft files, genuinely useful as fixtures. The new test suite parses `kerbalx.craft` (72 parts, 19 distinct part types). |
| `424562.jpg` | 533 KB desktop wallpaper used as the viewer background. |
| `mu.pyc` | Python 2 bytecode of `mu.py`; dead weight. |

## 3. Why it cannot run as shipped

Verified against the checkout:

1. `node_modules` is a **Linux** build of nw.js (`libffmpegsumo.so`, a bare `nw`
   binary, no `nw.exe`, no DLLs, no `locales/*.pak` for Windows), so it is dead
   weight on Windows and cannot start the app there.
2. Declared dependencies are missing from the tree: `async` and `glob` are in
   `package.json` but not in `node_modules`; `jsonpickle` is imported by
   `muParser.py` but not declared anywhere. `npm start` fails immediately.
3. `src/part.js` uses Babel "stage 0" array comprehensions
   (`[for (v of vec) parseFloat(v)]`), a proposal that was dropped years ago; the
   pinned `grunt-babel@5` is the only thing that ever understood it.
4. `src/main.js` hardcodes a Windows path to the author's Steam library, and
   `craft.parse(process.cwd() + '/kerbal X.craft')` looks for a file name that
   does not exist (the repo has `kerbalx.craft` and `Kerbal X.craft`).
5. `src/fileManager.js` calls `PythonShell.run` without ever requiring
   `python-shell`, and only globs `GameData/Squad`.
6. CI is decorative: `.github/workflows/npm-publish-github-packages.yml` runs
   `npm ci` then `npm test`, and `package.json` defines
   `"test": "echo \"Error: no test specified\" && exit 1"` - it can only fail.
   `index.html` is the package `main`, which is also what `npm publish` would
   try to publish.
7. Python 2 syntax throughout (`print x`, `StringIO`); there is no `requirements.txt`.

## 4. What the replacement does differently

`craftviewer/` (new, in this branch) keeps the good idea - read `.mu` files
straight out of the user's own `GameData`, no asset redistribution - and fixes
the pipeline:

* **Real ConfigNode parser** (`cv/cfg.py`): quoted values, `//` and `/* */`
  comments, repeated keys preserved, nested nodes, BOM handling.
* **Real GameData index** (`cv/gamedata.py`): walks all of `GameData`, tolerates
  case-mismatched paths (common on Linux installs), understands `MODEL { model,
  position, rotation, scale }`, `rescaleFactor`, `scale`, and reports parts whose
  `.mu` is missing instead of crashing.
* **`.mu` v5 support** via the upstream `mu.py`, with two local changes: raw
  Unity coordinates (the imported Blender conversion is disabled) and the
  left->right handed conversion done once in Python, so the browser gets
  three.js-ready data. Collision meshes are skipped, materials become colours,
  triangle groups are kept.
* **Disk cache** for converted models (`craftviewer/cache/models/*.json`), keyed
  by path + size + mtime.
* **A server instead of nw.js**: `http.server` on `127.0.0.1:8420`, no Electron,
  no npm, no 170 MB download. Drop it in the KSP folder and double-click
  `run.bat`, or build a single `craftviewer.exe` with `build_exe.bat`.
* **Modern three.js r186** with `BufferGeometry` (r71's `Geometry` is long gone),
  OrbitControls, hover picking with part names, wireframe, grid, PNG screenshot,
  and a part count / missing-part warning panel.
* **18 unit tests** with nothing but the standard library, including a generated
  demo install so the whole path (cfg -> craft -> mu -> JSON -> HTTP) is
  exercised without owning KSP.

Known gaps are listed at the end of `craftviewer/README.md` (mainly: no DDS
texture decoding yet, no deployed-animation poses).

## 5. Suggested next steps for the repo itself

1. `git rm -r --cached node_modules`, add `node_modules/` to `.gitignore`, and
   drop `mu.pyc`, `build/js/three.js*`, the `.map` files and the 533 KB
   wallpaper. That takes the repository from ~170 MB to ~300 KB.
2. Delete or fix the GitHub Packages workflow; with a `main` of `index.html` and
   a failing `npm test` it can only produce red builds.
3. If the old prototype is kept for reference, move it into `legacy/` so the new
   viewer is what people find first.
4. Texture support is the single biggest visual upgrade available: parse the
   `.dds` files referenced by each material (`_MainTex`) and DXT1/DXT5-decode
   them in the browser. That, plus the already-parsed `.mu` material colours,
   would make stock parts look nearly like the game.
