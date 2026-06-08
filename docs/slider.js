// slider.js — 横向大运→流年→流月→流日 展开 (v2.0 水平布局 + 节气标记)
// 替代旧版垂直表格布局，全部改为横向滚动

// ================================================================
// 节气标记数据
// ================================================================
const JIE_LIST = [
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

// 太阳历月份索引(寅=0) → JS日历月份 (0=Jan)
// 寅月≈2月(Feb), 卯月≈3月(Mar), ..., 丑月≈1月(Jan, 跨年)
const SOLAR_TO_CAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

/**
 * 从 SOLAR_TERMS 提取某年 12 个节气的名称和日期
 * @returns {Object} monthIdx(0=寅月) → { name, dateStr }
 */
function getYearJieInfo(year) {
    var yrKey = String(year);
    if (typeof SOLAR_TERMS === 'undefined' || !SOLAR_TERMS[yrKey]) return {};
    var result = {};
    for (var i = 0; i < JIE_LIST.length; i++) {
        var info = JIE_LIST[i];
        var val = SOLAR_TERMS[yrKey][info.key];
        if (val) {
            var parts = val.split(' ');        // "1974-05-21 18:39"
            var dateParts = parts[0].split('-');
            var m = parseInt(dateParts[1], 10);
            var d = parseInt(dateParts[2], 10);
            result[info.monthIdx] = {
                name: info.name,
                dateStr: m + '/' + d,
            };
        }
    }
    return result;
}

/**
 * 封装: 将太阳历月份索引转为 JS 日历月份后调用 bazi.js 的 getLiuriForMonth
 */
function getLiuriForSolarMonth(year, solarMonthIdx, riGan) {
    var calMonth = SOLAR_TO_CAL[solarMonthIdx];
    var calYear = (solarMonthIdx === 11) ? year + 1 : year; // 丑月跨年
    return getLiuriForMonth(calYear, calMonth, riGan);
}

// ================================================================
// 横向展开/收起
// ================================================================
function toggleHS(id) {
    var body = document.getElementById(id);
    var arr  = document.getElementById(id + '_arr');
    if (!body) return;
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (arr) arr.textContent = '▼'; // ▼
    } else {
        body.style.display = 'none';
        if (arr) arr.textContent = '▶'; // ▶
    }
}

