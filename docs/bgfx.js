// bgfx.js — 各模块专属动画背景（Canvas，单 rAF，可见时才跑）
// 用法：BgFx.mount(canvasEl, 'bazi'|'ziwei'|'liuren'|'liuyao'|'qimen'|'kanyu')
// 设计目标：贴合每个模块的内容语义，同时保持低开销、不抢正文可读性。
(function () {
  "use strict";
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var GAN = "甲乙丙丁戊己庚辛壬癸";
  var ZHI = "子丑寅卯辰巳午未申酉戌亥";
  var JIAZI = (function () { var o = []; for (var i = 0; i < 60; i++) o.push(GAN[i % 10] + ZHI[i % 12]); return o; })();
  var WX_COLORS = ["#5ec07a", "#e2704f", "#d9b45e", "#cfd6dd", "#6fa8dc"]; // 木火土金水
  var LIUYAO = ["乾", "坤", "震", "巽", "坎", "离", "艮", "兑"];
  var BAMEN = ["休", "生", "伤", "杜", "景", "死", "惊", "开"];
  var JIUXING = ["蓬", "任", "冲", "辅", "英", "芮", "柱", "心", "禽"];

  function rand(seed) { // 稳定伪随机，保证每次布局一致
    var s = seed;
    return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }
  function glyph(ctx, text, x, y, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = "700 " + size + "px 'Noto Serif SC','SimSun',serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function ring(ctx, cx, cy, r, n, color, width, offset) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    for (var i = 0; i < n; i++) {
      var a = (offset || 0) + i * Math.PI * 2 / n;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      ctx.stroke();
    }
    ctx.restore();
  }
  function taiji(ctx, cx, cy, r, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#12100d"; ctx.fill();
    ctx.strokeStyle = "rgba(200,164,92,.6)"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
    ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2);
    ctx.fillStyle = "rgba(226,214,190,.5)"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r / 2, r / 8, 0, Math.PI * 2); ctx.fillStyle = "#12100d"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, r / 2, r / 8, 0, Math.PI * 2); ctx.fillStyle = "rgba(226,214,190,.9)"; ctx.fill();
    ctx.restore();
  }

  // ---- 各模块主题：draw(ctx, w, h, t) ----
  var THEMES = {
    // 八字：天干地支漂浮 + 五行光点 + 太极缓转
    bazi: function (ctx, w, h, t, mem) {
      if (!mem.parts) {
        var r = rand(20260101);
        mem.parts = [];
        for (var i = 0; i < 26; i++) {
          mem.parts.push({ x: r(), y: r(), s: 18 + r() * 30, v: 0.008 + r() * 0.018, a: 0.05 + r() * 0.1, g: Math.floor(r() * 60), c: WX_COLORS[i % 5] });
        }
      }
      taiji(ctx, w * 0.82, h * 0.42, Math.min(w, h) * 0.20, t * 0.00012);
      mem.parts.forEach(function (p) {
        var y = (p.y - t * 0.000006 * p.v * 100) % 1;
        if (y < 0) y += 1;
        glyph(ctx, JIAZI[p.g], p.x * w, y * h, p.s, p.c, p.a);
      });
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "#c8a45c";
      ctx.font = "900 " + Math.min(w, h) * 0.30 + "px 'Noto Serif SC',serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("命", w * 0.16, h * 0.42);
      ctx.restore();
    },
    // 紫微斗数：星野 + 十二宫 + 北斗
    ziwei: function (ctx, w, h, t, mem) {
      if (!mem.stars) {
        var r = rand(31415926);
        mem.stars = [];
        for (var i = 0; i < 120; i++) mem.stars.push({ x: r(), y: r(), s: 0.6 + r() * 1.8, p: r() * Math.PI * 2, sp: 0.6 + r() * 1.6 });
        mem.ring = [];
        for (var k = 0; k < 12; k++) mem.ring.push(ZHI[((k + 2) % 12)]);
      }
      mem.stars.forEach(function (s) {
        var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.p));
        ctx.save();
        ctx.globalAlpha = 0.20 + 0.5 * tw;
        ctx.fillStyle = "#dfe8f0";
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.s, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      var cx = w * 0.5, cy = h * 0.52, R = Math.min(w, h) * 0.40;
      ring(ctx, cx, cy, R, 12, "rgba(200,164,92,.35)", 1, -Math.PI / 2);
      mem.ring.forEach(function (z, i) {
        var a = -Math.PI / 2 + i * Math.PI / 6;
        glyph(ctx, z, cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9, Math.min(w, h) * 0.035, "#c8a45c", 0.28);
      });
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "rgba(223,232,240,.6)"; ctx.lineWidth = 1.2;
      var bx = w * 0.34, by = h * 0.30, pts = [[0, 0], [0.06, -0.05], [0.12, 0.01], [0.16, -0.07], [0.22, -0.02], [0.27, -0.09], [0.33, -0.03]];
      ctx.beginPath();
      pts.forEach(function (p, i) {
        var px = bx + p[0] * w * 0.4, py = by + p[1] * h * 0.4;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        ctx.moveTo(px, py);
        ctx.arc(px, py, 2.1, 0, Math.PI * 2);
      });
      ctx.stroke();
      ctx.restore();
    },
    // 大六壬：天地盘双环反向缓转 + 月将指
    liuren: function (ctx, w, h, t, mem) {
      var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.42;
      var spin = t * 0.00004;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(200,164,92,.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ring(ctx, cx, cy, R, 12, "rgba(200,164,92,.30)", 1, -Math.PI / 2 + spin);
      ring(ctx, cx, cy, R * 0.72, 12, "rgba(200,164,92,.18)", 1, -Math.PI / 2 - spin * 1.6);
      for (var i = 0; i < 12; i++) {
        var a1 = -Math.PI / 2 + spin + i * Math.PI / 6;
        glyph(ctx, ZHI[i], cx + Math.cos(a1) * R * 0.87, cy + Math.sin(a1) * R * 0.87, Math.min(w, h) * 0.038, "#c8a45c", 0.34);
        var a2 = -Math.PI / 2 - spin * 1.6 + i * Math.PI / 6;
        glyph(ctx, ZHI[(i + 6) % 12], cx + Math.cos(a2) * R * 0.63, cy + Math.sin(a2) * R * 0.63, Math.min(w, h) * 0.030, "#9c8a63", 0.26);
      }
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2 + spin);
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "rgba(231,111,81,.8)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -R * 0.80); ctx.stroke();
      ctx.restore();
    },
    // 六爻：六条爻线漂浮 + 铜钱
    liuyao: function (ctx, w, h, t, mem) {
      if (!mem.g) {
        var r = rand(666);
        mem.g = [];
        for (var i = 0; i < 7; i++) mem.g.push({ x: r(), y: r(), s: 0.5 + r() * 0.9, p: r() * Math.PI * 2, v: 0.3 + r() * 0.7, move: Math.floor(r() * 6) });
      }
      mem.g.forEach(function (o) {
        var x = o.x * w + Math.sin(t * 0.0004 * o.v + o.p) * w * 0.05;
        var y = o.y * h + Math.cos(t * 0.0003 * o.v + o.p) * h * 0.04;
        var L = 44 * o.s, gap = 8 * o.s, lw = 4 * o.s;
        for (var i = 0; i < 6; i++) {
          var ly = y + (i - 2.5) * gap;
          var yang = ((i * 7 + o.move) % 3) !== 0;
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = i === o.move ? "rgba(231,111,81,.85)" : "rgba(200,164,92,.7)";
          ctx.lineWidth = i === o.move ? lw * 1.3 : lw;
          ctx.lineCap = "round";
          if (yang) {
            ctx.beginPath(); ctx.moveTo(x - L / 2, ly); ctx.lineTo(x + L / 2, ly); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(x - L / 2, ly); ctx.lineTo(x - L * 0.1, ly); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + L * 0.1, ly); ctx.lineTo(x + L / 2, ly); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 0.12; ctx.strokeStyle = "#c8a45c"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x + L * 0.9, y + L * 0.3, 9 * o.s, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + L * 0.9, y + L * 0.3, 3.5 * o.s, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });
    },
    // 奇门：九宫飞星网格 + 八门流转
    qimen: function (ctx, w, h, t, mem) {
      var size = Math.min(w, h) * 0.62, x0 = (w - size) / 2, y0 = (h - size) / 2, cell = size / 3;
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.strokeStyle = "rgba(200,164,92,.6)"; ctx.lineWidth = 1;
      for (var i = 0; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(x0 + i * cell, y0); ctx.lineTo(x0 + i * cell, y0 + size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, y0 + i * cell); ctx.lineTo(x0 + size, y0 + i * cell); ctx.stroke();
      }
      ctx.restore();
      var track = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
      var step = (t * 0.0016) % 9;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var gong = track[r][c];
        if (gong === 5) continue;
        var cx = x0 + (c + 0.5) * cell, cy = y0 + (r + 0.5) * cell;
        var active = Math.abs(((step + 9) % 9) - (gong - 1)) < 0.55;
        glyph(ctx, JIUXING[(gong - 1) % 9], cx, cy - cell * 0.14, cell * 0.24, active ? "#e8c078" : "#c8a45c", active ? 0.55 : 0.22);
        glyph(ctx, BAMEN[(gong - 1) % 8], cx, cy + cell * 0.20, cell * 0.20, active ? "#8fd0a0" : "#9c8a63", active ? 0.5 : 0.18);
      }
    },
    // 堪舆：二十四山环 + 八卦（与 SVG 罗盘呼应，用于首页卡片/模块横幅）
    kanyu: function (ctx, w, h, t, mem) {
      var SHAN = ["子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬"];
      var BG = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
      var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.42, spin = t * 0.00005;
      ctx.save(); ctx.globalAlpha = 0.20;
      ctx.strokeStyle = "rgba(200,164,92,.5)"; ctx.lineWidth = 1;
      [1, 0.78, 0.55, 0.34].forEach(function (k) { ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
      ring(ctx, cx, cy, R, 24, "rgba(200,164,92,.28)", 1, -Math.PI / 2 + spin);
      for (var i = 0; i < 24; i++) {
        var a = -Math.PI / 2 + spin + i * Math.PI / 12;
        glyph(ctx, SHAN[i], cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88, Math.min(w, h) * 0.026, "#c8a45c", 0.30);
      }
      for (var b = 0; b < 8; b++) {
        var ab = -Math.PI / 2 - spin * 1.4 + b * Math.PI / 4;
        glyph(ctx, BG[b], cx + Math.cos(ab) * R * 0.62, cy + Math.sin(ab) * R * 0.62, Math.min(w, h) * 0.038, "#d8c08a", 0.24);
      }
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = "rgba(231,111,81,.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R * 0.5); ctx.stroke();
      ctx.restore();
    }
  };

  function mount(canvas, themeName, opts) {
    if (!canvas) return null;
    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || DPR);
    var draw = THEMES[themeName] || THEMES.kanyu;
    var ctx = canvas.getContext("2d");
    var mem = {};
    var w = 0, h = 0, raf = null, visible = true, alive = true;
    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(t) {
      if (!alive) return;
      if (visible && !document.hidden) {
        ctx.clearRect(0, 0, w, h);
        draw(ctx, w, h, t, mem);
      }
      raf = requestAnimationFrame(frame);
    }
    var ro = null, io = null;
    resize();
    if ("ResizeObserver" in window) { ro = new ResizeObserver(resize); ro.observe(canvas); }
    if ("IntersectionObserver" in window) {
      visible = false;
      io = new IntersectionObserver(function (e) { visible = e[0] && e[0].isIntersecting; }, { threshold: 0.01 });
      io.observe(canvas);
    }
    raf = requestAnimationFrame(frame);
    return {
      stop: function () {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        if (ro && ro.disconnect) ro.disconnect();
        if (io && io.disconnect) io.disconnect();
      },
      resize: resize
    };
  }

  window.BgFx = { mount: mount, themes: Object.keys(THEMES) };
})();
