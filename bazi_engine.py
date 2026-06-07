# -*- coding: utf-8 -*-
"""
金镖门盲派八字排盘引擎 v1.0
Bazi Chart Calculation Engine — parameterized, importable, no print statements.

Usage:
    from bazi_engine import calculate_bazi
    result = calculate_bazi('1999-06-21', '12:00', 'female')
    # result is a dict with full chart data
"""

import json
from datetime import datetime

# ============================================================
# CONSTANTS
# ============================================================
STEMS  = '甲乙丙丁戊己庚辛壬癸'
BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
YANG_STEMS = set('甲丙戊庚壬')

# 60 Jiazi cycle (甲子=1, 乙丑=2, ..., 癸亥=60)
JIAZI = [STEMS[i % 10] + BRANCHES[i % 12] for i in range(60)]

# 五虎遁: Year Stem → Yin month (寅月) Stem
TIGER_RULE = {'甲':'丙','乙':'戊','丙':'庚','丁':'壬','戊':'甲','己':'丙','庚':'戊','辛':'庚','壬':'壬','癸':'甲'}

# 五鼠遁: Day Stem → Zi time (子时) Stem
RAT_RULE   = {'甲':'甲','乙':'丙','丙':'戊','丁':'庚','戊':'壬','己':'甲','庚':'丙','辛':'戊','壬':'庚','癸':'壬'}

# 60 Jiazi Nayin (纳音五行)
NAYIN_TABLE = {
    '甲子':'海中金','乙丑':'海中金','丙寅':'炉中火','丁卯':'炉中火',
    '戊辰':'大林木','己巳':'大林木','庚午':'路旁土','辛未':'路旁土',
    '壬申':'剑锋金','癸酉':'剑锋金','甲戌':'山头火','乙亥':'山头火',
    '丙子':'涧下水','丁丑':'涧下水','戊寅':'城头土','己卯':'城头土',
    '庚辰':'白蜡金','辛巳':'白蜡金','壬午':'杨柳木','癸未':'杨柳木',
    '甲申':'泉中水','乙酉':'泉中水','丙戌':'屋上土','丁亥':'屋上土',
    '戊子':'霹雳火','己丑':'霹雳火','庚寅':'松柏木','辛卯':'松柏木',
    '壬辰':'长流水','癸巳':'长流水','甲午':'沙中金','乙未':'沙中金',
    '丙申':'山下火','丁酉':'山下火','戊戌':'平地木','己亥':'平地木',
    '庚子':'壁上土','辛丑':'壁上土','壬寅':'金箔金','癸卯':'金箔金',
    '甲辰':'覆灯火','乙巳':'覆灯火','丙午':'天河水','丁未':'天河水',
    '戊申':'大驿土','己酉':'大驿土','庚戌':'钗钏金','辛亥':'钗钏金',
    '壬子':'桑柘木','癸丑':'桑柘木','甲寅':'大溪水','乙卯':'大溪水',
    '丙辰':'沙中土','丁巳':'沙中土','戊午':'天上火','己未':'天上火',
    '庚申':'石榴木','辛酉':'石榴木','壬戌':'大海水','癸亥':'大海水',
}

# Nayin five-element mapping
NAYIN_WUXING = {
    '海中金':'金','炉中火':'火','大林木':'木','路旁土':'土','剑锋金':'金','山头火':'火',
    '涧下水':'水','城头土':'土','白蜡金':'金','杨柳木':'木','泉中水':'水','屋上土':'土',
    '霹雳火':'火','松柏木':'木','长流水':'水','沙中金':'金','山下火':'火','平地木':'木',
    '壁上土':'土','金箔金':'金','覆灯火':'火','天河水':'水','大驿土':'土','钗钏金':'金',
    '桑柘木':'木','大溪水':'水','沙中土':'土','天上火':'火','石榴木':'木','大海水':'水',
}

# 十二长生 stages (for Yang stems: 甲丙戊庚壬)
TWELVE_STAGES = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养']

# Twelve stage locations per stem (branches in order of stage)
CHANGSHENG_MAP = {
    '甲': ['亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌'],
    '乙': ['午','巳','辰','卯','寅','丑','子','亥','戌','酉','申','未'],  # Yin goes reverse
    '丙': ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'],
    '丁': ['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'],
    '戊': ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'],  # Same as 丙
    '己': ['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'],  # Same as 丁
    '庚': ['巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰'],
    '辛': ['子','亥','戌','酉','申','未','午','巳','辰','卯','寅','丑'],
    '壬': ['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'],
    '癸': ['卯','寅','丑','子','亥','戌','酉','申','未','午','巳','辰'],
}

