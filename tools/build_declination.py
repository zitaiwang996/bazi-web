#!/usr/bin/env python3
"""Build docs/declination.js from the BGS World Magnetic Model web service.

Values are magnetic declination in degrees (east positive), computed for
2025-07-01 at sea level. Real work should still be checked against a local
recent geomagnetic map, but this is far better than guessing.
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "declination.js")
MODEL = "https://geomag.bgs.ac.uk/web_service/GMModels/wmm/2025.0"
DATE = "2025-07-01"

CITIES = [
    ("北京", 39.9042, 116.4074), ("天津", 39.0842, 117.2009), ("上海", 31.2304, 121.4737),
    ("重庆", 29.5630, 106.5516), ("石家庄", 38.0428, 114.5149), ("太原", 37.8706, 112.5489),
    ("呼和浩特", 40.8414, 111.7519), ("沈阳", 41.8057, 123.4315), ("长春", 43.8171, 125.3235),
    ("哈尔滨", 45.8038, 126.5350), ("南京", 32.0603, 118.7969), ("杭州", 30.2741, 120.1551),
    ("合肥", 31.8206, 117.2272), ("福州", 26.0745, 119.2965), ("南昌", 28.6820, 115.8579),
    ("济南", 36.6512, 117.1201), ("郑州", 34.7466, 113.6254), ("武汉", 30.5928, 114.3055),
    ("长沙", 28.2282, 112.9388), ("广州", 23.1291, 113.2644), ("南宁", 22.8170, 108.3665),
    ("海口", 20.0440, 110.1999), ("成都", 30.5728, 104.0668), ("贵阳", 26.6470, 106.6302),
    ("昆明", 24.8801, 102.8329), ("拉萨", 29.6520, 91.1721), ("西安", 34.3416, 108.9398),
    ("兰州", 36.0611, 103.8343), ("西宁", 36.6171, 101.7782), ("银川", 38.4872, 106.2309),
    ("乌鲁木齐", 43.8256, 87.6168), ("深圳", 22.5431, 114.0579), ("苏州", 31.2989, 120.5853),
    ("无锡", 31.4912, 120.3119), ("宁波", 29.8683, 121.5440), ("温州", 27.9938, 120.6994),
    ("厦门", 24.4798, 118.0894), ("泉州", 24.8741, 118.6757), ("青岛", 36.0671, 120.3826),
    ("大连", 38.9140, 121.6147), ("烟台", 37.4638, 121.4479), ("唐山", 39.6304, 118.1802),
    ("保定", 38.8740, 115.4646), ("洛阳", 34.6197, 112.4540), ("开封", 34.7972, 114.3076),
    ("徐州", 34.2058, 117.2841), ("常州", 31.8107, 119.9741), ("南通", 31.9802, 120.8943),
    ("绍兴", 30.0023, 120.5811), ("珠海", 22.2707, 113.5767), ("佛山", 23.0218, 113.1219),
    ("东莞", 23.0207, 113.7518), ("中山", 22.5170, 113.3928), ("惠州", 23.1115, 114.4162),
    ("汕头", 23.3541, 116.6822), ("湛江", 21.2707, 110.3594), ("桂林", 25.2736, 110.2900),
    ("三亚", 18.2528, 109.5119), ("绵阳", 31.4675, 104.6796), ("德阳", 31.1289, 104.3979),
    ("宜宾", 28.7513, 104.6308), ("泸州", 28.8717, 105.4433), ("遵义", 27.7256, 106.9272),
    ("大理", 25.6065, 100.2676), ("丽江", 26.8721, 100.2299), ("延安", 36.5853, 109.4898),
    ("宝鸡", 34.3610, 107.2370), ("天水", 34.5809, 105.7249), ("嘉峪关", 39.7729, 98.2891),
    ("敦煌", 40.1421, 94.6619), ("喀什", 39.4704, 75.9898), ("伊宁", 43.9166, 81.3243),
    ("库尔勒", 41.7259, 86.1746), ("包头", 40.6574, 109.8403), ("鄂尔多斯", 39.6086, 109.7812),
    ("大同", 40.0768, 113.3001), ("秦皇岛", 39.9354, 119.6005), ("锦州", 41.0952, 121.1270),
    ("吉林", 43.8378, 126.5496), ("齐齐哈尔", 47.3543, 123.9180), ("牡丹江", 44.5514, 129.6332),
    ("佳木斯", 46.7998, 130.3189), ("赣州", 25.8311, 114.9350), ("九江", 29.7051, 116.0019),
    ("宜昌", 30.6919, 111.2865), ("襄阳", 32.0090, 112.1220), ("岳阳", 29.3572, 113.1289),
    ("株洲", 27.8274, 113.1517), ("衡阳", 26.8938, 112.5720), ("柳州", 24.3146, 109.4282),
    ("北海", 21.4812, 109.1193), ("西双版纳", 22.0017, 100.7978), ("张家界", 29.1171, 110.4791),
    ("常德", 29.0316, 111.6985), ("淄博", 36.8135, 118.0550), ("潍坊", 36.7069, 119.1618),
    ("临沂", 35.1047, 118.3564), ("济宁", 35.4151, 116.5870), ("新乡", 35.3030, 113.9268),
    ("安阳", 36.1034, 114.3931), ("邯郸", 36.6256, 114.5391), ("沧州", 38.3045, 116.8387),
    ("廊坊", 39.5378, 116.6836),
]


def declination(lat, lon, date=DATE):
    query = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "date": date, "format": "json",
    })
    with urllib.request.urlopen(MODEL + "?" + query, timeout=20) as resp:
        data = json.load(resp)
    return data["geomagnetic-field-model-result"]["field-value"]["declination"]["value"]


def load_existing():
    """Read values already computed by a previous run, so we only query the extra year."""
    if not os.path.exists(OUT):
        return {}
    text = open(OUT, "r", encoding="utf-8").read()
    block = text.split("KANYU_REGION_DECL =", 1)
    if len(block) < 2:
        return {}
    body = block[1].split("};", 1)[0]
    found = {}
    for name, value in re.findall(r'"([^"]+)"\s*:\s*(-?\d+(?:\.\d+)?)', body):
        found[name] = float(value)
    return found


def main():
    geo = {name: [lat, lon] for name, lat, lon in CITIES}
    baseline = load_existing()

    def one(item):
        name, lat, lon = item
        if name not in baseline:
            return name, None, None
        for attempt in range(3):
            try:
                future = declination(lat, lon, "2030-07-01")
                return name, baseline[name], future
            except Exception:
                time.sleep(1.0 + attempt)
        return name, baseline[name], None

    values = {}
    rates = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        for name, v2025, v2030 in pool.map(one, CITIES):
            if v2025 is None:
                print("SKIP %-8s (no baseline)" % name)
                continue
            values[name] = round(v2025, 2)
            if v2030 is not None:
                rates[name] = round((v2030 - v2025) / 5.0, 4)
            print("%-8s 2025=%7.2f  2030=%s" % (name, v2025, ("%.2f" % v2030) if v2030 is not None else "n/a"))

    lines = [
        "// declination.js - 中国主要城市磁偏角（WMM2025 / BGS，2025-07-01，海平面）",
        "// DECL = 2025 年磁偏角度；RATE = 每年变化（度/年，WMM2025 外推）。",
        "// 东偏为正、西偏为负；任意年份 真北修正 = 罗盘读数 + DECL + RATE*(年份-2025)。",
        "window.KANYU_REGION_DECL = " + json.dumps(values, ensure_ascii=False, indent=2) + ";",
        "window.KANYU_REGION_RATE = " + json.dumps(rates, ensure_ascii=False, indent=2) + ";",
        "window.KANYU_REGION_GEO = " + json.dumps(geo, ensure_ascii=False, indent=2) + ";",
        "",
    ]
    with open(OUT, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    print("wrote %s (%d cities, %d rates)" % (os.path.normpath(OUT), len(values), len(rates)))


if __name__ == "__main__":
    main()
