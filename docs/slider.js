// slider.js — 问真八字风格 大运→流年→流月→流日 扁平表格展开

function renderDayunSlider(d) {
    const birthYear = parseInt(d.solarDate);
    const riGan = d.riGan;
    let html = `<div class="card"><h3>📈 大运 · 流年 · 流月 · 流日</h3>
      <p style="color:var(--dim);font-size:.85em;margin-bottom:12px">${d.dayun.direction} | 起运${d.dayun.qiyunAge}岁${d.dayun.qiyunMonths}个月 | 距${d.dayun.targetJie} ${d.dayun.deltaDays}天 | <b>点击▶展开</b></p>`;

    d.dayun.steps.forEach((dy, di) => {
        const isCur = d.currentDayun && dy.pillar === d.currentDayun.pillar;
        const liunian = getLiunianForDayun(dy, birthYear, riGan);
        const baseId = 'd'+di;

        // 大运标题行
        html += `<div class="wz-dy${isCur?' cur':''}">
          <div class="wz-dy-head" onclick="st('${baseId}')">
            <span class="st-arr" id="${baseId}_a">▶</span>
            <b class="wz-dy-pillar">${dy.pillar}</b>
            <span class="wz-dy-age">${dy.startAge}-${dy.endAge}岁</span>
            <span class="wz-dy-year">${Math.floor(birthYear+dy.startAge)}-${Math.floor(birthYear+dy.endAge)-1}</span>
            ${isCur?'<span class="tag tag-good">当前</span>':''}
          </div>`;

        // 流年表格（隐藏）
        html += `<div class="wz-dy-body" id="${baseId}" style="display:none">
          <table class="wz-tbl">
            <thead><tr><th>流年</th><th>干支</th><th>十神</th></tr></thead><tbody>`;

        liunian.forEach((ln, li) => {
            const lnId = baseId+'n'+li;
            html += `<tr class="wz-ln-row" onclick="st('${lnId}')">
              <td><span class="st-arr" id="${lnId}_a">▶</span> ${ln.year}</td>
              <td><b>${ln.pillar}</b></td>
              <td><span class="tag ${ln.shishen.includes('杀')||ln.shishen.includes('伤')?'tag-warn':'tag-info'}">${ln.shishen}</span></td></tr>`;

            // 流月展开行
            html += `<tr id="${lnId}" style="display:none"><td colspan="3" class="wz-lm-td">
              <div class="wz-lm-grid">`;
            ln.liuyue.forEach((m, mi) => {
                const lmId = lnId+'m'+mi;
                html += `<div class="wz-lm-chip" onclick="event.stopPropagation();st('${lmId}')">
                  <span class="st-arr" style="font-size:.55em" id="${lmId}_a">▶</span>
                  <div class="wz-lm-name">${m.name}</div>
                  <div class="wz-lm-pillar">${m.pillar}</div>
                  <div class="tag ${m.shishen.includes('杀')||m.shishen.includes('伤')?'tag-warn':'tag-info'}" style="font-size:.55em">${m.shishen}</div>`;

                // 流日展开（仅当前大运）
                if (isCur) {
                    html += `<div id="${lmId}" style="display:none;margin-top:3px" onclick="event.stopPropagation()"><div class="wz-ld-grid">`;
                    const liuri = getLiuriForMonth(ln.year, mi, riGan);
                    liuri.forEach(ld => {
                        html += `<span class="wz-ld-chip">
                          <span style="font-size:.65em;color:var(--dim)">${ld.day}</span>
                          <span style="font-weight:700;font-size:.8em">${ld.pillar}</span>
                          <span style="font-size:.55em;color:var(--dim)">${ld.shishen}</span></span>`;
                    });
                    html += `</div></div>`;
                }
                html += `</div>`;
            });
            html += `</div></td></tr>`;
        });

        html += `</tbody></table></div></div>`;
    });

    html += `</div>`;
    return html;
}

// 展开/收起
function st(id) {
    const el = document.getElementById(id);
    const arr = document.getElementById(id+'_a');
    if (!el) return;
    const show = el.style.display === 'none';
    el.style.display = show ? 'block' : 'none';
    if (arr) arr.textContent = show ? '▼' : '▶';
}
