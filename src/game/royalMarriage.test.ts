import { describe, expect, it } from 'vitest';
import type { GameState, PersonRecord } from './gameState';
import { createInitialGameState } from './initialGameState';
import {
  addDays,
  createMinistryCandidates,
  eligibleRoyalHeirs,
  marryCandidate,
  marryMinister,
  ministerSpouse,
  marriageTitleFollowUp,
  processRoyalMarriagesForDay,
  resolveRoyalMarriageEvent,
  scheduleMarriageBanquet,
} from './royalMarriage';

function withAdultRoyal(age = 15): GameState {
  const state = createInitialGameState();
  const royal: PersonRecord = {
    id: 'royal-test', kind: 'PRINCE', name: '萧承安', sex: 'MALE',
    birthDate: { year: state.clock.year - age, month: state.clock.month, day: state.clock.day },
    age, title: '一皇子', residence: '毓庆宫', sceneId: 'yuqing', status: 'NORMAL',
    assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' },
    parents: ['emperor', 'empress'], children: [],
    stats: { 文: 74, 武: 63, 谋略: 70, 魅力: 72, 健康: 86 }, traits: ['端谨'],
  };
  state.people[royal.id] = royal;
  state.people.emperor.children.push(royal.id);
  state.people.empress.children.push(royal.id);
  state.relationships.push({
    id: 'rel-empress-royal-test', personAId: 'empress', personBId: royal.id,
    kind: 'PARENT_CHILD', labelA: '子嗣', labelB: '母妃', affinity: 82, trust: 86,
  });
  return state;
}

describe('royal marriage', () => {
  it('returns a title follow-up for an un-titled royal and skips titled royals', () => {
    const princeState = withAdultRoyal();
    expect(marriageTitleFollowUp(princeState, 'royal-test')).toEqual({ personId: 'royal-test', kind: 'PRINCE' });

    const titled = { ...princeState.people['royal-test'], royalTitle: '和硕景安亲王' };
    const titledState = { ...princeState, people: { ...princeState.people, 'royal-test': titled } };
    expect(marriageTitleFollowUp(titledState, 'royal-test')).toBeNull();

    const princess = { ...princeState.people['royal-test'], id: 'princess-test', kind: 'PRINCESS' as const, sex: 'FEMALE' as const };
    const princessState = { ...princeState, people: { ...princeState.people, 'princess-test': princess } };
    expect(marriageTitleFollowUp(princessState, 'princess-test')).toEqual({ personId: 'princess-test', kind: 'PRINCESS' });
  });

  it('treats fifteen as adulthood and excludes younger or already scheduled heirs', () => {
    expect(eligibleRoyalHeirs(withAdultRoyal(14))).toHaveLength(0);
    const adult = withAdultRoyal(15);
    expect(eligibleRoyalHeirs(adult).map((person) => person.id)).toEqual(['royal-test']);
    expect(eligibleRoyalHeirs(scheduleMarriageBanquet(adult, 'royal-test'))).toHaveLength(0);
  });

  it('has the Ministry present four complete candidates and can complete a marriage', () => {
    const state = withAdultRoyal();
    const candidates = createMinistryCandidates(state, 'royal-test');
    expect(candidates).toHaveLength(4);
    expect(candidates[0]).toMatchObject({
      familyRank: expect.any(String), familyOffice: expect.any(String),
      legitimacy: expect.stringMatching(/嫡|庶/), relation: '女',
      charm: expect.any(Number), strategy: expect.any(Number),
    });
    const married = marryCandidate(state, 'royal-test', candidates[0]);
    expect(married.relationships.some((relation) => relation.kind === 'SPOUSE' && relation.personAId === 'royal-test')).toBe(true);
    expect(married.relationships.some((relation) => relation.kind === 'PARENT_CHILD' && relation.personAId === candidates[0].parentMinisterId)).toBe(true);
    expect(married.history.at(-1)?.summary).toContain('奉旨');
  });

  it('requires a decision when the selected minister has an existing spouse', () => {
    const state = withAdultRoyal();
    const spouse: PersonRecord = {
      id: 'minister-spouse', kind: 'NOBLE', name: '傅夫人', sex: 'FEMALE',
      birthDate: { year: -39, month: 2, day: 2 }, age: 42, title: '命妇',
      sceneId: 'capital', status: 'NORMAL', assets: { avatar: 'portrait.consort', portrait: 'portrait.consort' },
      parents: [], children: [], stats: { 魅力: 61 }, traits: ['持家'],
    };
    state.people[spouse.id] = spouse;
    state.relationships.push({
      id: 'rel-minister-spouse', personAId: 'minister-002', personBId: spouse.id,
      kind: 'SPOUSE', labelA: '原配', labelB: '夫君', affinity: 60, trust: 68,
    });
    expect(ministerSpouse(state, 'minister-002')?.id).toBe(spouse.id);
    expect(marryMinister(state, 'royal-test', 'minister-002')).toBe(state);
    const forced = marryMinister(state, 'royal-test', 'minister-002', true);
    expect(forced.people[spouse.id].status).toBe('DEAD');
    expect(forced.relationships.some((relation) => relation.kind === 'SPOUSE' && relation.personAId === 'royal-test' && relation.personBId === 'minister-002')).toBe(true);
  });

  it('opens the garden banquet after fourteen days and reports the result the next day', () => {
    const state = withAdultRoyal();
    const scheduled = scheduleMarriageBanquet(state, 'royal-test');
    const banquetOn = addDays(scheduled.clock, 14);
    const active = processRoyalMarriagesForDay(scheduled, banquetOn);
    expect(active.royalMarriages[0].status).toBe('BANQUET_ACTIVE');
    expect(active.people['royal-test'].sceneId).toBe('garden');
    expect(active.people.empress.sceneId).toBe('garden');
    expect(active.events.some((event) => event.type === 'MARRIAGE_BANQUET')).toBe(true);

    const reportDate = addDays(banquetOn, 1);
    const reported = processRoyalMarriagesForDay(active, reportDate);
    const report = reported.events.find((event) => event.type === 'MARRIAGE_NOTICE')!;
    expect(reported.royalMarriages[0].status).toBe('AWAITING_DECISION');
    const approved = resolveRoyalMarriageEvent(reported, report.id, 'approve-marriage');
    expect(approved.royalMarriages[0].status).toBe('COMPLETED');
    expect(approved.relationships.some((relation) => relation.kind === 'SPOUSE' && relation.personAId === 'royal-test')).toBe(true);
    expect(approved.people.empress.sceneId).toBe('kuning:主殿');
  });
});
