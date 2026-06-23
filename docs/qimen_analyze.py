import sys, re
with open("qimen.js", "r", encoding="utf-8") as f:
    c = f.read()
# Find renderQimen
idx = c.find("function renderQimen")
if idx >= 0:
    end = c.find("function ", idx+1)
    if end < 0: end = idx + 50000
    lines = c[idx:end].split("\n")
    print(f"renderQimen: {len(lines)} lines")
    # Print lines with color/style/class/qm
    for i, line in enumerate(lines):
        s = line.strip()
        if not s: continue
        if any(x in s.lower() for x in ["color", "style=", "class=", "qm-", "font"]):
            print(f"L{i}: {s[:200]}")