# 地支藏干 (Hidden Stems in Earthly Branches)
CANGAN = {
    '子': ['癸'],
    '丑': ['己','癸','辛'],
    '寅': ['甲','丙','戊'],
    '卯': ['乙'],
    '辰': ['戊','乙','癸'],
    '巳': ['丙','戊','庚'],
    '午': ['丁','己'],
    '未': ['己','丁','乙'],
    '申': ['庚','壬','戊'],
    '酉': ['辛'],
    '戌': ['戊','辛','丁'],
    '亥': ['壬','甲'],
}

# 旬空 (Xun Kong) — which branches are empty for each 旬
XUN_KONG = {
    '甲子': ['戌','亥'], '乙丑': ['戌','亥'],  # 甲子旬
    '甲戌': ['申','酉'], '乙亥': ['申','酉'],  # 甲戌旬
    '甲申': ['午','未'], '乙酉': ['午','未'],  # 甲申旬
    '甲午': ['辰','巳'], '乙未': ['辰','巳'],  # 甲午旬
    '甲辰': ['寅','卯'], '乙巳': ['寅','卯'],  # 甲辰旬
    '甲寅': ['子','丑'], '乙卯': ['子','丑'],  # 甲寅旬
}

# 地支六冲 (Six Clashes)
CHONG_PAIRS = [('子','午'),('丑','未'),('寅','申'),('卯','酉'),('辰','戌'),('巳','亥')]
# 地支六合 (Six Harmonies)
HE_PAIRS = [('子','丑'),('寅','亥'),('卯','戌'),('辰','酉'),('巳','申'),('午','未')]
# 地支三合 (Three Harmonies)
SANHE = {
    ('申','子','辰'): '水局',
    ('亥','卯','未'): '木局',
    ('寅','午','戌'): '火局',
    ('巳','酉','丑'): '金局',
}
# 地支相穿/相害 (Six Harms)
CHUAN_PAIRS = [('子','未'),('丑','午'),('寅','巳'),('卯','辰'),('申','亥'),('酉','戌')]
# 地支相刑
XING = {
    ('寅','巳','申'): '无恩之刑',
    ('丑','戌','未'): '恃势之刑',
    ('子','卯'): '无礼之刑',
    ('辰','午','酉','亥'): '自刑',
}

# ============================================================
# UTILITY
# ============================================================
def fix(n, m=12):
    while n < 0: n += m
    while n >= m: n -= m
    return n

def load_solar_terms():
    """Load the solar terms data file."""
    with open(r'E:\AI\solar_terms_astro_cst.json', 'r', encoding='utf-8') as f:
        return json.load(f)

# ============================================================
# CORE CALCULATIONS
# ============================================================

def calc_day_pillar(solar_date):
    """Calculate the day pillar (日柱) for a given Gregorian date.
    Uses the reference: 1900-01-01 = 甲戌 (day 11 of the 60-day cycle).
    """
    ref = datetime(1900, 1, 1)
    d = solar_date if isinstance(solar_date, datetime) else datetime.strptime(solar_date, '%Y-%m-%d')
    days = (d.date() - ref.date()).days
    day_num = (10 + days) % 60  # 0-indexed: 甲戌 is idx 10
    return JIAZI[day_num]


def calc_year_pillar(solar_date, terms=None):
    """Calculate the year pillar (年柱) based on 立春 (Beginning of Spring).
    Born before 立春 → use previous year's pillar.
    """
    if terms is None:
        terms = load_solar_terms()
    d = solar_date if isinstance(solar_date, datetime) else datetime.strptime(solar_date, '%Y-%m-%d')
    year = d.year
    yr_key = str(year)
    if yr_key not in terms:
        yr_key = str(year - 1)
    lichun = datetime.strptime(terms[yr_key]['beginning_of_spring'], '%Y-%m-%d %H:%M')
    if d < lichun:
        year -= 1
    gan = STEMS[(year - 4) % 10]
    zhi = BRANCHES[(year - 4) % 12]
    return gan + zhi


