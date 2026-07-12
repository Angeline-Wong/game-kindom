import { describe, expect, it } from 'vitest';
import { getAvailableResidences, initialResidenceState } from './residences';

describe('palace residences', () => {
  it('offers an empty main hall to a consort at or above pin rank', () => {
    expect(getAvailableResidences('嫔', initialResidenceState).some((residence) => residence.room === '主殿')).toBe(true);
  });

  it('only offers side halls to a guiren when every main hall is reserved for formal hosts', () => {
    const options = getAvailableResidences('贵人', initialResidenceState);
    expect(options.every((residence) => residence.room !== '主殿')).toBe(true);
    expect(options.some((residence) => residence.room === '东侧殿')).toBe(true);
  });
});
