// analysis.js — 盲派八字断命分析引擎
// Extract rules from 盲派八字大师 SKILL.md
// Depends on: bazi.js (CANGAN, CHANGSHENG_MAP, TWELVE_STAGES, getChangsheng, getShishen)

function generateAnalysis(d) {
    const riGan = d.riGan, riZhi = d.riZhi;
    const pillars = [d.yearPillar, d.monthPillar, d.dayPillar, d.timePillar];
    const branches = [pillars[0][1], pillars[1][1], pillars[2][1], pillars[3][1]];
    const stems = [pillars[0][0], pillars[1][0], pillars[2][0], pillars[3][0]];
    const allStems = [...stems];
    for (const b of branches) {
        for (const c of (CANGAN[b] || [])) allStems.push(c);
    }
    const riWx = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[riGan];

    const sections = [];

    // ========== SECTION 1: 格局与做功 ==========
    sections.push(analyzePattern(riGan, riZhi, pillars, stems, branches, d.wangshuai, d.shishenStems));

    // ========== SECTION 2: 喜用神 ==========
    sections.push(analyzeXiyong(riGan, riWx, d.wangshuai, stems, branches, d.changsheng));

    // ========== SECTION 3: 婚姻 ==========
    sections.push(analyzeMarriage(riGan, riZhi, stems, branches, pillars, d.shishenCangan, d.branchRelations));

    // ========== SECTION 4: 财运 ==========
    sections.push(analyzeWealth(riGan, stems, branches, d.shishenCangan, d.shishenStems));

    // ========== SECTION 5: 父母 ==========
    sections.push(analyzeParents(riGan, stems, branches, d.shishenCangan, d.branchRelations));

    // ========== SECTION 6: 当前运势 ==========
    sections.push(analyzeCurrent(d.riGan, d.currentDayun, d.currentAgePrecise, d.dayun, d.changsheng));

    // ========== SECTION 7: 健康与五行交战 ==========
    sections.push(analyzeHealth(branches, stems, d.branchRelations, riGan, riWx));

    return sections.filter(s => s).join('\n');
}

