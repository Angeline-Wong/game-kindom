import { describe, expect, it } from 'vitest';
import { consortDowagerPortraitUrls, consortPortraitKeyForId, consortPortraitUrls, dowagerPortraitUrls, empressPortraitUrls, emperorPortraitUrls, ministerPortraitUrls, personPortraitUrl, youngPrincePortraitUrls, youngPrincessPortraitUrls } from './personPortraits';

describe('personPortraits', () => {
  it('loads the complete consort portrait library', () => {
    expect(consortPortraitUrls).toHaveLength(62);
  });

  it('loads the generated emperor, dowager and young-heir portrait libraries', () => {
    expect(emperorPortraitUrls.length).toBeGreaterThanOrEqual(2);
    expect(empressPortraitUrls.length).toBeGreaterThanOrEqual(1);
    expect(ministerPortraitUrls).toHaveLength(21);
    expect(dowagerPortraitUrls).toHaveLength(4);
    expect(consortDowagerPortraitUrls).toHaveLength(5);
    expect(youngPrincePortraitUrls).toHaveLength(10);
    expect(youngPrincessPortraitUrls).toHaveLength(10);
  });

  it('honors an explicit consort portrait key', () => {
    const portrait = personPortraitUrl({
      id: 'empress-shen',
      kind: 'CONSORT',
      assets: { avatar: 'portrait.consort', portrait: 'consort.01' },
    });
    expect(portrait).toBe(consortPortraitUrls[0]);
  });

  it('routes an explicit empress key to the empress portrait library', () => {
    const portrait = personPortraitUrl({
      id: 'empress',
      kind: 'CONSORT',
      assets: { avatar: 'portrait.empress', portrait: 'empress.01' },
    });
    expect(portrait).toBe(empressPortraitUrls[0]);
  });

  it('assigns stable generated portraits to ministers', () => {
    expect(consortPortraitKeyForId('candidate-lan')).toBe(consortPortraitKeyForId('candidate-lan'));
    const minister = { id: 'minister-zhang', kind: 'MINISTER' as const, assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' } };
    expect(ministerPortraitUrls).toContain(personPortraitUrl(minister));
    expect(personPortraitUrl(minister)).toBe(personPortraitUrl(minister));
    expect(personPortraitUrl({ ...minister, assets: { ...minister.assets, portrait: 'minister.01' } })).toBe(ministerPortraitUrls[0]);
  });
  it('uses generated portraits for the emperor and one-to-three-year-old heirs', () => {
    expect(personPortraitUrl({ id: 'emperor', kind: 'EMPEROR', assets: { avatar: 'portrait.emperor', portrait: 'portrait.emperor' } })).toBe(emperorPortraitUrls[0]);
    expect(youngPrincePortraitUrls).toContain(personPortraitUrl({ id: 'prince-one', kind: 'PRINCE', age: 2, assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' } }));
    expect(youngPrincessPortraitUrls).toContain(personPortraitUrl({ id: 'princess-one', kind: 'PRINCESS', age: 3, assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' } }));
  });

  it('honors explicit dowager and consort-dowager portrait keys', () => {
    expect(personPortraitUrl({ id: 'empress-dowager', kind: 'DOWAGER', assets: { avatar: 'dowager.01', portrait: 'dowager.01' } })).toBe(dowagerPortraitUrls[0]);
    expect(personPortraitUrl({ id: 'consort-dowager', kind: 'NOBLE', assets: { avatar: 'noble.02', portrait: 'noble.02' } })).toBe(consortDowagerPortraitUrls[1]);
  });
});