// slider.js — 大运→流年→流月→流日 逐级展开 (inline onclick)

function renderDayunSlider(d) {
    const birthYear = parseInt(d.solarDate);
    const riGan = d.riGan;
    let html = `<div class="card"><h3>📈 大运 · 流年 · 流月 · 流日</h3>
      <p style="color:var(--dim);font-size:.85em;margin-bottom:12px">${d.dayun.direction}启运 ${d.dayun.qiyunAge}岁${d.dayun.qiyunMonths}个月 | 距${d.dayun.targetJie} ${d.dayun.deltaDays}天</p>`;

    d.dayun.steps.forEach((dy, di) => {
        const isCur = d.currentDayun && dy.pillar === d.currentDayun.pillar;
        const liunian = getLiunianForDayun(dy, birthYear, riGan);
        const baseId = 'd'+di;

        // 大运行
        html += `<div class="dy-row${isCur?' cur':''}">
          <div class="dy-row-hd" onclick="st('${baseId}')">
            <span class="st-arr" id="${baseId}_a">▶</span>
            <b>${dy.pillar}</b> <span style="color:var(--dim)">${dy.startAge}-${dy.endAge}岁 | ${Math.floor(birthYear+dy.startAge)}-${Math.floor(birthYear+dy.endAge)-1}年</span>
            ${isCur?'<span class="tag tag-good">当前</span>':''}
          </div>
          <div class="dy-row-bd" id="${baseId}" style="display:none">
            <table style="width:100%;font-size:.85em">
              <tr><th>流年</th><th>干支</th><th>十神</th><th>流月(点击展开)</th></tr>`;

        liunian.forEach((ln, li) => {
            const lnId = baseId+'n'+li;
            html += `<tr class="ln-click" onclick="st('${lnId}')">
              <td><span class="st-arr" id="${lnId}_a">▶</span> ${ln.year}</td>
              <td><b>${ln.pillar}</b></td>
              <td><span class="tag ${ln.shishen.includes('杀')||ln.shishen.includes('伤')?'tag-warn':'tag-info'}">${ln.shishen}</span></td>
              <td style="color:var(--dim);font-size:.8em">12流月</td></tr>
            <tr id="${lnId}" style="display:none"><td colspan="4" style="background:rgba(0,0,0,.08);padding:8px">
              <div class="lm-row">`;
            ln.liuyue.forEach((m, mi) => {
                const lmId = lnId+'m'+mi;
                html += `<span class="lm-chip" onclick="event.stopPropagation();st('${lmId}')">
                  <span class="st-arr" id="${lmId}_a" style="font-size:.6em">▶</span>
                  <b style="font-size:.75em">${m.name}${m.pillar}</b>
                  <span class="tag ${m.shishen.includes('杀')||m.shishen.includes('伤')?'tag-warn':'tag-info'}" style="font-size:.6em">${m.shishen}</span>`;
                // 流日 (only for current dayun to save space)
                if (isCur) {
                    html += `<span id="${lmId}" style="display:none;margin-top:3px;display:none">`;
                    const liuri = getLiuriForMonth(ln.year, mi, riGan);
                    liuri.forEach(ld => {
                        html += `<span class="ld-chip">${ld.day}<br><b>${ld.pillar}</b><br><small style="color:var(--dim)">${ld.shishen}</small></span>`;
                    });
                    html += `</span>`;
                }
                html += `</span>`;
            });
            html += `</div></td></tr>`;
        });

        html += `</table></div></div>`;
    });

    html += `</div>`;
    return html;
}

// Simple toggle function
function st(id) {
    const el = document.getElementById(id);
    const arr = document.getElementById(id+'_a');
    if (!el) return;
    const show = el.style.display === 'none';
    el.style.display = show ? 'block' : 'none';
    if (arr) arr.textContent = show ? '▼' : '▶';
}
