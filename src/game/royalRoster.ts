import type { PersonAction } from './personActions';
import { isRoyalInLaw, normalizeRoyalInLaws } from './royalInLaws';
import { getPersonActions } from './personActions';
import type { GameState, PersonRecord } from './gameState';

export type MarriageFilter = 'ALL' | 'UNMARRIED' | 'MARRIED';
export type MaritalStatus = 'UNMARRIED' | 'MARRIED';
export type ResidenceType = 'PALACE' | 'OUTSIDE_PALACE';

const royalKinds = new Set(['PRINCE', 'PRINCESS']);

function hasSpouse(state: GameState | undefined, personId: string) {
  return state?.relationships.some((relationship) => relationship.kind === 'SPOUSE'
    && (relationship.personAId === personId || relationship.personBId === personId));
}

export function getMarriageStatus(person: PersonRecord, state?: GameState): MaritalStatus {
  return person.maritalStatus ?? (hasSpouse(state, person.id) ? 'MARRIED' : 'UNMARRIED');
}

export function getResidenceType(person: PersonRecord, state?: GameState): ResidenceType {
  if (isRoyalInLaw(person, state)) return 'OUTSIDE_PALACE';
  if (person.residenceType) return person.residenceType;
  if (state?.crownPrinceId === person.id) return 'PALACE';
  return getMarriageStatus(person, state) === 'MARRIED' ? 'OUTSIDE_PALACE' : 'PALACE';
}

export function filterByMarriage(people: PersonRecord[], filter: MarriageFilter, state?: GameState) {
  if (filter === 'ALL') return people;
  return people.filter((person) => (state ? getMarriageStatus(person, state) : (person.maritalStatus ?? 'UNMARRIED')) === filter);
}

export function getMarriageCounts(people: PersonRecord[], state?: GameState) {
  const unmarried = filterByMarriage(people, 'UNMARRIED', state).length;
  const married = filterByMarriage(people, 'MARRIED', state).length;
  return { total: people.length, unmarried, married };
}

export function isCurrentlyInPalace(person: PersonRecord, state?: GameState) {
  if (isRoyalInLaw(person, state)) return false;
  const residenceType = state ? getResidenceType(person, state) : person.residenceType;
  return residenceType === 'PALACE' || (residenceType === 'OUTSIDE_PALACE' && person.isSummoned === true);
}

export function getAvailableRoyalActions(person: PersonRecord, state: GameState): PersonAction[] {
  if (isRoyalInLaw(person, state)) return [];
  const outsideAndNotSummoned = getMarriageStatus(person, state) === 'MARRIED'
    && getResidenceType(person, state) === 'OUTSIDE_PALACE'
    && !person.isSummoned;
  if (outsideAndNotSummoned) {
    return [
      { id: 'summon', label: '召见', group: 'primary' },
      { id: 'gift', label: '赏赐', group: 'primary' },
      { id: 'ennoble', label: '封爵', group: 'primary' },
      { id: 'accountability', label: '问责', group: 'primary' },
    ];
  }
  return getPersonActions(person.kind === 'PRINCE' ? 'PRINCE' : 'PRINCESS', { age: person.age });
}

export function summonRoyal(state: GameState, personId: string): GameState {
  const person = state.people[personId];
  if (!person || !royalKinds.has(person.kind) || getMarriageStatus(person, state) !== 'MARRIED' || getResidenceType(person, state) !== 'OUTSIDE_PALACE') return state;
  return { ...state, people: { ...state.people, [personId]: { ...person, isSummoned: true } } };
}

export function clearSummonedRoyals(state: GameState): GameState {
  const people = { ...state.people };
  let changed = false;
  Object.values(people).forEach((person) => {
    if (!person.isSummoned) return;
    people[person.id] = { ...person, isSummoned: false };
    changed = true;
  });
  return changed ? { ...state, people } : state;
}

export function completeRoyalMarriage(state: GameState, personId: string): GameState {
  const person = state.people[personId];
  if (!person || !royalKinds.has(person.kind)) return state;
  const crownPrince = state.crownPrinceId === personId;
  const changed = {
    ...person,
    maritalStatus: 'MARRIED' as const,
    residenceType: crownPrince ? 'PALACE' as const : 'OUTSIDE_PALACE' as const,
    isSummoned: false,
    ...(crownPrince ? { residence: '毓庆宫', sceneId: 'yuqing' } : { residence: '宫外', sceneId: 'outside' }),
  };
  return normalizeRoyalInLaws({ ...state, people: { ...state.people, [personId]: changed } });
}

export function getRoyalResidenceGroup(people: PersonRecord[], state?: GameState) {
  const groups = new Map<string, PersonRecord[]>();
  people.forEach((person) => {
    const residence = state?.crownPrinceId === person.id
      ? '毓庆宫'
      : getResidenceType(person, state) === 'OUTSIDE_PALACE' ? '宫外' : (person.residence ?? '未定居所');
    groups.set(residence, [...(groups.get(residence) ?? []), person]);
  });
  return [...groups.entries()]
    .sort(([left], [right]) => left === '毓庆宫' ? -1 : right === '毓庆宫' ? 1 : 0)
    .map(([residence, members]) => ({ residence, members }));
}
