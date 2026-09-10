import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { updateConsortLocations } from './simulation';
import { adoptRoyalChild, childLivesWithMother, grantPersonalChildCare, orphanConsortChildren, separateMotherAndChildren } from './heirCare';
import type { PersonRecord } from './gameState';

function stateWithFamily() {
  const state = createInitialGameState();
  const mother: PersonRecord = { ...state.people.empress, id: 'mother-test', name: '顺妃', title: '妃', rank: '妃', residence: '永寿宫主殿', sceneId: 'yongshou:主殿', parents: [], children: ['child-test'], status: 'NORMAL' };
  const child: PersonRecord = { id: 'child-test', kind: 'PRINCE', name: '萧景安', sex: 'MALE', birthDate: { year: 2, month: 1, day: 1 }, age: 1, title: '皇长子', birthOrder: 1, motherId: mother.id, residence: mother.residence, sceneId: mother.sceneId, status: 'NORMAL', assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' }, parents: ['emperor', mother.id], children: [], stats: { 健康: 80 }, traits: [] };
  state.people[mother.id] = mother;
  state.people[child.id] = child;
  state.relationships.push({ id: 'rel-mother-child', personAId: mother.id, personBId: child.id, kind: 'PARENT_CHILD', labelA: '亲生皇子', labelB: '生母', affinity: 90, trust: 88 });
  return state;
}

describe('royal heir care', () => {
  it('lets consorts of rank 妃 and above raise children in their residence', () => {
    expect(childLivesWithMother({ rank: '妃', title: '妃', residence: '永寿宫主殿', sceneId: 'yongshou:主殿' })).toBe(true);
    expect(childLivesWithMother({ rank: '嫔', title: '嫔', residence: '永寿宫东侧殿', sceneId: 'yongshou:东侧殿' })).toBe(false);
  });

  it('separates a co-resident child without removing the birth relationship', () => {
    const next = separateMotherAndChildren(stateWithFamily(), 'mother-test');
    expect(next.people['child-test']).toMatchObject({ residence: '撷芳殿', sceneId: 'xiefang' });
    expect(next.people['child-test'].parents).toContain('mother-test');
  });

  it('lets a low-rank consort personally raise her biological child after a special grant', () => {
    const separated = separateMotherAndChildren(stateWithFamily(), 'mother-test');
    separated.people['mother-test'] = { ...separated.people['mother-test'], rank: '答应', title: '答应' };

    const next = grantPersonalChildCare(separated, 'mother-test');

    expect(next.people['mother-test'].mayRaiseOwnChildren).toBe(true);
    expect(childLivesWithMother(next.people['mother-test'])).toBe(true);
    expect(next.people['child-test']).toMatchObject({ residence: '永寿宫主殿', sceneId: 'yongshou:主殿' });
    expect(next.relationships.find((item) => item.id === 'rel-mother-child')?.labelB).toBe('生母');
    expect(next.history.at(-1)?.type).toBe('PERSONAL_CHILD_CARE_GRANTED');
  });
  it('clears the mother when she can no longer raise the child and permits adoption', () => {
    const orphaned = orphanConsortChildren(stateWithFamily(), 'mother-test');
    expect(orphaned.people['child-test'].parents).toEqual(['emperor']);
    expect(orphaned.people['mother-test'].children).not.toContain('child-test');
    const adopted = adoptRoyalChild(orphaned, 'child-test', 'empress');
    expect(adopted.people['child-test'].parents).toContain('empress');
    expect(adopted.people.empress.children).toContain('child-test');
    expect(adopted.people['child-test'].residence).toBe(adopted.people.empress.residence);
    expect(adopted.people['child-test']).toMatchObject({ motherId: 'mother-test', adoptiveMotherId: 'empress', birthOrder: 1 });
    expect(adopted.relationships.some((item) => item.personBId === 'child-test' && item.labelB === '养母')).toBe(true);
  });
  it('restores care from a legacy mother-child relationship even when child arrays are out of sync', () => {
    const state = stateWithFamily();
    state.people['mother-test'] = { ...state.people['mother-test'], rank: '常在', title: '常在', children: [] };
    state.people['child-test'] = { ...state.people['child-test'], parents: ['emperor'], residence: '撷芳殿', sceneId: 'xiefang' };

    const next = grantPersonalChildCare(state, 'mother-test');

    expect(next.people['mother-test'].mayRaiseOwnChildren).toBe(true);
    expect(next.people['child-test']).toMatchObject({ residence: '永寿宫主殿', sceneId: 'yongshou:主殿' });
  });
  it('only permits consorts of rank 嫔 or above to adopt a royal child', () => {
    const orphaned = orphanConsortChildren(stateWithFamily(), 'mother-test');
    const lowRankState = {
      ...orphaned,
      people: { ...orphaned.people, empress: { ...orphaned.people.empress, rank: '贵人', title: '贵人' } },
    };
    expect(adoptRoyalChild(lowRankState, 'child-test', 'empress')).toBe(lowRankState);

    const eligibleState = {
      ...orphaned,
      people: { ...orphaned.people, empress: { ...orphaned.people.empress, rank: '嫔', title: '嫔' } },
    };
    expect(adoptRoyalChild(eligibleState, 'child-test', 'empress').people['child-test'].parents).toContain('empress');
  });
  it('migrates existing high-rank children to their mother residence', () => {
    const state = stateWithFamily();
    state.people['child-test'] = { ...state.people['child-test'], residence: '撷芳殿', sceneId: 'xiefang' };
    const migrated = migrateGameState(state);
    expect(migrated.people['child-test']).toMatchObject({ residence: '永寿宫主殿', sceneId: 'yongshou:主殿' });
  });

  it('keeps a co-resident young heir at the mother palace on most ordinary days', () => {
    const state = stateWithFamily();
    const days = Array.from({ length: 100 }, (_, index) => ({ year: 3, month: 1 + Math.floor(index / 28), day: 1 + index % 28 }));
    const atHome = days.filter((date) => updateConsortLocations(state, date, 600).people['child-test'].sceneId === 'yongshou:主殿');
    expect(atHome.length).toBeGreaterThanOrEqual(85);
  });
});
