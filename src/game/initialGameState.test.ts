import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import type { PersonRecord } from './gameState';

function royal(id: string, kind: 'PRINCE' | 'PRINCESS', title: string, year: number): PersonRecord {
  return {
    id, kind, name: id, named: true, sex: kind === 'PRINCE' ? 'MALE' : 'FEMALE',
    birthDate: { year, month: 1, day: 1 }, age: 3 - year, title,
    residence: '撷芳殿', sceneId: 'xiefang', status: 'NORMAL',
    assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' },
    parents: ['emperor'], children: [], stats: {}, traits: [],
  };
}

describe('game-state migration', () => {
  it('preserves explicit legacy birth ordinals independently for princes and princesses', () => {
    const state = createInitialGameState();
    state.people.princeOld = royal('princeOld', 'PRINCE', '一皇子', 1);
    state.people.princeYoung = royal('princeYoung', 'PRINCE', '三皇子', 2);
    state.people.princessOld = royal('princessOld', 'PRINCESS', '二公主', 1);
    state.people.princessYoung = royal('princessYoung', 'PRINCESS', '四公主', 2);

    const migrated = migrateGameState(state);

    expect(migrated.people.princeOld.title).toBe('皇长子');
    expect(migrated.people.princeYoung.title).toBe('皇三子');
    expect(migrated.people.princessOld.title).toBe('皇次女');
    expect(migrated.people.princessYoung.title).toBe('皇四女');
  });
  it('repairs impossible persisted ordinals instead of displaying three-digit heir ranks', () => {
    const state = createInitialGameState();
    Object.values(state.people).filter((person) => person.kind === 'PRINCE').forEach((person, index) => {
      state.people[person.id] = { ...person, birthOrder: 104 + index, title: `皇${104 + index}子` };
    });

    const migrated = migrateGameState(state);
    const princes = Object.values(migrated.people)
      .filter((person) => person.kind === 'PRINCE')
      .sort((left, right) => (left.birthOrder ?? 0) - (right.birthOrder ?? 0));

    expect(princes.map((person) => person.birthOrder)).toEqual(princes.map((_, index) => index + 1));
    expect(princes.every((person) => /^皇(?:长|次|[三四五六七八九十]+)子$/.test(person.title))).toBe(true);
  });
  it('does not treat an Arabic-number heir identity as a royal title', () => {
    const state = createInitialGameState();
    state.people.legacyPrince = royal('legacyPrince', 'PRINCE', '皇105子', -1);
    delete state.people.legacyPrince.birthOrder;

    const migrated = migrateGameState(state);

    expect(migrated.people.legacyPrince.royalTitle).toBeUndefined();
    expect(migrated.people.legacyPrince.title).not.toBe('皇105子');
  });
  it('preserves a granted title while restoring the royal birth-order identity', () => {
    const state = createInitialGameState();
    state.people.prince = royal('prince', 'PRINCE', '奉恩镇国公', 1);
    const migrated = migrateGameState(state);
    expect(migrated.people.prince).toMatchObject({ title: '皇长子', preHeirTitle: '皇长子', royalTitle: '奉恩镇国公', birthOrder: 1 });
  });

  it('gives every seeded person an ambition attribute', () => {
    const state = createInitialGameState();
    const expected: Record<string, number> = {
      emperor: 0,
      'empress-dowager': 60,
      'consort-dowager': 30,
      empress: 55,
    };
    Object.entries(expected).forEach(([id, ambition]) => {
      expect(state.people[id].stats['野心']).toBe(ambition);
    });
    Object.values(state.people).forEach((person) => {
      expect(person.stats['野心']).toBeDefined();
    });
  });

  it('fills missing ambition on legacy saves based on kind', () => {
    const legacy = createInitialGameState();
    legacy.people['empress-dowager'] = {
      ...legacy.people['empress-dowager'],
      stats: { ...legacy.people['empress-dowager'].stats },
    };
    delete (legacy.people['empress-dowager'].stats as Record<string, number>)['野心'];
    legacy.people['legacy-court-lady'] = {
      id: 'legacy-court-lady', kind: 'COURT_LADY', name: '旧宫女', sex: 'FEMALE',
      birthDate: { year: -25, month: 4, day: 1 }, age: 25, title: '女官',
      sceneId: 'kunning:主殿', status: 'NORMAL',
      assets: { avatar: 'portrait.consort', portrait: 'portrait.consort' },
      parents: [], children: [], stats: { 健康: 70 }, traits: ['勤谨'],
    };
    const migrated = migrateGameState(legacy);
    expect(migrated.people['empress-dowager'].stats['野心']).toBe(60);
    expect(migrated.people['legacy-court-lady'].stats['野心']).toBe(25);
  });

  it('repairs legacy mixed Manchu names and normalizes the used-name registry', () => {
    const legacy = createInitialGameState();
    legacy.people.empress = { ...legacy.people.empress, name: '陆赫那拉蒂蕊', sceneId: 'inner-palace', residence: '翊坤宫西侧殿' };
    legacy.usedNames.consorts = ['陆赫那拉蒂蕊'];
    legacy.palaceSelection = {
      id: 'selection-legacy', announcedOn: legacy.clock, selectionOn: legacy.clock, status: 'SCHEDULED',
      candidates: [{ id: 'candidate-legacy', name: '陆乌拉那拉海兰', birthDate: legacy.clock, age: 16, traits: [], stats: {} }],
    };

    const migrated = migrateGameState(legacy);

    expect(migrated.people.empress.name).toBe('叶赫那拉蒂蕊');
    expect(migrated.usedNames.consorts).toContain('叶赫那拉蒂蕊');
    expect(migrated.usedNames.consorts).not.toContain('陆赫那拉蒂蕊');
    expect(migrated.palaceSelection?.candidates[0].name).toBe('乌拉那拉海兰');
  });

  it('drops the deprecated private treasury from legacy saves without changing the state treasury', () => {
    const legacy = {
      ...createInitialGameState(),
      finances: {
        ...createInitialGameState().finances,
        nationalTreasury: 97_471_000,
        privateTreasury: 99_999_000,
      },
    } as unknown as ReturnType<typeof createInitialGameState>;
    const migrated = migrateGameState(legacy);
    expect(migrated.finances.nationalTreasury).toBe(97_471_000);
    expect(Object.hasOwn(migrated.finances, 'privateTreasury')).toBe(false);
  });
});
