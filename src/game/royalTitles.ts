import type { PersonKind, PersonRecord } from './gameState';

export interface RoyalTitleRule {
  name: string;
  prefix: string;
  suffix: string;
  minFavor: number;
  requiresLegitimate?: boolean;
}

/**
 * 爵位解锁按皇嗣对皇帝的宠爱计算，越高爵位要求越高。
 * 封爵称号由“前缀 + 自定义封号 + 后缀”组成。
 */
export const princeTitleRules: readonly RoyalTitleRule[] = [
  { name: '和硕亲王', prefix: '和硕', suffix: '亲王', minFavor: 90 },
  { name: '多罗郡王', prefix: '多罗', suffix: '郡王', minFavor: 75 },
  { name: '多罗贝勒', prefix: '多罗', suffix: '贝勒', minFavor: 60 },
  { name: '固山贝子', prefix: '固山', suffix: '贝子', minFavor: 45 },
  { name: '奉恩镇国公', prefix: '奉恩', suffix: '镇国公', minFavor: 30 },
  { name: '奉恩辅国公', prefix: '奉恩', suffix: '辅国公', minFavor: 0 },
];

export const princessTitleRules: readonly RoyalTitleRule[] = [
  { name: '固伦公主', prefix: '固伦', suffix: '公主', minFavor: 80, requiresLegitimate: true },
  { name: '和硕公主', prefix: '和硕', suffix: '公主', minFavor: 0 },
];

export function royalTitleRulesFor(kind: PersonKind) {
  return kind === 'PRINCESS' ? princessTitleRules : princeTitleRules;
}

export function royalTitleRuleFor(kind: PersonKind, title: string) {
  const normalized = title.trim();
  return royalTitleRulesFor(kind).find((rule) => normalized.startsWith(rule.prefix)
    && normalized.endsWith(rule.suffix)
    && normalized.length >= rule.prefix.length + rule.suffix.length);
}

export function royalTitleEligibility(person: Pick<PersonRecord, 'kind' | 'parents' | 'stats'>, title: string) {
  if (person.kind !== 'PRINCE' && person.kind !== 'PRINCESS') return { ok: false, reason: '册封对象并非皇子或公主。' };
  const rule = royalTitleRuleFor(person.kind, title);
  // 旧存档或自定义爵名不属于标准爵位时，保留兼容性；标准爵位严格检查条件。
  if (!rule) return { ok: true as const, rule: undefined };
  const favor = person.stats['宠爱'] ?? 0;
  const legitimate = person.parents.includes('empress');
  if (rule.requiresLegitimate && legitimate) return { ok: true as const, rule };
  if (favor < rule.minFavor) return { ok: false as const, rule, reason: `${rule.name}需宠爱达到${rule.minFavor}。` };
  return { ok: true as const, rule };
}

export function isRoyalTitleEligible(person: Pick<PersonRecord, 'kind' | 'parents' | 'stats'>, title: string) {
  return royalTitleEligibility(person, title).ok;
}
