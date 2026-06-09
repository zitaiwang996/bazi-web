// slider.js — 大运→流年→流月→流日 四级可点击展开 (v4.0)
// 点击大运展开流年 → 点击流年展开流月 → 点击流月展开流日
// 面包屑导航支持快速跳转

// ===== SOLAR TERM HELPERS =====
var SOLAR_TO_CAL = [1,2,3,4,5,6,7,8,9,10,11,0]; // 寅月idx→JS日历月
var JIE_LIST_S = [
    {key:'beginning_of_spring', name:'立春', monthIdx:0},
    {key:'waking_of_insects',   name:'惊蛰', monthIdx:1},
    {key:'pure_brightness',     name:'清明', monthIdx:2},
    {key:'beginning_of_summer', name:'立夏', monthIdx:3},
    {key:'grain_in_beard',      name:'芒种', monthIdx:4},
    {key:'lesser_heat',         name:'小暑', monthIdx:5},
    {key:'beginning_of_autumn', name:'立秋', monthIdx:6},
    {key:'white_dew',           name:'白露', monthIdx:7},
    {key:'cold_dew',            name:'寒露', monthIdx:8},
    {key:'beginning_of_winter', name:'立冬', monthIdx:9},
    {key:'greater_snow',        name:'大雪', monthIdx:10},
    {key:'lesser_cold',         name:'小寒', monthIdx:11}
];

function getYearJieInfo(year) {
    var yrKey = String(year);
    if (typeof SOLAR_TERMS === 'undefined' || !SOLAR_TERMS[yrKey]) return {};
    var result = {};
    for (var i = 0; i < JIE_LIST_S.length; i++) {
        var info = JIE_LIST_S[i];
        var val = SOLAR_TERMS[yrKey][info.key];
        if (val) {
            var parts = val.split(' ');
            var dateParts = parts[0].split('-');
            result[info.monthIdx] = {
                name: info.name,
                dateStr: parseInt(dateParts[1],10) + '/' + parseInt(dateParts[2],10)
            };
        }
    }
    return result;
}

// ===== GLOBAL STATE =====
var DY_STATE = {
    d: null,          // chart data from calculateBazi
    birthYear: 0,
    riGan: '',
    dyIdx: -1,        // selected 大运 index in d.dayun.steps
    lnIdx: -1,        // selected 流年 index (0-9)
    lmIdx: -1         // selected 流月 index (0-11, 寅=0)
};

// ===== MAIN ENTRY — called from renderBazi =====
function renderDayunSlider(d) {
    // Initialize state from chart data
    DY_STATE.d = d;
    DY_STATE.birthYear = parseInt(d.solarDate, 10) || new Date().getFullYear();
    DY_STATE.riGan = d.riGan;

    var now = new Date();
    var thisYear = now.getFullYear();

    // Default: current 大运
    DY_STATE.dyIdx = -1;
    if (d.currentDayun) {
        for (var i = 0; i < d.dayun.steps.length; i++) {
            if (d.dayun.steps[i].pillar === d.currentDayun.pillar) {
                DY_STATE.dyIdx = i; break;
            }
        }
    }
    // Fallback: first dayun if none is current
    if (DY_STATE.dyIdx < 0 && d.dayun.steps.length > 0) DY_STATE.dyIdx = 0;

    // Default: current 流年 within selected 大运
    DY_STATE.lnIdx = -1;
    if (DY_STATE.dyIdx >= 0) {
        var dy = d.dayun.steps[DY_STATE.dyIdx];
        var lnList = getLiunianForDayun(dy, DY_STATE.birthYear, DY_STATE.riGan);
        for (var j = 0; j < lnList.length; j++) {
            if (lnList[j].year === thisYear) { DY_STATE.lnIdx = j; break; }
        }
        // Fallback: first liunian if current year not in range
        if (DY_STATE.lnIdx < 0 && lnList.length > 0) DY_STATE.lnIdx = 0;
    }

    // Default: current month (convert JS month to 寅月 index)
    DY_STATE.lmIdx = -1;
    if (DY_STATE.lnIdx >= 0) {
        var jsMonth = now.getMonth(); // 0=Jan
        for (var k = 0; k < 12; k++) {
            if (SOLAR_TO_CAL[k] === jsMonth) { DY_STATE.lmIdx = k; break; }
        }
        if (DY_STATE.lmIdx < 0) DY_STATE.lmIdx = 0;
    }

    return '<div id="slider-root">' + buildSliderHTML() + '</div>';
}

