import { describe, expect, it } from 'vitest';
import { appointCrownPrince, crownPrinceCandidates } from './crownPrince';
import { createInitialGameState, migrateGameState } from './initialGameState';
import type { GameState, PersonRecord } from './gameState';

function royal(id: string, kind: 'PRINCE' | 'PRINCESS', name: string, title: string, sceneId = 'xiefang'): PersonRecord {
  return {
    id, kind, name, sex: kind === 'PRINCESS' ? 'FEMALE' : 'MALE', birthDate: { year: -12, month: 3, day: 4 }, age: 15,
    title, residence: '撷芳殿', sceneId, status: 'NORMAL', assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' },
    parents: ['emperor', 'empress'], children: [], stats: { 资质: 86, 功绩: 12, 健康: 84 }, traits: ['聪敏'],
  };
}

function withRoyals() {
  const state = createInitialGameState();
  state.people.prince = royal('prince', 'PRINCE', '萧承安', '大皇子');
  state.people.princess = royal('princess', 'PRINCESS', '萧令仪', '大公主');
  return state;
}

describe('crown prince succession', () => {
  it('appoints a prince, changes his identity, and moves him into Yuqing Palace', () => {
    const appointed = appointCrownPrince(withRoyals(), 'prince');
    expect(appointed.crownPrinceId).toBe('prince');
    expect(appointed.people.prince).toMatchObject({ title: '太子', residence: '毓庆宫', sceneId: 'yuqing', preHeirTitle: '大皇子' });
    expect(appointed.history.at(-1)).toMatchObject({ type: 'CROWN_PRINCE_APPOINTED', personIds: ['emperor', 'prince'] });
  });

  it('can appoint a princess and restores the former heir before moving the new heir', () => {
    const first = appointCrownPrince(withRoyals(), 'prince');
    const replaced = appointCrownPrince(first, 'princess');
    expect(replaced.crownPrinceId).toBe('princess');
    expect(replaced.people.princess).toMatchObject({ title: '皇太女', residence: '毓庆宫', sceneId: 'yuqing' });
    expect(replaced.people.prince).toMatchObject({ title: '大皇子', residence: '撷芳殿', sceneId: 'xiefang' });
    expect(replaced.people.prince.preHeirTitle).toBeUndefined();
    expect(replaced.history.at(-1)?.type).toBe('CROWN_PRINCE_REPLACED');
  });

  it('only offers living princes and princesses and migrates legacy saves without a crown heir', () => {
    const state = withRoyals();
    state.people.princess.status = 'DEAD';
    expect(crownPrinceCandidates(state).map((person) => person.id)).toEqual(['prince']);
    const legacy = { ...state } as GameState;
    delete (legacy as Partial<GameState>).crownPrinceId;
    expect(migrateGameState(legacy).crownPrinceId).toBeNull();
  });
});