def calc_month_pillar(solar_date, nian_gan, terms=None):
    """Calculate the month pillar (月柱) based on solar terms (节气月).
    Uses 五虎遁: year stem → month stem.
    """
    if terms is None:
        terms = load_solar_terms()
    d = solar_date if isinstance(solar_date, datetime) else datetime.strptime(solar_date, '%Y-%m-%d')

    # Which solar term month are we in?
    # 12 节 define month boundaries
    term_to_month = {
        'beginning_of_spring': 1,   # 寅月
        'waking_of_insects': 2,     # 卯月
        'pure_brightness': 3,       # 辰月
        'beginning_of_summer': 4,   # 巳月
        'grain_in_beard': 5,        # 午月
        'lesser_heat': 6,           # 未月
        'beginning_of_autumn': 7,   # 申月
        'white_dew': 8,             # 酉月
        'cold_dew': 9,              # 戌月
        'beginning_of_winter': 10,  # 亥月
        'greater_snow': 11,         # 子月
        'lesser_cold': 12,          # 丑月
    }

    yr_key = str(d.year)
    if yr_key not in terms:
        yr_key = str(d.year - 1)

    # Sort all solar terms by date for correct ordering
    sorted_terms = sorted(
        [(k, datetime.strptime(v, '%Y-%m-%d %H:%M')) for k, v in terms[yr_key].items()],
        key=lambda x: x[1]
    )

    lunar_month = 12  # default to 丑月
    for tkey, tdt in sorted_terms:
        if tkey in term_to_month and d >= tdt:
            lunar_month = term_to_month[tkey]

    # Also check next year's 小寒 if birth is in January
    next_yr = str(d.year + 1)
    if next_yr in terms and 'lesser_cold' in terms[next_yr]:
        for tkey in ['lesser_cold']:
            tdt = datetime.strptime(terms[next_yr][tkey], '%Y-%m-%d %H:%M')
            if d >= tdt and tkey in term_to_month:
                lunar_month = term_to_month[tkey]

    # 五虎遁: year stem → yin month stem, then offset to target month
    yin_gan = TIGER_RULE[nian_gan]
    yin_idx = STEMS.index(yin_gan)
    yue_gan = STEMS[(yin_idx + lunar_month - 1) % 10]
    yue_zhi = BRANCHES[(2 + lunar_month - 1) % 12]  # 寅 index=2

    return yue_gan + yue_zhi, lunar_month


