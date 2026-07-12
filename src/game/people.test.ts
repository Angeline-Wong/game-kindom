import { describe, expect, it } from 'vitest';
import { getScenePeople, initialPeopleState, movePerson } from './people';

describe('people world state', () => {
  it('keeps a moved consort at the announced destination', () => {
    const moved = movePerson('consort-001', 'garden', initialPeopleState);
    expect(getScenePeople('garden', moved)[0].id).toBe('consort-001');
  });
});
