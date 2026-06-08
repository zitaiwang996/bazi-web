// ================================================================
// analysis.js — 盲派八字完整断命分析引擎 v2.0
// 金镖门老人参 + 段建业 + 郝金阳 + 京南道人
// Rules extracted from 盲派八字大师-SKILL.md (3599 lines)
// ================================================================

function generateAnalysis(d) {
    const riGan = d.riGan, riZhi = d.riZhi;
    const ps = [d.yearPillar, d.monthPillar, d.dayPillar, d.timePillar];
    const bz = [ps[0][1], ps[1][1], ps[2][1], ps[3][1]]; // branches
    const sz = [ps[0][0], ps[1][0], ps[2][0], ps[3][0]]; // stems
    const riWx = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[riGan];
    const ws = d.wangshuai;

    let sections = [];

    // === SECTION 0: 格局 + 做功 ===
    sections.push(analyzePattern(riGan, riZhi, ps, sz, bz, ws, d));

    // === SECTION 1: 喜用神框架 ===
    sections.push(analyzeXiyong(riGan, riWx, ws, sz, bz, d));

    // === SECTION 2: 婚姻关 ===
    sections.push(analyzeMarriage(riGan, riZhi, sz, bz, ps, d));

    // === SECTION 3: 子息门 ===
    sections.push(analyzeChildren(riGan, riZhi, sz, bz, d));

    // === SECTION 4: 工作关 ===
    sections.push(analyzeCareer(riGan, riZhi, sz, bz, ws, d));

    // === SECTION 5: 财运 ===
    sections.push(analyzeWealth(riGan, riZhi, sz, bz, d));

    // === SECTION 6: 父母 ===
    sections.push(analyzeParents(riGan, riZhi, sz, bz, d));

    // === SECTION 7: 兄弟姐妹 ===
    sections.push(analyzeSiblings(riGan, sz, bz, d));

    // === SECTION 8: 健康 + 五行交战 ===
    sections.push(analyzeHealth(riGan, riWx, bz, sz, d));

    // === SECTION 9: 当前运势 ===
    sections.push(analyzeCurrent(riGan, d));

    // === SECTION 10: 性格 ===
    sections.push(analyzePersonality(riGan, riWx, sz, bz));

    // === SECTION 11: 格局深度 ===
    sections.push(analyzeDeepPattern(riGan, riZhi, sz, bz, ws, d));

    // === SECTION 12: 干支取象 ===
    sections.push(analyzeGanzhiImage(riGan, riZhi, sz, bz, d));

    return sections.filter(s => s).join('\n');
}

