// aimd.js — AI 输出用的轻量 Markdown 渲染器
// 目的：AI 返回的 **加粗**、## 标题、- 列表、| 表格 不再以原始符号显示。
// 用法：window.AIMD(text) -> 安全的 HTML 字符串（先转义，再做 Markdown）
(function () {
  "use strict";
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // 行内标记（输入必须是已转义的文本）
  function inline(s) {
    return String(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  }
  function isSep(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
  }
  function cells(line) {
    var t = String(line).trim().replace(/^\|/, "").replace(/\|$/, "");
    return t.split("|").map(function (c) { return inline(esc(c.trim())); });
  }
  function render(md) {
    var lines = String(md == null ? "" : md).replace(/\r\n?/g, "\n").split("\n");
    var out = [], i = 0, n = lines.length;
    while (i < n) {
      var raw = lines[i], t = raw.trim();
      if (!t) { i++; continue; }
      // 代码块
      if (/^```/.test(t)) {
        var buf = []; i++;
        while (i < n && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
        i++;
        out.push("<pre class=\"aimd-code\">" + esc(buf.join("\n")) + "</pre>");
        continue;
      }
      // 表格
      if (t.indexOf("|") >= 0 && i + 1 < n && isSep(lines[i + 1])) {
        var head = cells(raw);
        i += 2;
        var body = [];
        while (i < n && lines[i].trim().indexOf("|") >= 0) { body.push(cells(lines[i])); i++; }
        out.push('<div class="aimd-tablewrap"><table class="aimd"><thead><tr>' +
          head.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
          body.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>");
        continue;
      }
      // 标题
      var hm = t.match(/^(#{1,6})\s+(.*)$/);
      if (hm) { out.push("<h4>" + inline(esc(hm[2])) + "</h4>"); i++; continue; }
      // 分隔线
      if (/^(-{3,}|_{3,}|\*{3,})$/.test(t)) { out.push('<hr class="aimd-hr">'); i++; continue; }
      // 引用
      if (/^>\s?/.test(t)) {
        var q = [];
        while (i < n && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
        out.push('<div class="aimd-q">' + q.map(function (x) { return inline(esc(x)); }).join("<br>") + "</div>");
        continue;
      }
      // 无序列表
      if (/^\s*[-*+]\s+/.test(raw)) {
        var ul = [];
        while (i < n && /^\s*[-*+]\s+/.test(lines[i])) { ul.push(lines[i].replace(/^\s*[-*+]\s+/, "")); i++; }
        out.push("<ul>" + ul.map(function (x) { return "<li>" + inline(esc(x)) + "</li>"; }).join("") + "</ul>");
        continue;
      }
      // 有序列表
      if (/^\s*\d+[.)]\s+/.test(raw)) {
        var ol = [];
        while (i < n && /^\s*\d+[.)]\s+/.test(lines[i])) { ol.push(lines[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
        out.push("<ol>" + ol.map(function (x) { return "<li>" + inline(esc(x)) + "</li>"; }).join("") + "</ol>");
        continue;
      }
      // 段落
      out.push("<p>" + inline(esc(t)) + "</p>");
      i++;
    }
    return out.join("");
  }
  function injectStyle() {
    if (document.getElementById("aimd-style")) return;
    var css = [
      ".ai-md{line-height:1.9;font-size:.88em;color:var(--text)}",
      ".ai-md h4{margin:14px 0 6px;color:var(--goldL);font-size:1.02em;border:none;padding:0;text-align:left}",
      ".ai-md p{margin:6px 0}",
      ".ai-md ul,.ai-md ol{margin:6px 0 6px 1.2em;padding-left:1em}",
      ".ai-md li{margin:3px 0}",
      ".ai-md strong{color:#f0d9a0}",
      ".ai-md code{background:rgba(200,164,92,.12);padding:1px 5px;border-radius:4px;font-size:.92em}",
      ".ai-md .aimd-code{background:rgba(0,0,0,.28);border:1px solid var(--border);border-radius:6px;padding:10px;overflow-x:auto;white-space:pre-wrap;font-size:.85em}",
      ".ai-md .aimd-q{margin:8px 0;padding:8px 12px;border-left:3px solid var(--gold);background:rgba(200,164,92,.08);border-radius:0 6px 6px 0;color:var(--dim)}",
      ".ai-md .aimd-hr{border:none;border-top:1px solid var(--border);margin:12px 0}",
      ".ai-md .aimd-tablewrap{overflow-x:auto;margin:8px 0}",
      ".ai-md table.aimd{width:100%;border-collapse:collapse;font-size:.9em}",
      ".ai-md table.aimd th,.ai-md table.aimd td{border:1px solid var(--border);padding:5px 8px;text-align:left;vertical-align:top}",
      ".ai-md table.aimd th{color:var(--goldL);background:rgba(200,164,92,.08);white-space:nowrap}"
    ].join("\n");
    var st = document.createElement("style");
    st.id = "aimd-style"; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
  injectStyle();
  window.AIMD = render;
})();
