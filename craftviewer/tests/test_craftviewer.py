"""Tests that need nothing but the standard library.

    python -m unittest discover -s tests -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))

from cv import cfg, coords, craft, gamedata, mesh  # noqa: E402
from cv.paths import iter_craft_files  # noqa: E402
from cv.server import ViewerState, make_server  # noqa: E402

import make_demo_gamedata  # noqa: E402

KERBAL_X = os.path.join(os.path.dirname(ROOT), "kerbalx.craft")
TEST_CRAFT = os.path.join(os.path.dirname(ROOT), "test.craft")


class ConfigNodeTests(unittest.TestCase):
    def test_values_children_and_repeats(self):
        text = """
        // comment
        ship = My Rocket
        PART
        {
            part = fuelTank_1234
            pos = 1, 2, 3
            link = a
            link = b
            MODULE
            {
                name = ModuleEngines
                key = value with spaces
            }
        }
        PART
        {
            part = engine_5678
        }
        """
        root = cfg.parse(text)
        self.assertEqual(root.get("ship"), "My Rocket")
        parts = root.nodes("PART")
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[0].getall("link"), ["a", "b"])
        self.assertEqual(parts[0].node("MODULE").get("key"), "value with spaces")
        self.assertEqual(parts[0].get("pos"), "1, 2, 3")

    def test_quoted_strings_and_inline_comments(self):
        root = cfg.parse('name = "quoted value"\n// trailing comment\nx = 1 // nope\n')
        self.assertEqual(root.get("name"), "quoted value")
        self.assertEqual(root.get("x"), "1")

    def test_kerbal_x_craft_parses(self):
        parsed = craft.parse_craft(KERBAL_X)
        self.assertEqual(parsed.ship, "Kerbal X")
        self.assertEqual(len(parsed.parts), 72)
        first = parsed.parts[0]
        self.assertEqual(first.name, "Mark1-2Pod")
        self.assertAlmostEqual(first.pos[1], 21.67437, places=4)
        self.assertEqual(first.rot, (0.0, 0.0, 0.0, 1.0))
        self.assertIn("ModuleCommand", first.modules)
        self.assertEqual(len({p.name for p in parsed.parts}), 19)


class CoordinateTests(unittest.TestCase):
    def test_point_and_quaternion(self):
        self.assertEqual(coords.point((1, 2, 3)), [1.0, 2.0, -3.0])
        self.assertEqual(coords.quaternion((0, 0, 0, 1)), [-0.0, -0.0, 0.0, 1.0])
        # 90 deg about Unity X becomes -90 deg about three.js X
        q = coords.euler_deg_quaternion((90, 0, 0))
        self.assertAlmostEqual(q[0], -0.7071068, places=5)
        self.assertAlmostEqual(q[3], 0.7071068, places=5)


class DemoDataMixin:
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="cvtest-")
        cls.ksp = os.path.join(cls.tmp, "KSP")
        make_demo_gamedata.build(cls.ksp, quiet=True)


class GameDataTests(DemoDataMixin, unittest.TestCase):
    def test_scan_finds_parts_and_models(self):
        gd = gamedata.GameData(self.ksp).scan()
        self.assertEqual(len(gd.parts), 19)
        info = gd.get("Mark1-2Pod")
        self.assertIsNotNone(info)
        self.assertTrue(info.model_path.endswith("model.mu"))
        self.assertTrue(os.path.isfile(info.model_path))
        self.assertEqual(gd.stats()["missingModels"], 0)

    def test_case_insensitive_lookup_of_model_file(self):
        gd = gamedata.GameData(self.ksp).scan()
        info = gd.get("Mark1-2Pod")
        # rename the folder on disk to break exact-case matching
        old = os.path.dirname(info.model_path)
        new = os.path.join(os.path.dirname(old), "MARK1-2POD")
        os.rename(old, new)
        try:
            gd2 = gamedata.GameData(self.ksp).scan()
            info2 = gd2.get("Mark1-2Pod")
            self.assertTrue(info2.model_path and os.path.isfile(info2.model_path))
        finally:
            os.rename(new, old)

    def test_unknown_part_is_flagged_in_craft(self):
        state = ViewerState(self.ksp, os.path.join(self.tmp, "cache"))
        craft_files = state.crafts()
        sph = [c for c in craft_files if c["kind"] == "SPH"]
        if not sph:
            self.skipTest("no SPH craft in demo data")
        data = state.load_craft(sph[0]["path"])
        self.assertEqual(data["partCount"], 1)
        self.assertEqual(data["unknownParts"], ["mk1pod"])
        self.assertTrue(data["parts"][0]["unknown"])

    def test_craft_files_discovered(self):
        found = list(iter_craft_files(self.ksp))
        self.assertTrue(any(path.endswith("kerbalx.craft") for path, _, _ in found))


class MeshTests(DemoDataMixin, unittest.TestCase):
    def test_mu_roundtrip_geometry(self):
        path = os.path.join(
            self.ksp, "GameData", "Squad", "Parts", "Demo", "fuelTank", "model.mu"
        )
        data = mesh.model_to_dict(path)
        self.assertNotIn("error", data, data.get("error"))
        self.assertEqual(data["version"], 5)
        root = data["root"]
        self.assertIn("children", root)
        node = root["children"][0]
        m = node["mesh"]
        self.assertGreater(len(m["v"]), 0)
        self.assertEqual(len(m["v"]) % 3, 0)
        self.assertEqual(len(m["i"]) % 3, 0)
        self.assertTrue(all(0 <= idx < len(m["v"]) // 3 for idx in m["i"]))
        self.assertEqual(sum(g["count"] for g in m["s"]), len(m["i"]))
        self.assertEqual(len(m["uv"]), len(m["v"]) // 3 * 2)
        self.assertTrue(data["materials"])
        self.assertTrue(all(isinstance(c, float) for c in m["v"]))

    def test_model_cache_roundtrip(self):
        cache = mesh.ModelCache(os.path.join(self.tmp, "models"))
        path = os.path.join(
            self.ksp, "GameData", "Squad", "Parts", "Demo", "fuelTank", "model.mu"
        )
        first = cache.get(path)
        cache2 = mesh.ModelCache(os.path.join(self.tmp, "models"))
        second = cache2.get(path)
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))

    def test_non_mu_file_reports_error(self):
        bad = os.path.join(self.tmp, "nonsense.mu")
        with open(bad, "wb") as fh:
            fh.write(b"\x00\x01\x02\x03")
        with self.assertRaises(ValueError):
            mesh.model_to_dict(bad)
        # the cache layer turns that into a soft error the UI can show
        data = mesh.ModelCache(os.path.join(self.tmp, "models2")).get(bad)
        self.assertIn("error", data)


class ServerTests(DemoDataMixin, unittest.TestCase):
    def setUp(self):
        self.state = ViewerState(self.ksp, os.path.join(self.tmp, "cache"))
        self.server = make_server(self.state, "127.0.0.1", 0)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)

    def get(self, path):
        url = f"http://127.0.0.1:{self.port}{path}"
        with urllib.request.urlopen(url, timeout=20) as res:
            return res.status, res.read()

    def get_json(self, path):
        status, body = self.get(path)
        return status, json.loads(body)

    def test_root_serves_viewer(self):
        status, body = self.get("/")
        self.assertEqual(status, 200)
        self.assertIn(b"craftViewer", body)

    def test_static_assets(self):
        for path in ("/static/app.js", "/static/style.css", "/static/vendor/three.module.js"):
            status, body = self.get(path)
            self.assertEqual(status, 200, path)
            self.assertGreater(len(body), 100, path)

    def test_info_endpoint(self):
        status, info = self.get_json("/api/info")
        self.assertEqual(status, 200)
        self.assertEqual(info["stats"]["parts"], 19)
        self.assertGreaterEqual(len(info["crafts"]), 1)
        self.assertTrue(info["crafts"][0]["path"].endswith(".craft"))

    def test_craft_endpoint_and_models(self):
        _, info = self.get_json("/api/info")
        target = [c for c in info["crafts"] if c["file"] == "kerbalx.craft"][0]
        status, data = self.get_json("/api/craft?path=" + urllib.request.quote(target["path"]))
        self.assertEqual(status, 200)
        self.assertEqual(data["partCount"], 72)
        self.assertEqual(data["resolvedParts"], 72)
        self.assertEqual(data["unknownParts"], [])
        part = next(p for p in data["parts"] if p["name"] == "Mark1-2Pod")
        self.assertEqual(len(part["pos"]), 3)
        self.assertAlmostEqual(part["pos"][2], -0.02792645, places=5)
        self.assertEqual(len(part["models"]), 1)
        status, model = self.get_json(part["models"][0]["url"])
        self.assertEqual(status, 200)
        self.assertNotIn("error", model["models"][0]["data"])

    def test_model_endpoint_unknown_part(self):
        status, data = self.get_json("/api/model?name=definitelyNotARealPart")
        self.assertEqual(status, 200)
        self.assertTrue(data.get("unknown"))

    def test_craft_outside_ksp_is_rejected(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.get("/api/craft?path=" + urllib.request.quote("/etc/passwd"))
        self.assertEqual(ctx.exception.code, 403)

    def test_path_traversal_blocked(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.get("/static/../../cv/server.py")
        self.assertIn(ctx.exception.code, (403, 404))


if __name__ == "__main__":
    unittest.main()
