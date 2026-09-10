import { describe, expect, it } from 'vitest';
import { getScenePeople, initialPeopleState, movePerson } from './people';

const peopleWithConsort = {
  people: [...initialPeopleState.people, {
    id: 'consort-test', type: 'CONSORT' as const, name: '顾清漪',
    sceneId: 'yikun:西侧殿', status: 'IN_SCENE' as const, priority: 1,
  }],
};

describe('people world state', () => {
  it('keeps a moved consort at the announced destination', () => {
    const moved = movePerson('consort-test', 'garden', peopleWithConsort);
    expect(getScenePeople('garden', moved)[0].id).toBe('consort-test');
  });

  it('keeps a postpartum consort visible while she rests in her residence', () => {
    const resting = { ...peopleWithConsort, people: peopleWithConsort.people.map((person) => person.id === 'consort-test' ? { ...person, sceneId: 'yikun:西侧殿', status: 'REST' as const } : person) };
    expect(getScenePeople('yikun:西侧殿', resting).map((person) => person.id)).toContain('consort-test');
  });
});
