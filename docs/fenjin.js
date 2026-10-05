// fenjin.js - 分金 / 空亡 / 旺相 规则（三合古法口径，全部代码算，保证一致）
// 依据：sanhe-gufa/references/08-秘法分金与变格.md、data/fenjin.json
(function () {
  "use strict";

  var SHAN = ["壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥"];
  var CENTER = {};
  SHAN.forEach(function (s, i) { CENTER[s] = (345 + i * 15) % 360; });

  // 八干四维取前一位地支的分金：癸同子、艮同丑、甲同寅……
  var BASE = { "癸": "子", "艮": "丑", "甲": "寅", "乙": "卯", "巽": "辰", "丙": "巳", "丁": "午", "坤": "未", "庚": "申", "辛": "酉", "乾": "戌", "壬": "亥" };
  ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"].forEach(function (z) { BASE[z] = z; });

  var YANG_ZHI = { "子": 1, "寅": 1, "辰": 1, "午": 1, "申": 1, "戌": 1 };
  var YANG_GAN = ["甲", "丙", "戊", "庚", "壬"];
  var YIN_GAN = ["乙", "丁", "己", "辛", "癸"];

  var GUIJIA_KONGWANG = {
    "戊子": 1, "己丑": 1, "庚寅": 1, "辛卯": 1, "壬辰": 1, "癸巳": 1,
    "甲午": 1, "乙未": 1, "丙申": 1, "丁酉": 1, "戊戌": 1, "己亥": 1
  };
  var DA_KONGWANG_SHAN = { "甲": 1, "乙": 1, "丙": 1, "丁": 1, "庚": 1, "辛": 1, "壬": 1, "癸": 1, "乾": 1, "坤": 1, "艮": 1, "巽": 1 };

  // 可兼 20 线（歌诀：戌乾壬子子癸兼，丑艮寅甲乙辰先，巳丙丁未坤申合，庚酉原来是后天）
  var KEJIAN = { "戌乾": 1, "壬子": 1, "子癸": 1, "丑艮": 1, "寅甲": 1, "乙辰": 1, "巳丙": 1, "丁未": 1, "坤申": 1, "庚酉": 1 };
  // 只可正向五山
  var ZHENG_XIANG = { "亥": 1, "卯": 1, "巽": 1, "午": 1, "辛": 1 };

  function norm(d) { return ((d % 360) + 360) % 360; }

  function fenjin120(zuo, degree) {
    if (!CENTER.hasOwnProperty(zuo) || degree === "" || degree == null || isNaN(degree)) return null;
    var base = BASE[zuo];
    var center = CENTER[zuo];
    var pos = norm(parseFloat(degree));
    var rel = norm(pos - (center - 7.5));
    var idx = Math.min(4, Math.floor(rel / 3));
    var ganList = YANG_ZHI[base] ? YANG_GAN : YIN_GAN;
    var gan = ganList[idx];
    var gz = gan + base;

    var type;
    if (GUIJIA_KONGWANG[gz]) type = "龟甲空亡";
    else if ("丙丁庚辛".indexOf(gan) >= 0) type = "旺相";
    else if ("甲壬".indexOf(gan) >= 0) type = "阳孤";
    else if ("乙癸".indexOf(gan) >= 0) type = "阴虚";
    else type = "龟甲空亡";

    return {
      ganzhi: gz, gan: gan, base: base, type: type,
      usable: type === "旺相",
      index: idx + 1,
      daKongwang: Boolean(DA_KONGWANG_SHAN[zuo] && idx === 2)
    };
  }

  function jianxiang(zuo) {
    var i = SHAN.indexOf(zuo);
    if (i < 0) return null;
    var prev = SHAN[(i + SHAN.length - 1) % SHAN.length];
    var next = SHAN[(i + 1) % SHAN.length];
    var pairs = [[prev, zuo], [zuo, next]].map(function (p) {
      var a = p[0] + p[1], b = p[1] + p[0];
      return { pair: p[0] + "—" + p[1], ke: Boolean(KEJIAN[a] || KEJIAN[b]) };
    });
    return { pairs: pairs, onlyZhengxiang: Boolean(ZHENG_XIANG[zuo]) };
  }

  function boundary(zuo, degree) {
    if (!CENTER.hasOwnProperty(zuo) || degree === "" || degree == null || isNaN(degree)) return false;
    var pos = norm(parseFloat(degree));
    var edge = ((pos - 7.5) % 15 + 15) % 15;
    return edge < 1.5 || edge > 13.5;
  }

  function analyze(zuo, degree) {
    return {
      zuo: zuo,
      degree: degree,
      fenjin: fenjin120(zuo, degree),
      jianxiang: jianxiang(zuo),
      onBoundary: boundary(zuo, degree),
      lines: {
        yanggong: "杨公线法：周天360度化240条有效分金线，条条可用，无孤虚空亡限制",
        taigu: "胎骨线法：一度一五行，360条线，连大空亡也各有五条分金线",
        note: "两法有一种合同，即有催发富贵之效；以上 120 分金落空亡时，须用秘法分金复核后再定可不可用。"
      }
    };
  }

  window.KANYU_FENJIN = {
    SHAN: SHAN,
    CENTER: CENTER,
    fenjin120: fenjin120,
    jianxiang: jianxiang,
    boundary: boundary,
    analyze: analyze
  };
})();
