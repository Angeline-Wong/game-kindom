import { describe, it, expect } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { applyPunishment, consortVisitEligibility, expireGrounding, gameDay } from './palacePunishments';
import { advanceGameState, schedulePalaceVisit, updateConsortLocations } from './simulation';
import { processMonthlyStipends } from './economy';
describe('palace punishments', () => {
  const request = { id: 'punishment-one', targetId: 'empress', reason: '宫中失仪', severity: 'MINOR' as const };
  it('grounds, cancels pending visits, writes one history and releases at the exact day', () => {
    const state = schedulePalaceVisit(createInitialGameState(), 'empress');
    const result = applyPunishment(state, request, 'grounding-7').state;
    expect(result.people.empress.groundingUntilDay).toBe(gameDay(state.clock) + 7);
    expect(result.people.empress.status).toBe('NORMAL');
    expect(consortVisitEligibility(result.people.empress, result.clock)).toEqual({ allowed: false, reason: '该妃嫔正在禁足中。' });
    expect(result.visits[0].status).toBe('CANCELLED');
    expect(schedulePalaceVisit(result, 'empress')).toBe(result);
    expect(result.history.at(-1)?.punishment?.type).toBe('GROUNDING');
    expect(applyPunishment(result, request, 'grounding-7').state).toBe(result);
    expect(consortVisitEligibility(result.people.empress, { ...state.clock, day: 24 }).allowed).toBe(false);
    const released = expireGrounding(result, { ...state.clock, day: 25 });
    expect(released.people.empress.groundingUntilDay).toBeUndefined();
    expect(consortVisitEligibility(released.people.empress, { ...state.clock, day: 25 }).allowed).toBe(true);
  });
  it('preserves pregnancy, rest and permanent legacy confinement at expiry', () => {
    for (const status of ['PREGNANT', 'REST', 'CONFINED'] as const) {
      const state = createInitialGameState();
      state.people.empress.status = status;
      const grounded = applyPunishment(state, request, 'grounding-3').state;
      const released = expireGrounding(grounded, { ...state.clock, day: 22 });
      expect(released.people.empress.status).toBe(status);
      expect(consortVisitEligibility(released.people.empress, released.clock).allowed).toBe(false);
    }
    for (const status of ['DEAD', 'COLD_PALACE', 'PRISON'] as const) {
      const state = createInitialGameState();
      state.people.empress.status = status;
      expect(applyPunishment(state, request, 'grounding-3').state).toBe(state);
    }
  });
  it('rechecks a pending visit even when restrictions were applied outside punishment', () => {
    const state = schedulePalaceVisit(createInitialGameState(), 'empress');
    state.people.empress.status = 'CONFINED';
    const next = advanceGameState(state, 1440 * 50, 1);
    expect(next.visits[0].status).toBe('CANCELLED');
    expect(next.pregnancies).toHaveLength(0);
  });
  it('withholds a monthly stipend without treating it as starvation or debt', () => {
    const state = applyPunishment(createInitialGameState(), request, 'fine-1').state;
    const next = processMonthlyStipends(state, { year: 3, month: 11, day: 1 });
    expect(next.people.empress.fineMonthsRemaining).toBe(0);
    expect(next.people.empress.stats.健康).toBe(state.people.empress.stats.健康);
    expect(next.people.empress.arrearsMonths).toBeUndefined();
    expect(next.history.some((h) => h.type === 'PALACE_FINE_WITHHELD')).toBe(true);
    expect(processMonthlyStipends(next, { year: 3, month: 11, day: 1 })).toBe(next);
  });
  it('honors a death record even if legacy status is NORMAL', () => {
    const state = createInitialGameState();
    state.people.empress.deathDate = { year: 3, month: 10, day: 17 };
    expect(consortVisitEligibility(state.people.empress, state.clock)).toEqual({ allowed: false, reason: '该妃嫔已经薨逝，不能临幸。' });
    expect(applyPunishment(state, request, 'warning').state).toBe(state);
    expect(schedulePalaceVisit(state, 'empress')).toBe(state);
  });
  it('keeps grounded consorts at home and handles calendar boundaries', () => {
    const state = applyPunishment(createInitialGameState(), request, 'grounding-30').state;
    expect(updateConsortLocations(state, state.clock, 600).people.empress.sceneId).toBe('kuning:主殿');
    expect(gameDay({ year: 4, month: 1, day: 1 }) - gameDay({ year: 3, month: 12, day: 31 })).toBe(1);
  });
});
