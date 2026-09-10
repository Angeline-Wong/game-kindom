export type ScenePersonType = 'MINISTER' | 'PRINCE' | 'CONSORT' | 'DOWAGER' | 'PRINCESS' | 'NOBLE' | 'EUNUCH' | 'COURT_LADY';
export type ScenePersonStatus = 'IN_SCENE' | 'OUTSIDE' | 'EVENT' | 'REST' | 'SICK' | 'LOCK';
export interface ScenePersonState { id: string; type: ScenePersonType; name: string; sceneId: string; status: ScenePersonStatus; priority: number; }
export interface PeopleState { people: ScenePersonState[]; }

export const initialPeopleState: PeopleState = { people: [
  { id: 'minister-001', type: 'MINISTER', name: '沈砚之', sceneId: 'wenhua', status: 'IN_SCENE', priority: 1 },
  { id: 'empress-dowager', type: 'DOWAGER', name: '孝和太后', sceneId: 'cining', status: 'IN_SCENE', priority: 1 },
  { id: 'consort-dowager', type: 'NOBLE', name: '荣太妃', sceneId: 'shoukang', status: 'IN_SCENE', priority: 1 },
  { id: 'attendant', type: 'EUNUCH', name: '值房内侍', sceneId: 'taihe', status: 'IN_SCENE', priority: 2 },
  { id: 'kunning-lady', type: 'COURT_LADY', name: '坤宁宫女官', sceneId: 'kuning:主殿', status: 'IN_SCENE', priority: 2 },
  { id: 'cining-lady', type: 'COURT_LADY', name: '慈宁宫宫女', sceneId: 'cining', status: 'IN_SCENE', priority: 2 },
] };

export function getScenePeople(sceneId: string, state: PeopleState) {
  return state.people.filter((person) => person.sceneId === sceneId && (person.status === 'IN_SCENE' || person.status === 'REST')).sort((a, b) => a.priority - b.priority);
}

export function movePerson(personId: string, targetSceneId: string, state: PeopleState): PeopleState {
  return { ...state, people: state.people.map((person) => person.id === personId ? { ...person, sceneId: targetSceneId, status: 'IN_SCENE' } : person) };
}
