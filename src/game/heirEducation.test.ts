import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import type { PersonRecord } from './gameState';
import { applyHeirInteraction, getHeirChoices, heirAgeBand, normalizeHeirStats } from './heirEducation';

function child(kind: 'PRINCE' | 'PRINCESS', age = 5): PersonRecord {
  return {
    id: `test-${kind}`, kind, name: kind === 'PRINCE' ? '测试皇子' : '测试公主',
    sex: kind === 'PRINCE' ? 'MALE' : 'FEMALE', birthDate: { year: 1, month: 1, day: 1 },
    age, title: kind === 'PRINCE' ? '皇子' : '公主', sceneId: 'xiefang', status: 'NORMAL',
    assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' }, parents: ['emperor'],
    children: [], stats: { 健康: 80 }, traits: [],
  };
}

describe('royal heir education', () => {
  it('creates the correct prince and princess attributes and keeps innate talent stable', () => {
    const prince = normalizeHeirStats(child('PRINCE'));
    const princess = normalizeHeirStats(child('PRINCESS'));
    expect(Object.keys(prince.stats)).toEqual(expect.arrayContaining(['健康', '天资', '文学', '武力', '宠爱', '勤奋', '野心']));
    expect(Object.keys(princess.stats)).toEqual(expect.arrayContaining(['健康', '天资', '礼仪', '才学', '宠爱', '勤奋', '野心']));
    expect(normalizeHeirStats(prince).stats['天资']).toBe(prince.stats['天资']);
  });

  it('assigns ambition within a stable range to princes and princesses', () => {
    const prince = normalizeHeirStats(child('PRINCE'));
    const princess = normalizeHeirStats(child('PRINCESS'));
    const princeAmbition = prince.stats['野心'] ?? 0;
    const princessAmbition = princess.stats['野心'] ?? 0;
    expect(princeAmbition).toBeGreaterThanOrEqual(30);
    expect(princeAmbition).toBeLessThanOrEqual(70);
    expect(princessAmbition).toBeGreaterThanOrEqual(22);
    expect(princessAmbition).toBeLessThanOrEqual(60);
    expect(normalizeHeirStats(prince).stats['野心']).toBe(princeAmbition);
  });

  it('preserves a stored ambition value when normalizing an heir', () => {
    const prince = normalizeHeirStats({ ...child('PRINCE'), stats: { 健康: 80, 野心: 88 } });
    expect(prince.stats['野心']).toBe(88);
  });

  it('offers age-appropriate education options that never let babies study or do arithmetic', () => {
    // 0-1 襁褓段：完全不应出现「教习说话」「算术启蒙」「强身游戏」。
    const infant = getHeirChoices(normalizeHeirStats(child('PRINCE', 0)), 'education').map((item) => item.label);
    expect(infant).not.toContain('教习说话');
    expect(infant).not.toContain('算术启蒙');
    // 2-3 幼童段：「教习说话」仍合理，但「算术启蒙」被替换。
    const toddler = getHeirChoices(normalizeHeirStats(child('PRINCE', 3)), 'education').map((item) => item.label);
    expect(toddler).toEqual(expect.arrayContaining(['教习说话']));
    expect(toddler).not.toContain('算术启蒙');
    // 4-6 蒙学段：进入识字、礼仪、骑射游戏。
    expect(getHeirChoices(normalizeHeirStats(child('PRINCE', 5)), 'education').map((item) => item.label))
      .toEqual(expect.arrayContaining(['识字蒙学', '礼仪启蒙', '骑射游戏']));
    // 8 岁课业段：经史、算学、骑射操练。
    expect(getHeirChoices(normalizeHeirStats(child('PRINCE', 8)), 'education').map((item) => item.label))
      .toEqual(expect.arrayContaining(['经史讲读', '骑射操练']));
  });

  it('replaces encouragement and conversation with care actions for infants and toddlers', () => {
    const infantEncourage = getHeirChoices(normalizeHeirStats(child('PRINCE', 0)), 'encourage').map((item) => item.label);
    expect(infantEncourage).not.toContain('温言嘉勉');
    expect(infantEncourage).not.toContain('讲述先贤');
    expect(infantEncourage).toEqual(expect.arrayContaining(['哼歌哄睡']));
    const toddlerTalk = getHeirChoices(normalizeHeirStats(child('PRINCE', 2)), 'talk').map((item) => item.label);
    expect(toddlerTalk).not.toContain('询问近况');
    expect(toddlerTalk).not.toContain('谈论爱好');
    expect(toddlerTalk).toEqual(expect.arrayContaining(['念童谣识物']));
  });

  it('exposes a stable age-band label for any age', () => {
    expect(heirAgeBand(0)).toBe('INFANT');
    expect(heirAgeBand(1)).toBe('INFANT');
    expect(heirAgeBand(2)).toBe('TODDLER');
    expect(heirAgeBand(3)).toBe('TODDLER');
    expect(heirAgeBand(5)).toBe('PRESCHOOL');
    expect(heirAgeBand(8)).toBe('SCHOOL');
    expect(heirAgeBand(15)).toBe('TEEN');
    expect(heirAgeBand(22)).toBe('ADULT');
  });

  it('education, encouragement and conversation improve capped acquired attributes', () => {
    let state = createInitialGameState();
    const heir = normalizeHeirStats({ ...child('PRINCE', 5), stats: { 健康: 80, 天资: 90, 文学: 0, 武力: 0, 宠爱: 98, 勤奋: 98 }, traits: ['喜文'] });
    state = { ...state, people: { ...state.people, [heir.id]: heir } };
    state = applyHeirInteraction(state, heir.id, 'education', 'letters');
    expect(state.people[heir.id].stats['文学']).toBeGreaterThan(0);
    expect(state.people[heir.id].stats['宠爱']).toBe(100);
    expect(state.history.at(-1)?.summary).toContain('宠爱提升2点');
    state = applyHeirInteraction(state, heir.id, 'encourage', 'example');
    state = applyHeirInteraction(state, heir.id, 'talk', 'company');
    expect(state.people[heir.id].stats['勤奋']).toBe(100);
    expect(state.people[heir.id].stats['宠爱']).toBe(100);
  });

  it('migrates old royal children without replacing their stored values', () => {
    const initial = createInitialGameState();
    const oldChild = { ...child('PRINCESS'), stats: { 健康: 77, 天资: 88 } };
    const migrated = migrateGameState({ ...initial, people: { ...initial.people, [oldChild.id]: oldChild } });
    expect(migrated.people[oldChild.id].stats['天资']).toBe(88);
    expect(migrated.people[oldChild.id].stats['礼仪']).toBe(0);
  });
});
