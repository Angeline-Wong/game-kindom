/**
 * 姓名池 —— 宫廷人物取名
 *
 * 妃嫔取名（旧 → 新）：
 *   - 旧实现是 "20 姓 × 25 个固定整名 = 500 条字符串" 的扁平枚举：
 *     "云蘅" 这类名会随每个姓出现一次，撞名率极高
 *   - 新实现：
 *     - 拆成 5 个主题（flora/jade/poetic/virtue/seasonal）的"单字池"
 *     - 在运行时按主题组合 lead×tail 生成新名
 *     - 容量大约 3000 字对 × 20 姓 ≈ 60000 唯一名，重复概率大幅下降
 *     - 详见 generateConsortCandidates
 *
 * 大臣名池：
 *   - 汉式：MINISTER_NAME_POOL（20 姓 × 25 名 = 500 条整名）保持原样
 *     以免破坏"500 长度"这一历史断言
 *   - 满式：MANCHU_MINISTER_NAME_POOL（13 复姓 × 47 名 = 满族字池）
 *     用于在科举/继任等场景中混入满族姓名（如"乌拉那拉景则"）
 *   - 合并池：MINISTER_NAME_POOL_ALL，供调用方一次性抽样
 *
 * 妃嫔姓名规则（满族版本）：
 *   - generateConsortCandidates 默认 30% 概率抽满族姓氏，
 *     命中后从满族女名库取双字名（如"富察·海兰"、"叶赫那拉·绮云"）
 *   - 满族复姓/三字姓会正确反映在姓名长度上（用于去重时切片）
 */

const surnames = [
  '沈', '顾', '陆', '苏', '叶', '程', '谢', '裴', '傅', '霍',
  '萧', '宋', '卫', '秦', '楚', '温', '贺', '林', '许', '周',
] as const;

// ──────────────────────────────────────────────────────────────────
// 满族姓名池：与汉姓汉名并行，互不混用
// ──────────────────────────────────────────────────────────────────
//
// 设计要点：
//  - 满族姓氏多为复姓/三字姓（"乌拉那拉"、"叶赫那拉"、"富察"等），与汉式单字姓并存
//  - 满族人名常用 "景则、德林、图海、海兰、玉珂" 等双字名，
//    字源含 "图/德/克/色/禄/阿/尔/雅/格/海/常/瑞/绥/兰" 等满式音节字，
//    与汉式 "含章/云蘅/怀瑾" 风格明显不同
//  - 嫔妃候选中按 30% 概率抽满族姓、70% 抽汉姓；科举新科进士也按约 30% 概率抽满族名
//  - 单独导出 MANCHU_MINISTER_NAME_POOL，方便测试断言唯一性；合并池 MINISTER_NAME_POOL_ALL
//    供调用方一次性抽样，避免破坏旧的"20 × 25 = 500"汉名池断言

const manchuSurnamesPool = [
  '乌拉那拉', '叶赫那拉', '富察', '钮祜禄', '赫舍里', '瓜尔佳',
  '佟佳', '那拉', '完颜', '萨克达', '舒穆禄', '郭络罗', '纳兰',
] as const;

export const manchuSurnames = manchuSurnamesPool;

// 满族女性双字名
const manchuFemaleGivenNames = [
  '乌雅', '图门', '伊尔', '海兰', '玉珂', '秋格', '春格', '绮云', '舒兰',
  '和琳', '雅尔', '络云', '阿络', '桐萦', '景澜', '婉凝', '永慧', '玉兰',
  '如珠', '清绮', '和雅', '恒舒', '伊兰', '祎珩', '瑜笙', '萦瑾', '兰珺',
  '祎莳', '绥宁', '婉蕙', '萦菀', '珩菲', '蕙蕊', '荃珩', '兰芷',
  '菀桐', '萦芸', '璟舒', '恒蕙', '璟瑚', '绮雯', '绥安',
] as const;

// 满族男性双字名（含"图、德、克、色、禄、阿、尔、雅、格、绥、林、海、常"等字源）
const manchuMinisterGivenNames = [
  '景则', '德林', '禄安', '图海', '文远', '克勤', '色臣', '阿穆', '穆和', '雅尔',
  '安图', '那穆', '瑞图', '庆元', '延清', '福临', '锡林', '珠尔', '常绶',
  '和琳', '兆惠', '明瑞', '祥安', '玉麟', '尔泰', '永常', '图敏', '色布',
  '绥远', '克昌', '广顺', '如柏', '祜庭', '廷锡', '福敏', '鹤龄', '禄康',
  '清阿', '如松', '鹤年', '云鹤', '瑞联', '赓之', '穆图', '延茂', '禄谦',
] as const;

