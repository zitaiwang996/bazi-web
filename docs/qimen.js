// qimen.js — 鸣法奇门飞盘排盘引擎 (JavaScript)
// Ported from skills/鸣法奇门/qimen_mingfa.py for GitHub Pages
// 折补法 + 飞宫时家奇门，经验证与教材完全一致

// ========== CONSTANTS ==========
var QM_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var QM_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var QM_GAN_IX = {};
var QM_ZHI_IX = {};
for (var i = 0; i < 10; i++) QM_GAN_IX[QM_GAN[i]] = i + 1;
for (var i = 0; i < 12; i++) QM_ZHI_IX[QM_ZHI[i]] = i + 1;

// 奇仪顺序 (地盘)
var QM_QYI = ['戊','己','庚','辛','壬','癸','丁','丙','乙'];

// 九星/八门/九神
var QM_JIU_XING = ['天蓬','天芮','天冲','天辅','天禽','天心','天柱','天任','天英'];
var QM_BA_MEN = ['休门','死门','伤门','杜门','中五','开门','惊门','生门','景门'];
var QM_JIU_SHEN_YANG = ['值符','螣蛇','太阴','六合','勾陈','太常','朱雀','九地','九天'];
var QM_JIU_SHEN_YIN  = ['值符','螣蛇','太阴','六合','白虎','太常','玄武','九地','九天'];

// 九宫名称
var QM_GONG_NAME = {1:'坎一宫',2:'坤二宫',3:'震三宫',4:'巽四宫',5:'中五宫',6:'乾六宫',7:'兑七宫',8:'艮八宫',9:'离九宫'};
var QM_GONG_SHORT = {1:'坎',2:'坤',3:'震',4:'巽',5:'中',6:'乾',7:'兑',8:'艮',9:'离'};

// 节气
var QM_JIEQI = ['冬至','小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪'];
var QM_JIEQI_IX = {};
for (var i = 0; i < 24; i++) QM_JIEQI_IX[QM_JIEQI[i]] = i;

// 节气→九宫映射
var QM_JQ_GONG = {};
var _jqMap = [[1,0,2],[3,6,8],[4,9,11],[9,12,14],[7,18,20],[6,21,23],[8,3,5],[2,15,17]];
for (var k = 0; k < _jqMap.length; k++) {
    var g = _jqMap[k][0], jqs = _jqMap[k][1], jqe = _jqMap[k][2];
    for (var j = jqs; j <= jqe; j++) QM_JQ_GONG[j] = g;
}

// 节气三元局表
var QM_JU_TABLE = {};
var _jq_gong_map = {};
_jq_gong_map[1]=[0,1,2]; _jq_gong_map[3]=[6,7,8]; _jq_gong_map[4]=[9,10,11]; _jq_gong_map[9]=[12,13,14];
_jq_gong_map[7]=[18,19,20]; _jq_gong_map[6]=[21,22,23]; _jq_gong_map[8]=[3,4,5]; _jq_gong_map[2]=[15,16,17];
for (var _g in _jq_gong_map) {
    var _jqs = _jq_gong_map[_g];
    var _yang = _jqs[0] <= 11;
    for (var _i2 = 0; _i2 < 3; _i2++) {
        var _s, _z, _x;
        if (_yang) {
            _s = Number(_g) + _i2; if (_s > 9) _s -= 9;
            _z = _s + 6; if (_z > 9) _z -= 9;
            _x = _z + 6; if (_x > 9) _x -= 9;
        } else {
            _s = Number(_g) - _i2; if (_s < 1) _s += 9;
            _z = _s - 6; if (_z < 1) _z += 9;
            _x = _z - 6; if (_x < 1) _x += 9;
        }
        QM_JU_TABLE[_jqs[_i2]] = [_s, _z, _x];
    }
}

