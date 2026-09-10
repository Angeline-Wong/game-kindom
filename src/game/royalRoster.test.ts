import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { getPersonActions } from './personActions';
import type { GameState, PersonRecord } from './gameState';
import {
  clearSummonedRoyals,
  completeRoyalMarriage,
  filterByMarriage,
  getAvailableRoyalActions,
  getMarriageCounts,
  getMarriageStatus,
  getRoyalResidenceGroup,
  isCurrentlyInPalace,
  summonRoyal,
} from './royalRoster';

function royal(overrides: Partial<PersonRecord>): PersonRecord {
  return {
    id: 'royal', kind: 'PRINCE', name: '萧清安', sex: 'MALE', birthDate: { year: 1, month: 1, day: 1 }, age: 20,
    title: '皇长子', residence: '宫外', sceneId: 'outside', status: 'NORMAL', assets: { avatar: 'x', portrait: 'x' },
    parents: [], children: [], stats: {}, traits: [], ...overrides,
  };
}

function stateWith(person: PersonRecord, extra: Partial<GameState> = {}): GameState {
  const state = createInitialGameState();
  return { ...state, people: { ...state.people, [person.id]: person }, ...extra };
}

describe('royal roster marriage state', () => {
  it('derives married status from an existing spouse relationship for legacy records', () => {
    const person = royal({ id: 'royal-legacy' });
    const state = stateWith(person, { relationships: [{ id: 'spouse', personAId: person.id, personBId: 'spouse', kind: 'SPOUSE', labelA: '配偶', labelB: '皇室配偶', affinity: 1, trust: 1 }] });
    expect(getMarriageStatus(person, state)).toBe('MARRIED');
  });

  it('filters all royals and calculates matching counts', () => {
    const people = [royal({ id: 'unmarried' }), royal({ id: 'married', maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE' }), royal({ id: 'princess', kind: 'PRINCESS', sex: 'FEMALE', maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE' })];
    const state = stateWith(people[0], { people: Object.fromEntries(people.map((person) => [person.id, person])) });
    expect(filterByMarriage(people, 'UNMARRIED').map((person) => person.id)).toEqual(['unmarried']);
    expect(filterByMarriage(people, 'MARRIED').map((person) => person.id)).toEqual(['married', 'princess']);
    expect(getMarriageCounts(people, state)).toEqual({ total: 3, unmarried: 1, married: 2 });
  });

  it('limits outside married royals until summoned and restores normal actions after summon', () => {
    const person = royal({ maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE' });
    const state = stateWith(person);
    expect(isCurrentlyInPalace(person)).toBe(false);
    expect(getAvailableRoyalActions(person, state).map((action) => action.label)).toEqual(['召见', '赏赐', '封爵', '问责']);
    const summoned = summonRoyal(state, person.id);
    expect(summoned.people[person.id].isSummoned).toBe(true);
    expect(isCurrentlyInPalace(summoned.people[person.id])).toBe(true);
    expect(getAvailableRoyalActions(summoned.people[person.id], summoned).map((action) => action.label)).toEqual(getPersonActions('PRINCE', { age: person.age }).map((action) => action.label));
    expect(summoned.people[person.id].residence).toBe('宫外');
  });

  it('does not restrict a married crown prince who remains in the palace', () => {
    const person = royal({ id: 'crown', maritalStatus: 'MARRIED', residenceType: 'PALACE', residence: '毓庆宫' });
    const state = stateWith(person, { crownPrinceId: person.id });
    expect(getAvailableRoyalActions(person, state).map((action) => action.label)).toEqual(getPersonActions('PRINCE', { age: person.age }).map((action) => action.label));
  });

  it('clears summons on the next day without changing formal residence', () => {
    const person = royal({ maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE', isSummoned: true });
    const state = stateWith(person);
    const next = clearSummonedRoyals(state);
    expect(next.people[person.id].isSummoned).toBe(false);
    expect(next.people[person.id].residence).toBe('宫外');
  });

  it('moves ordinary royals outside after marriage but keeps the crown prince in Yuqing Palace', () => {
    const ordinary = royal({ id: 'ordinary', residence: '长春宫西侧殿' });
    const prince = royal({ id: 'crown', residence: '长春宫西侧殿' });
    const state = stateWith(ordinary, { people: { ordinary, crown: prince }, crownPrinceId: prince.id });
    const next = completeRoyalMarriage(completeRoyalMarriage(state, ordinary.id), prince.id);
    expect(next.people.ordinary).toMatchObject({ maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE', residence: '宫外', isSummoned: false });
    expect(next.people.crown).toMatchObject({ maritalStatus: 'MARRIED', residenceType: 'PALACE', residence: '毓庆宫', isSummoned: false });
  });

  it('groups palace royals by formal residence and keeps the crown prince in Yuqing Palace', () => {
    const crown = royal({ id: 'crown', residence: '长春宫西侧殿' });
    const ordinary = royal({ id: 'ordinary', residence: '长春宫西侧殿' });
    const outside = royal({ id: 'outside', maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE', residence: '宫外' });
    const state = stateWith(crown, { people: { crown, ordinary, outside }, crownPrinceId: crown.id });
    expect(getRoyalResidenceGroup([crown, ordinary, outside], state)).toEqual([
      { residence: '毓庆宫', members: [crown] },
      { residence: '长春宫西侧殿', members: [ordinary] },
      { residence: '宫外', members: [outside] },
    ]);
  });
});
