// ziwei.js — 紫微斗数排盘引擎 (JavaScript)
// Ported from ziwei_engine.py for GitHub Pages deployment
// 文墨天机/iztro 兼容算法

const ZW_STEMS = '甲乙丙丁戊己庚辛壬癸';
const ZW_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const ZW_PALACES = ['命宫','父母','福德','田宅','官禄','仆役','迁移','疾厄','财帛','子女','夫妻','兄弟'];

const ZW_TIGER = {甲:'丙',乙:'戊',丙:'庚',丁:'壬',戊:'甲',己:'丙',庚:'戊',辛:'庚',壬:'壬',癸:'甲'};
const ZW_RAT = {甲:'甲',乙:'丙',丙:'戊',丁:'庚',戊:'壬',己:'甲',庚:'丙',辛:'戊',壬:'庚',癸:'壬'};

const ZW_SIHUA = {
甲:['廉贞','破军','武曲','太阳'],乙:['天机','天梁','紫微','太阴'],
丙:['天同','天机','文昌','廉贞'],丁:['太阴','天同','天机','巨门'],
戊:['贪狼','太阴','右弼','天机'],己:['武曲','贪狼','天梁','文曲'],
庚:['太阳','武曲','太阴','天同'],辛:['巨门','太阳','文曲','文昌'],
壬:['天梁','紫微','左辅','武曲'],癸:['破军','巨门','太阴','贪狼'],
};

const ZW_BRIGHTNESS = {
紫微:['旺','旺','得','旺','庙','庙','旺','旺','得','旺','平','庙'],
天机:['得','旺','利','平','庙','陷','得','旺','利','平','庙','陷'],
太阳:['旺','庙','旺','旺','旺','得','得','陷','不','陷','陷','不'],
武曲:['得','利','庙','平','旺','庙','得','利','庙','平','旺','庙'],
天同:['利','平','平','庙','陷','不','旺','平','平','庙','旺','不'],
廉贞:['庙','平','利','陷','平','利','庙','平','利','陷','平','利'],
天府:['庙','得','庙','得','旺','庙','得','旺','庙','得','庙','庙'],
太阴:['旺','陷','陷','陷','不','不','利','不','旺','庙','庙','庙'],
贪狼:['平','利','庙','陷','旺','庙','平','利','庙','陷','旺','庙'],
巨门:['庙','庙','陷','旺','旺','不','庙','庙','陷','旺','旺','不'],
天相:['庙','陷','得','得','庙','得','庙','陷','得','得','庙','庙'],
天梁:['庙','庙','庙','陷','庙','旺','陷','得','庙','陷','庙','旺'],
七杀:['庙','旺','庙','平','旺','庙','庙','庙','庙','平','旺','庙'],
破军:['得','陷','旺','平','庙','旺','得','陷','旺','平','庙','旺'],
文昌:['陷','利','得','庙','陷','利','得','庙','陷','利','得','庙'],
文曲:['平','旺','得','庙','陷','旺','得','庙','陷','旺','得','庙'],
};
const ZW_BRI_CN = {庙:'庙',旺:'旺',得:'得',利:'利',平:'平',陷:'陷',不:'不'};

const ZW_GROUP = [['紫微',0],['天机',1],[null,2],['太阳',3],['武曲',4],['天同',5],[null,6],[null,7],['廉贞',8]];
const TF_GROUP = [['天府',0],['太阴',1],['贪狼',2],['巨门',3],['天相',4],['天梁',5],['七杀',6],[null,7],[null,8],[null,9],['破军',10]];

function zw_fix(n, m = 12) { while (n < 0) n += m; while (n >= m) n -= m; return n; }
function eb2idx(b) { return zw_fix(ZW_BRANCHES.indexOf(b) - ZW_BRANCHES.indexOf('寅')); }

