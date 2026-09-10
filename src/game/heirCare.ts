import { isPersonAlive } from './person';
import type { GameState, PersonRecord, RelationshipRecord } from './gameState';

const coResidenceRanks = new Set(['皇后', '皇贵妃', '贵妃', '妃']);
const adoptiveMotherRanks = new Set(['皇后', '皇贵妃', '贵妃', '妃', '嫔']);

export function childLivesWithMother(mother: Pick<PersonRecord, 'rank' | 'title' | 'residence' | 'sceneId' | 'mayRaiseOwnChildren'>) {
  return (mother.mayRaiseOwnChildren === true || coResidenceRanks.has(mother.rank ?? mother.title)) && Boolean(mother.residence);
}

export function grantPersonalChildCare(state: GameState, motherId: string): GameState {
  const mother = state.people[motherId];
  if (!isPersonAlive(mother) || mother.kind !== 'CONSORT' || !mother.residence) return state;
  const linkedChildIds = new Set(mother.children);
  state.relationships.forEach((relation) => {
    if (relation.kind !== 'PARENT_CHILD') return;
    if (relation.personAId === motherId) linkedChildIds.add(relation.personBId);
    if (relation.personBId === motherId) linkedChildIds.add(relation.personAId);
  });
  const childIds = Object.values(state.people)
    .filter((person) => isPersonAlive(person) && ['PRINCE', 'PRINCESS'].includes(person.kind)
      && (person.parents.includes(motherId) || linkedChildIds.has(person.id)))
    .map((person) => person.id);
  if (!childIds.length) return state;
  const people = { ...state.people, [motherId]: { ...mother, mayRaiseOwnChildren: true } };
  childIds.forEach((id) => {
    people[id] = { ...people[id], residence: mother.residence, sceneId: mother.sceneId };
  });
  return {
    ...state,
    people,
    history: [...state.history, {
      id: `history-personal-care-${motherId}-${Date.now()}`,
      date: { year: state.clock.year, month: state.clock.month, day: state.clock.day },
      type: 'PERSONAL_CHILD_CARE_GRANTED',
      summary: `${mother.name}奉旨获准亲自抚养所生皇嗣，不受位份限制。`,
      personIds: [motherId, ...childIds, 'emperor'],
    }],
  };
}

export function separateMotherAndChildren(state: GameState, motherId: string): GameState {
  const mother = state.people[motherId];
  if (!isPersonAlive(mother) || mother.kind !== 'CONSORT') return state;
  const childIds = mother.children.filter((id) => {
    const child = state.people[id];
    return isPersonAlive(child) && (child.kind === 'PRINCE' || child.kind === 'PRINCESS') && child.parents.includes(motherId) && child.residence === mother.residence;
  });
  if (!childIds.length) return state;
  const people = { ...state.people };
  childIds.forEach((id) => { people[id] = { ...people[id], residence: '撷芳殿', sceneId: 'xiefang' }; });
  return { ...state, people, history: [...state.history, { id: `history-separate-${motherId}-${Date.now()}`, date: { year: state.clock.year, month: state.clock.month, day: state.clock.day }, type: 'MOTHER_CHILD_SEPARATED', summary: `${mother.name}与所育皇嗣奉旨分居，皇嗣迁往撷芳殿教养。`, personIds: [motherId, ...childIds, 'emperor'] }] };
}

export function orphanConsortChildren(state: GameState, motherId: string): GameState {
  const mother = state.people[motherId];
  if (!mother || mother.kind !== 'CONSORT') return state;
  const childIds = mother.children.filter((id) => {
    const child = state.people[id];
    return isPersonAlive(child) && (child.kind === 'PRINCE' || child.kind === 'PRINCESS') && child.parents.includes(motherId);
  });
  if (!childIds.length) return state;
  const people = { ...state.people, [motherId]: { ...mother, children: mother.children.filter((id) => !childIds.includes(id)) } };
  childIds.forEach((id) => { people[id] = { ...people[id], parents: people[id].parents.filter((parentId) => parentId !== motherId), residence: '撷芳殿', sceneId: 'xiefang' }; });
  const relationships = state.relationships.filter((relation) => !childIds.some((childId) => (relation.personAId === motherId && relation.personBId === childId) || (relation.personAId === childId && relation.personBId === motherId)));
  return { ...state, people, relationships, history: [...state.history, { id: `history-unraised-${motherId}-${Date.now()}`, date: { year: state.clock.year, month: state.clock.month, day: state.clock.day }, type: 'ROYAL_CHILD_UNRAISED', summary: `${mother.name}已不能继续抚养子嗣，相关皇嗣迁往撷芳殿，母妃暂空。`, personIds: [motherId, ...childIds, 'emperor'] }] };
}

export function adoptRoyalChild(state: GameState, childId: string, motherId: string): GameState {
  const child = state.people[childId];
  const mother = state.people[motherId];
  const previousAdoptiveMotherId = child?.adoptiveMotherId;
  if (!child || !isPersonAlive(child) || !isPersonAlive(mother) || ['COLD_PALACE', 'PRISON', 'DEAD'].includes(mother.status) || mother.kind !== 'CONSORT' || !adoptiveMotherRanks.has(mother.rank ?? mother.title) || !['PRINCE', 'PRINCESS'].includes(child.kind) || (child.parents.some((id) => state.people[id]?.kind === 'CONSORT') && !previousAdoptiveMotherId)) return state;
  const residence = childLivesWithMother(mother) ? mother.residence! : '撷芳殿';
  const sceneId = childLivesWithMother(mother) ? mother.sceneId : 'xiefang';
  const relationship: RelationshipRecord = { id: `rel-adopt-${motherId}-${childId}`, personAId: motherId, personBId: childId, kind: 'PARENT_CHILD', labelA: child.kind === 'PRINCE' ? '养子' : '养女', labelB: '养母', affinity: 72, trust: 68 };
  const parents = [...new Set([...child.parents.filter((id) => id !== previousAdoptiveMotherId), motherId])];
  const people = { ...state.people, [childId]: { ...child, adoptiveMotherId: motherId, parents, residence, sceneId }, [motherId]: { ...mother, children: [...mother.children.filter((id) => id !== childId), childId] } };
  if (previousAdoptiveMotherId && previousAdoptiveMotherId !== motherId && people[previousAdoptiveMotherId]) people[previousAdoptiveMotherId] = { ...people[previousAdoptiveMotherId], children: people[previousAdoptiveMotherId].children.filter((id) => id !== childId) };
  return { ...state, people, relationships: [...state.relationships.filter((item) => !(item.kind === 'PARENT_CHILD' && item.personBId === childId && item.labelB === '养母')), relationship], history: [...state.history, { id: `history-adopt-${childId}-${Date.now()}`, date: { year: state.clock.year, month: state.clock.month, day: state.clock.day }, type: 'ROYAL_ADOPTION', summary: `${child.name}奉旨过继给${mother.name}抚养。`, personIds: [childId, motherId, 'emperor'] }] };
}
