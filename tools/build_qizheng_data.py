#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bundle the 七政四余 election tables into docs/qizheng_data.js.

Source: qizheng-siyu/data/election_rules.json plus the 二十八宿起度 table
quoted in qizheng-siyu/references/天星择日原则.md (section 6.2).

    python tools/build_qizheng_data.py
"""

import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = r"C:\Users\princetai1\.codex\skills\qizheng-siyu\data\election_rules.json"
OUT = os.path.join(ROOT, "docs", "qizheng_data.js")

# 二十八宿起始黄道度（以戌宫 0 度为起算）—— 见 references/天星择日原则.md 6.2
XIU_START = {
    "角木": 187.2, "亢金": 200.0, "氐土": 208.9, "房日": 225.2,
    "心月": 230.6, "尾火": 237.0, "箕水": 255.6, "斗木": 266.3,
    "牛金": 290.1, "女土": 298.0, "虚日": 308.9, "危月": 318.3,
    "室火": 333.6, "壁水": 349.4, "奎木": 358.3, "娄金": 15.9,
    "胃土": 26.3, "昴日": 41.1, "毕月": 53.2, "觜火": 69.0,
    "参水": 70.0, "井木": 81.8, "鬼金": 112.3, "柳土": 115.2,
    "星日": 130.5, "张月": 136.4, "翼火": 151.4, "轸水": 170.1,
}


def main():
    with io.open(SRC, encoding="utf-8") as handle:
        rules = json.load(handle)

    payload = {"rules": rules, "xiuStart": XIU_START}
    text = (
        "// 七政四余择日 · 数据表（由 tools/build_qizheng_data.py 生成，勿手改）\n"
        "window.QIZHENG_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print("wrote %s (%d bytes)" % (OUT, len(text.encode("utf-8"))))


if __name__ == "__main__":
    main()
