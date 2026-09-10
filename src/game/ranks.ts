import type { ConsortRank } from './residences';

type PromotionKind = 'CONSORT' | 'MINISTER';
export interface PromotionOption { label: string; available: boolean; note: string; }

export const consortRanks: ConsortRank[] = ['官女子', '答应', '常在', '贵人', '嫔', '妃', '贵妃', '皇贵妃', '皇后'];
export const officialGrades = ['正一品', '从一品', '正二品', '从二品', '正三品', '从三品', '正四品', '从四品', '正五品', '从五品', '正六品', '从六品', '正七品', '从七品', '正八品', '从八品', '正九品', '从九品'];
const caps: Partial<Record<ConsortRank, number>> = { 皇后: 1, 皇贵妃: 1, 贵妃: 2, 妃: 4, 嫔: 6 };

export function isConsortRankAvailable(label: ConsortRank, counts: Partial<Record<ConsortRank, number>>) {
  const cap = caps[label];
  return cap === undefined || (counts[label] ?? 0) < cap;
}

function consortPromotionOption(label: ConsortRank, counts: Partial<Record<ConsortRank, number>>): PromotionOption {
  const cap = caps[label];
  const available = isConsortRankAvailable(label, counts);
  return { label, available, note: available ? (cap ? `编制 ${counts[label] ?? 0}/${cap}` : '不设固定编制') : '编制已满' };
}

/** 返回下一阶位份；产子晋升等“一次升一级”的规则统一调用此函数。 */
export function getNextPromotionOption(currentRank: string, counts: Partial<Record<ConsortRank, number>>) {
  const currentIndex = consortRanks.indexOf(currentRank as ConsortRank);
  if (currentIndex < 0) return undefined;
  const nextRank = consortRanks[currentIndex + 1];
  return nextRank ? consortPromotionOption(nextRank, counts) : undefined;
}

export function getPromotionOptions(kind: PromotionKind, currentRank: string, counts: Partial<Record<ConsortRank, number>>): PromotionOption[] {
  if (kind === 'MINISTER') {
    const currentIndex = officialGrades.indexOf(currentRank);
    return officialGrades.slice(0, Math.max(0, currentIndex)).map((label) => ({ label, available: true, note: '可拟旨升迁' }));
  }
  const currentIndex = consortRanks.indexOf(currentRank as ConsortRank);
  return consortRanks.slice(Math.max(0, currentIndex + 1)).map((label) => consortPromotionOption(label, counts));
}

export function getDemotionOptions(currentRank: string): PromotionOption[] {
  const currentIndex = consortRanks.indexOf(currentRank as ConsortRank);
  return consortRanks.slice(0, Math.max(0, currentIndex)).reverse().map((label) => ({ label, available: true, note: '可下调至此位分' }));
}
