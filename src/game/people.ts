export type ScenePersonType = 'MINISTER' | 'PRINCE' | 'CONSORT' | 'DOWAGER';
export type ScenePersonStatus = 'IN_SCENE' | 'OUTSIDE' | 'EVENT' | 'REST' | 'SICK' | 'LOCK';
export interface ScenePersonState { id: string; type: ScenePersonType; name: string; sceneId: string; status: ScenePersonStatus; priority: number; }
export interface PeopleState { people: ScenePersonState[]; }

export const initialPeopleState: PeopleState = { people: [
  { id: 'minister-001', type: 'MINISTER', name: '沈砚之', sceneId: 'wenhua', status: 'IN_SCENE', priority: 1 },
] };

export function getScenePeople(sceneId: string, state: PeopleState) {
  return state.people.filter((person) => person.sceneId === sceneId && (person.status === 'IN_SCENE' || person.status === 'REST')).sort((a, b) => a.priority - b.priority);
}

export function movePerson(personId: string, targetSceneId: string, state: PeopleState): PeopleState {
  return { ...state, people: state.people.map((person) => person.id === personId ? { ...person, sceneId: targetSceneId, status: 'IN_SCENE' } : person) };
}