// 旬首/符头/仪空表
var _XUN = [
    ['甲子戊','甲子',['甲子','乙丑','丙寅','丁卯','戊辰'],'己'],
    ['甲子戊','己巳',['己巳','庚午','辛未','壬申','癸酉'],'己'],
    ['甲戌己','甲戌',['甲戌','乙亥','丙子','丁丑','戊寅'],'庚'],
    ['甲戌己','己卯',['己卯','庚辰','辛巳','壬午','癸未'],'庚'],
    ['甲申庚','甲申',['甲申','乙酉','丙戌','丁亥','戊子'],'辛'],
    ['甲申庚','己丑',['己丑','庚寅','辛卯','壬辰','癸巳'],'辛'],
    ['甲午辛','甲午',['甲午','乙未','丙申','丁酉','戊戌'],'壬'],
    ['甲午辛','己亥',['己亥','庚子','辛丑','壬寅','癸卯'],'壬'],
    ['甲辰壬','甲辰',['甲辰','乙巳','丙午','丁未','戊申'],'癸'],
    ['甲辰壬','己酉',['己酉','庚戌','辛亥','壬子','癸丑'],'癸'],
    ['甲寅癸','甲寅',['甲寅','乙卯','丙辰','丁巳','戊午'],'戊'],
    ['甲寅癸','己未',['己未','庚申','辛酉','壬戌','癸亥'],'戊']
];
var QM_XUNSHOU = {};
var QM_FUTOU = {};
var QM_YIKONG = {};
for (var xi = 0; xi < _XUN.length; xi++) {
    var xd = _XUN[xi], xs = xd[0], ft = xd[1], gzs = xd[2], yk = xd[3];
    for (var gi = 0; gi < gzs.length; gi++) {
        QM_XUNSHOU[gzs[gi]] = xs;
        QM_FUTOU[gzs[gi]] = ft;
        QM_YIKONG[gzs[gi]] = yk;
    }
}

// 旬空
var QM_XUNKONG_MAP = {'甲子':'戌亥','甲戌':'申酉','甲申':'午未','甲午':'辰巳','甲辰':'寅卯','甲寅':'子丑'};

// 空亡宫位
var QM_XK_GONG = {'戌亥':[6],'申酉':[2,7],'午未':[2,9],'辰巳':[4],'寅卯':[3,8],'子丑':[1,8]};

// 驿马 (时支→宫位)
var QM_YIMA = {'子':8,'辰':8,'申':8,'巳':6,'酉':6,'丑':6,'寅':2,'午':2,'戌':2,'亥':4,'卯':4,'未':4};

// 卦气
var QM_GUA_QI = ['旺','相','胎','没','死','囚','废','休'];
var QM_GUA_QI_SEQ = {};
var _gqs = [['052317614',0,2],['741206503',3,5],['630175472',6,8],['527064361',9,11],['416713250',12,14],['305602147',15,17],['274571036',18,20],['163460725',21,23]];
for (var gqi = 0; gqi < _gqs.length; gqi++) {
    var gqd = _gqs[gqi];
    for (var jx = gqd[1]; jx <= gqd[2]; jx++) QM_GUA_QI_SEQ[jx] = gqd[0];
}

// 十二长生
var QM_CHANG_SHENG_ZHI = {'甲':'亥','乙':'午','丙':'寅','丁':'酉','戊':'寅','己':'酉','庚':'巳','辛':'子','壬':'申','癸':'卯'};
var QM_SHENG_CHANG = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];

// 天干五行
var QM_GAN_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};

// 五行生克
var QM_WX_S = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
var QM_WX_K = {'木':'土','土':'水','水':'火','火':'金','金':'木'};

// 八门/九星吉凶
var QM_MEN_JX = {'休门':'吉','开门':'吉','生门':'吉','伤门':'凶','杜门':'平','景门':'平','死门':'凶','惊门':'凶','中五':'平'};
var QM_XING_JX = {'天蓬':'凶','天芮':'凶','天冲':'平','天辅':'吉','天禽':'吉','天心':'吉','天柱':'凶','天任':'吉','天英':'平'};

