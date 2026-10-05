#!/usr/bin/env python3
"""Bundle the MIT-licensed `magvar` (WMM2025) package into one browser file.

Source: https://github.com/dpyeates/magvar  (npm: magvar@2.2.0)
The package ships as three CommonJS files; this wraps them with a tiny module
loader so docs/magvar.js can be dropped straight into a static page.
"""

import os
import urllib.request

BASE = "https://unpkg.com/magvar@2.2.0/src/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "magvar.js")
FILES = [("./WMMCOF2025", "WMMCOF2025.js"), ("./utils", "utils.js"), ("./magvar", "magvar.js")]


def fetch(name):
    with urllib.request.urlopen(BASE + name, timeout=40) as resp:
        return resp.read().decode("utf-8")


def main():
    parts = [(mid, fetch(name)) for mid, name in FILES]
    out = [
        "// magvar - World Magnetic Model 2025-2030, browser bundle",
        "// MIT License. (c) Darren Yeates. Source: https://github.com/dpyeates/magvar",
        "// Usage: Magvar.magvar(latitude, longitude, altitudeKm, decimalYear) -> declination (deg)",
        "(function () {",
        "  var __m = {}, __c = {};",
        "  function __r(id) {",
        "    if (__c[id]) return __c[id].exports;",
        "    var m = __c[id] = { exports: {} };",
        "    __m[id](m, m.exports, __r);",
        "    return m.exports;",
        "  }",
    ]
    for mid, text in parts:
        out.append("  __m[%r] = function (module, exports, require) {" % mid)
        out.append(text)
        out.append("  };")
    out.append("  window.Magvar = __r('./magvar');")
    out.append("})();")
    with open(OUT, "w", encoding="utf-8") as handle:
        handle.write("\n".join(out) + "\n")
    print("wrote %s (%d bytes)" % (os.path.normpath(OUT), os.path.getsize(OUT)))


if __name__ == "__main__":
    main()
