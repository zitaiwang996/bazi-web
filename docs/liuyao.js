// liuyao.js — 六爻卜筮引擎 v2（火珠林/王虎应体系为基础）
// 起卦方式：① 六位数字(阳面数 0-3) ② 铜钱逐爻输入阳面数 ③ 时间起卦（梅花式） ④ 随机摇卦
// 装卦：定卦宫 → 安世应 → 纳干支 → 装六亲 → 装六兽 → 定飞伏 → 查旬空
(function () {
  "use strict";

  var ZHI = "子丑寅卯辰巳午未申酉戌亥";
  var GAN = "甲乙丙丁戊己庚辛壬癸";
  var ZHI_WX = { 子:"水", 丑:"土", 寅:"木", 卯:"木", 辰:"土", 巳:"火", 午:"火", 未:"土", 申:"金", 酉:"金", 戌:"土", 亥:"水" };
  var TRIGRAM_NUM = { 乾:1, 兑:2, 离:3, 震:4, 巽:5, 坎:6, 艮:7, 坤:8 };
  var NUM_TRIGRAM = { 1:"乾", 2:"兑", 3:"离", 4:"震", 5:"巽", 6:"坎", 7:"艮", 8:"坤" };
  // 三爻二进制（初→上，1=阳）→ 卦数
  var BIN_TRIGRAM = { "111":1, "110":2, "101":3, "100":4, "011":5, "010":6, "001":7, "000":8 };
  var TRIGRAM_WX = { 乾:"金", 兑:"金", 离:"火", 震:"木", 巽:"木", 坎:"水", 艮:"土", 坤:"土" };
  // 京房纳甲：每卦 内三爻(初二三) / 外三爻(四五六)，各带天干地支
  var NAJIA = {
    "乾": { nei: [["甲","子"],["甲","寅"],["甲","辰"]], wai: [["壬","午"],["壬","申"],["壬","戌"]] },
    "坤": { nei: [["乙","未"],["乙","巳"],["乙","卯"]], wai: [["癸","丑"],["癸","亥"],["癸","酉"]] },
    "震": { nei: [["庚","子"],["庚","寅"],["庚","辰"]], wai: [["庚","午"],["庚","申"],["庚","戌"]] },
    "巽": { nei: [["辛","丑"],["辛","亥"],["辛","酉"]], wai: [["辛","未"],["辛","巳"],["辛","卯"]] },
    "坎": { nei: [["戊","寅"],["戊","辰"],["戊","午"]], wai: [["戊","申"],["戊","戌"],["戊","子"]] },
    "离": { nei: [["己","卯"],["己","丑"],["己","亥"]], wai: [["己","酉"],["己","未"],["己","巳"]] },
    "艮": { nei: [["丙","辰"],["丙","午"],["丙","申"]], wai: [["丙","戌"],["丙","子"],["丙","寅"]] },
    "兑": { nei: [["丁","巳"],["丁","卯"],["丁","丑"]], wai: [["丁","亥"],["丁","酉"],["丁","未"]] }
  };
  // 六十四卦名 [上卦数, 下卦数, 卦名]
  var GUA64 = {};
  (function () {
    var rows = [
      [1,"乾为天","天泽履","天火同人","天雷无妄","天风姤","天水讼","天山遁","天地否"],
      [2,"泽天夬","兑为泽","泽火革","泽雷随","泽风大过","泽水困","泽山咸","泽地萃"],
      [3,"火天大有","火泽睽","离为火","火雷噬嗑","火风鼎","火水未济","火山旅","火地晋"],
      [4,"雷天大壮","雷泽归妹","雷火丰","震为雷","雷风恒","雷水解","雷山小过","雷地豫"],
      [5,"风天小畜","风泽中孚","风火家人","风雷益","巽为风","风水涣","风山渐","风地观"],
      [6,"水天需","水泽节","水火既济","水雷屯","水风井","坎为水","水山蹇","水地比"],
      [7,"山天大畜","山泽损","山火贲","山雷颐","山风蛊","山水蒙","艮为山","山地剥"],
      [8,"地天泰","地泽临","地火明夷","地雷复","地风升","地水师","地山谦","坤为地"]
    ];
    rows.forEach(function (r) {
      for (var l = 1; l <= 8; l++) GUA64[r[0] + "" + l] = r[l];
    });
  })();
  // 京房八宫卦序（含本宫卦序，用于定卦宫与世应）
  var PALACES = [
    { gong: "乾", wx: "金", seq: ["11","15","17","18","58","78","38","31"] },
    { gong: "坎", wx: "水", seq: ["66","62","64","63","23","43","83","86"] },
    { gong: "艮", wx: "土", seq: ["77","73","71","72","32","12","52","57"] },
    { gong: "震", wx: "木", seq: ["44","48","46","45","85","65","25","24"] },
    { gong: "巽", wx: "木", seq: ["55","51","53","54","14","34","74","75"] },
    { gong: "离", wx: "火", seq: ["33","37","35","36","76","56","16","13"] },
    { gong: "坤", wx: "土", seq: ["88","84","82","81","41","21","61","68"] },
    { gong: "兑", wx: "金", seq: ["22","26","28","27","67","87","47","42"] }
  ];
  var SHI_YING = [[6,3],[1,4],[2,5],[3,6],[4,1],[5,2],[4,1],[3,6]];
  var BEASTS = ["青龙","朱雀","勾陈","螣蛇","白虎","玄武"];
  var BEAST_START = { 甲:0, 乙:0, 丙:1, 丁:1, 戊:2, 己:3, 庚:4, 辛:4, 壬:5, 癸:5 };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function guaKey(upperNum, lowerNum) { return upperNum + "" + lowerNum; }
  function findPalace(key) {
    for (var i = 0; i < PALACES.length; i++) {
      var idx = PALACES[i].seq.indexOf(key);
      if (idx >= 0) return { gong: PALACES[i].gong, wx: PALACES[i].wx, idx: idx };
    }
    return { gong: "乾", wx: "金", idx: 0 };
  }
  // 六亲：以卦宫五行为我
  function sixQin(palaceWx, zhiWx) {
    var sheng = { 木:"火", 火:"土", 土:"金", 金:"水", 水:"木" };   // 我生
    var ke = { 木:"土", 土:"水", 水:"火", 火:"金", 金:"木" };       // 我克
    if (palaceWx === zhiWx) return "兄弟";
    if (sheng[palaceWx] === zhiWx) return "子孙";
    if (sheng[zhiWx] === palaceWx) return "父母";
    if (ke[palaceWx] === zhiWx) return "妻财";
    if (ke[zhiWx] === palaceWx) return "官鬼";
    return "?";
  }
  // 旬空：由日干支推
  function xunKong(dayGan, dayZhi) {
    var gi = GAN.indexOf(dayGan), zi = ZHI.indexOf(dayZhi);
    if (gi < 0 || zi < 0) return { kong: [], xun: "" };
    var start = ((zi - gi) % 12 + 12) % 12;
    var kong = [ZHI[(start + 10) % 12], ZHI[(start + 11) % 12]];
    return { kong: kong, xun: GAN[0] + ZHI[start] + "旬" };
  }
  // 由六爻（初→上，true=阳）求上下卦
  function trigramsOf(lines) {
    var lower = BIN_TRIGRAM[(lines[0] ? 1 : 0) + "" + (lines[1] ? 1 : 0) + (lines[2] ? 1 : 0)];
    var upper = BIN_TRIGRAM[(lines[3] ? 1 : 0) + "" + (lines[4] ? 1 : 0) + (lines[5] ? 1 : 0)];
    return { lower: lower || 8, upper: upper || 1 };
  }
  function install(lines, upperNum, lowerNum, palaceWx) {
    var upTg = NUM_TRIGRAM[upperNum], loTg = NUM_TRIGRAM[lowerNum];
    return lines.map(function (yang, i) {
      var pair = i < 3 ? NAJIA[loTg].nei[i] : NAJIA[upTg].wai[i - 3];
      var zhi = pair[1];
      return { pos: i + 1, yang: yang, gan: pair[0], zhi: zhi, qin: sixQin(palaceWx, ZHI_WX[zhi]) };
    });
  }

  // 核心：由 6 个阳面数(0-3，初→上) 起卦
  function build(yangCounts, question, meta) {
    meta = meta || {};
    var counts = yangCounts.map(function (n) { return Math.max(0, Math.min(3, parseInt(n, 10) || 0)); });
    var types = counts.map(function (n) { return n === 0 ? "老阴" : n === 1 ? "少阳" : n === 2 ? "少阴" : "老阳"; });
    var moving = counts.map(function (n) { return n === 0 || n === 3; });
    var yang = counts.map(function (n) { return n === 1 || n === 3; });
    var benLines = yang.slice();
    var bianLines = yang.map(function (y, i) { return moving[i] ? !y : y; });
    var bt = trigramsOf(benLines), xt = trigramsOf(bianLines);
    var benKey = guaKey(bt.upper, bt.lower), bianKey = guaKey(xt.upper, xt.lower);
    var palace = findPalace(benKey);
    var sy = SHI_YING[palace.idx] || [6, 3];
    var ben = install(benLines, bt.upper, bt.lower, palace.wx);
    var bian = install(bianLines, xt.upper, xt.lower, palace.wx);
    var dayGan = meta.dayGan || "甲", dayZhi = meta.dayZhi || "子";
    var start = BEAST_START[dayGan] != null ? BEAST_START[dayGan] : 0;
    ben.forEach(function (y, i) {
      y.beast = BEASTS[(start + i) % 6];
      y.isShi = (i + 1) === sy[0];
      y.isYing = (i + 1) === sy[1];
      y.shiying = y.isShi ? "世" : (y.isYing ? "应" : "");
      y.moving = moving[i];
      y.type = types[i];
      y.kong = false;
    });
    bian.forEach(function (y, i) { y.moving = moving[i]; y.originalYang = benLines[i]; });
    var kong = xunKong(dayGan, dayZhi);
    ben.forEach(function (y) { y.kong = kong.kong.indexOf(y.zhi) >= 0; });
    // 伏神：本宫首卦里、本卦缺失的六亲
    var haveQin = {};
    ben.forEach(function (y) { haveQin[y.qin] = true; });
    var firstKey = PALACES.filter(function (p) { return p.gong === palace.gong; })[0].seq[0];
    var fu = [];
    if (firstKey) {
      var fuUpper = parseInt(firstKey[0], 10), fuLower = parseInt(firstKey[1], 10);
      install([true, true, true, true, true, true], fuUpper, fuLower, palace.wx).forEach(function (y, i) {
        if (!haveQin[y.qin]) fu.push({ pos: i + 1, qin: y.qin, zhi: y.zhi, gan: y.gan, fei: ben[i] });
      });
    }
    return {
      counts: counts, types: types, moving: moving, yang: yang,
      ben: ben, bian: bian,
      benName: GUA64[benKey] || "—", bianName: GUA64[bianKey] || "—",
      benKey: benKey, bianKey: bianKey,
      upper: NUM_TRIGRAM[bt.upper], lower: NUM_TRIGRAM[bt.lower],
      upperNum: bt.upper, lowerNum: bt.lower,
      palace: palace.gong, palaceWx: palace.wx,
      shiPos: sy[0], yingPos: sy[1],
      dayGan: dayGan, dayZhi: dayZhi, monthZhi: meta.monthZhi || "", yearGz: meta.yearGz || "",
      xun: kong.xun, kong: kong.kong,
      fushen: fu,
      movingLines: ben.filter(function (y) { return y.moving; }),
      question: question || "", castType: meta.castType || "",
      timeText: meta.timeText || ""
    };
  }

  function digitsToCounts(s) {
    var t = String(s || "").replace(/[^0-3]/g, "");
    if (t.length !== 6) return null;
    return t.split("").map(function (c) { return parseInt(c, 10); });
  }

  // ① 六位数字（从左到右 = 初爻→上爻，每位为三枚铜钱的阳面数 0-3）
  function castByDigits(digits, question, meta) {
    var counts = digitsToCounts(digits);
    if (!counts) return { error: "请输入 6 位数字（每位 0-3），如 133120" };
    meta = meta || {}; meta.castType = "数字起卦";
    return build(counts, question, meta);
  }
  // ② 铜钱：逐爻输入阳面数（数组 6 个，初→上）
  function castByCoins(counts, question, meta) {
    if (!counts || counts.length !== 6) return { error: "请填写 6 次投掷的阳面数（0-3）" };
    meta = meta || {}; meta.castType = "铜钱起卦";
    return build(counts, question, meta);
  }
  // ④ 随机摇卦（三枚铜钱 × 6 掷）
  function castRandom(question, meta) {
    var counts = [];
    for (var i = 0; i < 6; i++) {
      var c = 0;
      for (var k = 0; k < 3; k++) if (Math.random() < 0.5) c++;
      counts.push(c);
    }
    meta = meta || {}; meta.castType = "随机摇卦";
    return build(counts, question, meta);
  }
  // ③ 时间起卦（梅花易数式）：年支数+农历月+农历日 取上卦；再加时辰数 取下卦与动爻
  function castByTime(dateStr, timeStr, question) {
    var L = window.LunarCalendar;
    if (!L) return { error: "农历库未加载" };
    var d = String(dateStr || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!d) return { error: "请填写起卦日期" };
    var y = parseInt(d[1], 10), mo = parseInt(d[2], 10), dd = parseInt(d[3], 10);
    var lunar = L.solarToLunar(y, mo, dd);
    var yearZhi = String(lunar.GanZhiYear || "甲子").slice(1, 2);
    var yz = ZHI.indexOf(yearZhi) + 1;
    if (yz <= 0) yz = 1;
    var lm = lunar.lunarMonth, ld = lunar.lunarDay;
    var hh = 0;
    var tm = String(timeStr || "").match(/^(\d{1,2}):?(\d{2})?/);
    if (tm) hh = parseInt(tm[1], 10);
    var shichen = Math.floor(((hh + 1) % 24) / 2) + 1;   // 子时=1
    if (shichen > 12) shichen = 12;
    var s1 = yz + lm + ld;
    var s2 = s1 + shichen;
    var upper = s1 % 8; if (upper === 0) upper = 8;
    var lower = s2 % 8; if (lower === 0) lower = 8;
    var dong = s2 % 6; if (dong === 0) dong = 6;
    var benLines = binOfTrigram(lower).concat(binOfTrigram(upper));
    // 动爻只翻一爻；用 0/3 表示动，1/2 表示静 => counts
    var counts = benLines.map(function (yang, i) {
      var mv = (i + 1) === dong;
      if (yang && mv) return 3;      // 老阳
      if (!yang && mv) return 0;     // 老阴
      return yang ? 1 : 2;           // 少阳 / 少阴
    });
    var meta = {
      castType: "时间起卦（梅花式）",
      yearGz: lunar.GanZhiYear, monthZhi: String(lunar.GanZhiMonth || "").slice(1, 2),
      dayGan: String(lunar.GanZhiDay || "甲子").slice(0, 1), dayZhi: String(lunar.GanZhiDay || "甲子").slice(1, 2),
      timeText: (dateStr || "") + " " + (timeStr || "") + "（农历 " + lunar.lunarMonthName + lunar.lunarDayName + " " + lunar.GanZhiDay + "日 " + (lunar.GanZhiMonth || "") + "）"
    };
    var r = build(counts, question, meta);
    r.timeDetail = { yearZhi: yz, lunarMonth: lm, lunarDay: ld, shichen: shichen, upper: upper, lower: lower, dong: dong };
    return r;
  }
  function binOfTrigram(num) {
    var tg = NUM_TRIGRAM[num];
    for (var b in BIN_TRIGRAM) if (BIN_TRIGRAM[b] === TRIGRAM_NUM[tg]) return b.split("").map(function (c) { return c === "1"; });
    return [true, true, true];
  }

  window.LY = {
    build: build, castByDigits: castByDigits, castByCoins: castByCoins,
    castByTime: castByTime, castRandom: castRandom,
    GUA64: GUA64, PALACES: PALACES, NAJIA: NAJIA, ZHI: ZHI, GAN: GAN,
    sixQin: sixQin, xunKong: xunKong
  };
  // 兼容旧调用
  window.calculateLiuyao = function (question) { return castRandom(question); };
})();
