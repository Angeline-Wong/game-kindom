import { describe, expect, it } from 'vitest';
import { getPersonActions } from './personActions';

describe('person actions', () => {
  it('uses distinct two-character action sets for each role', () => {
    expect(getPersonActions('MINISTER').map((action) => action.label)).toEqual(['调任', '改品', '奖励', '问责']);
    expect(getPersonActions('CONSORT').map((action) => action.label)).toEqual(['临幸', '闲聊', '赏赐', '搬迁', '改位', '问责']);
    expect(getPersonActions('PRINCE').map((action) => action.label)).toEqual(['教育', '鼓励', '封爵', '赏赐', '问责']);
    expect(getPersonActions('DOWAGER').map((action) => action.label)).toEqual(['请安', '闲聊', '赏赐', '探望']);
  });

  it('replaces favor with companionship for a pregnant consort', () => {
    const actions = getPersonActions('CONSORT', { pregnant: true });
    expect(actions.map((action) => action.label)).toEqual(['陪伴', '闲聊', '赏赐', '搬迁', '改位', '问责']);
    expect(actions.some((action) => action.id === 'favor')).toBe(false);
  });

  it('limits a confined person to custody actions', () => {
    expect(getPersonActions('CONSORT', { custody: 'COLD_PALACE' }).map((action) => action.label)).toEqual(['探望', '刺死', '恢复']);
    expect(getPersonActions('PRINCE', { custody: 'PRISON' }).map((action) => action.label)).toEqual(['探望', '赐死', '释放']);
  });
});
