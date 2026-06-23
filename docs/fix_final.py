import sys
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace ONLY the SECOND occurrence (renderBaziSimple) - first one is already fixed
old_marker = '<h3>\U0001f3ee \u516b\u5b57\u547d\u76d8</h3>'
# Find the second occurrence
first_pos = content.find(old_marker)
if first_pos >= 0:
    second_pos = content.find(old_marker, first_pos + 1)
    if second_pos >= 0:
        replacement = '<div class="bz-head" onclick="toggleBaziPan(this)"><h3>\U0001f3ee \u516b\u5b57\u547d\u76d8</h3><span class="arr">\u25bc</span></div><div class="bz-body">'
        content = content[:second_pos] + replacement + content[second_pos + len(old_marker):]
        print("Fixed second occurrence at", second_pos)
    
# Also need to add closing </div> for bz-body in the simple version
# In renderBaziSimple, the card closes with </div></div>
# The grid line is: html += '<div class="bz-grid">';
# After the grid and other content, it closes with:
# html += '<div style="color:var(--dim);font-size:.8em;margin-top:4px">\u65e5\u4e3b...</div></div>';
# For the simple version, find the </div></div> after the 日主 line
rizhu_marker = '<div style="color:var(--dim);font-size:.8em;margin-top:4px">\u65e5\u4e3b'
# Find the second occurrence (inside renderBaziSimple)
first_rizhu = content.find(rizhu_marker)
if first_rizhu >= 0:
    second_rizhu = content.find(rizhu_marker, first_rizhu + 1)
    if second_rizhu >= 0:
        line_end = content.find("</div></div>", second_rizhu)
        if line_end >= 0:
            content = content[:line_end] + '</div>' + content[line_end:]
            print("Added bz-body closing for simple version at", line_end)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
