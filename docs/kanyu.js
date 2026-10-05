// kanyu.js - 堪舆专区：现场采集 + 多流派递进判断
// 你负责现场测量，这里负责：给什么信息 -> 出什么结论 -> 还缺什么 -> 下一步测什么
(function () {
  "use strict";

  var API = "https://1458464551-c6fqpk4dzk.ap-beijing.tencentscf.com";
  var STORE_KEY = "kanyu_state_v1";

  var MOUNTAINS = ["未测/不详","壬","子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥"];
  var EMPTY = "未测/不详";

  var METHODS = [
    { id: "tianxing", name: "天星风水", sub: "赖布衣天星派" },
    { id: "lvshi",    name: "吕氏风水", sub: "吕文艺体系" },
    { id: "xuankong", name: "玄空飞星", sub: "沈氏玄空学" },
    { id: "sanhe",    name: "古法三合", sub: "杨筠松体系" }
  ];

  var MEASURE = {
    tianxing: {
      title: "天星派测量要点（赖布衣）",
      lines: [
        "<b>三盘：</b>地盘正针定坐向、格龙；人盘中针消砂（拨砂）；天盘缝针可参纳水。",
        "<b>盘制先写明：</b>开禧度 / 时宪度 / 现代修正度，老盘必须换岁差，否则宿度全错。",
        "<b>坐向：</b>坐山 + 朝向 + 兼左兼右 + 分金；分金未定先不下断。",
        "<b>来龙：</b>记入首一节、过峡开帐；<b>砂：</b>记尖顶方位与形态（遮挡不算）；<b>水：</b>只论明水，记来水、去水。",
        "<b>现场先校：</b>水平、磁针自由、远离铁器电塔，记磁偏角。"
      ]
    },
    lvshi: {
      title: "吕氏测量要点（吕文艺）",
      lines: [
        "<b>不用飞星、不用分金。</b>先定原点：阳宅取床位/办公桌/收银台；阴宅取尸骨（骨灰）中心。",
        "<b>高为砂、低为水：</b>以原点地平面为基准，量各宫的<b>垂直高度差（米）</b>，不是看方位吉凶。",
        "<b>胎次定位：</b>男一四七看东方、二五八看北方、三六九看东北；女看对宫。同父异母/同母异父各按各家排。",
        "<b>对宫同砂同水 = 绝地</b>（东—西、南—北、东北—西南、东南—西北），一律先断凶。",
        "<b>凡是冲射，无论砂水一律凶；</b>门窗、水龙头、厕所、鱼缸算水；灶、神位、大树、电杆、高大家具算砂。"
      ]
    },
    xuankong: {
      title: "玄空测量要点（沈氏）",
      lines: [
        "<b>先定元运：</b>按建宅/入住/下葬年份定三元九运（2004-2023 八运，2024-2043 九运）。",
        "<b>坐向：</b>用<b>地盘正针</b>，最好给实测周天度数；正向取中 9 度内用下卦，兼 3 度以上要用替卦。",
        "<b>门向：</b>以人最多出入的门为向；同时记门、床、灶、厕的方位。",
        "<b>外部：</b>前后左右的楼、路、水、桥、树、尖角、反光，落到宫位。",
        "<b>现场先校：</b>水平、磁针自由、远离铁器电塔；读数宁慢勿快。"
      ]
    },
    sanhe: {
      title: "三合测量要点（杨筠松）",
      lines: [
        "<b>三盘三针：</b>地盘正针格龙/定坐山；人盘中针消砂；天盘缝针测来水与水口。",
        "<b>来龙三处：</b>来龙、入首、束气都要记字位（地盘正针）。",
        "<b>定局：</b>来龙、来水、去水三者占二才能定金/木/水/火局；水口用关/拦/顺三法。",
        "<b>立向分金：</b>记兼左兼右与周天坐度；48 正格用向上五行法，变格用坐度分金法。",
        "<b>阴宅：</b>补亡者生年（仙命）；<b>现场先校：</b>水平、磁针自由、远离铁器电塔、记磁偏角。"
      ]
    }
  };

  var REQUIRED = {
    tianxing: ["zuo", "xiang", "panzhi", "lailong", "sha", "laishui", "qushui"],
    lvshi:    ["lv_origin", "lv_tai", "lv_sex", "lv_shashui"],
    xuankong: ["zuo", "xiang", "year", "men"],
    sanhe:    ["zuo", "xiang", "lailong", "laishui", "qushui"]
  };

  var GROUPS = [
    {
      name: "① 基本与问题",
      fields: [
        { k: "type", label: "宅型", t: "select", o: ["阳宅", "阴宅"] },
        { k: "topic", label: "断事需求", t: "select", o: ["综合", "财运", "人丁", "事业官贵", "婚姻感情", "健康", "学业", "官非", "化煞调理", "择地立向"] },
        { k: "year", label: "建宅/入住/下葬年份", t: "number", ph: "如 2008" },
        { k: "nowyear", label: "当前流年", t: "number", ph: "默认今年" },
        { k: "question", label: "想问的问题", t: "textarea", full: true, ph: "例如：这坟对二房有什么影响？哪一年应事？怎么调？" }
      ]
    },
    {
      name: "② 坐向与分金",
      fields: [
        { k: "zuo", label: "坐山", t: "mount" },
        { k: "xiang", label: "朝向", t: "mount" },
        { k: "degree", label: "周天坐度(0-360)", t: "number", ph: "如 315" },
        { k: "jian", label: "兼向", t: "select", o: [EMPTY, "正向", "兼左", "兼右"] },
        { k: "panzhi", label: "盘制（天星必填）", t: "select", o: [EMPTY, "开禧度", "时宪度", "现代修正度"] },
        { k: "yun", label: "元运（玄空）", t: "select", o: ["按年份自动", "一运", "二运", "三运", "四运", "五运", "六运", "七运", "八运", "九运"] }
      ]
    },
    {
      name: "③ 来龙（天星/三合）",
      fields: [
        { k: "lailong", label: "来龙", t: "mount" },
        { k: "rushou", label: "入首", t: "mount" },
        { k: "shuqi", label: "束气", t: "mount" },
        { k: "guoxia", label: "过峡、开帐、左右旋情况", t: "textarea", full: true, ph: "例如：过峡束气细嫩，开帐三层，左旋入首" }
      ]
    },
    {
      name: "④ 来水 / 去水（天星/三合）",
      fields: [
        { k: "laishui", label: "来水方位", t: "mount" },
        { k: "qushui", label: "去水 / 水口方位", t: "mount" },
        { k: "shuixing", label: "水形", t: "select", o: [EMPTY, "弯环抱穴", "直去", "反弓", "聚水/水库", "割脚", "穿心", "无水可见"] },
        { k: "shuiliang", label: "水量 / 宽窄 / 远近", t: "text", ph: "如：来水宽约20米，去水紧凑关锁" }
      ]
    },
    {
      name: "⑤ 砂（天星/三合）",
      fields: [
        { k: "sha", label: "各方砂位与形态（人盘中针测尖顶）", t: "textarea", full: true, ph: "例如：甲方高峰尖秀、酉方破碎逼压、坤方有塔、艮方有树" },
        { k: "basha", label: "八煞方 / 劫煞方景象", t: "text", ph: "例如：辰方有尖射、午方高压逼身" }
      ]
    },
    {
      name: "⑥ 形势（龙虎朝案明堂水口）",
      fields: [
        { k: "xingshi", label: "龙虎、朝案、明堂、水口、罗城、乐山鬼星", t: "textarea", full: true, ph: "例如：青龙贴身有情，白虎反背，明堂开阔，水口关锁有罗星" }
      ]
    },
    {
      name: "⑦ 阳宅内六事 / 外六事",
      fields: [
        { k: "men", label: "大门方位", t: "mount" },
        { k: "chuang", label: "主卧床方位", t: "mount" },
        { k: "zao", label: "灶位", t: "mount" },
        { k: "ce", label: "厕位", t: "mount" },
        { k: "waishi", label: "外六事（楼、路、水、桥、树、尖角、反光）", t: "textarea", full: true, ph: "例如：坤方有变压器、乾方有反光玻璃幕墙、震方直路冲" }
      ]
    },
    {
      name: "⑧ 吕氏专用（原点定位）",
      fields: [
        { k: "lv_origin", label: "原点", t: "select", o: [EMPTY, "床位", "办公桌", "收银台", "尸骨/骨灰中心"] },
        { k: "lv_tai", label: "出生胎次", t: "number", ph: "1-9" },
        { k: "lv_sex", label: "胎次性别", t: "select", o: ["男", "女"] },
        { k: "lv_shashui", label: "各宫砂水与高度差（米）", t: "textarea", full: true, ph: "例如：东方砂高5米；西方水低3米；北方同砂；南方水低2米" }
      ]
    },
    {
      name: "⑨ 人丁、仙命与应期",
      fields: [
        { k: "fangshu", label: "几房人", t: "text", ph: "如 3房" },
        { k: "yearming", label: "各房年命", t: "text", ph: "如 长房1980庚申、二房1985乙丑" },
        { k: "xianming", label: "亡者生年（仙命，阴宅）", t: "text", ph: "如 1940庚辰" },
        { k: "events", label: "已发生的事（用于反推校验）", t: "textarea", full: true, ph: "例如：2018年二房破财、2021年长房添丁、2023年长房手术" }
      ]
    }
  ];

  var ALL_FIELDS = [];
  GROUPS.forEach(function (g) { g.fields.forEach(function (f) { ALL_FIELDS.push(f); }); });

  var state = { method: "xuankong" };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function fieldHtml(field) {
    var id = "ky_" + field.k;
    var cls = "ky-field" + (field.full ? " ky-full" : "");
    var inner = "";
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
    var methodButtons = METHODS.map(function (m) {
      return '<button type="button" class="ky-method" data-method="' + m.id + '">' +
        esc(m.name) + '<span>' + esc(m.sub) + "</span></button>";
    }).join("");

    var groupsHtml = GROUPS.map(function (g) {
      return '<section class="ky-group"><h4>' + esc(g.name) + "</h4><div class=\"ky-grid\">" +
        g.fields.map(fieldHtml).join("") + "</div></section>";
    }).join("");

    var el = document.getElementById("tab-kanyu");
    if (!el) return;
    el.innerHTML =
      '<div class="card ky-hero"><h3>🧭 堪舆 · 风水现场研判</h3>' +
      '<p>你负责现场测量，我负责按不同流派做递进判断：先看已给信息能定什么，再告诉你还缺什么、下一步回现场测什么，数据齐了才落最终预测。</p>' +
      '<div class="ky-methods">' + methodButtons + "</div>" +
      '<div class="ky-measure" id="ky-measure"></div></div>' +
      '<div class="card"><div class="ky-progress"><span id="ky-progress-text"></span><span id="ky-progress-list"></span></div>' +
      groupsHtml +
      '<div class="ky-actions"><button type="button" class="btn-go" id="ky-run">✨ 开始分析</button>' +
      '<button type="button" class="ky-ghost" id="ky-clear">清空</button>' +
      '<span class="ky-status" id="ky-status"></span></div></div>' +
      '<div id="ky-result"></div>';

    METHODS.forEach(function (m) {
      var btn = el.querySelector('.ky-method[data-method="' + m.id + '"]');
      btn.addEventListener("click", function () { selectMethod(m.id); });
    });
    document.getElementById("ky-run").addEventListener("click", analyze);
    document.getElementById("ky-clear").addEventListener("click", clearAll);
    ALL_FIELDS.forEach(function (f) {
      var input = document.getElementById("ky_" + f.k);
      if (input) {
        input.addEventListener("input", function () { saveLocal(); refreshProgress(); });
        input.addEventListener("change", function () { saveLocal(); refreshProgress(); });
      }
    });
  }

  function selectMethod(id) {
    state.method = id;
    document.querySelectorAll("#tab-kanyu .ky-method").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-method") === id);
    });
    renderMeasure();
    refreshProgress();
    saveLocal();
  }

  function renderMeasure() {
    var m = MEASURE[state.method];
    document.getElementById("ky-measure").innerHTML =
      "<h4>" + esc(m.title) + "</h4><ul>" + m.lines.map(function (line) {
        return "<li>" + line + "</li>";
      }).join("") + "</ul>";
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
    var required = REQUIRED[state.method] || [];
    var done = required.filter(isFilled).length;
    var text = document.getElementById("ky-progress-text");
    var list = document.getElementById("ky-progress-list");
    if (text) text.textContent = "本派关键项：" + done + " / " + required.length + " 已填";
    if (list) {
      list.innerHTML = required.map(function (key) {
        var field = ALL_FIELDS.filter(function (f) { return f.k === key; })[0] || { label: key };
        var ok = isFilled(key);
        return '<span class="ky-chip ' + (ok ? "ok" : "") + '">' + (ok ? "✓ " : "○ ") + esc(field.label) + "</span>";
      }).join("");
    }
    ALL_FIELDS.forEach(function (f) {
      var badge = document.querySelector('#tab-kanyu .ky-req[data-req="' + f.k + '"]');
      if (badge) {
        var need = required.indexOf(f.k) >= 0;
        badge.textContent = need ? (isFilled(f.k) ? " 必填 ✓" : " 必填") : "";
        badge.className = "ky-req" + (need ? " needed" : "");
      }
    });
  }

  function collect() {
    var out = {};
    ALL_FIELDS.forEach(function (f) {
      var v = value(f.k);
      if (v) out[f.k] = v;
    });
    var required = REQUIRED[state.method] || [];
    out._method = state.method;
    out._missing = required.filter(function (k) { return !isFilled(k); }).map(function (k) {
      var field = ALL_FIELDS.filter(function (f) { return f.k === k; })[0];
      return field ? field.label : k;
    });
    return out;
  }

  function saveLocal() {
    try {
      var store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      store[state.method] = collect();
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function loadLocal() {
    var saved = null;
    try {
      var store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      saved = store[state.method] || null;
    } catch (e) {}
    ALL_FIELDS.forEach(function (f) {
      var input = document.getElementById("ky_" + f.k);
      if (!input || !saved || saved[f.k] == null) return;
      input.value = saved[f.k];
    });
  }

  function clearAll() {
    ALL_FIELDS.forEach(function (f) {
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
    var question = data.question || "请按该体系做完整解析";

    status.textContent = "⏳ 正在按" + METHODS.filter(function (m) { return m.id === state.method; })[0].name + "研判…";
    btn.disabled = true;
    result.innerHTML = "";

    fetch(API + "/api/v1/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: state.method, chart: data, question: question })
    }).then(function (resp) {
      return resp.json().then(function (body) { return { ok: resp.ok, body: body }; });
    }).then(function (out) {
      if (!out.ok) throw new Error(out.body.error || "HTTP_ERROR");
      renderResult(data, out.body);
      status.textContent = "✅ 分析完成";
    }).catch(function (err) {
      status.textContent = "❌ 生成失败";
      result.innerHTML = '<div class="card ky-error">接口错误：' + esc(err.message) + "</div>";
    }).finally(function () {
      btn.disabled = false;
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function filledSummary(data) {
    return ALL_FIELDS.filter(function (f) { return data[f.k]; }).map(function (f) {
      return "<div><b>" + esc(f.label) + "：</b>" + esc(data[f.k]) + "</div>";
    }).join("");
  }

  function renderResult(data, body) {
    var missing = data._missing || [];
    var missingHtml = missing.length
      ? '<div class="ky-missing"><b>本派还缺这些关键项（回现场补测后再点分析）：</b><ul>' +
        missing.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div>"
      : '<div class="ky-ok">本派关键项已齐，可直接看下面的正式判断。</div>';

    document.getElementById("ky-result").innerHTML =
      '<div class="card ky-sub"><h3>📋 本次已填信息</h3>' + (filledSummary(data) || "（未填）") + missingHtml + "</div>" +
      '<div class="card" style="border-color:var(--gold)"><h3>📜 堪舆研判（' +
        esc(METHODS.filter(function (m) { return m.id === state.method; })[0].name) + "）</h3>" +
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
      "#tab-kanyu .ky-sub div{font-size:.85em;line-height:1.9;color:var(--text)}",
      "#tab-kanyu .ky-missing{margin-top:10px;padding:10px;border-radius:6px;background:rgba(192,57,43,.12);font-size:.84em}",
      "#tab-kanyu .ky-missing ul{margin:6px 0 0;padding-left:18px}",
      "#tab-kanyu .ky-ok{margin-top:10px;color:var(--goldL);font-size:.84em}",
      "#tab-kanyu .ky-answer{white-space:pre-wrap;line-height:2;font-size:.88em}",
      "#tab-kanyu .ky-error{color:var(--redL)}"
    ].join("");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  injectStyle();
  buildUi();
  selectMethod("xuankong");
  loadLocal();
  refreshProgress();
})();
