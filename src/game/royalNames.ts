import type { PersonRecord } from './gameState';

const princePrefixes = ['景', '承', '弘', '允', '昭', '晏', '怀', '彦', '修', '知', '元', '启', '清', '云', '明', '靖', '思', '维', '嘉', '绍'];
const princeSuffixes = [
  '澄', '钧', '宸', '煦', '珩',
  '璋', '瑾', '瑜', '衡', '叙',
  '谦', '礼', '正', '远', '川',
  '章', '庭', '宣', '宁', '安',
  '睿', '翊', '桢', '允', '渊',
];
const princessPrefixes = ['昭', '嘉', '宜', '清', '宁', '和', '婉', '仪', '令', '容', '瑞', '明', '怀', '柔', '静', '安', '乐', '华', '锦', '宛'];
const princessSuffixes = [
  '月', '宁', '瑶', '瑜', '琬',
  '华', '仪', '容', '柔', '安',
  '姝', '宜', '瑾', '璇', '歌',
  '雪', '兰', '薇', '棠', '蘅',
  '和', '清', '锦', '玉', '昭',
];

export const PRINCE_GIVEN_NAMES = princePrefixes.flatMap((prefix) => princeSuffixes.map((suffix) => `${prefix}${suffix}`));
export const PRINCESS_GIVEN_NAMES = princessPrefixes.flatMap((prefix) => princessSuffixes.map((suffix) => `${prefix}${suffix}`));

function hash(value: string) {
  return [...value].reduce((total, character) => Math.imul(total ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function getRoyalNameSuggestions(child: PersonRecord, people: Record<string, PersonRecord>, count = 3, usedNames: Iterable<string> = []) {
  const surname = people.emperor?.name.slice(0, 1) || '萧';
  const used = new Set([
    ...usedNames,
    ...Object.values(people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').map((person) => person.name),
  ]);
  const source = child.kind === 'PRINCESS' ? PRINCESS_GIVEN_NAMES : PRINCE_GIVEN_NAMES;
  const start = hash(child.id) % source.length;
  const suggestions: string[] = [];
  for (let offset = 0; offset < source.length && suggestions.length < count; offset += 1) {
    const candidate = `${surname}${source[(start + offset * 17) % source.length]}`;
    if (!used.has(candidate) || candidate === child.name) suggestions.push(candidate);
  }
  return suggestions;
}

export function isValidRoyalName(name: string, childId: string, people: Record<string, PersonRecord>, usedNames: Iterable<string> = []) {
  const normalized = name.trim();
  if (!/^[\u3400-\u9fff]{2,4}$/.test(normalized)) return false;
  if (new Set(usedNames).has(normalized)) return false;
  return !Object.values(people).some((person) => person.id !== childId && (person.kind === 'PRINCE' || person.kind === 'PRINCESS') && person.name === normalized);
}

export const CONSORT_HONORIFICS = [
  '慧', '淑', '德', '贤', '良', '贞', '静', '宁', '惠', '端',
  '昭', '敬', '庄', '顺', '和', '安', '懿', '温', '恭', '宸',
  '嘉', '祥', '瑞', '怡', '敏', '敦', '纯', '慎', '柔', '婉',
  '清', '丽', '华', '荣', '禧', '庆', '福', '裕', '康', '熙',
  '颖', '诚', '容', '谦', '祈', '宜', '令', '雅', '瑾', '毓',
] as const;
