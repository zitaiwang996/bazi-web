// liuren.js — 大六壬排盘引擎 (JavaScript 移植版)
// 依据 liuren-dual-system-complete skill 的 engine/core.py + engine/pan.py（玄奥大六壬V1.2 逻辑）
// 含：天地盘(月将加时)、四课、九宗门发传、十二天将、遁干、旬空、六亲、长生、神煞、课体。
(function () {
  "use strict";

  var GAN = "甲乙丙丁戊己庚辛壬癸";
  var ZHI = "子丑寅卯辰巳午未申酉戌亥";
  var GAN_WX = { 甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水" };
  var ZHI_WX = { 寅:"木",卯:"木",巳:"火",午:"火",辰:"土",戌:"土",丑:"土",未:"土",申:"金",酉:"金",亥:"水",子:"水" };
  var GAN_YY = { 甲:"阳",乙:"阴",丙:"阳",丁:"阴",戊:"阳",己:"阴",庚:"阳",辛:"阴",壬:"阳",癸:"阴" };
  var ZHI_YY = { 子:"阳",寅:"阳",辰:"阳",午:"阳",申:"阳",戌:"阳",丑:"阴",卯:"阴",巳:"阴",未:"阴",酉:"阴",亥:"阴" };
  var SHENG = { 木:"火",火:"土",土:"金",金:"水",水:"木" };
  var KE = { 木:"土",土:"水",水:"火",火:"金",金:"木" };
  // 寄宫：甲寅乙辰丙戊巳，丁己未上庚申寻，辛戌壬亥癸丑毕
  var JIGONG = { 甲:"寅",乙:"辰",丙:"巳",丁:"未",戊:"巳",己:"未",庚:"申",辛:"戌",壬:"亥",癸:"丑" };
  var ZHI_IDX = {}; ZHI.split("").forEach(function (z, i) { ZHI_IDX[z] = i; });
  var IDX_ZHI = {}; ZHI.split("").forEach(function (z, i) { IDX_ZHI[i] = z; });
  // 月将（以中气换将，English key ← terms_data.js）
  var YUEJIANG = {
    rain_water:"亥", spring_equinox:"戌", grain_rain:"酉", lesser_fullness:"申",
    summer_solstice:"未", greater_heat:"午", end_of_heat:"巳", autumn_equinox:"辰",
    frost_descent:"卯", lesser_snow:"寅", winter_solstice:"丑", greater_cold:"子"
  };
  var YUEJIANG_NAME = { 亥:"登明",戌:"河魁",酉:"从魁",申:"传送",未:"小吉",午:"胜光",
                        巳:"太乙",辰:"天罡",卯:"太冲",寅:"功曹",丑:"大吉",子:"神后" };
  var GUI_REN = { 甲:["丑","未"],乙:["子","申"],丙:["亥","酉"],丁:["亥","酉"],戊:["丑","未"],
                  己:["子","申"],庚:["丑","未"],辛:["寅","午"],壬:["巳","卯"],癸:["巳","卯"] };
  var TJ_SHUN = ["贵人","螣蛇","朱雀","六合","勾陈","青龙","天空","白虎","太常","玄武","太阴","天后"];
  var TJ_NI   = ["贵人","天后","太阴","玄武","太常","白虎","天空","青龙","勾陈","六合","朱雀","螣蛇"];
  var TJ_WX = { 贵人:"土",螣蛇:"火",朱雀:"火",六合:"木",勾陈:"土",青龙:"木",天空:"土",白虎:"金",太常:"土",玄武:"水",太阴:"金",天后:"水" };
  var XUN_KONG = { 甲子:"戌亥", 甲戌:"申酉", 甲申:"午未", 甲午:"辰巳", 甲辰:"寅卯", 甲寅:"子丑" };
  var CHANGSHENG = ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];
  var WX_CS_START = { 木:"亥", 火:"寅", 金:"巳", 水:"申", 土:"申" };
  var GAN_HE = { 甲:"己",乙:"庚",丙:"辛",丁:"壬",戊:"癸",己:"甲",庚:"乙",辛:"丙",壬:"丁",癸:"戊" };
  var LIUCHONG = { 子:"午",丑:"未",寅:"申",卯:"酉",辰:"戌",巳:"亥",午:"子",未:"丑",申:"寅",酉:"卯",戌:"辰",亥:"巳" };
  var XING = { 寅:"巳",巳:"申",申:"寅",丑:"戌",戌:"未",未:"丑",子:"卯",卯:"子",辰:"辰",午:"午",酉:"酉",亥:"亥" };
  var SANHE_BEFORE = { 巳:"酉",酉:"丑",丑:"巳",亥:"卯",卯:"未",未:"亥" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c];
    });
  }
  function add(z, n) { return IDX_ZHI[(ZHI_IDX[z] + n % 12 + 12) % 12]; }
  function sub(z, n) { return IDX_ZHI[(ZHI_IDX[z] - n % 12 + 12) % 12]; }
  function xiangKe(a, b) { return KE[ZHI_WX[a]] === ZHI_WX[b]; }
  function tianPan(yuejiang, shi) {
    var diff = (ZHI_IDX[yuejiang] - ZHI_IDX[shi] + 12) % 12, tp = {};
    ZHI.split("").forEach(function (d, i) { tp[d] = IDX_ZHI[(i + diff) % 12]; });
    return tp;
  }
  function siKe(riGan, riZhi, tp) {
    var jg = JIGONG[riGan];
    var g1 = tp[jg], g2 = tp[g1], g3 = tp[riZhi], g4 = tp[g3];
    return { shang:[g1,g2,g3,g4], xia:[jg,g1,riZhi,g3] };
  }
  function keList(shang, xia) {
    var out = [];
    for (var i = 0; i < 4; i++) {
      var s = shang[i], x = xia[i];
      if (s === x) continue;
      if (xiangKe(s, x)) out.push({ type:"上克下", shang:s, xia:x, idx:i });
      else if (xiangKe(x, s)) out.push({ type:"下克上", shang:s, xia:x, idx:i });
    }
    return out;
  }
  function xun(riGan, riZhi) {
    var gi = GAN.indexOf(riGan), zi = ZHI_IDX[riZhi];
    var jz = ((zi - gi) % 12 + 12) % 12;
    if (jz % 2 !== 0) return { xun:"", kong:"" };
    var name = "甲" + IDX_ZHI[jz];
    return { xun: name, kong: XUN_KONG[name] || "" };
  }
  function liuqin(riGan, shenGan) {
    if (!shenGan) return "";
    var r = GAN_WX[riGan], s = GAN_WX[shenGan];
    if (s === r) return "兄弟";
    if (SHENG[s] === r) return "父母";
    if (SHENG[r] === s) return "子孙";
    if (KE[s] === r) return "官鬼";
    if (KE[r] === s) return "妻财";
    return "";
  }
  function changsheng(wx, z) {
    var start = WX_CS_START[wx]; if (!start) return "";
    return CHANGSHENG[(ZHI_IDX[z] - ZHI_IDX[start] + 12) % 12];
  }
  // 六亲（以三传地支五行对日干论，陈剑/指南系主线）
  function qinByZhi(riGan, z) {
    var r = GAN_WX[riGan], s = ZHI_WX[z];
    if (!r || !s) return "";
    if (s === r) return "兄弟";
    if (SHENG[s] === r) return "父母";
    if (SHENG[r] === s) return "子孙";
    if (KE[s] === r) return "官鬼";
    if (KE[r] === s) return "妻财";
    return "";
  }
  // 十二长生（以日干起，甲亥乙午丙寅丁酉戊寅己酉庚巳辛子壬申癸卯）
  var CS_BY_GAN = { 甲:"亥",乙:"午",丙:"寅",丁:"酉",戊:"寅",己:"酉",庚:"巳",辛:"子",壬:"申",癸:"卯" };
  function csByGan(riGan, z) {
    var start = CS_BY_GAN[riGan]; if (!start) return "";
    return CHANGSHENG[(ZHI_IDX[z] - ZHI_IDX[start] + 12) % 12];
  }
  // 12 将
  function tianJiang(tp, riGan, shi) {
    var iz = ZHI_IDX[shi];
    var zhou = iz > ZHI_IDX["寅"] && iz < ZHI_IDX["酉"];
    var gr = GUI_REN[riGan][zhou ? 0 : 1];
    var grtp = tp[gr];
    var gi = ZHI_IDX[grtp];
    var order = zhou ? TJ_SHUN : TJ_NI;
    var map = {};
    for (var i = 0; i < 12; i++) map[IDX_ZHI[(gi + i) % 12]] = order[i];
    return { map: map, guiren: gr, guirenTp: grtp, dir: zhou ? "昼·顺" : "夜·逆" };
  }
  function dunGan(riGan, shi, tp) {
    var start = WU_SHU[riGan], si = GAN.indexOf(start), out = {};
    ZHI.split("").forEach(function (d, i) { out[tp[d]] = GAN[(si + i) % 10]; });
    return out;
  }
  var WU_SHU = { 甲:"甲",乙:"丙",丙:"戊",丁:"庚",戊:"壬",己:"甲",庚:"丙",辛:"戊",壬:"庚",癸:"壬" };

  // ===== 九宗门发传 =====
  function fayong(riGan, riZhi, tp, sk, xk, klist) {
    var riYang = GAN_YY[riGan];
    if (isFuyin(tp)) return fuyinSC(riGan, sk, klist);
    if (isFanyin(tp)) return fanyinSC(tp, klist);
    var uniq = {}; sk.forEach(function (s) { uniq[s] = 1; });
    if (Object.keys(uniq).length <= 2 && klist.length === 0) return bazhuanSC(riGan, sk);
    if (klist.length === 0) {
      var y = yaoke(riGan, riZhi, tp, sk);
      if (y) return y;
      if (Object.keys(uniq).length === 4) return maoxing(riGan, tp, sk);
      return bieze(riGan, riZhi, tp, sk);
    }
    var start = null, ftype = "";
    if (klist.length === 1) {
      start = klist[0].shang; ftype = klist[0].type === "上克下" ? "元首" : "重审";
    } else {
      var xiaKe = klist.filter(function (k) { return k.type === "下克上"; });
      var pool = xiaKe.length ? xiaKe : klist;
      if (pool.length === 1) { start = pool[0].shang; ftype = xiaKe.length ? "重审" : "元首"; }
      else { var r = biyongShehai(riGan, pool); start = r[0]; ftype = r[1]; }
    }
    if (!start) return ["","","","传不明"];
    return [start, tp[start], tp[tp[start]], ftype];
  }
  function isFuyin(tp) { for (var d in tp) if (tp[d] !== d) return false; return true; }
  function isFanyin(tp) { for (var d in tp) if (LIUCHONG[d] !== tp[d]) return false; return true; }
  function biyongShehai(riGan, items) {
    var riYang = GAN_YY[riGan];
    var same = items.filter(function (k) { return ZHI_YY[k.shang] === riYang; });
    if (same.length === 1) return [same[0].shang, "知一(比用)"];
    var best = null, bestN = -1;
    items.forEach(function (k) {
      var cnt = 0, cur = k.shang;
      for (var i = 0; i < 12; i++) { cur = sub(cur, 1); if (cur === k.shang) break; if (xiangKe(k.shang, cur)) cnt++; }
      if (cnt > bestN) { bestN = cnt; best = k.shang; }
    });
    if (best) return [best, "涉害"];
    var meng = items.filter(function (k) { return "寅申巳亥".indexOf(k.shang) >= 0; });
    if (meng.length) return [meng[0].shang, "涉害(孟)"];
    var zhong = items.filter(function (k) { return "子午卯酉".indexOf(k.shang) >= 0; });
    if (zhong.length) return [zhong[0].shang, "涉害(仲)"];
    return [riYang === "阳" ? items[0].shang : items[items.length-1].shang, "涉害"];
  }
  // 遥克：四课上神与「日干」五行相克（蒿矢：神克日干；弹射：日干克神）
  function yaoke(riGan, riZhi, tp, sk) {
    var rw = GAN_WX[riGan];
    var ks = sk.filter(function (s) { return KE[ZHI_WX[s]] === rw; });
    if (ks.length) { var s = pickSame(riGan, ks); return [s, tp[s], tp[tp[s]], "遥克(神遥克日)"]; }
    ks = sk.filter(function (s) { return KE[rw] === ZHI_WX[s]; });
    if (ks.length) { var s2 = pickSame(riGan, ks); return [s2, tp[s2], tp[tp[s2]], "遥克(日遥克神)"]; }
    return null;
  }
  function pickSame(riGan, arr) {
    var ry = GAN_YY[riGan];
    var same = arr.filter(function (s) { return ZHI_YY[s] === ry; });
    return same.length ? same[0] : arr[0];
  }
  function maoxing(riGan, tp, sk) {
    if (GAN_YY[riGan] === "阳") return [sk[3], tp[sk[2]], tp[sk[0]], "昴星(虎视转篷)"];
    var start = sub("酉", 1);
    return [start, sk[2], sk[0], "昴星(冬蛇掩目)"];
  }
  function bieze(riGan, riZhi, tp, sk) {
    if (GAN_YY[riGan] === "阳") {
      var he = GAN_HE[riGan], hz = JIGONG[he];
      return [tp[hz], sk[0], sk[0], "别责(干合神)"];
    }
    var b = SANHE_BEFORE[riZhi];
    return [b ? tp[b] : sk[0], sk[0], sk[0], "别责(支前三合)"];
  }
  function bazhuan(riGan, sk) { return bazhuanSC(riGan, sk); }
  function bazhuanSC(riGan, sk) {
    if (GAN_YY[riGan] === "阳") return [add(sk[0], 3), sk[0], sk[0], "八专"];
    return [sub(sk[3], 3), sk[0], sk[0], "八专"];
  }
  function fuyinSC(riGan, sk, klist) {
    var start, m, e;
    if (klist.length) { start = klist[0].shang; }
    else start = GAN_YY[riGan] === "阳" ? sk[0] : sk[2];
    m = XING[start];
    if (!m || "辰午酉亥".indexOf(start) >= 0) m = GAN_YY[riGan] === "阳" ? sk[2] : sk[0];
    e = XING[m];
    if (!e || "辰午酉亥".indexOf(m) >= 0) e = LIUCHONG[m];
    return [start, m, e, klist.length ? "伏吟(有克)" : "伏吟(无克)"];
  }
  function fanyinSC(tp, klist) {
    if (klist.length) { var s = klist[0].shang; return [s, LIUCHONG[s], tp[LIUCHONG[s]], "返吟(有克)"]; }
    var s2 = "寅";
    return [s2, LIUCHONG[s2], tp[LIUCHONG[s2]], "返吟(无克·驿马)"];
  }

  // ===== 神煞 =====
  var YIMA = { 申:"寅",子:"寅",辰:"寅", 亥:"巳",卯:"巳",未:"巳", 寅:"申",午:"申",戌:"申", 巳:"亥",酉:"亥",丑:"亥" };
  var TIANXI = { 寅:"戌",卯:"戌",辰:"戌", 巳:"丑",午:"丑",未:"丑", 申:"辰",酉:"辰",戌:"辰", 亥:"未",子:"未",丑:"未" };
  var JIESHA = { 申:"巳",子:"巳",辰:"巳", 亥:"申",卯:"申",未:"申", 寅:"亥",午:"亥",戌:"亥", 巳:"寅",酉:"寅",丑:"寅" };
  var ZAISHA = { 申:"午",子:"午",辰:"午", 亥:"酉",卯:"酉",未:"酉", 寅:"子",午:"子",戌:"子", 巳:"卯",酉:"卯",丑:"卯" };
  var JIESHEN = { 甲:"亥",乙:"申",丙:"未",丁:"丑",戊:"酉",己:"亥",庚:"申",辛:"未",壬:"丑",癸:"酉" };
  function shensha(riGan, riZhi, nianZhi, yueZhi) {
    var m = {};
    ZHI.split("").forEach(function (d) {
      var a = [];
      if (d === YIMA[riZhi]) a.push("驿马");
      if (yueZhi && d === TIANXI[yueZhi]) a.push("天喜");
      if (d === JIESHA[riZhi]) a.push("劫煞");
      if (d === ZAISHA[riZhi]) a.push("灾煞");
      if (nianZhi) { if (d === add(nianZhi, 2)) a.push("丧门"); if (d === sub(nianZhi, 2)) a.push("吊客"); }
      if (d === JIESHEN[riGan]) a.push("解神");
      m[d] = a.join("/");
    });
    return m;
  }
  function keti(fayongType) {
    var list = [];
    ["元首","重审","知一","涉害","遥克","昴星","别责","八专","伏吟","返吟"].forEach(function (k) {
      if (fayongType && fayongType.indexOf(k) >= 0) list.push(k);
    });
    return list;
  }

  function findYuejiang(dt) {
    var T = window.SOLAR_TERMS;
    if (!T) return "子";
    var best = null, bestT = -Infinity;
    [dt.getFullYear() - 1, dt.getFullYear(), dt.getFullYear() + 1].forEach(function (y) {
      var row = T[String(y)]; if (!row) return;
      Object.keys(YUEJIANG).forEach(function (k) {
        var v = row[k]; if (!v) return;
        var t = new Date(v.replace(" ", "T") + ":00");
        if (t <= dt && t.getTime() > bestT) { bestT = t.getTime(); best = YUEJIANG[k]; }
      });
    });
    return best || "子";
  }
  function dayPillar(dateStr) {
    if (typeof window.calcDayPillar === "function") return window.calcDayPillar(dateStr);
    var ref = new Date(1900, 0, 1);
    var p = dateStr.split("-").map(Number);
    var days = Math.floor((new Date(p[0], p[1] - 1, p[2]) - ref) / 86400000);
    var idx = ((10 + days) % 60 + 60) % 60;
    return GAN[idx % 10] + ZHI[idx % 12];
  }

  // 由「日干支 + 占时 + 月将」直接建课（供对比/测试，也是 paipan 的核心）
  function buildKe(riGan, riZhi, shi, yuejiang, meta) {
    meta = meta || {};
    var dateStr = meta.date || "", timeStr = meta.time || "", hour = meta.hour || 0;
    var tp = tianPan(yuejiang, shi);
    var sk = siKe(riGan, riZhi, tp);
    var kl = keList(sk.shang, sk.xia);
    var sc = fayong(riGan, riZhi, tp, sk.shang, sk.xia, kl);
    var tj = tianJiang(tp, riGan, shi);
    var dg = dunGan(riGan, shi, tp);
    var xk = xun(riGan, riZhi);
    var ny = window.calcYearPillar ? window.calcYearPillar(dateStr) : "";
    var nm = window.calcMonthPillar ? window.calcMonthPillar(dateStr, hour) : "";
    var nianZhi = ny ? ny[1] : "", yueZhi = nm ? nm[1] : "";
    var ss = shensha(riGan, riZhi, nianZhi, yueZhi);
    var riWx = GAN_WX[riGan];
    var layout = ZHI.split("").map(function (d) {
      var tz = tp[d];
      return { di:d, tian:tz, jiang:tj.map[tz] || "", dunGan:dg[tz] || "", qin:liuqin(riGan, dg[tz] || ""), cs:changsheng(riWx, tz), sha:ss[d] || "" };
    });
    var sanChuan = {
      chu: sc[0], zhong: sc[1], mo: sc[2], fayong: sc[3],
      chuJiang: tj.map[sc[0]] || "", zhongJiang: tj.map[sc[1]] || "", moJiang: tj.map[sc[2]] || "",
      chuQin: liuqin(riGan, dg[sc[0]] || ""), zhongQin: liuqin(riGan, dg[sc[1]] || ""), moQin: liuqin(riGan, dg[sc[2]] || ""),
      chuQinZhi: qinByZhi(riGan, sc[0]), zhongQinZhi: qinByZhi(riGan, sc[1]), moQinZhi: qinByZhi(riGan, sc[2]),
      chuCsGan: csByGan(riGan, sc[0]), zhongCsGan: csByGan(riGan, sc[1]), moCsGan: csByGan(riGan, sc[2]),
      chuDun: dg[sc[0]] || "", zhongDun: dg[sc[1]] || "", moDun: dg[sc[2]] || ""
    };
    return {
      date: dateStr, time: timeStr, question: meta.question || "",
      shi: shi, yuejiang: yuejiang, yuejiangName: YUEJIANG_NAME[yuejiang] || "",
      dayPillar: riGan + riZhi, riGan: riGan, riZhi: riZhi,
      yearGz: ny, monthGz: nm, yearZhi: nianZhi, monthZhi: yueZhi,
      tianPan: tp, siKe: { shang: sk.shang, xia: sk.xia },
      keList: kl.map(function (k) { return k.type + "(" + k.shang + "/" + k.xia + ")"; }),
      sanChuan: sanChuan, tianJiang: tj, dunGan: dg,
      xun: xk.xun, kong: xk.kong, liuqin3: [sanChuan.chuQin, sanChuan.zhongQin, sanChuan.moQin],
      chongsheng: [changsheng(riWx, sc[0]), changsheng(riWx, sc[1]), changsheng(riWx, sc[2])],
      keti: keti(sc[3]), layout: layout, shensha: ss,
      riWx: riWx
    };
  }

  function paipan(dateStr, timeStr, question) {
    var p = String(dateStr || "").split("-").map(Number);
    if (!p[0] || !p[1] || !p[2]) return { error: "请填写日期" };
    var t = String(timeStr || "12:00").split(":").map(Number);
    var hour = t[0] || 0, minute = t[1] || 0;
    var dt = new Date(p[0], p[1] - 1, p[2], hour, minute, 0);
    var shi = hour === 23 ? "子" : IDX_ZHI[Math.floor(((hour + 1) % 24) / 2)];
    var yuejiang = findYuejiang(dt);
    var dp = dayPillar(dateStr);
    return buildKe(dp[0], dp[1], shi, yuejiang, { date: dateStr, time: timeStr, hour: hour, question: question });
  }

  window.LR = { paipan: paipan, buildKe: buildKe, GAN: GAN, ZHI: ZHI, tianPan: tianPan };
  window.calculateLiuren = paipan;
})();
