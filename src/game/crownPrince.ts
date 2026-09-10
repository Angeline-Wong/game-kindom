import { isPersonAlive } from './person';
import type { GameState, PersonRecord } from './gameState';
import { clockDate } from './gameState';
import { royalBirthIdentity } from './royalNames';

export function crownPrinceCandidates(state: GameState) {
  return Object.values(state.people)
    .filter((person) => (person.kind === 'PRINCE' || person.kind === 'PRINCESS') && isPersonAlive(person))
    .sort((a, b) => b.age - a.age || a.name.localeCompare(b.name, 'zh-CN'));
}

function restoredFormerHeir(person: PersonRecord): PersonRecord {
  return {
    ...person,
    title: royalBirthIdentity(person),
    residence: person.preHeirResidence ?? '撷芳殿',
    sceneId: person.preHeirSceneId ?? 'xiefang',
    preHeirTitle: undefined,
    preHeirResidence: undefined,
    preHeirSceneId: undefined,
  };
}

export function appointCrownPrince(state: GameState, personId: string): GameState {
  const candidate = state.people[personId];
  if (!candidate || !['PRINCE', 'PRINCESS'].includes(candidate.kind) || !isPersonAlive(candidate)) return state;
  if (state.crownPrinceId === personId) return state;

  const people = { ...state.people };
  const formerId = state.crownPrinceId;
  if (formerId && isPersonAlive(people[formerId])) people[formerId] = restoredFormerHeir(people[formerId]);

  const heirTitle = candidate.kind === 'PRINCESS' ? '皇太女' : '太子';
  const current = people[personId];
  people[personId] = {
    ...current,
    title: heirTitle,
    residence: '毓庆宫',
    sceneId: 'yuqing',
    preHeirTitle: current.preHeirTitle ?? royalBirthIdentity(current),
    preHeirResidence: current.preHeirResidence ?? current.residence,
    preHeirSceneId: current.preHeirSceneId ?? current.sceneId,
  };

  const formerName = formerId ? state.people[formerId]?.name : undefined;
  return {
    ...state,
    crownPrinceId: personId,
    people,
    history: [...state.history, {
      id: `history-crown-prince-${personId}-${Date.now()}`,
      date: clockDate(state.clock),
      type: formerId ? 'CROWN_PRINCE_REPLACED' : 'CROWN_PRINCE_APPOINTED',
      summary: formerName
        ? `奉旨改立${candidate.name}为${heirTitle}，原储君${formerName}复归原序；新储君迁居毓庆宫。`
        : `奉旨册立${candidate.name}为${heirTitle}，迁居毓庆宫。`,
      personIds: [...new Set(['emperor', personId, ...(formerId ? [formerId] : [])])],
    }],
  };
}
