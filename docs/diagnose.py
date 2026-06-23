import re
with open("index.html", "r", encoding="utf-8") as f:
    c = f.read()
scripts = list(re.finditer(r"<script>(.*?)</script>", c, re.DOTALL))
print("Total script blocks:", len(scripts))
for i, s in enumerate(scripts):
    content = s.group(1)[:100]
    print(f"Script {i}: starts with: {repr(content[:60])}")
last = scripts[-1].group(1)
print("Last script length:", len(last))
print("Last has bzBtn:", str("bzBtn" in last))
print("Last has switchTab:", str("window.switchTab" in last))
# Check what's around doQimen function
print("doQimen defined:", str("function doQimen" in last))
print("doBazi defined:", str("function doBazi" in last))
