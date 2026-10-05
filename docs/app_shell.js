// app_shell.js — 模块分页外壳：首页入口 + 每个模块独立界面 + 专属动画背景
// 仍是一份 index.html（GitHub Pages 单文件部署），但每个模块是"独立一页"的体验：
//   首页(#home) → 点模块卡片 → #bazi/#ziwei/... 只显示该模块，并挂上专属 Canvas 背景。
(function () {
  "use strict";
  var MODULES = [
    { id: "bazi",   name: "八字",     sub: "盲派命局 · 四柱十神", icon: "🏮", theme: "bazi" },
    { id: "ziwei",  name: "紫微斗数", sub: "十二宫 · 星曜四化", icon: "⭐", theme: "ziwei" },
    { id: "liuren", name: "大六壬",   sub: "三传四课 · 天地盘", icon: "🔮", theme: "liuren" },
    { id: "liuyao", name: "六爻",     sub: "纳甲装卦 · 动爻",   icon: "🪙", theme: "liuyao" },
    { id: "qimen",  name: "奇门",     sub: "鸣法飞盘 · 九宫",   icon: "🗡️", theme: "qimen" },
    { id: "kanyu",  name: "堪舆",     sub: "罗盘定向 · 择日",   icon: "🧭", theme: "kanyu" }
  ];
  var byId = {};
  MODULES.forEach(function (m) { byId[m.id] = m; });
  var origSwitch = null;
  var activeFx = null;
  var homeFx = [];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // 注意：站点自己定义了全局 scrollTo(id)（滚动到结果区），会覆盖原生 window.scrollTo，
  // 所以这里只用元素级 scrollTo，避免误调到站点的那个函数。
  function toTop() {
    try {
      document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }

  function injectStyle() {
    if (document.getElementById("app-shell-style")) return;
    var css = [
      "body.app-home-mode .tabs{display:none}",
      "body.app-module-mode .header{display:none}",
      "body.app-module-mode .tabs{display:none}",
      ".app-bar{display:none;position:sticky;top:0;z-index:200;margin:0 0 14px;padding:10px 12px;background:rgba(20,16,12,.86);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}",
      "body.app-module-mode .app-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
      ".app-bar .ab-brand{font-family:'Noto Serif SC',serif;font-weight:900;color:var(--goldL);letter-spacing:.1em;cursor:pointer;background:none;border:none;font-size:1em}",
      ".app-bar .ab-brand:hover{color:#f2dfae}",
      ".app-bar .ab-nav{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}",
      ".app-bar .ab-chip{padding:5px 11px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--dim);cursor:pointer;font-family:inherit;font-size:.8em}",
      "a.ab-chip{display:inline-block;text-decoration:none}",
      ".app-bar .ab-chip:hover{border-color:var(--gold);color:var(--goldL)}",
      ".app-bar .ab-chip.active{border-color:var(--gold);background:rgba(200,164,92,.16);color:var(--goldL)}",
      ".app-home{display:none;max-width:980px;margin:0 auto}",
      "body.app-home-mode .app-home{display:block}",
      ".app-home-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:6px}",
      ".app-card{position:relative;overflow:hidden;min-height:190px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(160deg,#0d1219 0%,#181310 100%);cursor:pointer;text-align:left;padding:0;color:var(--text);font-family:inherit;transition:transform .22s cubic-bezier(.4,0,.2,1),border-color .22s,box-shadow .22s}",
      "a.app-card{display:block;text-decoration:none}",
      ".app-card:hover{transform:translateY(-3px);border-color:var(--gold);box-shadow:0 10px 30px rgba(0,0,0,.35)}",
      ".app-card canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.5}",
      ".app-card .ac-body{position:relative;z-index:2;padding:18px 16px;display:flex;flex-direction:column;height:100%;justify-content:flex-end}",
      ".app-card .ac-icon{font-size:1.5em;position:absolute;top:14px;left:16px}",
      ".app-card .ac-name{font-family:'Noto Serif SC',serif;font-size:1.35em;font-weight:900;color:#f0d9a0;letter-spacing:.08em}",
      ".app-card .ac-sub{color:var(--dim);font-size:.82em;margin-top:4px}",
      ".app-card .ac-go{margin-top:10px;font-size:.78em;color:var(--goldL);letter-spacing:.08em}",
      ".mod-bg{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity .5s ease}",
      ".mod-bg.on{opacity:.55}",
      ".mod-bg canvas{width:100%;height:100%;display:block}",
      ".mod-bg .mb-veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(10,8,6,.10),rgba(10,8,6,.55) 60%,rgba(10,8,6,.82)),linear-gradient(180deg,rgba(10,8,6,.30),rgba(10,8,6,.62))}",
      ".mod-hero{position:relative;overflow:hidden;height:120px;margin-bottom:16px;border:1px solid var(--borderL);border-radius:12px;background:linear-gradient(150deg,rgba(11,16,22,.55),rgba(22,17,14,.30))}",
      ".mod-hero canvas{position:absolute;inset:0;width:100%;height:100%}",
      ".mod-hero .mh-text{position:absolute;left:20px;bottom:16px;z-index:2}",
      ".mod-hero .mh-text h2{margin:0;font-family:'Noto Serif SC',serif;font-size:1.5em;color:#f0d9a0;letter-spacing:.14em}",
      ".mod-hero .mh-text p{margin:4px 0 0;color:#a99b86;font-size:.82em;letter-spacing:.06em}",
      "@media(max-width:820px){.app-home-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}",
      "@media(max-width:640px){.mod-hero{height:140px}.app-card{min-height:150px}.app-card .ac-name{font-size:1.1em}.app-card .ac-sub{font-size:.74em}}"
    ].join("\n");
    var st = el("style", null, css);
    st.id = "app-shell-style";
    document.head.appendChild(st);
  }

  function buildHome() {
    if (document.getElementById("app-home")) return document.getElementById("app-home");
    var wrap = el("div", "app-home");
    wrap.id = "app-home";
    var grid = el("div", "app-home-grid");
    MODULES.forEach(function (m) {
      // 用真链接：即使脚本事件没绑上，点一下也会改 hash 触发路由，不会"没反应"
      var card = el("a", "app-card");
      card.setAttribute("href", "#" + m.id);
      card.setAttribute("data-module", m.id);
      card.innerHTML = '<canvas data-theme="' + m.theme + '"></canvas>' +
        '<span class="ac-icon">' + m.icon + "</span>" +
        '<span class="ac-body"><span class="ac-name">' + m.name + "</span>" +
        '<span class="ac-sub">' + m.sub + "</span>" +
        '<span class="ac-go">进入 →</span></span>';
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    var container = document.querySelector(".container");
    var tabs = document.querySelector(".tabs");
    if (container && tabs) container.insertBefore(wrap, tabs);
    return wrap;
  }

  function buildBar() {
    if (document.getElementById("app-bar")) return document.getElementById("app-bar");
    var bar = el("div", "app-bar");
    bar.id = "app-bar";
    var brand = el("a", "ab-brand", "山渊策");
    brand.setAttribute("href", "#home");
    bar.appendChild(brand);
    var nav = el("div", "ab-nav");
    MODULES.forEach(function (m) {
      var chip = el("a", "ab-chip", m.icon + " " + m.name);
      chip.setAttribute("href", "#" + m.id);
      chip.setAttribute("data-module", m.id);
      nav.appendChild(chip);
    });
    bar.appendChild(nav);
    var container = document.querySelector(".container");
    var tabs = document.querySelector(".tabs");
    if (container && tabs) container.insertBefore(bar, tabs);
    return bar;
  }

  function ensureHero(m) {
    var tab = document.getElementById("tab-" + m.id);
    if (!tab) return null;
    var existing = tab.querySelector(":scope > .mod-hero");
    if (existing) return existing;
    var hero = el("div", "mod-hero");
    hero.setAttribute("data-theme", m.theme);
    hero.innerHTML = '<div class="mh-text"><h2>' + m.name + "</h2><p>" + m.sub + "</p></div>";
    tab.insertBefore(hero, tab.firstChild);
    return hero;
  }

  // 全屏背景层：固定铺满视口，内容浮在其上
  function ensureBg() {
    var wrap = document.getElementById("mod-bg");
    if (wrap) return wrap;
    wrap = el("div", "mod-bg");
    wrap.id = "mod-bg";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<canvas></canvas><div class="mb-veil"></div>';
    document.body.appendChild(wrap);
    return wrap;
  }

  function stopAll() {
    if (activeFx && activeFx.stop) activeFx.stop();
    activeFx = null;
    var wrap = document.getElementById("mod-bg");
    if (wrap) wrap.classList.remove("on");
    homeFx.forEach(function (f) { if (f && f.stop) f.stop(); });
    homeFx = [];
  }

  function startModuleBg(m) {
    ensureHero(m);           // 只留标题条，动画交给全屏背景
    var wrap = ensureBg();
    var cv = wrap.querySelector("canvas");
    if (!cv || !window.BgFx) return;
    if (activeFx && activeFx.stop) activeFx.stop();
    activeFx = window.BgFx.mount(cv, m.theme, { maxDpr: 1.25 });
    wrap.classList.add("on");
  }

  function startHomeFx() {
    if (!window.BgFx) return;
    var wrap = buildHome();
    wrap.querySelectorAll("canvas").forEach(function (cv) {
      homeFx.push(window.BgFx.mount(cv, cv.getAttribute("data-theme")));
    });
  }

  function syncBar(id) {
    document.querySelectorAll("#app-bar .ab-chip").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-module") === id);
    });
  }

  function showHome() {
    stopAll();
    document.body.classList.add("app-home-mode");
    document.body.classList.remove("app-module-mode");
    document.querySelectorAll(".tab-content").forEach(function (t) {
      t.classList.remove("active");
      t.style.display = "none";
    });
    document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
    buildHome();
    startHomeFx();
    try { if (window.history && history.replaceState) history.replaceState(null, "", "#home"); } catch (e) {}
    toTop();
  }

  function openModule(id) {
    var m = byId[id];
    if (!m) { showHome(); return; }
    stopAll();
    document.body.classList.remove("app-home-mode");
    document.body.classList.add("app-module-mode");
    if (origSwitch) origSwitch(id);
    syncBar(id);
    startModuleBg(m);
    toTop();
  }

  function go(id) {
    try { if (window.history && history.replaceState) history.replaceState(null, "", "#" + id); } catch (e) { location.hash = id; }
    openModule(id);
  }
  function goHome() {
    try { if (window.history && history.replaceState) history.replaceState(null, "", "#home"); } catch (e) { location.hash = "home"; }
    showHome();
  }

  function route() {
    var name = String(location.hash || "").replace(/^#/, "");
    if (!name || name === "home" || !byId[name]) showHome();
    else openModule(name);
  }

  function init() {
    injectStyle();
    buildHome();
    buildBar();
    // 让所有入口（卡片、命令行 onclick）都经过分页外壳
    origSwitch = window.switchTab;
    window.switchTab = function (name) {
      if (origSwitch) origSwitch(name);
      if (byId[name]) {
        document.body.classList.remove("app-home-mode");
        document.body.classList.add("app-module-mode");
        syncBar(name);
        stopAll();
        startModuleBg(byId[name]);
      }
    };
    window.AppShell = { go: go, goHome: goHome, modules: MODULES };
    route();
    window.addEventListener("hashchange", route);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
