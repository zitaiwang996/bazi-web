// slider.js — 滑动式 大运→流年→流月→流日 面板

function renderDayunSlider(d) {
    const birthYear = parseInt(d.solarDate);
    const steps = d.dayun.steps;
    const riGan = d.riGan;

    // Build all data
    const dayunData = steps.map(s => ({
        ...s,
        isCur: d.currentDayun && s.pillar === d.currentDayun.pillar,
        startY: Math.floor(birthYear + s.startAge),
        endY: Math.floor(birthYear + s.endAge) - 1,
        liunian: getLiunianForDayun(s, birthYear, riGan),
    }));

    let html = `<div class="card"><h3>📈 滑动浏览：大运 → 流年 → 流月 → 流日</h3>
      <div style="color:var(--dim);font-size:.85em;margin-bottom:8px">${d.dayun.direction} | 起运${d.dayun.qiyunAge}岁${d.dayun.qiyunMonths}个月</div>`;

    // Breadcrumb
    html += `<div class="sl-crumb" id="sl-crumb">
      <span class="sl-crumb-item active" data-lv="0">大运</span>
    </div>`;

    // Panel container
    html += `<div class="sl-panel" id="sl-panel">`;

    // Level 0: 大运列表
    html += `<div class="sl-level" data-lv="0">`;
    dayunData.forEach((dy, di) => {
        html += `<div class="sl-item sl-dy${dy.isCur?' cur':''}" data-dy="${di}">
          <span style="font-weight:700;font-size:1.1em">${dy.pillar}</span>
          <span>${dy.startAge}-${dy.endAge}岁</span>
          <span style="color:var(--dim)">${dy.startY}-${dy.endY}</span>
          ${dy.isCur?'<span class="tag tag-good">当前</span>':''}
          <span style="margin-left:auto;color:var(--dim)">→</span>
        </div>`;
    });
    html += `</div>`;

    // Level 1-3: 流年/流月/流日 (hidden initially)
    dayunData.forEach((dy, di) => {
        // Level 1: 流年
        html += `<div class="sl-level" data-lv="1" data-dy="${di}" style="display:none">`;
        dy.liunian.forEach((ln, li) => {
            html += `<div class="sl-item" data-ln="${li}" data-dy="${di}">
              <span style="color:var(--dim);min-width:50px">${ln.year}</span>
              <b>${ln.pillar}</b>
              <span class="tag ${ln.shishen.includes('杀')||ln.shishen.includes('伤')?'tag-warn':'tag-info'}">${ln.shishen}</span>
              <span style="margin-left:auto;color:var(--dim)">→</span>
            </div>`;
        });
        html += `</div>`;

        // Level 2: 流月 (one per 流年)
        dy.liunian.forEach((ln, li) => {
            html += `<div class="sl-level" data-lv="2" data-dy="${di}" data-ln="${li}" style="display:none">
              <div style="color:var(--dim);padding:8px;font-size:.85em">${ln.year}年 ${ln.pillar} · ${ln.shishen}</div>
              <div class="sl-lm-grid">`;
            ln.liuyue.forEach((m, mi) => {
                html += `<div class="sl-item sl-lm" data-lm="${mi}" data-dy="${di}" data-ln="${li}">
                  <div style="font-size:.7em;color:var(--dim)">${m.name}</div>
                  <div style="font-weight:700">${m.pillar}</div>
                  <span class="tag ${m.shishen.includes('杀')||m.shishen.includes('伤')?'tag-warn':'tag-info'}" style="font-size:.65em">${m.shishen}</span>
                </div>`;
            });
            html += `</div></div>`;
        });

        // Level 3: 流日 (only for current dayun to limit page size)
        if (dy.isCur) {
          dy.liunian.forEach((ln, li) => {
            ln.liuyue.forEach((m, mi) => {
                html += `<div class="sl-level" data-lv="3" data-dy="${di}" data-ln="${li}" data-lm="${mi}" style="display:none">
                  <div style="color:var(--dim);padding:8px;font-size:.85em">${ln.year}年 ${m.name} · ${m.pillar} · ${m.shishen}</div>
                  <div class="sl-ld-grid">`;
                const liuri = getLiuriForMonth(ln.year, mi, riGan);
                liuri.forEach(ld => {
                    html += `<span class="sl-ld-cell">
                      <span style="font-size:.7em;color:var(--dim)">${ld.day}</span>
                      <span style="font-weight:700;font-size:.85em">${ld.pillar}</span>
                      <span style="font-size:.65em;color:var(--dim)">${ld.shishen}</span></span>`;
                });
                html += `</div></div>`;
            });
          });
        }
    });

    html += `</div></div>`;
    return html;
}
