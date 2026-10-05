// kanyu.js - 堪舆专区：四派各自采集 + 递进判断
// 你负责现场测量；这里负责：给什么信息 -> 出什么结论 -> 还缺什么 -> 下一步测什么
(function () {
  "use strict";

  var API = "https://1458464551-c6fqpk4dzk.ap-beijing.tencentscf.com";
  var STORE_KEY = "kanyu_state_v2";
  var EMPTY = "未测/不详";
  var MOUNTAINS = ["未测/不详","壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"];
  var SHAN_ORDER = ["壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"];

  // 城市磁偏角表：优先用 declination.js 里的 WMM2025 计算值（103 个中国城市），
  // 加载失败时退回下面这张近似表（度，东偏为正 / 西偏为负）。
  var FALLBACK_DECL = {
    "北京": -7.5, "上海": -6.5, "广州": -3.3, "深圳": -3.3, "成都": -2.4, "重庆": -2.9,
    "西安": -4.2, "武汉": -4.9, "南京": -6.2, "杭州": -6.1, "长沙": -4.1, "郑州": -5.6,
    "济南": -6.9, "青岛": -7.5, "沈阳": -9.7, "哈尔滨": -11.3, "乌鲁木齐": 2.5, "拉萨": -0.1,
    "昆明": -1.7, "海口": -2.3, "福州": -4.9, "厦门": -4.4, "三亚": -2.1
  };
  var REGION_DECL = (typeof window !== "undefined" && window.KANYU_REGION_DECL) ? window.KANYU_REGION_DECL : FALLBACK_DECL;

  function declShiftDeg(deg, decl) {
    var v = parseFloat(deg);
    if (isNaN(v)) return deg;
    return ((v + decl) % 360 + 360) % 360;
  }
  function declShiftMount(mtn, decl) {
    var i = SHAN_ORDER.indexOf(mtn);
    if (i < 0) return mtn;
    var center = (345 + i * 15) % 360;
    var nd = ((center + decl) % 360 + 360) % 360;
    var best = mtn, bestD = 999;
    SHAN_ORDER.forEach(function (s, j) {
      var c = (345 + j * 15) % 360;
      var diff = Math.abs(((nd - c + 540) % 360) - 180);
      if (diff < bestD) { bestD = diff; best = s; }
    });
    return best;
  }
  var ANGULAR_FIELDS = ["zuo", "xiang", "lailong", "rushou", "shuqi", "laishui", "qushui", "men", "men_people", "chuang", "zao", "ce"];

  var METHODS = [
    { id: "tianxing", name: "天星风水", sub: "赖布衣天星派" },
    { id: "lvshi",    name: "吕氏风水", sub: "吕文艺体系" },
    { id: "xuankong", name: "玄空飞星", sub: "沈氏玄空学" },
    { id: "sanhe",    name: "古法三合", sub: "杨筠松体系" }
  ];

  var MEASURE = {
    tianxing: {
      title: "天星派 · 你要现场量什么",
      lines: [
        "<b>三盘：</b>地盘正针定坐向、格龙；<b>人盘中针</b>消砂（量砂尖顶）；天盘缝针可参纳水。",
        "<b>先记盘制：</b>开禧度 / 时宪度 / 现代修正度。老盘必须换岁差，否则二十八宿度数全错。",
        "<b>坐向：</b>坐山＋朝向＋兼左兼右＋分金；分金没定，先不下断。",
        "<b>砂：</b>只量看得见的尖顶（被遮挡的不算），记方位、高低、形态。",
        "<b>水：</b>只论明水，记来水、去水、水形（弯环/直去/反弓/聚）。",
        "<b>先校：</b>水平、磁针自由、远离铁器电塔，记磁偏角。"
      ]
    },
    lvshi: {
      title: "吕氏 · 你要现场量什么",
      lines: [
        "<b>不用飞星、不用分金。</b>先定<b>原点</b>：阳宅取床位/办公桌/收银台；阴宅取尸骨（骨灰）中心。",
        "<b>高为砂、低为水：</b>以原点地平面为基准，量每一宫的<b>垂直高度差（米）</b>。",
        "<b>八个方向都要量：</b>东、南、西、北、东北、东南、西南、西北，各写“砂/水 + 米数”。",
        "<b>冲射要记：</b>路冲、水冲、尖角、风口，凡冲射无论砂水一律凶。",
        "<b>再记地形：</b>山区 / 平洋 / 水乡 / 公墓 / 骨灰堂，能量算法不同。"
      ]
    },
    xuankong: {
      title: "玄空 · 你要现场量什么",
      lines: [
        "<b>先定元运：</b>按建宅/入住/下葬年份定三元九运（2004–2023 八运，2024–2043 九运）。",
        "<b>坐向：</b>用<b>地盘正针</b>，最好给实测周天度数；正向（中 9 度内）用下卦，兼 3 度以上用替卦。",
        "<b>门向：</b>以人最多出入的门为向；再记门、床、灶、厕各在哪个宫。",
        "<b>外六事：</b>前后左右的楼、路、水、桥、树、尖角、反光，落到宫位。",
        "<b>先校：</b>水平、磁针自由、远离铁器电塔；读数宁慢勿快。"
      ]
    },
    sanhe: {
      title: "三合 · 你要现场量什么",
      lines: [
        "<b>三盘三针：</b><b>地盘正针</b>格龙、定坐山；<b>人盘中针</b>消砂；<b>天盘缝针</b>测来水与水口。",
        "<b>来龙三处：</b>来龙、入首、束气都要记字位（地盘正针）。",
        "<b>水口用三法：</b>关 / 拦 / 顺，定来水、去水，看左右旋。",
        "<b>立向分金：</b>记兼左兼右与周天坐度；48 正格用向上五行法，变格用坐度分金法。",
        "<b>阴宅：</b>补亡者生年（仙命）；<b>先校：</b>水平、磁针自由、远离铁器电塔、记磁偏角。"
      ]
    }
  };

  // 各派硬禁忌：方位/条件 -> 会发生什么
  var TABOOS = {
    tianxing: [
      ["八煞方", "坐山八煞方位见尖砂、水路冲射。「坎龙坤兔震山猴，巽鸡乾马兑蛇头，艮虎离猪为八煞」", "血光、官非、凶病，重者损丁"],
      ["黄泉煞", "向首犯黄泉（庚丁见坤、乙丙见巽、甲癸见艮、辛壬见乾）见水或路", "损丁、败财、官非，重者绝嗣"],
      ["阴阳差错", "立向兼左兼右兼错、夫妇相配错位", "婚姻不顺、家道不和、人丁不安"],
      ["空亡线", "坐向落在二十四山交界骑缝线上", "人丁不安、破财、孤独"],
      ["曜煞/劫煞", "曜煞方、劫煞方高压、尖射、动土", "意外、伤病、破财"],
      ["砂水反局", "宜砂之宫见水、宜水之宫见砂", "相应房份损丁或败财"]
    ],
    lvshi: [
      ["对宫同砂同水", "东—西、南—北、东北—西南、东南—西北 两宫同为砂或同为水", "绝地，一律凶断；贫穷、损丁、短寿、夭折"],
      ["对宫同水高度差", "山区对宫同水，按原点垂直高度差分级", "15米内贫穷有儿女；25–35米贫而无儿有女；50–80米寿短；100米以上青少年夭折；150米以上凶二三代"],
      ["砂水反位", "东/东南/西南/北 宜砂却见水；西/西北/东北/南 宜水却见砂", "相应房份损丁、破财、人丁不旺"],
      ["冲射", "路冲、水冲、尖角、风口直冲原点", "无论砂水一律凶：血光、破财、官非"],
      ["孤阳孤阴", "三山中一山单独与另两山相反（敏感位）", "该房人丁或财源出现明显偏枯"]
    ],
    xuankong: [
      ["五黄", "运五黄或年五黄飞到门、床、灶、动土方位", "病灾、意外、破财；宜静不宜动，动则凶速"],
      ["二黑病符", "二黑飞到门、床、厨房", "疾病、肠胃/妇科、久病不愈"],
      ["三煞", "年三煞方位动土、修造、开门", "血光、官非、破财"],
      ["上山下水", "山星到向、向星到坐（坐后无山、向首无水）", "损丁破财，家运衰退"],
      ["反吟伏吟", "全局反吟或伏吟", "反复、破败、意外、家宅不宁"],
      ["令星入囚", "向首当运旺星入囚、地运已过", "财源断绝、事业停滞"],
      ["空亡骑线/兼错", "坐向骑线、兼向超 3 度未用替卦", "人丁不安、吉凶颠倒"],
      ["火烧天门", "乾宫（西北）见火、红色、炉灶、高塔", "官非、损丁、长辈不利"]
    ],
    sanhe: [
      ["黄泉煞", "向首冲临官、冲冠带（如庚丁见坤、乙丙见巽、甲癸见艮、辛壬见乾）", "损丁、败财、官非，重者绝嗣"],
      ["八煞", "坐山八煞方位有水路冲射、尖射", "血光、疾病、官非"],
      ["劫煞", "劫煞方有来水、路冲、低陷", "劫财、破财、被盗"],
      ["水破天心", "明堂正中直水冲穴、直路冲心", "破财、损丁、家宅不安"],
      ["牵动土牛", "水直冲墓心、穴前水割脚", "大凶，主损丁、横祸"],
      ["吉方出水/凶方来水", "生旺冠临方出水，墓绝方来水", "财丁两败"],
      ["去水不关锁", "去水直去、反弓、无砂关拦", "财来财去、留不住财"]
    ]
  };

  var SCHEMAS = {
    tianxing: [
      { name: "① 基本", fields: [
        { k: "type", label: "宅型", t: "select", o: ["阳宅", "阴宅"] },
        { k: "topic", label: "断事需求", t: "select", o: ["综合", "催官", "催财", "催丁", "婚姻", "健康", "化煞"] },
        { k: "question", label: "想问的问题", t: "textarea", full: true, ph: "例如：这坟哪房发？哪年应事？怎么改？" }
      ]},
      { name: "② 定盘（坐向与盘制）", fields: [
        { k: "zuo", label: "坐山", t: "mount" },
        { k: "xiang", label: "朝向", t: "mount" },
        { k: "degree", label: "周天坐度(0-360)", t: "number", ph: "如 315" },
        { k: "jian", label: "兼向", t: "select", o: [EMPTY, "正向", "兼左", "兼右"] },
        { k: "fenjin", label: "分金", t: "text", ph: "如 丙子分金" },
        { k: "panzhi", label: "盘制（必填）", t: "select", o: [EMPTY, "开禧度", "时宪度", "现代修正度"] }
      ]},
      { name: "③ 格龙（地盘正针）", fields: [
        { k: "lailong", label: "来龙", t: "mount" },
        { k: "rushou", label: "入首", t: "mount" },
        { k: "shuqi", label: "束气", t: "mount" },
        { k: "guoxia", label: "过峡、开帐、左右旋", t: "textarea", full: true }
      ]},
      { name: "④ 消砂（人盘中针，量尖顶）", fields: [
        { k: "sha", label: "各方砂位与形态", t: "textarea", full: true, ph: "例如：甲方高峰尖秀、酉方破碎逼压、坤方有塔" },
        { k: "xiudu", label: "砂的二十八宿线度（若有）", t: "textarea", full: true, ph: "例如：甲砂在角宿X度、酉砂在昂宿X度" }
      ]},
      { name: "⑤ 纳水（明水）", fields: [
        { k: "laishui", label: "来水方位", t: "mount" },
        { k: "qushui", label: "去水方位", t: "mount" },
        { k: "shuixing", label: "水形", t: "select", o: [EMPTY, "弯环抱穴", "直去", "反弓", "聚水/水库", "割脚", "穿心", "无水可见"] }
      ]},
      { name: "⑥ 形势", fields: [
        { k: "xingshi", label: "龙虎、朝案、明堂、水口、罗城", t: "textarea", full: true }
      ]},
      { name: "⑦ 房份与反推", fields: [
        { k: "fangshu", label: "几房人", t: "text", ph: "如 3房" },
        { k: "yearming", label: "各房年命", t: "text", ph: "如 长房1980庚申、二房1985乙丑" },
        { k: "events", label: "已发生的事（反推校验）", t: "textarea", full: true }
      ]}
    ],
    lvshi: [
      { name: "① 基本与原点", fields: [
        { k: "type", label: "宅型", t: "select", o: ["阳宅", "阴宅"] },
        { k: "lv_origin", label: "原点（必填）", t: "select", o: [EMPTY, "床位", "办公桌", "收银台", "尸骨/骨灰中心"] },
        { k: "lv_dun", label: "断谁", t: "select", o: ["本人", "某房", "某代", "全家族"] },
        { k: "lv_tai", label: "出生胎次（必填）", t: "number", ph: "1-9" },
        { k: "lv_sex", label: "胎次性别（必填）", t: "select", o: ["男", "女"] },
        { k: "lv_dishi", label: "地势类型", t: "select", o: ["山区", "平洋", "水乡", "公墓", "骨灰堂"] }
      ]},
      { name: "② 八宫砂水与高度差（必填）", fields: [
        { k: "lv_shashui", label: "八个方向分别填“砂/水 + 垂直高度差(米)”", t: "textarea", full: true, ph: "例如：东方砂高5米；西方水低3米；北方同砂；南方水低2米；东北砂高1米；东南砂高8米；西南水低4米；西北水低1米" }
      ]},
      { name: "③ 对宫与冲射", fields: [
        { k: "lv_duigong", label: "是否有对宫同砂/同水", t: "select", o: [EMPTY, "无", "有：东—西", "有：南—北", "有：东北—西南", "有：东南—西北"] },
        { k: "lv_chongshe", label: "冲射情况（路冲/水冲/尖角/风口）", t: "textarea", full: true }
      ]},
      { name: "④ 人丁与反推", fields: [
        { k: "fangshu", label: "几房人", t: "text", ph: "如 3房" },
        { k: "yearming", label: "各房年命", t: "text" },
        { k: "topic", label: "断事需求", t: "select", o: ["综合", "财运", "人丁", "事业", "婚姻", "健康"] },
        { k: "question", label: "想问的问题", t: "textarea", full: true },
        { k: "events", label: "已发生的事（反推校验）", t: "textarea", full: true }
      ]}
    ],
    xuankong: [
      { name: "① 元运与坐向", fields: [
        { k: "type", label: "宅型", t: "select", o: ["阳宅", "阴宅"] },
        { k: "year", label: "建宅/入住年份（定元运）", t: "number", ph: "如 2008" },
        { k: "yun", label: "元运", t: "select", o: ["按年份自动", "一运", "二运", "三运", "四运", "五运", "六运", "七运", "八运", "九运"] },
        { k: "zuo", label: "坐山", t: "mount" },
        { k: "xiang", label: "朝向", t: "mount" },
        { k: "degree", label: "周天坐度(0-360)", t: "number", ph: "如 315" },
        { k: "jian", label: "兼向", t: "select", o: [EMPTY, "正向（中9度内）", "兼左3度以上（需替卦）", "兼右3度以上（需替卦）"] }
      ]},
      { name: "② 门与内六事", fields: [
        { k: "men", label: "大门方位", t: "mount" },
        { k: "men_people", label: "人最多出入的门方位", t: "mount" },
        { k: "chuang", label: "主卧床方位", t: "mount" },
        { k: "zao", label: "灶位", t: "mount" },
        { k: "ce", label: "厕位", t: "mount" },
        { k: "floor", label: "楼层 / 户型中心点", t: "text", ph: "如 12层，户型中心在客厅" }
      ]},
      { name: "③ 外六事", fields: [
        { k: "waishi", label: "前后左右楼、路、水、桥、树、尖角、反光", t: "textarea", full: true, ph: "例如：坤方变压器、乾方反光幕墙、震方直路冲" }
      ]},
      { name: "④ 流年与反推", fields: [
        { k: "nowyear", label: "当前流年", t: "number", ph: "默认今年" },
        { k: "targetyear", label: "重点关注年份", t: "number", ph: "如 2026" },
        { k: "topic", label: "断事需求", t: "select", o: ["综合", "财运", "人丁", "事业", "婚姻", "健康", "化煞"] },
        { k: "question", label: "想问的问题", t: "textarea", full: true },
        { k: "events", label: "已发生的事（反推校验）", t: "textarea", full: true }
      ]}
    ],
    sanhe: [
      { name: "① 坐向与分金", fields: [
        { k: "type", label: "宅型", t: "select", o: ["阳宅", "阴宅"] },
        { k: "zuo", label: "坐山", t: "mount" },
        { k: "xiang", label: "朝向", t: "mount" },
        { k: "jian", label: "兼左兼右", t: "select", o: [EMPTY, "正向", "兼左", "兼右"] },
        { k: "degree", label: "周天坐度(0-360)", t: "number", ph: "如 315" },
        { k: "fenjinfa", label: "分金法", t: "select", o: [EMPTY, "杨公线法", "胎骨线法"] },
        { k: "fenjin", label: "分金", t: "text", ph: "如 丙子分金" }
      ]},
      { name: "② 格龙（地盘正针，三处字位）", fields: [
        { k: "lailong", label: "来龙", t: "mount" },
        { k: "rushou", label: "入首", t: "mount" },
        { k: "shuqi", label: "束气", t: "mount" }
      ]},
      { name: "③ 测水（天盘缝针：关/拦/顺）", fields: [
        { k: "laishui", label: "来水方位", t: "mount" },
        { k: "qushui", label: "去水 / 水口方位", t: "mount" },
        { k: "shuixing", label: "水形", t: "select", o: [EMPTY, "弯环抱穴", "直去", "反弓", "聚水/水库", "割脚", "穿心", "无水可见"] },
        { k: "zuoyou", label: "水流方向", t: "select", o: [EMPTY, "左水到右", "右水到左", "顺水朝", "两水夹来"] }
      ]},
      { name: "④ 消砂（人盘中针）", fields: [
        { k: "sha", label: "各方砂位与形态（量尖顶）", t: "textarea", full: true }
      ]},
      { name: "⑤ 仙命、人丁与反推", fields: [
        { k: "xianming", label: "亡者生年（仙命，阴宅）", t: "text", ph: "如 1940庚辰" },
        { k: "fangshu", label: "几房人", t: "text", ph: "如 3房" },
        { k: "yearming", label: "各房年命", t: "text" },
        { k: "topic", label: "断事需求", t: "select", o: ["综合", "财运", "人丁", "事业", "婚姻", "健康", "择地立向"] },
        { k: "question", label: "想问的问题", t: "textarea", full: true },
        { k: "events", label: "已发生的事（反推校验）", t: "textarea", full: true }
      ]}
    ]
  };

  var REQUIRED = {
    tianxing: ["zuo", "xiang", "panzhi", "lailong", "sha", "laishui", "qushui"],
    lvshi:    ["lv_origin", "lv_tai", "lv_sex", "lv_shashui", "lv_duigong"],
    xuankong: ["year", "zuo", "xiang", "men"],
    sanhe:    ["zuo", "xiang", "lailong", "laishui", "qushui"]
  };

  var state = { method: "xuankong", zuo: "子", xiang: "午", degree: 180 };

  // 二十四山（地平顺时针，子山在正上）
  var SHAN_CW = ["子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬"];
  function SHAN_ORDER_UI() { return SHAN_CW; }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function currentFields() {
    var out = [];
    (SCHEMAS[state.method] || []).forEach(function (group) {
      group.fields.forEach(function (field) { out.push(field); });
    });
    return out;
  }

  function fieldHtml(field) {
    var id = "ky_" + field.k;
    var cls = "ky-field" + (field.full ? " ky-full" : "");
    var inner;
    if (field.t === "select") {
      inner = '<select id="' + id + '">' + field.o.map(function (o) {
        return '<option value="' + esc(o) + '">' + esc(o) + "</option>";
      }).join("") + "</select>";
    } else if (field.t === "mount") {
      inner = '<select id="' + id + '">' + MOUNTAINS.map(function (o) {
        return '<option value="' + esc(o) + '">' + esc(o) + "</option>";
      }).join("") + "</select>";
    } else if (field.t === "textarea") {
      inner = '<textarea id="' + id + '" rows="2" placeholder="' + esc(field.ph || "") + '"></textarea>';
    } else {
      inner = '<input type="' + (field.t === "number" ? "number" : "text") + '" id="' + id + '" placeholder="' + esc(field.ph || "") + '">';
    }
    return '<div class="' + cls + '" data-key="' + field.k + '"><label>' + esc(field.label) +
      '<span class="ky-req" data-req="' + field.k + '"></span></label>' + inner + "</div>";
  }

  function buildUi() {
    var el = document.getElementById("tab-kanyu");
    if (!el) return;
    el.innerHTML =
      '<div class="card ky-hero">' +
        '<div class="ky-hero-luopan" id="ky-hero-luopan" aria-hidden="true"></div>' +
        '<svg class="ky-hero-mountains" viewBox="0 0 1200 320" preserveAspectRatio="none" aria-hidden="true">' +
          '<path d="M0,320 L0,238 L92,196 L168,232 L262,166 L352,224 L438,182 L540,246 L628,204 L726,252 L820,196 L918,240 L1030,188 L1120,236 L1200,210 L1200,320 Z" fill="rgba(90,110,122,.20)"/>' +
          '<path d="M0,320 L0,272 L120,246 L214,278 L318,238 L420,286 L520,250 L640,292 L746,254 L862,296 L968,258 L1080,292 L1200,262 L1200,320 Z" fill="rgba(58,74,88,.34)"/>' +
          '<path d="M0,320 L0,300 L140,286 L262,306 L392,284 L520,308 L660,288 L800,310 L940,290 L1080,308 L1200,294 L1200,320 Z" fill="rgba(26,34,42,.7)"/>' +
        '</svg>' +
        '<div class="ky-hero-water" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="ky-hero-fore">' +
          '<div class="ky-brand"><b>山渊</b>策<span>· 堪舆</span></div>' +
          '<h3>山藏形势 · 渊纳天机</h3>' +
          '<p>以罗盘定来龙坐向，以四派察地理形势，以些子法择日、七政四余择时。数据由你现场采集，判断按体系分层给出。</p>' +
          '<div class="ky-nav">' +
            '<button type="button" class="ky-nav-btn active" data-panel="luopan">🧭 罗盘量山</button>' +
            '<button type="button" class="ky-nav-btn" data-panel="sipai">🏔️ 四派研判</button>' +
            '<button type="button" class="ky-nav-btn" data-panel="xiezi">🧧 些子法择日</button>' +
            '<button type="button" class="ky-nav-btn" data-panel="qizheng">✨ 七政四余</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ky-panel active" id="ky-panel-luopan">' +
        '<div class="card"><h3>🧭 罗盘 · 量山定向</h3>' +
        '<div class="ky-lp-wrap"><div class="ky-lp-stage" id="ky-luopan-main"></div>' +
        '<div class="ky-lp-side"><div class="ky-grid">' +
        '<div class="ky-field"><label>坐山（后靠）</label><select id="ky-lp-zuo">' + SHAN_ORDER_UI().map(function (s) { return '<option value="' + s + '">' + s + "山</option>"; }).join("") + "</select></div>" +
        '<div class="ky-field"><label>朝向（前朝）</label><select id="ky-lp-xiang">' + SHAN_ORDER_UI().map(function (s) { return '<option value="' + s + '">' + s + "山</option>"; }).join("") + "</select></div>" +
        '<div class="ky-field"><label>向首周天度数（0=北，顺时针）</label><input type="number" id="ky-lp-degree" step="0.1" value="180"></div>' +
        '<div class="ky-field"><label>盘式</label><select id="ky-lp-disk"><option>地盘正针</option><option>人盘中针</option><option>天盘缝针</option></select></div>' +
        '</div>' +
        '<div class="ky-lp-readout" id="ky-lp-readout"></div>' +
        '<div class="ky-meta">拖动/输入坐向后，罗盘指针与高亮会同步跟随；此盘另作为本页背景动效。</div>' +
        '</div></div></div>' +
      '</div>' +
      '<div class="ky-panel" id="ky-panel-sipai">' +
        '<div class="card ky-hero-sub"><h3>🏔️ 堪舆 · 风水现场研判</h3>' +
        '<p>你负责现场测量，系统按你选的流派做递进判断：先看已给信息能定什么，再告诉你还缺什么、下一步回现场测什么，数据齐了才落最终预测。</p>' +
        '<div class="ky-methods">' + METHODS.map(function (m) {
          return '<button type="button" class="ky-method" data-method="' + m.id + '">' + esc(m.name) +
            "<span>" + esc(m.sub) + "</span></button>";
        }).join("") + "</div>" +
        '<div class="ky-measure" id="ky-measure"></div></div>' +
        '<div class="card"><h3>🧭 测量修正 · 磁偏角（WMM2025 自动计算）</h3><div class="ky-grid">' +
        '<div class="ky-field"><label>1. 城市 / 地区</label><input id="ky_region" list="ky-region-list" placeholder="如 北京"><datalist id="ky-region-list">' +
        Object.keys(REGION_DECL).map(function (k) { return '<option value="' + esc(k) + '"></option>'; }).join("") + "</datalist></div>" +
        '<div class="ky-field"><label>2. 纬度（北纬 +）</label><input type="number" id="ky_lat" step="0.0001" placeholder="如 39.9042"></div>' +
        '<div class="ky-field"><label>3. 经度（东经 +）</label><input type="number" id="ky_lon" step="0.0001" placeholder="如 116.4074"></div>' +
        '<div class="ky-field"><label>4. 测量年份</label><input type="number" id="ky_meas_year" step="1" placeholder="如 2026"></div>' +
        '<div class="ky-field"><label>5. 磁偏角（自动，可手改）</label><input type="number" id="ky_decl" step="0.01"></div>' +
        '<div class="ky-field"><label>6. 是否启用修正</label><select id="ky_use_decl"><option value="启用">启用</option><option value="不启用">不启用</option></select></div>' +
        '</div><div class="ky-meta" id="ky_decl_note">选城市会自动填经纬度，并按 WMM2025 模型算出该年磁偏角；也可以手填经纬度或磁偏角。修正后（真北）= 罗盘读数 + 磁偏角，启用后所有方位/度数都按修正值计算。</div></div>' +
        '<div class="card"><div class="ky-progress"><span id="ky-progress-text"></span><span id="ky-progress-list"></span></div>' +
        '<div id="ky-fields"></div>' +
        '<div class="ky-actions"><button type="button" class="btn-go" id="ky-run">✨ 开始分析</button>' +
        '<button type="button" class="ky-ghost" id="ky-clear">清空本派</button>' +
        '<span class="ky-status" id="ky-status"></span></div></div>' +
        '<div class="card ky-taboo-card"><h3>⛔ 本派硬禁忌（犯了一票否决）</h3><div id="ky-taboos"></div></div>' +
        '<div id="ky-result"></div>' +
      '</div>' +
      '<div class="ky-panel" id="ky-panel-xiezi"></div>' +
      '<div class="ky-panel" id="ky-panel-qizheng"></div>';

    // 顶部导航
    var navBtns = el.querySelectorAll(".ky-nav-btn");
    function showPanel(name) {
      el.querySelectorAll(".ky-panel").forEach(function (p) { p.classList.toggle("active", p.id === "ky-panel-" + name); });
      navBtns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-panel") === name); });
      if (name === "qizheng") {
        var cv = document.getElementById("qz-canvas");
        if (cv && window.KanyuQizheng) window.KanyuQizheng.drawChart(cv, new Date(), document.getElementById("qz-shan") && document.getElementById("qz-shan").value);
      }
    }
    navBtns.forEach(function (b) {
      b.addEventListener("click", function () { showPanel(b.getAttribute("data-panel")); });
    });

    // 罗盘量山：主盘 + 背景盘联动
    var heroLp = null, mainLp = null;
    if (window.Luopan) {
      heroLp = window.Luopan.background(document.getElementById("ky-hero-luopan"), { size: 1000 });
      mainLp = window.Luopan.create(document.getElementById("ky-luopan-main"), { size: 1000 });
    }
    function updateLuopan() {
      var zuo = document.getElementById("ky-lp-zuo").value;
      var xiang = document.getElementById("ky-lp-xiang").value;
      var deg = parseFloat(document.getElementById("ky-lp-degree").value);
      var disk = document.getElementById("ky-lp-disk").value;
      if (heroLp) heroLp.setOrientation({ zuo: zuo, xiang: xiang, degree: deg });
      if (mainLp) mainLp.setOrientation({ zuo: zuo, xiang: xiang, degree: deg });
      var gi = (window.Luopan ? window.Luopan.shanIndex(zuo) : -1);
      var out = document.getElementById("ky-lp-readout");
      if (out) {
        var gua = (window.KanyuXiezi && window.KanyuXiezi.mountainGua) ? window.KanyuXiezi.mountainGua(zuo) : null;
        out.innerHTML = "<b>" + esc(zuo) + "山 " + esc(xiang) + "向</b>　向首 " +
          (isNaN(deg) ? "—" : deg + "°") + "　盘式 " + esc(disk) +
          (gua ? "<br>坐山正针卦：<b>" + esc(gua) + "</b>" : "");
      }
      if (state) { state.zuo = zuo; state.xiang = xiang; state.degree = deg; }
    }
    var lpXiang = document.getElementById("ky-lp-xiang");
    var lpDegree = document.getElementById("ky-lp-degree");
    function nearestShan(deg) {
      var list = SHAN_ORDER_UI();
      var best = list[0], bestD = 999;
      list.forEach(function (s, i) {
        var c = i * 15, diff = Math.abs(((norm180(deg - c)) + 360) % 360);
        if (diff < bestD) { bestD = diff; best = s; }
      });
      return best;
    }
    function norm180(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
    ["ky-lp-zuo", "ky-lp-disk"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) { node.addEventListener("input", updateLuopan); node.addEventListener("change", updateLuopan); }
    });
    // 改向山 → 自动同步度数；改度数 → 自动同步向山（保持两者一致）
    lpXiang.addEventListener("change", function () {
      var i = SHAN_ORDER_UI().indexOf(lpXiang.value);
      if (i >= 0) lpDegree.value = String(i * 15);
      updateLuopan();
    });
    lpXiang.addEventListener("input", function () {
      var i = SHAN_ORDER_UI().indexOf(lpXiang.value);
      if (i >= 0) lpDegree.value = String(i * 15);
      updateLuopan();
    });
    lpDegree.addEventListener("input", function () {
      var d = parseFloat(lpDegree.value);
      if (!isNaN(d)) lpXiang.value = nearestShan(((d % 360) + 360) % 360);
      updateLuopan();
    });
    lpDegree.addEventListener("change", function () {
      var d = parseFloat(lpDegree.value);
      if (!isNaN(d)) lpXiang.value = nearestShan(((d % 360) + 360) % 360);
      updateLuopan();
    });
    document.getElementById("ky-lp-zuo").value = "子";
    document.getElementById("ky-lp-xiang").value = "午";
    document.getElementById("ky-lp-degree").value = "180";
    updateLuopan();

    // 子模块挂载
    if (window.KanyuXiezi) window.KanyuXiezi.mount(document.getElementById("ky-panel-xiezi"));
    if (window.KanyuQizheng) window.KanyuQizheng.mount(document.getElementById("ky-panel-qizheng"));

    METHODS.forEach(function (m) {
      el.querySelector('.ky-method[data-method="' + m.id + '"]').addEventListener("click", function () {
        selectMethod(m.id);
      });
    });
    document.getElementById("ky-run").addEventListener("click", analyze);
    document.getElementById("ky-clear").addEventListener("click", clearAll);

    var regionInput = document.getElementById("ky_region");
    var note = document.getElementById("ky_decl_note");
    var measYear = document.getElementById("ky_meas_year");
    if (!measYear.value) measYear.value = new Date().getFullYear();

    function computeDecl() {
      var lat = parseFloat(value("lat"));
      var lon = parseFloat(value("lon"));
      var yr = parseFloat(value("meas_year")) || new Date().getFullYear();
      var out = document.getElementById("ky_decl");
      if (window.Magvar && !isNaN(lat) && !isNaN(lon)) {
        var d = window.Magvar.magvar(lat, lon, 0, yr);
        out.value = d.toFixed(2);
        note.textContent = "WMM2025 计算：" + yr + " 年，" + lat + "°N " + lon + "°E → 磁偏角 " + d.toFixed(2) +
          "°（东偏+ / 西偏−）。修正后（真北）= 罗盘读数 + 磁偏角。";
      } else {
        var city = String(regionInput.value || "").trim();
        var base = REGION_DECL[city];
        var rate = (window.KANYU_REGION_RATE || {})[city] || 0;
        if (base != null) {
          out.value = (base + rate * (yr - 2025)).toFixed(2);
          note.textContent = "近似表：" + city + " " + yr + " 年磁偏角约 " + out.value + "°。";
        }
      }
      saveLocal();
    }

    function fillCity() {
      var city = String(regionInput.value || "").trim();
      var geo = (window.KANYU_REGION_GEO || {})[city];
      if (geo) {
        document.getElementById("ky_lat").value = geo[0];
        document.getElementById("ky_lon").value = geo[1];
      }
      computeDecl();
    }

    regionInput.addEventListener("input", fillCity);
    regionInput.addEventListener("change", fillCity);
    ["ky_lat", "ky_lon", "ky_meas_year"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", computeDecl);
    });
    document.getElementById("ky_decl").addEventListener("change", saveLocal);
    document.getElementById("ky_use_decl").addEventListener("change", saveLocal);
  }

  function buildFields() {
    var container = document.getElementById("ky-fields");
    container.innerHTML = (SCHEMAS[state.method] || []).map(function (group) {
      return '<section class="ky-group"><h4>' + esc(group.name) + '</h4><div class="ky-grid">' +
        group.fields.map(fieldHtml).join("") + "</div></section>";
    }).join("");
    currentFields().forEach(function (f) {
      var input = document.getElementById("ky_" + f.k);
      if (!input) return;
      input.addEventListener("input", function () { saveLocal(); refreshProgress(); });
      input.addEventListener("change", function () { saveLocal(); refreshProgress(); });
    });
  }

  function renderMeasure() {
    var m = MEASURE[state.method];
    document.getElementById("ky-measure").innerHTML =
      "<h4>" + esc(m.title) + "</h4><ul>" + m.lines.map(function (l) { return "<li>" + l + "</li>"; }).join("") + "</ul>";
  }

  function renderTaboos() {
    var rows = (TABOOS[state.method] || []).map(function (t) {
      return "<tr><td><b>" + esc(t[0]) + "</b></td><td>" + esc(t[1]) + '</td><td class="ky-凶">' + esc(t[2]) + "</td></tr>";
    }).join("");
    document.getElementById("ky-taboos").innerHTML =
      '<table class="ky-taboo"><thead><tr><th>禁忌</th><th>方位 / 条件</th><th>会发生什么</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function selectMethod(id) {
    saveLocal();
    state.method = id;
    document.querySelectorAll("#tab-kanyu .ky-method").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-method") === id);
    });
    renderMeasure();
    buildFields();
    renderTaboos();
    loadLocal();
    refreshProgress();
    document.getElementById("ky-result").innerHTML = "";
    document.getElementById("ky-status").textContent = "";
  }

  function value(key) {
    var input = document.getElementById("ky_" + key);
    return input ? String(input.value || "").trim() : "";
  }

  function isFilled(key) {
    var v = value(key);
    return Boolean(v) && v !== EMPTY && v !== "按年份自动";
  }

  function refreshProgress() {
    var fields = currentFields();
    var required = REQUIRED[state.method] || [];
    var done = required.filter(isFilled).length;
    var text = document.getElementById("ky-progress-text");
    var list = document.getElementById("ky-progress-list");
    if (text) text.textContent = "本派关键项：" + done + " / " + required.length + " 已填";
    if (list) {
      list.innerHTML = required.map(function (key) {
        var field = fields.filter(function (f) { return f.k === key; })[0] || { label: key };
        var ok = isFilled(key);
        return '<span class="ky-chip ' + (ok ? "ok" : "") + '">' + (ok ? "✓ " : "○ ") + esc(field.label) + "</span>";
      }).join("");
    }
    fields.forEach(function (f) {
      var badge = document.querySelector('#tab-kanyu .ky-req[data-req="' + f.k + '"]');
      if (!badge) return;
      var need = required.indexOf(f.k) >= 0;
      badge.textContent = need ? (isFilled(f.k) ? " 必填 ✓" : " 必填") : "";
      badge.className = "ky-req" + (need ? " needed" : "");
    });
  }

  function collect() {
    var out = {};
    currentFields().forEach(function (f) {
      var v = value(f.k);
      if (v) out[f.k] = v;
    });
    var fields = currentFields();
    var required = REQUIRED[state.method] || [];
    out._method = state.method;
    out._missing = required.filter(function (k) { return !isFilled(k); }).map(function (k) {
      var field = fields.filter(function (f) { return f.k === k; })[0];
      return field ? field.label : k;
    });

    // 磁偏角修正：启用后，所有方位/度数改用修正后的真北值
    var decl = parseFloat(value("decl"));
    out._decl = {
      region: value("region"),
      decl: isNaN(decl) ? null : decl,
      applied: value("use_decl") === "启用" && !isNaN(decl)
    };
    if (out._decl.applied) {
      out._corrected = {};
      ANGULAR_FIELDS.forEach(function (k) {
        if (out[k]) out._corrected[k] = declShiftMount(out[k], decl);
      });
      if (out.degree) out._corrected.degree = declShiftDeg(out.degree, decl);
    }
    return out;
  }

  function saveLocal() {
    try {
      var store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      store[state.method] = collect();
      store.__decl = {
        region: value("region"), lat: value("lat"), lon: value("lon"),
        year: value("meas_year"), decl: value("decl"), use: value("use_decl")
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function loadLocal() {
    var store = {};
    try {
      store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch (e) { store = {}; }
    var saved = store[state.method] || null;
    if (saved) {
      currentFields().forEach(function (f) {
        var input = document.getElementById("ky_" + f.k);
        if (input && saved[f.k] != null) input.value = saved[f.k];
      });
    }
    var g = store.__decl;
    if (g) {
      if (g.region != null) document.getElementById("ky_region").value = g.region;
      if (g.lat != null) document.getElementById("ky_lat").value = g.lat;
      if (g.lon != null) document.getElementById("ky_lon").value = g.lon;
      if (g.year != null) document.getElementById("ky_meas_year").value = g.year;
      if (g.decl != null) document.getElementById("ky_decl").value = g.decl;
      if (g.use != null) document.getElementById("ky_use_decl").value = g.use;
    }
  }

  function clearAll() {
    currentFields().forEach(function (f) {
      var input = document.getElementById("ky_" + f.k);
      if (!input) return;
      if (input.tagName === "SELECT") input.selectedIndex = 0;
      else input.value = "";
    });
    saveLocal();
    refreshProgress();
    document.getElementById("ky-result").innerHTML = "";
    document.getElementById("ky-status").textContent = "";
  }

  function analyze() {
    var status = document.getElementById("ky-status");
    var result = document.getElementById("ky-result");
    var btn = document.getElementById("ky-run");
    var data = collect();
    var question = data.question || "请按该体系做完整解析，并告诉我还缺什么、下一步现场测什么";
    var methodName = METHODS.filter(function (m) { return m.id === state.method; })[0].name;
    var pan = window.KANYU_PAN ? window.KANYU_PAN.compute(state.method, data) : { html: "", summary: null };
    data._computed = pan.summary;

    status.textContent = "⏳ 正在按" + methodName + "研判…";
    btn.disabled = true;
    result.innerHTML = (pan.html || "") + '<div class="card ky-pending">🤖 正在生成 AI 研判…</div>';

    fetch(API + "/api/v1/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: state.method, chart: data, question: question })
    }).then(function (resp) {
      return resp.json().then(function (body) { return { ok: resp.ok, body: body }; });
    }).then(function (out) {
      if (!out.ok) throw new Error(out.body.error || "HTTP_ERROR");
      renderResult(data, out.body, methodName, pan.html);
      status.textContent = "✅ 分析完成";
    }).catch(function (err) {
      status.textContent = "❌ 生成失败";
      result.innerHTML = (pan.html || "") + '<div class="card ky-error">接口错误：' + esc(err.message) + "</div>";
    }).finally(function () {
      btn.disabled = false;
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderResult(data, body, methodName, panHtml) {
    var fields = currentFields();
    var missing = data._missing || [];
    var filled = fields.filter(function (f) { return data[f.k]; }).map(function (f) {
      return "<div><b>" + esc(f.label) + "：</b>" + esc(data[f.k]) + "</div>";
    }).join("");
    var missingHtml = missing.length
      ? '<div class="ky-missing"><b>本派还缺这些关键项（回现场补测后再点分析）：</b><ul>' +
        missing.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div>"
      : '<div class="ky-ok">本派关键项已齐，可直接看下面的正式判断。</div>';

    var declHtml = "";
    if (data._decl) {
      if (data._decl.applied) {
        var rows = ANGULAR_FIELDS.filter(function (k) { return data[k]; }).map(function (k) {
          var f = fields.filter(function (x) { return x.k === k; })[0] || { label: k };
          var corr = data._corrected && data._corrected[k];
          return "<tr><td>" + esc(f.label) + "</td><td>" + esc(data[k]) + "</td><td>" + esc(corr || "") + "</td></tr>";
        }).join("");
        if (data.degree) {
          rows = "<tr><td>周天坐度</td><td>" + esc(data.degree) + "°</td><td>" +
            esc(data._corrected && data._corrected.degree) + "°</td></tr>" + rows;
        }
        declHtml = '<div class="card"><h3>🧭 磁偏角修正（已启用）</h3>' +
          '<div class="ky-meta">地区：' + esc(data._decl.region || "未填") + "；磁偏角：" + esc(data._decl.decl) +
          "°（东偏+ / 西偏−）；修正后（真北）= 罗盘读数 + 磁偏角。</div>" +
          '<table class="kp-table"><thead><tr><th>项</th><th>原始（罗盘）</th><th>修正（真北）</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
      } else if (data._decl.decl != null) {
        declHtml = '<div class="card"><h3>🧭 磁偏角修正</h3><div class="ky-meta">已填磁偏角 ' +
          esc(data._decl.decl) + "° 但未启用修正，本次按原始罗盘读数计算。</div></div>";
      }
    }

    document.getElementById("ky-result").innerHTML =
      (panHtml || "") +
      declHtml +
      '<div class="card ky-sub"><h3>📋 本次已填信息</h3>' + (filled || "（未填）") + missingHtml + "</div>" +
      '<div class="card" style="border-color:var(--gold)"><h3>📜 堪舆研判（' + esc(methodName) + "）</h3>" +
      '<div class="ky-answer">' + esc(body.interpretation || "") + "</div></div>";
  }

  function injectStyle() {
    var css = [
      "#tab-kanyu .ky-hero p{color:var(--dim);font-size:.86em;line-height:1.8;margin:8px 0 14px}",
      "#tab-kanyu .ky-methods{display:flex;flex-wrap:wrap;gap:8px}",
      "#tab-kanyu .ky-method{flex:1 1 130px;padding:10px 8px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--text);cursor:pointer;font-family:inherit;font-size:.9em;font-weight:600;line-height:1.5}",
      "#tab-kanyu .ky-method span{display:block;color:var(--dim);font-size:.78em;font-weight:400}",
      "#tab-kanyu .ky-method.active{border-color:var(--gold);background:rgba(200,164,92,.15);color:var(--goldL)}",
      "#tab-kanyu .ky-measure{margin-top:14px;padding:12px;border-radius:8px;background:rgba(200,164,92,.07);border:1px solid var(--border)}",
      "#tab-kanyu .ky-measure h4{margin:0 0 8px;color:var(--goldL);font-size:.92em}",
      "#tab-kanyu .ky-measure ul{margin:0;padding-left:18px;color:var(--text);font-size:.82em;line-height:1.85}",
      "#tab-kanyu .ky-progress{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px;font-size:.82em;color:var(--dim)}",
      "#tab-kanyu .ky-chip{display:inline-block;margin:2px 3px;padding:2px 7px;border-radius:999px;border:1px solid var(--border);font-size:.78em}",
      "#tab-kanyu .ky-chip.ok{border-color:var(--gold);color:var(--goldL)}",
      "#tab-kanyu .ky-group{padding:12px 0;border-bottom:1px dashed var(--border)}",
      "#tab-kanyu .ky-group:last-of-type{border-bottom:none}",
      "#tab-kanyu .ky-group h4{margin:0 0 10px;color:var(--goldL);font-size:.9em}",
      "#tab-kanyu .ky-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}",
      "#tab-kanyu .ky-field{display:flex;flex-direction:column;gap:5px;min-width:0}",
      "#tab-kanyu .ky-field.ky-full{grid-column:1 / -1}",
      "#tab-kanyu .ky-field label{font-size:.8em;color:var(--dim)}",
      "#tab-kanyu .ky-field input,#tab-kanyu .ky-field select,#tab-kanyu .ky-field textarea{width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--input);color:var(--text);font-family:inherit;font-size:.86em}",
      "#tab-kanyu .ky-req.needed{color:var(--goldL)}",
      "#tab-kanyu .ky-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}",
      "#tab-kanyu .ky-ghost{padding:8px 16px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--dim);cursor:pointer;font-family:inherit}",
      "#tab-kanyu .ky-status{color:var(--dim);font-size:.84em}",
      "#tab-kanyu .ky-taboo-card h3{margin-bottom:10px}",
      "#tab-kanyu .ky-taboo{width:100%;border-collapse:collapse;font-size:.8em}",
      "#tab-kanyu .ky-taboo th,#tab-kanyu .ky-taboo td{border:1px solid var(--border);padding:7px 8px;text-align:left;vertical-align:top;line-height:1.6}",
      "#tab-kanyu .ky-taboo th{color:var(--goldL);background:rgba(200,164,92,.08)}",
      "#tab-kanyu .ky-taboo .ky-凶{color:var(--redL)}",
      "#tab-kanyu .ky-sub div{font-size:.85em;line-height:1.9;color:var(--text)}",
      "#tab-kanyu .ky-missing{margin-top:10px;padding:10px;border-radius:6px;background:rgba(192,57,43,.12);font-size:.84em}",
      "#tab-kanyu .ky-missing ul{margin:6px 0 0;padding-left:18px}",
      "#tab-kanyu .ky-ok{margin-top:10px;color:var(--goldL);font-size:.84em}",
      "#tab-kanyu .ky-answer{white-space:pre-wrap;line-height:2;font-size:.88em}",
      "#tab-kanyu .ky-error{color:var(--redL)}",
      "#tab-kanyu .ky-pending{color:var(--dim);text-align:center;padding:14px}",
      "#tab-kanyu .kp-block{margin-bottom:10px}",
      "#tab-kanyu .kp-block h4{margin:0 0 10px;color:var(--goldL);font-size:.92em}",
      "#tab-kanyu .kp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}",
      "#tab-kanyu .kp-cell{border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center;background:var(--input)}",
      "#tab-kanyu .kp-cell.kp-zuo{border-color:var(--gold);background:rgba(200,164,92,.12)}",
      "#tab-kanyu .kp-cell.kp-xiang{border-color:#6ea8fe;background:rgba(110,168,254,.12)}",
      "#tab-kanyu .kp-palace{font-size:.75em;color:var(--dim);margin-bottom:4px}",
      "#tab-kanyu .kp-star{font-size:1.05em;line-height:1.5}",
      "#tab-kanyu .kp-star i{font-style:normal;font-size:.7em;color:var(--dim);margin-right:3px}",
      "#tab-kanyu .kp-meta{font-size:.8em;color:var(--dim);line-height:1.7;margin-top:6px}",
      "#tab-kanyu .kp-hl{margin-top:8px;padding:8px 10px;border-radius:6px;background:rgba(200,164,92,.1);font-size:.85em;color:var(--goldL)}",
      "#tab-kanyu .kp-note{font-size:.84em;color:var(--dim)}",
      "#tab-kanyu .kp-list{margin:0;padding-left:18px;font-size:.84em;line-height:1.9}",
      "#tab-kanyu .kp-shuang{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}",
      "#tab-kanyu .kp-shuang-cell{border:1px solid var(--border);border-radius:5px;padding:5px 4px;text-align:center;font-size:.76em;background:var(--input)}",
      "#tab-kanyu .kp-shuang-cell b{display:block;color:var(--text)}",
      "#tab-kanyu .kp-shuang-cell span{color:var(--goldL)}",
      "#tab-kanyu .kp-table{width:100%;border-collapse:collapse;font-size:.78em}",
      "#tab-kanyu .kp-table th,#tab-kanyu .kp-table td{border:1px solid var(--border);padding:5px 6px;text-align:left}",
      "#tab-kanyu .kp-table th{color:var(--goldL);background:rgba(200,164,92,.08)}",
      "#tab-kanyu .kp-good{color:var(--goldL)}",
      "#tab-kanyu .kp-bad{color:var(--redL)}",
      "#tab-kanyu .lp-svg{width:100%;height:auto;display:block}",
      "#tab-kanyu .lp-txt{font-family:'Noto Serif SC','SimSun',serif;user-select:none}",
      "#tab-kanyu .ky-panel{display:none}",
      "#tab-kanyu .ky-panel.active{display:block}",
      "#tab-kanyu .ky-hero{position:relative;overflow:hidden;min-height:340px;padding:0;background:linear-gradient(160deg,#0b1016 0%,#141018 46%,#1d1610 100%);border:1px solid var(--borderL);border-radius:var(--r-lg)}",
      "#tab-kanyu .ky-hero-luopan{position:absolute;right:-6%;top:-34%;width:min(560px,68%);opacity:.20;pointer-events:none;z-index:0;filter:saturate(.9)}",
      "#tab-kanyu .ky-hero-mountains{position:absolute;left:0;right:0;bottom:0;width:100%;height:62%;z-index:1;pointer-events:none}",
      "#tab-kanyu .ky-hero-water{position:absolute;left:0;right:0;bottom:0;height:74px;z-index:1;overflow:hidden;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(8,14,22,.72))}",
      "#tab-kanyu .ky-hero-water i{position:absolute;left:-10%;width:120%;height:1px;background:linear-gradient(90deg,transparent,rgba(150,190,220,.35),transparent);animation:kyripple 9s linear infinite}",
      "#tab-kanyu .ky-hero-water i:nth-child(1){bottom:12px;animation-duration:11s}",
      "#tab-kanyu .ky-hero-water i:nth-child(2){bottom:26px;animation-duration:14s;animation-delay:-3s}",
      "#tab-kanyu .ky-hero-water i:nth-child(3){bottom:40px;animation-duration:17s;animation-delay:-6s}",
      "#tab-kanyu .ky-hero-water i:nth-child(4){bottom:54px;animation-duration:21s;animation-delay:-9s}",
      "#tab-kanyu .ky-hero-water i:nth-child(5){bottom:66px;animation-duration:25s;animation-delay:-12s}",
      "@keyframes kyripple{0%{transform:translateX(-6%) scaleX(.9);opacity:.15}50%{opacity:.5}100%{transform:translateX(6%) scaleX(1.05);opacity:.15}}",
      "#tab-kanyu .ky-hero-fore{position:relative;z-index:2;padding:34px 28px 30px;max-width:640px}",
      "#tab-kanyu .ky-brand{font-family:'Noto Serif SC','SimSun',serif;font-size:1.5em;letter-spacing:.16em;color:var(--goldL)}",
      "#tab-kanyu .ky-brand b{font-weight:900;color:#f0d9a0;text-shadow:0 2px 18px rgba(200,164,92,.35)}",
      "#tab-kanyu .ky-brand span{font-size:.55em;color:var(--dim);letter-spacing:.24em;margin-left:8px}",
      "#tab-kanyu .ky-hero-fore h3{margin:14px 0 10px;font-size:1.35em;color:var(--text);letter-spacing:.1em;border:none;padding:0}",
      "#tab-kanyu .ky-hero-fore p{color:#a99b86;font-size:.85em;line-height:1.9;margin:0 0 18px;max-width:560px}",
      "#tab-kanyu .ky-nav{display:flex;flex-wrap:wrap;gap:8px}",
      "#tab-kanyu .ky-nav-btn{padding:8px 14px;border-radius:999px;border:1px solid rgba(200,164,92,.35);background:rgba(12,16,22,.5);color:#cbbc9f;cursor:pointer;font-family:inherit;font-size:.84em;font-weight:600;transition:all .2s}",
      "#tab-kanyu .ky-nav-btn:hover{border-color:var(--gold);color:var(--goldL)}",
      "#tab-kanyu .ky-nav-btn.active{border-color:var(--gold);background:linear-gradient(180deg,rgba(200,164,92,.3),rgba(200,164,92,.12));color:#f4e2b6;box-shadow:0 0 18px rgba(200,164,92,.18)}",
      "#tab-kanyu .ky-lp-wrap{display:grid;grid-template-columns:minmax(260px,1fr) minmax(240px,1fr);gap:22px;align-items:center}",
      "#tab-kanyu .ky-lp-stage{position:relative;width:100%;max-width:440px;margin:0 auto;aspect-ratio:1/1}",
      "#tab-kanyu .ky-lp-readout{margin-top:12px;padding:10px 12px;border-radius:8px;background:rgba(200,164,92,.08);border:1px solid var(--border);font-size:.86em;line-height:1.8}",
      "#tab-kanyu .ky-hero-sub p{color:var(--dim);font-size:.86em;line-height:1.8;margin:8px 0 14px}",
      "@media(max-width:720px){#tab-kanyu .ky-hero-luopan{right:-24%;top:-16%;width:96%;opacity:.14}#tab-kanyu .ky-hero-fore{padding:26px 18px 24px}#tab-kanyu .ky-lp-wrap{grid-template-columns:1fr}}"
    ].join("");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // 通用 AI 研判入口：先由调用方给出可见的盘，再把盘交给云端技能详批
  window.KanyuAI = {
    api: API,
    esc: esc,
    run: async function (opt) {
      var resp = opt.responseEl, status = opt.statusEl, btn = opt.btnEl;
      if (btn) btn.disabled = true;
      if (status) status.textContent = "⏳ 正在请求 AI 详批…";
      if (resp) resp.style.display = "block";
      try {
        var r = await fetch(API + "/api/v1/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: opt.mode, chart: opt.chart, question: opt.question || "请按该体系做完整解析" })
        });
        var body = await r.json();
        if (!r.ok) throw new Error(body.error || ("HTTP " + r.status));
        if (body.mode && body.mode !== opt.mode) throw new Error("BACKEND_SKILL_MISSING");
        if (resp) {
          resp.innerHTML = '<div class="card" style="border-color:var(--gold)"><h3>📜 ' + esc(opt.title || "AI 详批") +
            '</h3><div style="white-space:pre-wrap;line-height:2;font-size:.88em">' + esc(body.interpretation || "") + "</div></div>";
        }
        if (status) status.textContent = "✅ 详批完成";
      } catch (e) {
        var msg = e.message === "BACKEND_SKILL_MISSING"
          ? "云端 AI 尚未载入该技能包（需把最新的 bazi-scf-api.zip 部署到腾讯云函数）；上面的盘与规则判断不受影响。"
          : "AI 详批暂不可用（" + e.message + "）；上面的盘与规则判断不受影响。";
        if (resp) resp.innerHTML = '<div class="card" style="color:var(--dim)">' + esc(msg) + "</div>";
        if (status) status.textContent = "已给出本地判断";
      } finally {
        if (btn) btn.disabled = false;
      }
    }
  };

  injectStyle();
  buildUi();
  selectMethod("xuankong");

  // 供自检/调试：磁偏角修正函数与地区表
  window.KANYU_DECL = { regions: REGION_DECL, shiftDeg: declShiftDeg, shiftMount: declShiftMount };
})();
