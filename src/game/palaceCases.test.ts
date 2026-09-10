import { describe, it, expect } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { createPalaceCase, startPalaceInvestigation, processPalaceCases, palaceCaseView, closePalaceCaseWithoutPunishment, punishAndClosePalaceCase, casePunishmentTargets } from './palaceCases';
import { investigationCandidates, personInvestigator, resolveInvestigation } from './palaceInvestigations';
import { advanceGameState, skipGameMonths, skipGameYears, schedulePalaceVisit } from './simulation';
import { consortVisitEligibility, gameDay } from './palacePunishments';
import { pickPalaceDialogue } from './palaceEvents';
import { pickDialogueForPerson } from './dialogueLibrary';
import type { PalaceCase } from './palaceCaseTypes';

function fixture(roll = .1) {
  const state = createInitialGameState();
  for (const id of ['victim', 'accused', 'helper']) state.people[id] = { ...state.people.empress, id, name: id, rank: '贵人', title: '贵人', stats: { 健康: 100, 智慧: 80, 谋略: 70, 威望: 60, 宠爱: 50, 心情: 70 } };
  return createPalaceCase(state, { id: 'case-test', templateId: 'abnormal-food', relatedDialogueId: 'palace-case-abnormal-food', sourceInteractionId: 'interaction-test', participants: { speakerId: 'victim', victimId: 'victim', accusedId: 'accused' }, truthRoll: roll }).state;
}
function investigating(roll = .1) { return startPalaceInvestigation(fixture(roll), 'case-test', 'NEIWUFU', { duration: .99, result: .99 }).state; }
function completed(roll = .1) { const s = investigating(roll); return advanceGameState(s, 8 * 1440 * 50, 1); }
const request = { id: 'request', targetId: 'accused', reason: 'test', severity: 'SERIOUS' as const };
describe('Phase 2 palace cases', () => {
  it('creates a pending case with participants and fixed truth, without a result', () => {
    const item = fixture().palaceCases[0];
    expect(item).toMatchObject({ status: 'PENDING', victimIds: ['victim'], accusedIds: ['accused'], truth: { type: 'TRUE', culpritIds: ['accused'], difficulty: 50 } });
    expect(item.result).toBeUndefined();
  });
  it('deduplicates repeated creation without rerolling truth', () => {
    const state = fixture();
    expect(createPalaceCase(state, { id: 'other', templateId: 'abnormal-food', relatedDialogueId: 'palace-case-abnormal-food', sourceInteractionId: 'interaction-test', participants: { speakerId: 'victim' }, truthRoll: .99 }).state).toBe(state);
  });
  it.each([['NEIWUFU', 'NEIWUFU'], ['empress', 'EMPRESS'], ['helper', 'CONSORT']])('assigns %s using canonical candidate data', (key, type) => {
    const state = startPalaceInvestigation(fixture(), 'case-test', key, { duration: .5, result: .5 }).state;
    expect(state.palaceCases[0].investigator?.type).toBe(type);
    expect(state.palaceCases[0].status).toBe('INVESTIGATING');
    expect(state.palaceCases[0].result).toBeUndefined();
  });
  it('rejects accused, victim and fabricated investigators', () => {
    const state = fixture();
    for (const key of ['victim', 'accused', 'missing']) expect(startPalaceInvestigation(state, 'case-test', key, { duration: 0, result: 0 }).state).toBe(state);
  });
  it.each(['DEAD', 'COLD_PALACE', 'REST'] as const)('excludes %s investigators', (status) => {
    const state = fixture(); state.people.helper.status = status;
    expect(investigationCandidates(state, state.palaceCases[0]).some((c) => c.personId === 'helper')).toBe(false);
  });
  it('excludes grounded investigators', () => {
    const state = fixture(); state.people.helper.groundingUntilDay = gameDay(state.clock) + 7;
    expect(investigationCandidates(state, state.palaceCases[0]).some((c) => c.personId === 'helper')).toBe(false);
  });
  it('derives ability from existing stats without adding attributes', () => {
    const person = fixture().people.helper;
    const before = { ...person.stats };
    expect(personInvestigator(person).ability).toBe(72);
    expect(person.stats).toEqual(before);
  });
  it('decrements once per actual day and ignores duplicate day processing', () => {
    const state = investigating();
    const next = advanceGameState(state, 1440 * 50, 1);
    expect(next.palaceCases[0].investigationDaysRemaining).toBe(7);
    expect(processPalaceCases(next, next.clock)).toBe(next);
    expect(next.palaceCases[0].truth).toEqual(state.palaceCases[0].truth);
  });
  it.each(['month', 'year'])('completes during a skipped %s on the actual completion date', (unit) => {
    const state = investigating();
    const next = unit === 'month' ? skipGameMonths(state, 1) : skipGameYears(state, 1);
    expect(next.palaceCases[0].status).toBe('WAITING_DECISION');
    expect(gameDay(next.palaceCases[0].completedDate!)).toBe(gameDay(state.clock) + 8);
    expect(next.history.filter((h) => h.type === 'PALACE_CASE_COMPLETED')).toHaveLength(1);
  });
  it('finishes into a player decision without automatically punishing', () => {
    const state = completed();
    expect(state.palaceCases[0].result?.conclusion).toBe('CULPRIT_FOUND');
    expect(state.palaceCases[0].status).toBe('WAITING_DECISION');
    expect(state.people.accused.groundingUntilDay).toBeUndefined();
    expect(state.events.filter((e) => e.palaceCaseId === 'case-test')).toHaveLength(1);
  });
  it('separates the player projection from truth and the saved roll', () => {
    const item = completed().palaceCases[0];
    expect(palaceCaseView(item)).not.toHaveProperty('truth');
    expect(palaceCaseView(item)).not.toHaveProperty('investigationRoll');
    expect(item.result).not.toBe(item.truth);
  });
  it.each([[-21, 'INCONCLUSIVE'], [-20, 'INSUFFICIENT_EVIDENCE'], [-1, 'INSUFFICIENT_EVIDENCE'], [0, 'PARTIAL_EVIDENCE'], [19, 'PARTIAL_EVIDENCE'], [20, 'CULPRIT_FOUND']])('resolves score %s at the correct boundary', (score, conclusion) => {
    const item = investigating().palaceCases[0];
    const adjusted: PalaceCase = { ...item, investigator: { ...item.investigator!, ability: 50 + Number(score) }, investigationRoll: .5 };
    const result = resolveInvestigation(adjusted);
    expect(result.conclusion).toBe(conclusion);
    if (Number(score) < 0) expect(result.suspectedIds).toEqual([]);
  });
  it.each([[.45, 'FALSE_ACCUSATION_FOUND'], [.6, 'PARTIAL_EVIDENCE'], [.8, 'ACCIDENT'], [.99, 'INCONCLUSIVE']])('supports truth branch %s', (roll, conclusion) => {
    expect(completed(Number(roll)).palaceCases[0].result?.conclusion).toBe(conclusion);
  });
  it('migrates old saves with no cases and preserves Phase 1 values', () => {
    const state = createInitialGameState(); state.people.empress.groundingUntilDay = 9999;
    const old = JSON.parse(JSON.stringify(state)); delete old.palaceCases;
    const next = migrateGameState(old);
    expect(next.palaceCases).toEqual([]); expect(next.people.empress.groundingUntilDay).toBe(9999); expect(next.version).toBe(1);
  });
  it('reloads on day three without rerolling truth, duration, investigator or result', () => {
    const state = advanceGameState(investigating(), 3 * 1440 * 50, 1);
    const restored = migrateGameState(JSON.parse(JSON.stringify(state)));
    expect(restored.palaceCases).toEqual(state.palaceCases);
    expect(restored.palaceCases[0].investigationDaysRemaining).toBe(5);
    expect(advanceGameState(restored, 5 * 1440 * 50, 1).palaceCases[0].result).toEqual(completed().palaceCases[0].result);
  });
  it('punishes through Phase 1, cancels pending visits and closes atomically once', () => {
    const state = schedulePalaceVisit(completed(), 'accused');
    const result = punishAndClosePalaceCase(state, 'case-test', request, 'grounding-7');
    expect(result.error).toBeUndefined();
    expect(result.state.palaceCases[0].status).toBe('CLOSED');
    expect(consortVisitEligibility(result.state.people.accused, result.state.clock).reason).toBe('该妃嫔正在禁足中。');
    expect(result.state.visits.at(-1)?.status).toBe('CANCELLED');
    expect(result.state.history.filter((h) => h.punishment?.sourceCaseId === 'case-test')).toHaveLength(1);
    expect(punishAndClosePalaceCase(result.state, 'case-test', request, 'grounding-7').state).toBe(result.state);
  });
  it('does not close or mutate on invalid punishment', () => {
    const state = completed();
    expect(punishAndClosePalaceCase(state, 'case-test', request, 'invalid').state).toBe(state);
    expect(punishAndClosePalaceCase(state, 'case-test', { ...request, targetId: 'helper' }, 'warning').state).toBe(state);
  });
  it('allows punishment of an identified false accuser', () => {
    const state = completed(.45);
    expect(casePunishmentTargets(state, state.palaceCases[0]).map((p) => p.id)).toContain('victim');
    const next = punishAndClosePalaceCase(state, 'case-test', { ...request, targetId: 'victim' }, 'warning').state;
    expect(next.history.find((h) => h.punishment)?.punishment?.targetId).toBe('victim');
    expect(next.people.accused.stats.宠爱).toBe(state.people.accused.stats.宠爱);
  });
  it('closes an accident without punishment and records all four stages in existing history', () => {
    const state = closePalaceCaseWithoutPunishment(completed(.8), 'case-test');
    expect(state.palaceCases[0].status).toBe('CLOSED');
    expect(state.history.filter((h) => h.palaceCaseId === 'case-test').map((h) => h.type)).toEqual(['PALACE_CASE_CREATED', 'PALACE_CASE_STARTED', 'PALACE_CASE_COMPLETED', 'PALACE_CASE_CLOSED']);
    expect(state.history.filter((h) => h.palaceCaseId === 'case-test').every((h) => h.personIds.includes('accused'))).toBe(true);
    expect(closePalaceCaseWithoutPunishment(state, 'case-test')).toBe(state);
  });
  it('returns to pending if its investigator dies, preserving truth for reassignment', () => {
    const state = startPalaceInvestigation(fixture(), 'case-test', 'helper', { duration: .9, result: .9 }).state;
    state.people.helper.status = 'DEAD';
    const next = advanceGameState(state, 1440 * 50, 1);
    expect(next.palaceCases[0].status).toBe('PENDING');
    expect(next.palaceCases[0].truth).toEqual(state.palaceCases[0].truth);
  });
  it('keeps old low-roll scenes and offers only one new eligible case scene', () => {
    const state = fixture();
    expect(pickPalaceDialogue(state, state.people.helper, .2)).toEqual(pickDialogueForPerson(state.people.helper, .2));
    expect(pickPalaceDialogue(state, state.people.helper, .999)?.eventType).toBe('CASE');
    expect(pickPalaceDialogue(state, state.people.victim, .999)?.eventType).not.toBe('CASE');
  });
});
