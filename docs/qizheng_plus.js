// qizheng_plus.js — 七政四余拓展：节日引擎 + 本命盘解读 + 星象演算（二十四山星曜/度数）
// 复用 qizheng.js 的 KanyuQizheng（positions / drawChart / scoreDay），节日由内置 LunarCalendar 精确推算。
(function () {
  "use strict";
  var K = null;
  function eng() { return K || (K = window.KanyuQizheng); }
  var DEG = Math.PI / 180;
  function norm(d) { return ((d % 360) + 360) % 360; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function offOf(disk) { return { "地盘": 0, "天盘": 7.5, "人盘": -7.5 }[disk] || 0; }

  // ---------- 节日引擎（农历 + 节气 + 公历） ----------
  var FEST_CACHE = {};
  var LUNAR_MAP = { "春節": "春节", "元宵節": "元宵", "端午節": "端午", "七夕情人節": "七夕", "中元節": "中元", "中秋節": "中秋", "重陽節": "重阳", "臘八節": "腊八", "除夕": "除夕" };
  var TERM_KEEP = { "清明": "清明", "冬至": "冬至", "夏至": "夏至" };
  var SOLAR_KEEP = [
    [/元旦/, "元旦"], [/勞動節/, "劳动节"], [/國慶節/, "国庆节"], [/國際兒童節/, "儿童节"],
    [/教師節/, "教师节"], [/情人節/, "情人节"], [/婦女節/, "妇女节"], [/平安夜|聖誕節/, "平安夜"]
  ];
  function normalizeFest(names) {
    var out = [];
    names.forEach(function (raw) {
      var n = String(raw || "").trim();
      if (!n) return;
      if (LUNAR_MAP[n]) { out.push(LUNAR_MAP[n]); return; }
      if (TERM_KEEP[n]) { out.push(TERM_KEEP[n]); return; }
      for (var i = 0; i < SOLAR_KEEP.length; i++) {
        if (SOLAR_KEEP[i][0].test(n)) { out.push(SOLAR_KEEP[i][1]); return; }
      }
    });
    return out;
  }
  function festivalMap(year) {
    if (FEST_CACHE[year]) return FEST_CACHE[year];
    var out = {}, LC = window.LunarCalendar;
    if (!LC) { FEST_CACHE[year] = out; return out; }
    for (var m = 1; m <= 12; m++) {
      var days = new Date(year, m, 0).getDate();
      for (var d = 1; d <= days; d++) {
        var info = null;
        try { info = LC.solarToLunar(year, m, d); } catch (e) { continue; }
        if (!info || info.error) continue;
        var names = normalizeFest([info.lunarFestival, info.term, info.solarFestival]);
        if (names.length) out[year + "-" + pad(m) + "-" + pad(d)] = names;
      }
    }
    FEST_CACHE[year] = out;
    return out;
  }
  var EVENT_FEST = [
    [/嫁娶|订婚|订婚宴/, ["情人节", "七夕", "元宵", "中秋", "元旦", "国庆节"]],
    [/寿宴/, ["春节", "元宵", "重阳", "中秋"]],
    [/乔迁宴|入宅|搬迁/, ["春节", "元宵", "元旦", "劳动节", "国庆节"]],
    [/开市|开业|签约/, ["春节", "元宵", "劳动节", "国庆节"]],
    [/动土|修造|竖柱|上梁/, ["清明", "冬至", "劳动节", "国庆节"]],
    [/安葬|立碑|祭祀|谢土|迁坟/, ["清明", "中元", "冬至", "除夕"]],
    [/出行/, ["春节", "劳动节", "国庆节"]],
    [/入学/, ["元旦", "劳动节", "国庆节", "教师节"]],
    [/安床/, ["元宵", "中秋", "七夕"]],
    [/求医/, ["冬至", "清明"]],
    [/开光/, ["春节", "元宵", "中秋"]]
  ];
  var DEFAULT_FEST = ["春节", "元宵", "端午", "七夕", "中秋", "重阳", "冬至", "清明", "元旦", "劳动节", "国庆节"];
  var EVENT_DEFAULT = {
    "": DEFAULT_FEST
  };
  function forEvent(event, year, birthDate) {
    var list = [];
    var map = festivalMap(year);
    var want = null;
    for (var i = 0; i < EVENT_FEST.length; i++) {
      if (EVENT_FEST[i][0].test(event || "")) { want = EVENT_FEST[i][1]; break; }
    }
    if (!want) want = DEFAULT_FEST;
    Object.keys(map).forEach(function (d) {
      map[d].forEach(function (n) {
        if (want.indexOf(n) >= 0) list.push({ date: d, name: n });
      });
    });
    // 满月 / 百日 / 周岁正日
    if (birthDate && /满月宴|百日宴|周岁宴/.test(event || "")) {
      var b = new Date(birthDate + "T12:00:00Z");
      if (!isNaN(b.getTime())) {
        var days = { "满月宴": 30, "百日宴": 100, "周岁宴": 365 }[event];
        var t = new Date(b.getTime() + days * 86400000);
        list.unshift({ date: t.toISOString().slice(0, 10), name: event + "正日" });
      }
    }
    list.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return list;
  }

  // ---------- 本命盘 ----------
  function natalHtml() {
    return '<div class="card"><h3>🧬 本命盘 · 七政四余</h3>' +
      '<p style="color:var(--dim);font-size:.84em;line-height:1.8">输入出生时间，排出本命七政四余盘（日月五星四余落宫、躔宿、恩难仇用），再由 AI 分婚姻 / 事业 / 健康 / 财运 / 性格解读。</p>' +
      '<div class="qz-grid">' +
      '<div class="qz-field"><label>出生日期</label><input type="date" id="qz-n-date" value="1990-01-01"></div>' +
      '<div class="qz-field"><label>出生时间</label><input type="time" id="qz-n-time" value="12:00"></div>' +
      '<div class="qz-field"><label>性别</label><select id="qz-n-sex"><option>男</option><option>女</option></select></div>' +
      '<div class="qz-field"><label>盘式</label><select id="qz-n-disk"><option>地盘</option><option>天盘</option><option>人盘</option></select></div>' +
      "</div>" +
      '<div style="margin-top:14px"><button class="btn-go" id="qz-n-run">✨ 起本命盘</button>' +
      '<span id="qz-n-status" style="margin-left:12px;color:var(--dim);font-size:.84em"></span></div></div>' +
      '<div id="qz-n-out"></div>';
  }

  function bodyTable(pos) {
    var rows = pos.bodies.map(function (b) {
      return "<tr><td>" + b.cn + "</td><td>" + b.el + "</td><td>" + b.lon.toFixed(2) + "°</td><td>" + b.palace + "宫</td><td>" + b.mtn + "山</td><td>" + b.xiu + "</td></tr>";
    }).join("");
    return '<table class="qz-table"><thead><tr><th>星曜</th><th>五行</th><th>黄经</th><th>宫</th><th>山</th><th>躔宿</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function recCardHtml() {
    var E = eng().EVENTS || [];
    var purposeOpts = E.map(function (g) {
      return '<optgroup label="' + g.g + '">' + g.list.map(function (e) { return "<option>" + e + "</option>"; }).join("") + "</optgroup>";
    }).join("");
    var shanOpts = eng().QZ_MTN.map(function (s) { return '<option value="' + s + '">' + s + "山</option>"; }).join("");
    return '<div class="card"><h3>📅 本命推荐吉日</h3>' +
      '<div class="qz-grid">' +
      '<div class="qz-field"><label>用事</label><select id="qz-n-rec-purpose">' + purposeOpts + "</select></div>" +
      '<div class="qz-field"><label>坐山</label><select id="qz-n-rec-shan">' + shanOpts + "</select></div>" +
      '<div class="qz-field"><label>年份</label><input type="number" id="qz-n-rec-year" value="' + new Date().getFullYear() + '"></div>' +
      "</div>" +
      '<div style="margin-top:10px"><button class="btn-go" id="qz-n-rec">推荐吉日</button>' +
      '<span id="qz-n-rec-status" style="margin-left:12px;color:var(--dim);font-size:.84em"></span></div>' +
      '<div id="qz-n-rec-out"></div></div>';
  }

  function mountNatal(host) {
    if (!host) return;
    host.innerHTML = natalHtml();
    document.getElementById("qz-n-run").addEventListener("click", function () {
      var ds = document.getElementById("qz-n-date").value || "1990-01-01";
      var ts = document.getElementById("qz-n-time").value || "12:00";
      var sex = document.getElementById("qz-n-sex").value;
      var disk = document.getElementById("qz-n-disk").value;
      var date = new Date(ds + "T" + ts + ":00Z");
      var pos = eng().positions(date);
      document.getElementById("qz-n-out").innerHTML =
        '<div class="card"><h3>🧬 本命盘 · ' + esc(ds + " " + ts) + "（" + esc(sex) + "）</h3>" +
        '<canvas class="qz-chart" id="qz-n-canvas"></canvas>' +
        '<div class="qz-body-chips">' + pos.bodies.map(function (b) {
          return '<span class="qz-chip pt">' + b.cn + " " + b.palace + "宫 " + b.lon.toFixed(1) + "°</span>";
        }).join("") + "</div>" +
        bodyTable(pos) +
        '<div class="qz-note">本命盘为出生时刻的星曜位置（前端概算）。命宫、大限等更细层次由下方 AI 结合体系展开。</div></div>' +
        '<div class="card" style="text-align:center"><h3>🔮 AI 本命解读（婚姻·事业·健康）</h3>' +
        '<button class="btn-go" id="qz-n-ai">AI 解读</button>' +
        '<div id="qz-n-ai-status" style="margin-top:8px;color:var(--dim)"></div>' +
        '<div id="qz-n-ai-resp" style="display:none"></div></div>' +
        recCardHtml();
      requestAnimationFrame(function () { eng().drawChart(document.getElementById("qz-n-canvas"), date, ""); });
      var birthYear = parseInt(ds.slice(0, 4), 10) || new Date().getFullYear();
      function runRec() {
        var y = parseInt(document.getElementById("qz-n-rec-year").value, 10) || new Date().getFullYear();
        var purpose = document.getElementById("qz-n-rec-purpose").value;
        var shan = document.getElementById("qz-n-rec-shan").value;
        var zhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][((birthYear - 4) % 12 + 12) % 12];
        document.getElementById("qz-n-rec-status").textContent = "评分中…";
        setTimeout(function () {
          var best = eng().findBest(shan, y, purpose, "地盘", 12, { zodiac: zhi });
          var rows = best.map(function (b, i) {
            var cls = b.score >= 100 ? "qz-good" : b.score >= 75 ? "qz-mid" : "";
            return "<tr><td>" + (i + 1) + "</td><td>" + b.date + "</td><td>" + (b.festival || "—") + "</td><td>" + b.score + "</td><td>" + b.verdict + "</td><td style=\"text-align:left\">" + esc(b.good.slice(0, 2).join("；")) + "</td></tr>";
          }).join("");
          document.getElementById("qz-n-rec-out").innerHTML =
            '<div class="qz-note">按本命生肖（' + esc(zhi) + '）＋ 坐山 ' + esc(shan) + "山 ＋ 用事「" + esc(purpose) + "」评出（" + y + " 年，越高越宜）。</div>" +
            (eng().topPickHtml ? eng().topPickHtml(best[0], zhi, "最终推荐这一日") : "") +
            (best.length ? '<div class="qz-note" style="margin-top:8px">以下为备选：</div><table class="qz-table"><thead><tr><th>#</th><th>日期</th><th>节日</th><th>得分</th><th>等级</th><th>主要吉因</th></tr></thead><tbody>' + rows + "</tbody></table>" : '<div class="qz-bad">本年无明显吉日，请换年份或坐山。</div>');
          document.getElementById("qz-n-rec-status").textContent = "推荐 " + best.length + " 天";
        }, 20);
      }
      var recBtn = document.getElementById("qz-n-rec");
      if (recBtn) recBtn.addEventListener("click", runRec);
      var btn = document.getElementById("qz-n-ai");
      if (btn && window.KanyuAI) {
        btn.addEventListener("click", async function () {
          await window.KanyuAI.run({
            mode: "qizheng",
            chart: {
              school: "七政四余 · 本命盘", birth: ds + " " + ts, sex: sex, disk: disk,
              bodies: pos.bodies.map(function (b) { return { star: b.cn, element: b.el, lon: Math.round(b.lon * 100) / 100, palace: b.palace + "宫", mountain: b.mtn + "山", xiu: b.xiu }; })
            },
            question: "请以七政四余本命盘解读此人：婚姻感情、事业财运、身体健康、性格禀赋，并指出吉凶星曜与化解方向；文末请给出对求测人有利的择日方向（宜什么五行、避什么日子）",
            title: "七政四余本命盘 · AI 解读",
            responseEl: document.getElementById("qz-n-ai-resp"),
            statusEl: document.getElementById("qz-n-ai-status"),
            btnEl: btn
          });
          runRec(); // 分析完自动给出推荐日子
        });
      }
      document.getElementById("qz-n-status").textContent = "本命盘已排";
    });
  }

  // ---------- 星象演算：二十四山星曜与度数 ----------
  function transitHtml() {
    var shanOpts = eng().QZ_MTN.map(function (s) { return '<option value="' + s + '">' + s + "山</option>"; }).join("");
    return '<div class="card"><h3>🔭 星象演算 · 二十四山星曜与度数</h3>' +
      '<p style="color:var(--dim);font-size:.84em;line-height:1.8">排出某时刻七政四余位置，逐山列出「哪颗星落在哪一山、具体度数」，并按坐山标出到山/到向与恩难仇用（哪颗星在发挥作用）。</p>' +
      '<div class="qz-grid">' +
      '<div class="qz-field"><label>日期</label><input type="date" id="qz-t-date" value="' + todayISO() + '"></div>' +
      '<div class="qz-field"><label>时间</label><input type="time" id="qz-t-time" value="12:00"></div>' +
      '<div class="qz-field"><label>坐山</label><select id="qz-t-shan">' + shanOpts + "</select></div>" +
      '<div class="qz-field"><label>盘式</label><select id="qz-t-disk"><option>地盘</option><option>天盘</option><option>人盘</option></select></div>' +
      "</div>" +
      '<div style="margin-top:14px"><button class="btn-go" id="qz-t-run">✨ 演算</button>' +
      '<span id="qz-t-status" style="margin-left:12px;color:var(--dim);font-size:.84em"></span></div></div>' +
      '<div id="qz-t-out"></div>';
  }

  function transitTable(date, disk, shan) {
    var pos = eng().positions(date), mtn = eng().QZ_MTN, off = offOf(disk);
    var byMtn = {};
    pos.bodies.forEach(function (b) {
      var i = Math.floor(norm(b.lon - off) / 15);
      (byMtn[i] = byMtn[i] || []).push(b);
    });
    var en = (window.QIZHENG_DATA && window.QIZHENG_DATA.rules && window.QIZHENG_DATA.rules["恩难仇用"]) || {};
    var elem = ["金", "金", "金", "金", "土", "土", "火", "火", "火", "火", "木", "土", "木", "木", "木", "木", "土", "土", "水", "水", "水", "水", "金", "土"];
    var targetI = mtn.indexOf(shan);
    var table = en[elem[targetI]] || {};
    function roleOf(b) {
      for (var r in table) { if (String(table[r]).indexOf(b.el) >= 0) return r; }
      return "";
    }
    var rows = mtn.map(function (m, i) {
      var stars = (byMtn[i] || []).map(function (b) {
        var center = i * 15 + 7.5;
        var delta = ((b.lon - off - center + 540) % 360) - 180;
        var role = (i === targetI) ? roleOf(b) : "";
        return b.cn + " " + b.lon.toFixed(1) + "°（偏离山心 " + delta.toFixed(1) + "°" + (role ? "，" + role + "星" : "") + "）";
      });
      var cls = (i === targetI) ? "hi" : "";
      return '<tr class="' + cls + '"><td>' + m + "山</td><td>" + (i * 15) + "–" + (i * 15 + 15) + "°</td><td>" + (stars.join("；") || "—") + "</td></tr>";
    }).join("");
    var incoming = (byMtn[targetI] || []).map(function (b) { return b.cn + " " + b.lon.toFixed(1) + "°" + (roleOf(b) ? "（" + roleOf(b) + "星）" : ""); });
    var oppI = (targetI + 12) % 24;
    var toXiang = (byMtn[oppI] || []).map(function (b) { return b.cn + " " + b.lon.toFixed(1) + "°"; });
    var summary = "坐山 " + shan + "山（正体五行属" + elem[targetI] + "）：到山星曜 " + (incoming.join("、") || "无") +
      "；到向（" + mtn[oppI] + "山）星曜 " + (toXiang.join("、") || "无") + "。";
    return '<div class="card"><h3>🔭 二十四山星曜 · ' + date.toISOString().slice(0, 16).replace("T", " ") + "</h3>" +
      '<div class="hl">' + esc(summary) + "</div>" +
      '<table class="qz-table qz-24"><thead><tr><th>山</th><th>度数范围</th><th>落在本山的星曜 / 度数</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  function mountTransit(host) {
    if (!host) return;
    host.innerHTML = transitHtml();
    document.getElementById("qz-t-shan").value = "子";
    document.getElementById("qz-t-run").addEventListener("click", function () {
      var ds = document.getElementById("qz-t-date").value || todayISO();
      var ts = document.getElementById("qz-t-time").value || "12:00";
      var shan = document.getElementById("qz-t-shan").value;
      var disk = document.getElementById("qz-t-disk").value;
      var date = new Date(ds + "T" + ts + ":00Z");
      var pos = eng().positions(date);
      document.getElementById("qz-t-out").innerHTML =
        transitTable(date, disk, shan) +
        '<div class="card"><h3>✨ 星盘</h3><canvas class="qz-chart" id="qz-t-canvas"></canvas>' +
        '<div class="qz-note">盘上标出七政四余黄经；红弧为所选坐山。</div></div>' +
        '<div class="card" style="text-align:center"><h3>🔮 AI 星象演算</h3>' +
        '<button class="btn-go" id="qz-t-ai">AI 演算</button>' +
        '<div id="qz-t-ai-status" style="margin-top:8px;color:var(--dim)"></div>' +
        '<div id="qz-t-ai-resp" style="display:none"></div></div>';
      requestAnimationFrame(function () { eng().drawChart(document.getElementById("qz-t-canvas"), date, shan); });
      var sc = eng().scoreDay(date, shan, "", disk, {});
      var btn = document.getElementById("qz-t-ai");
      if (btn && window.KanyuAI) {
        btn.addEventListener("click", function () {
          window.KanyuAI.run({
            mode: "qizheng",
            chart: {
              school: "七政四余 · 星象演算", datetime: ds + " " + ts, zuo_shan: shan, disk: disk,
              bodies: pos.bodies.map(function (b) { return { star: b.cn, element: b.el, lon: Math.round(b.lon * 100) / 100, palace: b.palace + "宫", mountain: b.mtn + "山", xiu: b.xiu }; }),
              score: sc.score, verdict: sc.verdict, good: sc.good, bad: sc.bad
            },
            question: "请演算此刻星象：七政四余各在二十四山的哪一山、什么度数，哪些星在坐山发挥恩/难/仇/用作用，对" + shan + "山是吉是凶",
            title: "七政四余星象演算 · AI",
            responseEl: document.getElementById("qz-t-ai-resp"),
            statusEl: document.getElementById("qz-t-ai-status"),
            btnEl: btn
          });
        });
      }
      document.getElementById("qz-t-status").textContent = "演算完成";
    });
  }

  window.QZ_FESTIVALS = { map: festivalMap, forEvent: forEvent };
  window.KanyuQizhengPlus = {
    mount: function (hosts) {
      hosts = hosts || {};
      mountNatal(hosts.natal);
      mountTransit(hosts.transit);
    },
    festivals: festivalMap,
    forEvent: forEvent
  };
})();