def calc_time_pillar(ri_gan, time_str):
    """Calculate the time pillar (时柱) from day stem and time string (HH:MM).
    Uses 五鼠遁: day stem → zi time stem.
    """
    h = int(time_str.split(':')[0])
    m = int(time_str.split(':')[1])

    # Map to 时辰 index (0=子, 1=丑, ..., 11=亥)
    # 子时: 23:00-01:00 → index 0
    # 丑时: 01:00-03:00 → index 1
    # ...etc
    total_minutes = h * 60 + m
    if total_minutes >= 1380 or total_minutes < 60:  # 23:00 - 00:59
        shi_zhi_idx = 0  # 子
    else:
        shi_zhi_idx = ((h + 1) // 2) % 12
        if shi_zhi_idx == 0:
            shi_zhi_idx = 1  # adjust: 01:00-02:59 → 丑(1)

    # Actually simpler: each 时辰 = 2 hours starting from 23:00
    hour_map = [
        (23, 0), (1, 1), (3, 2), (5, 3), (7, 4), (9, 5),
        (11, 6), (13, 7), (15, 8), (17, 9), (19, 10), (21, 11)
    ]
    shi_zhi_idx = 0  # default
    for start_h, idx in hour_map:
        end_h = (start_h + 2) % 24
        if start_h == 23:
            if h >= 23 or h < 1:
                shi_zhi_idx = idx
                break
        elif start_h <= h < end_h:
            shi_zhi_idx = idx
            break

    zi_gan = RAT_RULE[ri_gan]
    shi_gan = STEMS[(STEMS.index(zi_gan) + shi_zhi_idx) % 10]
    shi_zhi = BRANCHES[shi_zhi_idx]

    return shi_gan + shi_zhi, shi_zhi


def get_chinese_hour(time_str):
    """Get the Chinese 时辰 name from time string."""
    h = int(time_str.split(':')[0])
    hour_names = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时']
    hour_map = [(23,0),(1,1),(3,2),(5,3),(7,4),(9,5),(11,6),(13,7),(15,8),(17,9),(19,10),(21,11)]
    for start_h, idx in hour_map:
        end_h = (start_h + 2) % 24
        if start_h == 23:
            if h >= 23 or h < 1:
                return hour_names[idx]
        elif start_h <= h < end_h:
            return hour_names[idx]
    return '?'

# ============================================================
# NAYIN (纳音)
# ============================================================
def get_nayin(pillar):
    """Get 纳音 for a pillar (e.g. '甲子' → '海中金')."""
    return NAYIN_TABLE.get(pillar, '?')

def get_nayin_wuxing(pillar):
    """Get five element for a pillar's nayin."""
    ny = NAYIN_TABLE.get(pillar, '')
    return NAYIN_WUXING.get(ny, '?')

# ============================================================
# TWELVE STAGES (十二长生)
# ============================================================
def get_changsheng(stem, branch):
    """Get the twelve-stage name for a stem in a given branch.
    e.g. get_changsheng('甲', '亥') → '长生'
    """
    lst = CHANGSHENG_MAP.get(stem, [])
    if branch in lst:
        return TWELVE_STAGES[lst.index(branch)]
    return '?'

# ============================================================
# HIDDEN STEMS (藏干)
# ============================================================
def get_cangan(branch):
    """Get hidden stems for a branch."""
    return CANGAN.get(branch, [])

# ============================================================
# TEN GODS (十神)
# ============================================================
def get_shishen(day_stem, other_stem):
    """Calculate 十神 relationship between day_stem (日主) and other_stem.
    e.g. get_shishen('甲', '丙') → '食神'
    """
    if day_stem == other_stem:
        return '比肩'

    # Same element but different yin/yang → 劫财
    same_elem = {'甲':'乙','乙':'甲','丙':'丁','丁':'丙','戊':'己','己':'戊',
                 '庚':'辛','辛':'庚','壬':'癸','癸':'壬'}
    if other_stem == same_elem.get(day_stem):
        return '劫财'

    ds_yang = day_stem in YANG_STEMS
    os_yang = other_stem in YANG_STEMS
    same_yin_yang = (ds_yang == os_yang)

    # Helper: check if two stems are same element (different yin/yang) or the specific stem
    def _same_wuxing(a, b):
        """Return True if a and b have the same five-element."""
        pairs = [('甲','乙'),('丙','丁'),('戊','己'),('庚','辛'),('壬','癸')]
        for x, y in pairs:
            if a in (x,y) and b in (x,y):
                return True
        return False

    # 我生者: 食神(同性) / 伤官(异性)
    sheng_pairs = [('甲','丙丁'),('丙','戊己'),('戊','庚辛'),('庚','壬癸'),('壬','甲乙'),
                   ('乙','丁丙'),('丁','己戊'),('己','辛庚'),('辛','癸壬'),('癸','乙甲')]
    for ds, targets in sheng_pairs:
        if day_stem == ds and other_stem in targets:
            return '食神' if same_yin_yang else '伤官'

    # 我克者: 偏财(同性) / 正财(异性)
    ke_pairs = [('甲','戊己'),('戊','壬癸'),('壬','丙丁'),('丙','庚辛'),('庚','甲乙'),
                ('乙','己戊'),('己','癸壬'),('癸','丁丙'),('丁','辛庚'),('辛','乙甲')]
    for ds, targets in ke_pairs:
        if day_stem == ds and other_stem in targets:
            return '偏财' if same_yin_yang else '正财'

    # 生我者: 偏印/枭神(同性) / 正印(异性)
    beisheng_pairs = [('甲','壬癸'),('壬','庚辛'),('庚','戊己'),('戊','丙丁'),('丙','甲乙'),
                      ('乙','癸壬'),('癸','辛庚'),('辛','己戊'),('己','丁丙'),('丁','乙甲')]
    for ds, targets in beisheng_pairs:
        if day_stem == ds and other_stem in targets:
            return '偏印' if same_yin_yang else '正印'

    # 克我者: 七杀(同性) / 正官(异性)
    beike_pairs = [('甲','庚辛'),('庚','丙丁'),('丙','壬癸'),('壬','戊己'),('戊','甲乙'),
                   ('乙','辛庚'),('辛','丁丙'),('丁','癸壬'),('癸','己戊'),('己','乙甲')]
    for ds, targets in beike_pairs:
        if day_stem == ds and other_stem in targets:
            return '七杀' if same_yin_yang else '正官'

    return '?'


# ============================================================
# KONG WANG (空亡)
# ============================================================
def get_xunkong(day_pillar):
    """Get the 空亡 pair for a given day pillar.
    Returns list of 2 branches that are empty.
    """
    # Find the 旬 head
    day_stem = day_pillar[0]
    day_branch = day_pillar[1]
    dsi = STEMS.index(day_stem)
    dbi = BRANCHES.index(day_branch)
    for offset in range(60):
        ts = (dsi - offset) % 10
        tb = (dbi - offset) % 12
        if STEMS[ts] == '甲' and ts == tb:  # Found 旬头
            xun_head = '甲' + BRANCHES[tb]
            return XUN_KONG.get(xun_head, ['?','?'])
    return ['?','?']


# ============================================================
# BRANCH RELATIONSHIPS (地支关系)
# ============================================================
def get_branch_relations(branches):
    """Analyze relationships among a list of earthly branches.
    branches: list of 4 branches [年支, 月支, 日支, 时支]
    """
    relations = {'冲':[], '合':[], '穿':[], '刑':[], '三合':[], '拱':[]}

    # 六冲
    for a, b in CHONG_PAIRS:
        if a in branches and b in branches:
            relations['冲'].append(f'{a}午冲' if b=='午' else f'{a}{b}冲' if a+b in [p+q for p,q in CHONG_PAIRS] else f'{a}{b}冲')
    # Fix: just append the pair description
    relations['冲'] = []
    for a, b in CHONG_PAIRS:
        if a in branches and b in branches:
            relations['冲'].append(f'{a}{b}冲')

    # 六合
    for a, b in HE_PAIRS:
        if a in branches and b in branches:
            relations['合'].append(f'{a}{b}合')

    # 穿害
    for a, b in CHUAN_PAIRS:
        if a in branches and b in branches:
            relations['穿'].append(f'{a}{b}穿')

    # 三合
    sanhe_sets = {'申子辰':'水','亥卯未':'木','寅午戌':'火','巳酉丑':'金'}
    for trio, wu in sanhe_sets.items():
        count = sum(1 for b in trio if b in branches)
        if count >= 2:
            missing = [b for b in trio if b not in branches]
            relations['三合'].append(f'{trio[0]}{trio[1]}{trio[2]}合{wu}局(缺{missing[0]})' if missing else trio)

    # 拱局 (2 out of 3 in a sanhe group, missing the middle one)
    arch_map = {('寅','戌'):('午','火'),('巳','丑'):('酉','金'),('申','辰'):('子','水'),('亥','未'):('卯','木')}
    for (a, b), (result, wu) in arch_map.items():
        if a in branches and b in branches:
            relations['拱'].append(f'{a}{b}拱{result}{wu}')

    # 刑
    xing_groups = [
        (['寅','巳','申'], '无恩之刑'),
        (['丑','戌','未'], '恃势之刑'),
        (['子','卯'], '无礼之刑'),
    ]
    for group, desc in xing_groups:
        present = [b for b in group if b in branches]
        if len(present) >= 2:
            relations['刑'].append(f'{"".join(present)}{desc}')

    # 辰午酉亥自刑
    for b in ['辰','午','酉','亥']:
        if branches.count(b) >= 2:
            relations['刑'].append(f'{b}{b}自刑')

    return relations


# ============================================================
# TAI YUAN (胎元)
# ============================================================
def calc_taiyuan(month_pillar):
    """Calculate 胎元 from month pillar.
    月干进一, 月支进三
    """
    yue_gan = month_pillar[0]
    yue_zhi = month_pillar[1]
    tai_gan = STEMS[(STEMS.index(yue_gan) + 1) % 10]
    tai_zhi = BRANCHES[(BRANCHES.index(yue_zhi) + 3) % 12]
    return tai_gan + tai_zhi


# ============================================================
# DA YUN (大运)
# ============================================================
def calc_dayun(solar_date_str, time_str, nian_gan, yue_gan, yue_zhi, gender):
    """Calculate 大运 (10-year luck cycles).
    Returns: dict with direction, qiyun_age, and list of dayun steps.
    """
    terms = load_solar_terms()
    d = datetime.strptime(solar_date_str, '%Y-%m-%d')
    h = int(time_str.split(':')[0])
    m = int(time_str.split(':')[1])
    birth_dt = datetime(d.year, d.month, d.day, h, m)

    # Determine direction
    is_yang = nian_gan in YANG_STEMS
    shunpai = (is_yang and gender == 'male') or (not is_yang and gender == 'female')
    direction = '顺排' if shunpai else '逆排'

    # Build sorted list of 节 (not 气) from birth year
    jie_keys = [
        'beginning_of_spring', 'waking_of_insects', 'pure_brightness',
        'beginning_of_summer', 'grain_in_beard', 'lesser_heat',
        'beginning_of_autumn', 'white_dew', 'cold_dew',
        'beginning_of_winter', 'greater_snow', 'lesser_cold'
    ]
    jie_names = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒']

    all_jie = []
    yr_key = str(d.year)
    if yr_key in terms:
        for key, name in zip(jie_keys, jie_names):
            if key in terms[yr_key]:
                all_jie.append((datetime.strptime(terms[yr_key][key], '%Y-%m-%d %H:%M'), key, name))
    # Also check next year's 小寒 and 立春
    next_yr = str(d.year + 1)
    if next_yr in terms:
        for key, name in zip(jie_keys, jie_names):
            if key in terms[next_yr]:
                all_jie.append((datetime.strptime(terms[next_yr][key], '%Y-%m-%d %H:%M'), key, name))
    # Also check previous year's terms for 逆排
    prev_yr = str(d.year - 1)
    if prev_yr in terms:
        for key, name in zip(jie_keys, jie_names):
            if key in terms[prev_yr]:
                all_jie.append((datetime.strptime(terms[prev_yr][key], '%Y-%m-%d %H:%M'), key, name))

    all_jie.sort(key=lambda x: x[0])

    # Find the nearest 节 in the correct direction
    target_jie = None
    if shunpai:
        for dt, key, name in all_jie:
            if dt > birth_dt:
                target_jie = (dt, key, name)
                break
    else:
        for dt, key, name in reversed(all_jie):
            if dt < birth_dt:
                target_jie = (dt, key, name)
                break

    # Calculate 起运 age
    if target_jie:
        delta_seconds = abs((target_jie[0] - birth_dt).total_seconds())
        delta_days = delta_seconds / 86400
        qiyun_age = delta_days / 3  # 3 days = 1 year
    else:
        delta_days = 0
        qiyun_age = 0

    # Build dayun steps (8 steps of 10 years each)
    dayun_steps = []
    if shunpai:
        # Forward: next month's stem+branch, then forward
        next_y_gan = STEMS[(STEMS.index(yue_gan) + 1) % 10]
        next_y_zhi = BRANCHES[(BRANCHES.index(yue_zhi) + 1) % 12]
        for i in range(10):  # 10 steps to cover full life
            dy_gan = STEMS[(STEMS.index(next_y_gan) + i) % 10]
            dy_zhi = BRANCHES[(BRANCHES.index(next_y_zhi) + i) % 12]
            start_age = round(qiyun_age + i * 10, 1)
            end_age = round(start_age + 10, 1)
            dayun_steps.append({
                'pillar': dy_gan + dy_zhi,
                'start_age': start_age,
                'end_age': end_age,
                'index': i + 1,
            })
    else:
        # Reverse: previous month's stem+branch, then backward
        prev_y_gan = STEMS[(STEMS.index(yue_gan) - 1) % 10]
        prev_y_zhi = BRANCHES[(BRANCHES.index(yue_zhi) - 1) % 12]
        for i in range(10):
            dy_gan = STEMS[(STEMS.index(prev_y_gan) - i) % 10]
            dy_zhi = BRANCHES[(BRANCHES.index(prev_y_zhi) - i) % 12]
            start_age = round(qiyun_age + i * 10, 1)
            end_age = round(start_age + 10, 1)
            dayun_steps.append({
                'pillar': dy_gan + dy_zhi,
                'start_age': start_age,
                'end_age': end_age,
                'index': i + 1,
            })

    return {
        'direction': direction,
        'qiyun_age_years': int(qiyun_age),
        'qiyun_age_months': int((qiyun_age - int(qiyun_age)) * 12),
        'qiyun_age_days': round((qiyun_age - int(qiyun_age)) * 365 % 30),
        'delta_days': round(delta_days, 2),
        'target_jie': f'{target_jie[2]}({target_jie[0].strftime("%Y-%m-%d %H:%M")})' if target_jie else 'N/A',
        'steps': dayun_steps,
    }


def get_current_dayun(dayun_data, current_age):
    """Get the current 大运 for a given age."""
    for step in dayun_data['steps']:
        if step['start_age'] <= current_age < step['end_age']:
            return step
    return None

# ============================================================
# WANG SHUAI (日主旺衰)
# ============================================================
def analyze_wangshuai(ri_gan, ri_zhi, yue_zhi, all_branches, all_stems):
    """Basic 日主旺衰 analysis."""
    analysis = {}
    stage = get_changsheng(ri_gan, yue_zhi)
    analysis['月令长生'] = stage

    # Count supporting and opposing elements
    ri_wuxing = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
                 '庚':'金','辛':'金','壬':'水','癸':'水'}[ri_gan]

    # Elements that support 日主
    sheng_wo = {'木':'水','火':'木','土':'火','金':'土','水':'金'}
    wo_sheng = {'木':'火','火':'土','土':'金','金':'水','水':'木'}
    wo_ke   = {'木':'土','火':'金','土':'水','金':'木','水':'火'}
    ke_wo   = {'木':'金','火':'水','土':'木','金':'火','水':'土'}
    tong    = ri_wuxing  # same element

    support_count = 0
    oppose_count = 0

    # Check all stems
    for s in all_stems:
        sw = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
              '庚':'金','辛':'金','壬':'水','癸':'水'}[s]
        if sw == tong or sw == sheng_wo[ri_wuxing]:
            support_count += 1
        elif sw == ke_wo[ri_wuxing] or sw == wo_ke[ri_wuxing]:
            oppose_count += 1

    # Check all branches (via cangan)
    for b in all_branches:
        for c in get_cangan(b):
            sw = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
                  '庚':'金','辛':'金','壬':'水','癸':'水'}[c]
            if sw == tong or sw == sheng_wo[ri_wuxing]:
                support_count += 1
            elif sw == ke_wo[ri_wuxing]:
                oppose_count += 1

    analysis['support'] = support_count
    analysis['oppose'] = oppose_count

    if support_count > oppose_count + 2:
        analysis['level'] = '身旺'
    elif support_count < oppose_count - 1:
        analysis['level'] = '身弱'
    else:
        analysis['level'] = '中和'

    return analysis

