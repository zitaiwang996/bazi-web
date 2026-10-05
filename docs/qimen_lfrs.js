// qimen_lfrs.js — 龙伏山人 · 鸣法飞盘奇门解断（本地规则引擎）
// 依据 celebrity-longfushanren skill 的 paipan_rules / judgment_workflow：
//   值符值使为先 → 门星神仪 → 五行生克中轴 → 飞支穿壬 → 格局真假 → 结论应期
// 起局盘由 qimen.js 输出，本文件只做解断，不藏盘。
(function () {
  "use strict";
  var GAN_WX = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var SHENG = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  var KE = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  var GONG_WX = { 1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火" };
  var GONG_NAME = { 1: "坎一宫", 2: "坤二宫", 3: "震三宫", 4: "巽四宫", 5: "中五宫", 6: "乾六宫", 7: "兑七宫", 8: "艮八宫", 9: "离九宫" };
  var GONG_SHORT = { 1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离" };
  var MEN_JI = ["休门", "生门", "开门"];
  var MEN_XIONG = ["死门", "惊门", "伤门"];
  var XING_JI = ["天辅", "天禽", "天心", "天任"];
  var XING_XIONG = ["天蓬", "天芮", "天柱"];
  // 飞支：值使门落宫 → 地支（中5寄坤）
  var GONG_ZHI = { 1: "子", 2: "未申", 3: "卯", 4: "辰巳", 5: "未申", 6: "戌亥", 7: "酉", 8: "丑寅", 9: "午" };
  var ZHI_GONG = { 子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6 };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function wxOfGan(g) {
    var ch = String(g || "").replace(/[^甲乙丙丁戊己庚辛壬癸]/g, "")[0];
    return GAN_WX[ch] || "";
  }
  // 地盘干生天盘干 = 上得扶（吉）；天盘干生地盘干 = 上泄气（凶）
  function ganRelation(tian, di) {
    var a = wxOfGan(tian), b = wxOfGan(di);
    if (!a || !b) return { rel: "—", good: 0, text: "干不全" };
    if (a === b) return { rel: "比和", good: 1, text: "同气，事体平稳" };
    if (SHENG[a] === b) return { rel: "天盘生地盘", good: -1, text: "天盘干生地盘干＝消耗泄气，主凶" };
    if (SHENG[b] === a) return { rel: "地盘生天盘", good: 1, text: "地盘干生天盘干＝得扶滋养，主吉" };
    if (KE[a] === b) return { rel: "天盘克地盘", good: 1, text: "天盘克地盘，主动可成但耗力" };
    if (KE[b] === a) return { rel: "地盘克天盘", good: -1, text: "地盘克天盘＝受压，主受阻" };
    return { rel: "—", good: 0, text: "无关" };
  }
  function analyze(d) {
    if (!d) return null;
    var pan = [];
    for (var g = 1; g <= 9; g++) {
      var i = g - 1;
      var tp = (d.tianpan && d.tianpan[i]) || "";
      var dp = (d.dipan && d.dipan[i]) || "";
      var xing = (d.tianpan_xing && d.tianpan_xing[i]) || "";
      var men = (d.renpan && d.renpan[i]) || "";
      var shen = (d.shen && d.shen[i]) || "";
      pan.push({ gong: g, tp: tp, dp: dp, xing: xing, men: men, shen: shen, rel: ganRelation(tp, dp) });
    }
    var zfGong = d.gzf, zsGong = d.gzs;
    var zfPalace = pan[zfGong - 1] || {};
    var zsPalace = pan[zsGong - 1] || {};
    var feiZhi = GONG_ZHI[zsGong] || "";
    var good = [], bad = [], notes = [];

    if (zfPalace.good === undefined) {}
    // 值符宫
    if (zfPalace.rel) {
      (zfPalace.rel.good >= 0 ? good : bad).push("值符落" + GONG_NAME[zfGong] + "：" + zfPalace.rel.text);
    }
    // 值使门
    if (MEN_JI.indexOf(zsPalace.men) >= 0) good.push("值使" + zsPalace.men + "落" + GONG_NAME[zsGong] + "，门吉，事有生机");
    else if (MEN_XIONG.indexOf(zsPalace.men) >= 0) bad.push("值使" + zsPalace.men + "落" + GONG_NAME[zsGong] + "，门凶，事多阻逆");
    else notes.push("值使" + zsPalace.men + "落" + GONG_NAME[zsGong] + "，门平，需看星神补断");

    // 全盘五行生克（龙伏山人中轴）
    var rels = pan.filter(function (p) { return p.tp && p.dp; });
    var shengNi = rels.filter(function (p) { return p.rel.rel === "地盘生天盘" || p.rel.rel === "比和"; });
    var xie = rels.filter(function (p) { return p.rel.rel === "天盘生地盘"; });
    if (shengNi.length) good.push("得扶之宫：" + shengNi.map(function (p) { return GONG_SHORT[p.gong] + "(" + p.tp + "/" + p.dp + ")"; }).join("、"));
    if (xie.length) bad.push("泄气之宫：" + xie.map(function (p) { return GONG_SHORT[p.gong] + "(" + p.tp + "/" + p.dp + ")"; }).join("、"));

    // 空亡
    var xk = String(d.xunkong || "").replace(/[^子丑寅卯辰巳午未申酉戌亥]/g, "");
    var xkGongs = [];
    for (var xi = 0; xi < xk.length; xi++) {
      var gg = ZHI_GONG[xk[xi]];
      if (gg && xkGongs.indexOf(gg) < 0) xkGongs.push(gg);
    }
    if (xkGongs.length) bad.push("旬空落宫：" + xkGongs.map(function (g) { return GONG_NAME[g]; }).join("、") + "（空则无力，事多虚耗）");

    // 日干 / 时干落宫
    var ri = d.rigan, shi = d.shigan, riGong = d.rigong, shiGong = d.shigong;
    var riShi = "—";
    if (riGong && shiGong) {
      if (riGong === shiGong) { riShi = "日干时干同宫（" + GONG_NAME[riGong] + "）：事与己近，谋为易成，也主自专"; good.push(riShi); }
      else {
        var rg = GONG_WX[riGong], sg = GONG_WX[shiGong];
        if (SHENG[sg] === rg) { riShi = "时干宫生我日干宫：外来助力"; good.push(riShi); }
        else if (SHENG[rg] === sg) { riShi = "我日干宫生时干宫：我可进退，主动则成"; good.push(riShi); }
        else if (KE[rg] === sg) { riShi = "我日干宫克时干宫：我能制事，主可成"; good.push(riShi); }
        else if (KE[sg] === rg) { riShi = "时干宫克我日干宫：事来克我，宜守不宜进"; bad.push(riShi); }
        else { riShi = "日干宫与时干宫无生克，平"; notes.push(riShi); }
      }
    }
    if (ri) notes.push("日干" + ri + "落" + (GONG_NAME[riGong] || "?") + "；时干" + shi + "落" + (GONG_NAME[shiGong] || "?"));
    if (feiZhi) notes.push("飞支：" + feiZhi + "（值使" + (zsPalace.men || "") + "落" + (GONG_SHORT[zsGong] || "") + "宫），可据此穿六壬神煞");

    // 格局
    var ge = (d.geshi || []).slice(0, 6);
    ge.forEach(function (line) {
      if (/吉|升|生|合|旺|开|成/.test(line)) good.push("格局：" + line);
      else if (/凶|伤|死|破|败|刑|冲|空/.test(line)) bad.push("格局：" + line);
    });
    if (d.zk) notes.push("主客：" + d.zk);

    var rating = "平";
    if (good.length - bad.length >= 3) rating = "吉";
    else if (bad.length - good.length >= 3) rating = "凶";
    if (d.jishi) bad.push("时忌：" + d.jishi);
    return {
      rating: rating, good: good, bad: bad, notes: notes, pan: pan,
      zfGong: zfGong, zsGong: zsGong, feiZhi: feiZhi,
      pillars: [d.year_gz, d.month_gz, d.day_gz, d.hour_gz]
    };
  }

  function render(d) {
    var a = analyze(d);
    if (!a) return "";
    var cls = a.rating === "吉" ? "#5ec07a" : a.rating === "凶" ? "var(--redL)" : "#e9c46a";
    var rows = [];
    for (var r = 0; r < 3; r++) {
      var cells = "";
      var layout = [[4, 9, 2], [3, 5, 7], [8, 1, 6]][r];
      layout.forEach(function (g) {
        var p = a.pan[g - 1];
        var rcls = p.rel.good > 0 ? "#5ec07a" : p.rel.good < 0 ? "var(--redL)" : "var(--dim)";
        cells += '<td style="border:1px solid var(--border);padding:5px;vertical-align:top;font-size:.86em;min-width:64px">' +
          '<div style="color:var(--mute);font-size:.78em">' + GONG_SHORT[g] + g + "</div>" +
          '<div><b>' + esc(p.tp) + "</b>/" + esc(p.dp) + "</div>" +
          '<div style="color:' + rcls + ';font-size:.85em">' + esc(p.rel.rel) + "</div>" +
          '<div style="color:var(--dim);font-size:.82em">' + esc(p.men) + " " + esc(p.xing) + "</div>" +
          '<div style="color:var(--mute);font-size:.8em">' + esc(p.shen) + "</div>" +
          "</td>";
      });
      rows.push("<tr>" + cells + "</tr>");
    }
    function list(arr, color) {
      return arr.length ? '<ul style="margin:6px 0 0;padding-left:18px;color:' + color + ';font-size:.86em;line-height:1.9">' +
        arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : '<div style="color:var(--mute);font-size:.85em;margin-top:4px">—</div>';
    }
    return '<div class="card" style="border-color:var(--gold)"><h3>🐉 龙伏山人 · 鸣法飞盘奇门解断</h3>' +
      '<div style="font-size:1.05em;font-weight:700;margin-bottom:8px">总评：<span style="color:' + cls + '">' + a.rating + "</span>" +
      "　四柱 " + a.pillars.map(esc).join(" ") + "　值符落" + GONG_NAME[a.zfGong] + "　值使落" + GONG_NAME[a.zsGong] + "　飞支 " + esc(a.feiZhi) + "</div>" +
      '<table style="width:100%;border-collapse:collapse;margin:8px 0"><tbody>' + rows.join("") + "</tbody></table>" +
      '<div class="hl" style="border-left-color:#5ec07a"><b>吉象</b>' + list(a.good, "#8fd0a0") + "</div>" +
      '<div class="hl" style="border-left-color:var(--redL)"><b>凶象</b>' + list(a.bad, "#e5927e") + "</div>" +
      '<div class="hl" style="border-left-color:var(--borderL)"><b>参考</b>' + list(a.notes, "var(--dim)") + "</div>" +
      '<div style="color:var(--mute);font-size:.76em;margin-top:8px">本地规则解断：值符值使为先，门星神仪次之，以天盘干与地盘干的五行生克为中轴。仅供传统文化研究参考。</div>' +
      "</div>";
  }

  window.QimenLFRS = { analyze: analyze, render: render };
})();