// ========== 格局定义 ==========
var QM_ZHENG_GE = {};
function _buildPatterns() {
    var zhgData = {
        '进茹':['甲乙','乙丙','丙丁','丁戊','戊己','己庚','庚辛','辛壬','壬癸','癸甲'],
        '退茹':['甲癸','乙甲','丙乙','丁丙','戊丁','己戊','庚己','辛庚','壬辛','癸壬'],
        '前间':['甲丙','乙丁','丙戊','丁己','戊庚','己辛','庚壬','辛癸','壬甲','癸乙'],
        '后间':['甲壬','乙癸','丙甲','丁乙','戊丙','己丁','庚戊','辛己','壬庚','癸辛'],
        '上合':['甲己','乙庚','丙辛','丁壬','戊癸'],
        '下合':['己甲','庚乙','辛丙','壬丁','癸戊'],
        '合土':['甲己','己甲'],'合金':['乙庚','庚乙'],'合水':['丙辛','辛丙'],'合木':['丁壬','壬丁'],'合火':['戊癸','癸戊'],
        '正冲':['庚甲','辛乙','壬丙','癸丁'],'背冲':['甲庚','乙辛','丙壬','丁癸'],
        '木冲':['甲庚','乙辛'],'火冲':['丙壬','丁癸'],'金冲':['庚甲','辛乙'],'水冲':['壬丙','癸丁'],
        '耗气':['甲丙','丙戊','戊庚','庚壬','壬甲'],'夺权':['乙丁','丁己','己辛','辛癸','癸乙'],
        '交阴':['甲丁','丙己','戊辛','庚癸','壬乙'],'交阳':['乙丙','丁戊','己庚','辛壬','癸甲'],
        '得母':['甲癸','丙乙','戊丁','庚己','壬辛'],'获父':['乙壬','丁甲','己丙','辛戊','癸庚'],
        '乘权':['甲壬','丙甲','戊丙','庚戊','壬庚'],'倚势':['乙癸','丁乙','己丁','辛己','癸辛'],
        '外侵':['甲己','丙辛','戊癸','庚乙','壬丁'],'内侵':['乙庚','丁壬','己甲','辛丙','癸戊'],
        '外害':['乙戊','丁庚','己壬','辛甲','癸丙'],'内害':['甲辛','丙癸','戊乙','庚丁','壬己'],
        '外制':['甲戊','丙庚','戊壬','庚甲','壬丙'],'内制':['甲庚','丙壬','戊甲','庚丙','壬戊'],
        '外乱':['乙己','丁辛','己癸','辛乙','癸丁'],'内乱':['乙辛','丁癸','己乙','辛丁','癸己'],
        '支破':['戊辛','己壬','庚癸','辛戊','壬己','癸庚'],
        '击刑':['戊震','己坤','庚艮','辛离','壬巽','癸巽'],
        '伏吟':['甲甲','乙乙','丙丙','丁丁','戊戊','己己','庚庚','辛辛','壬壬','癸癸']
    };
    for (var name in zhgData) {
        var entries = zhgData[name];
        for (var ei = 0; ei < entries.length; ei++) {
            var pair = entries[ei];
            if (!QM_ZHENG_GE[pair]) QM_ZHENG_GE[pair] = [];
            QM_ZHENG_GE[pair].push(name);
        }
    }
}
// 辅格
var QM_FU_GE = {};
function _buildFuGe() {
    var fugData = {
        '曲直':['甲乙震','乙甲震','甲乙巽','乙甲巽'],'胎息':['甲乙坎','乙甲坎'],
        '炎上':['丙丁离','丁丙离'],'增辉':['丙丁震','丁丙震','丙丁巽','丁丙巽'],
        '斗力':['丙丁乾','丁丙乾','丙丁兑','丁丙兑'],'掩目':['丙丁坎','丁丙坎'],
        '失光':['丙丁坤','丁丙坤','丙丁中','丁丙中','丙丁艮','丁丙艮'],
        '稼穑':['戊己坤','己戊坤','戊己中','己戊中','戊己艮','己戊艮'],'迫水':['戊己坎','己戊坎'],
        '坏体':['戊己震','己戊震','戊己巽','己戊巽'],'绝精':['戊己乾','己戊乾','戊己兑','己戊兑'],
        '变象':['戊己离','己戊离'],'从革':['庚辛乾','辛庚乾','庚辛兑','辛庚兑'],
        '泄津':['庚辛坎','辛庚坎'],'扬威':['庚辛坤','辛庚坤','庚辛中','辛庚中','庚辛艮','辛庚艮'],
        '逢刃':['庚辛震','辛庚震','庚辛巽','辛庚巽'],'闭口':['庚辛离','辛庚离'],
        '润下':['壬癸坎','癸壬坎'],'绝迹':['壬癸坤','癸壬坤','壬癸中','癸壬中','壬癸艮','癸壬艮'],
        '败源':['壬癸震','癸壬震','壬癸巽','癸壬巽'],'通关':['壬癸乾','癸壬乾','壬癸兑','癸壬兑'],
        '灭润':['壬癸离','癸壬离'],'罹伐':['甲乙乾','乙甲乾','甲乙兑','乙甲兑'],
        '焚林':['甲乙离','乙甲离'],'兴创':['甲乙坤','乙甲坤','甲乙中','乙甲中','甲乙艮','乙甲艮']
    };
    for (var name in fugData) {
        var entries = fugData[name];
        for (var ei = 0; ei < entries.length; ei++) {
            var triple = entries[ei];
            if (!QM_FU_GE[triple]) QM_FU_GE[triple] = [];
            QM_FU_GE[triple].push(name);
        }
    }
}
// Build patterns at load time
_buildPatterns();
_buildFuGe();

