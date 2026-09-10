import type { GameState, PersonRecord } from './gameState';

export function royalSpouse(person: PersonRecord, state: Pick<GameState, 'people' | 'relationships'>) {
  if (person.kind === 'PRINCE' || person.kind === 'PRINCESS') return undefined;
  const linked = person.royalSpouseOf ? state.people[person.royalSpouseOf] : undefined;
  if (linked) return linked;
  return state.relationships.filter(r => r.kind === 'SPOUSE' && (r.personAId === person.id || r.personBId === person.id))
    .map(r => state.people[r.personAId === person.id ? r.personBId : r.personAId])
    .find(p => p?.kind === 'PRINCE' || p?.kind === 'PRINCESS');
}

export function isRoyalInLaw(person: PersonRecord, state?: Pick<GameState, 'people' | 'relationships'>) {
  return Boolean(person.royalSpouseOf || ['王妃', '驸马'].includes(person.title) || (state && royalSpouse(person, state)));
}

export function normalizeRoyalInLaws(state: GameState): GameState {
  const people = { ...state.people };
  for (const person of Object.values(people)) {
    const royal = royalSpouse(person, state);
    if (!royal && !isRoyalInLaw(person)) continue;
    people[person.id] = { ...person, royalSpouseOf: royal?.id ?? person.royalSpouseOf,
      ...(person.kind === 'NOBLE' && royal ? { title: royal.kind === 'PRINCESS' ? '驸马' : '王妃' } : {}),
      residence: '宫外', sceneId: 'outside', residenceType: 'OUTSIDE_PALACE', isSummoned: false };
  }
  return { ...state, people };
}
