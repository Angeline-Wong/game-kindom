import { describe, expect, it } from 'vitest';
import { royalTitleEligibility } from './royalTitles';

const royal = (kind: 'PRINCE' | 'PRINCESS', favor: number, parents: string[] = []) => ({ kind, parents, stats: { 宠爱: favor } });

describe('royal title eligibility', () => {
  it('unlocks prince titles by favor thresholds', () => {
    expect(royalTitleEligibility(royal('PRINCE', 89), '和硕景珩亲王').ok).toBe(false);
    expect(royalTitleEligibility(royal('PRINCE', 90), '和硕景珩亲王').ok).toBe(true);
  });

  it('allows a non-legitimate princess to receive 固伦公主 at favor 80', () => {
    expect(royalTitleEligibility(royal('PRINCESS', 79), '固伦明昭公主').ok).toBe(false);
    expect(royalTitleEligibility(royal('PRINCESS', 80), '固伦明昭公主').ok).toBe(true);
  });

  it('keeps 固伦公主 available to a legitimate princess regardless of favor', () => {
    expect(royalTitleEligibility(royal('PRINCESS', 0, ['empress']), '固伦明昭公主').ok).toBe(true);
  });
});