// ──────────────────────────────────────────────────────────────────
// 汉式姓名池：沿用旧设计
// ──────────────────────────────────────────────────────────────────

const ministerGivenNames = [
  '砚之', '弘毅', '廷钧', '怀瑾', '文澜',
  '景川', '子衡', '云峥', '修远', '伯庸',
  '清晏', '允中', '知白', '元辅', '维桢',
  '敬之', '承安', '彦章', '绍庭', '明允',
  '思齐', '秉文', '仲宣', '时雨', '端方',
] as const;

function combineSurnames(surnamesList: readonly string[], givenNames: readonly string[]): string[] {
  return surnamesList.flatMap((surname) => givenNames.map((givenName) => `${surname}${givenName}`));
}

export const MINISTER_NAME_POOL: readonly string[] = combineSurnames(surnames, ministerGivenNames);

export const MANCHU_MINISTER_NAME_POOL: readonly string[] = (() => {
  const seen = new Set<string>();
  const result: string[] = [];
  manchuSurnamesPool.forEach((surname) => {
    manchuMinisterGivenNames.forEach((givenName) => {
      const full = `${surname}${givenName}`;
      if (seen.has(full)) return;
      seen.add(full);
      result.push(full);
    });
  });
  return result;
})();

export const MINISTER_NAME_POOL_ALL: readonly string[] = (() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of MINISTER_NAME_POOL) {
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  for (const name of MANCHU_MINISTER_NAME_POOL) {
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
})();

export function pickUnusedNames(pool: readonly string[], usedNames: Iterable<string>, count: number, seed = 0) {
  const used = new Set(usedNames);
  const result: string[] = [];
  const start = Math.abs(seed) % pool.length;
  for (let offset = 0; offset < pool.length && result.length < count; offset += 1) {
    const name = pool[(start + offset * 37) % pool.length];
    if (!used.has(name)) {
      result.push(name);
      used.add(name);
    }
  }
  return result;
}

export function isManchuSurname(surname: string): boolean {
  return (manchuSurnamesPool as readonly string[]).includes(surname);
}

const hanSurnameSet = new Set<string>(surnames);
const manchuSurnamePrefixes = [...manchuSurnamesPool].sort((left, right) => right.length - left.length);

/**
 * 修正历史存档或旧选秀逻辑生成的混合姓名。
 *
 * 旧版本曾把大臣汉姓首字拼到秀女全名前面，产生“陆赫那拉……”这类姓名。
 * 满族姓名应直接以满族姓氏开头；“赫那拉”是旧数据里常见的省略写法，统一补为“叶赫那拉”。
 */
export function normalizePersonName(name: string): string {
  const value = name.trim();
  if (!value) return value;

  let manchuStart = -1;
  for (let index = 0; index < value.length; index += 1) {
    const hasCanonicalSurname = manchuSurnamePrefixes.some((surname) => value.startsWith(surname, index));
    const hasLegacySurname = value.startsWith('赫那拉', index);
    if (!hasCanonicalSurname && !hasLegacySurname) continue;
    if (index === 0) {
      manchuStart = 0;
      break;
    }
    const prefix = value.slice(0, index);
    if ([...prefix].every((character) => hanSurnameSet.has(character))) {
      manchuStart = index;
      break;
    }
  }

  const withoutHanPrefix = manchuStart > 0 ? value.slice(manchuStart) : value;
  return withoutHanPrefix.startsWith('赫那拉') ? `叶${withoutHanPrefix}` : withoutHanPrefix;
}

/**
 * 给定一个候选全名，找到"给定名"片段的起始下标。
 * 汉式单字姓 → 起始下标 1（"沈含章" → "含章"）。
 * 满族复姓/三字姓 → 起始下标等于姓氏长度（"乌拉那拉海兰" → "海兰"）。
 */
export function givenStartIndex(name: string): number {
  if (name.startsWith('乌拉那拉') || name.startsWith('叶赫那拉')) return 4;
  if (name.startsWith('钮祜禄') || name.startsWith('赫舍里')
    || name.startsWith('舒穆禄') || name.startsWith('瓜尔佳')
    || name.startsWith('郭络罗')) return 3;
  if (name.startsWith('富察') || name.startsWith('佟佳') || name.startsWith('萨克达')
    || name.startsWith('那拉') || name.startsWith('完颜') || name.startsWith('纳兰')) return 2;
  return 1;
}

// ──────────────────────────────────────────────────────────────────
// 女名取名字库：按主题分组的单字池
// ──────────────────────────────────────────────────────────────────

// 花木系：以草木入名，清雅有致
const floraLeads = ['含', '若', '采', '疏', '蘩', '萱', '蕙', '芷', '兰', '芸', '蘋', '菁'];
const floraTails = ['蘅', '蘋', '菁', '菡', '芷', '茵', '萱', '菲', '莲', '蓉', '蕊', '菀', '苓', '薇', '兰', '茉'];

