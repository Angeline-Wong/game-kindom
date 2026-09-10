import { describe, expect, it } from 'vitest';
import { calculateDailyMiscarriageChance, healthMiscarriageModifier, miscarriageCountModifier, rollFetusCount, shouldBecomeInfertile } from './pregnancyRules';

describe('pregnancy rules', () => {
  it.each([
    [85, .5], [70, 1], [50, 1.5], [30, 2], [10, 3],
  ])('maps health %s to miscarriage modifier %s', (health, expected) => {
    expect(healthMiscarriageModifier(health)).toBe(expected);
  });

  it.each([[0, .05], [1, .05], [2, .1], [3, .2], [8, .3]])('maps miscarriage count %s to infertility base modifier %s', (count, expected) => {
    expect(miscarriageCountModifier(count)).toBe(expected);
  });

  it('converts the adjusted full-pregnancy risk into a daily hazard', () => {
    const chance = calculateDailyMiscarriageChance({ totalRate: 10, gestationDays: 300, health: 85, fetusCount: 1, illness: false, miscarriageCount: 0 });
    expect(chance).toBeCloseTo(1 - Math.pow(0.95, 1 / 300));
  });

  it('applies twin and illness modifiers and clamps the result', () => {
    const chance = calculateDailyMiscarriageChance({ totalRate: 100, gestationDays: 300, health: 10, fetusCount: 2, illness: true, miscarriageCount: 3 });
    expect(chance).toBe(1);
  });

  it('rolls singleton or twins from the configured twin rate', () => {
    expect(rollFetusCount(0, .999)).toBe(1);
    expect(rollFetusCount(3, .04)).toBe(1);
    expect(rollFetusCount(3, .029)).toBe(2);
    expect(rollFetusCount(100, .999)).toBe(2);
  });

  it('increases infertility chance by miscarriage count and health', () => {
    expect(shouldBecomeInfertile({ baseRate: 5, miscarriageCount: 1, health: 80, roll: .04 })).toBe(true);
    expect(shouldBecomeInfertile({ baseRate: 5, miscarriageCount: 1, health: 80, roll: .05 })).toBe(false);
    expect(shouldBecomeInfertile({ baseRate: 5, miscarriageCount: 3, health: 20, roll: .29 })).toBe(true);
  });
});
