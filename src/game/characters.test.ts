import { describe, expect, it } from 'vitest';
import { demoConsort, demoEmperor, demoOfficial, getRadarAxes } from './characters';

describe('character radar summaries', () => {
  it('uses six emperor axes', () => {
    expect(getRadarAxes(demoEmperor).map((axis) => axis.label)).toEqual(['文', '武', '政治', '民生', '魅力', '健康']);
  });

  it('uses six official axes and preserves unknown estimates', () => {
    const axes = getRadarAxes(demoOfficial);
    expect(axes.map((axis) => axis.label)).toEqual(['智慧', '武略', '野心', '忠诚', '派系影响', '已知财富']);
    expect(axes.find((axis) => axis.label === '野心')?.value).toBeNull();
  });

  it('uses six consort axes', () => {
    expect(getRadarAxes(demoConsort).map((axis) => axis.label)).toEqual(['才情', '礼仪', '容貌', '健康', '野心']);
  });
});
