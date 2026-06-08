// slider.js — 大运/流年/流月 三层横向滚动 (v3.0 问真八字风格)
// 简化为三排独立横向滚动，去除点击展开/收起

// 太阳历月份索引(寅=0) → JS日历月份 (0=Jan)
var SOLAR_TO_CAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

// 节气列表
var JIE_LIST_S = [
    { key: 'beginning_of_spring',  name: '立春', monthIdx: 0 },
    { key: 'waking_of_insects',    name: '惊蛰', monthIdx: 1 },
    { key: 'pure_brightness',      name: '清明', monthIdx: 2 },
    { key: 'beginning_of_summer',  name: '立夏', monthIdx: 3 },
    { key: 'grain_in_beard',       name: '芒种', monthIdx: 4 },
    { key: 'lesser_heat',          name: '小暑', monthIdx: 5 },
    { key: 'beginning_of_autumn',  name: '立秋', monthIdx: 6 },
    { key: 'white_dew',            name: '白露', monthIdx: 7 },
    { key: 'cold_dew',             name: '寒露', monthIdx: 8 },
    { key: 'beginning_of_winter',  name: '立冬', monthIdx: 9 },
    { key: 'greater_snow',         name: '大雪', monthIdx: 10 },
    { key: 'lesser_cold',          name: '小寒', monthIdx: 11 },
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
                dateStr: parseInt(dateParts[1], 10) + '/' + parseInt(dateParts[2], 10),
            };
        }
    }
    return result;
}

function renderDayunSlider(d) {
    var birthYear = parseInt(d.solarDate, 10);
    var riGan = d.riGan;
    var now = new Date();
    var thisYear = now.getFullYear();
    var html = '';

    // ========== 起运信息栏 ==========
    var qyAge = d.dayun.qiyunAge;
    var qyMonths = d.dayun.qiyunMonths;
    var dyDir = d.dayun.direction;
    var curAge = d.currentAgePrecise || d.currentAgeXusui;
    html += '<div class="qy-bar">';
    html += '<span>起运：出生后' + qyAge + '年' + qyMonths + '月起运（' + dyDir + '）</span>';
    html += '<span class="qy-age">' + curAge + '岁</span>';
    html += '</div>';

    // ========== 大运 横向卡片 ==========
    html += '<div class="scroll-section"><div class="section-title">大运</div>';
    html += '<div class="hscroll">';

    for (var di = 0; di < d.dayun.steps.length; di++) {
        var dy = d.dayun.steps[di];
        var isCur = d.currentDayun && dy.pillar === d.currentDayun.pillar;
        var dySS = getShishen(riGan, dy.pillar[0]);
        var dyGan = dy.pillar[0];
        var startYr = Math.floor(birthYear + dy.startAge);
        var endYr = Math.floor(birthYear + dy.endAge) - 1;

        html += '<div class="dy-card' + (isCur ? ' cur' : '') + '">';
        html += '<div class="dy-card-year">' + startYr + '-' + endYr + '</div>';
        html += '<div class="dy-card-pillar ' + wuxingClass(dyGan) + '">' + dy.pillar + '</div>';
        html += '<div class="dy-card-ss">' + dySS + '</div>';
        html += '</div>';
    }
    html += '</div></div>';

    // ========== 流年 横向文字列表 ==========
    html += '<div class="scroll-section"><div class="section-title">流年</div>';
    html += '<div class="hscroll ln-scroll">';

    // Get current dayun's liunian
    if (d.currentDayun) {
        var liunianAll = getLiunianForDayun(d.currentDayun, birthYear, riGan);
        for (var yi = 0; yi < liunianAll.length; yi++) {
            var ln = liunianAll[yi];
            var isCurYear = ln.year === thisYear;
            html += '<div class="ln-item' + (isCurYear ? ' cur' : '') + '">';
            html += '<div class="ln-year-num">' + ln.year + '</div>';
            html += '<div class="ln-pillar">' + ln.pillar + '</div>';
            html += '</div>';
        }
    }
    html += '</div></div>';

    // ========== 流月 节气列表 ==========
    html += '<div class="scroll-section"><div class="section-title">流月</div>';
    html += '<div class="hscroll lm-scroll">';

    var yearGan = getYearPillar(thisYear)[0];
    var liuyue = getLiuyuePillars(yearGan);
    var yearJie = getYearJieInfo(thisYear);

    for (var mi = 0; mi < 12; mi++) {
        var m = liuyue[mi];
        var jie = yearJie[mi];
        var isCurMonth = false;
        // Check if this is the current month
        var calMonth = SOLAR_TO_CAL[mi];
        if (thisYear === now.getFullYear() && calMonth === now.getMonth()) isCurMonth = true;

        html += '<div class="lm-item' + (isCurMonth ? ' cur' : '') + '">';
        if (jie) {
            html += '<div class="lm-jie">' + jie.name + '</div>';
            html += '<div class="lm-jie-date">' + jie.dateStr + '</div>';
        } else {
            html += '<div class="lm-jie">' + m.name + '</div>';
            html += '<div class="lm-jie-date">&nbsp;</div>';
        }
        html += '<div class="lm-pillar ' + wuxingClass(m.gan) + '">' + m.pillar + '</div>';
        html += '</div>';
    }
    html += '</div></div>';

    // ========== 流日 横向列表 ==========
    html += '<div class="scroll-section"><div class="section-title">流日</div>';
    html += '<div class="hscroll ld-scroll">';

    var nowMonth = now.getMonth(); // JS calendar month
    var nowYear = now.getFullYear();
    var daysInMonth = new Date(nowYear, nowMonth + 1, 0).getDate();
    var ref = new Date(1900, 0, 1);

    for (var d = 1; d <= daysInMonth; d++) {
        var date = new Date(nowYear, nowMonth, d);
        var dayDiff = Math.floor((date - ref) / 86400000);
        var dayIdx = ((10 + dayDiff) % 60 + 60) % 60;
        var dayGan = '甲乙丙丁戊己庚辛壬癸'[dayIdx % 10];
        var dayZhi = '子丑寅卯辰巳午未申酉戌亥'[dayIdx % 12];
        var dayPillar = dayGan + dayZhi;
        var daySS = getShishen(riGan, dayGan);
        var isToday = (d === now.getDate());

        html += '<div class="ld-item' + (isToday ? ' cur' : '') + '">';
        html += '<div class="ld-day-num">' + d + '</div>';
        html += '<div class="ld-pillar-text ' + wuxingClass(dayGan) + '">' + dayPillar + '</div>';
        html += '<div class="ld-ss-text">' + daySS + '</div>';
        html += '</div>';
    }
    html += '</div></div>';

    return html;
}
