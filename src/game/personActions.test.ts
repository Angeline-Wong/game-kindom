import { describe, expect, it } from 'vitest';
import { getPersonActions } from './personActions';

describe('person actions', () => {
  it('gives ministers and consorts their required actions', () => {
    expect(getPersonActions('MINISTER').map((action) => action.id)).toContain('appoint-duty');
    expect(getPersonActions('CONSORT').map((action) => action.id)).toContain('promote');
    expect(getPersonActions('CONSORT').map((action) => action.id)).toContain('demote');
  });
});
