"""Tolerant parser for KSP ConfigNode text (.cfg and .craft files).

The original craftViewer project parsed these files line-by-line with a pile of
regexes.  That works for the handful of hand-picked files it was tested with but
falls over on quoted strings, trailing comments and repeated keys.  This module
implements a small tokenizer + recursive parser that keeps *every* value of a
repeated key (KSP files happily repeat ``link``, ``MODULE``, ``PART`` ...).

Usage::

    node = parse_file("GameData/Squad/Parts/FuelTank/fuelTank.cfg")
    node.get("name")
    node.nodes("PART")
"""

from __future__ import annotations

import io
import re


class Node:
    """A single ConfigNode: a name, key/value pairs and child nodes."""

    __slots__ = ("name", "values", "children")

    def __init__(self, name: str = ""):
        self.name = name
        self.values: dict[str, list[str]] = {}
        self.children: list["Node"] = []

    # -- values -----------------------------------------------------------
    def get(self, key: str, default: str | None = None) -> str | None:
        vals = self.values.get(key)
        return vals[0] if vals else default

    def getall(self, key: str) -> list[str]:
        return self.values.get(key, [])

    def has(self, key: str) -> bool:
        return key in self.values

    def get_float(self, key: str, default: float = 0.0) -> float:
        raw = self.get(key)
        if raw is None:
            return default
        try:
            return float(raw)
        except ValueError:
            return default

    # -- children ---------------------------------------------------------
    def nodes(self, name: str) -> list["Node"]:
        want = name.lower()
        return [c for c in self.children if c.name.lower() == want]

    def node(self, name: str) -> "Node | None":
        found = self.nodes(name)
        return found[0] if found else None

    def first(self, *names: str) -> "Node | None":
        for n in names:
            child = self.node(n)
            if child is not None:
                return child
        return None

    def walk(self):
        """Yield this node and every descendant (depth first)."""
        yield self
        for child in self.children:
            yield from child.walk()

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Node {self.name} values={list(self.values)} children={len(self.children)}>"


# ---------------------------------------------------------------------------
# tokenizer
# ---------------------------------------------------------------------------

_WORD_STOP = set(" \t\r\n{}=")


class _Tok:
    __slots__ = ("kind", "value")

    def __init__(self, kind: str, value: str = ""):
        self.kind = kind      # "word", "str", "{", "}", "=", "nl"
        self.value = value

    def __repr__(self):  # pragma: no cover
        return f"{self.kind}:{self.value}"


def _tokenize(text: str) -> list[_Tok]:
    toks: list[_Tok] = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch in " \t":
            i += 1
        elif ch == "\r":
            i += 1
        elif ch == "\n":
            toks.append(_Tok("nl"))
            i += 1
        elif ch == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                i += 1
        elif ch == "/" and i + 1 < n and text[i + 1] == "*":
            end = text.find("*/", i + 2)
            i = n if end < 0 else end + 2
        elif ch == "{":
            toks.append(_Tok("{"))
            i += 1
        elif ch == "}":
            toks.append(_Tok("}"))
            i += 1
        elif ch == "=":
            toks.append(_Tok("="))
            i += 1
        elif ch in "\"'":
            quote = ch
            i += 1
            start = i
            while i < n and text[i] != quote:
                if text[i] == "\\" and i + 1 < n:
                    i += 2
                else:
                    i += 1
            toks.append(_Tok("str", text[start:i]))
            i += 1  # closing quote (or EOF)
        else:
            start = i
            while i < n and text[i] not in _WORD_STOP:
                i += 1
            toks.append(_Tok("word", text[start:i]))
    return toks


# ---------------------------------------------------------------------------
# parser
# ---------------------------------------------------------------------------

class _Parser:
    def __init__(self, toks: list[_Tok]):
        self.toks = toks
        self.i = 0

    def peek(self, skip_nl: bool = False) -> _Tok | None:
        j = self.i
        while skip_nl and j < len(self.toks) and self.toks[j].kind == "nl":
            j += 1
        return self.toks[j] if j < len(self.toks) else None

    def next(self) -> _Tok | None:
        if self.i >= len(self.toks):
            return None
        tok = self.toks[self.i]
        self.i += 1
        return tok

    def skip_nl(self) -> None:
        while self.i < len(self.toks) and self.toks[self.i].kind == "nl":
            self.i += 1

    def parse_body(self, node: Node) -> None:
        """Fill ``node`` until the matching closing brace (or EOF)."""
        while True:
            tok = self.next()
            if tok is None:
                return
            if tok.kind == "nl":
                continue
            if tok.kind == "}":
                return
            if tok.kind == "{":
                # bare "{ " after a key that is a node: rare/invalid, skip
                continue
            if tok.kind in ("word", "str"):
                key = tok.value
                nxt = self.peek(skip_nl=True)
                if nxt is not None and nxt.kind == "=":
                    # consume "=" and every token on the same line
                    self.next()  # "="
                    values: list[str] = []
                    while True:
                        nxt = self.peek()
                        if nxt is None or nxt.kind == "nl" or nxt.kind in ("{", "}"):
                            break
                        self.next()
                        values.append(nxt.value)
                    node.values.setdefault(key, []).append(" ".join(values))
                elif nxt is not None and nxt.kind == "{":
                    self.skip_nl()
                    self.next()  # "{"
                    child = Node(key)
                    self.parse_body(child)
                    node.children.append(child)
                # bare words with neither "=" nor "{" are ignored
            # ignore other token kinds


def parse(text: str) -> Node:
    """Parse ConfigNode text into a synthetic root Node."""
    if text.startswith("\ufeff"):
        text = text[1:]
    root = Node("__root__")
    _Parser(_tokenize(text)).parse_body(root)
    return root


def parse_file(path: str) -> Node:
    with io.open(path, "r", encoding="utf-8", errors="replace") as fh:
        return parse(fh.read())


_BAD_FILENAME = re.compile(r"[^A-Za-z0-9_.\-]+")


def safe_name(name: str) -> str:
    return _BAD_FILENAME.sub("_", name)


if __name__ == "__main__":  # pragma: no cover - manual smoke test
    import sys

    def dump(node: Node, indent: int = 0) -> None:
        pad = "  " * indent
        print(f"{pad}{node.name} {dict(node.values) if node.values else ''}")
        for child in node.children:
            dump(child, indent + 1)

    dump(parse_file(sys.argv[1]))