// =========== ZIWEI BAZI (shared with bazi but simplified) ===========
function zw_getBazi(solarDateStr, timeIndex) {
    const d = parseDate(solarDateStr);
    const ref = new Date(1900, 0, 1);
    const days = Math.floor((d - ref) / 86400000);
    const dayCycle = ((10 + days) % 60 + 60) % 60;
    const riGan = ZW_STEMS[dayCycle % 10], riZhi = ZW_BRANCHES[dayCycle % 12];

    // Year pillar
    let year = d.getFullYear();
    const yrKey = String(year);
    if (SOLAR_TERMS[yrKey]) {
        const lc = zw_parseTerm(yrKey, 'beginning_of_spring');
        if (lc && d < lc) year--;
    }
    const nianGan = ZW_STEMS[((year - 4) % 10 + 10) % 10];
    const nianZhi = ZW_BRANCHES[((year - 4) % 12 + 12) % 12];

    // Month pillar
    const termToMonth = {beginning_of_spring:1,waking_of_insects:2,pure_brightness:3,beginning_of_summer:4,grain_in_beard:5,lesser_heat:6,beginning_of_autumn:7,white_dew:8,cold_dew:9,beginning_of_winter:10,greater_snow:11,lesser_cold:12};
    let lunarMonth = 12;
    if (SOLAR_TERMS[yrKey]) {
        const sorted = Object.entries(SOLAR_TERMS[yrKey]).map(([k,v]) => [k,zw_parseTerm(yrKey,k)]).filter(([,dt]) => dt).sort((a,b) => a[1]-b[1]);
        for (const [tkey, tdt] of sorted) {
            if (termToMonth[tkey] && d >= tdt) lunarMonth = termToMonth[tkey];
        }
    }
    const yinGan = ZW_TIGER[nianGan];
    const yueGan = ZW_STEMS[(ZW_STEMS.indexOf(yinGan) + lunarMonth - 1) % 10];
    const yueZhi = ZW_BRANCHES[(2 + lunarMonth - 1) % 12];

    // Time pillar
    const hIdx = timeIndex < 12 ? timeIndex : 0;
    const ziGan = ZW_RAT[riGan];
    const shiGan = ZW_STEMS[(ZW_STEMS.indexOf(ziGan) + hIdx) % 10];
    const shiZhi = ZW_BRANCHES[hIdx];

    return [nianGan+nianZhi, yueGan+yueZhi, riGan+riZhi, shiGan+shiZhi];
}

function zw_parseTerm(yrKey, termKey) {
    const val = SOLAR_TERMS[yrKey] && SOLAR_TERMS[yrKey][termKey];
    if (!val) return null;
    const [dp, tp] = val.split(' ');
    const [y, m, d] = dp.split('-').map(Number);
    const [h, min] = tp.split(':').map(Number);
    return new Date(y, m-1, d, h, min);
}

function zw_lunarMonth(solarDateStr) {
    const d = parseDate(solarDateStr);
    const yrKey = String(d.getFullYear());
    if (!SOLAR_TERMS[yrKey]) return [12, 1];
    const termToMonth = {lesser_cold:12,beginning_of_spring:1,waking_of_insects:2,pure_brightness:3,beginning_of_summer:4,grain_in_beard:5,lesser_heat:6,beginning_of_autumn:7,white_dew:8,cold_dew:9,beginning_of_winter:10,greater_snow:11};
    let lm = 12, lmKey = 'lesser_cold';
    const sorted = Object.entries(SOLAR_TERMS[yrKey]).map(([k,v]) => [k,zw_parseTerm(yrKey,k)]).filter(([,dt]) => dt).sort((a,b) => a[1]-b[1]);
    for (const [tkey, tdt] of sorted) {
        if (termToMonth[tkey] !== undefined && d >= tdt) { lm = termToMonth[tkey]; lmKey = tkey; }
    }
    const monthStart = zw_parseTerm(yrKey, lmKey);
    if (!monthStart) return [lm, 1];
    const ld = Math.min(Math.floor((d - monthStart) / 86400000) + 1, 30);
    return [lm, ld];
}

function zw_getFiveElems(gan, zhi) {
    const gn = Math.floor(ZW_STEMS.indexOf(gan) / 2) + 1;
    const zn = zw_fix(ZW_BRANCHES.indexOf(zhi), 6);
    const zn2 = Math.floor(zn / 2) + 1;
    let v = gn + zn2;
    while (v > 5) v -= 5;
    const mp = {1:['木',3],2:['金',4],3:['水',2],4:['火',6],5:['土',5]};
    return mp[v] || ['木',3];
}