// ========== HELPER ==========
function wxOf(stem) {
    return {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[stem] || '';
}

function branchTags(branches) {
    const tags = [];
    const chong = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
    for (const [a,b] of chong) {
        if (branches.includes(a) && branches.includes(b)) tags.push(a+b+'冲');
    }
    return tags;
}

// ========== 格局分析 ==========
function analyzePattern(riGan, riZhi, pillars, stems, branches, ws, shishenStems) {
    const yueZhi = branches[1];
    const yueGan = stems[1];
    const riStage = getChangsheng(riGan, yueZhi);

    let html = `<div class="card"><h3>🏗️ 格局与做功方式</h3>`;

    // 月令格局
    const monthPatterns = {
        寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水',子:'水',丑:'土',
    };
    const yueWx = monthPatterns[yueZhi] || '?';
    html += `<div class="hl"><b>月令：</b>${yueZhi}月(${yueWx}当令) | 日主${riGan}在${yueZhi}为<span class="tag ${riStage==='帝旺'||riStage==='临官'?'tag-good':(riStage==='死'||riStage==='绝'?'tag-warn':'tag-info')}">${riStage}</span></div>`;

    // 格局类型
    const ssYue = shishenStems[1]?.shishen || ''; // 月干十神
    html += `<div class="hl"><b>月令格局：</b>月干${yueGan}=${ssYue}，月令${yueZhi}当令 → <span class="tag tag-info">${ssYue}格</span></div>`;

    // 做功方式推断
    html += `<div class="hl"><b>做功方式推断：</b>`;
    const workTendencies = [];

    // Check 食伤制杀/官
    const hasShangGuan = stems.some(s => getShishen(riGan, s) === '伤官');
    const hasShiShen = stems.some(s => getShishen(riGan, s) === '食神');
    const hasQiSha = stems.some(s => getShishen(riGan, s) === '七杀');
    const hasZhengGuan = stems.some(s => getShishen(riGan, s) === '正官');
    const hasZhengCai = stems.some(s => getShishen(riGan, s) === '正财');
    const hasPianCai = stems.some(s => getShishen(riGan, s) === '偏财');
    const hasZhengYin = stems.some(s => getShishen(riGan, s) === '正印');
    const hasPianYin = stems.some(s => getShishen(riGan, s) === '偏印');

    if ((hasShangGuan || hasShiShen) && (hasQiSha || hasZhengGuan)) {
        workTendencies.push('<span class="tag tag-info">食伤制官杀</span>——以技艺才能谋取权位');
    }
    if (hasZhengCai || hasPianCai) {
        workTendencies.push('<span class="tag tag-info">财星做功</span>——求财为主');

        // 财在内外
        const riZhiCai = (CANGAN[branches[2]] || []).some(c => getShishen(riGan, c).includes('财'));
        const shiZhiCai = (CANGAN[branches[3]] || []).some(c => getShishen(riGan, c).includes('财'));
        if (riZhiCai || shiZhiCai) {
            workTendencies.push('财在家里(日时)——自己掌控钱财');
        } else {
            workTendencies.push('财在外面(年月)——与他人合作求财');
        }
    }
    if (hasZhengYin || hasPianYin) {
        const yinStrong = stems.filter(s => getShishen(riGan, s).includes('印')).length;
        if (yinStrong >= 3) {
            workTendencies.push('<span class="tag tag-info">印旺为用</span>——文化/教育/研究类工作');
        }
    }

    // 五行取象
    const wxJobMap = {
        '木克土':'工程/建筑/土木',
        '火克金':'金融/网络/电子/驾驶',
        '土克水':'养殖/水利/房地产',
        '金克木':'机械/制造/法律',
        '水克火':'消防/餐饮/能源',
    };
    for (const [wxPair, job] of Object.entries(wxJobMap)) {
        const [sender, receiver] = wxPair.split('克');
        const hasSender = allStems.some(s => wxOf(s) === sender);
        const hasReceiver = allStems.some(s => wxOf(s) === receiver);
        if (hasSender && hasReceiver) {
            workTendencies.push(`<span class="tag tag-info">${wxPair}象</span>→ ${job}`);
        }
    }

    if (workTendencies.length === 0) {
        workTendencies.push('<span class="tag tag-neutral">做功方式较隐蔽，需结合大运判断</span>');
    }
    html += workTendencies.join(' | ') + `</div>`;

    // 清浊
    const ganCount = stems.length;
    const zhiCount = branches.flatMap(b => CANGAN[b] || []).length;
    html += `<div class="hl"><b>清浊：</b>天干${ganCount}明现为<span class="tag tag-info">清</span>(公开)，地支藏干${zhiCount}为<span class="tag tag-neutral">浊</span>(隐藏)</div>`;

    html += `</div>`;
    return html;
}

// ========== 喜用神分析 ==========
function analyzeXiyong(riGan, riWx, ws, stems, branches, changshengData) {
    let html = `<div class="card"><h3>💎 喜用神分析</h3>`;

    const helpMap = {木:'水',火:'木',土:'火',金:'土',水:'金'};
    const harmMap = {木:'金',火:'水',土:'木',金:'火',水:'土'};
    const helpWx = helpMap[riWx];
    const harmWx = harmMap[riWx];

    const level = ws.level;
    let xiYong = [];
    if (level === '身弱') {
        xiYong = [helpWx, riWx]; // 需要印比帮身
    } else if (level === '身旺') {
        xiYong = [harmWx]; // 需要克泄耗
    } else {
        xiYong = [helpWx];
    }

    html += `<div class="hl"><b>日主${riGan}(${riWx})</b> — ${level}`;
    if (level === '身弱') {
        html += ` → 喜<span class="tag tag-good">${xiYong.join('、')}</span>帮身 ｜ 忌<span class="tag tag-warn">${harmWx}</span>克身`;
    } else if (level === '身旺') {
        html += ` → 喜<span class="tag tag-good">${xiYong.join('、')}</span>克泄耗 ｜ 忌<span class="tag tag-warn">${helpWx}、${riWx}</span>再来帮身`;
    } else {
        html += ` → 较均衡，大运来什么走什么运`;
    }
    html += `</div>`;

    // 喜用神位置
    const pillarNames = ['年柱','月柱','日柱','时柱'];
    const positionMsgs = {'年柱':'祖上有助，少年运好','月柱':'父母有助','日柱':'自己有能力，配偶有帮助','时柱':'晚年好，子女有助'};

    for (let i = 0; i < 4; i++) {
        const pillarWx = [wxOf(stems[i])];
        for (const c of (CANGAN[branches[i]] || [])) pillarWx.push(wxOf(c));
        const hasXiYong = xiYong.some(xy => pillarWx.includes(xy));
        if (hasXiYong) {
            html += `<div class="hl">✅ 喜用神在<b>${pillarNames[i]}</b> — ${positionMsgs[pillarNames[i]]}</div>`;
        }
    }

    // 拱局填实
    const rels = getBranchRelations(branches);
    if (rels.拱.length) {
        html += `<div class="hl">🌈 <b>拱局：</b>${rels.拱.map(g => {
            const archWx = g.includes('火')?'火':g.includes('水')?'水':g.includes('金')?'金':g.includes('木')?'木':'土';
            const isXi = xiYong.includes(archWx);
            return `<span class="tag ${isXi?'tag-good':'tag-info'}">${g}${isXi?'(喜神到位!)':''}</span>`;
        }).join(' ')}</div>`;
    }

    html += `</div>`;
    return html;
}

// ========== 婚姻分析 ==========
function analyzeMarriage(riGan, riZhi, stems, branches, pillars, shishenCangan, branchRels) {
    let html = `<div class="card"><h3>💕 婚姻分析（盲派五大法则）</h3>`;

    const riZhiBranch = branches[2];
    const shiZhiBranch = branches[3];

    // 1. 日主能否立得住
    const riStage = getChangsheng(riGan, riZhiBranch);
    const riCanStand = (riStage === '临官' || riStage === '帝旺' || riStage === '冠带' || riStage === '长生');
    html += `<div class="hl"><b>①日主立得住？</b> 日主${riGan}坐${riZhiBranch}(${riStage}) → ${riCanStand ? '<span class="tag tag-good">是，有根气</span>' : '<span class="tag tag-warn">较弱，需大运帮身</span>'}</div>`;

    // 2. 夫妻星定位（家里找）
    const riCangan = CANGAN[riZhiBranch] || [];
    const shiCangan = CANGAN[shiZhiBranch] || [];
    const homeStems = [...riCangan, ...shiCangan];

    let fuqiStar = null;
    // 女命找官杀，男命找财
    const targetSS = d => d.gender === 'female' ? ['正官','七杀'] : ['正财','偏财'];

    // 在家里找
    for (const c of homeStems) {
        const ss = getShishen(riGan, c);
        if (ss === '正官' || ss === '七杀' || ss === '正财' || ss === '偏财') {
            fuqiStar = {stem: c, shishen: ss, location: '家里(日时)'};
            break;
        }
    }
    // 外面找
    if (!fuqiStar) {
        const nianCangan = CANGAN[branches[0]] || [];
        const yueCangan = CANGAN[branches[1]] || [];
        for (const c of [...nianCangan, ...yueCangan]) {
            const ss = getShishen(riGan, c);
            if (ss === '正官' || ss === '七杀' || ss === '正财' || ss === '偏财') {
                fuqiStar = {stem: c, shishen: ss, location: '外面(年月)'};
                break;
            }
        }
    }
    // 天干找
    if (!fuqiStar) {
        for (let i = 0; i < stems.length; i++) {
            const ss = getShishen(riGan, stems[i]);
            if ((ss === '正官' || ss === '七杀') || (ss === '正财' || ss === '偏财')) {
                fuqiStar = {stem: stems[i], shishen: ss, location: `天干(${['年','月','日','时'][i]})`};
                break;
            }
        }
    }

    if (fuqiStar) {
        const starStage = getChangsheng(fuqiStar.stem, riZhiBranch);
        html += `<div class="hl"><b>②夫妻星：</b>${fuqiStar.stem}(${fuqiStar.shishen}) 在${fuqiStar.location}
          → 日支${riZhiBranch}处为<span class="tag ${starStage==='临官'||starStage==='帝旺'?'tag-good':(starStage==='死'?'tag-warn':'tag-info')}">${starStage}</span></div>`;
    } else {
        html += `<div class="hl"><b>②夫妻星：</b><span class="tag tag-warn">原局不显</span> → 等大运/流年来</div>`;
    }

    // 3. 配偶宫分析
    html += `<div class="hl"><b>③配偶宫(日支${riZhiBranch})：</b>`;
    const riCangStr = riCangan.map(c => `${c}(${getShishen(riGan, c)})`).join('、');
    html += `藏干: ${riCangStr || '无'} | `;

    // 检查日支是否被冲
    const hasChong = (branchRels.冲 || []).some(c => c.includes(riZhiBranch));
    const hasChuan = (branchRels.穿 || []).some(c => c.includes(riZhiBranch));
    const hasHe = (branchRels.合 || []).some(c => c.includes(riZhiBranch));

    if (hasChong) html += `<span class="tag tag-warn">配偶宫被冲→婚姻动荡</span> `;
    if (hasChuan) html += `<span class="tag tag-warn">配偶宫被穿→婚姻易破裂</span> `;
    if (hasHe) html += `<span class="tag tag-info">配偶宫被合→感情稳定</span> `;
    if (!hasChong && !hasChuan && !hasHe) html += `<span class="tag tag-neutral">配偶宫安静</span>`;
    html += `</div>`;

    // 4. 大运提示
    if (d.currentDayun) {
        const dy = d.currentDayun;
        const dyCang = CANGAN[dy.pillar[1]] || [];
        let hasFuQiYun = false;
        for (const c of dyCang) {
            const ss = getShishen(riGan, c);
            if (ss === '正官' || ss === '七杀' || ss === '正財' || ss === '偏财') {
                hasFuQiYun = true;
                html += `<div class="hl"><b>④大运提示：</b>当前${dy.pillar}运(${dy.startAge}-${dy.endAge}岁)，大运藏<span class="tag tag-good">${c}(${ss})</span>——婚缘运</div>`;
                break;
            }
        }
        if (!hasFuQiYun) {
            html += `<div class="hl"><b>④大运提示：</b>当前${dy.pillar}运，夫妻星未到，关注后续大运</div>`;
        }
    }

    // 5. 伤官见官的检查
    if (hasShangGuan && hasZhengGuan) {
        html += `<div class="hl"><span class="tag tag-warn">⚠️ 伤官见官</span>——婚姻易出问题，需配印星化解</div>`;
    }

    html += `</div>`;
    return html;
}

// ========== 财运分析 ==========
function analyzeWealth(riGan, stems, branches, shishenCangan, shishenStems) {
    let html = `<div class="card"><h3>💰 财运分析</h3>`;

    // 财在内外
    const riCai = (CANGAN[branches[2]] || []).filter(c => {
        const ss = getShishen(riGan, c);
        return ss === '正财' || ss === '偏财';
    });
    const shiCai = (CANGAN[branches[3]] || []).filter(c => {
        const ss = getShishen(riGan, c);
        return ss === '正财' || ss === '偏财';
    });
    const homeCai = [...riCai, ...shiCai];

    const nianCai = (CANGAN[branches[0]] || []).filter(c => {
        const ss = getShishen(riGan, c);
        return ss === '正财' || ss === '偏财';
    });
    const yueCai = (CANGAN[branches[1]] || []).filter(c => {
        const ss = getShishen(riGan, c);
        return ss === '正财' || ss === '偏财';
    });
    const outerCai = [...nianCai, ...yueCai];

    // 天干财
    const ganCai = stems.filter(s => {
        const ss = getShishen(riGan, s);
        return ss === '正财' || ss === '偏财';
    });

    html += `<div class="hl"><b>财星分布：</b>`;
    if (homeCai.length) html += `家里(日时): ${homeCai.map(c => c+'('+getShishen(riGan,c)+')').join('、')} <span class="tag tag-good">自己能掌控</span> `;
    if (outerCai.length) html += `外面(年月): ${outerCai.map(c => c+'('+getShishen(riGan,c)+')').join('、')} <span class="tag tag-info">需合作获取</span> `;
    if (ganCai.length) html += `天干明现: ${ganCai.map(c => c+'('+getShishen(riGan,c)+')').join('、')} `;
    if (!homeCai.length && !outerCai.length && !ganCai.length) {
        html += `<span class="tag tag-warn">原局无财</span>——等大运来财`;
    }
    html += `</div>`;

    // 比劫见财检查
    const hasBiJie = stems.some(s => getShishen(riGan, s) === '比肩' || getShishen(riGan, s) === '劫财');
    if (hasBiJie && (ganCai.length > 0)) {
        const biJieInside = (CANGAN[branches[2]] || []).concat(CANGAN[branches[3]] || []).some(c => {
            const ss = getShishen(riGan, c);
            return ss === '比肩' || ss === '劫财';
        });
        html += `<div class="hl">⚡ <b>比劫见财：</b>`;
        if (biJieInside) {
            html += `比劫在内→<span class="tag tag-warn">制住发财，制不住破财</span>`;
        } else {
            html += `比劫在外→<span class="tag tag-info">管不住手，易破财</span>`;
        }
        html += `</div>`;
    }

    // 印星生财
    const hasYin = stems.some(s => getShishen(riGan, s).includes('印'));
    if (hasYin && (homeCai.length || outerCai.length)) {
        html += `<div class="hl">印星通关：有印化杀护财，财运较稳</div>`;
    }

    html += `</div>`;
    return html;
}

// ========== 父母分析 ==========
function analyzeParents(riGan, stems, branches, shishenCangan, branchRels) {
    let html = `<div class="card"><h3>👨‍👩‍👧 父母分析（星宫同参）</h3>`;

    // 父星=偏财，母星=正印
    const fuWx = wxOf(riGan);
    const caiWx = {木:'土',火:'金',土:'水',金:'木',水:'火'}[fuWx];
    const yinWx = {木:'水',火:'木',土:'火',金:'土',水:'金'}[fuWx];

    // 找父星
    let fatherStar = null;
    for (let i = 0; i < stems.length; i++) {
        if (wxOf(stems[i]) === caiWx) { fatherStar = {stem:stems[i],pos:['年','月','日','时'][i]}; break; }
    }
    if (!fatherStar) {
        for (const b of branches) {
            for (const c of (CANGAN[b] || [])) {
                if (wxOf(c) === caiWx) { fatherStar = {stem:c,pos:'藏干'}; break; }
            }
            if (fatherStar) break;
        }
    }

    // 找母星
    let motherStar = null;
    for (let i = 0; i < stems.length; i++) {
        if (wxOf(stems[i]) === yinWx) { motherStar = {stem:stems[i],pos:['年','月','日','时'][i]}; break; }
    }
    if (!motherStar) {
        for (const b of branches) {
            for (const c of (CANGAN[b] || [])) {
                if (wxOf(c) === yinWx) { motherStar = {stem:c,pos:'藏干'}; break; }
            }
            if (motherStar) break;
        }
    }

    const nianBranch = branches[0];
    const yueBranch = branches[1];

    // 检查父母宫(年月)是否被冲穿
    const nianGongIssue = (branchRels.冲||[]).some(c => c.includes(nianBranch)) || (branchRels.穿||[]).some(c => c.includes(nianBranch));
    const yueGongIssue = (branchRels.冲||[]).some(c => c.includes(yueBranch)) || (branchRels.穿||[]).some(c => c.includes(yueBranch));

    html += `<div class="hl"><b>父星(偏财)：</b>${fatherStar ? `${fatherStar.stem}在${fatherStar.pos}` : '<span class="tag tag-warn">不显</span>'}`;
    if (fatherStar) {
        const fs = getChangsheng(fatherStar.stem, branches[0]);
        html += ` | 年支${branches[0]}处<span class="tag tag-info">${fs}</span>`;
    }
    html += `</div>`;

    html += `<div class="hl"><b>母星(正印)：</b>${motherStar ? `${motherStar.stem}在${motherStar.pos}` : '<span class="tag tag-warn">不显</span>'}`;
    if (motherStar) {
        const ms = getChangsheng(motherStar.stem, branches[1]);
        html += ` | 月支${branches[1]}处<span class="tag tag-info">${ms}</span>`;
    }
    html += `</div>`;

    html += `<div class="hl"><b>父母宫位：</b>`;
    html += `年柱${pillars[0]}(${nianBranch}) `;
    if (nianGongIssue) html += `<span class="tag tag-warn">宫位被冲/穿→父母关系不利</span>`;
    else html += `<span class="tag tag-neutral">宫位安静</span>`;
    html += ` | 月柱${pillars[1]}(${yueBranch}) `;
    if (yueGongIssue) html += `<span class="tag tag-warn">宫位被冲/穿</span>`;
    else html += `<span class="tag tag-neutral">宫位安静</span>`;
    html += `</div>`;

    // 星宫同坏检查
    if (fatherStar && nianGongIssue) {
        html += `<div class="hl"><span class="tag tag-warn">⚠️ 父星星宫同病</span>——父亲健康/运势需关注</div>`;
    }
    if (motherStar && yueGongIssue) {
        html += `<div class="hl"><span class="tag tag-warn">⚠️ 母星星宫同病</span>——母亲健康/运势需关注</div>`;
    }

    html += `</div>`;
    return html;
}

// ========== 当前运势 ==========
function analyzeCurrent(riGan, currentDy, currentAge, dayunData, changshengData) {
    if (!currentDy) return '';

    let html = `<div class="card"><h3>⏳ 当前运势分析</h3>`;

    html += `<div class="hl"><b>当前虚岁：</b>${currentAge + 1}岁 | <b>大运：</b><span class="tag tag-good">${currentDy.pillar} (${currentDy.startAge}-${currentDy.endAge}岁)</span></div>`;

    // 大运对日主的影响
    const dyGan = currentDy.pillar[0];
    const dyZhi = currentDy.pillar[1];
    const dyGanSS = getShishen(riGan, dyGan);
    html += `<div class="hl">大运天干${dyGan}=<span class="tag tag-info">${dyGanSS}</span> | 地支${dyZhi}为<span class="tag tag-info">${getChangsheng(riGan, dyZhi)}</span></div>`;

    // 当前流年
    const now = new Date();
    const thisYear = now.getFullYear();
    const ref = new Date(1900, 0, 1);
    const daysThisYear = Math.floor((new Date(thisYear, 0, 1) - ref) / 86400000);
    const yearGanIdx = ((10 + daysThisYear) % 10 + 10) % 10;
    const yearZhiIdx = ((10 + daysThisYear) % 12 + 12) % 12;
    const yearGan = STEMS[yearGanIdx % 10];
    const yearZhi = BRANCHES[yearZhiIdx % 12];
    const yearSS = getShishen(riGan, yearGan);

    html += `<div class="hl"><b>${thisYear}流年：</b>${yearGan}${yearZhi} <span class="tag tag-info">${yearSS}</span></div>`;

    // 简单断语
    const goodSS = ['正印','偏印','比肩','劫财'];
    const dangerSS = ['七杀'];
    if (goodSS.includes(yearSS)) {
        html += `<div class="hl">✅ 流年${yearSS}到位——<span class="tag tag-good">今年利于发展</span></div>`;
    } else if (dangerSS.includes(yearSS)) {
        html += `<div class="hl">⚠️ 流年七杀——<span class="tag tag-warn">今年压力大，注意健康/纠纷</span></div>`;
    }

    html += `</div>`;
    return html;
}

// ========== 健康与五行交战 ==========
function analyzeHealth(branches, stems, branchRels, riGan, riWx) {
    let html = `<div class="card"><h3>⚕️ 健康与五行交战</h3>`;

    const allIssues = [];

    // 刑冲穿检查
    if ((branchRels.冲 || []).length) {
        allIssues.push(`<span class="tag tag-warn">冲: ${branchRels.冲.join('、')}</span> → 变动/冲突/意外`);
    }
    if ((branchRels.穿 || []).length) {
        allIssues.push(`<span class="tag tag-warn">穿: ${branchRels.穿.join('、')}</span> → 暗中破坏/疾病隐患`);
    }
    if ((branchRels.刑 || []).length) {
        allIssues.push(`<span class="tag tag-warn">刑: ${branchRels.刑.join('、')}</span> → 纠纷/官非/手术`);
    }

    // 五行交战检查
    const harmMap = {木:'金',火:'水',土:'木',金:'火',水:'土'};
    const harmWx = harmMap[riWx];
    const dangerPairs = [
        ['金','木','金木交战→注意骨折/肝胆'],
        ['木','土','木土交战→注意脾胃/消化'],
        ['水','火','水火交战→注意心脑血管'],
        ['火','金','火金交战→注意肺部/呼吸道'],
        ['土','水','土水交战→注意肾脏/泌尿'],
    ];

    const allWxInChart = new Set();
    for (const s of stems) allWxInChart.add(wxOf(s));
    for (const b of branches) for (const c of (CANGAN[b] || [])) allWxInChart.add(wxOf(c));

    for (const [a, b, desc] of dangerPairs) {
        if (allWxInChart.has(a) && allWxInChart.has(b)) {
            allIssues.push(`<span class="tag tag-info">${desc}</span>——原局有苗头，需注意相关流年`);
        }
    }

    if (allIssues.length === 0) {
        html += `<div class="hl"><span class="tag tag-good">原局较为平和</span>，无明显刑冲穿害</div>`;
    } else {
        html += `<div class="hl">${allIssues.join('<br>')}</div>`;
    }

    // 空亡对健康的影响
    const kongBranches = getXunKong(d.dayPillar);
    const kongHealth = branches.filter(b => kongBranches.includes(b));
    if (kongHealth.length) {
        html += `<div class="hl"><b>空亡提醒：</b>${kongHealth.join('、')}落空亡，对应宫位/六亲需关注</div>`;
    }

    html += `</div>`;
    return html;
}
