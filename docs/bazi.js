// bazi.js — 金镖门盲派八字排盘引擎 (JavaScript)
// Ported from bazi_engine.py for GitHub Pages deployment

var STEMS = '甲乙丙丁戊己庚辛壬癸';
var BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
var YANG_STEMS = {甲:1,丙:1,戊:1,庚:1,壬:1};

// Generate 60 Jiazi
var JIAZI2 = [];
for (let i = 0; i < 60; i++) {
    JIAZI2.push(STEMS[i % 10] + BRANCHES[i % 12]);
}
var JIAZI = JIAZI2;

// 五虎遁
var TIGER_RULE = {甲:'丙',乙:'戊',丙:'庚',丁:'壬',戊:'甲',己:'丙',庚:'戊',辛:'庚',壬:'壬',癸:'甲'};
// 五鼠遁
var RAT_RULE = {甲:'甲',乙:'丙',丙:'戊',丁:'庚',戊:'壬',己:'甲',庚:'丙',辛:'戊',壬:'庚',癸:'壬'};

// 纳音
var NAYIN_TABLE = {
甲子:'海中金',乙丑:'海中金',丙寅:'炉中火',丁卯:'炉中火',戊辰:'大林木',己巳:'大林木',
庚午:'路旁土',辛未:'路旁土',壬申:'剑锋金',癸酉:'剑锋金',甲戌:'山头火',乙亥:'山头火',
丙子:'涧下水',丁丑:'涧下水',戊寅:'城头土',己卯:'城头土',庚辰:'白蜡金',辛巳:'白蜡金',
壬午:'杨柳木',癸未:'杨柳木',甲申:'泉中水',乙酉:'泉中水',丙戌:'屋上土',丁亥:'屋上土',
戊子:'霹雳火',己丑:'霹雳火',庚寅:'松柏木',辛卯:'松柏木',壬辰:'长流水',癸巳:'长流水',
甲午:'沙中金',乙未:'沙中金',丙申:'山下火',丁酉:'山下火',戊戌:'平地木',己亥:'平地木',
庚子:'壁上土',辛丑:'壁上土',壬寅:'金箔金',癸卯:'金箔金',甲辰:'覆灯火',乙巳:'覆灯火',
丙午:'天河水',丁未:'天河水',戊申:'大驿土',己酉:'大驿土',庚戌:'钗钏金',辛亥:'钗钏金',
壬子:'桑柘木',癸丑:'桑柘木',甲寅:'大溪水',乙卯:'大溪水',丙辰:'沙中土',丁巳:'沙中土',
戊午:'天上火',己未:'天上火',庚申:'石榴木',辛酉:'石榴木',壬戌:'大海水',癸亥:'大海水',
};

// 纳音五行
var NAYIN_WUXING = {};
for (const [k, v] of Object.entries(NAYIN_TABLE)) {
    const w = v.slice(-1);
    NAYIN_WUXING[k] = w;
}

// 十二长生
var TWELVE_STAGES = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];
var CHANGSHENG_MAP = {
甲:['亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌'],
乙:['午','巳','辰','卯','寅','丑','子','亥','戌','酉','申','未'],
丙:['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'],
丁:['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'],
戊:['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'],
己:['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'],
庚:['巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰'],
辛:['子','亥','戌','酉','申','未','午','巳','辰','卯','寅','丑'],
壬:['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'],
癸:['卯','寅','丑','子','亥','戌','酉','申','未','午','巳','辰'],
};

// 藏干
var CANGAN = {
子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],
辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],
申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲'],
};

// 旬空
var XUN_KONG = {
甲子:['戌','亥'],甲戌:['申','酉'],甲申:['午','未'],
甲午:['辰','巳'],甲辰:['寅','卯'],甲寅:['子','丑'],
};

// 地支关系
var CHONG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
var HE = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
var CHUAN = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];

// =========== UTILS ===========
function fixJS(n, m = 12) {
    while (n < 0) n += m;
    while (n >= m) n -= m;
    return n;
}

function parseDate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function dateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

// =========== DAY PILLAR ===========
function calcDayPillar(dateStr) {
    const ref = new Date(1900, 0, 1); // 1900-01-01 = 甲戌 (idx 10)
    const d = parseDate(dateStr);
    const days = Math.floor((d - ref) / 86400000);
    const idx = ((10 + days) % 60 + 60) % 60;
    return JIAZI[idx];
}

// =========== YEAR PILLAR ===========
function calcYearPillar(dateStr) {
    const d = parseDate(dateStr);
    let year = d.getFullYear();
    const yrKey = String(year);
    if (!SOLAR_TERMS[yrKey]) {
        // Try previous year
        year--;
    }
    const yrKey2 = String(year);
    if (!SOLAR_TERMS[yrKey2]) return '??'; // fallback

    const lichun = parseSolarTerm(yrKey2, 'beginning_of_spring');
    if (d < lichun) year--;
    const gan = STEMS[((year - 4) % 10 + 10) % 10];
    const zhi = BRANCHES[((year - 4) % 12 + 12) % 12];
    return gan + zhi;
}

