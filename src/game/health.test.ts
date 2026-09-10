import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { advanceGameState, processPregnancies } from './simulation';
import { killPerson, isPersonAlive } from './person';
import { processHealth } from './health';
import { schedulePalaceVisit, skipGameYears, resolveEvent } from './simulation';
import { applyHeirInteraction } from './heirEducation';
import { processMonthlyStipends } from './economy';
import { grantRoyalTitle } from './economy';
import { crownPrinceCandidates } from './crownPrince';
import { pickPalaceDialogue } from './palaceEvents';
import { processRoyalMarriagesForDay } from './royalMarriage';
describe('death and pregnancy regression', () => {
  it('cancels a dead mother’s overdue pregnancy without birth or resurrection', () => {
    const state = createInitialGameState();
    state.people.empress.status = 'DEAD';
    state.pregnancies.push({ id: 'dirty', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: state.clock, status: 'ACTIVE', risk: 0 });
    const next = advanceGameState(state, 1440 * 50, 1);
    expect(next.people.empress.status).toBe('DEAD');
    expect(next.pregnancies[0].status).toBe('LOST');
    expect(next.people.empress.children).toEqual([]);
    expect(next.history.some(h => h.type === 'BIRTH')).toBe(false);
  });
  it('repairs dead and pregnant save data before ordinary gameplay', () => {
    const state = createInitialGameState();
    state.people.empress.status = 'DEAD';
    state.pregnancies.push({ id: 'dirty', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: state.clock, status: 'ACTIVE', risk: 0 });
    const next = migrateGameState(state);
    expect(next.people.empress.stats['健康']).toBe(0);
    expect(next.pregnancies[0].status).toBe('LOST');
  });
});



function sickState(health: number, kind: 'CONSORT' | 'PRINCE' = 'CONSORT') {
  const state = createInitialGameState();
  state.people.empress = { ...state.people.empress, kind, stats: { 健康: health }, illness: { name: '风寒', severity: 1, startedAt: state.clock } };
  return state;
}

describe('health lifecycle', () => {
  it.each(['CONSORT', 'PRINCE'] as const)('%s illness worsens, recovers and can kill', kind => {
    const state = sickState(35, kind);
    const worse = processHealth(state, state.clock, () => .99);
    expect(worse.people.empress.stats['健康']).toBeLessThan(35);
    expect(worse.people.empress.stats['健康']).toBeGreaterThanOrEqual(0);
    const recovered = processHealth(state, state.clock, () => .1);
    expect(recovered.people.empress.stats['健康']).toBeGreaterThan(35);
    expect(recovered.history.some(h => h.type === 'HEALTH')).toBe(true);
    const dying = sickState(1, kind);
    expect(processHealth(dying, dying.clock, () => .99).people.empress.status).toBe('DEAD');
  });
  it.each(['CONSORT', 'PRINCE'] as const)('%s can acquire illness and fully recover', kind => {
    const state = sickState(85, kind);
    state.people.empress.illness = undefined;
    const sick = processHealth(state, state.clock, () => 0);
    expect(sick.people.empress.illness).toBeDefined();
    const recovering = sickState(79, kind);
    const healthy = processHealth(recovering, recovering.clock, () => .1);
    expect(healthy.people.empress.illness).toBeUndefined();
    expect(healthy.people.empress.stats['健康']).toBeLessThanOrEqual(100);
  });
  it('zero health dies before any recovery or due birth', () => {
    const state = sickState(0);
    state.pregnancies.push({ id: 'due', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: state.clock, status: 'ACTIVE', risk: 0 });
    const next = advanceGameState(state, 1440 * 50, 1);
    expect(isPersonAlive(next.people.empress)).toBe(false);
    expect(next.people.empress.stats['健康']).toBe(0);
    expect(next.people.empress.children).toEqual([]);
  });
  it('execution cancels pregnancy and pending visit permanently past the due date', () => {
    let state = createInitialGameState();
    state = schedulePalaceVisit(state, 'empress');
    state.pregnancies.push({ id: 'due', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: { ...state.clock, year: 4 }, status: 'ACTIVE', risk: 0 });
    const dead = killPerson(state, 'empress', '刺杀');
    expect(dead.visits[0].status).toBe('CANCELLED');
    expect(dead.pregnancies[0].status).toBe('LOST');
    expect(schedulePalaceVisit(dead, 'empress')).toBe(dead);
    const later = skipGameYears(dead, 1);
    expect(later.people.empress.status).toBe('DEAD');
    expect(later.people.empress.children).toEqual([]);
    expect(later.people.empress.age).toBe(dead.people.empress.age);
    expect(later.history.filter(h => h.type === 'DEATH' && h.personIds.includes('empress'))).toHaveLength(1);
  });
  it('dead princes cannot recover, age, study or resolve ordinary events', () => {
    const state = sickState(30, 'PRINCE');
    const dead = killPerson(state, 'empress', '疾病');
    const next = advanceGameState(dead, 1440 * 50, 1);
    expect(next.people.empress).toEqual(dead.people.empress);
    expect(applyHeirInteraction(next, 'empress', 'education', 'governance')).toBe(next);
    expect(processHealth(next, next.clock, () => 0).people.empress).toEqual(dead.people.empress);
  });
  it('save round trip preserves illness and clamps living health without restoring dead health', () => {
    const state = sickState(24);
    state.people['empress-dowager'].stats['健康'] = 150;
    const next = migrateGameState(JSON.parse(JSON.stringify(state)));
    expect(next.people.empress.illness).toEqual(state.people.empress.illness);
    expect(next.people.empress.stats['健康']).toBe(24);
    expect(next.people['empress-dowager'].stats['健康']).toBe(100);
    const dead = killPerson(next, 'empress', '疾病');
    const loaded = migrateGameState(JSON.parse(JSON.stringify(dead)));
    expect(loaded.people.empress).toEqual(dead.people.empress);
  });
  it('starvation uses death cleanup immediately', () => {
    const state = createInitialGameState();
    state.finances.nationalTreasury = 0;
    state.people.empress.arrearsMonths = 1;
    state.pregnancies.push({ id: 'due', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: state.clock, status: 'ACTIVE', risk: 0 });
    const next = processMonthlyStipends(state, { year: 3, month: 11, day: 1 });
    expect(next.people.empress.status).toBe('DEAD');
    expect(next.people.empress.stats['健康']).toBe(0);
    expect(next.pregnancies[0].status).toBe('LOST');
  });
});


