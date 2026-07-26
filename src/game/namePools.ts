const surnames = [
  '沈', '顾', '陆', '苏', '叶', '程', '谢', '裴', '傅', '霍',
  '萧', '宋', '卫', '秦', '楚', '温', '贺', '林', '许', '周',
] as const;

const consortGivenNames = [
  '清漪', '明棠', '令仪', '知微', '月容',
  '云蘅', '含章', '静姝', '昭宁', '婉仪',
  '嘉柔', '宜华', '若兰', '玉衡', '瑾瑜',
  '安歌', '锦书', '映雪', '疏桐', '采薇',
  '清和', '宛宁', '若衡', '怀瑾', '知夏',
] as const;

const ministerGivenNames = [
  '砚之', '弘毅', '廷钧', '怀瑾', '文澜',
  '景川', '子衡', '云峥', '修远', '伯庸',
  '清晏', '允中', '知白', '元辅', '维桢',
  '敬之', '承安', '彦章', '绍庭', '明允',
  '思齐', '秉文', '仲宣', '时雨', '端方',
] as const;

function combine(givenNames: readonly string[]) {
  return surnames.flatMap((surname) => givenNames.map((givenName) => `${surname}${givenName}`));
}

export const CONSORT_NAME_POOL = combine(consortGivenNames);
export const MINISTER_NAME_POOL = combine(ministerGivenNames);

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