// ===== BUILD FULL HTML =====
function buildSliderHTML() {
    var html = '';
    html += renderQiyunBar();
    html += renderBreadcrumb();
    html += renderDayunScroll();
    if (DY_STATE.dyIdx >= 0) {
        html += renderLiunianScroll();
    }
    if (DY_STATE.lnIdx >= 0) {
        html += renderLiuyueScroll();
    }
    if (DY_STATE.lmIdx >= 0) {
        html += renderLiuriScroll();
    }
    return html;
}

// ===== CLICK HANDLER =====
function sliderClick(level, idx) {
    if (level === 'dy') {
        if (DY_STATE.dyIdx === idx) {
            // Toggle off
            DY_STATE.dyIdx = -1; DY_STATE.lnIdx = -1; DY_STATE.lmIdx = -1;
        } else {
            DY_STATE.dyIdx = idx; DY_STATE.lnIdx = -1; DY_STATE.lmIdx = -1;
        }
    } else if (level === 'ln') {
        if (DY_STATE.lnIdx === idx) {
            DY_STATE.lnIdx = -1; DY_STATE.lmIdx = -1;
        } else {
            DY_STATE.lnIdx = idx; DY_STATE.lmIdx = -1;
        }
    } else if (level === 'lm') {
        if (DY_STATE.lmIdx === idx) {
            DY_STATE.lmIdx = -1;
        } else {
            DY_STATE.lmIdx = idx;
        }
    }

    // Update DOM
    var root = document.getElementById('slider-root');
    if (root) {
        root.innerHTML = buildSliderHTML();
        // Scroll selected items into view
        setTimeout(function() {
            var selDy = root.querySelector('.dy-card.selected');
            if (selDy) selDy.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
            var selLn = root.querySelector('.ln-item.selected');
            if (selLn) selLn.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
        }, 80);
    }
}

// ===== QIYUN BAR =====
function renderQiyunBar() {
    var d = DY_STATE.d;
    if (!d || !d.dayun) return '';
    var qyAge = d.dayun.qiyunAge;
    var qyMonths = d.dayun.qiyunMonths;
    var dyDir = d.dayun.direction;
    var curAge = d.currentAgePrecise || d.currentAgeXusui;
    return '<div class="qy-bar">' +
        '<span>起运：出生后 ' + qyAge + ' 年 ' + qyMonths + ' 月起运（' + dyDir + '）</span>' +
        '<span class="qy-age">' + curAge + '岁</span>' +
        '</div>';
}

