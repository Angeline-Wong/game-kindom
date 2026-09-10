import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { grantDirectReward, grantInventoryGift, grantRoyalTitle, monthlyStipend, processMonthlyStipends } from './economy';
import type { PersonRecord } from './gameState';

function royal(id = 'prince-test'): PersonRecord {
  return {
    id, kind: 'PRINCE', name: '萧景昭', sex: 'MALE', birthDate: { year: -12, month: 1, day: 1 }, age: 15,
    title: '大皇子', birthOrder: 1, residence: '毓庆宫', sceneId: 'yuqing', status: 'NORMAL', assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' },
    parents: ['emperor', 'empress'], children: [], stats: { 资质: 86, 功绩: 2, 健康: 80 }, traits: ['聪敏'],
  };
}

describe('economy transactions', () => {
  it('deducts inventory and records reward history when gifting a regular treasury item', () => {
    const state = createInitialGameState();
    const beforeStock = state.gifts.inventory['four-books'];
    const result = grantInventoryGift(state, 'empress', 'four-books', 2);
    expect(result.ok).toBe(true);
    expect(result.state.gifts.inventory['four-books']).toBe(beforeStock - 2);
    expect(result.state.finances).toEqual(state.finances);
    expect(result.state.gifts.history[0]).toMatchObject({ recipientId: 'empress', itemId: 'four-books', quantity: 2, status: 'CONFIRMED' });
    expect(result.state.history.at(-1)?.type).toBe('REWARD');
  });
  it('rejects gifting an item that no longer exists in the treasury', () => {
    const state = createInitialGameState();
    const result = grantInventoryGift(state, 'empress', 'gold-ingot', 1);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('国库中没有这件物品');
  });

  it('grows consort attributes according to gift type and reports the gain', () => {
    const state = createInitialGameState();
    const beauty = grantInventoryGift(state, 'empress', 'phoenix-hairpin', 1);
    expect(beauty.state.people.empress.stats['容貌']).toBe(state.people.empress.stats['容貌'] + 2);
    expect(beauty.message).toContain('容貌 +2');
    const books = grantInventoryGift(beauty.state, 'empress', 'four-books', 1);
    expect(books.state.people.empress.stats['才情']).toBe(state.people.empress.stats['才情'] + 3);
    expect(books.message).toContain('才情 +3');
  });
  it('deducts direct silver and gold rewards from visible finance accounts', () => {
    const state = createInitialGameState();
    const silver = grantDirectReward(state, 'empress', '赏银百两');
    const gold = grantDirectReward(silver.state, 'empress', '赏金百两');
    expect(silver.state.finances.nationalTreasury).toBe(state.finances.nationalTreasury - 100);
    expect(Object.hasOwn(silver.state.finances, 'privateTreasury')).toBe(false);
    expect(gold.state.finances.gold).toBe(state.finances.gold - 100);
    expect(gold.state.history.filter((entry) => entry.type === 'REWARD')).toHaveLength(2);
  });

  it('pays monthly stipends once on the first day of each month', () => {
    const state = createInitialGameState();
    const date = { year: 3, month: 11, day: 1 };
    const paid = processMonthlyStipends(state, date);
    const expected = Object.values(state.people).reduce((sum, person) => sum + monthlyStipend(person), 0);
    expect(paid.finances.nationalTreasury).toBe(state.finances.nationalTreasury - expected);
    expect(paid.history.at(-1)?.type).toBe('MONTHLY_PAYROLL');
    expect(processMonthlyStipends(paid, date)).toBe(paid);
  });

  it('creates resignation and starvation plots when the treasury cannot pay', () => {
    const state = { ...createInitialGameState(), finances: { ...createInitialGameState().finances, nationalTreasury: 0 } };
    const first = processMonthlyStipends(state, { year: 3, month: 11, day: 1 });
    expect(first.people['minister-001'].title).toBe('辞官归里');
    expect(first.people.empress.arrearsMonths).toBe(1);
    const second = processMonthlyStipends(first, { year: 3, month: 12, day: 1 });
    expect(second.people.empress.status).toBe('DEAD');
    expect(second.history.some((entry) => entry.type === 'STARVATION_DEATH')).toBe(true);
  });

  it('persists the selected title for the actual royal instead of a fixed prince', () => {
    const base = createInitialGameState();
    const prince = royal();
    const state = { ...base, people: { ...base.people, [prince.id]: prince } };
    const result = grantRoyalTitle(state, prince.id, '端郡王');
    expect(result.ok).toBe(true);
    expect(result.state.people[prince.id]).toMatchObject({ title: '大皇子', royalTitle: '端郡王', birthOrder: 1 });
    expect(result.state.history.at(-1)).toMatchObject({ type: 'ROYAL_TITLE', personIds: [prince.id, 'emperor'] });
  });
});