// ================================================================
// 渲染主函数
// ================================================================
function renderDayunSlider(d) {
    var birthYear = parseInt(d.solarDate, 10);
    var riGan = d.riGan;
    var now = new Date();
    var thisYear = now.getFullYear();
    var thisMonth = now.getMonth(); // JS calendar month (0=Jan)

    var html = '<div class="card"><h3>📈 大运 · 流年 · 流月 · 流日</h3>';
    html += '<p style="color:var(--dim);font-size:.85em;margin-bottom:12px">';
    html += d.dayun.direction + ' | 起运' + d.dayun.qiyunAge + '岁' + d.dayun.qiyunMonths + '个月 | ' + d.dayun.targetJie;
    html += ' | <b>左右滑动 · 点击▶展开</b></p>';

    // ---- 大运 横向滚动容器 ----
    html += '<div class="hscroll dy-scroll">';

    for (var di = 0; di < d.dayun.steps.length; di++) {
        var dy = d.dayun.steps[di];
        var isCurDy = d.currentDayun && dy.pillar === d.currentDayun.pillar;
        var liunian = getLiunianForDayun(dy, birthYear, riGan);
        var baseId = 'dy' + di;

        // === DAYUN COLUMN ===
        html += '<div class="hcol dy-col' + (isCurDy ? ' cur' : '') + '">';
        html += '<div class="hcol-head dy-head" onclick="toggleHS(\'' + baseId + '\')">';
        html += '<div class="hcol-pillar">' + dy.pillar + '</div>';
        html += '<div class="hcol-age">' + dy.startAge + '-' + dy.endAge + '岁</div>';
        html += '<div class="hcol-years">' + (Math.floor(birthYear + dy.startAge)) + '-' + (Math.floor(birthYear + dy.endAge) - 1) + '</div>';
        if (isCurDy) html += '<span class="tag tag-good" style="font-size:.6em;margin-top:2px">当前</span>';
        html += '<span class="hcol-arr" id="' + baseId + '_arr">' + (isCurDy ? '▼' : '▶') + '</span>';
        html += '</div>';

        // Dayun body → liunian
        html += '<div class="hcol-body" id="' + baseId + '" style="display:' + (isCurDy ? 'block' : 'none') + '">';
        html += '<div class="hscroll ln-scroll" style="padding:6px">';

        for (var li = 0; li < liunian.length; li++) {
            var ln = liunian[li];
            var isCurYear = (ln.year === thisYear);
            var lnId = baseId + 'n' + li;

            // === LIUNIAN COLUMN ===
            html += '<div class="hcol ln-col' + (isCurYear ? ' cur' : '') + '">';
            html += '<div class="hcol-head ln-head" onclick="event.stopPropagation();toggleHS(\'' + lnId + '\')">';
            html += '<div class="hcol-pillar">' + ln.pillar + '</div>';
            html += '<div class="ln-year">' + ln.year + '</div>';
            html += '<span class="tag ' + (ln.shishen.indexOf('杀') >= 0 || ln.shishen.indexOf('伤') >= 0 ? 'tag-warn' : 'tag-info') + '" style="font-size:.6em;margin-top:2px">' + ln.shishen + '</span>';
            html += '<span class="hcol-arr" id="' + lnId + '_arr">' + (isCurYear ? '▼' : '▶') + '</span>';
            html += '</div>';

            // Liunian body → liuyue
            html += '<div class="hcol-body" id="' + lnId + '" style="display:' + (isCurYear ? 'block' : 'none') + '">';
            html += '<div class="hscroll lm-scroll" style="padding:4px">';

            // 获取该年节气
            var yearJie = getYearJieInfo(ln.year);

            for (var mi = 0; mi < ln.liuyue.length; mi++) {
                var m = ln.liuyue[mi];
                var lmId = lnId + 'm' + mi;
                var calMonth = SOLAR_TO_CAL[mi];
                var isCurMonth = (ln.year === thisYear && calMonth === thisMonth);
                var jieInfo = yearJie[mi];

                // === LIUYUE COLUMN ===
                html += '<div class="hcol lm-col' + (isCurMonth ? ' cur' : '') + '">';
                html += '<div class="hcol-head lm-head" onclick="event.stopPropagation();toggleHS(\'' + lmId + '\')">';
                html += '<div class="hcol-pillar">' + m.pillar + '</div>';
                html += '<div class="lm-name">' + m.name + '</div>';
                if (jieInfo) {
                    html += '<span class="jie-tag" title="' + jieInfo.name + ' ' + jieInfo.dateStr + '">' + jieInfo.name + '<br>' + jieInfo.dateStr + '</span>';
                }
                html += '<span class="tag ' + (m.shishen.indexOf('杀') >= 0 || m.shishen.indexOf('伤') >= 0 ? 'tag-warn' : 'tag-info') + '" style="font-size:.55em;margin-top:1px">' + m.shishen + '</span>';
                html += '<span class="hcol-arr" id="' + lmId + '_arr">▶</span>';
                html += '</div>';

                // Liuyue body → liuri
                html += '<div class="hcol-body" id="' + lmId + '" style="display:none">';
                html += '<div class="ld-hgrid">';

                var liuri = getLiuriForSolarMonth(ln.year, mi, riGan);
                for (var ldi = 0; ldi < liuri.length; ldi++) {
                    var ld = liuri[ldi];
                    var ssClass = (ld.shishen.indexOf('杀') >= 0 || ld.shishen.indexOf('伤') >= 0) ? 'ld-ss-warn' : '';
                    html += '<span class="ld-chip">';
                    html += '<span class="ld-day">' + ld.day + '</span>';
                    html += '<span class="ld-pillar">' + ld.pillar + '</span>';
                    html += '<span class="ld-ss ' + ssClass + '">' + ld.shishen + '</span>';
                    html += '</span>';
                }

                html += '</div></div></div>'; // close lm-col
            }

            html += '</div></div></div>'; // close ln-col
        }

        html += '</div></div></div>'; // close dy-col
    }

    html += '</div></div>'; // close hscroll + card
    return html;
}