// ================================================================
// 0. 格局与做功方式
// ================================================================
function analyzePattern(riGan, riZhi, ps, sz, bz, ws, d) {
    const yueZhi = bz[1], yueGan = sz[1];
    const riStage = getChangsheng(riGan, yueZhi);
    let h = `<div class="card"><h3>🏗️ 格局与做功方式</h3>`;

    // 月令格局
    const wxMap = {寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水',子:'水',丑:'土'};
    h += `<div class="hl"><b>月令${yueZhi}(${wxMap[yueZhi]}当令)：</b>日主${riGan}在${yueZhi}为<span class="tag ${riStage==='帝旺'||riStage==='临官'?'tag-good':(riStage==='死'||riStage==='绝'||riStage==='墓'?'tag-warn':'tag-info')}">${riStage}</span> | 月干${yueGan}=${d.shishenStems[1].shishen}→${d.shishenStems[1].shishen}格</div>`;

    // 做功方式推断
    const ssAll = d.shishenStems.map(s=>s.shishen);
    const hasSG=ssAll.includes('伤官'), hasSS=ssAll.includes('食神'), hasQS=ssAll.includes('七杀');
    const hasZG=ssAll.includes('正官'), hasZC=ssAll.includes('正财'), hasPC=ssAll.includes('偏财');
    const hasZY=ssAll.includes('正印'), hasPY=ssAll.includes('偏印'), hasBJ=ssAll.includes('比肩')||ssAll.includes('劫财');

    h += `<div class="hl"><b>做功方式：</b>`;
    const works = [];

    // 食伤制杀/官
    if ((hasSG||hasSS) && (hasQS||hasZG)) {
        works.push(`<span class="tag tag-info">食伤制官杀</span>——以技艺才能谋取权位`);
        if (hasSG && hasZG) works.push(`<span class="tag tag-warn">伤官见官</span>(${ws.level==='身弱'?'用印则无祸':'用比劫则为祸百端'})`);
    }
    // 化官生印
    if (hasZG && (hasZY||hasPY)) {
        works.push(`<span class="tag tag-good">化官生印</span>——官来生印、印来生身，化敌为友最高境界`);
    }
    // 杀印相生
    if (hasQS && (hasZY||hasPY)) {
        works.push(`<span class="tag tag-info">杀印相生</span>——七杀化权，印星通关`);
    }
    // 食神生财
    if (hasSS && (hasZC||hasPC)) {
        works.push(`<span class="tag tag-good">食神生财</span>——${ws.level==='身旺'?'身旺可大富':'需印帮身'}`);
    }
    // 印禄相随
    if ((hasZY||hasPY) && hasBJ) {
        works.push(`<span class="tag tag-info">印禄相随</span>——有文化有根基`);
    }
    // 吃皇粮判断
    const eatHuangLiang = (hasSS&&hasQS||hasZG&&hasZY||hasPY) && (hasBJ||hasZY);
    if (eatHuangLiang) works.push(`<span class="tag tag-good">吃皇粮格局</span>——体制内有稳定工作`);

    if (!works.length) works.push(`<span class="tag tag-neutral">需结合大运判断具体做功</span>`);
    h += works.join(' | ') + `</div>`;

    // 清浊 + 家里家外
    const homeStems = [...(CANGAN[bz[2]]||[]), ...(CANGAN[bz[3]]||[])];
    const outerStems = [...(CANGAN[bz[0]]||[]), ...(CANGAN[bz[1]]||[])];
    const homeSS = homeStems.map(c=>getShishen(riGan,c));
    const outerSS = outerStems.map(c=>getShishen(riGan,c));

    h += `<div class="hl"><b>清浊分判：</b>天干${sz.map(s=>`<span class="tag tag-info">${s}</span>`).join(' ')}=清(公开) | `;
    h += `藏干家里/外面=浊(隐藏)</div>`;

    // 纳音分析
    const nyData = d.nayin;
    const nianNayin = nyData[0], riNayin = nyData[2];
    h += `<div class="hl"><b>纳音根基：</b>年柱${nianNayin.pillar}=${nianNayin.nayin}(祖辈质地/出身) | 日柱${riNayin.pillar}=${riNayin.nayin}(自身本质)`;
    const nianWx = nianNayin.wuxing, riNWx = riNayin.wuxing;
    const wxSheng = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    if (nianWx && riNWx && wxSheng[nianWx]===riNWx) h += `<br>纳音年生→日：祖上庇荫自己`;
    else if (nianWx && riNWx && wxSheng[riNWx]===nianWx) h += `<br>纳音日生→年：自己超越祖辈`;
    h += `</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// 1. 喜用神框架 (铁律12)
// ================================================================
function analyzeXiyong(riGan, riWx, ws, sz, bz, d) {
    const helpMap = {木:'水',火:'木',土:'火',金:'土',水:'金'};
    const harmMap = {木:'金',火:'水',土:'木',金:'火',水:'土'};
    const helpWx = helpMap[riWx], harmWx = harmMap[riWx];
    let xiYong = ws.level==='身弱'?[helpWx,riWx]:ws.level==='身旺'?[harmWx]:[helpWx];

    let h = `<div class="card"><h3>💎 喜用神分析 [铁律12·五步框架]</h3>`;

    h += `<div class="hl"><b>第一步-日主${riGan}(${riWx})-${ws.level}：</b>${ws.level==='身弱'?`喜<span class="tag tag-good">${xiYong.join('、')}</span>帮身 忌<span class="tag tag-warn">${harmWx}</span>`:ws.level==='身旺'?`喜<span class="tag tag-good">${xiYong.join('、')}</span>克泄耗 忌<span class="tag tag-warn">${helpWx}、${riWx}</span>再来`:'较均衡，大运左右'}</div>`;

    // 第二步：查喜用神位置
    const posNames = ['年柱','月柱','日柱','时柱'];
    const posMsgs = ['祖上有助/少年运好','父母有助','自己有能/配偶助力','晚年好/子女有助'];
    for (let i=0; i<4; i++) {
        const pillarWx = new Set([wxOf(sz[i]), ...(CANGAN[bz[i]]||[]).map(wxOf)]);
        const found = xiYong.filter(xy=>pillarWx.has(xy));
        if (found.length) h += `<div class="hl">✅ <b>${posNames[i]}：</b>喜用神${found.join('、')}在此——${posMsgs[i]}</div>`;
        else h += `<div class="hl">❌ <b>${posNames[i]}：</b>无喜用神</div>`;
    }

    // 第三步：喜用神何时来
    if (d.currentDayun) {
        const dyPillar = d.currentDayun.pillar;
        const dyWx = new Set([wxOf(dyPillar[0]), ...(CANGAN[dyPillar[1]]||[]).map(wxOf)]);
        const dyFound = xiYong.filter(xy=>dyWx.has(xy));
        h += `<div class="hl"><b>第三步-当前大运${dyPillar}：</b>`;
        if (dyFound.length) h += `<span class="tag tag-good">好运！喜用神${dyFound.join('、')}到位</span>`;
        else h += `<span class="tag tag-info">喜用神未到，等后续大运</span>`;
        h += `</div>`;
    }

    // 第五步：各六亲单独找喜用神
    h += `<div class="hl"><b>第五步-六亲喜用神(单独定位)：</b></div>`;
    const qinStars = [];
    // Father: 偏财
    for (const s of [...sz,...bz.flatMap(b=>CANGAN[b]||[])]) {
        if (wxOf(s)==={木:'土',火:'金',土:'水',金:'木',水:'火'}[riWx]) { qinStars.push({label:'父星(偏财)',stem:s}); break; }
    }
    // Mother: 正印
    const yinWx2 = {木:'水',火:'木',土:'火',金:'土',水:'金'}[riWx];
    for (const s of [...sz,...bz.flatMap(b=>CANGAN[b]||[])]) {
        if (wxOf(s)===yinWx2) { qinStars.push({label:'母星(正印)',stem:s}); break; }
    }
    for (const q of qinStars) {
        const qWx = wxOf(q.stem);
        const qHelp = helpMap[qWx], qHarm = harmMap[qWx];
        h += `<div class="hl" style="margin-left:16px">• ${q.label}(${q.stem}${qWx})：喜${qHelp}、忌${qHarm}——${q.label}的运势独立判断</div>`;
    }

    h += `</div>`;
    return h;
}

// ================================================================
// 2. 婚姻关 (五大法则 + 应期细则 + 离婚原因)
// ================================================================
function analyzeMarriage(riGan, riZhi, sz, bz, ps, d) {
    let h = `<div class="card"><h3>💕 婚姻关 [五大法则 + 应期 + 离婚信号]</h3>`;
    const wsLevel = d.wangshuai.level;

    // 法则1: 日主立得住？
    const riStage = getChangsheng(riGan, riZhi);
    const canStand = ['临官','帝旺','冠带','长生'].includes(riStage);
    h += `<div class="hl"><b>①日主立得住？</b> 日主${riGan}坐${riZhi}(${riStage}) → ${canStand?'<span class="tag tag-good">有根气，能立</span>':'<span class="tag tag-warn">弱，需大运扶身</span>'}</div>`;

    // 法则2+3: 夫妻星定位
    const homeCang = [...(CANGAN[bz[2]]||[]), ...(CANGAN[bz[3]]||[])];
    const outerCang = [...(CANGAN[bz[0]]||[]), ...(CANGAN[bz[1]]||[])];
    let fuqiStar = null, fuqiLoc = '';
    const targetSS = ['正官','七杀']; // 女命标准化 (simplification: 统一找官杀)

    // 家里找
    for (const c of homeCang) {
        const ss = getShishen(riGan, c);
        if (targetSS.includes(ss)) { fuqiStar = {stem:c, shishen:ss}; fuqiLoc = '家里(日时)'; break; }
    }
    // 外面找
    if (!fuqiStar) for (const c of outerCang) {
        const ss = getShishen(riGan, c);
        if (targetSS.includes(ss)) { fuqiStar = {stem:c, shishen:ss}; fuqiLoc = '外面(年月)'; break; }
    }
    // 天干找
    if (!fuqiStar) for (let i=0; i<4; i++) {
        const ss = d.shishenStems[i].shishen;
        if (['正官','七杀','正財','偏财'].includes(ss)) { fuqiStar = {stem:sz[i], shishen:ss}; fuqiLoc = `天干${['年','月','日','时'][i]}`; break; }
    }

    if (fuqiStar) {
        const starStage = getChangsheng(fuqiStar.stem, bz[2]);
        h += `<div class="hl"><b>②夫妻星立得住？</b> ${fuqiStar.stem}(${fuqiStar.shishen})在${fuqiLoc}`;
        h += `→ 日支${bz[2]}处<span class="tag ${starStage==='临官'||starStage==='帝旺'?'tag-good':(starStage==='死'?'tag-warn':'tag-info')}">${starStage}</span>`;
        h += fuqiLoc==='家里(日时)'?' <span class="tag tag-good">家里有星=正缘</span>':' <span class="tag tag-warn">星在外面=缘分不稳定</span>';
        h += `</div>`;
    } else {
        h += `<div class="hl"><b>②夫妻星：</b><span class="tag tag-warn">原局不显</span>→等大运/流年带来。大运夫妻星到位=婚期</div>`;
    }

    // 法则4: 大运提示
    if (d.currentDayun) {
        const dyZhi = d.currentDayun.pillar[1];
        const dyCang = CANGAN[dyZhi]||[];
        let dyFuqi = [];
        for (const c of dyCang) {
            const ss = getShishen(riGan, c);
            if (['正官','七杀','正財','偏财'].includes(ss)) dyFuqi.push(`${c}(${ss})`);
        }
        h += `<div class="hl"><b>③大运提示：</b>当前${d.currentDayun.pillar}(${d.currentDayun.startAge}-${d.currentDayun.endAge}岁)`;
        if (dyFuqi.length) h += ` 藏<span class="tag tag-good">${dyFuqi.join('、')}</span>——婚缘运`;
        else h += ` 夫妻星未到`;
        h += `</div>`;
    }

    // 离婚信号检查
    h += `<div class="hl"><b>④离婚信号检查：</b>`;
    const risks = [];
    // 伤官见官
    if (d.shishenStems.some(s=>s.shishen==='伤官') && d.shishenStems.some(s=>s.shishen==='正官'))
        risks.push(`<span class="tag tag-warn">伤官见官</span>(${wsLevel==='身弱'?'用印可解':'用比劫则不利'})`);
    // 夫妻星被冲穿
    const rels = d.branchRelations;
    if ((rels.冲||[]).some(c=>c.includes(bz[2]))) risks.push(`<span class="tag tag-warn">配偶宫被冲</span>→婚姻动荡`);
    if ((rels.穿||[]).some(c=>c.includes(bz[2]))) risks.push(`<span class="tag tag-warn">配偶宫被穿</span>→婚姻易破裂`);
    // 比劫合财/官
    if (d.shishenStems.some(s=>s.shishen==='比肩'||s.shishen==='劫财') && fuqiStar)
        risks.push(`<span class="tag tag-warn">比劫夺夫/妻</span>→感情竞争`);
    // 关财门 (女命)
    if (d.shishenStems.some(s=>s.shishen==='伤官') && d.shishenCangan.some(sc=>sc.hiddens.some(h=>h.shishen==='正财'||h.shishen==='偏财')))
        risks.push(`<span class="tag tag-warn">关财门</span>→官杀失源→婚姻不利`);
    // 夫妻星虚透
    if (fuqiStar && !homeCang.includes(fuqiStar.stem))
        risks.push(`<span class="tag tag-warn">夫妻星虚透/在外</span>→大运来新根=换人`);

    if (!risks.length) risks.push(`<span class="tag tag-neutral">原局无明显婚姻风险</span>`);
    h += risks.join(' | ') + `</div>`;

    // 阴阳吸引
    const riYY = '甲丙戊庚壬'.includes(riGan) ? '阳' : '阴';
    h += `<div class="hl"><b>⑤阴阳配婚：</b>日主${riGan}=${riYY} →
      ${riYY==='阳'?'宜配阴旺之人→金水旺者':'宜配阳旺之人→木火旺者'} | 阴阳互补=自然吸引</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// 3. 子息门 (完整铁律)
// ================================================================
function analyzeChildren(riGan, riZhi, sz, bz, d) {
    let h = `<div class="card"><h3>👶 子息门 [食伤总纲 + 身旺财子/身衰印儿]</h3>`;
    const ssS2 = d.shishenStems;
    const hasSS = ssS2.some(s=>s.shishen==='食神'), hasSG = ssS2.some(s=>s.shishen==='伤官');
    const hasZC = ssS2.some(s=>s.shishen==='正财'), hasPC = ssS2.some(s=>s.shishen==='偏财');
    const hasZY = ssS2.some(s=>s.shishen==='正印'), hasPY = ssS2.some(s=>s.shishen==='偏印');

    // 食伤是第一关
    h += `<div class="hl"><b>食伤(总纲)：</b>`;
    if (hasSS || hasSG) {
        h += `食神/伤官有气→有生育基础`;
    } else {
        h += `<span class="tag tag-warn">食伤不显→需大运来补</span>`;
    }
    h += `</div>`;

    // 身旺/身弱判断子女
    h += `<div class="hl"><b>子女星判断：</b>`;
    if (d.wangshuai.level === '身旺') {
        h += `身旺→财为子`;
        if (hasZC||hasPC) h += ` <span class="tag tag-good">有财→有子</span>`;
        else h += ` <span class="tag tag-warn">无财→等大运来财</span>`;
    } else if (d.wangshuai.level === '身弱') {
        h += `身弱→印为儿`;
        if (hasZY||hasPY) h += ` <span class="tag tag-good">有印→有子</span>`;
        else h += ` <span class="tag tag-warn">无印→等大运来印</span>`;
    } else {
        h += `中和→食伤/财印皆可看`;
    }
    h += `</div>`;

    // 具体口诀判断
    const checks = [];
    // 印重食伤轻
    if ((hasZY||hasPY) && !(hasSS||hasSG))
        checks.push(`<span class="tag tag-warn">印重食伤轻→子少</span>`);
    // 印重食伤轻+有财
    if ((hasZY||hasPY) && (hasSS||hasSG) && (hasZC||hasPC))
        checks.push(`<span class="tag tag-good">印重+食伤+财→财破印救食伤→子多而贤</span>`);
    // 穿倒财星
    if ((d.branchRelations.穿||[]).length && (hasZC||hasPC))
        checks.push(`<span class="tag tag-warn">穿倒财星无子息</span>`);
    // 伤官不见财
    if (hasSG && !hasZC && !hasPC)
        checks.push(`<span class="tag tag-warn">伤官不见财→男孩不见面</span>`);
    // 子星落空亡
    const kong = d.kongBranches;
    for (const b of [bz[2], bz[3]]) {
        for (const c of (CANGAN[b]||[])) {
            const ss = getShishen(riGan, c);
            if ((ss==='食神'||ss==='伤官') && kong.includes(b))
                checks.push(`<span class="tag tag-warn">命中子星落空亡→亲生儿女防早丧</span>`);
        }
    }
    // 金寒水冷
    const allWx = [...sz.map(wxOf), ...bz.flatMap(b=>(CANGAN[b]||[]).map(wxOf))];
    const jinCount = allWx.filter(w=>w==='金').length, shuiCount = allWx.filter(w=>w==='水').length;
    const huoCount = allWx.filter(w=>w==='火').length;
    if (jinCount+shuiCount>=6 && huoCount===0) checks.push(`<span class="tag tag-warn">金寒水冷→无子</span>`);
    if (allWx.filter(w=>w==='火'||w==='土').length>=6 && allWx.filter(w=>w==='水').length===0)
        checks.push(`<span class="tag tag-warn">火炎土焦→无子</span>`);

    if (checks.length) h += `<div class="hl">${checks.join(' | ')}</div>`;
    else h += `<div class="hl"><span class="tag tag-neutral">无极端无子信号</span></div>`;

    // 大运决定论
    h += `<div class="hl"><b>临界点法则：</b>食伤力量模棱两可→<span class="tag tag-info">大运决定</span>。大运帮食伤=能生子女，大运没帮=只能生女或推迟。</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// 4. 工作关 — 职业方向+公职/生意判断+考试时机+行业建议
// ================================================================
function analyzeCareer(riGan, riZhi, sz, bz, ws, d) {
    let h = `<div class="card"><h3>💼 工作关 — 职业方向与时机判断</h3>`;

    const ssS = d.shishenStems;
    const hasSS=ssS.some(s=>s.shishen==='食神'), hasSG=ssS.some(s=>s.shishen==='伤官');
    const hasQS=ssS.some(s=>s.shishen==='七杀'), hasZG=ssS.some(s=>s.shishen==='正官');
    const hasZY=ssS.some(s=>s.shishen==='正印'), hasPY=ssS.some(s=>s.shishen==='偏印');
    const hasZC=ssS.some(s=>s.shishen==='正财'), hasPC=ssS.some(s=>s.shishen==='偏财');
    const hasBJ=ssS.some(s=>s.shishen==='比肩'||s.shishen==='劫财');

    // 所有天干地支的五行
    const allStems = [...sz, ...bz.flatMap(b=>CANGAN[b]||[])];
    const allWxSet = new Set(allStems.map(wxOf));
    const wxCount = {};
    for (const s of allStems) { const w=wxOf(s); wxCount[w]=(wxCount[w]||0)+1; }
    const dominantWx = Object.entries(wxCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';

    // ===== STEP 1: 判断适合公职还是做生意 =====
    let careerType = '';  // '公职' | '生意' | '技术' | '自由'
    let careerConfidence = '';
    const signals = {公职:[],生意:[],技术:[],自由:[]};

    // 公职信号
    if (hasZG && hasZY) signals.公职.push('正官+正印→化官生印，正宗吃皇粮');
    if (hasQS && hasZY) signals.公职.push('杀印相生→以印化权，掌权之象');
    if ((hasSS||hasSG) && (hasQS||hasZG) && (hasZY||hasPY)) signals.公职.push('食伤制官杀+印→体制内有实权');
    if (hasZG && !hasPY) signals.公职.push('正官无枭扰→干净的公职命');
    if (hasZY && hasZG && !hasSG) signals.公职.push('正印正官+无伤官→稳定公职');

    // 生意信号
    if (hasPY && hasZG) signals.生意.push('偏印配官→非传统路线，适合自己做生意');
    if (hasPY && !hasZY) signals.生意.push('枭旺无正印→不走寻常路，创业型');
    if (hasSS && hasZC && ws.level==='身旺') signals.生意.push('食神生财+身旺→可经商致富');
    if ((hasZC||hasPC) && !hasZG && !hasZY) signals.生意.push('有财无官印→自由经商之命');
    if (hasPY && hasSG) signals.生意.push('枭+伤官→技术型创业');

    // 技术信号
    if ((hasSS||hasSG) && !hasZG && !hasQS) signals.技术.push('食伤旺无官杀→靠技术/手艺吃饭');
    if (hasSS && hasQS && ws.level==='身旺') signals.技术.push('食神制杀→技术型管理');
    if (allWxSet.has('火') && allWxSet.has('金')) signals.技术.push('火金组合→网络/IT/电子技术');

    // 自由职业信号
    if (!hasZG && !hasZY && !hasZC && !hasPC) signals.自由.push('无官无印无财→自由职业/靠禄神吃饭');
    if (hasSG && !hasZG) signals.自由.push('伤官无制→自由不羁，适合创意/艺术');

    // 综合判断
    const maxSignal = Object.entries(signals).sort((a,b)=>b[1].length-a[1].length)[0];
    if (maxSignal && maxSignal[1].length >= 3) {
        careerType = maxSignal[0];
        careerConfidence = '高';
    } else if (maxSignal && maxSignal[1].length >= 1) {
        careerType = maxSignal[0];
        careerConfidence = '中';
    } else {
        careerType = '自由';
        careerConfidence = '低';
    }

    h += `<div class="hl" style="background:rgba(200,164,92,0.12);border-color:var(--gold);"><b>🎯 职业方向判断（${careerConfidence}置信度）：</b>`;

    const typeLabels = {公职:'<span class="tag tag-good" style="font-size:1.1em">适合走公职/体制路线</span>',
                        生意:'<span class="tag tag-info" style="font-size:1.1em">适合做生意/创业</span>',
                        技术:'<span class="tag tag-info" style="font-size:1.1em">适合技术/手艺路线</span>',
                        自由:'<span class="tag tag-neutral" style="font-size:1.1em">适合自由职业</span>'};
    h += `${typeLabels[careerType]||''}</div>`;

    // 各方信号展示
    for (const [type, arr] of Object.entries(signals)) {
        if (arr.length) {
            const icon = {公职:'🏛️',生意:'💼',技术:'🔧',自由:'🎨'};
            h += `<div class="hl">${icon[type]||''} <b>${type}信号(${arr.length}条)：</b>${arr.map(s=>`<br>· ${s}`).join('')}</div>`;
        }
    }

    // ===== STEP 2: 适合行业建议 =====
    h += `<div class="hl"><b>🏭 五行取象—适合行业：</b></div>`;
    h += `<div class="hl">`;

    const detailedJobs = {
        '木-土': {jobs:['土木工程','建筑设计','房地产','园林绿化','装修装饰','农业种植'],bestFor:'公职/生意均可'},
        '火-金': {jobs:['互联网/IT','金融/证券','电商运营','电子制造','汽车驾驶','冶炼加工'],bestFor:'生意/技术'},
        '土-水': {jobs:['水利工程','养殖业','房地产','环保工程','仓储物流','食品加工'],bestFor:'生意/公职'},
        '金-木': {jobs:['机械制造','法律/律师','外科医生','精密加工','伐木/林业','五金行业'],bestFor:'技术/公职'},
        '水-火': {jobs:['餐饮业','消防工程','能源电力','影视传媒','冷链物流','饮料酒水'],bestFor:'生意'},
    };

    let matchedJobs = [];
    for (const [pair, info] of Object.entries(detailedJobs)) {
        const [a,b] = pair.split('-');
        if (allWxSet.has(a) && allWxSet.has(b)) {
            matchedJobs.push({pair, ...info});
        }
    }

    if (matchedJobs.length) {
        h += `<b>原局五行组合行业：</b><br>`;
        for (const mj of matchedJobs) {
            h += `<span class="tag tag-info">${mj.pair}</span> → ${mj.jobs.join(' / ')} (适合${mj.bestFor})<br>`;
        }
    }

    // 主旺五行单独建议
    if (dominantWx) {
        const wxSoloJobs = {
            木:'教育、出版、园林、中医、纺织',
            火:'能源、餐饮、传媒、演艺、互联网',
            土:'房地产、建筑、农业、矿产、仓储',
            金:'金融、法律、机械、公安、五金',
            水:'物流、贸易、旅游、渔业、饮料',
        };
        h += `<br><b>主旺五行${dominantWx}：</b>${wxSoloJobs[dominantWx]||''}`;
    }
    h += `</div>`;

    // ===== STEP 3: 公职考试时机 =====
    if (careerType === '公职' || signals.公职.length >= 1) {
        h += `<div class="hl" style="background:rgba(90,143,90,0.12);"><b>📅 公职/考试有利时机：</b></div>`;

        // 找出所有大运中的印/官运
        const favorableYears = [];
        const now = new Date().getFullYear();
        for (const step of d.dayun.steps) {
            const dyGan = step.pillar[0], dyZhi = step.pillar[1];
            const dyGanSS = getShishen(riGan, dyGan);
            const startYear = parseInt(d.solarDate) + Math.floor(step.startAge);
            const endYear = parseInt(d.solarDate) + Math.floor(step.endAge);

            // 印或官的大运 → 适合考试
            if (dyGanSS.includes('印') || dyGanSS.includes('官')) {
                favorableYears.push({
                    period: `${startYear}-${endYear}`,
                    dayun: step.pillar,
                    reason: dyGanSS,
                    age: `${step.startAge}-${step.endAge}岁`,
                });
            }
        }

        if (favorableYears.length) {
            h += `<div class="hl">`;
            for (const fy of favorableYears) {
                const isCurrent = fy.period.includes(String(now));
                h += `${isCurrent ? '✅ <b>当前</b>' : '·'} <b>${fy.period}</b>(${fy.age}) — ${fy.dayun}运 → ${fy.reason}到位`;
                if (isCurrent) h += ` <span class="tag tag-good">考试有利期！</span>`;
                h += `<br>`;
            }
            h += `</div>`;

            // 建议
            const currentFavorable = favorableYears.find(fy => fy.period.includes(String(now)));
            if (currentFavorable) {
                h += `<div class="hl"><span class="tag tag-good">🎯 当前正处于有利考试的大运！</span>建议把握今明两年的考试机会。</div>`;
            } else {
                // Find next favorable period
                const nextFavorable = favorableYears.find(fy => {
                    const startYr = parseInt(fy.period.split('-')[0]);
                    return startYr > now;
                });
                if (nextFavorable) {
                    h += `<div class="hl"><span class="tag tag-info">📌 下一个考试有利期：${nextFavorable.period}</span>，在此之前先积累准备。</div>`;
                }
            }
        } else {
            h += `<div class="hl"><span class="tag tag-neutral">原局公职信号较弱</span>——若坚持考公，选择印/官流年（如${now}-${now+5}年中的印官年）备考。</div>`;
        }
    }

    // ===== STEP 4: 做生意行业建议 =====
    if (careerType === '生意' || signals.生意.length >= 1) {
        h += `<div class="hl" style="background:rgba(200,164,92,0.1);"><b>💡 做生意具体建议：</b></div>`;

        // 行业匹配
        const bizWx = dominantWx;
        const bizIndustry = {
            木:'教育培训、文化传媒、园林绿化、中医养生、家居布艺',
            火:'餐饮连锁、网络科技、影视娱乐、新能源、美容美发',
            土:'房地产中介、建筑装修、农产品贸易、仓储物流、矿产',
            金:'金融理财、珠宝首饰、机械代理、法律咨询、安保服务',
            水:'进出口贸易、水产批发、冷链物流、旅游业、酒水代理',
        };

        h += `<div class="hl"><b>主旺五行${bizWx}→首选行业：</b>${bizIndustry[bizWx]||'结合流年选择'}</div>`;

        // 何时出手
        if (d.currentDayun) {
            const dyGanSS = getShishen(riGan, d.currentDayun.pillar[0]);
            h += `<div class="hl"><b>当前大运${d.currentDayun.pillar}：</b>`;
            if (dyGanSS.includes('财')) {
                h += `<span class="tag tag-good">财运到→适合创业/扩大经营</span>`;
            } else if (dyGanSS.includes('食')||dyGanSS.includes('伤')) {
                h += `<span class="tag tag-info">食伤运→适合积累技术/人脉，为创业做准备</span>`;
            } else if (dyGanSS.includes('印')) {
                h += `<span class="tag tag-info">印运→稳扎稳打，不宜冒进扩张</span>`;
            } else if (dyGanSS.includes('官')||dyGanSS.includes('杀')) {
                h += `<span class="tag tag-warn">官杀运→注意合规/纠纷，谨慎投资</span>`;
            }
            h += `</div>`;
        }

        // 财年提示
        const now = new Date();
        const thisYear = now.getFullYear();
        const ref = new Date(1900, 0, 1);
        const daysThisYear = Math.floor((new Date(thisYear, 0, 1) - ref) / 86400000);
        const yearGan = STEMS[((10 + daysThisYear) % 10 + 10) % 10];
        const yearZhi = BRANCHES[((10 + daysThisYear) % 12 + 12) % 12];
        const yearSS = getShishen(riGan, yearGan);
        h += `<div class="hl"><b>${thisYear}年${yearGan}${yearZhi}(${yearSS})：</b>`;
        if (yearSS.includes('财')) h += `<span class="tag tag-good">财年——创业/投资的有利年份！</span>`;
        else if (yearSS.includes('食')||yearSS.includes('伤')) h += `<span class="tag tag-info">食伤年——积累技术、筹备项目</span>`;
        else h += `<span class="tag tag-neutral">平稳年——做好准备工作</span>`;
        h += `</div>`;
    }

    // ===== STEP 5: 当前行动建议 =====
    h += `<div class="hl"><b>⚡ 当前行动建议：</b></div>`;
    if (d.currentDayun) {
        const dyGanSS = getShishen(riGan, d.currentDayun.pillar[0]);
        const wsStage = getChangsheng(riGan, bz[1]);

        if (careerType === '公职') {
            h += `<div class="hl">🎯 路线：备考公职/事业单位 → 把握印/官大运流年 → 当前${d.currentDayun.pillar}运`;
            h += dyGanSS.includes('印')||dyGanSS.includes('官')
                ? ` <span class="tag tag-good">——时机已到，全力以赴！</span>`
                : ` <span class="tag tag-info">——积累阶段，等印官运到来</span>`;
            h += `</div>`;
        } else if (careerType === '生意') {
            h += `<div class="hl">💡 路线：选择${dominantWx||'匹配'}行业 → 食伤运积累 → 财运发力 → 当前${d.currentDayun.pillar}运</div>`;
        } else if (careerType === '技术') {
            h += `<div class="hl">🔧 路线：深耕技术领域 → 食伤为用 → 技术过硬=铁饭碗`;
            if (allWxSet.has('火')&&allWxSet.has('金')) h += '<br>→ 推荐方向：<span class="tag tag-info">IT/互联网/软件开发</span></div>';
        } else {
            h += `<div class="hl">🎨 自由职业：靠${dominantWx||'自身'}吃饭 → 跟大运走，什么运来做什么事</div>`;
        }
    }

    h += `</div>`;
    return h;
}

// ================================================================
// 5. 财运 (六模型 + 财内外)
// ================================================================
function analyzeWealth(riGan, riZhi, sz, bz, d) {
    let h = `<div class="card"><h3>💰 财运 [比劫见财六模型 + 财内外]</h3>`;

    const hasZC = d.shishenStems.some(s=>s.shishen==='正财'), hasPC = d.shishenStems.some(s=>s.shishen==='偏财');
    const homeCai = (CANGAN[bz[2]]||[]).concat(CANGAN[bz[3]]||[]).filter(c=>{const s=getShishen(riGan,c);return s==='正财'||s==='偏财'});
    const outerCai = (CANGAN[bz[0]]||[]).concat(CANGAN[bz[1]]||[]).filter(c=>{const s=getShishen(riGan,c);return s==='正财'||s==='偏财'});
    const ganCai = sz.filter(s=>{const ss=getShishen(riGan,s);return ss==='正财'||ss==='偏财'});
    const hasBiJie = d.shishenStems.some(s=>s.shishen==='比肩'||s.shishen==='劫财');
    const hasYin = d.shishenStems.some(s=>s.shishen==='正印'||s.shishen==='偏印');

    // 财内外
    h += `<div class="hl"><b>财星分布：</b>`;
    if (homeCai.length) h += `家里(日时): ${homeCai.map(c=>`<span class="tag tag-good">${c}(${getShishen(riGan,c)})</span>`).join('、')} → 自己能掌控 `;
    if (outerCai.length) h += `外面(年月): ${outerCai.map(c=>`<span class="tag tag-info">${c}(${getShishen(riGan,c)})</span>`).join('、')} → 需合作 `;
    if (ganCai.length) h += `天干: ${ganCai.map(c=>`<span class="tag">${c}(${getShishen(riGan,c)})</span>`).join('、')} `;
    if (!homeCai.length&&!outerCai.length&&!ganCai.length) h += `<span class="tag tag-warn">原局无财</span>—等大运来`;
    h += `</div>`;

    // 比劫见财模型
    if (hasBiJie && (homeCai.length || outerCai.length || ganCai.length)) {
        h += `<div class="hl"><b>比劫见财分析：</b>`;
        const biJieInside = homeCai.length > 0 || (CANGAN[bz[2]]||[]).concat(CANGAN[bz[3]]||[]).some(c=>{const s=getShishen(riGan,c);return s==='比肩'||s==='劫财'});

        if (outerCai.length && !homeCai.length) {
            h += `<span class="tag tag-warn">财在外+比劫在内</span>→制住发财，制不住官司`;
        } else if (outerCai.length && biJieInside) {
            h += `<span class="tag tag-info">财在外+比劫也在外</span>→管不住手，易破财`;
        } else if (homeCai.length && !outerCai.length) {
            h += `<span class="tag tag-info">财在家里</span>→制住发财，制不住不破财(只累)`;
        }

        if (hasYin) h += ` | <span class="tag tag-good">有印通关</span>→护财有力`;
        h += `</div>`;
    }

    // 财气通门户
    if (homeCai.length || ganCai.length) {
        h += `<div class="hl"><b>财气通门户：</b>财星对日主<span class="tag tag-good">有情</span>→财主动来找命主。不论旺衰，有情即吉。</div>`;
    }

    // 官当财看
    if (d.shishenStems.some(s=>s.shishen==='正官') && !hasZC && !hasPC) {
        h += `<div class="hl"><span class="tag tag-info">官当财看</span>——不做官但能赚钱，财的级别更高</div>`;
    }

    h += `</div>`;
    return h;
}

// ================================================================
// 6. 父母
// ================================================================
function analyzeParents(riGan, riZhi, sz, bz, d) {
    let h = `<div class="card"><h3>👨‍👩‍👧 父母关 [星宫同参 + 流年应期]</h3>`;

    const caiWx = {木:'土',火:'金',土:'水',金:'木',水:'火'}[wxOf(riGan)];
    const yinWx = {木:'水',火:'木',土:'火',金:'土',水:'金'}[wxOf(riGan)];
    const riWx = wxOf(riGan);

    // 找父星母星
    let fatherStar = null, motherStar = null;
    for (let i=0; i<4; i++) {
        if (wxOf(sz[i])===caiWx && !fatherStar) fatherStar = {stem:sz[i],pos:['年','月','日','时'][i],pillarIdx:i};
        if (wxOf(sz[i])===yinWx && !motherStar) motherStar = {stem:sz[i],pos:['年','月','日','时'][i],pillarIdx:i};
    }
    if (!fatherStar) for (const b of bz) for (const c of (CANGAN[b]||[])) {
        if (wxOf(c)===caiWx) { fatherStar = {stem:c,pos:'藏干'}; break; }
    }
    if (!motherStar) for (const b of bz) for (const c of (CANGAN[b]||[])) {
        if (wxOf(c)===yinWx) { motherStar = {stem:c,pos:'藏干'}; break; }
    }

    h += `<div class="hl"><b>父星(偏财)：</b>${fatherStar?`${fatherStar.stem}在${fatherStar.pos} <span class="tag tag-info">${getChangsheng(fatherStar.stem,bz[0])}</span>`:'<span class="tag tag-warn">不显</span>——借盘/等大运'}</div>`;
    h += `<div class="hl"><b>母星(正印)：</b>${motherStar?`${motherStar.stem}在${motherStar.pos} <span class="tag tag-info">${getChangsheng(motherStar.stem,bz[1])}</span>`:'<span class="tag tag-warn">不显</span>——借盘/等大运'}</div>`;

    // 星宫同坏检查
    const rels = d.branchRelations;
    const nianIssue = (rels.冲||[]).some(c=>c.includes(bz[0]))||(rels.穿||[]).some(c=>c.includes(bz[0]));
    const yueIssue = (rels.冲||[]).some(c=>c.includes(bz[1]))||(rels.穿||[]).some(c=>c.includes(bz[1]));

    h += `<div class="hl"><b>父母宫位：</b>`;
    h += `年柱${d.yearPillar}(${bz[0]}) ` + (nianIssue?`<span class="tag tag-warn">宫位被冲/穿</span>`:`<span class="tag tag-neutral">安</span>`);
    h += ` | 月柱${d.monthPillar}(${bz[1]}) ` + (yueIssue?`<span class="tag tag-warn">宫位被冲/穿</span>`:`<span class="tag tag-neutral">安</span>`);
    h += `</div>`;

    // 星宫同坏
    if (fatherStar && nianIssue)
        h += `<div class="hl"><span class="tag tag-warn">⚠️ 父星星宫同坏</span>→父缘薄，年柱(父宫)与父星同时受制——需关注父亲运势</div>`;
    if (motherStar && yueIssue)
        h += `<div class="hl"><span class="tag tag-warn">⚠️ 母星星宫同坏</span>→母缘薄，月柱(母宫)与母星同时受制——需关注母亲运势</div>`;

    // ===== 流年对父母星/宫的冲克分析 =====
    h += `<div class="hl"><b>📅 流年对父母星/宫的影响（当前大运十年）：</b></div>`;

    if (d.currentDayun && d.dayun) {
        const birthYear = parseInt(d.solarDate, 10);
        const curDy = d.currentDayun;
        const liunian = getLiunianForDayun(curDy, birthYear, riGan);
        const now = new Date().getFullYear();

        const riskYears = [];
        const nianZhi = bz[0], yueZhi = bz[1];

        // 冲/穿 查找表
        const CHONG_PAIRS = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
        const CHUAN_PAIRS = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
        const HE_PAIRS = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];

        function isChong(a,b) { return CHONG_PAIRS.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a)); }
        function isChuan(a,b) { return CHUAN_PAIRS.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a)); }
        function isHe(a,b) { return HE_PAIRS.some(p=>(p[0]===a&&p[1]===b)||(p[0]===b&&p[1]===a)); }

        for (const ln of liunian) {
            const lnGan = ln.pillar[0], lnZhi = ln.pillar[1];
            const risks = [];

            // 检查流年干是否克父星/母星
            if (fatherStar) {
                const lnToFather = getShishen(fatherStar.stem, lnGan);
                if (lnToFather.includes('杀') || lnToFather.includes('官')) risks.push(`克父星(${fatherStar.stem})`);
            }
            if (motherStar) {
                const lnToMother = getShishen(motherStar.stem, lnGan);
                if (lnToMother.includes('杀') || lnToMother.includes('官')) risks.push(`克母星(${motherStar.stem})`);
            }

            // 检查流年支是否冲/穿年支(父宫)或月支(母宫)
            if (isChong(lnZhi, nianZhi)) risks.push('冲年柱(父宫)');
            if (isChuan(lnZhi, nianZhi)) risks.push('穿年柱(父宫)');
            if (isChong(lnZhi, yueZhi)) risks.push('冲月柱(母宫)');
            if (isChuan(lnZhi, yueZhi)) risks.push('穿月柱(母宫)');

            // 合动宫位也需注意
            if (isHe(lnZhi, nianZhi)) risks.push('合动年柱(父宫)');
            if (isHe(lnZhi, yueZhi)) risks.push('合动月柱(母宫)');

            if (risks.length) {
                const isCurYear = ln.year === now;
                riskYears.push({
                    year: ln.year,
                    pillar: ln.pillar,
                    risks,
                    isCur: isCurYear,
                });
            }
        }

        if (riskYears.length) {
            h += `<div class="hl" style="max-height:200px;overflow-y:auto">`;
            for (const ry of riskYears) {
                h += `<div style="margin:2px 0">`;
                if (ry.isCur) h += `<span class="tag tag-good">当前</span> `;
                h += `<b>${ry.year}年 ${ry.pillar}：</b>`;
                h += ry.risks.map(r => `<span class="tag tag-warn">${r}</span>`).join(' ');
                h += `</div>`;
            }
            h += `</div>`;
        } else {
            h += `<div class="hl"><span class="tag tag-neutral">当前大运十年内流年对父母星/宫无明显冲克</span></div>`;
        }

        // 大运对父母星/宫的影响
        const dyGan = curDy.pillar[0], dyZhi = curDy.pillar[1];
        const dyRisks = [];
        if (fatherStar) {
            const dyToFather = getShishen(fatherStar.stem, dyGan);
            if (dyToFather.includes('杀') || dyToFather.includes('官')) dyRisks.push(`大运干${dyGan}克父星`);
        }
        if (motherStar) {
            const dyToMother = getShishen(motherStar.stem, dyGan);
            if (dyToMother.includes('杀') || dyToMother.includes('官')) dyRisks.push(`大运干${dyGan}克母星`);
        }
        if (isChong(dyZhi, nianZhi)) dyRisks.push('大运支冲年柱(父宫)');
        if (isChuan(dyZhi, nianZhi)) dyRisks.push('大运支穿年柱(父宫)');
        if (isChong(dyZhi, yueZhi)) dyRisks.push('大运支冲月柱(母宫)');
        if (isChuan(dyZhi, yueZhi)) dyRisks.push('大运支穿月柱(母宫)');

        if (dyRisks.length) {
            h += `<div class="hl"><b>当前大运${curDy.pillar}：</b>${dyRisks.map(r=>`<span class="tag tag-warn">${r}</span>`).join(' ')}——此十年需多加关注</div>`;
        }
    }

    h += `</div>`;
    return h;
}

// ================================================================
// 7. 兄弟姐妹
// ================================================================
function analyzeSiblings(riGan, sz, bz, d) {
    let h = `<div class="card"><h3>👫 兄弟姐妹 [铁律5·比劫+印根]</h3>`;

    const biJieCount = d.shishenStems.filter(s=>s.shishen==='比肩'||s.shishen==='劫财').length;
    const yinCount = d.shishenStems.filter(s=>s.shishen==='正印'||s.shishen==='偏印').length;

    h += `<div class="hl"><b>基本原则：</b>`;
    h += `比肩=${['兄弟','姐妹'][0]} | 劫财=${['姐妹','兄弟'][0]} | 印星的根=${['姐妹','兄弟'][0]}`;
    h += `</div>`;

    // 三合印局检查
    const sanheString = (d.branchRelations.三合||[]).join('');
    if (sanheString.includes('木') && yinCount>=3)
        h += `<div class="hl"><span class="tag tag-info">印局三合</span>→将比肩收成日主自己的不同方面，合并算1个</div>`;

    // 简单判断
    const totalSib = biJieCount + yinCount;
    h += `<div class="hl"><b>参考数：</b>比劫${biJieCount}+印${yinCount}=${totalSib}→兄弟姐妹约${Math.max(0,totalSib-1)}-${totalSib+1}人（结合计划生育政策调整）</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// 8. 健康与五行交战
// ================================================================
function analyzeHealth(riGan, riWx, bz, sz, d) {
    let h = `<div class="card"><h3>⚕️ 健康与五行交战 [五行反目 + 穿害疾病]</h3>`;

    const rels = d.branchRelations;
    const allStems2 = [...sz, ...bz.flatMap(b=>CANGAN[b]||[])];
    const allWxSet = new Set(allStems2.map(wxOf));
    const issues = [];

    // 刑冲穿
    if ((rels.冲||[]).length) issues.push(`冲: ${rels.冲.join('、')} → 变动/冲突/意外伤`);
    if ((rels.穿||[]).length) {
        issues.push(`穿: ${rels.穿.join('、')}——穿的力量>刑>三合>克`);

        // 疾病取象
        const chuanDisease = {
            '子未穿':'囊肿/血液病/心脏病/子宫肌瘤',
            '丑午穿':'牙病/糖尿病/甲状腺/乳腺',
            '卯辰穿':'水灾/女命克夫',
            '酉戌穿':'爆炸伤/火灾/肠道病/咽炎',
            '申亥穿':'咽炎/颈椎/腰椎/肠道病',
            '寅巳穿':'口腔溃疡/痔疮/眼睛伤',
        };
        for (const [key, disease] of Object.entries(chuanDisease)) {
            if ((rels.穿||[]).some(c=>c.includes(key[0])&&c.includes(key[1]))) {
                issues.push(`→ ${key}: <span class="tag tag-warn">${disease}</span>`);
            }
        }
    }

    // 五行交战检查
    const dangerPairs = [
        ['金','木','金木交战→车祸/骨折/肝胆手术'],
        ['木','土','木土交战→脾胃/消化/坍塌'],
        ['水','火','水火交战→心梗/脑溢血/眼疾'],
        ['火','金','火金交战→肺部/呼吸道/皮肤烧伤'],
        ['土','水','土水交战→肾衰/尿毒症/溺水'],
    ];
    for (const [a,b,desc] of dangerPairs) {
        if (allWxSet.has(a) && allWxSet.has(b)) {
            const aCount = [...sz,...bz.flatMap(b=>(CANGAN[b]||[]))].filter(s=>wxOf(s)===a).length;
            const bCount = [...sz,...bz.flatMap(b=>(CANGAN[b]||[]))].filter(s=>wxOf(s)===b).length;
            if (aCount>=2 && bCount>=2) {
                issues.push(`<span class="tag tag-warn">${desc}</span>——双方同时有力=交战爆发风险`);
            }
        }
    }

    // 五行对应身体
    const wxBody = {木:'肝胆',火:'心/小肠/眼',土:'脾胃/皮肤',金:'肺/大肠/骨骼',水:'肾/膀胱/泌尿'};
    const bodyPart = wxBody[riWx]||'?';
    h += `<div class="hl"><b>日主${riGan}(${riWx})对应：</b>${bodyPart}——${riWx}被克时首当其冲</div>`;

    if (issues.length) {
        h += `<div class="hl">${issues.join('<br>')}</div>`;
    } else {
        h += `<div class="hl"><span class="tag tag-good">原局五行较为平和</span></div>`;
    }

    // 日主之禄检查（健康层面）
    const riLu = {甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'}[riGan];
    if (riLu && (rels.冲||[]).some(c=>c.includes(riLu)))
        h += `<div class="hl"><span class="tag tag-warn">日主之禄${riLu}被冲</span>——禄为身体根基，被冲则健康易受损，该大运流年需注意劳逸结合</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// 9. 当前运势
// ================================================================
function analyzeCurrent(riGan, d) {
    if (!d.currentDayun) return '';
    let h = `<div class="card"><h3>⏳ 当前运势 [大运+流年]</h3>`;
    const dy = d.currentDayun;

    h += `<div class="hl"><b>当前：</b>${d.currentAgeXusui}虚岁 | <b>大运${dy.pillar}(${dy.startAge}-${dy.endAge}岁)</b>`;
    const dyGanSS = getShishen(riGan, dy.pillar[0]);
    const dyZhiStage = getChangsheng(riGan, dy.pillar[1]);
    h += ` | 天干=${dyGanSS} | 地支${dy.pillar[1]}=${dyZhiStage}`;
    h += `</div>`;

    // 盖头截脚
    const dyGanWx = wxOf(dy.pillar[0]), dyZhiWx = wxOf(dy.pillar[1]);
    const harmMap = {木:'金',火:'水',土:'木',金:'火',水:'土'};
    if (dyGanWx && dyZhiWx && harmMap[dyGanWx]===dyZhiWx)
        h += `<div class="hl"><span class="tag tag-warn">盖头运</span>——天干好运被地支坏→福禄减半</div>`;

    // 大运力量
    h += `<div class="hl"><b>大运 vs 天干：</b><span class="tag tag-info">大运的力量 > 天干的力量</span>——大运地支是十年主旋律，天干是表象。</div>`;

    // 当前流年
    const now = new Date();
    const ref = new Date(1900,0,1);
    const days = Math.floor((new Date(now.getFullYear(),0,1) - ref)/86400000);
    const yearGan = STEMS[((10+days)%10+10)%10], yearZhi = BRANCHES[((10+days)%12+12)%12];
    const yearSS = getShishen(riGan, yearGan);
    h += `<div class="hl"><b>${now.getFullYear()}流年${yearGan}${yearZhi}：</b><span class="tag tag-info">${yearSS}</span>`;

    if (['正印','偏印','比肩','劫财'].includes(yearSS))
        h += ` <span class="tag tag-good">帮身年——利于发展</span>`;
    else if (['七杀'].includes(yearSS))
        h += ` <span class="tag tag-warn">压力年——注意健康/纠纷</span>`;
    else if (['正官'].includes(yearSS))
        h += ` <span class="tag tag-info">机遇年——有提升/成家机会</span>`;
    h += `</div>`;

    // 五行反目流年检查
    h += `<div class="hl"><b>五行反目警惕：</b>当年加强的五行若与原局对立五行同时有力→<span class="tag tag-warn">需查流月+流日</span>判断具体应期</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// 10. 性格
// ================================================================
function analyzePersonality(riGan, riWx, sz, bz) {
    let h = `<div class="card"><h3>🧠 五行性格速断</h3>`;
    const allStems3 = [...sz, ...bz.flatMap(b=>CANGAN[b]||[])];
    const wxCount = {};
    for (const s of allStems3) { const w=wxOf(s); wxCount[w]=(wxCount[w]||0)+1; }
    const sorted = Object.entries(wxCount).sort((a,b)=>b[1]-a[1]);
    const dominantWx = sorted[0]?.[0] || riWx;
    // Update references
    const allStems = allStems3;

    const personalities = {
        木:{pos:'仁慈、恻隐、直爽、柔和',neg:'胆怯、嫉妒、狭隘、固执'},
        火:{pos:'热情、礼貌、豪迈、坦诚',neg:'急躁、冲动、谎言、歹毒'},
        土:{pos:'忠孝、诚信、厚重、容忍',neg:'倔强、固执、愚蠢、封闭'},
        金:{pos:'刚强、果敢、豪侠、仗义',neg:'鲁莽、贪婪、刻薄、狠毒'},
        水:{pos:'聪明、机智、灵活、善变',neg:'多疑、偏激、阴谋、放纵'},
    };

    for (const [wx,count] of sorted) {
        const p = personalities[wx];
        if (!p) continue;
        const pct = Math.round(count/allStems.length*100);
        h += `<div class="hl"><b>${wx}(${pct}%)：</b>正面: ${p.pos} | 负面: ${p.neg}</div>`;
    }

    h += `<div class="hl" style="color:var(--dim);font-size:.8em">以最旺五行切入，正负面兼看。日主${riGan}=${riWx}为自我核心。</div>`;
    h += `</div>`;
    return h;
}

// ================================================================
// 11. 格局深度分析 (30+格局)
// ================================================================
function analyzeDeepPattern(riGan, riZhi, sz, bz, ws, d) {
    let h = `<div class="card"><h3>📐 格局深度分析 [30+格局速查]</h3>`;
    const ssS4 = d.shishenStems;
    const countSS = {食神:0,伤官:0,正财:0,偏财:0,正官:0,七杀:0,正印:0,偏印:0,比肩:0,劫财:0};
    const allStems4 = [...sz, ...bz.flatMap(b=>CANGAN[b]||[])];
    for (const s of allStems4) { const ss=getShishen(riGan,s); if (countSS[ss]!==undefined) countSS[ss]++; }
    const allStems = allStems4, ssS = ssS4;

    const patterns = [];

    // 检查各格局
    if (countSS['七杀']>=2 && countSS['正印']>=2) patterns.push({name:'杀印相生',level:'高',desc:'杀生印→印生身，权印双收'});
    if (countSS['食神']>=2 && countSS['七杀']>=2 && ws.level==='身旺') patterns.push({name:'食神制杀',level:'高',desc:'以技艺得权'});
    if (countSS['伤官']>=2 && countSS['正官']>=1) patterns.push({name:'伤官去官',level:'高',desc:'去忌得官，不论身强弱'});
    if (countSS['食神']>=3 && countSS['偏财']>=1 && d.shishenStems[1].shishen==='食神')
        patterns.push({name:'从儿格候选',level:'最高',desc:'需四条件:食神多+月令食神+不论强弱+食生财'});
    if (countSS['偏印']>=3 && countSS['正官']>=1)
        patterns.push({name:'枭旺+官虚透',level:'中',desc:'自己做生意(非体制)'});
    if (countSS['食神']>=2 && countSS['正财']>=2 && ws.level==='身旺')
        patterns.push({name:'食神生财',level:'高',desc:'身旺食泄生财→可大富'});
    if (countSS['比肩']+countSS['劫财']>=4 && countSS['正官']+countSS['七杀']===0)
        patterns.push({name:'旺极/专旺',level:'高',desc:'顺其旺势，忌官杀来犯'});

    // 内食神格
    const homeSS = (CANGAN[bz[2]]||[]).concat(CANGAN[bz[3]]||[]);
    if (homeSS.filter(c=>getShishen(riGan,c)==='食神').length>=2 && sz.filter(s=>getShishen(riGan,s)==='食神').length===0)
        patterns.push({name:'内食神格',level:'高',desc:'藏在支不露→被人吃(企业家)'});

    // 外食神格
    if (sz.filter(s=>getShishen(riGan,s)==='食神').length>=2)
        patterns.push({name:'外食神格',level:'中',desc:'透干→吃别人(技术专长)'});

    // 以禄当财
    if (countSS['正财']+countSS['偏财']===0 && countSS['正官']+countSS['七杀']===0 && countSS['食神']+countSS['伤官']<=1)
        patterns.push({name:'以禄当财',level:'中',desc:'财官食伤都无法用→禄当财'});

    if (patterns.length) {
        h += patterns.map(p => `<div class="hl"><b>${p.name}</b> <span class="tag ${p.level==='最高'?'tag-good':(p.level==='高'?'tag-info':'tag-neutral')}">${p.level}</span>——${p.desc}</div>`).join('');
    } else {
        h += `<div class="hl"><span class="tag tag-neutral">无特殊格局</span>——以平衡为第一法则，跟着大运走</div>`;
    }

    // 从格检查
    const hasGen = (CANGAN[bz[2]]||[]).some(c=>c===riGan||wxOf(c)===wxOf(riGan)||wxOf(c)==={木:'水',火:'木',土:'火',金:'土',水:'金'}[wxOf(riGan)]);
    if (!hasGen && (countSS['正财']+countSS['偏财']>=4 || countSS['七杀']+countSS['正官']>=4))
        patterns.push({name:'从格信号',level:'最高',desc:'日主无根→可能从财/从杀'});

    h += `</div>`;
    return h;
}

// ================================================================
// 12. 干支取象速查
// ================================================================
function analyzeGanzhiImage(riGan, riZhi, sz, bz, d) {
    let h = `<div class="card"><h3>🔍 干支取象速查</h3>`;

    const ganzhiImages = {
        甲子:{物:'大树旁水',身:'头+膀胱'},
        乙丑:{物:'花草旁坟墓',身:'肝+脾'},
        丙寅:{物:'太阳照林',身:'眼+胆'},
        丁卯:{物:'灯火映花',身:'心+肝'},
        戊辰:{物:'山包',身:'胃+腹'},
        己巳:{物:'田边砖厂',身:'脾+心'},
        庚午:{物:'大路通厅',身:'肠+心'},
        辛未:{物:'金饰近田',身:'肺+脊'},
        壬申:{物:'江河绕铁',身:'膀胱+骨'},
        癸酉:{物:'泉边停车',身:'肾+肺'},
        甲戌:{物:'大树旁窑',身:'头+腿'},
        乙亥:{物:'花草临水',身:'肝+肾'},
    };

    for (let i=0; i<4; i++) {
        const gz = [d.yearPillar, d.monthPillar, d.dayPillar, d.timePillar][i];
        const img = ganzhiImages[gz];
        const names = ['年柱(祖辈)','月柱(父母)','日柱(自身/配偶)','时柱(子女)'];
        if (img) {
            h += `<div class="hl"><b>${names[i]}${gz}：</b>物象: ${img.物} | 身象: ${img.身}</div>`;
        }
    }

    // 地支场所
    const bzPlaces = {子:'江河/池塘',丑:'坟墓/桥梁',寅:'山林/花园',卯:'道路/花草',
                      辰:'山包/寺观',巳:'砖厂/化工厂',午:'大厅/影院',未:'田地/厨房',
                      申:'钢厂/铁路',酉:'停车场/跑道',戌:'窑灶/寺庙',亥:'江河/歌舞厅'};
    h += `<div class="hl" style="font-size:.8em;color:var(--dim)"><b>地支场所：</b>${bz.map(b=>`${b}=${bzPlaces[b]||'?'}`).join(' | ')}</div>`;

    h += `</div>`;
    return h;
}

// ================================================================
// Utility: wuxing of stem
// ================================================================
function wxOf(stem) {
    return {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[stem]||'';
}