function parseSolarTerm(yearKey, termKey) {
    const val = SOLAR_TERMS[yearKey] && SOLAR_TERMS[yearKey][termKey];
    if (!val) return null;
    const [datePart, timePart] = val.split(' ');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    return new Date(y, m-1, d, h, min);
}

// =========== MONTH PILLAR ===========
function calcMonthPillar(dateStr, nianGan) {
    const d = parseDate(dateStr);
    const yrKey = String(d.getFullYear());
    if (!SOLAR_TERMS[yrKey]) return ['??', 0];

    const termToMonth = {
        beginning_of_spring:1, waking_of_insects:2, pure_brightness:3,
        beginning_of_summer:4, grain_in_beard:5, lesser_heat:6,
        beginning_of_autumn:7, white_dew:8, cold_dew:9,
        beginning_of_winter:10, greater_snow:11, lesser_cold:12,
    };

    // Sort terms by date
    const sorted = Object.entries(SOLAR_TERMS[yrKey])
        .map(([k, v]) => [k, parseSolarTerm(yrKey, k)])
        .filter(([k, dt]) => dt !== null)
        .sort((a, b) => a[1] - b[1]);

    let lunarMonth = 12;
    for (const [tkey, tdt] of sorted) {
        if (termToMonth[tkey] && d >= tdt) {
            lunarMonth = termToMonth[tkey];
        }
    }

    // Check next year's lesser_cold for January births
    const nextYr = String(d.getFullYear() + 1);
    if (nextYr in SOLAR_TERMS && SOLAR_TERMS[nextYr].lesser_cold) {
        const nextLC = parseSolarTerm(nextYr, 'lesser_cold');
        if (nextLC && d >= nextLC) lunarMonth = 12;
    }

    const yinGan = TIGER_RULE[nianGan] || '甲';
    const yinIdx = STEMS.indexOf(yinGan);
    const yueGan = STEMS[(yinIdx + lunarMonth - 1) % 10];
    const yueZhi = BRANCHES[(2 + lunarMonth - 1) % 12];
    return [yueGan + yueZhi, lunarMonth];
}

// =========== TIME PILLAR ===========
function calcTimePillar(riGan, timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    // Map to shichen index
    let shiIdx;
    if (h >= 23 || h < 1) shiIdx = 0; // 子
    else if (h >= 1 && h < 3) shiIdx = 1; // 丑
    else if (h >= 3 && h < 5) shiIdx = 2; // 寅
    else if (h >= 5 && h < 7) shiIdx = 3; // 卯
    else if (h >= 7 && h < 9) shiIdx = 4; // 辰
    else if (h >= 9 && h < 11) shiIdx = 5; // 巳
    else if (h >= 11 && h < 13) shiIdx = 6; // 午
    else if (h >= 13 && h < 15) shiIdx = 7; // 未
    else if (h >= 15 && h < 17) shiIdx = 8; // 申
    else if (h >= 17 && h < 19) shiIdx = 9; // 酉
    else if (h >= 19 && h < 21) shiIdx = 10; // 戌
    else shiIdx = 11; // 亥

    const ziGan = RAT_RULE[riGan] || '甲';
    const shiGan = STEMS[(STEMS.indexOf(ziGan) + shiIdx) % 10];
    const shiZhi = BRANCHES[shiIdx];
    return [shiGan + shiZhi, shiZhi];
}

function getChineseHour(timeStr) {
    const names = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];
    const [h] = timeStr.split(':').map(Number);
    if (h >= 23 || h < 1) return names[0];
    for (let i = 1; i < 12; i++) {
        if (h >= i*2-1 && h < i*2+1) return names[i];
    }
    return names[0];
}

// =========== NAYIN & TWELVE STAGES ===========
function getNayin(pillar) { return NAYIN_TABLE[pillar] || '?'; }
function getNayinWuxing(pillar) { return NAYIN_WUXING[pillar] || '?'; }

function getChangsheng(stem, branch) {
    const lst = CHANGSHENG_MAP[stem];
    if (!lst) return '?';
    const idx = lst.indexOf(branch);
    return idx >= 0 ? TWELVE_STAGES[idx] : '?';
}