function zw_getZiwei(lunarDay, feVal) {
    let offset = -1;
    while (true) {
        offset++;
        if ((lunarDay + offset) % feVal === 0) break;
    }
    const q = ((lunarDay + offset) / feVal) % 12;
    let zw = q - 1;
    zw += (offset % 2 === 0) ? offset : -offset;
    zw = zw_fix(zw);
    return [zw, zw_fix(12 - zw)];
}

function zw_minorStars(solarDateStr, ti, soulIdx, bodyIdx, nianGan, nianZhi, lm) {
    const minors = Array.from({length:12}, () => ({}));
    function add(name, idx) {
        if (idx >= 0 && idx < 12) {
            const bri = ZW_BRIGHTNESS[name] || [];
            const b = bri[zw_fix(idx)] || '';
            minors[idx][name] = ZW_BRI_CN[b] || b;
        }
    }

    add('文昌', zw_fix(eb2idx('戌') - ti));
    add('文曲', zw_fix(eb2idx('辰') + ti));
    add('地空', zw_fix(eb2idx('亥') - ti));
    add('地劫', zw_fix(eb2idx('亥') + ti));
    add('台辅', zw_fix(eb2idx('午') + ti));
    add('封诰', zw_fix(eb2idx('寅') + ti));
    add('左辅', zw_fix(eb2idx('辰') + lm - 1));
    add('右弼', zw_fix(eb2idx('戌') - (lm - 1)));

    // 火星铃星
    const hlMap = {'寅午戌':['丑','卯'],'申子辰':['寅','戌'],'巳酉丑':['卯','戌'],'亥卯未':['酉','戌']};
    for (const [keys, [hb, lb]] of Object.entries(hlMap)) {
        if (keys.includes(nianZhi)) { add('火星', zw_fix(eb2idx(hb) + ti)); add('铃星', zw_fix(eb2idx(lb) + ti)); }
    }

    // 禄存擎羊陀罗
    const luMap = {甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
    const lu = eb2idx(luMap[nianGan] || '寅');
    add('禄存', lu); add('擎羊', zw_fix(lu+1)); add('陀罗', zw_fix(lu-1));

    // 天马
    const maMap = {'寅午戌':'申','申子辰':'寅','巳酉丑':'亥','亥卯未':'巳'};
    for (const [keys, m] of Object.entries(maMap)) {
        if (keys.includes(nianZhi)) add('天马', eb2idx(m));
    }

    // 天魁天钺
    const kuiMap = {'甲戊庚':['丑','未'],'乙己':['子','申'],'辛':['午','寅'],'丙丁':['亥','酉'],'壬癸':['卯','巳']};
    for (const [keys, [k, y]] of Object.entries(kuiMap)) {
        if (keys.includes(nianGan)) { add('天魁', eb2idx(k)); add('天钺', eb2idx(y)); }
    }

    add('天刑', zw_fix(eb2idx('酉') + lm - 1));
    add('天姚', zw_fix(eb2idx('丑') + lm - 1));

    const hl2 = zw_fix(eb2idx('卯') - ZW_BRANCHES.indexOf(nianZhi));
    add('红鸾', hl2); add('天喜', zw_fix(hl2 + 6));

    return minors;
}

function calculateZiwei(solarDateStr, timeStr, gender) {
    const [h] = timeStr.split(':').map(Number);
    const ti = (h >= 23 || h < 1) ? 0 : Math.ceil(h / 2);

    const [nian, yue, ri, shi] = zw_getBazi(solarDateStr, ti);
    const nianGan = nian[0], nianZhi = nian[1];

    const [lm, ld] = zw_lunarMonth(solarDateStr);
    const lmIdx = lm - 1;
    const soulIdx = zw_fix(lmIdx - ti);
    const bodyIdx = zw_fix(lmIdx + ti);

    const yinGan = ZW_TIGER[nianGan];
    const sGan = ZW_STEMS[zw_fix(ZW_STEMS.indexOf(yinGan) + soulIdx, 10)];
    const sZhi = ZW_BRANCHES[zw_fix(soulIdx + ZW_BRANCHES.indexOf('寅'))];
    const soulGZ = sGan + sZhi;

    const [elem, feVal] = zw_getFiveElems(sGan, sZhi);
    const [zwIdx, tfIdx] = zw_getZiwei(ld, feVal);
    const zwBranch = ZW_BRANCHES[zw_fix(zwIdx + ZW_BRANCHES.indexOf('寅'))];
    const tfBranch = ZW_BRANCHES[zw_fix(tfIdx + ZW_BRANCHES.indexOf('寅'))];

    // Major stars
    const majors = Array.from({length:12}, () => []);
    for (const [name, off] of ZW_GROUP) {
        if (name) majors[zw_fix(zwIdx - off)].push(name);
    }
    for (const [name, off] of TF_GROUP) {
        if (name) majors[zw_fix(tfIdx + off)].push(name);
    }

    // Sihua
    const [lu, quan, ke, ji] = ZW_SIHUA[nianGan] || ['','','',''];
    const sihua = {[lu]:'禄',[quan]:'权',[ke]:'科',[ji]:'忌'};

    // Minor stars
    const minors = zw_minorStars(solarDateStr, ti, soulIdx, bodyIdx, nianGan, nianZhi, lm);

    // Decadals
    const isYang = '甲丙戊庚壬'.includes(nianGan);
    const shunpai = (isYang && gender === 'male') || (!isYang && gender === 'female');
    const decadals = [];
    for (let i = 0; i < 12; i++) {
        const idx = shunpai ? zw_fix(soulIdx + i) : zw_fix(soulIdx - i);
        const dcGan = ZW_STEMS[zw_fix(ZW_STEMS.indexOf(yinGan) + idx, 10)];
        const dcZhi = ZW_BRANCHES[zw_fix(ZW_BRANCHES.indexOf('寅') + idx)];
        decadals.push({
            range: `${feVal+10*i}-${feVal+10*i+9}`,
            stem: dcGan, branch: dcZhi,
            idx,
        });
    }

    // Current age
    const birthYear = parseInt(solarDateStr.split('-')[0]);
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    if (today.getMonth()+1 < parseInt(solarDateStr.split('-')[1]) ||
        (today.getMonth()+1 === parseInt(solarDateStr.split('-')[1]) && today.getDate() < parseInt(solarDateStr.split('-')[2]))) {
        age--;
    }
    const dyIdx = Math.floor((age - feVal) / 10);
    const curDC = decadals[Math.min(dyIdx, 11)] || decadals[0];

    // Build palace data
    const palaces = [];
    for (let i = 0; i < 12; i++) {
        const eb = ZW_BRANCHES[zw_fix(i + ZW_BRANCHES.indexOf('寅'))];
        const pname = ZW_PALACES[zw_fix(i - soulIdx)];
        palaces.push({
            idx: i, branch: eb, name: pname,
            isSoul: i === soulIdx, isBody: i === bodyIdx,
            majors: majors[i].map(s => {
                const bri = ZW_BRIGHTNESS[s] || [];
                return {star:s, brightness: ZW_BRI_CN[bri[zw_fix(i)]] || bri[zw_fix(i)] || '', sihua: sihua[s] || ''};
            }),
            minors: Object.entries(minors[i] || {}).map(([k,v]) => ({star:k, brightness:v})),
        });
    }

    return {
        bazi: `${nian} ${yue} ${ri} ${shi}`,
        riZhu: ri, riGan: ri[0],
        soulGZ, soulIdx, bodyIdx,
        fiveElements: `${elem}${feVal}局`, feVal,
        zwBranch, tfBranch,
        sihua: {lu, quan, ke, ji},
        palaces,
        decadals,
        currentDecadal: curDC,
        currentAge: age,
        // Layout for display
        layout: [
            ['巳','午','未','申'],
            ['辰','','','酉'],
            ['卯','','','戌'],
            ['寅','丑','子','亥'],
        ],
    };
}

