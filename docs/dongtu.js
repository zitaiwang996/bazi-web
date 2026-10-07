// dongtu.js - 动土/修方择日联动（确定性查表）
// 输入：用事公历日期 + 动土方位(二十四山) + 事项
// 输出：年干支、太岁方、岁破方、三煞方、年五黄方，并判断动土方位是否犯煞。
// 用法：window.KANYU_DONGTU.analyze("2026-03-15", "艮", "动土") -> { html, summary }
(function () {
  "use strict";

  var SHAN = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"];
  var GAN = "甲乙丙丁戊己庚辛壬癸";
  var ZHI = "子丑寅卯辰巳午未申酉戌亥";
  // 年五黄顺飞轨迹（沈氏洛书）：中→乾→兑→艮→离→坎→坤→震→巽
  var FLY = ["中","乾","兑","艮","离","坎","坤","震","巽"];
  var GONG_FANG = {"坎":"正北","艮":"东北","震":"正东","巽":"东南","中":"中宫","乾":"西北","兑":"正西","离":"正南","坤":"西南"};
  var SHAN_GUA = {
    "壬":"坎","子":"坎","癸":"坎","丑":"艮","艮":"艮","寅":"艮",
    "甲":"震","卯":"震","乙":"震","辰":"巽","巽":"巽","巳":"巽",
    "丙":"离","午":"离","丁":"离","未":"坤","坤":"坤","申":"坤",
    "庚":"兑","酉":"兑","辛":"兑","戌":"乾","乾":"乾","亥":"乾"
  };
  // 三煞：按年支三合局，煞在对面三会方（含所夹天干）
  var SAN_SHA = {
    "申子辰": { fang: "南", shan: ["巳","丙","午","丁","未"] },
    "寅午戌": { fang: "北", shan: ["亥","壬","子","癸","丑"] },
    "亥卯未": { fang: "西", shan: ["申","庚","酉","辛","戌"] },
    "巳酉丑": { fang: "东", shan: ["寅","甲","卯","乙","辰"] }
  };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function opposite(shan) {
    var i = SHAN.indexOf(shan);
    return i < 0 ? null : SHAN[(i + 12) % 24];
  }
  function norm360(d) { return ((d % 360) + 360) % 360; }
  function centerOf(shan) {
    var i = SHAN.indexOf(shan);
    return i < 0 ? null : i * 15;
  }
  // 年干支：按立春换年（2月4日为近似分界）
  function yearGanzhi(y, month, day) {
    var yy = y;
    if (month < 2 || (month === 2 && day < 4)) yy = y - 1;
    var idx = ((yy - 1984) % 60 + 60) % 60;
    return { gan: GAN[idx % 10], zhi: ZHI[idx % 12], name: GAN[idx % 10] + ZHI[idx % 12], year: yy };
  }
  function sanShaOf(zhi) {
    if ("申子辰".indexOf(zhi) >= 0) return { key: "申子辰", v: SAN_SHA["申子辰"] };
    if ("寅午戌".indexOf(zhi) >= 0) return { key: "寅午戌", v: SAN_SHA["寅午戌"] };
    if ("亥卯未".indexOf(zhi) >= 0) return { key: "亥卯未", v: SAN_SHA["亥卯未"] };
    return { key: "巳酉丑", v: SAN_SHA["巳酉丑"] };
  }
  // 年紫白入中：2001=8入中（与 xuankong/sha.json 近年表一致）
  function wuHuangGong(year) {
    var ru = ((2009 - year) % 9 + 9) % 9;
    if (ru === 0) ru = 9;
    var i = (5 - ru + 9) % 9;
    return { ru: ru, gong: FLY[i] };
  }

  function analyze(dateStr, fang, thing) {
    fang = String(fang || "").trim();
    thing = String(thing || "动土").trim();
    var m = String(dateStr || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    var gz = yearGanzhi(y, mo, d);
    var ta = gz.zhi, po = opposite(ta);
    var ss = sanShaOf(gz.zhi);
    var wh = wuHuangGong(y);
    var whShan = { "坎": ["壬","子","癸"], "艮": ["丑","艮","寅"], "震": ["甲","卯","乙"], "巽": ["辰","巽","巳"], "离": ["丙","午","丁"], "坤": ["未","坤","申"], "兑": ["庚","酉","辛"], "乾": ["戌","乾","亥"], "中": [] }[wh.gong] || [];

    var hits = [];
    if (fang && centerOf(fang) != null) {
      if (ss.v.shan.indexOf(fang) >= 0) hits.push("三煞（" + gz.name + "年煞" + ss.v.fang + "：" + ss.v.shan.join("") + "）");
      if (whShan.indexOf(fang) >= 0) hits.push("年五黄（" + wh.ru + "入中，五黄到" + wh.gong + GONG_FANG[wh.gong] + "：" + whShan.join("") + "）");
      if (fang === ta) hits.push("太岁（太岁在" + ta + "）");
      if (fang === po) hits.push("岁破（岁破在" + po + "）");
    }

    var rows = [
      { k: "用事日期", v: y + "-" + mo + "-" + d + "（" + gz.name + "年）" },
      { k: "太岁方", v: ta + "（坐" + ta + "为太岁，忌大动、忌挖土起基）" },
      { k: "岁破方", v: po + "（冲太岁，忌动土修造）" },
      { k: "三煞方", v: ss.v.fang + "：" + ss.v.shan.join("") + "（" + gz.name + "年）" },
      { k: "年五黄方", v: wh.gong + GONG_FANG[wh.gong] + (whShan.length ? "：" + whShan.join("") : "（中宫）") + "（" + wh.ru + "入中顺飞）" }
    ];
    if (fang) rows.push({ k: "本次动土方位", v: fang + "山（" + GONG_FANG[SHAN_GUA[fang]] + "）" });

    var verdict, cls;
    if (!fang || centerOf(fang) == null) {
      verdict = "未填动土方位，只能给该年的煞位表；填了方位才能判定能不能动。";
      cls = "";
    } else if (hits.length) {
      verdict = "⚠ 本次动土方位犯：" + hits.join("；") + "。传统上忌动土修造，建议换方位、换日期，或先查月三煞/月五黄再定。";
      cls = "kp-bad";
    } else {
      verdict = "✔ 本次动土方位不犯年三煞、年五黄、太岁、岁破（仍须再查月建与择日吉神）。";
      cls = "kp-good";
    }

    var html =
      '<div class="kp-block"><h4>动土 / 用事择日联动（按年煞查表）</h4>' +
      '<table class="kp-table"><thead><tr><th>项</th><th>结果</th></tr></thead><tbody>' +
      rows.map(function (r) { return "<tr><td>" + esc(r.k) + "</td><td>" + esc(r.v) + "</td></tr>"; }).join("") +
      "</tbody></table>" +
      '<div class="' + cls + ' kp-hl">' + esc(verdict) + "</div>" +
      '<div class="kp-meta">事项：' + esc(thing) + "。本表只算年层（太岁/岁破/三煞/年五黄）；月三煞、月五黄、日时凶煞须再叠查月建与择日。</div></div>";

    var summary = {
      date: y + "-" + mo + "-" + d, yearGanzhi: gz.name, thing: thing,
      taisui: ta, suipo: po, sansha: { fang: ss.v.fang, shan: ss.v.shan },
      wuhuang: { ru: wh.ru, gong: wh.gong, shan: whShan },
      fang: fang, hits: hits, ok: hits.length === 0 && !!fang
    };

    var aiText = "动土择日（" + thing + "，" + y + "-" + mo + "-" + d + " 年" + gz.name + "）：" +
      "太岁在" + ta + "，岁破在" + po + "，三煞在" + ss.v.fang + "(" + ss.v.shan.join("") + ")，" +
      "年五黄到" + wh.gong + (whShan.length ? "(" + whShan.join("") + ")" : "中宫") + "。" +
      (fang ? "本次动土方位=" + fang + "。" + (hits.length ? "犯煞：" + hits.join("；") + "。" : "不犯年煞。") : "未填动土方位。");

    return { html: html, summary: summary, aiText: aiText };
  }

  window.KANYU_DONGTU = { analyze: analyze, SHAN: SHAN, sanShaOf: sanShaOf, wuHuangGong: wuHuangGong };
})();
