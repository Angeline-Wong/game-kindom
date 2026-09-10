import { describe, expect, it } from 'vitest';
import { getPersonActions } from './personActions';

describe('person actions', () => {
  it('uses distinct two-character action sets for each role', () => {
    expect(getPersonActions('MINISTER').map((action) => action.label)).toEqual(['调任', '改品', '奖励', '问责']);
    expect(getPersonActions('CONSORT').map((action) => action.label)).toEqual(['临幸', '闲聊', '赏赐', '搬迁', '改位', '问责']);
    expect(getPersonActions('PRINCE').map((action) => action.label)).toEqual(['教育', '鼓励', '闲聊', '封爵', '赏赐', '问责']);
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

  it('hides age-inappropriate actions from princes of varying ages', () => {
    // 0-3 襁褓/幼童：仅看顾/喂哺/逗弄/赏赐——无教育/鼓励/封爵/问责
    expect(getPersonActions('PRINCE', { age: 0 }).map((action) => action.label))
      .toEqual(['看顾', '喂哺', '逗弄', '赏赐']);
    expect(getPersonActions('PRINCE', { age: 3 }).map((action) => action.label))
      .toEqual(['看顾', '喂哺', '逗弄', '赏赐']);
    // 4-6 蒙学：开放教育/闲聊，仍隐藏鼓励/封爵/问责
    expect(getPersonActions('PRINCE', { age: 5 }).map((action) => action.label))
      .toEqual(['教育', '闲聊', '赏赐']);
    // 7-12 课业：开放鼓励
    expect(getPersonActions('PRINCE', { age: 9 }).map((action) => action.label))
      .toEqual(['教育', '鼓励', '闲聊', '赏赐']);
    // 13-17 少年：开放封爵
    expect(getPersonActions('PRINCE', { age: 14 }).map((action) => action.label))
      .toEqual(['教育', '鼓励', '闲聊', '封爵', '赏赐']);
    // 18+ 成年：开放问责
    expect(getPersonActions('PRINCE', { age: 18 }).map((action) => action.label))
      .toEqual(['教育', '鼓励', '闲聊', '封爵', '赏赐', '问责']);
    // 未指定 age：仍按全集 6 项（兼容既有调用方）
    expect(getPersonActions('PRINCE').map((action) => action.label))
      .toEqual(['教育', '鼓励', '闲聊', '封爵', '赏赐', '问责']);
  });
});