// ========== UTILS ==========
function _reorder(arr, n, dun) {
    // dun=1 阳顺, dun=0 阴逆
    var r = new Array(9);
    if (dun === 0) {
        for (var i = 0; i < n; i++) r[i] = arr[n - 1 - i];
        for (var i = n; i < 9; i++) r[i] = arr[9 + n - 1 - i];
    } else {
        for (var i = 0; i < n - 1; i++) r[i] = arr[9 - n + 1 + i];
        r[n - 1] = arr[0];
        for (var i = n; i < 9; i++) r[i] = arr[i - n + 1];
    }
    return r;
}

// 日柱干支计算 (dayPillar from bazi.js)
function _qmDayPillar(dateStr) {
    if (typeof calcDayPillar === 'function') return calcDayPillar(dateStr);
    // Fallback calculation
    var ref = new Date(1900, 0, 1);
    var refGzIdx = 10; // 1900-01-01 = 甲戌
    var parts = dateStr.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    var days = Math.floor((d - ref) / 86400000);
    var idx = ((refGzIdx + days) % 60 + 60) % 60;
    var ganIdx = (idx % 10 + 10) % 10;
    var zhiIdx = (idx % 12 + 12) % 12;
    return QM_GAN[ganIdx] + QM_ZHI[zhiIdx];
}

// 年柱干支
function _qmYearPillar(dateStr, hour) {
    var parts = dateStr.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2], hour || 12, 0, 0);
    var yr = parts[0];

    // Use SOLAR_TERMS if available
    if (typeof SOLAR_TERMS !== 'undefined') {
        for (var y = yr - 1; y <= yr + 1; y++) {
            var ys = String(y);
            if (SOLAR_TERMS[ys] && SOLAR_TERMS[ys].beginning_of_spring) {
                var lcStr = SOLAR_TERMS[ys].beginning_of_spring;
                var lcParts = lcStr.split(/[- :]/).map(Number);
                var lcDt = new Date(lcParts[0], lcParts[1] - 1, lcParts[2], lcParts[3] || 0, lcParts[4] || 0);
                if (dt < lcDt) {
                    // This 立春 is in our future, use (y-1)
                    var gzYr = y - 1;
                    var offset = ((gzYr - 1864) % 60 + 60) % 60;
                    return QM_GAN[offset % 10] + QM_ZHI[offset % 12];
                }
                // At or after this 立春
                if (y === yr) {
                    var gzYr2 = yr;
                    var offset2 = ((gzYr2 - 1864) % 60 + 60) % 60;
                    return QM_GAN[offset2 % 10] + QM_ZHI[offset2 % 12];
                }
            }
        }
    }
    // Fallback: approximate (立春 ~Feb 4)
    var lichun = new Date(yr, 1, 4); // Feb 4
    var gzYr = dt < lichun ? yr - 1 : yr;
    var offset = ((gzYr - 1864) % 60 + 60) % 60;
    return QM_GAN[offset % 10] + QM_ZHI[offset % 12];
}

// 月柱干支
function _qmMonthPillar(dateStr, hour) {
    var parts = dateStr.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2], hour || 12, 0, 0);

    // Find current solar term
    var currSt = _findCurrST(dt);
    if (!currSt) return '';
    var stName = currSt.name;

    // Map solar term → month number (zi = month pillar month index)
    var stMonth = {
        '立春':1,'雨水':1,'惊蛰':2,'春分':2,'清明':3,'谷雨':3,
        '立夏':4,'小满':4,'芒种':5,'夏至':5,'小暑':6,'大暑':6,
        '立秋':7,'处暑':7,'白露':8,'秋分':8,'寒露':9,'霜降':9,
        '立冬':10,'小雪':10,'大雪':11,'冬至':11,'小寒':12,'大寒':12
    };

    var info = stMonth[stName];
    if (!info) return '';
    var mn = info;
    var ziMap = {'立春':3,'惊蛰':4,'清明':5,'立夏':6,'芒种':7,'小暑':8,'立秋':9,'白露':10,'寒露':11,'立冬':12,'大雪':1,'小寒':2,'雨水':3,'春分':4,'谷雨':5,'小满':6,'夏至':7,'大暑':8,'处暑':9,'秋分':10,'霜降':11,'小雪':12,'冬至':1,'大寒':2};
    var zi = ziMap[stName] - 1; // 0-based

    var yg = _qmYearPillar(dateStr, hour)[0];
    var wuhudun = {'甲':3,'己':3,'乙':5,'庚':5,'丙':7,'辛':7,'丁':9,'壬':9,'戊':1,'癸':1};
    var jg = wuhudun[yg] || 3;
    var gi = jg + mn - 1;
    if (gi > 10) gi -= 10;
    return QM_GAN[gi - 1] + QM_ZHI[zi];
}

