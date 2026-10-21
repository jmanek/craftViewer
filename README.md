# craftViewer

An easy way to view KSP `.craft` files (and the real part models behind them)
outside of the game.

**The working viewer lives in [`craftviewer/`](craftviewer/README.md).**

```bat
cd craftviewer
run.bat
```

Drop that folder in your KSP install, double-click `run.bat`, and it finds
`GameData` by itself. `build_exe.bat` produces a standalone `craftviewer.exe`
that needs no Python. Try it without KSP first with
`python tools/make_demo_gamedata.py && python craftviewer.py --ksp demo`.

Everything in the repository root is the original 2015 prototype: an nw.js app
with a Python 2 `.mu` converter that no longer runs (`node_modules` is a Linux
nw.js build and is missing two declared dependencies). It is kept for reference;
see [`EVALUATION.md`](EVALUATION.md) for a file-by-file assessment of what is
reusable, why the archive is ~170 MB, and what to do about the repo itself.

Relies on the [.mu importer](https://github.com/taniwha-qf/io_object_mu)
(GPL-2+) by taniwha, vendored in `craftviewer/cv/muio.py`.