// =========== TEN GODS ===========
function getShishen(dayStem, otherStem) {
    if (dayStem === otherStem) return '比肩';
    const pairs = [['甲','乙'],['丙','丁'],['戊','己'],['庚','辛'],['壬','癸']];

    function sameWuxing(a, b) {
        for (const [x, y] of pairs) if ((a===x||a===y) && (b===x||b===y)) return true;
        return false;
    }
    if (sameWuxing(dayStem, otherStem) && dayStem !== otherStem) return '劫财';

    const dsYang = YANG_STEMS[dayStem];
    const osYang = YANG_STEMS[otherStem];
    const sameYY = dsYang === osYang;

    function check(map, catSame, catDiff) {
        for (const [ds, targets] of map) {
            if (dayStem === ds && targets.includes(otherStem)) {
                return sameYY ? catSame : catDiff;
            }
        }
        return null;
    }

    // 我生: 食神/伤官
    const shengMap = [
        ['甲','丙丁'],['丙','戊己'],['戊','庚辛'],['庚','壬癸'],['壬','甲乙'],
        ['乙','丁丙'],['丁','己戊'],['己','辛庚'],['辛','癸壬'],['癸','乙甲'],
    ];
    let r = check(shengMap, '食神', '伤官'); if (r) return r;

    // 我克: 偏财/正财
    const keMap = [
        ['甲','戊己'],['戊','壬癸'],['壬','丙丁'],['丙','庚辛'],['庚','甲乙'],
        ['乙','己戊'],['己','癸壬'],['癸','丁丙'],['丁','辛庚'],['辛','乙甲'],
    ];
    r = check(keMap, '偏财', '正财'); if (r) return r;

    // 生我: 偏印/正印
    const bsMap = [
        ['甲','壬癸'],['壬','庚辛'],['庚','戊己'],['戊','丙丁'],['丙','甲乙'],
        ['乙','癸壬'],['癸','辛庚'],['辛','己戊'],['己','丁丙'],['丁','乙甲'],
    ];
    r = check(bsMap, '偏印', '正印'); if (r) return r;

    // 克我: 七杀/正官
    const bkMap = [
        ['甲','庚辛'],['庚','丙丁'],['丙','壬癸'],['壬','戊己'],['戊','甲乙'],
        ['乙','辛庚'],['辛','丁丙'],['丁','癸壬'],['癸','己戊'],['己','乙甲'],
    ];
    r = check(bkMap, '七杀', '正官'); if (r) return r;

    return '?';
}

// =========== KONG WANG ===========
function getXunKong(dayPillar) {
    const ds = dayPillar[0], db = dayPillar[1];
    const dsi = STEMS.indexOf(ds), dbi = BRANCHES.indexOf(db);
    for (let off = 0; off < 60; off++) {
        const ts = ((dsi - off) % 10 + 10) % 10;
        const tb = ((dbi - off) % 12 + 12) % 12;
        if (STEMS[ts] === '甲' && ts === tb) {
            const xunHead = '甲' + BRANCHES[tb];
            return XUN_KONG[xunHead] || ['?','?'];
        }
    }
    return ['?','?'];
}

// =========== BRANCH RELATIONS ===========
function getBranchRelations(branches) {
    const rels = {冲:[],合:[],穿:[],拱:[],三合:[]};

    for (const [a, b] of CHONG) {
        if (branches.includes(a) && branches.includes(b)) rels.冲.push(a+b+'冲');
    }
    for (const [a, b] of HE) {
        if (branches.includes(a) && branches.includes(b)) rels.合.push(a+b+'合');
    }
    for (const [a, b] of CHUAN) {
        if (branches.includes(a) && branches.includes(b)) rels.穿.push(a+b+'穿');
    }

    // 拱局
    const archChecks = [
        [['寅','戌'],'午','火'],
        [['巳','丑'],'酉','金'],
        [['申','辰'],'子','水'],
        [['亥','未'],'卯','木'],
    ];
    for (const [[a,b], res, wu] of archChecks) {
        if (branches.includes(a) && branches.includes(b)) {
            rels.拱.push(a+b+'拱'+res+wu);
        }
    }

    // 三合
    const sanheSets = [
        [['申','子','辰'],'水'],
        [['亥','卯','未'],'木'],
        [['寅','午','戌'],'火'],
        [['巳','酉','丑'],'金'],
    ];
    for (const [trio, wu] of sanheSets) {
        const cnt = trio.filter(b => branches.includes(b)).length;
        if (cnt >= 2) {
            const missing = trio.filter(b => !branches.includes(b));
            rels.三合.push(trio.join('')+'合'+wu+'局'+(missing.length?'(缺'+missing[0]+')':''));
        }
    }

    // 刑
    const xing = [];
    const xingGroups = [
        [['寅','巳','申'],'无恩之刑'],
        [['丑','戌','未'],'恃势之刑'],
        [['子','卯'],'无礼之刑'],
    ];
    for (const [group, desc] of xingGroups) {
        const present = group.filter(b => branches.includes(b));
        if (present.length >= 2) xing.push(present.join('')+desc);
    }
    for (const b of ['辰','午','酉','亥']) {
        if (branches.filter(x => x===b).length >= 2) xing.push(b+b+'自刑');
    }
    if (xing.length) rels.刑 = xing;

    return rels;
}