// ===== BREADCRUMB NAVIGATION =====
function renderBreadcrumb() {
    var d = DY_STATE.d;
    if (!d) return '';
    var html = '<div class="breadcrumb-bar">';
    html += '<span class="breadcrumb-icon">📍</span> ';

    if (DY_STATE.dyIdx >= 0) {
        var dy = d.dayun.steps[DY_STATE.dyIdx];
        var dyStart = Math.floor(DY_STATE.birthYear + dy.startAge);
        var dyEnd = Math.floor(DY_STATE.birthYear + dy.endAge) - 1;
        html += '<span class="breadcrumb-item" onclick="sliderClick(\'dy\',' + DY_STATE.dyIdx + ')" title="点击收起/展开此大运">' + dy.pillar + '运</span>';
        html += '<span class="breadcrumb-meta">(' + dyStart + '-' + dyEnd + '岁)</span>';

        if (DY_STATE.lnIdx >= 0) {
            var lnList = getLiunianForDayun(dy, DY_STATE.birthYear, DY_STATE.riGan);
            if (DY_STATE.lnIdx < lnList.length) {
                var ln = lnList[DY_STATE.lnIdx];
                html += ' <span class="breadcrumb-sep">▸</span> ';
                html += '<span class="breadcrumb-item" onclick="sliderClick(\'ln\',' + DY_STATE.lnIdx + ')" title="点击收起/展开此流年">' + ln.pillar + '年</span>';
                html += '<span class="breadcrumb-meta">(' + ln.year + ')</span>';

                if (DY_STATE.lmIdx >= 0) {
                    var lmList = getLiuyuePillars(ln.gan);
                    if (DY_STATE.lmIdx < lmList.length) {
                        var lm = lmList[DY_STATE.lmIdx];
                        html += ' <span class="breadcrumb-sep">▸</span> ';
                        html += '<span class="breadcrumb-item" onclick="sliderClick(\'lm\',' + DY_STATE.lmIdx + ')" title="点击收起/展开此流月">' + lm.pillar + '月</span>';
                        html += '<span class="breadcrumb-meta">(' + lm.name + ')</span>';
                    }
                }
            }
        }
    } else {
        html += '<span class="breadcrumb-hint">👆 点击下方大运卡片查看流年</span>';
    }

    html += '</div>';
    return html;
}

// ===== DAYUN SCROLL (always visible) =====
function renderDayunScroll() {
    var d = DY_STATE.d;
    if (!d || !d.dayun) return '';
    var anySel = DY_STATE.dyIdx >= 0;

    var html = '<div class="scroll-section">';
    html += '<div class="section-title">📅 大运 <span class="section-hint">（点击展开流年）</span></div>';
    html += '<div class="hscroll" style="padding-bottom:4px">';

    for (var i = 0; i < d.dayun.steps.length; i++) {
        var dy = d.dayun.steps[i];
        var isSel = (i === DY_STATE.dyIdx);
        var dySS = getShishen(DY_STATE.riGan, dy.pillar[0]);
        var startYr = Math.floor(DY_STATE.birthYear + dy.startAge);
        var endYr = Math.floor(DY_STATE.birthYear + dy.endAge) - 1;

        html += '<div class="dy-card clickable' + (isSel ? ' selected' : '') + '" onclick="sliderClick(\'dy\',' + i + ')" title="' + (isSel ? '点击收起' : '点击展开查看这十年的流年') + '">';
        html += '<div class="dy-card-year">' + startYr + '-' + endYr + '</div>';
        html += '<div class="dy-card-pillar ' + wuxingClass(dy.pillar[0]) + '">' + dy.pillar + '</div>';
        html += '<div class="dy-card-ss">' + dySS + '</div>';
        html += '<div class="expand-hint">' + (isSel ? '▲' : '▼') + '</div>';
        html += '</div>';
    }

    html += '</div></div>';
    return html;
}

// ===== LIUNIAN SCROLL (shown when 大运 selected) =====
function renderLiunianScroll() {
    var d = DY_STATE.d;
    var dy = d.dayun.steps[DY_STATE.dyIdx];
    var lnList = getLiunianForDayun(dy, DY_STATE.birthYear, DY_STATE.riGan);
    if (!lnList.length) return '';

    var html = '<div class="scroll-section ln-section">';
    html += '<div class="section-title">📆 流年 <span class="section-hint">（点击展开流月）</span></div>';
    html += '<div class="hscroll ln-scroll-h">';

    for (var i = 0; i < lnList.length; i++) {
        var ln = lnList[i];
        var isSel = (i === DY_STATE.lnIdx);

        html += '<div class="ln-item clickable' + (isSel ? ' selected' : '') + '" onclick="sliderClick(\'ln\',' + i + ')" title="' + (isSel ? '点击收起' : '点击展开查看这年的流月') + '">';
        html += '<div class="ln-year-num">' + ln.year + '</div>';
        html += '<div class="ln-pillar ' + wuxingClass(ln.gan) + '">' + ln.pillar + '</div>';
        html += '<div class="ln-shishen-sm">' + ln.shishen + '</div>';
        html += '<div class="expand-hint">' + (isSel ? '▲' : '▼') + '</div>';
        html += '</div>';
    }

    html += '</div></div>';
    return html;
}

