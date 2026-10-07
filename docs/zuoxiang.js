// zuoxiang.js - 坐向速断（确定性查表，不靠 AI 现编）
// 只要给出「坐山 + 朝向」（度数可选），就把这一坐向的硬忌（黄泉/八煞/劫煞/空亡）、
// 宜砂宜水、催吉位、摆放宜忌先算出来，再把结果交给 AI 详批。
// 对外：window.KANYU_ZUOXIANG.quick(zuo, xiang, degree, method, computed) -> { html, summary, aiText }
// 数据来源：luopan / sanhe-gufa / tianxing-fengshui / xuankong-fengshui 四派本地资料。
(function () {
  "use strict";

  // 二十四山：自子起顺时针，每山 15°，子中=0°
  var SHAN = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"];
  var GUA = {
    "壬":"坎","子":"坎","癸":"坎","丑":"艮","艮":"艮","寅":"艮",
    "甲":"震","卯":"震","乙":"震","辰":"巽","巽":"巽","巳":"巽",
    "丙":"离","午":"离","丁":"离","未":"坤","坤":"坤","申":"坤",
    "庚":"兑","酉":"兑","辛":"兑","戌":"乾","乾":"乾","亥":"乾"
  };
  var GONG_FANG = {"坎":"正北","艮":"东北","震":"正东","巽":"东南","离":"正南","坤":"西南","兑":"正西","乾":"西北"};
  var ZHENG_WX = {
    "壬":"水","子":"水","癸":"水","丑":"土","艮":"土","寅":"木",
    "甲":"木","卯":"木","乙":"木","辰":"土","巽":"木","巳":"火",
    "丙":"火","午":"火","丁":"火","未":"土","坤":"土","申":"金",
    "庚":"金","酉":"金","辛":"金","戌":"土","乾":"金","亥":"水"
  };
  var SHUANG = {
    "壬":"壬子","子":"壬子","癸":"癸丑","丑":"癸丑","艮":"艮寅","寅":"艮寅",
    "甲":"甲卯","卯":"甲卯","乙":"乙辰","辰":"乙辰","巽":"巽巳","巳":"巽巳",
    "丙":"丙午","午":"丙午","丁":"丁未","未":"丁未","坤":"坤申","申":"坤申",
    "庚":"庚酉","酉":"庚酉","辛":"辛戌","戌":"辛戌","乾":"乾亥","亥":"乾亥"
  };
  var JU_OF = {
    "壬子":"水局","癸丑":"金局","艮寅":"火局","甲卯":"木局","乙辰":"水局","巽巳":"金局",
    "丙午":"火局","丁未":"木局","坤申":"水局","庚酉":"金局","辛戌":"火局","乾亥":"木局"
  };
  // 三合十二长生（以水论，顺排）
  var CHANGSHENG = {
    "水局": {"坤申":"长生","庚酉":"沐浴","辛戌":"冠带","乾亥":"临官","壬子":"帝旺","癸丑":"衰","艮寅":"病","甲卯":"死","乙辰":"墓","巽巳":"绝","丙午":"胎","丁未":"养"},
    "金局": {"巽巳":"长生","丙午":"沐浴","丁未":"冠带","坤申":"临官","庚酉":"帝旺","辛戌":"衰","乾亥":"病","壬子":"死","癸丑":"墓","艮寅":"绝","甲卯":"胎","乙辰":"养"},
    "火局": {"艮寅":"长生","甲卯":"沐浴","乙辰":"冠带","巽巳":"临官","丙午":"帝旺","丁未":"衰","坤申":"病","庚酉":"死","辛戌":"墓","乾亥":"绝","壬子":"胎","癸丑":"养"},
    "木局": {"乾亥":"长生","壬子":"沐浴","癸丑":"冠带","艮寅":"临官","甲卯":"帝旺","乙辰":"衰","巽巳":"病","丙午":"死","丁未":"墓","坤申":"绝","庚酉":"胎","辛戌":"养"}
  };
  // 向上黄泉（庚丁坤上是黄泉，乙丙须防巽水先，甲癸向中忧见艮，辛壬路上最怕乾）：向山 -> 黄泉方
  var HUANGQUAN_XIANG = {"庚":"坤","丁":"坤","乙":"巽","丙":"巽","甲":"艮","癸":"艮","辛":"乾","壬":"乾"};
  // 坐山八煞（坎龙坤兔震山猴，巽鸡乾马兑蛇头，艮虎离猪为八煞）：坐卦 -> 煞方
  var BA_SHA_GUA = {"坎":"辰","坤":"卯","震":"申","巽":"酉","乾":"午","兑":"巳","艮":"寅","离":"亥"};
  // 二十四山劫煞（jishen.json「二十四山劫煞·以坐山论」）
  var JIE_SHA = {
    "子":"巳","癸":"巳","丑":"辰","艮":"丁","寅":"未","甲":"丙","卯":"丁","乙":"申",
    "辰":"未","巽":"癸","巳":"酉","丙":"辛","午":"酉","丁":"寅","未":"癸","坤":"乙",
    "申":"癸","庚":"午","酉":"寅","辛":"丑","戌":"丑","乾":"卯","亥":"乙","壬":"申"
  };
  // 八干四维大空亡（坐山正中空亡）
  var DA_KONGWANG = {"甲":1,"庚":1,"壬":1,"丙":1,"乙":1,"辛":1,"丁":1,"癸":1,"乾":1,"艮":1,"巽":1,"坤":1};

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(d) { return ((d % 360) + 360) % 360; }
  function isShan(s) { return SHAN.indexOf(String(s || "").trim()) >= 0; }
  function opposite(shan) {
    var i = SHAN.indexOf(shan);
    return i < 0 ? null : SHAN[(i + 12) % 24];
  }
  function centerOf(shan) {
    var i = SHAN.indexOf(shan);
    return i < 0 ? null : i * 15;
  }
  function gengFang(g) { return GONG_FANG[g] ? "·" + GONG_FANG[g] : ""; }

  function huangquanRow(xiang) {
    var f = HUANGQUAN_XIANG[xiang];
    if (!f) return null;
    return {
      name: "向上黄泉", fang: f,
      yin: "「" + xiang + "向」犯黄泉于 " + f + "方（" + (SHUANG[f] || f) + "）",
      ji: "该方忌去水、忌直冲路、忌破损尖射；黄泉宜来不宜去，来水救人、去水杀人。",
      ying: "损丁、败财、官非；重者绝嗣。"
    };
  }
  function bashRow(zuo) {
    var g = GUA[zuo], f = BA_SHA_GUA[g];
    if (!f) return null;
    return {
      name: "坐山八煞", fang: f,
      yin: "坐" + zuo + "（" + g + "宫）→ 八煞在 " + f + "方",
      ji: "忌 " + f + "方高压、尖射、恶石、来水直冲、开门；形体秀美又在本局临官者，反可作催官煞。",
      ying: "血光、官非、凶病；重者损丁。"
    };
  }
  function jieshaRow(zuo) {
    var f = JIE_SHA[zuo];
    if (!f) return null;
    return {
      name: "劫煞", fang: f,
      yin: "坐" + zuo + " → 劫煞在 " + f + "方",
      ji: "忌 " + f + "方见尖射、破碎、恶石、路冲等不良景观。",
      ying: "劫财、破财、被盗、意外。"
    };
  }
  function kongwangRows(zuo, degree) {
    var out = [];
    if (DA_KONGWANG[zuo]) {
      out.push({
        name: "大空亡", fang: zuo + "山正中",
        yin: zuo + "为八干四维，正中一线属大空亡格",
        ji: "不可立正向；须兼左/兼右避开大空亡，取丙丁庚辛旺相分金。",
        ying: "人丁不安、吉凶颠倒、富贵不长久。"
      });
    }
    var d = parseFloat(degree);
    if (!isNaN(d)) {
      var pos = norm(d);
      var edge = ((pos - 7.5) % 15 + 15) % 15;
      if (edge < 1.5 || edge > 13.5) {
        out.push({
          name: "骑线空缝", fang: "坐度 " + pos + "°",
          yin: "坐度贴近二十四山交界（差 " + Math.min(edge, 15 - edge).toFixed(2) + "°）",
          ji: "立向骑线，须拨线到本山正中或明确兼向。",
          ying: "吉凶颠倒、人丁不安、破财。"
        });
      }
    }
    return out;
  }

  function sanheFangwei(ju) {
    var pan = CHANGSHENG[ju];
    if (!pan) return [];
    return Object.keys(pan).map(function (s) {
      var st = pan[s], kind;
      if (["长生","冠带","临官","帝旺","养"].indexOf(st) >= 0) kind = "宜来水（宜开阔、见水、纳气）";
      else if (["墓","绝","衰"].indexOf(st) >= 0) kind = "宜去水/出水（宜低、宜排水、宜静库）";
      else kind = "凶位（忌来水，宜静、宜封闭）";
      return { shuang: s, stage: st, kind: kind };
    });
  }

  function xuanPlacement(computed) {
    if (!computed || !computed.shanPan || !computed.xiangPan || !computed.yunPan) return null;
    var out = { ding: [], cai: [], sha: [] };
    var GONG = {"坎":"正北","坤":"西南","震":"正东","巽":"东南","中":"中宫","乾":"西北","兑":"正西","艮":"东北","离":"正南"};
    Object.keys(GONG).forEach(function (g) {
      var s = computed.shanPan[g], x = computed.xiangPan[g];
      if (s === computed.yun) out.ding.push(g + "（" + GONG[g] + "）山星 " + s);
      if (x === computed.yun) out.cai.push(g + "（" + GONG[g] + "）向星 " + x);
      if (s === 5 || x === 5) out.sha.push(g + "（" + GONG[g] + "）见五黄");
    });
    return out;
  }

  function placementRows(method, zuo, xiang, degree, computed) {
    var rows = [];
    var hq = HUANGQUAN_XIANG[xiang], bs = BA_SHA_GUA[GUA[zuo]], js = JIE_SHA[zuo];
    if (hq) rows.push({ pos: hq + "方", tag: "黄泉·忌", good: "宜安静、宜来水环抱；可置低矮圆润绿化", bad: "忌鱼缸/流水/排水口/卫生间/直冲路（黄泉宜来不宜去）", ying: "损丁败财、官非" });
    if (bs) rows.push({ pos: bs + "方", tag: "八煞·忌", good: "宜平整安静、无尖无射", bad: "忌高塔/尖角/天线/动水/大鱼缸/开门直冲", ying: "血光、官非、凶病" });
    if (js) rows.push({ pos: js + "方", tag: "劫煞·忌", good: "宜整洁，可置储物柜压住", bad: "忌尖射、恶石、破损物、路冲", ying: "破财、被盗、意外" });
    if (method === "sanhe" || method === "tianxing") {
      var ju = JU_OF[SHUANG[xiang]], pan = ju && CHANGSHENG[ju];
      if (pan) {
        Object.keys(pan).forEach(function (s) {
          var st = pan[s];
          if (["长生","冠带","临官","帝旺"].indexOf(st) >= 0) {
            rows.push({ pos: s + "方（" + st + "）", tag: "催吉·宜", good: "宜开阔、宜见弯环来水/路；可置水景、鱼缸、绿植", bad: "忌堵塞、忌高墙逼压、忌去水", ying: "生旺方得用主财丁两旺；被破则损丁破财" });
          } else if (["墓","绝","衰"].indexOf(st) >= 0) {
            rows.push({ pos: s + "方（" + st + "）", tag: "出水·宜", good: "宜低、宜作排水/卫生间/储物/暗处", bad: "忌来水、忌开门见水、忌放财位与床位", ying: "出水得位主财聚；来水倒冲主败丁败财" });
          } else if (["病","死","胎"].indexOf(st) >= 0) {
            rows.push({ pos: s + "方（" + st + "）", tag: "凶位·宜静", good: "宜封闭、宜作仓储杂物，宜压不宜动", bad: "忌纳气、忌放床/灶/神位/鱼缸", ying: "凶位来水或纳气主疾病、破财" });
          }
        });
      }
    }
    if (method === "xuankong" && computed) {
      var xp = xuanPlacement(computed);
      if (xp) {
        if (xp.cai.length) rows.push({ pos: xp.cai.join("、"), tag: "催财·宜", good: "宜放水景/鱼缸/流水/灯光，宜开门纳气，宜动", bad: "忌堆杂物、忌阴暗、忌厕所压位", ying: "向星当运旺方得水主财旺；失位主破财" });
        if (xp.ding.length) rows.push({ pos: xp.ding.join("、"), tag: "催丁·宜", good: "宜做卧室/床/书房/高柜靠山，宜静宜实", bad: "忌空旷、忌见大水、忌厕所与杂物房", ying: "山星当运旺方有靠主丁旺健康；失位主损丁病弱" });
        if (xp.sha.length) rows.push({ pos: xp.sha.join("、"), tag: "五黄·忌动", good: "宜静，放铜铃/六帝钱/金属摆件泄土", bad: "忌动土装修、忌鱼缸水景、忌炉灶、忌长期坐卧", ying: "五黄宜静不宜动，动则病灾破财" });
      }
    }
    rows.push({ pos: "丙午丁 / 巽辛 / 寅甲 / 乾", tag: "催官文昌·宜", good: "宜高秀：文昌塔、书桌、绿植、笔筒、高柜；主文贵科甲", bad: "忌破碎、忌污秽、忌厕所压位", ying: "催官方秀美主出文官科甲；压破反主官非" });
    rows.push({ pos: "坤 / 庚酉 / 卯", tag: "武贵·宜", good: "宜高秀厚重：金属摆件、白色圆器；主武贵军警法官", bad: "忌尖射破碎", ying: "得位主武贵；破则官非刑伤" });
    rows.push({ pos: "全宅通用", tag: "忌放", good: "宜明亮通透、宜整洁", bad: "忌假花枯叶、破损碗筷、开门见镜/见厕/见污秽、床头靠窗、横梁压顶、鱼缸高过心脏、神位放水星位", ying: "主财气外泄、夫妻不和、健康与运势反复" });
    return rows;
  }

  function quick(zuo, xiang, degree, method, computed) {
    zuo = String(zuo || "").trim();
    xiang = String(xiang || "").trim();
    if (!isShan(zuo) && !isShan(xiang)) return { html: "", summary: null, aiText: "" };
    if (!isShan(xiang) && isShan(zuo)) xiang = opposite(zuo);
    if (!isShan(zuo) && isShan(xiang)) zuo = opposite(xiang);
    if (!isShan(zuo) || !isShan(xiang)) return { html: "", summary: null, aiText: "" };

    var zi = SHAN.indexOf(zuo), xi = SHAN.indexOf(xiang);
    var mismatch = ((xi - zi + 24) % 24) !== 12;
    var zg = GUA[zuo], xg = GUA[xiang];
    var zJu = JU_OF[SHUANG[zuo]], xJu = JU_OF[SHUANG[xiang]];
    var chk = [];
    var hq = huangquanRow(xiang); if (hq) chk.push(hq);
    var bs = bashRow(zuo); if (bs) chk.push(bs);
    var js = jieshaRow(zuo); if (js) chk.push(js);
    kongwangRows(zuo, degree).forEach(function (r) { chk.push(r); });

    var rows = chk.map(function (r) {
      return "<tr><td><b>" + esc(r.name) + "</b></td><td>" + esc(r.fang || r.yin) + '</td><td class="kp-bad">' + esc(r.ying) + "</td></tr>";
    }).join("");
    var pl = placementRows(method, zuo, xiang, degree, computed);
    var plRows = pl.map(function (r) {
      return "<tr><td>" + esc(r.pos) + "</td><td>" + esc(r.tag) + "</td><td>" + esc(r.good) +
        "</td><td>" + esc(r.bad) + "</td><td>" + esc(r.ying) + "</td></tr>";
    }).join("");

    var summary = {
      zuo: zuo, xiang: xiang, zuoGua: zg, xiangGua: xg, zuoJu: zJu, xiangJu: xJu,
      huangquan: hq ? hq.fang : null, bash: bs ? bs.fang : null, jiesha: js ? js.fang : null,
      checks: chk.map(function (r) { return r.name; }), mismatch: mismatch, placements: pl,
      sanheFangwei: (method === "sanhe" || method === "tianxing") ? sanheFangwei(xJu) : null
    };

    var head = '<div class="kp-hl">' + esc(zuo) + "山" + esc(xiang) + "向（坐" + esc(zg) + "宫" + esc(gengFang(zg)) +
      " · 向" + esc(xg) + "宫" + esc(gengFang(xg)) + "）　坐山五行：" + esc(ZHENG_WX[zuo]) + "　向山五行：" + esc(ZHENG_WX[xiang]) + "</div>";
    var juLine = '<div class="kp-meta">三合双山：坐 ' + esc(SHUANG[zuo] || "—") + "（" + esc(zJu || "—") + "）　向 " +
      esc(SHUANG[xiang] || "—") + "（" + esc(xJu || "—") + "）</div>";
    var warn = mismatch
      ? '<div class="kp-bad kp-hl">坐向不相反：坐' + esc(zuo) + "应对" + esc(opposite(zuo) || "—") + "向。本盘按实际输入绘制，请核对罗盘或用兼向度数。" + "</div>"
      : "";
    var kc = "";
    if (window.KANYU_FENJIN && zuo) {
      var a = window.KANYU_FENJIN.analyze(zuo, degree), tips = [];
      if (a.jianxiang) tips.push("兼向可兼顾：" + a.jianxiang.pairs.map(function (p) { return p.pair + (p.ke ? "可兼" : "不可兼"); }).join("；") + (a.jianxiang.onlyZhengxiang ? "（" + zuo + "山只可正向）" : ""));
      if (a.fenjin) tips.push("坐度 " + degree + "° 落" + a.fenjin.ganzhi + "分金（" + a.fenjin.type + "，" + (a.fenjin.usable ? "可用" : "不用") + "）");
      if (tips.length) kc = '<div class="kp-meta">' + esc(tips.join("；")) + "</div>";
    }
    var html = '<div class="kp-block"><h4>坐向速断（按坐山/朝向直接查表）</h4>' + warn + head + juLine +
      (rows ? '<div class="kp-tablewrap"><table class="kp-table"><thead><tr><th>硬忌</th><th>方位/条件</th><th>凶应</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : "") +
      '<div class="kp-tablewrap"><table class="kp-table kp-wide"><thead><tr><th>方位/位置</th><th>性质</th><th>宜放/宜做</th><th>忌放/忌做</th><th>会出什么事</th></tr></thead><tbody>' + plRows + "</tbody></table></div>" +
      kc + "</div>";

    var aiText = chk.map(function (r) { return r.name + "：" + (r.yin || "") + "；忌：" + (r.ji || "") + "；应：" + (r.ying || ""); }).join("\n");
    aiText += "\n三合向局：" + xiang + "向属" + xJu + "。";
    aiText += "\n摆放宜忌：\n" + pl.map(function (r) { return "- " + r.pos + "【" + r.tag + "】宜：" + r.good + "；忌：" + r.bad + "；应：" + r.ying; }).join("\n");
    return { html: html, summary: summary, aiText: aiText };
  }

  window.KANYU_ZUOXIANG = {
    quick: quick, SHAN: SHAN, opposite: opposite, centerOf: centerOf,
    huangquan: HUANGQUAN_XIANG, bash: BA_SHA_GUA, jiesha: JIE_SHA
  };
})();
