// kanyu_pan.js - 确定性排盘（四派），保证每次结果一致
// 用法：KANYU_PAN.compute(method, data) -> { html, summary }
(function () {
  "use strict";

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function wrap9(n) { while (n > 9) n -= 9; while (n < 1) n += 9; return n; }

  // 分金 / 空亡（调用 fenjin.js 的确定性规则）
  function fenjinBlock(zuo, degree) {
    if (!window.KANYU_FENJIN || !zuo) return "";
    var a = window.KANYU_FENJIN.analyze(zuo, degree);
    var rows = [];
    if (a.fenjin) {
      rows.push("<tr><td>一百二十分金</td><td><b>" + esc(a.fenjin.ganzhi) + "</b>（第" + a.fenjin.index + "格）</td><td class=\"" +
        (a.fenjin.usable ? "kp-good" : "kp-bad") + "\">" + esc(a.fenjin.type) + (a.fenjin.usable ? " · 可用" : " · 不用") + "</td></tr>");
      if (a.fenjin.daKongwang) {
        rows.push("<tr><td>大空亡</td><td>" + esc(zuo) + "山正中（八干四维大空格）</td><td class=\"kp-bad\">大空亡，须兼向避开</td></tr>");
      }
    }
    if (a.onBoundary) {
      rows.push("<tr><td>骑线 / 空缝</td><td>坐度接近二十四山交界</td><td class=\"kp-bad\">大凶，须以兼向替卦调整</td></tr>");
    }
    if (a.jianxiang) {
      var js = a.jianxiang.pairs.map(function (p) { return p.pair + "（" + (p.ke ? "可兼" : "不可兼") + "）"; }).join("；");
      rows.push("<tr><td>兼向</td><td>" + js + "</td><td>" + (a.jianxiang.onlyZhengxiang ? "本山只可正向（亥卯巽午辛）" : "") + "</td></tr>");
    }
    if (!rows.length) return "";
    return '<div class="kp-block"><h4>分金与空亡（代码判定）</h4>' +
      '<table class="kp-table"><thead><tr><th>项</th><th>结果</th><th>判</th></tr></thead><tbody>' + rows.join("") + "</tbody></table>" +
      '<div class="kp-meta">' + esc(a.lines.yanggong) + "<br>" + esc(a.lines.taigu) + "<br>" + esc(a.lines.note) + "</div></div>";
  }

  // ================== 玄空飞星（沈氏下卦） ==================
  var XK_FLY = ["中", "乾", "兑", "艮", "离", "坎", "坤", "震", "巽"];
  var XK_NUM_PALACE = { 1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离" };
  var XK_MTN = {
    "壬": { p: "坎", y: "地", yy: "阳" }, "子": { p: "坎", y: "天", yy: "阴" }, "癸": { p: "坎", y: "人", yy: "阴" },
    "丑": { p: "艮", y: "地", yy: "阴" }, "艮": { p: "艮", y: "天", yy: "阳" }, "寅": { p: "艮", y: "人", yy: "阳" },
    "甲": { p: "震", y: "地", yy: "阳" }, "卯": { p: "震", y: "天", yy: "阴" }, "乙": { p: "震", y: "人", yy: "阴" },
    "辰": { p: "巽", y: "地", yy: "阴" }, "巽": { p: "巽", y: "天", yy: "阳" }, "巳": { p: "巽", y: "人", yy: "阳" },
    "丙": { p: "离", y: "地", yy: "阳" }, "午": { p: "离", y: "天", yy: "阴" }, "丁": { p: "离", y: "人", yy: "阴" },
    "未": { p: "坤", y: "地", yy: "阴" }, "坤": { p: "坤", y: "天", yy: "阳" }, "申": { p: "坤", y: "人", yy: "阳" },
    "庚": { p: "兑", y: "地", yy: "阳" }, "酉": { p: "兑", y: "天", yy: "阴" }, "辛": { p: "兑", y: "人", yy: "阴" },
    "戌": { p: "乾", y: "地", yy: "阴" }, "乾": { p: "乾", y: "天", yy: "阳" }, "亥": { p: "乾", y: "人", yy: "阳" }
  };
  var XK_SAME = {};
  Object.keys(XK_MTN).forEach(function (m) {
    var i = XK_MTN[m];
    XK_SAME[i.p] = XK_SAME[i.p] || {};
    XK_SAME[i.p][i.y] = m;
  });
  var XK_GRID = [["巽", "离", "坤"], ["震", "中", "兑"], ["艮", "坎", "乾"]];

  function flyPan(center, dir) {
    var out = {};
    XK_FLY.forEach(function (p, i) { out[p] = wrap9(center + dir * i); });
    return out;
  }
  function getYun(data) {
    var map = { "一运": 1, "二运": 2, "三运": 3, "四运": 4, "五运": 5, "六运": 6, "七运": 7, "八运": 8, "九运": 9 };
    if (map[data.yun]) return map[data.yun];
    var y = parseInt(data.year, 10);
    if (!y) return 0;
    if (y >= 2024) return 9;
    if (y >= 2004) return 8;
    if (y >= 1984) return 7;
    if (y >= 1964) return 6;
    if (y >= 1944) return 5;
    if (y >= 1924) return 4;
    if (y >= 1904) return 3;
    if (y >= 1884) return 2;
    return 1;
  }
  function starPan(info, yunPan) {
    var center = yunPan[info.p];
    var dir;
    if (center === 5) {
      dir = info.yy === "阳" ? 1 : -1;
    } else {
      var same = XK_SAME[XK_NUM_PALACE[center]][info.y];
      dir = XK_MTN[same].yy === "阳" ? 1 : -1;
    }
    return { pan: flyPan(center, dir), center: center, dir: dir };
  }

  function xuankong(data) {
    var yun = getYun(data);
    var zi = XK_MTN[data.zuo], xi = XK_MTN[data.xiang];
    if (!yun || !zi || !xi) {
      return { html: '<div class="kp-note">玄空排盘需要：元运（或建宅年份）+ 坐山 + 朝向。</div>', summary: null };
    }
    var yunPan = flyPan(yun, 1);
    var shan = starPan(zi, yunPan);
    var xiang = starPan(xi, yunPan);

    var patterns = [];
    var sz = shan.pan[zi.p], xz = xiang.pan[zi.p];
    var sx = shan.pan[xi.p], xx = xiang.pan[xi.p];
    if (sz === yun && xx === yun) patterns.push("旺山旺向（到山到向）");
    if (sx === yun && xz === yun) patterns.push("上山下水");
    if (sx === yun && xx === yun) patterns.push("双星会向");
    if (sz === yun && xz === yun) patterns.push("双星会坐");
    if (!patterns.length) patterns.push("非上述四正格（需再看三般卦/反伏吟等）");

    var cells = XK_GRID.map(function (row) {
      return row.map(function (p) {
        var isZ = p === zi.p, isX = p === xi.p;
        return '<div class="kp-cell' + (isZ ? " kp-zuo" : "") + (isX ? " kp-xiang" : "") + '">' +
          '<div class="kp-palace">' + p + (isZ ? " 坐" : "") + (isX ? " 向" : "") + "</div>" +
          '<div class="kp-star"><i>运</i>' + yunPan[p] + '</div>' +
          '<div class="kp-star"><i>山</i>' + shan.pan[p] + '</div>' +
          '<div class="kp-star"><i>向</i>' + xiang.pan[p] + "</div></div>";
      }).join("");
    }).join("");

    var html =
      '<div class="kp-block"><h4>玄空三盘（' + yun + "运 " + esc(data.zuo) + "山" + esc(data.xiang) + "向）</h4>" +
      '<div class="kp-grid">' + cells + "</div>" +
      '<div class="kp-meta">运盘：' + yun + "入中顺飞；山盘：" + shan.center + "入中" + (shan.dir === 1 ? "顺飞" : "逆飞") +
      "；向盘：" + xiang.center + "入中" + (xiang.dir === 1 ? "顺飞" : "逆飞") + "</div>" +
      '<div class="kp-hl">格局：' + patterns.map(esc).join("；") + "</div>" +
      (data.jian && data.jian.indexOf("兼") >= 0
        ? '<div class="kp-bad kp-hl">本局为兼向：沈氏规则兼 3 度以上须用替卦。当前按“下卦”排，替卦结果须以实地度数与替星表复核。</div>'
        : "") + "</div>" + fenjinBlock(data.zuo, data.degree);

    var summary = {
      yun: yun, zuo: data.zuo, xiang: data.xiang,
      yunPan: yunPan, shanPan: shan.pan, xiangPan: xiang.pan, patterns: patterns
    };
    return { html: html, summary: summary };
  }

  // ================== 三合古法 ==================
  var SH_SHUANG = ["壬子", "癸丑", "艮寅", "甲卯", "乙辰", "巽巳", "丙午", "丁未", "坤申", "庚酉", "辛戌", "乾亥"];
  var SH_JU_OF = {
    "坤申": "水局", "壬子": "水局", "乙辰": "水局",
    "艮寅": "火局", "丙午": "火局", "辛戌": "火局",
    "巽巳": "金局", "庚酉": "金局", "癸丑": "金局",
    "乾亥": "木局", "甲卯": "木局", "丁未": "木局"
  };
  var SH_PAN = {
    "火局": { "艮寅": "长生", "甲卯": "沐浴", "乙辰": "冠带", "巽巳": "临官", "丙午": "帝旺", "丁未": "衰", "坤申": "病", "庚酉": "死", "辛戌": "墓", "乾亥": "绝", "壬子": "胎", "癸丑": "养" },
    "水局": { "坤申": "长生", "庚酉": "沐浴", "辛戌": "冠带", "乾亥": "临官", "壬子": "帝旺", "癸丑": "衰", "艮寅": "病", "甲卯": "死", "乙辰": "墓", "巽巳": "绝", "丙午": "胎", "丁未": "养" },
    "金局": { "巽巳": "长生", "丙午": "沐浴", "丁未": "冠带", "坤申": "临官", "庚酉": "帝旺", "辛戌": "衰", "乾亥": "病", "壬子": "死", "癸丑": "墓", "艮寅": "绝", "甲卯": "胎", "乙辰": "养" },
    "木局": { "乾亥": "长生", "壬子": "沐浴", "癸丑": "冠带", "艮寅": "临官", "甲卯": "帝旺", "乙辰": "衰", "巽巳": "病", "丙午": "死", "丁未": "墓", "坤申": "绝", "庚酉": "胎", "辛戌": "养" }
  };
  function toShuang(m) {
    if (!m || m === "未测/不详") return null;
    for (var i = 0; i < SH_SHUANG.length; i++) {
      if (SH_SHUANG[i].indexOf(m) >= 0) return SH_SHUANG[i];
    }
    return null;
  }
  function sanhe(data) {
    var items = [
      { name: "来龙", s: toShuang(data.lailong || data.rushou || data.shuqi) },
      { name: "来水", s: toShuang(data.laishui) },
      { name: "去水", s: toShuang(data.qushui) }
    ];
    var votes = {};
    items.forEach(function (it) {
      if (!it.s) return;
      it.ju = SH_JU_OF[it.s];
      votes[it.ju] = (votes[it.ju] || 0) + 1;
    });
    var best = null, bestN = 0;
    Object.keys(votes).forEach(function (j) { if (votes[j] > bestN) { best = j; bestN = votes[j]; } });

    var lines = items.map(function (it) {
      return "<li>" + it.name + "：" + (it.s ? esc(it.s) + "（" + esc(it.ju) + "）" : "未测") + "</li>";
    }).join("");
    var concl = best
      ? (bestN >= 2 ? "<b>三占二，定 " + best + "</b>" : "只有一项：暂拟 " + best + "，建议补测")
      : "来龙/来水/去水至少给两项才能定局";

    var pan = best ? SH_PAN[best] : null;
    var panHtml = pan ? '<div class="kp-shuang">' + SH_SHUANG.map(function (s) {
      var st = pan[s];
      return '<div class="kp-shuang-cell"><b>' + s + "</b><span>" + st + "</span></div>";
    }).join("") + "</div>" : "";

    var html = '<div class="kp-block"><h4>三合定局（三者占二）</h4><ul class="kp-list">' + lines + "</ul>" +
      '<div class="kp-hl">' + concl + "</div>" +
      (pan ? '<div class="kp-meta">' + best + "十二长生盘（论水，顺排）</div>" + panHtml : "") + "</div>" +
      fenjinBlock(data.zuo, data.degree);

    return {
      html: html,
      summary: { ju: best, votes: votes, items: items.map(function (i) { return { name: i.name, shuang: i.s, ju: i.ju }; }), changsheng: pan }
    };
  }

  // ================== 吕氏风水 ==================
  var LV_TAI = {
    "1": { gong: "震", fang: "东方", sx: ["甲", "卯", "乙"] },
    "2": { gong: "坎", fang: "北方", sx: ["壬", "子", "癸"] },
    "3": { gong: "艮", fang: "东北方", sx: ["丑", "艮", "寅"] },
    "4": { gong: "震", fang: "东方", sx: ["甲", "卯", "乙"] },
    "5": { gong: "坎", fang: "北方", sx: ["壬", "子", "癸"] },
    "6": { gong: "艮", fang: "东北方", sx: ["丑", "艮", "寅"] },
    "7": { gong: "震", fang: "东方", sx: ["甲", "卯", "乙"] },
    "8": { gong: "坎", fang: "北方", sx: ["壬", "子", "癸"] },
    "9": { gong: "艮", fang: "东北方", sx: ["丑", "艮", "寅"] }
  };
  var LV_DUI = { "震": "兑", "兑": "震", "坎": "离", "离": "坎", "艮": "坤", "坤": "艮", "巽": "乾", "乾": "巽" };
  var LV_YI_SHA = { "震": 1, "巽": 1, "坤": 1, "坎": 1, "兑": 0, "乾": 0, "艮": 0, "离": 0 };
  var LV_GONG_FANG = { "震": "东方", "巽": "东南", "离": "南方", "坤": "西南", "兑": "西方", "乾": "西北", "坎": "北方", "艮": "东北" };
  function parseShashui(text) {
    var out = {};
    if (!text) return out;
    var dirs = ["东南", "西南", "西北", "东北", "东", "南", "西", "北"];
    String(text).split(/[；;，,、\n]+/).forEach(function (clause) {
      var dir = null;
      for (var i = 0; i < dirs.length; i++) {
        if (clause.indexOf(dirs[i]) >= 0) { dir = dirs[i]; break; }
      }
      if (!dir) return;
      var is = clause.indexOf("砂"), iw = clause.indexOf("水");
      if (is >= 0 && (iw < 0 || is < iw)) out[dir] = "砂";
      else if (iw >= 0) out[dir] = "水";
    });
    return out;
  }
  function lvshi(data) {
    var tai = String(data.lv_tai || "").trim();
    var info = LV_TAI[tai];
    if (!info) return { html: '<div class="kp-note">吕氏定位需要：出生胎次（1-9）。</div>', summary: null };
    var gong = data.lv_sex === "女" ? LV_DUI[info.gong] : info.gong;
    var fang = LV_GONG_FANG[gong];
    var quanceng = parseInt(tai, 10) <= 3 ? "小局" : (parseInt(tai, 10) <= 6 ? "大局第一圈层" : "大局第二圈层");

    var shashui = parseShashui(data.lv_shashui || "");
    var rows = Object.keys(LV_GONG_FANG).map(function (g) {
      var f = LV_GONG_FANG[g];
      var have = shashui[f] || "未测";
      var yi = LV_YI_SHA[g] ? "宜砂" : "宜水";
      var ok = have === "未测" ? "" : ((LV_YI_SHA[g] && have === "砂") || (!LV_YI_SHA[g] && have === "水")) ? "吉" : "凶";
      return "<tr><td>" + f + "（" + g + "）</td><td>" + yi + "</td><td>" + have + '</td><td class="' + (ok === "凶" ? "kp-bad" : ok === "吉" ? "kp-good" : "") + '">' + (ok || "-") + "</td></tr>";
    }).join("");

    var dui = data.lv_duigong || "";
    var duiWarn = dui.indexOf("有") === 0 ? '<div class="kp-bad kp-hl">对宫同砂/同水：绝地组合，一律先断凶。</div>' : "";

    var html = '<div class="kp-block"><h4>吕氏定位</h4>' +
      '<div class="kp-hl">' + (data.lv_sex || "男") + " 第" + esc(tai) + "胎 → " + esc(gong) + "宫（" + esc(fang) + "）；圈层：" + quanceng + "</div>" +
      '<div class="kp-meta">对宫：' + LV_DUI[gong] + "宫（" + LV_GONG_FANG[LV_DUI[gong]] + "）</div>" +
      '<table class="kp-table"><thead><tr><th>宫位</th><th>宜</th><th>实测</th><th>判</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      duiWarn + "</div>";

    return { html: html, summary: { tai: tai, sex: data.lv_sex, gong: gong, fang: fang, quanceng: quanceng, shashui: shashui, duigong: dui } };
  }

  // ================== 天星（八煞 / 黄泉 / 空亡） ==================
  var GUA_OF = {
    "壬": "坎", "子": "坎", "癸": "坎", "丑": "艮", "艮": "艮", "寅": "艮",
    "甲": "震", "卯": "震", "乙": "震", "辰": "巽", "巽": "巽", "巳": "巽",
    "丙": "离", "午": "离", "丁": "离", "未": "坤", "坤": "坤", "申": "坤",
    "庚": "兑", "酉": "兑", "辛": "兑", "戌": "乾", "乾": "乾", "亥": "乾"
  };
  var BA_SHA = { "坎": "辰", "坤": "卯", "震": "申", "巽": "酉", "乾": "午", "兑": "巳", "艮": "寅", "离": "亥" };
  var HG = { "庚": "坤", "丁": "坤", "乙": "巽", "丙": "巽", "甲": "艮", "癸": "艮", "辛": "乾", "壬": "乾" };
  function tianxing(data) {
    var rows = [];
    var zg = GUA_OF[data.zuo], bs = BA_SHA[zg];
    if (bs) rows.push(["八煞方", "坐" + esc(data.zuo) + "（" + zg + "宫）→ 八煞在 " + bs + "方", "该方见尖射/水路冲射主血光、官非、凶病"]);
    var hg = HG[data.xiang];
    if (hg) rows.push(["黄泉方", "向" + esc(data.xiang) + " → 黄泉在 " + hg + "方", "该方见水/路主损丁、败财、官非"]);
    var deg = parseFloat(data.degree);
    if (!isNaN(deg)) {
      var pos = ((deg % 360) + 360) % 360;
      // 二十四山每山 15°，交界在 7.5° + 15k
      var edge = ((pos - 7.5) % 15 + 15) % 15;
      if (edge < 1.5 || edge > 13.5) rows.push(["空亡骑线", "坐度 " + pos + "° 接近二十四山交界", "立向骑线主吉凶颠倒、人丁不安"]);
    }
    if (data.jian && data.jian.indexOf("兼") >= 0) rows.push(["阴阳差错", "本局为兼向", "兼向须查夫妇相配与分金，错则婚姻不顺、人丁不安"]);

    var html = '<div class="kp-block"><h4>天星硬禁忌初筛</h4>' +
      (rows.length ? '<table class="kp-table"><thead><tr><th>禁忌</th><th>方位/条件</th><th>凶应</th></tr></thead><tbody>' +
        rows.map(function (r) { return "<tr><td><b>" + r[0] + "</b></td><td>" + r[1] + '</td><td class="kp-bad">' + r[2] + "</td></tr>"; }).join("") + "</tbody></table>"
        : '<div class="kp-note">给坐山、朝向、周天坐度后即可自动查八煞、黄泉、空亡。</div>') +
      '<div class="kp-meta">拨砂的二十八宿线度需按盘制（开禧/时宪/现代修正）换算，请在“砂的二十八宿线度”里填写。</div></div>' +
      fenjinBlock(data.zuo, data.degree);
    return { html: html, summary: { eightSha: bs, huangquan: hg, checks: rows.map(function (r) { return r[0]; }) } };
  }

  function compute(method, data) {
    if (method === "xuankong") return xuankong(data);
    if (method === "sanhe") return sanhe(data);
    if (method === "lvshi") return lvshi(data);
    if (method === "tianxing") return tianxing(data);
    return { html: "", summary: null };
  }

  window.KANYU_PAN = { compute: compute };
})();
