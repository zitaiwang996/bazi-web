#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bundle the 些子法 skill tables into docs/xiezi_data.js for the static site.

Rules/table data is read straight from the skill JSON so the site never
hand-copies a number. Re-run after the skill data changes:

    python tools/build_xiezi_data.py
"""

import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SKILL = r"C:\Users\princetai1\.codex\skills\xiezi-fa\data"
OUT = os.path.join(ROOT, "docs", "xiezi_data.js")

TABLES = [
    ("bagua", "bagua.json"),
    ("shan24", "shan24.json"),
    ("gua64", "gua64.json"),
    ("ganzhiGua", "ganzhi_gua.json"),
    ("ganzhiRike", "ganzhi_rike.json"),
    ("yunFen", "yun_fen.json"),
    ("rike", "rike.json"),
    ("rikeJi", "rike_ji.json"),
    ("jiaogou", "jiaogou.json"),
    ("anqian", "anqian.json"),
    ("dimen", "dimen.json"),
    ("heluo", "heluo.json"),
]


def load(name):
    with io.open(os.path.join(SKILL, name), encoding="utf-8") as handle:
        return json.load(handle)


def main():
    payload = {}
    for key, filename in TABLES:
        path = os.path.join(SKILL, filename)
        if not os.path.exists(path):
            print("skip (missing): %s" % filename)
            continue
        payload[key] = load(filename)

    text = (
        "// 些子法择日 · 数据表（由 tools/build_xiezi_data.py 从 xiezi-fa skill 生成，勿手改）\n"
        "window.XIEZI_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print("wrote %s (%d bytes, %d tables)" % (OUT, len(text.encode("utf-8")), len(payload)))


if __name__ == "__main__":
    main()
