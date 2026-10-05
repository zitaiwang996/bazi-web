// qizheng.js — 堪舆 · 七政四余（星盘 + 天星择日）
// 择日评分对照 qizheng-siyu skill 的 engine/election.py（天星择日原则）。
// 星历为前端概算：太阳用低精度级数、太阴用主项级数、五星用平均轨道根数+中心差。
// 对外：window.KanyuQizheng = { mount(el), positions(...), scoreDay(...), findBest(...), drawChart(...) }
(function () {
  "use strict";
  var QD = window.QIZHENG_DATA || {};
  var RULES = QD.rules || {};
  var XIU_START = QD.xiuStart || {};
  var DEG = Math.PI / 180;
  var RAD = 180 / Math.PI;
  function norm(d) { return ((d % 360) + 360) % 360; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function jdFromDate(d) { return d.getTime() / 86400000 + 2440587.5; }
  function jdFromParts(y, m, day, hh, mm) {
    return jdFromDate(new Date(Date.UTC(y, m - 1, day, hh || 12, mm || 0)));
  }
  function ayanamsa(jd) {
    var y = 2000 + (jd - 2451545.0) / 365.25;
    return 23.85 + 0.01397 * (y - 2000);
  }
  function sunLonTropical(jd) {
    var n = jd - 2451545.0;
    var L = norm(280.460 + 0.9856474 * n);
    var g = norm(357.528 + 0.9856003 * n) * DEG;
    return norm(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  }
  function moonLonTropical(jd) {
    var n = jd - 2451545.0;
    var L = 218.316 + 13.176396 * n;
    var M = norm(134.963 + 13.064993 * n) * DEG;
    var Ms = norm(357.529 + 0.9856003 * n) * DEG;
    var D = norm(297.850 + 12.190749 * n) * DEG;
    var F = norm(93.272 + 13.229350 * n) * DEG;
    return norm(L + 6.289 * Math.sin(M) - 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D)
      + 0.214 * Math.sin(2 * M) - 0.186 * Math.sin(Ms) - 0.114 * Math.sin(2 * F));
  }
  var ELEM = {
    mercury: { a: 0.38709927, e: 0.20563593, peri: 77.45779628, L0: 252.25032350, rate: 4.09233445 },
    venus:   { a: 0.72333566, e: 0.00677672, peri: 131.60246718, L0: 181.97909950, rate: 1.60213034 },
    earth:   { a: 1.00000261, e: 0.01671123, peri: 102.93768193, L0: 100.46457166, rate: 0.98560910 },
    mars:    { a: 1.52371034, e: 0.09339410, peri: 336.04084,   L0: 355.45332,     rate: 0.52403304 },
    jupiter: { a: 5.20288700, e: 0.04838624, peri: 14.72847983, L0: 34.40438,      rate: 0.08308529 },
    saturn:  { a: 9.53667594, e: 0.05386179, peri: 92.59887831, L0: 49.94432,      rate: 0.03344414 }
  };
  function helio(name, jd) {
    var el = ELEM[name], d = jd - 2451545.0;
    var M = norm(el.L0 + el.rate * d - el.peri) * DEG;
    var e = el.e;
    var nu = M + (2 * e - e * e * e / 4) * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M) + (13 / 12) * e * e * e * Math.sin(3 * M);
    var r = el.a * (1 - e * e) / (1 + e * Math.cos(nu));
    var lon = nu + el.peri * DEG;
    return { x: r * Math.cos(lon), y: r * Math.sin(lon), lon: norm(lon * RAD) };
  }
  function planetGeoLon(jd, name) {
    var p = helio(name, jd), e = helio("earth", jd);
    return norm(Math.atan2(p.y - e.y, p.x - e.x) * RAD);
  }
  function rahuTropical(jd) { return norm(125.04452 - 1934.136261 * ((jd - 2451545.0) / 365.25)); }
  function yuebei(jd) { return norm((jd - jdFromParts(2000, 1, 1, 0, 0)) / 3231.5 * 360); }
  function ziqi(jd) { return norm(230.5 + (jd - jdFromParts(1975, 3, 13, 16, 0)) / 10227.1792 * 360); }
  var BODIES = [
    { k: "sun", cn: "日", el: "火", kind: "zheng" },
    { k: "moon", cn: "月", el: "水", kind: "zheng" },
    { k: "venus", cn: "金", el: "金", kind: "zheng" },
    { k: "jupiter", cn: "木", el: "木", kind: "zheng" },
    { k: "mercury", cn: "水", el: "水", kind: "zheng" },
    { k: "mars", cn: "火", el: "火", kind: "zheng" },
    { k: "saturn", cn: "土", el: "土", kind: "zheng" },
    { k: "rahu", cn: "罗", el: "火", kind: "yu" },
    { k: "ketu", cn: "计", el: "土", kind: "yu" },
    { k: "yuebei", cn: "孛", el: "水", kind: "yu" },
    { k: "ziqi", cn: "气", el: "木", kind: "yu" }
  ];
  function bodyLon(jd, k) {
    var ay = ayanamsa(jd);
    if (k === "sun") return norm(sunLonTropical(jd) - ay);
    if (k === "moon") return norm(moonLonTropical(jd) - ay);
    if (k === "mercury" || k === "venus" || k === "mars" || k === "jupiter" || k === "saturn") {
      return norm(planetGeoLon(jd, k) - ay);
    }
    if (k === "rahu") return norm(rahuTropical(jd) - ay);
    if (k === "ketu") return norm(rahuTropical(jd) + 180 - ay);
    if (k === "yuebei") return yuebei(jd);
    if (k === "ziqi") return ziqi(jd);
    return 0;
  }
  var QZ_MTN = ["辛", "酉", "庚", "申", "坤", "未", "丁", "午", "丙", "巳", "巽", "辰", "乙", "卯", "甲", "寅", "艮", "丑", "癸", "子", "壬", "亥", "乾", "戌"];
  var QZ_ELEM = ["金", "金", "金", "金", "土", "土", "火", "火", "火", "火", "木", "土", "木", "木", "木", "木", "土", "土", "水", "水", "水", "水", "金", "土"];
  var QZ_ELEM2 = ["火", "金", "金", "水", "水", "月", "月", "日", "日", "水", "水", "金", "金", "火", "火", "木", "木", "土", "土", "土", "土", "木", "木", "火"];
  var DISK_OFFSET = { "地盘": 0, "天盘": 7.5, "人盘": -7.5 };
  var PALACES = ["戌", "酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑", "子", "亥"];
  var XIU_ORDER = Object.keys(XIU_START);
  function mtnName(deg, disk) { return QZ_MTN[Math.floor(norm(deg - (DISK_OFFSET[disk] || 0)) / 15)]; }
  function mtnOf(name) { return name ? String(name).replace("山", "") : ""; }
  function opposite(name) { var i = QZ_MTN.indexOf(mtnOf(name)); return i < 0 ? "" : QZ_MTN[(i + 12) % 24]; }
  function palaceOf(deg) { return PALACES[Math.floor(norm(deg) / 30)]; }
  function xiuOf(deg) {
    var d = norm(deg), best = XIU_ORDER[0], bestGap = 1e9;
    for (var i = 0; i < XIU_ORDER.length; i++) {
      var gap = norm(d - XIU_START[XIU_ORDER[i]]);
      if (gap < bestGap) { bestGap = gap; best = XIU_ORDER[i]; }
    }
    return best;
  }
  function positions(date) {
    var jd = jdFromDate(date), out = { jd: jd, bodies: [] };
    BODIES.forEach(function (b) {
      var lon = bodyLon(jd, b.k);
      out.bodies.push({ k: b.k, cn: b.cn, el: b.el, kind: b.kind, lon: lon, palace: palaceOf(lon), mtn: mtnName(lon, "地盘"), xiu: xiuOf(lon) });
    });
    return out;
  }
  var SHENG = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  var KE = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  var HUA2WX = { 木: "木", 火: "火", 土: "土", 金: "金", 水: "水", 日: "火", 月: "水" };
  var SEASON_WX = { 春: "木", 夏: "火", 秋: "金", 冬: "水" };
  function wxRel(a, b) {
    if (a === b) return "助";
    if (SHENG[a] === b) return "生";
    if (KE[a] === b) return "克";
    if (SHENG[b] === a) return "泄";
    if (KE[b] === a) return "耗";
    return "无关";
  }
  var WX_SCORE = { 生: 8, 助: 5, 克: -6, 泄: -4, 耗: -3, 无关: 0 };
  var EN_NAN = (RULES["恩难仇用"] || {});
  var PURPOSE_WX = (RULES["事由五行"] || {});
  var XIU_JX = (RULES["二十八宿吉凶"] || {});
  var W = (RULES["评分权重"] || {});
  var ZHI = "子丑寅卯辰巳午未申酉戌亥";
  var GROUPS = [["寅", "午", "戌"], ["亥", "卯", "未"], ["巳", "酉", "丑"], ["申", "子", "辰"]];
  function yearZhi(year) { return ZHI[((year - 4) % 12 + 12) % 12]; }
  function sanSha(year) {
    var z = yearZhi(year);
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].indexOf(z) >= 0) return GROUPS[(i + 1) % 4];
    return [];
  }
  function seasonOf(month) {
    return { 3: "春", 4: "春", 5: "夏", 6: "夏", 7: "夏", 8: "秋", 9: "秋", 10: "秋", 11: "冬", 12: "冬", 1: "冬", 2: "春" }[month];
  }
  function scoreDay(date, shan, purpose, disk) {
    var jd = jdFromDate(date);
    var iso = date.toISOString().slice(0, 10);
    var month = date.getUTCMonth() + 1;
    var year = date.getUTCFullYear();
    var tgt = mtnOf(shan);
    var tgtI = QZ_MTN.indexOf(tgt);
    var score = 50, good = [], bad = [];
    var sunM = mtnName(bodyLon(jd, "sun"), disk);
    if (sunM === tgt) { score += W["太阳到山"] || 30; good.push("太阳到山 +" + (W["太阳到山"] || 30)); }
    else if (sunM === opposite(tgt)) { score += W["太阳到向"] || 15; good.push("太阳到向 +" + (W["太阳到向"] || 15)); }
    var moonM = mtnName(bodyLon(jd, "moon"), disk);
    if (moonM === tgt) { score += W["太阴到山"] || 15; good.push("太阴到山 +" + (W["太阴到山"] || 15)); }
    else if (moonM === opposite(tgt)) { score += W["太阴到向"] || 8; good.push("太阴到向 +8"); }
    ["jupiter", "venus"].forEach(function (k) {
      var mm = mtnName(bodyLon(jd, k), disk);
      var cn = k === "jupiter" ? "木星" : "金星";
      if (mm === tgt) { score += 10; good.push(cn + "到山 +10"); }
      else if (mm === opposite(tgt)) { score += 5; good.push(cn + "到向 +5"); }
    });
    ["mars", "saturn"].forEach(function (k) {
      var mm = mtnName(bodyLon(jd, k), disk);
      var cn = k === "mars" ? "火星" : "土星";
      var mi = QZ_MTN.indexOf(mm);
      var dist = Math.min(Math.abs(mi - tgtI), 24 - Math.abs(mi - tgtI));
      if (dist >= 6) { score += 5; good.push(cn + "远离 +5"); }
      else if (dist <= 2) { score -= 10; bad.push(cn + "临山 -10"); }
    });
    var se = seasonOf(month), sw = SEASON_WX[se];
    if (QZ_ELEM[tgtI] === sw || HUA2WX[QZ_ELEM2[tgtI]] === sw) { score += 7; good.push(se + "旺山 +7"); }
    if (yearZhi(year) === tgt) { score -= 20; bad.push("太岁临山 -20"); }
    else if (yearZhi(year) === opposite(tgt)) { score -= 10; bad.push("太岁到向 -10"); }
    if (sanSha(year).indexOf(tgt) >= 0) { score -= 30; bad.push("三煞临山 -30"); }
    var targetEl = QZ_ELEM[tgtI];
    var en = EN_NAN[targetEl] || {};
    BODIES.forEach(function (b) {
      if (mtnName(bodyLon(jd, b.k), disk) !== tgt) return;
      var role = null;
      for (var r in en) { if (String(en[r]).indexOf(b.el) >= 0) { role = r; break; } }
      if (role === "恩") { score += 12; good.push(b.cn + "恩星到山 +12"); }
      else if (role === "用") { score += 10; good.push(b.cn + "用星到山 +10"); }
      else if (role === "难") { score -= 12; bad.push(b.cn + "难星到山 -12"); }
      else if (role === "仇") { score -= 10; bad.push(b.cn + "仇星到山 -10"); }
    });
    [["季节", sw], ["太阳", QZ_ELEM[QZ_MTN.indexOf(sunM)]], ["太阴", QZ_ELEM[QZ_MTN.indexOf(moonM)]]].forEach(function (pair) {
      var rel = wxRel(targetEl, pair[1]);
      if (WX_SCORE[rel]) { score += WX_SCORE[rel]; (WX_SCORE[rel] > 0 ? good : bad).push(pair[0] + rel + (WX_SCORE[rel] > 0 ? "+" : "") + WX_SCORE[rel]); }
    });
    if (purpose && PURPOSE_WX[purpose]) {
      var pr = wxRel(PURPOSE_WX[purpose], targetEl);
      if (WX_SCORE[pr]) { score += WX_SCORE[pr]; (WX_SCORE[pr] > 0 ? good : bad).push(purpose + pr); }
    }
    var sx = xiuOf(bodyLon(jd, "sun"));
    if (XIU_JX[sx] === "吉") { score += 5; good.push("太阳躔" + sx + "(吉) +5"); }
    else if (XIU_JX[sx] === "凶") { score -= 5; bad.push("太阳躔" + sx + "(凶) -5"); }
    score = Math.max(0, Math.min(150, Math.round(score)));
    var verdict = score >= 100 ? "大吉" : score >= 75 ? "吉" : score >= 50 ? "平" : score >= 30 ? "凶" : "大凶";
    return { date: iso, jd: jd, score: score, verdict: verdict, good: good, bad: bad, sun: { mtn: sunM, xiu: sx }, moon: { mtn: moonM } };
  }
  function findBest(shan, year, purpose, disk, topN) {
    var out = [];
    var start = new Date(Date.UTC(year, 0, 1, 12, 0));
    for (var i = 0; i < 365; i++) out.push(scoreDay(new Date(start.getTime() + i * 86400000), shan, purpose, disk));
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, topN || 12);
  }
  function drawChart(canvas, date, highlightShan) {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var size = canvas.clientWidth || 660;
    canvas.width = size * dpr; canvas.height = size * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    var cx = size / 2, cy = size / 2, R = size * 0.44;
    var pos = positions(date);
    var g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, "rgba(200,164,92,.10)"); g.addColorStop(1, "rgba(200,164,92,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(200,164,92,.5)"; ctx.lineWidth = 1.2;
    for (var i = 0; i < 12; i++) {
      var a0 = (i * 30 - 90) * DEG, a1 = ((i + 1) * 30 - 90) * DEG;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.stroke();
      var am = (i * 30 + 15 - 90) * DEG;
      ctx.save();
      ctx.translate(cx + Math.cos(am) * R * 0.93, cy + Math.sin(am) * R * 0.93);
      ctx.rotate(am + Math.PI / 2);
      ctx.fillStyle = "#c8a45c"; ctx.font = "700 15px 'Noto Serif SC',serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(PALACES[i] + "宫", 0, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(200,164,92,.28)";
    for (var x = 0; x < XIU_ORDER.length; x++) {
      var ad = (XIU_START[XIU_ORDER[x]] - 90) * DEG;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ad) * R, cy + Math.sin(ad) * R);
      ctx.lineTo(cx + Math.cos(ad) * R * 0.955, cy + Math.sin(ad) * R * 0.955);
      ctx.stroke();
    }
    var used = {};
    pos.bodies.forEach(function (b) {
      var a = (b.lon - 90) * DEG;
      var key = Math.round(b.lon / 4);
      used[key] = (used[key] || 0) + 1;
      var rr = R * (0.66 + used[key] * 0.07);
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      var color = b.kind === "yu" ? "#7fb3d5" : (b.cn === "日" ? "#e8c078" : b.cn === "月" ? "#d8d8e8" : "#e0c878");
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(26,20,16,.9)"; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = color; ctx.font = "700 15px 'Noto Serif SC',serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.cn, x, y);
      ctx.fillStyle = "rgba(200,164,92,.75)"; ctx.font = "10px monospace";
      ctx.fillText(b.lon.toFixed(1) + "°", x, y + 19);
    });
    if (highlightShan) {
      var ti = QZ_MTN.indexOf(mtnOf(highlightShan));
      if (ti >= 0) {
        var sa = (ti * 15 + 7.5 - 90) * DEG;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.995, sa - 7.5 * DEG, sa + 7.5 * DEG);
        ctx.strokeStyle = "rgba(231,111,81,.95)"; ctx.lineWidth = 6; ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = "#e0c878"; ctx.fill();
  }
  var STYLE_ID = "qz-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      "#ky-panel-qizheng .qz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}",
      "#ky-panel-qizheng .qz-field{display:flex;flex-direction:column;gap:5px;min-width:0}",
      "#ky-panel-qizheng label{font-size:.8em;color:var(--dim)}",
      "#ky-panel-qizheng input,#ky-panel-qizheng select{padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--input);color:var(--text);font-family:inherit;font-size:.86em;width:100%}",
      "#ky-panel-qizheng .qz-chart{width:100%;max-width:520px;aspect-ratio:1/1;margin:0 auto;display:block}",
      "#ky-panel-qizheng .qz-table{width:100%;border-collapse:collapse;font-size:.8em;margin-top:8px}",
      "#ky-panel-qizheng .qz-table th,#ky-panel-qizheng .qz-table td{border:1px solid var(--border);padding:6px 8px;text-align:center}",
      "#ky-panel-qizheng .qz-table th{color:var(--goldL);background:rgba(200,164,92,.08)}",
      "#ky-panel-qizheng .qz-good{color:#5ec07a}#ky-panel-qizheng .qz-bad{color:var(--redL)}#ky-panel-qizheng .qz-mid{color:#e9c46a}",
      "#ky-panel-qizheng .qz-note{color:var(--dim);font-size:.78em;line-height:1.8;margin-top:8px}",
      "#ky-panel-qizheng .qz-body-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
      "#ky-panel-qizheng .qz-chip{padding:3px 9px;border-radius:999px;border:1px solid var(--border);font-size:.78em}",
      "#ky-panel-qizheng .qz-chip.pt{color:var(--goldL);border-color:var(--gold)}"
    ].join("\n");
    var st = document.createElement("style");
    st.id = STYLE_ID; st.textContent = css;
    document.head.appendChild(st);
  }
  function mount(el) {
    injectStyle();
    var shanOpts = QZ_MTN.map(function (s) { return '<option value="' + s + '">' + s + "山</option>"; }).join("");
    var year = new Date().getFullYear();
    el.innerHTML =
      '<div class="card"><h3>✨ 七政四余 · 星盘与天星择日</h3>' +
      '<p style="color:var(--dim);font-size:.84em;line-height:1.8">七政（日月金木水火土）与四余（罗计孛气）落宫、躔宿；择日按天星派原则评太阳到山、恩难仇用、太岁三煞。' +
      '星历为前端概算（太阳/太阴约 0.1–0.5°，五星约 1–3°），最终定课仍需专业星历复核。</p>' +
      '<div class="qz-grid">' +
      '<div class="qz-field"><label>坐山（二十四山）</label><select id="qz-shan">' + shanOpts + "</select></div>" +
      '<div class="qz-field"><label>年份</label><input type="number" id="qz-year" value="' + year + '"></div>' +
      '<div class="qz-field"><label>事由</label><select id="qz-purpose"><option value="">（不限）</option><option>嫁娶</option><option>入宅</option><option>开市</option><option>动土</option><option>安葬</option><option>出行</option><option>祭祀</option><option>竖柱</option><option>入学</option></select></div>' +
      '<div class="qz-field"><label>盘式</label><select id="qz-disk"><option>地盘</option><option>天盘</option><option>人盘</option></select></div>' +
      '<div class="qz-field"><label>起盘日期</label><input type="date" id="qz-date" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      "</div>" +
      '<div style="margin-top:14px"><button class="btn-go" id="qz-draw">✨ 起星盘</button> ' +
      '<button class="btn-go" id="qz-best" style="background:rgba(200,164,92,.2);color:var(--goldL);border:1px solid var(--gold)">📅 全年择日</button>' +
      '<span id="qz-status" style="margin-left:12px;color:var(--dim);font-size:.84em"></span></div>' +
      "</div>" +
      '<div id="qz-out"></div>';
    document.getElementById("qz-shan").value = "子";
    function readCfg() {
      return {
        shan: document.getElementById("qz-shan").value,
        year: parseInt(document.getElementById("qz-year").value, 10) || new Date().getFullYear(),
        purpose: document.getElementById("qz-purpose").value,
        disk: document.getElementById("qz-disk").value
      };
    }
    document.getElementById("qz-draw").addEventListener("click", function () {
      var cfg = readCfg();
      var ds = document.getElementById("qz-date").value || new Date().toISOString().slice(0, 10);
      var date = new Date(ds + "T12:00:00Z");
      var pos = positions(date);
      var rows = pos.bodies.map(function (b) {
        return "<tr><td>" + b.cn + "</td><td>" + b.el + "</td><td>" + b.lon.toFixed(2) + "°</td><td>" + b.palace + "宫</td><td>" + b.mtn + "山</td><td>" + b.xiu + "</td></tr>";
      }).join("");
      var sc = scoreDay(date, cfg.shan, cfg.purpose, cfg.disk);
      var scClass = sc.score >= 75 ? "qz-good" : sc.score >= 50 ? "qz-mid" : "qz-bad";
      document.getElementById("qz-out").innerHTML =
        '<div class="card"><h3>✨ 七政四余星盘 · ' + esc(ds) + "</h3>" +
        '<canvas class="qz-chart" id="qz-canvas"></canvas>' +
        '<div class="qz-body-chips">' + pos.bodies.map(function (b) {
          return '<span class="qz-chip pt">' + b.cn + " " + b.palace + "宫 " + b.lon.toFixed(1) + "°</span>";
        }).join("") + "</div>" +
        '<table class="qz-table"><thead><tr><th>星曜</th><th>五行</th><th>黄经</th><th>宫</th><th>山</th><th>躔宿</th></tr></thead><tbody>' + rows + "</tbody></table>" +
        '<h4 style="margin-top:14px;color:var(--goldL);font-size:.92em">当日坐山评分（' + esc(cfg.shan) + "山 · " + esc(cfg.disk) + "）</h4>" +
        '<div style="font-size:1.05em;font-weight:700">得分 <span class="' + scClass + '">' + sc.score + " / 150（" + sc.verdict + "）</span></div>" +
        '<div class="qz-note"><span class="qz-good">吉：</span>' + (sc.good.join("；") || "—") + "<br><span class=\"qz-bad\">凶：</span>" + (sc.bad.join("；") || "—") + "</div>" +
        "</div>" +
        '<div class="card" style="text-align:center"><h3>🔮 AI 详批 · 七政四余</h3>' +
        '<button class="btn-go" id="qz-ai-btn">AI 研判</button>' +
        '<div id="qz-ai-status" style="margin-top:8px;color:var(--dim)"></div>' +
        '<div id="qz-ai-response" style="display:none"></div></div>';
      var aiBtn = document.getElementById("qz-ai-btn");
      if (aiBtn && window.KanyuAI) {
        aiBtn.addEventListener("click", function () {
          window.KanyuAI.run({
            mode: "qizheng",
            chart: {
              school: "七政四余 · 天星择日", date: ds, zuo_shan: cfg.shan, purpose: cfg.purpose || "不限", disk: cfg.disk,
              bodies: pos.bodies.map(function (b) { return { star: b.cn, element: b.el, lon: Math.round(b.lon * 100) / 100, palace: b.palace + "宫", mountain: b.mtn + "山", xiu: b.xiu }; }),
              score: sc.score, verdict: sc.verdict, good: sc.good, bad: sc.bad
            },
            question: "请按七政四余天星择日原则评审此日",
            title: "七政四余 · AI 详批",
            responseEl: document.getElementById("qz-ai-response"),
            statusEl: document.getElementById("qz-ai-status"),
            btnEl: aiBtn
          });
        });
      }
      requestAnimationFrame(function () { drawChart(document.getElementById("qz-canvas"), date, cfg.shan); });
      document.getElementById("qz-status").textContent = "星盘已排";
    });
    document.getElementById("qz-best").addEventListener("click", function () {
      var cfg = readCfg();
      var status = document.getElementById("qz-status");
      status.textContent = "全年评分中…";
      setTimeout(function () {
        var best = findBest(cfg.shan, cfg.year, cfg.purpose, cfg.disk, 15);
        var rows = best.map(function (b, i) {
          var cls = b.score >= 100 ? "qz-good" : b.score >= 75 ? "qz-mid" : "";
          return "<tr><td>" + (i + 1) + "</td><td>" + b.date + "</td><td>" + b.sun.mtn + "山</td><td>" + b.sun.xiu + "</td><td class=\"" + cls + "\">" + b.score + "</td><td>" + b.verdict + "</td><td style=\"text-align:left\">" + esc(b.good.slice(0, 2).join("；")) + "</td></tr>";
        }).join("");
        document.getElementById("qz-out").innerHTML =
          '<div class="card"><h3>📅 ' + cfg.year + " 年 · " + esc(cfg.shan) + "山天星择日（" + esc(cfg.disk) + "）</h3>" +
          '<div class="qz-note">按太阳到山/到向、太阴、恩难仇用、太岁三煞、季节旺山、二十八宿吉凶评分；分数越高越宜。' +
          (cfg.purpose ? "用事：" + esc(cfg.purpose) + "。" : "") + "</div>" +
          '<table class="qz-table"><thead><tr><th>#</th><th>日期</th><th>太阳到山</th><th>太阳躔宿</th><th>得分</th><th>等级</th><th>主要吉因</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
        var bestCard = document.getElementById("qz-out");
        bestCard.insertAdjacentHTML("beforeend",
          '<div class="card" style="text-align:center"><h3>🔮 AI 详批 · 全年择日</h3>' +
          '<button class="btn-go" id="qz-ai-btn">AI 研判</button>' +
          '<div id="qz-ai-status" style="margin-top:8px;color:var(--dim)"></div>' +
          '<div id="qz-ai-response" style="display:none"></div></div>');
        var aiBtn = document.getElementById("qz-ai-btn");
        if (aiBtn && window.KanyuAI) {
          aiBtn.addEventListener("click", function () {
            window.KanyuAI.run({
              mode: "qizheng",
              chart: {
                school: "七政四余 · 全年天星择日", year: cfg.year, zuo_shan: cfg.shan, purpose: cfg.purpose || "不限", disk: cfg.disk,
                candidates: best.map(function (b) { return { date: b.date, score: b.score, verdict: b.verdict, sun_mountain: b.sun.mtn + "山", sun_xiu: b.sun.xiu, good: b.good, bad: b.bad }; })
              },
              question: "请按七政四余天星择日原则复评这些候选吉日",
              title: "七政四余择日 · AI 详批",
              responseEl: document.getElementById("qz-ai-response"),
              statusEl: document.getElementById("qz-ai-status"),
              btnEl: aiBtn
            });
          });
        }
        status.textContent = "选出 " + best.length + " 个吉日";
      }, 20);
    });
  }
  window.KanyuQizheng = {
    mount: mount,
    positions: positions,
    scoreDay: scoreDay,
    findBest: findBest,
    drawChart: drawChart,
    bodyLon: bodyLon,
    QZ_MTN: QZ_MTN,
    sunLonTropical: sunLonTropical,
    moonLonTropical: moonLonTropical
  };
})();