// 玉器系：以珍宝玉石入名，温润有节
const jadeLeads = ['慕', '栖', '怀', '映', '予', '清', '含', '璟', '琬', '琼', '珺', '琳'];
const jadeTails = ['琳', '瑜', '珩', '瑾', '珺', '琬', '珂', '璇', '琪', '瑛', '瑶', '璟', '璎'];

// 诗意系：以自然意象入名，意境悠远
const poeticLeads = ['映', '晓', '念', '沐', '聆', '霁', '霈', '慕', '栖', '知', '澄'];
const poeticTails = ['月', '雪', '星', '霜', '霁', '华', '烟', '雨', '岚', '霞', '云', '露', '澜'];

// 品德系：以德行嘉言入名，端庄大方
const virtueLeads = ['婉', '静', '淑', '宁', '嘉', '雅', '端', '柔', '慧', '贤', '令', '昭'];
const virtueTails = ['宁', '仪', '则', '贞', '言', '容', '德', '懿', '敬', '柔'];

// 季节系：以四时风物入名，时令鲜明
const seasonalLeads = ['春', '夏', '秋', '冬', '莺', '荷', '雁', '桂'];
const seasonalTails = ['莺', '荷', '雁', '桂', '梅', '杏', '桃', '桐', '松', '芹', '萱'];

const themeGroups = {
  flora:    { leads: floraLeads,    tails: floraTails },
  jade:     { leads: jadeLeads,     tails: jadeTails },
  poetic:   { leads: poeticLeads,   tails: poeticTails },
  virtue:   { leads: virtueLeads,   tails: virtueTails },
  seasonal: { leads: seasonalLeads, tails: seasonalTails },
} as const;

export type ConsortNameTheme = keyof typeof themeGroups;

// 完整 lead/tail 池（去掉重复字），用于主题池穷尽后的兜底抽样
const allFemaleLeads = Array.from(new Set(Object.values(themeGroups).flatMap((g) => g.leads)));
const allFemaleTails = Array.from(new Set(Object.values(themeGroups).flatMap((g) => g.tails)));

// ──────────────────────────────────────────────────────────────────
// 随机工具：可种子化的 LCG，避免依赖全局 Math.random
// ──────────────────────────────────────────────────────────────────