// =========== TAI YUAN ===========
function calcTaiyuan(monthPillar) {
    const yg = monthPillar[0], yz = monthPillar[1];
    const taiGan = STEMS[(STEMS.indexOf(yg) + 1) % 10];
    const taiZhi = BRANCHES[(BRANCHES.indexOf(yz) + 3) % 12];
    return taiGan + taiZhi;
}

// =========== DA YUN ===========
function calcDayun(dateStr, timeStr, nianGan, yueGan, yueZhi, gender) {
    const d = parseDate(dateStr);
    const [h, m] = timeStr.split(':').map(Number);
    const birthDT = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);

    const isYang = YANG_STEMS[nianGan];
    const shunpai = (isYang && gender === 'male') || (!isYang && gender === 'female');
    const direction = shunpai ? '顺排' : '逆排';

    // Build list of 节
    const jieKeys = [
        'beginning_of_spring','waking_of_insects','pure_brightness',
        'beginning_of_summer','grain_in_beard','lesser_heat',
        'beginning_of_autumn','white_dew','cold_dew',
        'beginning_of_winter','greater_snow','lesser_cold'
    ];
    const jieNames = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];

    const allJie = [];
    for (const yrKey of [String(d.getFullYear()-1), String(d.getFullYear()), String(d.getFullYear()+1)]) {
        if (!SOLAR_TERMS[yrKey]) continue;
        for (let i = 0; i < jieKeys.length; i++) {
            const val = SOLAR_TERMS[yrKey][jieKeys[i]];
            if (!val) continue;
            const dt = parseSolarTerm(yrKey, jieKeys[i]);
            if (dt) allJie.push([dt, jieKeys[i], jieNames[i]]);
        }
    }
    allJie.sort((a, b) => a[0] - b[0]);

    // Find nearest jie in correct direction
    let targetJie = null;
    if (shunpai) {
        for (const [dt, key, name] of allJie) {
            if (dt > birthDT) { targetJie = [dt, key, name]; break; }
        }
    } else {
        for (let i = allJie.length - 1; i >= 0; i--) {
            if (allJie[i][0] < birthDT) { targetJie = allJie[i]; break; }
        }
    }

    let deltaDays = 0, qiyunAge = 0;
    if (targetJie) {
        deltaDays = Math.abs(targetJie[0] - birthDT) / 86400000;
        qiyunAge = deltaDays / 3;
    }

    const qiyunYears = Math.floor(qiyunAge);
    const qiyunMonths = Math.floor((qiyunAge - qiyunYears) * 12);

    // Build dayun steps
    const steps = [];
    if (shunpai) {
        const nextGan = STEMS[(STEMS.indexOf(yueGan) + 1) % 10];
        const nextZhi = BRANCHES[(BRANCHES.indexOf(yueZhi) + 1) % 12];
        for (let i = 0; i < 10; i++) {
            const dyGan = STEMS[(STEMS.indexOf(nextGan) + i) % 10];
            const dyZhi = BRANCHES[(BRANCHES.indexOf(nextZhi) + i) % 12];
            steps.push({
                pillar: dyGan + dyZhi,
                startAge: Math.round((qiyunAge + i * 10) * 10) / 10,
                endAge: Math.round((qiyunAge + (i + 1) * 10) * 10) / 10,
                index: i + 1,
            });
        }
    } else {
        const prevGan = STEMS[((STEMS.indexOf(yueGan) - 1) % 10 + 10) % 10];
        const prevZhi = BRANCHES[((BRANCHES.indexOf(yueZhi) - 1) % 12 + 12) % 12];
        for (let i = 0; i < 10; i++) {
            const dyGan = STEMS[((STEMS.indexOf(prevGan) - i) % 10 + 10) % 10];
            const dyZhi = BRANCHES[((BRANCHES.indexOf(prevZhi) - i) % 12 + 12) % 12];
            steps.push({
                pillar: dyGan + dyZhi,
                startAge: Math.round((qiyunAge + i * 10) * 10) / 10,
                endAge: Math.round((qiyunAge + (i + 1) * 10) * 10) / 10,
                index: i + 1,
            });
        }
    }

    return {
        direction, deltaDays: Math.round(deltaDays * 100) / 100,
        qiyunAge: qiyunYears, qiyunMonths,
        targetJie: targetJie ? `${targetJie[2]}(${targetJie[0].toISOString().slice(0,16).replace('T',' ')})` : 'N/A',
        steps,
    };
}

function getCurrentDayun(dayunData, currentAge) {
    for (const step of dayunData.steps) {
        if (step.startAge <= currentAge && currentAge < step.endAge) return step;
    }
    return null;
}

