// luopan.js — 堪舆 · 罗盘绘制与动效
// 纯前端 SVG 罗盘：天池 / 先天八卦 / 九星 / 六十甲子 / 地盘正针 / 人盘中针 / 天盘缝针 / 二十八宿
// 对外：window.Luopan = { create(container, opts), scene }
// 说明：只负责"把盘画出来并让它动"，吉凶判断由别的模块做。
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // 二十四山：地平顺时针序，子山在正上（0°），每山 15°
  var SHAN = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳","丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥","壬"];
  // 十二地支在二十四山里的下标（用于加粗提示）
  var ZHI = { 子:0, 丑:2, 寅:4, 卯:6, 辰:8, 巳:10, 午:12, 未:14, 申:16, 酉:18, 戌:20, 亥:22 };
  var BAGUA_XT = ["乾","兑","离","震","巽","坎","艮","坤"];             // 先天八卦
  var BAGUA_HT = ["坎","坤","震","巽","中","乾","兑","艮","离"];       // 后天九宫
  var XIU28 = ["角","亢","氐","房","心","尾","箕","斗","牛","女","虚","危","室","壁","奎","娄","胃","昴","毕","觜","参","井","鬼","柳","星","张","翼","轸"];
  var XIU_WX = ["木","金","土","日","月","火","水","木","金","土","日","月","火","水","木","金","土","日","月","火","水","木","金","土","日","月","火","水"];
  var JIAZI = [];
  (function () {
    var G = "甲乙丙丁戊己庚辛壬癸", Z = "子丑寅卯辰巳午未申酉戌亥";
    for (var i = 0; i < 60; i++) JIAZI.push(G[i % 10] + Z[i % 12]);
  })();

  // ---- 小工具 ----
  function pt(cx, cy, r, deg) {
    var t = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  }
  function n(v) { return Math.round(v * 100) / 100; }
  function numOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    var x = parseFloat(v);
    return isNaN(x) ? null : x;
  }
  function norm360(v) { return ((v % 360) + 360) % 360; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 把一圈文字排成罗盘圈
  function ringText(cx, cy, rIn, rOut, items, opts) {
    opts = opts || {};
    var r = (rIn + rOut) / 2;
    var fill = opts.fill || "#c8a45c";
    var size = opts.size || 20;
    var weight = opts.weight || 400;
    var rotate = opts.rotate || 0;         // 整圈旋转（缝隙针用）
    var start = opts.start || 0;           // 起始角
    var span = opts.span || 360;
    var out = "";
    items.forEach(function (it, i) {
      var label = typeof it === "object" ? it.t : it;
      var cls = typeof it === "object" && it.cls ? " " + it.cls : "";
      var a = start + rotate + (items.length ? i * span / items.length : 0);
      var p = pt(cx, cy, r, a);
      out += '<text x="' + n(p[0]) + '" y="' + n(p[1]) + '" font-size="' + size +
        '" font-weight="' + weight + '" fill="' + fill + '" text-anchor="middle" ' +
        'dominant-baseline="central" class="lp-txt' + cls + '" transform="rotate(' + n(a) + ' ' + n(p[0]) + ' ' + n(p[1]) + ')">' +
        esc(label) + "</text>";
    });
    return out;
  }

  // 一圈分隔线
  function ringTicks(cx, cy, rIn, rOut, count, opts) {
    opts = opts || {};
    var rotate = opts.rotate || 0;
    var color = opts.color || "rgba(200,164,92,.35)";
    var w = opts.w || 1;
    var out = "";
    for (var i = 0; i < count; i++) {
      var a = rotate + i * 360 / count;
      var p1 = pt(cx, cy, rIn, a), p2 = pt(cx, cy, rOut === undefined ? rIn + 6 : rOut, a);
      out += '<line x1="' + n(p1[0]) + '" y1="' + n(p1[1]) + '" x2="' + n(p2[0]) + '" y2="' + n(p2[1]) +
        '" stroke="' + color + '" stroke-width="' + w + '"/>';
    }
    return out;
  }

  function circle(cx, cy, r, stroke, w, fill) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fill || "none") +
      '" stroke="' + stroke + '" stroke-width="' + w + '"/>';
  }

  // 扇形高亮（山位）
  function wedge(cx, cy, rIn, rOut, centerDeg, spanDeg, fill, opacity) {
    var a0 = centerDeg - spanDeg / 2, a1 = centerDeg + spanDeg / 2;
    var p0 = pt(cx, cy, rIn, a0), p1 = pt(cx, cy, rOut, a0);
    var p2 = pt(cx, cy, rOut, a1), p3 = pt(cx, cy, rIn, a1);
    var large = spanDeg > 180 ? 1 : 0;
    var d = "M" + n(p0[0]) + " " + n(p0[1]) + " L" + n(p1[0]) + " " + n(p1[1]) +
      " A" + rOut + " " + rOut + " 0 " + large + " 1 " + n(p2[0]) + " " + n(p2[1]) +
      " L" + n(p3[0]) + " " + n(p3[1]) +
      " A" + rIn + " " + rIn + " 0 " + large + " 0 " + n(p0[0]) + " " + n(p0[1]) + " Z";
    return '<path d="' + d + '" fill="' + fill + '" opacity="' + opacity + '"/>';
  }

  function shanIndex(name) {
    if (!name) return -1;
    var i = SHAN.indexOf(name);
    if (i >= 0) return i;
    return -1;
  }
  function shanCenter(name) {
    var i = shanIndex(name);
    return i < 0 ? null : i * 15;
  }

  // ---- 主绘制 ----
  function buildSvg(opts) {
    opts = opts || {};
    var S = opts.size || 1000;
    var cx = S / 2, cy = S / 2;
    var R = S * 0.47;
    var gold = "#c8a45c", goldL = "#e0c878", dim = "#8a7a5e";
    var s = [];
    s.push('<defs>');
    s.push('<radialGradient id="lpGlow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="rgba(200,164,92,.22)"/>' +
      '<stop offset="62%" stop-color="rgba(200,164,92,.06)"/>' +
      '<stop offset="100%" stop-color="rgba(200,164,92,0)"/></radialGradient>');
    s.push('<linearGradient id="lpNeedle" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0%" stop-color="#7d1f14"/><stop offset="50%" stop-color="#e8c078"/>' +
      '<stop offset="100%" stop-color="#b33226"/></linearGradient>');
    s.push('</defs>');

    // 底光
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R * 1.04 + '" fill="url(#lpGlow)"/>');

    // 同心圆
    var radii = [R, R * 0.94, R * 0.88, R * 0.82, R * 0.74, R * 0.64, R * 0.56, R * 0.48, R * 0.30, R * 0.12];
    radii.forEach(function (r, i) {
      s.push(circle(cx, cy, r, i === 0 ? gold : "rgba(200,164,92," + (i < 5 ? 0.5 : 0.35) + ")", i === 0 ? 2.4 : 1));
    });

    // 1. 二十八宿（最外）
    s.push('<g data-ring="xiu">');
    s.push(ringTicks(cx, cy, R * 0.94, R, 28, { color: "rgba(200,164,92,.28)" }));
    s.push(ringText(cx, cy, R * 0.94, R, XIU28.map(function (x, i) {
      return { t: x, cls: "lp-xiu" + (XIU_WX[i] === "吉" ? "" : "") };
    }), { size: 19, fill: "#9c8a63", start: 187.2 / 360 * 360 - 7.5 }));
    s.push('</g>');

    // 2. 天盘缝针（+7.5°）
    s.push('<g data-ring="tianpan">');
    s.push(ringText(cx, cy, R * 0.88, R * 0.94, SHAN, { size: 22, fill: "#8fbf9a", rotate: 7.5, weight: 700 }));
    s.push('</g>');

    // 3. 人盘中针（-7.5°）
    s.push('<g data-ring="renpan">');
    s.push(ringText(cx, cy, R * 0.82, R * 0.88, SHAN, { size: 22, fill: "#b99f74", rotate: -7.5, weight: 700 }));
    s.push('</g>');

    // 4. 地盘正针（主盘）
    s.push('<g data-ring="dipan">');
    s.push(ringTicks(cx, cy, R * 0.74, R * 0.82, 24, { color: "rgba(200,164,92,.4)" }));
    s.push('<g data-hl="zuo"></g><g data-hl="xiang"></g>');
    s.push(ringText(cx, cy, R * 0.74, R * 0.82, SHAN.map(function (x) {
      var isZhi = Object.prototype.hasOwnProperty.call(ZHI, x);
      return { t: x, cls: isZhi ? "lp-zhi" : "" };
    }), { size: 34, fill: goldL, weight: 900 }));
    s.push('</g>');

    // 5. 六十甲子
    s.push('<g data-ring="jiazi">');
    s.push(ringTicks(cx, cy, R * 0.64, R * 0.74, 60, { color: "rgba(200,164,92,.18)", w: 1 }));
    s.push(ringText(cx, cy, R * 0.64, R * 0.74, JIAZI, { size: 15, fill: "#7d6f53" }));
    s.push('</g>');

    // 6. 后天九宫 / 八宫
    s.push('<g data-ring="jiugong">');
    s.push(ringText(cx, cy, R * 0.56, R * 0.64, BAGUA_HT.map(function (b, i) {
      return { t: b === "中" ? "中" : b, cls: "" };
    }), { size: 26, fill: "#a8926a", weight: 600 }));
    s.push('</g>');

    // 7. 先天八卦
    s.push('<g data-ring="bagua">');
    s.push(ringText(cx, cy, R * 0.48, R * 0.56, BAGUA_XT, { size: 30, fill: "#d8c08a", weight: 900 }));
    s.push('</g>');

    // 8. 天池
    s.push('<g data-ring="tianchi">');
    s.push(circle(cx, cy, R * 0.30, gold, 1.6, "rgba(20,15,10,.85)"));
    s.push(circle(cx, cy, R * 0.30 - 6, "rgba(200,164,92,.25)", 1));
    // 十字准线
    s.push('<line x1="' + cx + '" y1="' + (cy - R * 0.30) + '" x2="' + cx + '" y2="' + (cy + R * 0.30) + '" stroke="rgba(200,164,92,.18)" stroke-width="1"/>');
    s.push('<line x1="' + (cx - R * 0.30) + '" y1="' + cy + '" x2="' + (cx + R * 0.30) + '" y2="' + cy + '" stroke="rgba(200,164,92,.18)" stroke-width="1"/>');
    // 子午卯酉四正
    [["午", 180], ["子", 0], ["卯", 90], ["酉", 270]].forEach(function (q) {
      var p = pt(cx, cy, R * 0.24, q[1]);
      s.push('<text x="' + n(p[0]) + '" y="' + n(p[1]) + '" font-size="22" fill="#9c8a63" text-anchor="middle" dominant-baseline="central" transform="rotate(' + q[1] + ' ' + n(p[0]) + ' ' + n(p[1]) + ')">' + q[0] + "</text>");
    });
    s.push('</g>');

    // 磁针（可旋转）
    s.push('<g data-needle transform="rotate(0 ' + cx + ' ' + cy + ')">');
    s.push('<polygon points="' + n(cx) + ',' + n(cy - R * 0.30) + ' ' + n(cx - 13) + ',' + n(cy) + ' ' + n(cx + 13) + ',' + n(cy) + '" fill="url(#lpNeedle)"/>');
    s.push('<polygon points="' + n(cx) + ',' + n(cy + R * 0.30) + ' ' + n(cx - 13) + ',' + n(cy) + ' ' + n(cx + 13) + ',' + n(cy) + '" fill="#cfc4b0" opacity=".8"/>');
    s.push('</g>');
    s.push(circle(cx, cy, R * 0.035, goldL, 2, "#1a1410"));

    // 座向指示（从坐山到向山的直径）
    s.push('<g data-axis-opacity="1"><line data-axis="1" x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + cy + '" stroke="rgba(231,111,81,.9)" stroke-width="3" stroke-linecap="round"/></g>');

    return '<svg viewBox="0 0 ' + S + ' ' + S + '" xmlns="' + NS + '" class="lp-svg" preserveAspectRatio="xMidYMid meet">' + s.join("") + "</svg>";
  }

  function create(container, opts) {
    opts = opts || {};
    if (!container) return null;
    container.innerHTML = buildSvg(opts);
    var svg = container.querySelector("svg");
    var needle = svg.querySelector("[data-needle]");
    var axis = svg.querySelector('[data-axis="1"]');
    var hlZuo = svg.querySelector('[data-hl="zuo"]');
    var hlXiang = svg.querySelector('[data-hl="xiang"]');
    var xiuGroup = svg.querySelector('[data-ring="xiu"]');
    var S = opts.size || 1000, cx = S / 2, cy = S / 2, R = S * 0.47;
    // zuo/xiang 为山名；zuoDegree/xiangDegree 为真实周天度数（0=北，顺时针）。
    // 24 山名只用来定“落在哪一山”，指针/轴线/高亮一律用真实度数，避免兼向被吸附到山正中。
    var state = { zuo: null, xiang: null, zuoDegree: null, xiangDegree: null, spin: 0 };
    if (xiuGroup) {
      // 用 CSS transform 走合成层，避免每帧改 SVG 属性导致整组重绘
      xiuGroup.style.transformBox = "view-box";
      xiuGroup.style.transformOrigin = "50% 50%";
      xiuGroup.style.willChange = "transform";
    }

    var api = {
      svg: svg,
      // 设置坐向：zuo/xiang 为二十四山名；zuoDegree/xiangDegree 为周天度数（0=北，顺时针）。
      // 兼容旧接口：degree 视作“向首周天度数”。
      setOrientation: function (o) {
        o = o || {};
        if (o.zuo !== undefined) state.zuo = o.zuo;
        if (o.xiang !== undefined) state.xiang = o.xiang;
        if (o.zuoDegree !== undefined) state.zuoDegree = numOrNull(o.zuoDegree);
        if (o.xiangDegree !== undefined) state.xiangDegree = numOrNull(o.xiangDegree);
        // 兼容旧接口：degree = 向首周天度数
        if (o.degree !== undefined) {
          var d = numOrNull(o.degree);
          if (d != null) state.xiangDegree = norm360(d);
        }
        var zi = shanIndex(state.zuo), xi = shanIndex(state.xiang);
        var zDeg = state.zuoDegree != null ? state.zuoDegree : (zi >= 0 ? zi * 15 : null);
        var xDeg = state.xiangDegree != null ? state.xiangDegree : (xi >= 0 ? xi * 15 : null);
        // 坐山名与坐度不一致时（例：选了癸山但坐度给 200），以坐度反推坐山所在山，保证盘不打架
        if (zDeg != null) zDeg = norm360(zDeg);
        if (xDeg != null) xDeg = norm360(xDeg);
        if (needle && xDeg != null) needle.setAttribute("transform", "rotate(" + n(xDeg) + " " + cx + " " + cy + ")");
        if (axis && zDeg != null && xDeg != null) {
          var p1 = pt(cx, cy, R * 0.70, zDeg), p2 = pt(cx, cy, R * 0.70, xDeg);
          axis.setAttribute("x1", n(p1[0])); axis.setAttribute("y1", n(p1[1]));
          axis.setAttribute("x2", n(p2[0])); axis.setAttribute("y2", n(p2[1]));
        }
        if (hlZuo) hlZuo.innerHTML = (zDeg != null) ? wedge(cx, cy, R * 0.74, R * 0.82, zDeg, 15, "rgba(231,111,81,.30)", 1) : "";
        if (hlXiang) hlXiang.innerHTML = (xDeg != null) ? wedge(cx, cy, R * 0.74, R * 0.82, xDeg, 15, "rgba(90,158,90,.30)", 1) : "";
        return api;
      },
      // 背景慢转：amount 为角度
      setSpin: function (deg) {
        state.spin = deg || 0;
        if (xiuGroup) xiuGroup.style.transform = "rotate(" + n(state.spin) + "deg)";
        return api;
      },
      highlight: function (names) {
        var list = [].concat(names || []);
        svg.querySelectorAll(".lp-hit").forEach(function (e) { e.classList.remove("lp-hit"); });
        list.forEach(function (nm) {
          var i = shanIndex(nm);
          if (i < 0) return;
        });
        return api;
      }
    };
    return api;
  }

  // 背景罗盘：缓慢自转 + 座向跟随
  function background(container, opts) {
    var api = create(container, opts || {});
    if (!api) return null;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return api;
    var svg = container.querySelector("svg");
    var visible = true;
    // 只在可见时跑 rAF，切走/滚出就停，避免无谓耗电与掉帧
    if ("IntersectionObserver" in window) {
      visible = false;
      new IntersectionObserver(function (entries) {
        visible = entries[0] && entries[0].isIntersecting;
      }, { threshold: 0.01 }).observe(container);
    }
    var t0 = performance.now();
    (function loop(t) {
      if (!svg || !svg.isConnected) return;
      if (visible && !document.hidden) api.setSpin(((t - t0) / 1000 * 1.6) % 360);
      requestAnimationFrame(loop);
    })(t0);
    return api;
  }

  window.Luopan = { create: create, background: background, SHAN: SHAN, shanCenter: shanCenter, shanIndex: shanIndex, pt: pt };
})();