it('direct delivery rejects dead or missing mothers but delivers a living pregnancy once', () => {
  const state = createInitialGameState();
  state.pregnancies.push({ id: 'due', consortId: 'empress', fatherId: 'emperor', conceivedOn: state.clock, dueOn: state.clock, status: 'ACTIVE', risk: 0 });
  state.people.empress.status = 'PREGNANT';
  const live = processPregnancies(state, state.clock);
  expect(live.people.empress.children).toHaveLength(1);
  expect(processPregnancies(live, live.clock).people.empress.children).toHaveLength(1);
  state.people.empress.status = 'DEAD';
  expect(processPregnancies(state, state.clock).people.empress.status).toBe('DEAD');
  expect(processPregnancies(state, state.clock).people.empress.children).toHaveLength(0);
  delete state.people.empress;
  expect(processPregnancies(state, state.clock).pregnancies[0].status).toBe('LOST');
});

it('rejects dead heirs in titles, succession, dialogue, banquet and stale birth choices', () => {
  const state = sickState(0, 'PRINCE');
  state.people.empress.status = 'DEAD';
  state.events.push({ id: 'stale', type: 'BIRTH_NOTICE', priority: 100, createdOn: state.clock, personIds: ['empress'], title: '', body: '', choices: [{ id: 'birth-visit', label: '', result: '' }], status: 'PENDING' });
  state.royalMarriages.push({ id: 'banquet', royalId: 'empress', method: 'BANQUET', status: 'BANQUET_SCHEDULED', createdOn: state.clock, banquetOn: state.clock, candidates: [] });
  expect(grantRoyalTitle(state, 'empress', '端郡王').ok).toBe(false);
  expect(crownPrinceCandidates(state)).toEqual([]);
  expect(pickPalaceDialogue(state, state.people.empress, .5)).toBeUndefined();
  const banquet = processRoyalMarriagesForDay(state, state.clock);
  expect(banquet.royalMarriages[0].status).toBe('REJECTED');
  expect(banquet.people.empress.sceneId).toBe(state.people.empress.sceneId);
  const resolved = resolveEvent(state, 'stale', 'birth-visit');
  expect(resolved.people.empress).toEqual(state.people.empress);
  expect(resolved.events[0].status).toBe('MISSED');
});

it('death markers override an accidentally restored status when loading', () => {
  const state = killPerson(createInitialGameState(), 'empress', '刺杀');
  state.people.empress.status = 'REST';
  state.people.empress.stats['健康'] = 88;
  delete state.people.empress.deathDate;
  expect(migrateGameState(state).people.empress.status).toBe('DEAD');
});

it('illness develops during pregnancy without replacing pregnancy or custody status', () => {
  const state = sickState(30);
  state.people.empress.status = 'PREGNANT';
  expect(processHealth(state, state.clock, () => .99).people.empress.status).toBe('PREGNANT');
  state.people.empress.status = 'COLD_PALACE';
  expect(processHealth(state, state.clock, () => .1).people.empress.status).toBe('COLD_PALACE');
});

it('migration identifies the victim rather than witnesses in capital punishment history', () => {
  const state = createInitialGameState();
  state.history.push({ id: 'legacy', date: state.clock, type: 'CAPITAL_PUNISHMENT', summary: '刺杀', personIds: ['emperor', 'minister-001', 'empress'] });
  const next = migrateGameState(state);
  expect(next.people.empress.status).toBe('DEAD');
  expect(next.people.emperor.status).toBe('NORMAL');
  expect(next.people['minister-001'].status).toBe('NORMAL');
});