// ===== LIUYUE SCROLL (shown when 流年 selected) =====
function renderLiuyueScroll() {
    var d = DY_STATE.d;
    var dy = d.dayun.steps[DY_STATE.dyIdx];
    var lnList = getLiunianForDayun(dy, DY_STATE.birthYear, DY_STATE.riGan);
    if (DY_STATE.lnIdx >= lnList.length) return '';
    var ln = lnList[DY_STATE.lnIdx];
    var lmList = getLiuyuePillars(ln.gan);
    var yearJie = getYearJieInfo(ln.year);

    var html = '<div class="scroll-section lm-section">';
    html += '<div class="section-title">📅 流月 <span class="section-hint">（点击展开流日）</span></div>';
    html += '<div class="hscroll lm-scroll-h">';

    for (var i = 0; i < 12; i++) {
        var lm = lmList[i];
        var jie = yearJie[i];
        var isSel = (i === DY_STATE.lmIdx);

        html += '<div class="lm-item clickable' + (isSel ? ' selected' : '') + '" onclick="sliderClick(\'lm\',' + i + ')" title="' + (isSel ? '点击收起' : '点击展开查看这个月的流日') + '">';
        if (jie) {
            html += '<div class="lm-jie">' + jie.name + '</div>';
            html += '<div class="lm-jie-date">' + jie.dateStr + '</div>';
        } else {
            html += '<div class="lm-jie">' + lm.name + '</div>';
            html += '<div class="lm-jie-date">&nbsp;</div>';
        }
        html += '<div class="lm-pillar ' + wuxingClass(lm.gan) + '">' + lm.pillar + '</div>';
        html += '<div class="expand-hint">' + (isSel ? '▲' : '▼') + '</div>';
        html += '</div>';
    }

    html += '</div></div>';
    return html;
}

// ===== LIURI GRID (shown when 流月 selected) =====
function renderLiuriScroll() {
    var d = DY_STATE.d;
    var dy = d.dayun.steps[DY_STATE.dyIdx];
    var lnList = getLiunianForDayun(dy, DY_STATE.birthYear, DY_STATE.riGan);
    if (DY_STATE.lnIdx >= lnList.length) return '';
    var ln = lnList[DY_STATE.lnIdx];
    var lmList = getLiuyuePillars(ln.gan);
    if (DY_STATE.lmIdx >= lmList.length) return '';
    var lm = lmList[DY_STATE.lmIdx];

    // Convert 寅月 idx to JS calendar month for day calculation
    var calMonth = SOLAR_TO_CAL[DY_STATE.lmIdx];
    var liuri = getLiuriForMonth(ln.year, calMonth, DY_STATE.riGan);

    var now = new Date();
    var isCurrentPeriod = (ln.year === now.getFullYear() && calMonth === now.getMonth());
    var today = now.getDate();

    var html = '<div class="scroll-section ld-section">';
    html += '<div class="section-title">📅 流日 — <b style="color:var(--goldL)">' + lm.pillar + '</b> ' + lm.name + '（共' + liuri.length + '天）</div>';
    html += '<div class="ld-grid-scroll">';

    for (var i = 0; i < liuri.length; i++) {
        var ld = liuri[i];
        var isToday = isCurrentPeriod && ld.day === today;

        html += '<div class="ld-chip-clickable' + (isToday ? ' today' : '') + '">';
        html += '<div class="ld-day-num2">' + ld.day + '</div>';
        html += '<div class="ld-pillar-text ' + wuxingClass(ld.gan) + '">' + ld.pillar + '</div>';
        html += '<div class="ld-ss-text">' + ld.shishen + '</div>';
        html += '</div>';
    }

    html += '</div></div>';
    return html;
}