// 时柱干支
function _qmHourPillar(dateStr, hour, minute) {
    var dg = _qmDayPillar(dateStr);
    var dgIs = QM_GAN_IX[dg[0]] || 1;

    // Chinese hour index
    var h = hour || 12, m = minute || 0;
    var total = h * 60 + m;
    var zi;
    if (total >= 1380 || total < 60) zi = 0;  // 子时
    else zi = Math.floor((h - 1) / 2) + 1;     // 丑=1...亥=11
    if (zi === 12) zi = 0;

    // 五鼠遁
    var zg = dgIs * 2 - 1;
    if (zg > 10) zg -= 10;
    var gan = zg + zi;
    if (gan > 10) gan -= 10;
    return QM_GAN[gan === 0 ? 9 : gan - 1] + QM_ZHI[zi === 0 ? 11 : zi];
}

// 旬空 (用日柱)
function _qmXunkong(gz) {
    var gi = QM_GAN_IX[gz[0]] || 1;
    var zi = QM_ZHI_IX[gz[1]] || 1;
    var off = (zi - gi + 10) % 12;
    return QM_ZHI[off] + QM_ZHI[(off + 1) % 12];
}

// Find current solar term
function _findCurrST(dt) {
    if (typeof SOLAR_TERMS === 'undefined') return null;

    var termKeys = ['lesser_cold','greater_cold','beginning_of_spring','rain_water','waking_of_insects','spring_equinox','pure_brightness','grain_rain','beginning_of_summer','lesser_fullness','grain_in_beard','summer_solstice','lesser_heat','greater_heat','beginning_of_autumn','end_of_heat','white_dew','autumn_equinox','cold_dew','frost_descent','beginning_of_winter','lesser_snow','greater_snow','winter_solstice'];
    var termNames = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

    var allTerms = [];
    for (var y = dt.getFullYear() - 1; y <= dt.getFullYear() + 1; y++) {
        var ys = String(y);
        if (!SOLAR_TERMS[ys]) continue;
        for (var ti = 0; ti < termKeys.length; ti++) {
            var tkey = termKeys[ti];
            var tname = termNames[ti];
            if (SOLAR_TERMS[ys][tkey]) {
                var tval = SOLAR_TERMS[ys][tkey];
                var tparts = tval.split(/[- :]/).map(Number);
                var tdt = new Date(tparts[0], tparts[1] - 1, tparts[2], tparts[3] || 0, tparts[4] || 0);
                allTerms.push({dt: tdt, name: tname});
            }
        }
    }
    allTerms.sort(function(a, b) { return a.dt - b.dt; });

    var curr = null;
    for (var ai = 0; ai < allTerms.length; ai++) {
        if (allTerms[ai].dt <= dt) curr = allTerms[ai];
        else break;
    }
    return curr;
}