// =========== WANG SHUAI ===========
function analyzeWangshuai(riGan, yueZhi, allBranches, allStems) {
    const riWuxingMap = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    const shengWo = {木:'水',火:'木',土:'火',金:'土',水:'金'};
    const keWo = {木:'金',火:'水',土:'木',金:'火',水:'土'};
    const riWx = riWuxingMap[riGan];

    let support = 0, oppose = 0;

    for (const s of allStems) {
        const sw = riWuxingMap[s];
        if (sw === riWx || sw === shengWo[riWx]) support++;
        else if (sw === keWo[riWx]) oppose++;
    }

    for (const b of allBranches) {
        for (const c of (CANGAN[b] || [])) {
            const sw = riWuxingMap[c];
            if (sw === riWx || sw === shengWo[riWx]) support++;
            else if (sw === keWo[riWx]) oppose++;
        }
    }

    const stage = getChangsheng(riGan, yueZhi);
    let level = '中和';
    if (support > oppose + 2) level = '身旺';
    else if (support < oppose - 1) level = '身弱';

    return { stage, support, oppose, level };
}

// =========== MAIN ===========
function calculateBazi(solarDateStr, timeStr, gender) {
    const d = parseDate(solarDateStr);

    // Four pillars
    const yearPillar = calcYearPillar(solarDateStr);
    const nianGan = yearPillar[0], nianZhi = yearPillar[1];
    const [monthPillar, lunarMonth] = calcMonthPillar(solarDateStr, nianGan);
    const yueGan = monthPillar[0], yueZhi = monthPillar[1];
    const dayPillar = calcDayPillar(solarDateStr);
    const riGan = dayPillar[0], riZhi = dayPillar[1];
    const [timePillar, shiZhi] = calcTimePillar(riGan, timeStr);
    const shiGan = timePillar[0];
    const chineseHour = getChineseHour(timeStr);

    const pillars = [yearPillar, monthPillar, dayPillar, timePillar];
    const pillarNames = ['年柱','月柱','日柱','时柱'];
    const branchesList = [nianZhi, yueZhi, riZhi, shiZhi];
    const stemsList = [nianGan, yueGan, riGan, shiGan];

    // Nayin
    const nayinData = pillars.map((p, i) => ({
        pillar: p, name: pillarNames[i], nayin: getNayin(p), wuxing: getNayinWuxing(p),
    }));

    // Dayun
    const dayun = calcDayun(solarDateStr, timeStr, nianGan, yueGan, yueZhi, gender);

    // Changsheng
    const changshengData = pillars.map((p, i) => ({
        pillar: p, name: pillarNames[i], branch: branchesList[i],
        stage: getChangsheng(riGan, branchesList[i]),
    }));

    // Shishen stems
    const shishenStems = pillars.map((p, i) => ({
        pillar: p, name: pillarNames[i], stem: stemsList[i],
        shishen: getShishen(riGan, stemsList[i]),
    }));

    // Shishen cangan
    const shishenCangan = pillars.map((p, i) => ({
        pillar: p, name: pillarNames[i], branch: branchesList[i],
        hiddens: (CANGAN[branchesList[i]] || []).map(c => ({
            stem: c, shishen: getShishen(riGan, c),
        })),
    }));

    // Kong wang
    const kongBranches = getXunKong(dayPillar);
    const kongWang = pillars.map((p, i) => ({
        pillar: p, name: pillarNames[i], branch: branchesList[i],
        isKong: kongBranches.includes(branchesList[i]),
    }));

    // Branch relations
    const branchRels = getBranchRelations(branchesList);

    // Taiyuan
    const taiyuan = calcTaiyuan(monthPillar);

    // Wang shuai
    const allStemsCombined = [...stemsList];
    for (const b of branchesList) {
        for (const c of (CANGAN[b] || [])) allStemsCombined.push(c);
    }
    const wangshuai = analyzeWangshuai(riGan, yueZhi, branchesList, stemsList);

    // Current age
    const today = new Date();
    let preciseAge = today.getFullYear() - d.getFullYear();
    if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) {
        preciseAge--;
    }
    const xusui = today.getFullYear() - d.getFullYear() + 1;
    const currentDy = getCurrentDayun(dayun, preciseAge);

    // Wuxing counts
    const wuxingMap = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    const wuxingCounts = {木:0,火:0,土:0,金:0,水:0};
    for (const s of allStemsCombined) {
        const w = wuxingMap[s];
        if (w in wuxingCounts) wuxingCounts[w]++;
    }

    // Shishen counts
    const shishenCounts = {};
    for (const s of allStemsCombined) {
        const ss = getShishen(riGan, s);
        shishenCounts[ss] = (shishenCounts[ss] || 0) + 1;
    }

    return {
        bazi: `${yearPillar} ${monthPillar} ${dayPillar} ${timePillar}`,
        yearPillar, monthPillar, dayPillar, timePillar,
        riGan, riZhi, chineseHour, gender,
        solarDate: solarDateStr, time: timeStr,
        nayin: nayinData, dayun, changsheng: changshengData,
        shishenStems, shishenCangan,
        kongWang, kongBranches,
        branchRelations: branchRels,
        taiyuan, taiyuanNayin: getNayin(taiyuan),
        wangshuai,
        currentAgeXusui: xusui, currentAgePrecise: preciseAge,
        currentDayun: currentDy,
        wuxingCounts, shishenCounts,
        canganRaw: Object.fromEntries(branchesList.map(b => [b, CANGAN[b] || []])),
    };
}

