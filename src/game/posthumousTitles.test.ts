import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { isPersonAlive, killPerson } from './person';
import { grantPosthumousTitle, posthumousTitleOptions, deceasedRoyals, activeConsorts } from './posthumousTitles';
import { getAvailableMainHalls } from './residences';

function fixture() {
  const state = createInitialGameState();
  state.people.late = { ...state.people.empress, id: 'late', name: '许令仪', rank: '贵妃', title: '贵妃', residence: '翊坤宫主殿' };
  return killPerson(state, 'late', '病逝');
}

describe('posthumous honors', () => {
  it('rejects living people', () => {
    const state = createInitialGameState();
    expect(grantPosthumousTitle(state, 'empress', '皇后').state).toBe(state);
    expect(grantPosthumousTitle(state, 'empress', '皇后').ok).toBe(false);
  });
  it('honors the dead without changing life, health, rank, home, favor or active records', () => {
    const state = fixture();
    const result = grantPosthumousTitle(state, 'late', '皇贵妃');
    expect(result.ok).toBe(true);
    const person = result.state.people.late;
    expect(person.posthumousRank).toBe('皇贵妃');
    expect(isPersonAlive(person)).toBe(false);
    expect(person.stats['健康']).toBe(0);
    expect(person.rank).toBe('贵妃');
    expect(person.residence).toBe(state.people.late.residence);
    expect(person.stats).toEqual(state.people.late.stats);
    expect(result.state.pregnancies).toBe(state.pregnancies);
    expect(result.state.visits).toBe(state.visits);
  });
  it('does not occupy current empress quota or palace rooms', () => {
    const state = fixture();
    const next = grantPosthumousTitle(state, 'late', '皇后').state;
    expect(activeConsorts(next.people).filter(p => p.rank === '皇后')).toHaveLength(1);
    expect(activeConsorts(next.people).some(p => p.id === 'late')).toBe(false);
    expect(deceasedRoyals(next.people).some(p => p.id === 'late')).toBe(true);
    expect(getAvailableMainHalls(next.people)).toEqual(getAvailableMainHalls(state.people));
  });
  it('rejects demotions, invalid titles and duplicate grants', () => {
    const state = fixture();
    expect(grantPosthumousTitle(state, 'late', '嫔').ok).toBe(false);
    expect(grantPosthumousTitle(state, 'late', '随意称号').ok).toBe(false);
    const next = grantPosthumousTitle(state, 'late', '皇贵妃').state;
    expect(grantPosthumousTitle(next, 'late', '皇贵妃').state).toBe(next);
    expect(grantPosthumousTitle(next, 'late', '贵妃').ok).toBe(false);
  });
  it('keeps separate records for successive honors and survives save migration', () => {
    const state = fixture();
    const once = grantPosthumousTitle(state, 'late', '皇贵妃').state;
    const twice = grantPosthumousTitle(once, 'late', '皇后').state;
    expect(twice.history.filter(h => h.type === 'POSTHUMOUS_TITLE')).toHaveLength(2);
    const restored = migrateGameState(JSON.parse(JSON.stringify(twice)));
    expect(restored.people.late.posthumousRank).toBe('皇后');
    expect(restored.people.late.rank).toBe('贵妃');
    expect(restored.people.late.status).toBe('DEAD');
    expect(restored.people.late.stats['健康']).toBe(0);
    expect(restored.people.late.posthumousGrantedAt).toEqual({ year: 3, month: 10, day: 18 });
  });
  it.each(['PRINCE', 'PRINCESS'] as const)('uses the existing %s title hierarchy without active favor requirements', kind => {
    const state = fixture();
    state.people.late = { ...state.people.late, kind, rank: undefined, title: kind === 'PRINCE' ? '三皇子' : '三公主', stats: { 健康: 0, 宠爱: 0 } };
    const target = kind === 'PRINCE' ? '和硕亲王' : '固伦公主';
    expect(posthumousTitleOptions(state.people.late)).toContain(target);
    const next = grantPosthumousTitle(state, 'late', target).state;
    expect(next.people.late.posthumousTitle).toBe(target);
    expect(next.people.late.title).toBe(state.people.late.title);
    expect(next.crownPrinceId).toBeNull();
    expect(posthumousTitleOptions(next.people.late)).toEqual([]);
  });
});

it('allows known noble ranks but preserves unsupported noble titles', () => {
  const state = fixture();
  state.people.late = { ...state.people.late, kind: 'NOBLE', sex: 'MALE', title: '多罗端郡王' };
  expect(posthumousTitleOptions(state.people.late)).toEqual(['和硕亲王']);
  expect(grantPosthumousTitle(state, 'late', '和硕亲王').state.people.late.status).toBe('DEAD');
  state.people.late.title = '宗室长者';
  expect(posthumousTitleOptions(state.people.late)).toEqual([]);
});

it('does not demote a titled prince or princess through posthumous honors', () => {
  const state = fixture();
  state.people.late = { ...state.people.late, kind: 'PRINCE', title: '和硕端亲王' };
  expect(grantPosthumousTitle(state, 'late', '多罗郡王').ok).toBe(false);
  state.people.late = { ...state.people.late, kind: 'PRINCESS', title: '固伦宁公主' };
  expect(grantPosthumousTitle(state, 'late', '和硕公主').ok).toBe(false);
});

it('preserves a deceased princess lifetime title during save migration', () => {
  const state = fixture();
  state.people.late = { ...state.people.late, kind: 'PRINCESS', title: '固伦宁公主', named: true };
  const restored = migrateGameState(JSON.parse(JSON.stringify(state)));
  expect(restored.people.late.title).toBe('皇长女');
  expect(restored.people.late.royalTitle).toBe('固伦宁公主');
  expect(restored.people.late.status).toBe('DEAD');
});
