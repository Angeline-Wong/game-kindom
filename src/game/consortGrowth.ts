import { isPersonAlive } from './person';
import type { PersonRecord } from './gameState';

export type ConsortGrowth = Record<string, number>;

export function applyConsortGrowth(person: PersonRecord, requested: ConsortGrowth) {
  if (!isPersonAlive(person) || person.kind !== 'CONSORT') return { person, gains: {} as ConsortGrowth };
  const stats = { ...person.stats };
  const gains: ConsortGrowth = {};
  Object.entries(requested).forEach(([attribute, amount]) => {
    const current = stats[attribute] ?? 0;
    const actual = Math.max(0, Math.min(Math.round(amount), 100 - current));
    if (actual > 0) {
      stats[attribute] = current + actual;
      gains[attribute] = actual;
    }
  });
  return { person: { ...person, stats }, gains };
}

export function formatConsortGrowth(gains: ConsortGrowth) {
  const entries = Object.entries(gains);
  return entries.length ? entries.map(([attribute, amount]) => `${attribute} +${amount}`).join('，') : '相关属性已达到上限';
}

export function giftGrowth(itemId: string, category: string, quantity: number): ConsortGrowth {
  const count = Math.max(1, quantity);
  if (category === '书籍') return { 才情: Math.min(12, 3 * count) };
  if (category === '服饰' || category === '珍宝' || category === '玉器') return { 容貌: Math.min(10, 2 * count), 宠爱: Math.min(6, count) };
  if (category === '丹药') return { 健康: Math.min(15, 5 * count) };
  if (itemId === 'imperial-calligraphy') return { 才情: 3, 宠爱: 3 };
  if (category === '金银') return { 宠爱: Math.min(8, 2 * count) };
  return { 宠爱: Math.min(5, count) };
}