// ================================================================
// 流年/流月/流日 计算 (expandable under 大运)
// ================================================================

// Get year pillar for any given year
function getYearPillar(year) {
    const gan = STEMS[((year - 4) % 10 + 10) % 10];
    const zhi = BRANCHES[((year - 4) % 12 + 12) % 12];
    return gan + zhi;
}

// Get all 12 month pillars for a given year stem
function getLiuyuePillars(yearGan) {
    const yinGan = TIGER_RULE[yearGan] || '甲';
    const yinIdx = STEMS.indexOf(yinGan);
    const months = [];
    for (let m = 0; m < 12; m++) {
        const gan = STEMS[(yinIdx + m) % 10];
        const zhi = BRANCHES[(2 + m) % 12]; // 寅=idx2
        const monthNames = ['寅月','卯月','辰月','巳月','午月','未月','申月','酉月','戌月','亥月','子月','丑月'];
        months.push({ gan, zhi, pillar: gan + zhi, name: monthNames[m] });
    }
    return months;
}

// Get all 流年 for a given 大运 step, with 十神 relative to 日主
function getLiunianForDayun(dayunStep, birthYear, riGan) {
    const startYear = birthYear + Math.floor(dayunStep.startAge);
    const endYear = birthYear + Math.floor(dayunStep.endAge) - 1;
    const years = [];
    for (let y = startYear; y <= endYear && y <= startYear + 9; y++) {
        const pillar = getYearPillar(y);
        const gan = pillar[0];
        const shishen = getShishen(riGan, gan);
        const liuyue = getLiuyuePillars(gan);
        years.push({
            year: y,
            pillar,
            gan,
            shishen,
            liuyue: liuyue.map(m => ({
                ...m,
                shishen: getShishen(riGan, m.gan),
            })),
        });
    }
    return years;
}

// Get 流日 for a specific month (returns ~30 days)
function getLiuriForMonth(year, monthIdx, riGan) {
    // monthIdx: 0=寅月, 1=卯月, ..., 11=丑月
    // Approximate solar term dates to get actual month boundaries
    const ref = new Date(1900, 0, 1);
    const approxDate = new Date(year, monthIdx, 15); // mid-month approximation
    const days = [];
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, monthIdx, d);
        const dayDiff = Math.floor((date - ref) / 86400000);
        const dayIdx = ((10 + dayDiff) % 60 + 60) % 60;
        const dayGan = STEMS[dayIdx % 10], dayZhi = BRANCHES[dayIdx % 12];
        days.push({
            day: d,
            pillar: dayGan + dayZhi,
            gan: dayGan,
            shishen: getShishen(riGan, dayGan),
        });
    }
    return days;
}

// =========== CALCULATE DISTANCE TO NEAREST SOLAR TERM (JIE) ===========
function calcSolarTermDistance(solarDateStr) {
    const d = parseDate(solarDateStr);
    const birthDT = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0);

    const jieKeys = [
        'beginning_of_spring','waking_of_insects','pure_brightness',
        'beginning_of_summer','grain_in_beard','lesser_heat',
        'beginning_of_autumn','white_dew','cold_dew',
        'beginning_of_winter','greater_snow','lesser_cold'
    ];
    const jieNames = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];

    // Collect all jie within +/- 2 years
    const allJie = [];
    for (let yr = d.getFullYear() - 1; yr <= d.getFullYear() + 1; yr++) {
        const yrKey = String(yr);
        if (!SOLAR_TERMS[yrKey]) continue;
        for (let i = 0; i < jieKeys.length; i++) {
            const dt = parseSolarTerm(yrKey, jieKeys[i]);
            if (dt) allJie.push({ dt, name: jieNames[i] });
        }
    }
    allJie.sort((a, b) => a.dt - b.dt);

    // Find nearest
    let nearest = null, minDiff = Infinity;
    for (const jie of allJie) {
        const diff = Math.abs(jie.dt - birthDT);
        if (diff < minDiff) { minDiff = diff; nearest = jie; }
    }

    if (!nearest) return { name: '?', days: 0, direction: '' };

    const diffMs = nearest.dt - birthDT;
    const days = Math.abs(Math.round(diffMs / 86400000));
    const direction = diffMs >= 0 ? '后' : '前';

    return { name: nearest.name, days, direction };
}

