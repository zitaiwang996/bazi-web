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
  // 用事（含婚丧嫁娶 / 满月宴等）与事由五行
  var EVENTS = [
    { g: "婚嫁喜庆", list: ["嫁娶", "订婚", "订婚宴", "满月宴", "百日宴", "周岁宴", "寿宴", "乔迁宴"] },
    { g: "营建开张", list: ["入宅", "搬迁", "动土", "修造", "竖柱", "上梁", "开市", "开业", "签约"] },
    { g: "丧祭", list: ["安葬", "立碑", "祭祀", "谢土", "迁坟"] },
    { g: "日常", list: ["出行", "入学", "求医", "安床", "开光", "会友"] }
  ];
  var EVENT_WX = {
    嫁娶: "火", 订婚: "火", 订婚宴: "火", 满月宴: "火", 百日宴: "火", 周岁宴: "火", 寿宴: "火", 乔迁宴: "火",
    入宅: "火", 搬迁: "火", 动土: "土", 修造: "土", 竖柱: "木", 上梁: "木", 开市: "金", 开业: "金", 签约: "金",
    安葬: "土", 立碑: "土", 祭祀: "火", 谢土: "土", 迁坟: "土",
    出行: "木", 入学: "木", 求医: "木", 安床: "木", 开光: "火", 会友: "木"
  };
  function purposeWx(p) { return EVENT_WX[p] || PURPOSE_WX[p] || null; }
  // 生肖（主命）与日支的关系
  var LIUHE = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
  var LIUCHONG = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
  var LIUHAI = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
  var LIUPO = { 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" };
  function sanHeWith(b) {
    var groups = [["申", "子", "辰"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"]];
    for (var i = 0; i < groups.length; i++) if (groups[i].indexOf(b) >= 0) return groups[i].filter(function (x) { return x !== b; });
    return [];
  }
  // 返回 {score, tags[]}：以生肖（主命）看某日地支
  function zodiacAdjust(dayZhi, zodiac) {
    if (!dayZhi || !zodiac) return { score: 0, tags: [] };
    var tags = [], score = 0;
    if (LIUHE[zodiac] === dayZhi) { score += 8; tags.push({ t: "与主命六合 +8", good: true }); }
    if (sanHeWith(zodiac).indexOf(dayZhi) >= 0) { score += 6; tags.push({ t: "与主命三合 +6", good: true }); }
    if (dayZhi === zodiac) { score += 3; tags.push({ t: "与主命同支 +3", good: true }); }
    if (LIUCHONG[zodiac] === dayZhi) { score -= 15; tags.push({ t: "冲主命生肖 -15", good: false }); }
    if (LIUHAI[zodiac] === dayZhi) { score -= 6; tags.push({ t: "害主命生肖 -6", good: false }); }
    if (LIUPO[zodiac] === dayZhi) { score -= 5; tags.push({ t: "破主命生肖 -5", good: false }); }
    return { score: score, tags: tags };
  }
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
  // 日柱地支（复用站点 bazi.js 的干支引擎；失败则返回空）
  function dayZhiOf(iso) {
    try {
      if (typeof calcDayPillar === "function") {
        var gz = calcDayPillar(iso);
        if (gz && gz.length === 2) return gz[1];
      }
    } catch (e) {}
    return "";
  }
  var WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];
  function weekdayCn(iso) {
    var d = new Date(iso + "T12:00:00Z");
    return isNaN(d.getTime()) ? "" : "星期" + WEEK_CN[d.getUTCDay()];
  }
  function dayGzOf(iso) {
    try { if (typeof calcDayPillar === "function") return calcDayPillar(iso); } catch (e) {}
    return "";
  }
  var HOUR_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var HOUR_RANGE = { 子: "23–01", 丑: "01–03", 寅: "03–05", 卯: "05–07", 辰: "07–09", 巳: "09–11", 午: "11–13", 未: "13–15", 申: "15–17", 酉: "17–19", 戌: "19–21", 亥: "21–23" };
  function hourScore(hz, dayZhi, zodiac) {
    var s = 0, why = [];
    if (dayZhi) {
      if (LIUHE[hz] === dayZhi) { s += 6; why.push("时与日六合"); }
      else if (LIUCHONG[hz] === dayZhi) { s -= 8; why.push("时冲日"); }
    }
    if (zodiac) {
      if (LIUHE[hz] === zodiac) { s += 8; why.push("时与生肖六合"); }
      else if (sanHeWith(zodiac).indexOf(hz) >= 0) { s += 5; why.push("时与生肖三合"); }
      else if (LIUCHONG[hz] === zodiac) { s -= 10; why.push("时冲生肖"); }
      else if (LIUHAI[hz] === zodiac) { s -= 5; why.push("时害生肖"); }
    }
    return { score: s, why: why };
  }
  // 给定日期，排出 12 时辰的吉凶并取最佳
  function bestHours(iso, zodiac) {
    var dz = (dayGzOf(iso) || "")[1] || "";
    var arr = HOUR_ZHI.map(function (hz) { var r = hourScore(hz, dz, zodiac); return { hz: hz, score: r.score, why: r.why }; });
    arr.sort(function (a, b) { return b.score - a.score; });
    return arr;
  }
  // 明确的第一推荐（含日柱、星期、最佳时辰）
  function topPickHtml(b, zodiac, label) {
    if (!b) return "";
    var hs = bestHours(b.date, zodiac) [0];
    var gz = dayGzOf(b.date);
    return '<div class="hl" style="border-left-color:var(--gold);font-size:.92em">' +
      '<b>🎯 ' + (label || "最终推荐") + '：' + b.date + "（" + weekdayCn(b.date) + "）" + (gz ? "　" + gz + "日" : "") + "</b><br>" +
      "推荐时辰：<b>" + hs.hz + "时（" + HOUR_RANGE[hs.hz] + "）</b>" + (hs.why.length ? "　" + hs.why.join("、") : "") + "<br>" +
      "用事评分：<b>" + b.score + " / 150（" + b.verdict + "）</b>" + (b.festival ? "　节日：" + b.festival : "") + "<br>" +
      '<span style="color:var(--dim)">吉因：' + ((b.good || []).join("；") || "—") + "</span>" +
      ((b.bad || []).length ? '<br><span style="color:var(--redL)">注意：' + b.bad.join("；") + "</span>" : "") +
      "</div>";
  }
  function scoreDay(date, shan, purpose, disk, opts) {
    opts = opts || {};
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
    var pwx = purposeWx(purpose);
    if (pwx) {
      var pr = wxRel(pwx, targetEl);
      if (WX_SCORE[pr]) { score += WX_SCORE[pr]; (WX_SCORE[pr] > 0 ? good : bad).push(purpose + pr); }
    }
    var sx = xiuOf(bodyLon(jd, "sun"));
    if (XIU_JX[sx] === "吉") { score += 5; good.push("太阳躔" + sx + "(吉) +5"); }
    else if (XIU_JX[sx] === "凶") { score -= 5; bad.push("太阳躔" + sx + "(凶) -5"); }
    // 主命生肖（冲合刑害破）
    var dz = dayZhiOf(iso);
    var zadj = zodiacAdjust(dz, opts.zodiac);
    if (zadj.score) {
      score += zadj.score;
      zadj.tags.forEach(function (t) { (t.good ? good : bad).push(t.t); });
    }
    // 节日加成 / 指定吉日（满月、百日等）
    var festNames = (opts.festivalMap && opts.festivalMap[iso]) || null;
    if (festNames && festNames.length) {
      score += 6; good.push("节日：" + festNames.join("、") + " +6");
    }
    if (opts.targetDates && opts.targetDates[iso]) {
      score += 25; good.push(opts.targetDates[iso] + " +25");
    }
    score = Math.max(0, Math.min(150, Math.round(score)));
    var verdict = score >= 100 ? "大吉" : score >= 75 ? "吉" : score >= 50 ? "平" : score >= 30 ? "凶" : "大凶";
    return { date: iso, jd: jd, dayZhi: dz, zodiac: opts.zodiac || "", festival: (festNames || []).join("、"), score: score, verdict: verdict, good: good, bad: bad, sun: { mtn: sunM, xiu: sx }, moon: { mtn: moonM } };
  }
  function findBest(shan, year, purpose, disk, topN, opts) {
    var out = [];
    var start = new Date(Date.UTC(year, 0, 1, 12, 0));
    for (var i = 0; i < 365; i++) out.push(scoreDay(new Date(start.getTime() + i * 86400000), shan, purpose, disk, opts));
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
      "#ky-panel-qizheng .qz-chip.pt{color:var(--goldL);border-color:var(--gold)}",
      "#ky-panel-qizheng .qz-subnav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}",
      "#ky-panel-qizheng .qz-sub{padding:7px 15px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--dim);cursor:pointer;font-family:inherit;font-size:.86em;font-weight:600}",
      "#ky-panel-qizheng .qz-sub:hover{border-color:var(--gold);color:var(--goldL)}",
      "#ky-panel-qizheng .qz-sub.active{border-color:var(--gold);background:rgba(200,164,92,.16);color:var(--goldL)}",
      "#ky-panel-qizheng .qz-pane{display:none}",
      "#ky-panel-qizheng .qz-pane.active{display:block}",
      "#ky-panel-qizheng .qz-opt{font-size:.78em;color:var(--dim);line-height:1.7}",
      "#ky-panel-qizheng .qz-sub-table td:last-child{text-align:left}",
      "#ky-panel-qizheng .qz-24 td{white-space:nowrap}",
      "#ky-panel-qizheng .qz-24 .hi{color:var(--goldL);font-weight:600}"
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
      '<div class="qz-subnav">' +
      '<button type="button" class="qz-sub active" data-pane="xiezi">📅 择日</button>' +
      '<button type="button" class="qz-sub" data-pane="natal">🧬 本命盘解读</button>' +
      '<button type="button" class="qz-sub" data-pane="transit">🔭 星象演算</button>' +
      '</div>' +
      '<div class="qz-pane active" id="qz-pane-xiezi">' +
      '<div class="qz-grid">' +
      '<div class="qz-field"><label>坐山（二十四山）</label><select id="qz-shan">' + shanOpts + "</select></div>" +
      '<div class="qz-field"><label>年份</label><input type="number" id="qz-year" value="' + year + '"></div>' +
      '<div class="qz-field"><label>用事（事由）</label><select id="qz-purpose"><option value="">（不限）</option>' +
      EVENTS.map(function (g) { return '<optgroup label="' + g.g + '">' + g.list.map(function (e) { return "<option>" + e + "</option>"; }).join("") + "</optgroup>"; }).join("") +
      "</select></div>" +
      '<div class="qz-field"><label>主命生肖（可选）</label><select id="qz-zodiac"><option value="">不限</option>' +
      [["子", "鼠"], ["丑", "牛"], ["寅", "虎"], ["卯", "兔"], ["辰", "龙"], ["巳", "蛇"], ["午", "马"], ["未", "羊"], ["申", "猴"], ["酉", "鸡"], ["戌", "狗"], ["亥", "猪"]]
        .map(function (z) { return '<option value="' + z[0] + '">' + z[1] + "（" + z[0] + "）</option>"; }).join("") +
      "</select></div>" +
      '<div class="qz-field" id="qz-birth-wrap" style="display:none"><label>宝宝 / 事主出生日期</label><input type="date" id="qz-birth"></div>' +
      '<div class="qz-field"><label>节日</label><select id="qz-festival"><option value="">不限</option><option value="auto">自动（按用事匹配）</option></select></div>' +
      '<div class="qz-field"><label>盘式</label><select id="qz-disk"><option>地盘</option><option>天盘</option><option>人盘</option></select></div>' +
      '<div class="qz-field"><label>起盘日期</label><input type="date" id="qz-date" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      "</div>" +
      '<div class="qz-opt" id="qz-event-hint"></div>' +
      '<div style="margin-top:14px"><button class="btn-go" id="qz-draw">✨ 起星盘</button> ' +
      '<button class="btn-go" id="qz-best" style="background:rgba(200,164,92,.2);color:var(--goldL);border:1px solid var(--gold)">📅 全年择日</button>' +
      '<span id="qz-status" style="margin-left:12px;color:var(--dim);font-size:.84em"></span></div>' +
      "</div>" +
      '<div id="qz-out"></div>' +
      "</div>" +
      '<div class="qz-pane" id="qz-pane-natal"></div>' +
      '<div class="qz-pane" id="qz-pane-transit"></div>';
    document.getElementById("qz-shan").value = "子";
    function readCfg() {
      return {
        shan: document.getElementById("qz-shan").value,
        year: parseInt(document.getElementById("qz-year").value, 10) || new Date().getFullYear(),
        purpose: document.getElementById("qz-purpose").value,
        disk: document.getElementById("qz-disk").value,
        zodiac: document.getElementById("qz-zodiac").value,
        birth: (document.getElementById("qz-birth") || {}).value || "",
        festival: document.getElementById("qz-festival").value
      };
    }
    function buildOpts(cfg) {
      var opts = { zodiac: cfg.zodiac || "", festivalMap: {}, targetDates: {} };
      var F = window.QZ_FESTIVALS;
      if (!F) return opts;
      if (/满月宴|百日宴|周岁宴/.test(cfg.purpose) && cfg.birth) {
        var b = new Date(cfg.birth + "T12:00:00Z");
        if (!isNaN(b.getTime())) {
          var days = { 满月宴: 30, 百日宴: 100, 周岁宴: 365 }[cfg.purpose];
          var t = new Date(b.getTime() + days * 86400000);
          if (t.getUTCFullYear() === cfg.year) opts.targetDates[t.toISOString().slice(0, 10)] = cfg.purpose + "正日";
        }
      }
      if (cfg.festival === "auto") {
        F.forEvent(cfg.purpose || "", cfg.year, cfg.birth || "").forEach(function (f) {
          (opts.festivalMap[f.date] = opts.festivalMap[f.date] || []).push(f.name);
        });
      } else if (cfg.festival) {
        var map = F.map(cfg.year);
        Object.keys(map).forEach(function (d) {
          if (map[d].indexOf(cfg.festival) >= 0) opts.festivalMap[d] = [cfg.festival];
        });
      }
      return opts;
    }
    function applyEventUi() {
      var p = document.getElementById("qz-purpose").value;
      var wrap = document.getElementById("qz-birth-wrap");
      var needBirth = /满月宴|百日宴|周岁宴/.test(p);
      if (wrap) wrap.style.display = needBirth ? "" : "none";
      var hint = document.getElementById("qz-event-hint");
      if (hint) hint.textContent = p
        ? ("用事五行：" + (purposeWx(p) || "—") + (needBirth ? "；填出生日期可自动锁定满月 / 百日 / 周岁正日" : ""))
        : "可不选用事，仅按坐山评分；选了用事会按事由五行加吉减凶。";
      var fsel = document.getElementById("qz-festival");
      if (fsel) {
        var cur = fsel.value;
        var html = '<option value="">不限</option><option value="auto">自动（按用事匹配）</option>';
        if (window.QZ_FESTIVALS) {
          var yr = parseInt(document.getElementById("qz-year").value, 10) || new Date().getFullYear();
          var bd = (document.getElementById("qz-birth") || {}).value || "";
          var seen = {};
          window.QZ_FESTIVALS.forEvent(p || "", yr, bd).forEach(function (f) {
            if (!seen[f.name]) { seen[f.name] = 1; html += '<option value="' + f.name + '">' + f.name + " " + f.date + "</option>"; }
          });
        }
        fsel.innerHTML = html;
        if (cur) fsel.value = cur;
      }
    }
    ["qz-purpose", "qz-year"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.addEventListener("change", applyEventUi);
    });
    var birthNode = document.getElementById("qz-birth");
    if (birthNode) birthNode.addEventListener("change", applyEventUi);
    applyEventUi();
    // 子页签：择日 / 本命盘 / 星象演算
    el.querySelectorAll(".qz-sub").forEach(function (b) {
      b.addEventListener("click", function () {
        el.querySelectorAll(".qz-sub").forEach(function (x) { x.classList.toggle("active", x === b); });
        var name = b.getAttribute("data-pane");
        el.querySelectorAll(".qz-pane").forEach(function (p) { p.classList.toggle("active", p.id === "qz-pane-" + name); });
      });
    });
    if (window.KanyuQizhengPlus && window.KanyuQizhengPlus.mount) {
      window.KanyuQizhengPlus.mount({
        natal: document.getElementById("qz-pane-natal"),
        transit: document.getElementById("qz-pane-transit")
      });
    }
    document.getElementById("qz-draw").addEventListener("click", function () {
      var cfg = readCfg();
      var ds = document.getElementById("qz-date").value || new Date().toISOString().slice(0, 10);
      var date = new Date(ds + "T12:00:00Z");
      var pos = positions(date);
      var rows = pos.bodies.map(function (b) {
        return "<tr><td>" + b.cn + "</td><td>" + b.el + "</td><td>" + b.lon.toFixed(2) + "°</td><td>" + b.palace + "宫</td><td>" + b.mtn + "山</td><td>" + b.xiu + "</td></tr>";
      }).join("");
      var sc = scoreDay(date, cfg.shan, cfg.purpose, cfg.disk, buildOpts(cfg));
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
        topPickHtml(sc, cfg.zodiac, "本日推荐时辰") +
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
              zodiac: cfg.zodiac || "不限", festival: sc.festival || "—", day_zhi: sc.dayZhi,
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
        var best = findBest(cfg.shan, cfg.year, cfg.purpose, cfg.disk, 15, buildOpts(cfg));
        var rows = best.map(function (b, i) {
          var cls = b.score >= 100 ? "qz-good" : b.score >= 75 ? "qz-mid" : "";
          return "<tr><td>" + (i + 1) + "</td><td>" + b.date + "</td><td>" + b.sun.mtn + "山</td><td>" + b.sun.xiu + "</td><td>" + (b.festival || "—") + "</td><td class=\"" + cls + "\">" + b.score + "</td><td>" + b.verdict + "</td><td style=\"text-align:left\">" + esc(b.good.slice(0, 2).join("；")) + "</td></tr>";
        }).join("");
        document.getElementById("qz-out").innerHTML =
          '<div class="card"><h3>📅 ' + cfg.year + " 年 · " + esc(cfg.shan) + "山天星择日（" + esc(cfg.disk) + "）</h3>" +
          '<div class="qz-note">按太阳到山/到向、太阴、恩难仇用、太岁三煞、季节旺山、二十八宿吉凶评分；分数越高越宜。' +
          (cfg.purpose ? "用事：" + esc(cfg.purpose) + "。" : "") + "</div>" +
          topPickHtml(best[0], cfg.zodiac, "最终推荐这一日") +
          '<div class="qz-note" style="margin-top:8px">以下为备选：</div>' +
          '<table class="qz-table"><thead><tr><th>#</th><th>日期</th><th>太阳到山</th><th>太阳躔宿</th><th>节日</th><th>得分</th><th>等级</th><th>主要吉因</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
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
                zodiac: cfg.zodiac || "不限", festival_mode: cfg.festival || "不限",
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
    EVENTS: EVENTS,
    purposeWx: purposeWx,
    zodiacAdjust: zodiacAdjust,
    topPickHtml: topPickHtml,
    bestHours: bestHours,
    weekdayCn: weekdayCn,
    dayGzOf: dayGzOf,
    festivalMap: function (y) { return (window.QZ_FESTIVALS && window.QZ_FESTIVALS.map(y)) || {}; },
    sunLonTropical: sunLonTropical,
    moonLonTropical: moonLonTropical
  };
})();
