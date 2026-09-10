import { describe, expect, it } from 'vitest';
import { consortDisplayName, consortDisplayTitle } from './PersonRoster';
import type { PersonRecord } from '../game/gameState';

const person = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'consort', kind: 'CONSORT', name: '许令仪', sex: 'FEMALE', birthDate: { year: 0, month: 1, day: 1 }, age: 30,
  title: '皇贵妃', rank: '皇贵妃', sceneId: 'yikun', status: 'NORMAL', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: { 健康: 80 }, traits: [], ...overrides,
});

describe('consort roster heading', () => {
  it('puts honorific and rank before the name', () => {
    const value = person({ honorific: '和' });
    expect(`${consortDisplayTitle(value)} · ${consortDisplayName(value)}`).toBe('和皇贵妃 · 许令仪');
  });
  it('normalizes a display name that already includes the rank', () => {
    const value = person({ name: '沈皇后', title: '皇后', rank: '皇后' });
    expect(`${consortDisplayTitle(value)} · ${consortDisplayName(value)}`).toBe('皇后 · 沈氏');
  });
  it('keeps ordinary names and supports long titles without adding a badge', () => {
    const value = person({ name: '苏云衡', title: '庄贵妃', rank: '贵妃', honorific: '庄' });
    expect(`${consortDisplayTitle(value)} · ${consortDisplayName(value)}`).toBe('庄贵妃 · 苏云衡');
    expect(value.rank).toBe('贵妃');
  });
});