function createRng(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ──────────────────────────────────────────────────────────────────
// 妃嫔候选生成器：按主题组合字对 + 多层防重
// ──────────────────────────────────────────────────────────────────

export interface GenerateConsortOptions {
  /** 已用全名（如 "沈含章"），用于防整名冲突 */
  usedFullNames?: Iterable<string>;
  /** 本批候选希望覆盖的主题序列，留空则在 5 个主题间循环 */
  themeMix?: readonly ConsortNameTheme[];
  /** 期望产出数量，默认 6 */
  count?: number;
  /** 随机种子，相同 seed 给相同顺序（玩家重掷看到不同候选时递增） */
  seed?: number;
  /** 候选汉姓池，默认全部 20 个姓（不会混入满族姓） */
  fallbackSurnames?: readonly string[];
  /**
   * 抽中满族姓氏的概率（0~1），默认 0.3。
   * 设置为 0 可关闭满族姓；满族姓按 `manchuSurnames` 池轮转，配满族女名库。
   */
  manchuProbability?: number;
  /**
   * 满族姓轮转顺序，默认按 `manchuSurnames` 池顺序。
   * 与 `fallbackSurnames` 互不影响：满族姓单独走一条游标。
   */
  manchuSurnames?: readonly string[];
}

export function generateConsortCandidates(opts: GenerateConsortOptions = {}): string[] {
  const {
    usedFullNames = [],
    themeMix,
    count = 6,
    seed = 0,
    fallbackSurnames = surnames,
    manchuProbability = 0.3,
    manchuSurnames = manchuSurnamesPool,
  } = opts;

  const usedFull = new Set(usedFullNames);
  // 从已用全名自动推导已用字对，避免同一后宫里出现 "两个婉蘅"
  const usedGiven = new Set<string>();
  for (const name of usedFull) {
    if (name.length >= 3) usedGiven.add(name.slice(givenStartIndex(name)));
  }

  const rng = createRng(seed);
  const topics =
    themeMix && themeMix.length > 0
      ? Array.from(themeMix)
      : (Object.keys(themeGroups) as ConsortNameTheme[]);

  const result: string[] = [];
  let surnameCursor = 0;
  let manchuCursor = 0;
  let topicCursor = 0;
  let passRounds = 0;
  const maxPasses = topics.length + 1;
  const manchuEnabled = manchuProbability > 0 && manchuSurnames.length > 0;

  // 主循环：按主题轮转 + 姓氏轮转，每个主题下抽样若干次
  while (result.length < count && passRounds < maxPasses) {
    for (let i = 0; i < topics.length && result.length < count; i += 1) {
      const theme = topics[(topicCursor + i) % topics.length];
      const group = themeGroups[theme];

      // 决定本轮走汉姓还是满族姓
      const useManchu = manchuEnabled && rng() < manchuProbability;
      if (useManchu) {
        const surname = manchuSurnames[manchuCursor % manchuSurnames.length];
        manchuCursor += 1;
        const composed = composeManchu(surname, usedFull, usedGiven, rng);
        if (composed) {
          result.push(composed);
          usedFull.add(composed);
          usedGiven.add(composed.slice(givenStartIndex(composed)));
        }
        continue;
      }

      const surname = fallbackSurnames[surnameCursor % fallbackSurnames.length];
      surnameCursor += 1;

      const composed = composeWithinTheme(surname, group, usedFull, usedGiven, rng);
      if (composed) {
        result.push(composed);
        usedFull.add(composed);
        usedGiven.add(composed.slice(givenStartIndex(composed)));
      }
    }
    passRounds += 1;
    topicCursor = (topicCursor + 1) % topics.length;
  }

  // 兜底 1：若主题池全部撞名，放宽到全字池（仍防整名冲突）
  let relaxedAttempts = 0;
  while (result.length < count && relaxedAttempts < 400) {
    if (manchuEnabled && rng() < manchuProbability && manchuSurnames.length > 0) {
      const surname = manchuSurnames[manchuCursor % manchuSurnames.length];
      manchuCursor += 1;
      const composed = composeManchu(surname, usedFull, usedGiven, rng);
      relaxedAttempts += 1;
      if (composed) {
        result.push(composed);
        usedFull.add(composed);
        usedGiven.add(composed.slice(givenStartIndex(composed)));
      }
      continue;
    }
    const surname = fallbackSurnames[surnameCursor % fallbackSurnames.length];
    surnameCursor += 1;
    let lead = pickRandom(allFemaleLeads, rng);
    let tail = pickRandom(allFemaleTails, rng);
    if (lead === tail) {
      relaxedAttempts += 1;
      continue;
    }
    const full = `${surname}${lead}${tail}`;
    relaxedAttempts += 1;
    if (usedFull.has(full)) continue;
    result.push(full);
    usedFull.add(full);
    usedGiven.add(`${lead}${tail}`);
  }

  // 兜底 2：在足够大的池子下几乎不会触发；若仍不足，再多抽若干次
  while (result.length < count) {
    let candidate = '';
    for (let i = 0; i < 40 && !candidate; i += 1) {
      if (manchuEnabled && rng() < manchuProbability && manchuSurnames.length > 0) {
        const surname = manchuSurnames[manchuCursor % manchuSurnames.length];
        manchuCursor += 1;
        const composed = composeManchu(surname, usedFull, usedGiven, rng);
        if (composed) {
          candidate = composed;
          usedFull.add(composed);
          usedGiven.add(composed.slice(givenStartIndex(composed)));
        }
        continue;
      }
      const surname = fallbackSurnames[surnameCursor % fallbackSurnames.length];
      surnameCursor += 1;
      const lead = pickRandom(allFemaleLeads, rng);
      const tail = pickRandom(allFemaleTails, rng);
      if (lead === tail) continue;
      const full = `${surname}${lead}${tail}`;
      if (!usedFull.has(full)) candidate = full;
    }
    if (!candidate) break;
    result.push(candidate);
    usedFull.add(candidate);
  }

  return result;
}

function composeManchu(
  surname: string,
  usedFull: Set<string>,
  usedGiven: Set<string>,
  rng: () => number,
): string | null {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const given = pickRandom(manchuFemaleGivenNames, rng);
    const full = `${surname}${given}`;
    const offset = givenStartIndex(full);
    const givenOnly = full.slice(offset);
    if (!usedFull.has(full) && !usedGiven.has(givenOnly)) {
      return full;
    }
  }
  return null;
}

function composeWithinTheme(
  surname: string,
  group: typeof themeGroups[ConsortNameTheme],
  usedFull: Set<string>,
  usedGiven: Set<string>,
  rng: () => number,
): string | null {
  // 在主题池里随机抽 lead×tail，最多 10 次避免碰撞
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const lead = pickRandom(group.leads, rng);
    const tail = pickRandom(group.tails, rng);
    if (lead === tail) continue; // 避免"蘋蘋"这类首末重复
    const given = `${lead}${tail}`;
    const full = `${surname}${given}`;
    if (!usedFull.has(full) && !usedGiven.has(given)) {
      return full;
    }
  }
  return null;
}