// =========== 神煞计算 ===========
function calcShensha(pillars, riGan, riZhi, nianZhi, yueZhi, gender) {
    // pillars = [year, month, day, time]
    // Returns array of arrays: [[shensha for year pillar], [month], [day], [time]]
    const results = [[], [], [], []];
    const branches = pillars.map(p => p[1]);
    const stems = pillars.map(p => p[0]);

    function add(idx, name, cls) {
        results[idx].push({ name, cls: cls || 'tag-info' });
    }

    // 五行
    const wx = s => ({甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[s]||'');

    // ---- 天乙贵人 (日干) ----
    const tianyi = {甲:'丑未',乙:'子申',丙:'亥酉',丁:'亥酉',戊:'丑未',己:'子申',庚:'午寅',辛:'午寅',壬:'卯巳',癸:'卯巳'};
    const tyBranches = (tianyi[riGan]||'').match(/../g) || [];
    for (let i = 0; i < 4; i++) {
        if (tyBranches.includes(branches[i])) add(i, '天乙贵人', 'tag-good');
    }

    // ---- 文昌 (日干) ----
    const wenchang = {甲:'巳',乙:'午',丙:'申',丁:'酉',戊:'申',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'};
    for (let i = 0; i < 4; i++) {
        if (branches[i] === wenchang[riGan]) add(i, '文昌', 'tag-good');
    }

    // ---- 学堂 (日干) ----
    const xuetang = {甲:'亥',乙:'午',丙:'寅',丁:'酉',戊:'寅',己:'酉',庚:'巳',辛:'子',壬:'申',癸:'卯'};
    for (let i = 0; i < 4; i++) {
        if (branches[i] === xuetang[riGan]) add(i, '学堂', 'tag-good');
    }

    // ---- 驿马 (年支或日支) ----
    const yima = {申:'寅',子:'寅',辰:'寅', 寅:'申',午:'申',戌:'申', 巳:'亥',酉:'亥',丑:'亥', 亥:'巳',卯:'巳',未:'巳'};
    const maBranch = yima[nianZhi] || yima[riZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === maBranch) add(i, '驿马', 'tag-info');
    }

    // ---- 桃花 (年支或日支) ----
    const taohua = {申:'酉',子:'酉',辰:'酉', 寅:'卯',午:'卯',戌:'卯', 巳:'午',酉:'午',丑:'午', 亥:'子',卯:'子',未:'子'};
    const thBranch = taohua[nianZhi] || taohua[riZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === thBranch) add(i, '桃花', 'tag-warn');
    }

    // ---- 华盖 (日支) ----
    const huagai = {申:'辰',子:'辰',辰:'辰', 寅:'戌',午:'戌',戌:'戌', 巳:'丑',酉:'丑',丑:'丑', 亥:'未',卯:'未',未:'未'};
    const hgBranch = huagai[riZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === hgBranch) add(i, '华盖', 'tag-info');
    }

    // ---- 羊刃 (日干) ----
    const yangren = {甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'};
    for (let i = 0; i < 4; i++) {
        if (branches[i] === yangren[riGan]) add(i, '羊刃', 'tag-warn');
    }

    // ---- 灾煞 (年支) ----
    const zaisha = {申:'午',子:'午',辰:'午', 寅:'子',午:'子',戌:'子', 巳:'卯',酉:'卯',丑:'卯', 亥:'酉',卯:'酉',未:'酉'};
    const zsBranch = zaisha[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === zsBranch) add(i, '灾煞', 'tag-warn');
    }

    // ---- 福星贵人 (日干) ----
    const fuxingMap = {甲:'寅丑',乙:'卯子',丙:'戌',丁:'酉',戊:'申',己:'未',庚:'午',辛:'巳',壬:'辰',癸:'卯'};
    const fxBranches = (fuxingMap[riGan]||'').match(/../g) || (fuxingMap[riGan] ? [fuxingMap[riGan]] : []);
    for (let i = 0; i < 4; i++) {
        if (fxBranches.includes(branches[i])) add(i, '福星贵人', 'tag-good');
    }

    // ---- 国印贵人 (日干) ----
    const guoyinMap = {甲:'戌',乙:'亥',丙:'丑',丁:'寅',戊:'丑',己:'寅',庚:'辰',辛:'巳',壬:'未',癸:'申'};
    for (let i = 0; i < 4; i++) {
        if (branches[i] === guoyinMap[riGan]) add(i, '国印贵人', 'tag-good');
    }

    // ---- 太极贵人 (日干) ----
    const taijiMap = {甲:'子午',乙:'子午',丙:'卯酉',丁:'卯酉',戊:'辰戌丑未',己:'辰戌丑未',庚:'寅亥',辛:'寅亥',壬:'巳申',癸:'巳申'};
    const tjBranches = (taijiMap[riGan]||'').match(/../g) || [];
    for (let i = 0; i < 4; i++) {
        if (tjBranches.includes(branches[i])) add(i, '太极贵人', 'tag-good');
    }

    // ---- 魁罡 (日柱干支) ----
    const kuigang = ['庚辰','庚戌','壬辰','戊戌'];
    for (let i = 0; i < 4; i++) {
        if (kuigang.includes(pillars[i])) add(i, '魁罡', 'tag-warn');
    }

    // ---- 阴差阳错 (日柱干支) ----
    const ycc = ['丙子','丁丑','戊寅','辛卯','壬辰','癸巳','丙午','丁未','戊申','辛酉','壬戌','癸亥'];
    for (let i = 0; i < 4; i++) {
        if (ycc.includes(pillars[i])) add(i, '阴差阳错', 'tag-warn');
    }

    // ---- 金舆 (日干) ----
    const jinyu = {甲:'辰',乙:'巳',丙:'未',丁:'申',戊:'未',己:'申',庚:'戌',辛:'亥',壬:'丑',癸:'寅'};
    for (let i = 0; i < 4; i++) {
        if (branches[i] === jinyu[riGan]) add(i, '金舆', 'tag-good');
    }

    // ---- 将星 (年支) ----
    const jiangxing = {申:'子',子:'子',辰:'子', 寅:'午',午:'午',戌:'午', 巳:'酉',酉:'酉',丑:'酉', 亥:'卯',卯:'卯',未:'卯'};
    const jxBranch = jiangxing[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === jxBranch) add(i, '将星', 'tag-good');
    }

    // ---- 天德贵人 (月支) ----
    const tiande = {寅:'丁',卯:'申',辰:'壬',巳:'辛',午:'亥',未:'甲',申:'癸',酉:'寅',戌:'丙',亥:'乙',子:'巳',丑:'庚'};
    const tdStem = tiande[yueZhi];
    for (let i = 0; i < 4; i++) {
        if (stems[i] === tdStem) add(i, '天德贵人', 'tag-good');
    }

    // ---- 月德贵人 (月支) ----
    const yuede = {寅:'丙',卯:'甲',辰:'壬',巳:'庚',午:'丙',未:'甲',申:'壬',酉:'庚',戌:'丙',亥:'甲',子:'壬',丑:'庚'};
    const ydStem = yuede[yueZhi];
    for (let i = 0; i < 4; i++) {
        if (stems[i] === ydStem) add(i, '月德贵人', 'tag-good');
    }

    // ---- 劫煞 (年支) ----
    const jiesha2 = {申:'巳',子:'巳',辰:'巳', 寅:'亥',午:'亥',戌:'亥', 巳:'申',酉:'申',丑:'申', 亥:'寅',卯:'寅',未:'寅'};
    const jsBranch = jiesha2[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === jsBranch) add(i, '劫煞', 'tag-warn');
    }

    // ---- 亡神 (年支) ----
    const wangshen = {申:'亥',子:'亥',辰:'亥', 寅:'巳',午:'巳',戌:'巳', 巳:'申',酉:'申',丑:'申', 亥:'寅',卯:'寅',未:'寅'};
    const wsBranch = wangshen[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === wsBranch) add(i, '亡神', 'tag-warn');
    }

    // ---- 孤辰 (年支三合局) ----
    const guchen = {申:'亥',子:'寅',辰:'巳', 寅:'巳',午:'申',戌:'亥', 巳:'申',酉:'亥',丑:'寅', 亥:'寅',卯:'巳',未:'申'};
    const gcBranch = guchen[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === gcBranch) add(i, '孤辰', 'tag-neutral');
    }

    // ---- 红鸾 (年支) ----
    const hongluan = {子:'卯',丑:'寅',寅:'丑',卯:'子',辰:'亥',巳:'戌',午:'酉',未:'申',申:'未',酉:'午',戌:'巳',亥:'辰'};
    const hlBranch = hongluan[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === hlBranch) add(i, '红鸾', 'tag-info');
    }

    // ---- 天喜 (年支) ----
    const tianxi = {子:'酉',丑:'申',寅:'未',卯:'午',辰:'巳',巳:'辰',午:'卯',未:'寅',申:'丑',酉:'子',戌:'亥',亥:'戌'};
    const txBranch = tianxi[nianZhi];
    for (let i = 0; i < 4; i++) {
        if (branches[i] === txBranch) add(i, '天喜', 'tag-good');
    }

    return results;
}

// 五行颜色映射
function wuxingClass(stem) {
    return {
        '甲':'c-wood','乙':'c-wood',
        '丙':'c-fire','丁':'c-fire',
        '戊':'c-earth','己':'c-earth',
        '庚':'c-metal','辛':'c-metal',
        '壬':'c-water','癸':'c-water',
    }[stem] || '';
}

