// liuren.js — 大六壬排盘引擎 (JavaScript)
// Core computation: 天盘/四课/三传/天将/六亲

const LR_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const LR_STEMS = '甲乙丙丁戊己庚辛壬癸';

// 月将 (based on 中气/not 节)
const LR_YUEJIANG_TERMS = {
    winter_solstice:'丑', greater_cold:'子', rain_water:'亥', spring_equinox:'戌',
    grain_rain:'酉', lesser_fullness:'申', summer_solstice:'未', greater_heat:'午',
    end_of_heat:'巳', autumn_equinox:'辰', frost_descent:'卯', lesser_snow:'寅',
};

// 寄宫
function lr_jigong(branch) {
    const map = {辰:'乙',戌:'辛',丑:'癸',未:'丁',巳:'己',亥:'己'};
    return map[branch] || null;
}

// 贵人昼夜
function lr_guiren(dayStem) {
    const map = {
        甲:'丑',乙:'子',丙:'亥',丁:'酉',戊:'丑',己:'子',庚:'午',辛:'午',壬:'巳',癸:'卯',
    };
    return map[dayStem] || '丑';
}

// 天将顺序 (顺排)
const LR_TIANJIANG = ['贵人','螣蛇','朱雀','六合','勾陈','青龙','天空','白虎','太常','玄武','太阴','天后'];

// 六亲
function lr_getQin(dayStem, otherStem) {
    const wx = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    const dw = wx[dayStem], ow = wx[otherStem];
    if (!dw || !ow) return '?';
    if (dw === ow) return '比肩';
    const sheng = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const ke = {木:'土',土:'水',水:'火',火:'金',金:'木'};
    const bs = {木:'水',水:'金',金:'土',土:'火',火:'木'};
    if (sheng[dw] === ow) return '子孙';
    if (ke[dw] === ow) return '妻财';
    if (bs[dw] === ow) return '父母';
    if (sheng[ow] === dw) return '父母';
    if (ke[ow] === dw) return '官鬼';
    return '?';
}

// 旬空
function lr_xunkong(dayPillar) {
    const ds = dayPillar ? dayPillar[0] : '甲';
    const db = dayPillar ? dayPillar[1] : '子';
    const XK = [[11,0],[9,10],[7,8],[5,6],[3,4],[1,2]]; // 甲子→戌亥, 甲戌→申酉...
    const dsi = LR_STEMS.indexOf(ds), dbi = LR_BRANCHES.indexOf(db);
    for (let off = 0; off < 60; off++) {
        const ts = ((dsi - off) % 10 + 10) % 10;
        const tb = ((dbi - off) % 12 + 12) % 12;
        if (LR_STEMS[ts] === '甲' && ts === tb) {
            const idx = tb % 6; // 0,2,4,6,8,10 → which xun pair
            const xunOrder = [0,2,4,6,8,10];
            const pairIdx = xunOrder.indexOf(tb);
            if (pairIdx >= 0 && XK[pairIdx]) {
                return XK[pairIdx].map(i => LR_BRANCHES[i]);
            }
        }
    }
    return ['戌','亥'];
}

// 九宗门 — 确定三传
function lr_sanchuan(dayGan, siKe) {
    // siKe = [[上1,下1], [上2,下2], [上3,下3], [上4,下4]]
    const allGan = siKe.flat();
    const dayWx = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'}[dayGan];
    const wxToStems = {木:'甲乙',火:'丙丁',土:'戊己',金:'庚辛',水:'壬癸'};
    const zhiWx = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};

    // Find 贼克 (overcome)
    let zeiKe = []; // 下克上
    let keZei = []; // 上克下
    for (let i = 0; i < 4; i++) {
        const [shang, xia] = siKe[i];
        if (shang === xia) continue;
        const sw = zhiWx[shang] || '?';
        const xw = zhiWx[xia] || '?';
        const ke = {木:'土',土:'水',水:'火',火:'金',金:'木'};
        if (ke[xw] === sw) zeiKe.push(i); // 下克上
        if (ke[sw] === xw) keZei.push(i); // 上克下
    }

    let chuChuan, zhongChuan, moChuan;

    if (zeiKe.length === 1) {
        chuChuan = siKe[zeiKe[0]][0]; // 上神
    } else if (keZei.length === 1) {
        chuChuan = siKe[keZei[0]][0];
    } else if (zeiKe.length > 0) {
        // 比用: pick the one with same yin-yang as day stem
        chuChuan = siKe[zeiKe[0]][0];
    } else if (keZei.length > 0) {
        chuChuan = siKe[keZei[0]][0];
    } else {
        // 遥克 or 昴星 or other — fallback
        chuChuan = siKe[2][0]; // simplified
    }

    // Find 中传 and 末传 from 天盘
    zhongChuan = chuChuan; moChuan = chuChuan; // placeholder
    // In real implementation: look up chuChuan in siKe to find its 天盘 position

    return [chuChuan || '子', zhongChuan || '寅', moChuan || '辰'];
}

