// liuyao.js — 六爻卜筮引擎 (JavaScript)
// 火珠林法+增删卜易, coins toss simulation

const LY_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const LY_STEMS = '甲乙丙丁戊己庚辛壬癸';

// 64卦 (upper trigram, lower trigram) → name
const LY_TRIGRAMS = {乾:1,兑:2,离:3,震:4,巽:5,坎:6,艮:7,坤:8};
const LY_TG_NAMES = {1:'乾',2:'兑',3:'离',4:'震',5:'巽',6:'坎',7:'艮',8:'坤'};

function ly_trigramNum(tg) { return LY_TRIGRAMS[tg] || 1; }

function ly_numToTrigram(n) {
    for (const [k, v] of Object.entries(LY_TRIGRAMS)) if (v === n) return k;
    return '乾';
}

// 64卦 lookup
const LY_GUA_TABLE = {};
function ly_buildGuaTable() {
    const names = [
        [1,1,'乾为天'],[1,2,'天泽履'],[1,3,'天火同人'],[1,4,'天雷无妄'],[1,5,'天风姤'],[1,6,'天水讼'],[1,7,'天山遁'],[1,8,'天地否'],
        [2,1,'泽天夬'],[2,2,'兑为泽'],[2,3,'泽火革'],[2,4,'泽雷随'],[2,5,'泽风大过'],[2,6,'泽水困'],[2,7,'泽山咸'],[2,8,'泽地萃'],
        [3,1,'火天大有'],[3,2,'火泽睽'],[3,3,'离为火'],[3,4,'火雷噬嗑'],[3,5,'火风鼎'],[3,6,'火水未济'],[3,7,'火山旅'],[3,8,'火地晋'],
        [4,1,'雷天大壮'],[4,2,'雷泽归妹'],[4,3,'雷火丰'],[4,4,'震为雷'],[4,5,'雷风恒'],[4,6,'雷水解'],[4,7,'雷山小过'],[4,8,'雷地豫'],
        [5,1,'风天小畜'],[5,2,'风泽中孚'],[5,3,'风火家人'],[5,4,'风雷益'],[5,5,'巽为风'],[5,6,'风水涣'],[5,7,'风山渐'],[5,8,'风地观'],
        [6,1,'水天需'],[6,2,'水泽节'],[6,3,'水火既济'],[6,4,'水雷屯'],[6,5,'水风井'],[6,6,'坎为水'],[6,7,'水山蹇'],[6,8,'水地比'],
        [7,1,'山天大畜'],[7,2,'山泽损'],[7,3,'山火贲'],[7,4,'山雷颐'],[7,5,'山风蛊'],[7,6,'山水蒙'],[7,7,'艮为山'],[7,8,'山地剥'],
        [8,1,'地天泰'],[8,2,'地泽临'],[8,3,'地火明夷'],[8,4,'地雷复'],[8,5,'地风升'],[8,6,'地水师'],[8,7,'地山谦'],[8,8,'坤为地'],
    ];
    for (const [u, l, n] of names) {
        LY_GUA_TABLE[`${u}${l}`] = n;
    }
}
ly_buildGuaTable();

// 八卦纳甲 (地支)
const LY_NAJIA = {
    乾:'子寅辰',  // 初子,二寅,三辰 (inner), plus outer same
    兑:'巳卯丑',
    离:'卯丑亥',
    震:'子寅辰',
    巽:'丑亥酉',
    坎:'寅辰午',
    艮:'辰午申',
    坤:'未巳卯',
};

// 六亲
function ly_getQin(guaGan, yaoZhi) {
    // Simplified: guaGan determines element, yaoZhi determines relationship
    const wx = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    const zhiWx = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
    // Simple: guaGan WX vs zhiWx
    const gw = wx[guaGan] || '木';
    const zw = zhiWx[yaoZhi] || '水';
    const cycle = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const reverse = {木:'水',水:'金',金:'土',土:'火',火:'木'};
    const suppress = {木:'土',土:'水',水:'火',火:'金',金:'木'};
    const suppressed = {木:'金',金:'火',火:'水',水:'土',土:'木'};

    if (gw === zw) return '兄弟';
    if (cycle[gw] === zw) return '子孙';
    if (reverse[gw] === zw) return '父母';
    if (suppress[gw] === zw) return '妻财';
    if (suppressed[gw] === zw) return '官鬼';
    return '?';
}

