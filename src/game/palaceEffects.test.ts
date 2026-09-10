import { describe, it, expect } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { applyDialogueEffects, recordDialogueChoice } from './palaceEffects';
describe('palace effects and migration', () => {
  it('fills missing consort values without duplicating jealousy or changing legacy confinement', () => {
    const state = createInitialGameState();
    state.people.empress.stats = { 宠爱: 76, 心情: 39 };
    state.people.empress.status = 'CONFINED';
    const migrated = migrateGameState(state);
    expect(migrated.people.empress.stats).toMatchObject({ 宠爱: 76, 心情: 39, 怨恨: 0, 畏惧: 0, 威望: 0 });
    expect(migrated.people.empress.stats.嫉妒).toBeUndefined();
    expect(migrated.relationships[0].jealousy).toBe(18);
    expect(migrateGameState(migrated)).toEqual(migrated);
    expect(migrated.people.empress.status).toBe('CONFINED');
  });
  it('clamps signed effects and changes the existing jealousy source', () => {
    const state = createInitialGameState();
    const result = applyDialogueEffects(state, [{ type: 'FAVOR', target: 'SPEAKER', value: 50 }, { type: 'MOOD', target: 'SPEAKER', value: -100 }, { type: 'JEALOUSY', target: 'SPEAKER', value: -7 }], { speakerId: 'empress' });
    expect(result.state.people.empress.stats).toMatchObject({ 宠爱: 100, 心情: 0 });
    expect(result.state.relationships[0].jealousy).toBe(11);
    expect(result.feedback.map((f) => f.value)).toEqual([24, -70, -7]);
    expect(state.people.empress.stats.宠爱).toBe(76);
  });
  it('stores a negative relationship once regardless of pair direction', () => {
    const state = createInitialGameState();
    state.people.other = { ...state.people.empress, id: 'other', name: '另一位妃嫔' };
    const effect = { type: 'RELATIONSHIP', target: 'SPEAKER', otherTarget: 'ACCUSED', value: -70 } as const;
    const first = applyDialogueEffects(state, [effect], { speakerId: 'empress', accusedId: 'other' }).state;
    const second = applyDialogueEffects(first, [effect], { speakerId: 'other', accusedId: 'empress' }).state;
    expect(second.relationships.at(-1)?.affinity).toBe(-100);
    expect(second.relationships.length).toBe(first.relationships.length);
  });
  it('commits a selection once and ignores missing targets', () => {
    const state = createInitialGameState();
    const input = { interactionId: 'one', sceneId: 'tea', choiceId: 'drink', summary: '陪伴饮茶', effects: [{ type: 'FAVOR', target: 'SPEAKER', value: 2 } as const], participants: { speakerId: 'empress' } };
    const first = recordDialogueChoice(state, input).state;
    expect(recordDialogueChoice(first, input).state).toBe(first);
    expect(first.history.at(-1)?.effects?.[0].value).toBe(2);
    expect(applyDialogueEffects(state, [{ type: 'MOOD', target: 'ACCUSED', value: 3 }], input.participants).state).toBe(state);
  });
});