// Main calculation
function calculateLiuren(solarDateStr, timeStr, question) {
    const [h] = timeStr.split(':').map(Number);
    const d = parseDate(solarDateStr);

    // 1. 占时 (divination time as branch)
    const shichen = (h >= 23 || h < 1) ? 0 : Math.ceil(h / 2);
    const zhanShi = LR_BRANCHES[shichen]; // 子丑寅卯...

    // 2. 月将 (determine by 中气)
    const yrKey = String(d.getFullYear());
    let yueJiang = '子'; // default
    if (SOLAR_TERMS[yrKey]) {
        const sorted = Object.entries(SOLAR_TERMS[yrKey])
            .map(([k, v]) => [k, new Date(v.replace(' ', 'T') + ':00')])
            .sort((a, b) => a[1] - b[1]);

        for (const [tkey, tdt] of sorted) {
            if (LR_YUEJIANG_TERMS[tkey] && d >= tdt) {
                yueJiang = LR_YUEJIANG_TERMS[tkey];
            }
        }
    }
    const yjIdx = LR_BRANCHES.indexOf(yueJiang);
    const zsIdx = LR_BRANCHES.indexOf(zhanShi);

    // 3. 天盘 (月将加时): rotate heaven plate so yueJiang aligns with zhanShi
    // 地盘: 子丑寅卯辰巳午未申酉戌亥 (0-11, fixed)
    // 天盘: offset = zsIdx - yjIdx
    const offset = zsIdx - yjIdx;
    const tianPan = {};
    for (let i = 0; i < 12; i++) {
        const diBranch = LR_BRANCHES[i];
        const tianBranch = LR_BRANCHES[((i - offset) % 12 + 12) % 12];
        tianPan[diBranch] = tianBranch;
    }

    // 4. 日干支
    const ref = new Date(1900, 0, 1);
    const days = Math.floor((d - ref) / 86400000);
    const dayNum = ((10 + days) % 60 + 60) % 60;
    const dayGan = LR_STEMS[dayNum % 10];
    const dayZhi = LR_BRANCHES[dayNum % 12];
    const dayPillar = dayGan + dayZhi;

    // 5. 四课
    // 日干寄宫
    const ganJigong = {甲:'寅',乙:'辰',丙:'巳',丁:'未',戊:'巳',己:'未',庚:'申',辛:'戌',壬:'亥',癸:'丑'};
    const gongBranch = ganJigong[dayGan] || '寅';
    const ke1Shang = tianPan[gongBranch] || gongBranch;
    const ke2Shang = tianPan[ke1Shang] || ke1Shang;
    const ke3Shang = tianPan[dayZhi] || dayZhi;
    const ke4Shang = tianPan[ke3Shang] || ke3Shang;

    const siKe = [
        [ke1Shang, gongBranch],   // 第一课: 上=天盘[寄宫], 下=寄宫
        [ke2Shang, ke1Shang],     // 第二课: 上=天盘[课上], 下=课上
        [ke3Shang, dayZhi],       // 第三课
        [ke4Shang, ke3Shang],     // 第四课
    ];

    // 6. 三传 (simplified)
    const sanChuan = lr_sanchuan(dayGan, siKe);

    // 7. 贵人 + 天将
    const guiRen = lr_guiren(dayGan);
    const guiIdx = LR_BRANCHES.indexOf(guiRen);
    const isDay = (h >= 6 && h < 18); // 卯时到酉时(不含)为昼
    const tianJiang = [];
    for (let i = 0; i < 12; i++) {
        const idx = isDay ? ((guiIdx + i) % 12 + 12) % 12 : ((guiIdx - i) % 12 + 12) % 12;
        tianJiang.push({
            branch: LR_BRANCHES[i],
            general: LR_TIANJIANG[idx],
        });
    }

    // 8. 旬空
    const xunKong = lr_xunkong(dayPillar);

    // 9. 课体判断 (simplified)
    const keTi = [];
    const totalShang = siKe.map(([s]) => s);
    if (totalShang.some(b => xunKong.includes(b))) keTi.push('课上逢空');
    if (siKe.some(([s, x]) => s === x)) keTi.push('伏吟课');
    // Check for 贼克
    const zhiWx = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
    const ke = {木:'土',土:'水',水:'火',火:'金',金:'木'};
    let zeiKeCnt = 0, keZeiCnt = 0;
    for (const [shang, xia] of siKe) {
        const sw = zhiWx[shang] || '', xw = zhiWx[xia] || '';
        if (ke[xw] === sw) zeiKeCnt++;
        if (ke[sw] === xw) keZeiCnt++;
    }
    if (zeiKeCnt > 0) keTi.push('贼克课');
    if (keZeiCnt > 0 && zeiKeCnt === 0) keTi.push('克贼课');

    // 10. Build result
    // 四课三传 for display
    const siKeDisplay = siKe.map(([s, x], i) => ({
        num: i + 1,
        shang: s, xia: x,
        shangJiang: tianJiang.find(tj => tj.branch === s)?.general || '',
    }));

    // 天地盘布局
    const layout = [];
    for (let i = 0; i < 12; i++) {
        const diBranch = LR_BRANCHES[i];
        layout.push({
            diBranch,
            tianBranch: tianPan[diBranch],
            general: tianJiang.find(tj => tj.branch === tianPan[diBranch])?.general || '',
        });
    }

    return {
        zhanShi, yueJiang, dayPillar, dayGan, dayZhi,
        tianPan, siKe: siKeDisplay,
        sanChuan: {chu: sanChuan[0], zhong: sanChuan[1], mo: sanChuan[2]},
        tianJiang,
        xunKong,
        keTi,
        layout,
        question,
        solarDate: solarDateStr, time: timeStr,
        isDay,
    };
}