// 六兽 (based on day stem)
const LY_BEASTS = ['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
function ly_getBeasts(dayStem) {
    const order = {甲:'青龙',乙:'青龙',丙:'朱雀',丁:'朱雀',戊:'勾陈',
                   己:'螣蛇',庚:'白虎',辛:'白虎',壬:'玄武',癸:'玄武'};
    const first = order[dayStem] || '青龙';
    const idx = LY_BEASTS.indexOf(first);
    const result = [];
    for (let i = 0; i < 6; i++) {
        result.push(LY_BEASTS[(idx + i) % 6]);
    }
    return result;
}

// 世应位
const LY_SHIYING = {
    // Upper trigram num, lower trigram num → [shi pos, ying pos]
    111:[6,3],112:[2,5],113:[4,1],114:[1,4],115:[1,4],116:[4,1],117:[2,5],118:[6,3],
    221:[1,4],222:[6,3],223:[6,3],224:[4,1],225:[3,6],226:[2,5],227:[2,5],228:[4,1],
    331:[3,6],332:[1,4],333:[6,3],334:[5,2],335:[2,5],336:[4,1],337:[4,1],338:[1,4],
    441:[4,1],442:[3,6],443:[1,4],444:[5,2],445:[4,1],446:[3,6],447:[1,4],448:[5,2],
    551:[1,4],552:[4,1],553:[2,5],554:[3,6],555:[4,1],556:[5,2],557:[5,2],558:[3,6],
    661:[5,2],662:[5,2],663:[2,5],664:[1,4],665:[1,4],666:[6,3],667:[3,6],668:[2,5],
    771:[3,6],772:[6,3],773:[5,2],774:[2,5],775:[6,3],776:[3,6],777:[6,3],778:[1,4],
    881:[6,3],882:[5,2],883:[4,1],884:[3,6],885:[2,5],886:[1,4],887:[1,4],888:[5,2],
};

// Coin toss → 3 coins, 6 tosses
function tossCoins() {
    const lines = [];
    for (let i = 0; i < 6; i++) {
        // 3 coins
        const coins = [
            Math.random() < 0.5 ? 3 : 2, // 2=face(yang), 3=back(yin)
            Math.random() < 0.5 ? 3 : 2,
            Math.random() < 0.5 ? 3 : 2,
        ];
        const total = coins.reduce((a, b) => a + b, 0);
        // 6=老阴×, 7=少阳⚊, 8=少阴⚋, 9=老阳○
        let type, moving;
        if (total === 6) { type = '老阴'; moving = true; }
        else if (total === 7) { type = '少阳'; moving = false; }
        else if (total === 8) { type = '少阴'; moving = false; }
        else { type = '老阳'; moving = true; }

        const yang = (total === 7 || total === 9);
        lines.push({ pos: i + 1, total, type, yang, moving, coins: coins.join('') });
    }

    // Determine trigrams (bottom up: pos1-3 = lower, pos4-6 = upper)
    function yaoToNum(yang) { return yang ? 1 : 0; }
    const lowerBin = lines.slice(0, 3).map(l => yaoToNum(l.yang));
    const upperBin = lines.slice(3, 6).map(l => yaoToNum(l.yang));

    // Map binary to trigram (standard: pos1=bottom bit)
    const triMap = {
        '111':1,'011':2,'101':3,'001':4,'110':5,'010':6,'100':7,'000':8,
    };
    const lKey = lowerBin.join('');
    const uKey = upperBin.join('');
    const lowerNum = triMap[lKey] || 8;
    const upperNum = triMap[uKey] || 1;
    const lowerTG = ly_numToTrigram(lowerNum);
    const upperTG = ly_numToTrigram(upperNum);

    // Gua name
    const benGuaName = LY_GUA_TABLE[`${upperNum}${lowerNum}`] || `${upperTG}${lowerTG}`;

    // Generate bian gua (changing lines flip yin/yang)
    const bianLines = lines.map(l => {
        if (l.moving) return {...l, yang: !l.yang};
        return {...l, yang: l.yang};
    });
    const bLowerBin = bianLines.slice(0, 3).map(l => yaoToNum(l.yang));
    const bUpperBin = bianLines.slice(3, 6).map(l => yaoToNum(l.yang));
    const bLowerNum = triMap[bLowerBin.join('')] || 8;
    const bUpperNum = triMap[bUpperBin.join('')] || 1;
    const bianGuaName = LY_GUA_TABLE[`${bUpperNum}${bLowerNum}`] || '—';

    // Shiyong
    const shiying = LY_SHIYING[`${upperNum}${lowerNum}`] || [1, 4];

    // Day stem for beasts
    const today = new Date();
    const ref = new Date(1900, 0, 1);
    const days = Math.floor((today - ref) / 86400000);
    const dayGan = LY_STEMS[((10 + days) % 10 + 10) % 10];
    const beasts = ly_getBeasts(dayGan);

    // 装卦 (install stems/branches on each yao)
    const installed = lines.map((l, i) => {
        const tg = (i < 3) ? lowerTG : upperTG;
        const zhi = LY_NAJIA[ly_trigramNum(tg)] || '子寅辰';
        const zhiArr = zhi.split('');
        // Inner gua uses first 3 of the na-jia string
        const zhiIdx = i < 3 ? i : i - 3; // 0,1,2 for each gua
        // Actually na-jia is per gua not per yao
        // Simplified: use trigram's first character for each line
        const yaoZhi = zhiArr[Math.min(zhiIdx, zhiArr.length-1)] || '子';
        const qin = ly_getQin(dayGan, yaoZhi);
        const beast = beasts[i];
        const shiyingLabel = (i+1 === shiying[0]) ? '世' : (i+1 === shiying[1]) ? '应' : '';
        return {...l, guaTG: tg, zhi: yaoZhi, qin, beast, shiyingLabel, isShi: i+1 === shiying[0], isYing: i+1 === shiying[1]};
    });

    return {
        lines: installed,
        benGuaName,
        bianGuaName,
        lowerTG, upperTG, lowerNum, upperNum,
        shiPos: shiying[0], yingPos: shiying[1],
        dayGan, beasts,
        movingLines: lines.filter(l => l.moving),
    };
}

// 简易卦辞（常用卦的基本断语）
function ly_interpret(result, question) {
    const {benGuaName, bianGuaName, movingLines} = result;
    const interpretations = [];

    if (movingLines.length === 0) {
        interpretations.push(`得静卦《${benGuaName}》，事态稳定，以本卦卦辞为主。`);
    } else {
        interpretations.push(`本卦《${benGuaName}》→ 变卦《${bianGuaName}》，${movingLines.length}个动爻。`);
        for (const l of movingLines) {
            interpretations.push(`${l.type}在${l.pos}爻发动。`);
        }
    }

    // Check if benGua contains certain keywords
    if (benGuaName.includes('乾')) interpretations.push('乾卦：刚健中正，自强不息，主事业进取。');
    if (benGuaName.includes('坤')) interpretations.push('坤卦：柔顺承载，厚德载物，主稳定等待。');
    if (benGuaName.includes('泰')) interpretations.push('泰卦：天地交泰，通顺之象，大吉。');
    if (benGuaName.includes('否')) interpretations.push('否卦：天地不交，闭塞不通，宜守不宜进。');

    if (question) interpretations.push(`\n占问："${question}"——请结合卦象进一步分析。`);

    return interpretations.join('\n');
}

// Main function
function calculateLiuyao(question) {
    const result = tossCoins();
    const interpretation = ly_interpret(result, question);
    return {...result, interpretation, question};
}