// ========== MAIN PAIPAN FUNCTION ==========
function calculateQimen(dateStr, timeStr, question) {
    var parts = dateStr.split('-').map(Number);
    var tparts = (timeStr || '12:00').split(':').map(Number);
    var year = parts[0], month = parts[1], day = parts[2];
    var hour = tparts[0], minute = tparts[1] || 0;

    var dgz = _qmDayPillar(dateStr);
    var ygz = _qmYearPillar(dateStr, hour);
    var mgz = _qmMonthPillar(dateStr, hour);
    var hgz = _qmHourPillar(dateStr, hour, minute);

    // 旬空 (用时柱)
    var xk = _qmXunkong(hgz);

    // Current solar term
    var currSt = _findCurrST(new Date(year, month - 1, day, hour, minute, 0));
    var stName = currSt ? currSt.name : '';
    var jqIdx = QM_JIEQI_IX[stName];
    if (typeof jqIdx === 'undefined') jqIdx = -1;

    // 阴阳遁
    var dun = (jqIdx >= 0 && jqIdx <= 11) ? 1 : 0;

    // 三元
    var ft = QM_FUTOU[dgz] || '';
    var yuan = 0;
    if (ft) {
        var z = ft[1];
        if ('子午卯酉'.indexOf(z) >= 0) yuan = 0;
        else if ('寅申巳亥'.indexOf(z) >= 0) yuan = 1;
        else if ('辰戌丑未'.indexOf(z) >= 0) yuan = 2;
    }

    var ju = (jqIdx >= 0 && QM_JU_TABLE[jqIdx]) ? QM_JU_TABLE[jqIdx][yuan] : 1;
    var yuanNames = ['上元','中元','下元'];
    var yuanName = yuanNames[yuan];
    var dunName = dun === 1 ? '阳遁' : '阴遁';
    var juNumMap = ['一','二','三','四','五','六','七','八','九'];
    var juNumStr = juNumMap[ju - 1] || String(ju);

    // 旬首 & 仪空
    var xs = QM_XUNSHOU[hgz] || '';
    var yk = QM_YIKONG[hgz] || '';
    var xsYi = xs.length >= 3 ? xs[2] : '';

    // 地盘奇仪
    var dipan = _reorder(QM_QYI.slice(), ju, dun);
    // Tag 仪空
    for (var di = 0; di < 9; di++) {
        if (dipan[di] === yk) dipan[di] = yk + '◇'; // ◇
    }

    // 暗干支
    var dipXsIdx = dipan.indexOf(xsYi);
    if (dipXsIdx < 0) dipXsIdx = 0;
    var dipXsStart = dipXsIdx + 1;

    var xsZhi = xs.length >= 2 ? xs[1] : '';
    var zs = QM_ZHI_IX[xsZhi] || 1;
    var zhiSeq = '';
    for (var i2 = zs - 1; i2 < 12; i2++) zhiSeq += QM_ZHI[i2];
    for (var i2 = 0; i2 < zs - 1; i2++) zhiSeq += QM_ZHI[i2];

    var pairs = [];
    pairs.push(QM_GAN[9] + zhiSeq[9]); // 癸+第10个地支
    for (var i2 = 1; i2 < 10; i2++) pairs.push(QM_GAN[i2] + zhiSeq[i2]);

    var angan = _reorder(pairs, dipXsStart, dun);

    // 值符 & 值使
    var zf = xsYi !== '' ? QM_JIU_XING[dipan.indexOf(xsYi) % 9] : '';
    var zsMen = xsYi !== '' ? QM_BA_MEN[dipan.indexOf(xsYi) % 9] : '';

    // 天盘奇仪
    var hg = hgz[0];
    var target = hg === '甲' ? (xsYi || '戊') : hg;
    var startIdx;
    if (hg === yk) {
        var tidx = dipan.indexOf(target + '◇');
        startIdx = tidx >= 0 ? tidx + 1 : (dipan.indexOf(target) + 1);
    } else {
        startIdx = dipan.indexOf(target) + 1;
    }

    var yiStart = QM_QYI.indexOf(xsYi) + 1;
    if (yiStart === 0) yiStart = 1;
    var yiSeq = [];
    for (var i3 = yiStart - 1; i3 < 9; i3++) yiSeq.push(QM_QYI[i3]);
    for (var i3 = 0; i3 < yiStart - 1; i3++) yiSeq.push(QM_QYI[i3]);

    var tianpan = _reorder(yiSeq, startIdx, dun);
    // Tag 仪空 in tianpan
    for (var ti2 = 0; ti2 < 9; ti2++) {
        if (tianpan[ti2] === yk) tianpan[ti2] = yk + '◇';
    }

    // 值符落宫
    var gzf;
    if (hg === '甲') {
        gzf = dipan.indexOf(xsYi) + 1;
        if (gzf === 0) gzf = 1;
    } else if (hg === yk) {
        var tidx2 = dipan.indexOf(hg + '◇');
        gzf = (tidx2 >= 0 ? tidx2 : dipan.indexOf(hg)) + 1;
    } else {
        gzf = dipan.indexOf(hg) + 1;
    }
    if (gzf < 1) gzf = 1;

    // 值使落宫
    var anZhi = [];
    for (var ai2 = 0; ai2 < 9; ai2++) anZhi.push(angan[ai2][1] || '');
    var hz2 = hgz[1];
    gzs = anZhi.indexOf(hz2) + 1;
    if (gzs < 1) gzs = 1;

    // 天盘星
    var zfIdx = QM_JIU_XING.indexOf(zf) + 1;
    if (zfIdx === 0) zfIdx = 1;
    var ns = 10 - zfIdx + gzf;
    if (ns > 9) ns -= 9;
    var tianpanXing = _reorder(QM_JIU_XING.slice(), ns, dun);

    // 人盘门
    var zsIdx = QM_BA_MEN.indexOf(zsMen) + 1;
    if (zsIdx === 0) zsIdx = 1;
    ns = 10 - zsIdx + gzs;
    if (ns > 9) ns -= 9;
    var renpan = _reorder(QM_BA_MEN.slice(), ns, dun);
    for (var ri = 0; ri < renpan.length; ri++) {
      if (renpan[ri] === '中五') renpan[ri] = '';
    }
    renpan[4] = '';

    // 神盘
    var hz = hgz[1];
    var hzIx0 = QM_ZHI_IX[hz] - 1;
    var yongShen = hzIx0 < 6 ? QM_JIU_SHEN_YANG.slice() : QM_JIU_SHEN_YIN.slice();
    var shen = _reorder(yongShen, gzf, dun);

    // 地盘神
    var dipXsIdx2 = dipan.indexOf(xsYi);
    if (dipXsIdx2 < 0) dipXsIdx2 = 0;
    var dipShen = _reorder(yongShen.slice(), dipXsIdx2 + 1, dun);
    var xkGongs = QM_XK_GONG[xk] || [];
    for (var xki = 0; xki < xkGongs.length; xki++) {
        var g = xkGongs[xki];
        if (g >= 1 && g <= 9) dipShen[g - 1] = dipShen[g - 1] + '○'; // ○
    }

    // 卦气
    var gqSeq = QM_GUA_QI_SEQ[jqIdx] || '';
    var guaqi = [];
    for (var gqi2 = 0; gqi2 < 9; gqi2++) {
        if (gqSeq && gqSeq[gqi2]) {
            guaqi.push(QM_GUA_QI[Number(gqSeq[gqi2])]);
        } else {
            guaqi.push('');
        }
    }

    // 驿马
    var yima = QM_YIMA[hgz[1]] || 0;

    // 日干/时干落宫
    var rigan = dgz[0], shigan = hgz[0];
    var rigong = 0, shigong = 0;
    for (var gi2 = 0; gi2 < 9; gi2++) {
        var qy = tianpan[gi2];
        if (qy[0] === rigan && !rigong) rigong = gi2 + 1;
        if (qy[0] === shigan && !shigong) shigong = gi2 + 1;
    }

    // 十二长生
    var riganCs = '', shiganCs = '';
    var gongZhiMap = {1:'子',8:'寅',3:'卯',4:'巳',9:'午',2:'申',7:'酉',6:'亥',5:'午'};
    if (rigong > 0) {
        var csZ = QM_CHANG_SHENG_ZHI[rigan];
        if (csZ) {
            var csS = QM_ZHI_IX[csZ];
            var gz = gongZhiMap[rigong];
            if (gz) {
                var gzIx = QM_ZHI_IX[gz];
                var off = gzIx - csS;
                if (off < 0) off += 12;
                riganCs = QM_SHENG_CHANG[off];
            }
        }
    }
    if (shigong > 0) {
        var csZ2 = QM_CHANG_SHENG_ZHI[shigan];
        if (csZ2) {
            var csS2 = QM_ZHI_IX[csZ2];
            var gz2 = gongZhiMap[shigong];
            if (gz2) {
                var gzIx2 = QM_ZHI_IX[gz2];
                var off2 = gzIx2 - csS2;
                if (off2 < 0) off2 += 12;
                shiganCs = QM_SHENG_CHANG[off2];
            }
        }
    }

    // 主客分析
    var rw = QM_GAN_WX[rigan] || '', sw = QM_GAN_WX[shigan] || '';
    var zk = '';
    if (rw && sw) {
        if (QM_WX_S[rw] === sw) zk = '日干(主)生时干(客): 我方消耗对方,利主';
        else if (QM_WX_S[sw] === rw) zk = '时干(客)生日干(主): 对方生扶我方,吉';
        else if (QM_WX_K[rw] === sw) zk = '日干(主)克时干(客): 我方制约对方,利主';
        else if (QM_WX_K[sw] === rw) zk = '时干(客)克日干(主): 对方克制我方,凶';
        else zk = '日干时干比和: 主客力量相当';
    }

    // 五不遇时
    var jishi = '';
    var dg = hgz[0], hg2 = hgz[0], hourZhi = hgz[1];
    var dgIs = QM_GAN_IX[dg] || 1;
    // Month-zhi branch for 月忌
    var mgZhi = mgz ? mgz[1] : '';
    var qimMB = mgZhi;
    // Simplified jishi check
    var wubu = {'甲':'庚','乙':'辛','丙':'壬','丁':'癸','戊':'甲','己':'乙','庚':'丙','辛':'丁','壬':'戊','癸':'己'};
    if (wubu[dg] && wubu[dg] === hg2) jishi += '五不遇时';

    // 格局分析 per palace
    var geshi = [];
    for (var g2 = 1; g2 <= 9; g2++) {
        var idx = g2 - 1;
        var tg = tianpan[idx], dg2 = dipan[idx];
        var tgClean = tg[0], dgClean = dg2[0];
        var gn = QM_GONG_SHORT[g2] || '';
        var men = renpan[idx], sh = shen[idx];
        var pair = tgClean + dgClean;
        var triple = tgClean + dgClean + gn;

        var pats = [];
        // 正格
        if (QM_ZHENG_GE[pair]) pats = pats.concat(QM_ZHENG_GE[pair]);
        // 辅格
        if (QM_FU_GE[triple]) pats = pats.concat(QM_FU_GE[triple]);
        // 击刑
        var jxPair = tgClean + gn;
        var jxRefs = QM_ZHENG_GE['击刑'] || [];
        if (jxRefs.indexOf(jxPair) >= 0) pats.push('击刑');
        var jxPairD = dgClean + gn;
        if (jxRefs.indexOf(jxPairD) >= 0) pats.push('击刑(地)');
        // 三奇得使
        if (tgClean === '乙' && (dgClean === '己' || dgClean === '辛') && dgClean === yk) pats.push('三奇得使');
        else if (tgClean === '丙' && (dgClean === '戊' || dgClean === '庚') && dgClean === yk) pats.push('三奇得使');
        else if (tgClean === '丁' && (dgClean === '壬' || dgClean === '癸') && dgClean === yk) pats.push('三奇得使');
        // 三奇游六仪
        if ('乙丙丁'.indexOf(tgClean) >= 0 && dgClean === yk) pats.push('三奇游六仪');
        // 直使门格
        if (men === zsMen) {
            var zmMap = {'丁':'玉女守门','乙':'日照当门','丙':'月拱福户','己':'地户蔽门','庚':'太白刑门','辛':'天庭抵户','壬':'使入地牢','癸':'天网华盖'};
            if (zmMap[dgClean]) pats.push(zmMap[dgClean]);
        }
        // 九遁
        if (tgClean === '丙' && men === '生门' && (dgClean === '戊' || dgClean === '丁')) pats.push('天遁');
        if (tgClean === '乙' && men === '开门' && dgClean === '己') pats.push('地遁');
        if (sh === '太阴' && tgClean === '丁' && men === '休门') pats.push('人遁');
        if (sh === '九天' && tgClean === '丙' && men === '生门') pats.push('神遁');
        if (sh === '九地' && tgClean === '乙' && men === '开门') pats.push('鬼遁');
        if ((tgClean === '辛' || tgClean === '乙') && (men === '休门' || men === '开门' || men === '生门') && (dgClean === '乙' || gn === '巽')) pats.push('风遁');
        if (tgClean === '乙' && (men === '休门' || men === '开门' || men === '生门') && (dgClean === '辛' || gn === '震')) pats.push('云遁');
        if (tgClean === '乙' && men === '休门' && (dgClean === '癸' || gn === '坎')) pats.push('龙遁');
        if (tgClean === '乙' && (men === '开门' || men === '生门') && (dgClean === '辛' || gn === '兑' || gn === '艮')) pats.push('虎遁');
        if (tgClean === '乙' && men === '生门' && dgClean === '丁') pats.push('文遁');
        if (tgClean === '丙' && men === '开门' && dgClean === '辛') pats.push('武遁');
        // 空亡
        if (tgClean === yk || dgClean === yk) pats.push('空亡');
        if (g2 === yima) pats.push('驿马');

        var gongName = QM_GONG_NAME[g2] || '宫' + g2;
        var patStr = pats.length ? pats.join('、') : '无特殊格局';
        geshi.push(gongName + ' ' + tgClean + '+' + dgClean + ' (' + men + ' ' + sh + '): ' + patStr);
    }

    return {
        datetime: dateStr + ' ' + (timeStr || '12:00') + ':00',
        year_gz: ygz, month_gz: mgz, day_gz: dgz, hour_gz: hgz,
        xunkong: xk, xunshou: xs, yikong: yk,
        dun: dun, dun_name: dunName,
        st_name: stName, ju: ju,
        yuan_name: yuanName, ju_num_str: juNumStr,
        zf: zf, zs_men: zsMen,
        gzf: gzf, gzs: gzs,
        di_zf: xsYi !== '' ? QM_JIU_XING[dipan.indexOf(xsYi) % 9] : '',
        di_zf_gong: (dipan.indexOf(xsYi) % 9) + 1,
        yima: yima,
        dipan: dipan, tianpan: tianpan,
        tianpan_xing: tianpanXing, renpan: renpan,
        shen: shen, dip_shen: dipShen,
        angan: angan, guaqi: guaqi,
        rigan: rigan, shigan: shigan,
        rigong: rigong, shigong: shigong,
        rigan_cs: riganCs, shigan_cs: shiganCs,
        zk: zk, jishi: jishi,
        geshi: geshi,
        question: question || ''
    };
}
