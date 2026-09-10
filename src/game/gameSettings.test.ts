import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { advanceGameState, schedulePalaceVisit } from './simulation';

describe('game probability settings', () => {
  it('defaults new pregnancy settings and person fields for old saves', () => {
    const state = createInitialGameState();
    const loaded = migrateGameState({ ...state, gameSettings: { pregnancyRate: 30, maleBirthRate: 50 } } as typeof state);
    expect(loaded.gameSettings).toEqual({ pregnancyRate: 30, maleBirthRate: 50, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 });
    expect(loaded.people.empress.miscarriageCount).toBe(0);
    expect(loaded.people.empress.infertile).toBe(false);
  });

  it('defaults old saves and preserves zero', () => {
    const state = createInitialGameState();
    expect(state.gameSettings).toEqual({ pregnancyRate: 30, maleBirthRate: 50, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 });
    expect(migrateGameState({ ...state, gameSettings: undefined } as unknown as typeof state).gameSettings).toEqual(state.gameSettings);
    expect(migrateGameState({ ...state, gameSettings: { pregnancyRate: 0, maleBirthRate: 100 } }).gameSettings).toEqual({ pregnancyRate: 0, maleBirthRate: 100, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 });
  });
  it.each([0, 100])('uses pregnancy rate %s at normal visit settlement', (rate) => {
    const state = createInitialGameState();
    state.gameSettings = { pregnancyRate: rate, maleBirthRate: 50 };
    const next = advanceGameState(schedulePalaceVisit(state, 'empress'), 69000, 1);
    expect(next.visits[0].status).toBe('PROCESSED');
    expect(next.pregnancies.length).toBe(rate === 100 ? 1 : 0);
    state.people.empress.status = 'REST';
    expect(schedulePalaceVisit(state, 'empress').visits).toHaveLength(0);
  });
  it.each([0, 100])('uses male birth rate %s', (rate) => {
    const state = createInitialGameState();
    state.gameSettings = { pregnancyRate: 30, maleBirthRate: rate };
    state.people.empress.status = 'PREGNANT';
    state.pregnancies = [{ id: 'test', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: { year: 3, month: 10, day: 19 }, status: 'ACTIVE', risk: 5 }];
    const next = advanceGameState(state, 69000, 1);
    const child = Object.values(next.people).find(p => p.kind === 'PRINCE' || p.kind === 'PRINCESS');
    expect(child?.sex).toBe(rate === 100 ? 'MALE' : 'FEMALE');
  });
});
