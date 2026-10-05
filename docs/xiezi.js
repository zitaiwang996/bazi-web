// xiezi.js — 堪舆 · 些子法择日（玄空大卦些子法日课）
// 数据来自 xiezi_data.js（由 xiezi-fa skill 生成）；判断逻辑对照 skill 的 peike.py。
// 对外：window.KanyuXiezi = { mount(el), evalLesson(...), selectDays(...) }
// 铁律：起局/评课必须把盘输出到页面，不能只给结论。
(function () {
  "use strict";
  var D = window.XIEZI_DATA || {};
  var GUA = D.gua64 || {};
  var SHAN = D.shan24 || {};
  var GZ_GUA = (D.ganzhiGua || {})["干支配卦"] || {};
  var GZ_RIKE = (D.ganzhiRike || {})["六十甲子表"] || {};
  var YUN = D.yunFen || {};
  var RIKE = D.rike || {};

  var NUM_WX = { 1: "水", 6: "水", 2: "火", 7: "火", 3: "木", 8: "木", 4: "金", 9: "金", 5: "土" };
  var SHENG = { 金: "水", 水: "木", 木: "火", 火: "土", 土: "金" };
  var KE = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  var GEN = [[1, 6], [2, 7], [3, 8], [4, 9]];
  var HE10 = [[1, 9], [2, 8], [3, 7], [4, 6]];
  var HE5 = [[1, 4], [2, 3], [6, 9], [7, 8]];
  var ZHENG = [["乾", "坤"], ["震", "巽"], ["艮", "兑"], ["坎", "离"]];
  var JIPEI = [["坎", "巽"], ["震", "离"], ["艮", "坤"], ["坎", "兑"], ["艮", "离"], ["乾", "巽"], ["乾", "兑"]];
  var BANJI = [["乾", "离"], ["震", "坤"], ["震", "兑"], ["艮", "巽"]];
  var SHAN_ORDER = ["子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬"];
  var GAN_WX = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var ZHI_CHONG = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
  var ZHI12 = "子丑寅卯辰巳午未申酉戌亥";
  function yearZhiOf(year) { return ZHI12[((year - 4) % 12 + 12) % 12]; }
  var JIAZI = (function () {
    var G = "甲乙丙丁戊己庚辛壬癸", Z = "子丑寅卯辰巳午未申酉戌亥", out = [];
    for (var i = 0; i < 60; i++) out.push(G[i % 10] + Z[i % 12]);
    return out;
  })();

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hasPair(pairs, x, y) {
    for (var i = 0; i < pairs.length; i++) {
      if ((pairs[i][0] === x && pairs[i][1] === y) || (pairs[i][0] === y && pairs[i][1] === x)) return true;
    }
    return false;
  }

  // ---- 引擎 ----
  function guaOf(name) {
    if (!name) return null;
    if (GUA[name]) return GUA[name];
    for (var k in GUA) {
      if (k.slice(2) === name || k.slice(0, 2) === name) return GUA[k];
    }
    return null;
  }
  function guaNameOf(token) {
    var g = guaOf(token);
    return g ? g.name : null;
  }
  // 坐山 -> 正针卦（shan24 的 gua[0]）
  function mountainGua(shan) {
    var s = SHAN[shan];
    if (!s || !s.gua || !s.gua.length) return null;
    return s.gua[0];
  }
  function pillarGuaName(gz) {
    var v = GZ_GUA[gz];
    return v ? v["卦"] : null;
  }

  // 以 a 为主（我），看 b 对 a 的关系；a,b 为卦气数
  function rel(a, b) {
    var wa = NUM_WX[a], wb = NUM_WX[b];
    if (a === b) return "同气";
    if (hasPair(GEN, a, b)) return "合生成";
    if (hasPair(HE10, a, b)) return SHENG[wb] === wa ? "合十生入" : "合十生出";
    if (SHENG[wb] === wa) return "生入";
    if (SHENG[wa] === wb) return "生出";
    if (KE[wb] === wa) return "克入";
    if (KE[wa] === wb) return "克出";
    if (hasPair(HE5, a, b)) return "合五/合十五";
    return "不合";
  }
  function furen(g1, g2) {
    if (hasPair(ZHENG, g1, g2)) return "正配(上吉)";
    if (hasPair(JIPEI, g1, g2)) return "吉配";
    if (hasPair(BANJI, g1, g2)) return "半吉半凶";
    return "不成夫妇";
  }
  function yunOf(year, mode) {
    var table = (mode === "main" ? YUN["主流三元九运"] : YUN["本门分运法"]);
    var rows = (table && table["年表"]) || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var end = (r["止"] !== undefined ? r["止"] : r["止"]);
      if (year >= r["起"] && year <= end) return r["运"];
    }
    return mode === "main" ? 9 : 9;
  }
  function isWang(yun, yunNow) { return yun === yunNow; }

  // 宫忌：从 rike.json 读表，按键匹配坐山所落的后天宫
  function gongJi(shan) {
    var s = SHAN[shan];
    if (!s) return { gong: "", zhi: [] };
    var table = (RIKE["数理神煞"] || {})["宫忌"] || {};
    for (var key in table) {
      if (key.indexOf(s.gong + "宫") === 0) {
        var m = String(table[key]).match(/[子丑寅卯辰巳午未申酉戌亥]/g) || [];
        return { gong: s.gong, zhi: m, text: table[key] };
      }
    }
    return { gong: s.gong, zhi: [], text: "" };
  }
  // 年三煞山
  function sanShaMountains(yearZhi) {
    var map = {
      "寅午戌": ["亥", "壬", "子", "癸", "丑"],
      "亥卯未": ["申", "庚", "酉", "辛", "戌"],
      "巳酉丑": ["寅", "甲", "卯", "乙", "辰"],
      "申子辰": ["未", "丁", "午", "丙", "巳"]
    };
    var groups = [["寅", "午", "戌"], ["亥", "卯", "未"], ["巳", "酉", "丑"], ["申", "子", "辰"]];
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].indexOf(yearZhi) >= 0) return map[groups[i].join("")];
    }
    return [];
  }

  // 评课：返回结构化盘面 + 断语
  function evalLesson(zuoGuaName, pillars, year, yunMode) {
    var A = guaOf(zuoGuaName);
    if (!A) return { error: "认不出坐山卦：" + zuoGuaName };
    var yunNow = yunOf(year, yunMode);
    var labels = ["年", "月", "日", "时"];
    var P = [], missing = [];
    pillars.forEach(function (gz, i) {
      var nm = pillarGuaName(gz);
      if (!nm) { missing.push(labels[i] + "柱 " + gz); return; }
      P.push({ label: labels[i], gz: gz, gua: GUA[nm], name: nm });
    });

    var rels = P.map(function (p) {
      var rr = rel(A.qi, p.gua.qi);
      var good = ["生入", "合生成", "合十生入", "同气"].indexOf(rr) >= 0;
      var bad = ["生出", "克出", "合十生出"].indexOf(rr) >= 0;
      return { label: p.label, gz: p.gz, name: p.name, qi: p.gua.qi, yun: p.gua.yun, gong: p.gua.gong, rel: rr, good: good, bad: bad };
    });
    var keRu = rels.filter(function (r) { return r.rel === "克入"; }).length;
    var badRels = rels.filter(function (r) { return r.bad; });

    // 日柱为中心
    var dayRel = null, day = P.filter(function (p) { return p.label === "日"; })[0];
    if (day) dayRel = rel(day.gua.qi, A.qi);

    // 三对夫妇
    var fu = [];
    function gongOf(g) {
      if (!g) return "";
      return g.gong || (g.gua && g.gua.gong) || "";
    }
    function addFu(t, g1, g2) {
      var a1 = gongOf(g1), a2 = gongOf(g2);
      if (a1 && a2) fu.push({ t: t, g1: a1, g2: a2, r: furen(a1, a2) });
    }
    var yr = P.filter(function (p) { return p.label === "年"; })[0];
    var mo = P.filter(function (p) { return p.label === "月"; })[0];
    var hr = P.filter(function (p) { return p.label === "时"; })[0];
    addFu("坐山 × 日柱", A, day);
    addFu("日柱 × 时柱", day, hr);
    addFu("年柱 × 月柱", yr, mo);

    // 六十甲子些子数
    var codes = P.map(function (p) {
      var v = GZ_RIKE[p.gz];
      return { label: p.label, gz: p.gz, codes: v || null };
    });

    // 宫忌 / 三煞
    var gj = gongJi(A.gong);
    var hitJi = rels.filter(function (r) { return gj.zhi.indexOf(r.gz[1]) >= 0; });
    var yearZhi = pillars[0] ? pillars[0][1] : null;
    var sha = sanShaMountains(yearZhi);
    var shanHit = false;
    var zuoShan = null;
    Object.keys(SHAN).forEach(function (sn) {
      if (SHAN[sn] && SHAN[sn].gua && SHAN[sn].gua[0] === A.name) { if (!zuoShan) zuoShan = sn; }
    });
    if (zuoShan && sha.indexOf(zuoShan) >= 0) shanHit = true;

    var verdict, reason;
    if (missing.length) { verdict = "缺数据"; reason = "以下柱取不到卦：" + missing.join("、"); }
    else if (badRels.length) { verdict = "凶"; reason = "山家对" + badRels.map(function (r) { return r.label + "柱" + r.rel; }).join("、") + "，主破耗退财，忌用。"; }
    else if (keRu > 1) { verdict = "凶"; reason = "克入超过一柱（" + keRu + "柱），日柱受创，忌用。"; }
    else if (hitJi.length) { verdict = "凶"; reason = "触犯宫忌（" + gj.gong + "宫忌" + gj.zhi.join("") + "）：" + hitJi.map(function (r) { return r.label + "支" + r.gz[1]; }).join("、"); }
    else { verdict = "吉"; reason = "山家与四柱无生出克出，克入" + keRu + "柱（≤1），合些子法取用。"; }

    var aWang = isWang(A.yun, yunNow);
    var dWang = day ? isWang(day.gua.yun, yunNow) : false;
    var fuGood = fu.filter(function (f) { return f.r === "正配(上吉)" || f.r === "吉配"; }).length;

    return {
      year: year, yunMode: yunMode, yunNow: yunNow,
      shan: zuoShan, A: A, aWang: aWang,
      pillars: P, rels: rels, keRu: keRu, dayRel: dayRel, fu: fu, fuGood: fuGood,
      codes: codes, gongJi: gj, hitJi: hitJi, sanSha: sha, shanHit: shanHit, zuoShan: zuoShan,
      missing: missing, verdict: verdict, reason: reason
    };
  }

  // 选日：扫描日期区间，找山家×日柱成格的日课
  function pillarsFor(dateStr, timeStr) {
    var y = calcYearPillar(dateStr);
    var mp = calcMonthPillar(dateStr, y);
    var m = Array.isArray(mp) ? mp[0] : String(mp);
    var d = calcDayPillar(dateStr);
    var tp = calcTimePillar(d, timeStr);
    var h = Array.isArray(tp) ? tp[0] : String(tp);
    return [y, m, d, h];
  }

  function selectDays(zuoGuaName, startDate, days, timeStr, yunMode) {
    var A = guaOf(zuoGuaName);
    if (!A) return { error: "认不出坐山卦" };
    // 坐山若落当年三煞，整年不宜动土，直接说明
    var startYear = parseInt(String(startDate).slice(0, 4), 10);
    var zuoShanName = null;
    Object.keys(SHAN).forEach(function (sn) {
      if (!zuoShanName && SHAN[sn] && SHAN[sn].gua && SHAN[sn].gua[0] === A.name) zuoShanName = sn;
    });
    var yearSha = sanShaMountains(yearZhiOf(startYear));
    if (zuoShanName && yearSha.indexOf(zuoShanName) >= 0) {
      return {
        zuoGua: A, list: [],
        blocked: "坐山 " + zuoShanName + " 落 " + startYear + " 年年三煞（" + yearSha.join("") +
          "），三煞方整年不宜动土安葬，请换年份或改坐山后再选课。"
      };
    }
    var out = [];
    var d = new Date(startDate + "T00:00:00");
    if (isNaN(d.getTime())) return { error: "日期无效" };
    for (var i = 0; i < days; i++) {
      var ds = dateStr(d);
      var ps = pillarsFor(ds, timeStr || "12:00");
      var year = parseInt(ds.slice(0, 4), 10);
      var yunNow = yunOf(year, yunMode);
      var dayGuaName = pillarGuaName(ps[2]);
      if (!dayGuaName) { d.setDate(d.getDate() + 1); continue; }
      var Dg = GUA[dayGuaName];
      var relDay = rel(A.qi, Dg.qi);
      var ok = ["同气", "合生成", "合十生入", "生入"].indexOf(relDay) >= 0;
      if (!ok) { d.setDate(d.getDate() + 1); continue; }

      // 全课校验：宫忌、三煞为硬忌；生出/克出/克入过多记警告，不直接丢弃
      var res = evalLesson(zuoGuaName, ps, year, yunMode);
      var warn = [];
      if (res.hitJi.length) warn.push("宫忌");
      if (res.shanHit) warn.push("坐山三煞");
      if (warn.length) { d.setDate(d.getDate() + 1); continue; }
      res.rels.forEach(function (r) {
        if (r.rel === "生出") warn.push(r.label + "生出");
        else if (r.rel === "克出") warn.push(r.label + "克出");
        else if (r.rel === "合十生出") warn.push(r.label + "合十生出");
      });
      if (res.keRu > 1) warn.push("克入" + res.keRu + "柱>1");

      var score = 60;
      if (relDay === "合生成") score += 22;
      else if (relDay === "合十生入") score += 20;
      else if (relDay === "同气") score += 16;
      else if (relDay === "生入") score += 12;
      if (isWang(A.yun, yunNow)) score += 6;
      if (isWang(Dg.yun, yunNow)) score += 10;
      score += res.fuGood * 6;
      if (res.keRu === 0) score += 4;
      score -= warn.length * 9;

      out.push({
        date: ds, pillars: ps, hour: (function () { var t = calcTimePillar(ps[2], timeStr || "12:00"); return Array.isArray(t) ? t[1] : ""; })(),
        dayGua: Dg.name, rel: relDay, score: Math.max(0, Math.min(150, score)), yunNow: yunNow,
        fu: res.fu, keRu: res.keRu, warn: warn
      });
      d.setDate(d.getDate() + 1);
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return { zuoGua: A, list: out, yunNow: yunOf(parseInt(startDate.slice(0, 4), 10), yunMode) };
  }

  // ---- 界面 ----
  var STYLE_ID = "kx-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      "#ky-panel-xiezi .kx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}",
      "#ky-panel-xiezi .kx-field{display:flex;flex-direction:column;gap:5px;min-width:0}",
      "#ky-panel-xiezi label{font-size:.8em;color:var(--dim)}",
      "#ky-panel-xiezi input,#ky-panel-xiezi select{padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--input);color:var(--text);font-family:inherit;font-size:.86em;width:100%}",
      "#ky-panel-xiezi .kx-modes{display:flex;gap:8px;margin:12px 0 4px}",
      "#ky-panel-xiezi .kx-mode{padding:6px 14px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--dim);cursor:pointer;font-family:inherit;font-size:.85em}",
      "#ky-panel-xiezi .kx-mode.active{border-color:var(--gold);color:var(--goldL);background:rgba(200,164,92,.12)}",
      "#ky-panel-xiezi .kx-pan{margin-top:14px;padding:14px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,.18)}",
      "#ky-panel-xiezi .kx-pan h4{margin:0 0 10px;color:var(--goldL);font-size:.92em}",
      "#ky-panel-xiezi .kx-table{width:100%;border-collapse:collapse;font-size:.8em;margin-top:6px}",
      "#ky-panel-xiezi .kx-table th,#ky-panel-xiezi .kx-table td{border:1px solid var(--border);padding:6px 8px;text-align:center}",
      "#ky-panel-xiezi .kx-table th{color:var(--goldL);background:rgba(200,164,92,.08)}",
      "#ky-panel-xiezi .kx-good{color:#5ec07a}#ky-panel-xiezi .kx-bad{color:var(--redL)}#ky-panel-xiezi .kx-mid{color:#e9c46a}",
      "#ky-panel-xiezi .kx-verdict{font-size:1.05em;font-weight:700;margin:10px 0 4px}",
      "#ky-panel-xiezi .kx-note{color:var(--dim);font-size:.78em;line-height:1.8;margin-top:8px}",
      "#ky-panel-xiezi .kx-pillars{display:flex;gap:8px;flex-wrap:wrap}",
      "#ky-panel-xiezi .kx-pillar{flex:1 1 90px;min-width:90px;text-align:center;padding:8px;border-radius:8px;background:var(--input);border:1px solid var(--borderL)}",
      "#ky-panel-xiezi .kx-pillar .lab{font-size:.72em;color:var(--dim)}",
      "#ky-panel-xiezi .kx-pillar .gz{font-family:'Noto Serif SC',serif;font-size:1.35em;font-weight:900;color:var(--goldL)}",
      "#ky-panel-xiezi .kx-pillar .gua{font-size:.76em;color:var(--text);margin-top:2px}",
      "#ky-panel-xiezi .kx-pillar .meta{font-size:.72em;color:var(--mute)}"
    ].join("\n");
    var st = document.createElement("style");
    st.id = STYLE_ID; st.textContent = css;
    document.head.appendChild(st);
  }

  function varTable(res) {
    var rows = res.rels.map(function (r) {
      var cls = r.bad ? "kx-bad" : (r.good ? "kx-good" : "kx-mid");
      return "<tr><td>" + r.label + "</td><td>" + esc(r.gz) + "</td><td>" + esc(r.name) + "</td><td>" + r.qi +
        "(" + NUM_WX[r.qi] + ")</td><td>" + r.yun + "(" + (r.yun === res.yunNow ? "旺" : "衰") + ")</td><td>" + esc(r.gong) +
        "</td><td class=\"" + cls + "\">" + r.rel + "</td></tr>";
    }).join("");
    return '<table class="kx-table"><thead><tr><th>柱</th><th>干支</th><th>卦</th><th>卦气</th><th>卦运</th><th>后天宫</th><th>与山家关系</th></tr></thead><tbody>' +
      '<tr><td>山家</td><td>' + esc(res.shan || "") + '</td><td>' + esc(res.A.name) + '</td><td>' + res.A.qi + "(" + NUM_WX[res.A.qi] +
      ")</td><td>" + res.A.yun + "(" + (res.aWang ? "旺" : "衰") + ")</td><td>" + esc(res.A.gong) + '</td><td>—</td></tr>' +
      rows + "</tbody></table>";
  }

  function renderLesson(res) {
    var vclass = res.verdict === "吉" ? "kx-good" : (res.verdict === "凶" ? "kx-bad" : "kx-mid");
    var fuRows = res.fu.map(function (f) {
      var cls = f.r === "不成夫妇" ? "kx-mid" : (f.r === "半吉半凶" ? "kx-mid" : "kx-good");
      return "<tr><td>" + f.t + "</td><td>" + esc(f.g1) + "宫 × " + esc(f.g2) + "宫</td><td class=\"" + cls + "\">" + f.r + "</td></tr>";
    }).join("");
    var codeRows = res.codes.map(function (c) {
      return "<tr><td>" + c.label + "柱</td><td>" + esc(c.gz) + "</td><td>" + (c.codes ? c.codes.join(" / ") : "书未录/待核") + "</td></tr>";
    }).join("");
    return '<div class="kx-verdict">断语：<span class="' + vclass + '">' + res.verdict + "</span></div>" +
      '<div class="kx-note">' + esc(res.reason) + "　本门分运法：" + res.year + " 年 " + res.yunNow + " 运；克入 " + res.keRu + " 柱（限一柱）。</div>" +
      varTable(res) +
      '<h4 style="margin-top:14px">后天卦三对夫妇（成夫妇则不忌神煞）</h4>' +
      '<table class="kx-table"><tbody>' + (fuRows || '<tr><td colspan="3">—</td></tr>') + "</tbody></table>" +
      '<h4 style="margin-top:14px">六十甲子些子数（书录还原表）</h4>' +
      '<table class="kx-table"><tbody>' + codeRows + "</tbody></table>" +
      '<div class="kx-note">坐山宫忌：' + (res.gongJi.text ? esc(res.gongJi.text) : "—") + "；年三煞：" + (res.sanSha.join("") || "—") +
      (res.shanHit ? ' <span class="kx-bad">（坐山落三煞，忌用）</span>' : "") + "</div>";
  }

  function mount(el) {
    injectStyle();
    var shanOpts = SHAN_ORDER.map(function (s) { return '<option value="' + s + '">' + s + "山</option>"; }).join("");
    var guaOpts = Object.keys(GUA).map(function (g) { return '<option value="' + g + '">' + g + "</option>"; }).join("");
    var gzOpts = JIAZI.map(function (g) { return '<option value="' + g + '">' + g + "</option>"; }).join("");
    el.innerHTML =
      '<div class="card"><h3>🧧 些子法择日 · 玄空大卦日课</h3>' +
      '<p style="color:var(--dim);font-size:.84em;line-height:1.8">以坐山卦配年月日时四柱，论合生成 / 合十 / 夫妇交媾、一家骨肉；合局则不忌刑冲诸煞。' +
      '本门分运法：八运 1996–2016、九运 2017–2043。</p>' +
      '<div class="kx-grid">' +
      '<div class="kx-field"><label>坐山（二十四山）</label><select id="kx-shan">' + shanOpts + "</select></div>" +
      '<div class="kx-field"><label>坐山卦（可指定替卦，留空按坐山正针）</label><select id="kx-gua"><option value="">按坐山正针卦</option>' + guaOpts + "</select></div>" +
      '<div class="kx-field"><label>用事年</label><input type="number" id="kx-year" value="' + new Date().getFullYear() + '"></div>' +
      '<div class="kx-field"><label>分运法</label><select id="kx-yunmode"><option value="ben">本门（陈昭有）</option><option value="main">主流三元九运</option></select></div>' +
      "</div>" +
      '<div class="kx-modes"><button type="button" class="kx-mode active" data-m="eval">评课（已定四柱）</button><button type="button" class="kx-mode" data-m="pick">选吉课（扫日期）</button></div>' +
      '<div id="kx-eval">' +
      '<div class="kx-grid">' +
      '<div class="kx-field"><label>年柱</label><select id="kx-p0">' + gzOpts + "</select></div>" +
      '<div class="kx-field"><label>月柱</label><select id="kx-p1">' + gzOpts + "</select></div>" +
      '<div class="kx-field"><label>日柱</label><select id="kx-p2">' + gzOpts + "</select></div>" +
      '<div class="kx-field"><label>时柱</label><select id="kx-p3">' + gzOpts + "</select></div>" +
      '<div class="kx-field" style="justify-content:flex-end"><button class="btn-go" id="kx-from-date">用日期自动排四柱</button></div>' +
      '<div class="kx-field"><label>日期</label><input type="date" id="kx-date" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div class="kx-field"><label>时辰</label><select id="kx-time"><option value="00:30">子时</option><option value="02:30">丑时</option><option value="04:30">寅时</option><option value="06:30">卯时</option><option value="08:30">辰时</option><option value="10:30">巳时</option><option value="12:00" selected>午时</option><option value="14:30">未时</option><option value="16:30">申时</option><option value="18:30">酉时</option><option value="20:30">戌时</option><option value="22:30">亥时</option></select></div>' +
      "</div></div>" +
      '<div id="kx-pick" style="display:none"><div class="kx-grid">' +
      '<div class="kx-field"><label>起始日期</label><input type="date" id="kx-start" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div class="kx-field"><label>扫描天数</label><select id="kx-span"><option value="30">30 天</option><option value="60">60 天</option><option value="90" selected>90 天</option><option value="180">180 天</option><option value="365">365 天</option></select></div>' +
      '<div class="kx-field"><label>用事时辰</label><select id="kx-time2"><option value="06:30">卯时</option><option value="08:30">辰时</option><option value="10:30">巳时</option><option value="12:00" selected>午时</option><option value="14:30">未时</option><option value="16:30">申时</option></select></div>' +
      "</div></div>" +
      '<div style="margin-top:14px"><button class="btn-go" id="kx-run">✨ 起局</button><span id="kx-status" style="margin-left:12px;color:var(--dim);font-size:.84em"></span></div>' +
      "</div>" +
      '<div id="kx-out"></div>';

    var mode = "eval";
    el.querySelectorAll(".kx-mode").forEach(function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-m");
        el.querySelectorAll(".kx-mode").forEach(function (x) { x.classList.toggle("active", x === b); });
        document.getElementById("kx-eval").style.display = mode === "eval" ? "" : "none";
        document.getElementById("kx-pick").style.display = mode === "pick" ? "" : "none";
      });
    });
    function currentZuo() {
      var override = document.getElementById("kx-gua").value;
      if (override) return override;
      var s = document.getElementById("kx-shan").value;
      return mountainGua(s);
    }
    document.getElementById("kx-from-date").addEventListener("click", function () {
      var ds = document.getElementById("kx-date").value;
      var ts = document.getElementById("kx-time").value;
      if (!ds) return;
      var ps = pillarsFor(ds, ts);
      ps.forEach(function (g, i) { document.getElementById("kx-p" + i).value = g; });
      document.getElementById("kx-year").value = ds.slice(0, 4);
    });
    document.getElementById("kx-run").addEventListener("click", function () {
      var out = document.getElementById("kx-out");
      var status = document.getElementById("kx-status");
      var zuo = currentZuo();
      var year = parseInt(document.getElementById("kx-year").value, 10) || new Date().getFullYear();
      var ym = document.getElementById("kx-yunmode").value;
      if (mode === "eval") {
        var ps = [0, 1, 2, 3].map(function (i) { return document.getElementById("kx-p" + i).value; });
        var res = evalLesson(zuo, ps, year, ym);
        out.innerHTML = '<div class="card"><h3>🧧 些子法日课盘</h3><div class="kx-pan">' +
          '<h4>山家：' + esc(res.shan || "") + '山 → ' + esc(res.A.name) + "（卦气 " + res.A.qi + " / 卦运 " + res.A.yun + "）</h4>" +
          renderLesson(res) + "</div></div>" +
          '<div class="card" style="text-align:center"><h3>🔮 AI 详批 · 些子法日课</h3>' +
          '<button class="btn-go" id="kx-ai-btn">AI 研判</button>' +
          '<div id="kx-ai-status" style="margin-top:8px;color:var(--dim)"></div>' +
          '<div id="kx-ai-response" style="display:none"></div></div>';
        var aiBtn = document.getElementById("kx-ai-btn");
        if (aiBtn && window.KanyuAI) {
          aiBtn.addEventListener("click", function () {
            window.KanyuAI.run({
              mode: "xiezi",
              chart: {
                school: "些子法日课（玄空大卦）", yun_mode: ym === "main" ? "主流三元九运" : "本门分运法", yun_now: res.yunNow,
                zuo_shan: res.shan, shan_gua: res.A.name, shan_qi: res.A.qi, shan_yun: res.A.yun, shan_gong: res.A.gong,
                pillars: res.pillars.map(function (p) { return { label: p.label, ganzhi: p.gz, gua: p.name, qi: p.gua.qi, yun: p.gua.yun, gong: p.gua.gong }; }),
                relations: res.rels.map(function (r) { return { label: r.label, rel: r.rel, good: r.good, bad: r.bad }; }),
                couples: res.fu, ke_ru: res.keRu, gong_ji: res.gongJi.text, san_sha: res.sanSha,
                codes: res.codes, verdict: res.verdict, reason: res.reason
              },
              question: "请按些子法日课体系评此课：合生成/合十/夫妇交媾/生克旺衰/煞忌",
              title: "些子法日课 · AI 详批",
              responseEl: document.getElementById("kx-ai-response"),
              statusEl: document.getElementById("kx-ai-status"),
              btnEl: aiBtn
            });
          });
        }
        status.textContent = "评课完成";
      } else {
        var start = document.getElementById("kx-start").value;
        var span = parseInt(document.getElementById("kx-span").value, 10);
        var t2 = document.getElementById("kx-time2").value;
        status.textContent = "扫描中…";
        setTimeout(function () {
          var r = selectDays(zuo, start, span, t2, ym);
          if (r.error) { out.innerHTML = '<div class="card kx-bad">' + esc(r.error) + "</div>"; status.textContent = "失败"; return; }
          if (r.blocked) {
            out.innerHTML = '<div class="card"><h3>🧧 些子法选吉课</h3><div class="kx-bad" style="margin-top:10px">' + esc(r.blocked) + "</div></div>";
            status.textContent = "坐山犯年三煞";
            return;
          }
          var rows = r.list.slice(0, 15).map(function (it) {
            var cls = it.score >= 100 ? "kx-good" : (it.score >= 80 ? "kx-mid" : "");
            return "<tr><td>" + it.date + "</td><td>" + it.pillars.join(" ") + "</td><td>" + it.hour + "</td><td>" + esc(it.dayGua) +
              "</td><td>" + it.rel + "</td><td>" + it.keRu + "</td><td class=\"" + cls + "\">" + it.score +
              "</td><td style=\"text-align:left;font-size:.92em\">" + (it.warn && it.warn.length ? "<span class=\"kx-bad\">" + esc(it.warn.join("、")) + "</span>" : "<span class=\"kx-good\">全课合局</span>") + "</td></tr>";
          }).join("");
          out.innerHTML = '<div class="card"><h3>🧧 些子法选吉课（' + esc(r.zuoGua.name) + " × " + span + " 天）</h3>" +
            '<div class="kx-note">依' + (ym === "main" ? "主流三元九运" : "本门分运法") + "取旺衰；已剔除宫忌、坐山三煞，按山家卦气与日柱成格排序，共 " + r.list.length + " 条候选（备注列出仍需人工复核的项）。</div>" +
            (r.list.length ? '<table class="kx-table"><thead><tr><th>日期</th><th>四柱</th><th>时支</th><th>日柱卦</th><th>山家×日柱</th><th>克入</th><th>评分</th><th>备注</th></tr></thead><tbody>' + rows + "</tbody></table>"
              : '<div class="kx-bad" style="margin-top:10px">该区间无与山家成格的日课，请扩大天数或换坐山卦。</div>') +
            "</div>" +
            '<div class="card" style="text-align:center"><h3>🔮 AI 详批 · 些子法选课</h3>' +
            '<button class="btn-go" id="kx-ai-btn">AI 研判</button>' +
            '<div id="kx-ai-status" style="margin-top:8px;color:var(--dim)"></div>' +
            '<div id="kx-ai-response" style="display:none"></div></div>';
          var aiBtn = document.getElementById("kx-ai-btn");
          if (aiBtn && window.KanyuAI) {
            aiBtn.addEventListener("click", function () {
              window.KanyuAI.run({
                mode: "xiezi",
                chart: {
                  school: "些子法选吉课", yun_mode: ym === "main" ? "主流三元九运" : "本门分运法",
                  zuo_shan: r.zuoGua.name, range: start + " + " + span + "天", yun_now: r.yunNow,
                  candidates: r.list.slice(0, 12).map(function (it) {
                    return { date: it.date, pillars: it.pillars, day_gua: it.dayGua, rel: it.rel, score: it.score, ke_ru: it.keRu, warnings: it.warn };
                  })
                },
                question: "请按些子法日课体系复评这些候选日课，指出优先与忌用",
                title: "些子法选课 · AI 详批",
                responseEl: document.getElementById("kx-ai-response"),
                statusEl: document.getElementById("kx-ai-status"),
                btnEl: aiBtn
              });
            });
          }
          status.textContent = "选出 " + r.list.length + " 条";
        }, 20);
      }
    });
  }

  window.KanyuXiezi = {
    mount: mount,
    evalLesson: evalLesson,
    selectDays: selectDays,
    pillarsFor: pillarsFor,
    mountainGua: mountainGua,
    rel: rel,
    furen: furen,
    yunOf: yunOf
  };
})();
