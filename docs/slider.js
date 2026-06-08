// slider.js — 大运/流年/流月 三层横向滚动 (v3.0 问真八字风格)
// 简化为三排独立横向滚动，去除点击展开/收起

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

    return html;
}
