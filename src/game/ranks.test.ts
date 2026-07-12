import { describe, expect, it } from 'vitest';
import { getDemotionOptions, getPromotionOptions } from './ranks';

describe('rank choices', () => {
  it('lists the next consort ranks with their staffing limits', () => {
    const options = getPromotionOptions('CONSORT', '贵人', { 皇后: 1, 皇贵妃: 0, 贵妃: 0, 妃: 0, 嫔: 0 });
    expect(options.map((option) => option.label)).toContain('嫔');
    expect(options.find((option) => option.label === '皇后')?.available).toBe(false);
  });

  it('only lists higher official grades for a promotion', () => {
    const options = getPromotionOptions('MINISTER', '正五品', {});
    expect(options.map((option) => option.label)).toContain('正一品');
    expect(options.map((option) => option.label)).not.toContain('从六品');
  });

  it('only lists lower consort ranks for demotion', () => {
    const options = getDemotionOptions('妃');
    expect(options.map((option) => option.label)).toContain('嫔');
    expect(options.map((option) => option.label)).not.toContain('贵妃');
  });
});