# ============================================================
# MAIN CALCULATION FUNCTION
# ============================================================
def calculate_bazi(solar_date_str, time_str, gender):
    """Calculate the full bazi chart.

    Args:
        solar_date_str: 'YYYY-MM-DD' (Gregorian calendar)
        time_str: 'HH:MM' (24-hour format, local time)
        gender: 'male' or 'female'

    Returns:
        dict with full chart data
    """
    solar_date = datetime.strptime(solar_date_str, '%Y-%m-%d')
    terms = load_solar_terms()

    # 1. Four Pillars
    year_pillar = calc_year_pillar(solar_date, terms)
    nian_gan, nian_zhi = year_pillar[0], year_pillar[1]

    month_pillar, lunar_month = calc_month_pillar(solar_date, nian_gan, terms)
    yue_gan, yue_zhi = month_pillar[0], month_pillar[1]

    day_pillar = calc_day_pillar(solar_date)
    ri_gan, ri_zhi = day_pillar[0], day_pillar[1]

    time_pillar, shi_zhi = calc_time_pillar(ri_gan, time_str)
    shi_gan, shi_zhi = time_pillar[0], time_pillar[1]

    chinese_hour = get_chinese_hour(time_str)

    # 2. Nayin
    pillars = [year_pillar, month_pillar, day_pillar, time_pillar]
    pillar_names = ['年柱','月柱','日柱','时柱']
    nayin_data = [{'pillar': p, 'name': n, 'nayin': get_nayin(p), 'wuxing': get_nayin_wuxing(p)}
                  for p, n in zip(pillars, pillar_names)]

    # 3. Dayun
    dayun = calc_dayun(solar_date_str, time_str, nian_gan, yue_gan, yue_zhi, gender)

    # 4. Twelve stages for 日主 across four pillar branches
    branches_list = [nian_zhi, yue_zhi, ri_zhi, shi_zhi]
    changsheng_data = []
    for p, pn, b in zip(pillars, pillar_names, branches_list):
        stage = get_changsheng(ri_gan, b)
        changsheng_data.append({'pillar': p, 'name': pn, 'branch': b, 'stage': stage})

    # 5. Ten gods for heavenly stems
    stems_list = [nian_gan, yue_gan, ri_gan, shi_gan]
    shishen_stems = []
    for p, pn, s in zip(pillars, pillar_names, stems_list):
        ss = get_shishen(ri_gan, s)
        shishen_stems.append({'pillar': p, 'name': pn, 'stem': s, 'shishen': ss})

    # 6. Ten gods for hidden stems (藏干十神)
    shishen_cangan = []
    for p, pn, b in zip(pillars, pillar_names, branches_list):
        cg = get_cangan(b)
        items = [{'stem': c, 'shishen': get_shishen(ri_gan, c)} for c in cg]
        shishen_cangan.append({'pillar': p, 'name': pn, 'branch': b, 'hiddens': items})

    # 7. Kong wang (空亡)
    kong_branches = get_xunkong(day_pillar)
    kong_wang = []
    for p, pn, b in zip(pillars, pillar_names, branches_list):
        is_kong = b in kong_branches
        kong_wang.append({'pillar': p, 'name': pn, 'branch': b, 'is_kong': is_kong})

    # 8. Branch relationships
    branch_rels = get_branch_relations(branches_list)

    # 9. Taiyuan (胎元)
    taiyuan = calc_taiyuan(month_pillar)
    taiyuan_nayin = get_nayin(taiyuan)

    # 10. Wang shuai analysis
    wangshuai = analyze_wangshuai(ri_gan, ri_zhi, yue_zhi, branches_list, stems_list)

    # 11. Current age and current dayun
    birth_year = solar_date.year
    current_year = datetime.now().year
    current_age_xusui = current_year - birth_year + 1  # 虚岁
    current_age_zhousui = current_year - birth_year  # 周岁
    # More precise age
    today = datetime.now()
    precise_age = today.year - solar_date.year
    if (today.month, today.day) < (solar_date.month, solar_date.day):
        precise_age -= 1
    current_dayun_step = get_current_dayun(dayun, precise_age)

    # 12. Year stem yin/yang + gender → dayun direction
    is_yang = nian_gan in YANG_STEMS
    direction_detail = f'{"阳" if is_yang else "阴"}年{"男" if gender=="male" else "女"} → {dayun["direction"]}'

    # 13. Summary statistics
    all_cangan_stems = []
    for b in branches_list:
        all_cangan_stems.extend(get_cangan(b))
    all_stems_combined = stems_list + all_cangan_stems

    # Count shishen distribution
    shishen_counts = {}
    for s in all_stems_combined:
        ss = get_shishen(ri_gan, s)
        shishen_counts[ss] = shishen_counts.get(ss, 0) + 1

    # Count five elements
    wuxing_map = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土',
                  '庚':'金','辛':'金','壬':'水','癸':'水'}
    wuxing_counts = {'木':0,'火':0,'土':0,'金':0,'水':0}
    for s in all_stems_combined:
        w = wuxing_map.get(s, '?')
        if w in wuxing_counts:
            wuxing_counts[w] += 1

    return {
        'bazi': f'{year_pillar} {month_pillar} {day_pillar} {time_pillar}',
        'year_pillar': year_pillar,
        'month_pillar': month_pillar,
        'day_pillar': day_pillar,
        'time_pillar': time_pillar,
        'ri_gan': ri_gan,
        'ri_zhi': ri_zhi,
        'chinese_hour': chinese_hour,
        'gender': gender,
        'solar_date': solar_date_str,
        'time': time_str,
        'lunar_month': lunar_month,
        'nayin': nayin_data,
        'dayun': dayun,
        'changsheng': changsheng_data,
        'shishen_stems': shishen_stems,
        'shishen_cangan': shishen_cangan,
        'kong_wang': kong_wang,
        'kong_branches': kong_branches,
        'branch_relations': branch_rels,
        'taiyuan': taiyuan,
        'taiyuan_nayin': taiyuan_nayin,
        'wangshuai': wangshuai,
        'current_age_xusui': current_age_xusui,
        'current_age_zhousui': current_age_zhousui,
        'current_age_precise': precise_age,
        'current_dayun': current_dayun_step,
        'direction_detail': direction_detail,
        'shishen_counts': shishen_counts,
        'wuxing_counts': wuxing_counts,
        'cangan_raw': {b: get_cangan(b) for b in branches_list},
    }
