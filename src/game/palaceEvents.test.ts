import { describe, it, expect } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { phaseOneDialogues } from './palaceDialogues';
import { eligiblePalaceDialogues, instantiatePalaceScene, inferEventType, pickPalaceDialogue } from './palaceEvents';
import { recordDialogueChoice } from './palaceEffects';
describe('phase one event selection', () => {
  it('provides exactly three daily, two rivalry and two complaint samples', () => {
    expect(['DAILY', 'RIVALRY', 'COMPLAINT'].map((type) => phaseOneDialogues.filter((s) => s.eventType === type).length)).toEqual([3, 2, 2]);
  });
  it('requires a real counterpart and interpolates the same one in choices', () => {
    const state = createInitialGameState();
    expect(eligiblePalaceDialogues(state, state.people.empress)).toHaveLength(3);
    state.people.other = { ...state.people.empress, id: 'other', name: '顾清漪' };
    expect(eligiblePalaceDialogues(state, state.people.empress)).toHaveLength(7);
    const scene = instantiatePalaceScene(state, state.people.empress, phaseOneDialogues[5]);
    expect(scene.text).toContain('顾清漪');
    expect(scene.choices[0].reply).toContain('顾清漪');
    expect(scene.participants?.accusedId).toBe('other');
    expect(instantiatePalaceScene(state, state.people.empress, phaseOneDialogues[0]).participants).toEqual({ speakerId: 'empress' });
  });
  it('honors persisted cooldown and retains old low-roll story selection', () => {
    const state = createInitialGameState();
    const scene = phaseOneDialogues[0];
    const next = recordDialogueChoice(state, { sceneId: scene.id, choiceId: 'stay', interactionId: 'test', summary: '赏月', effects: [], participants: { speakerId: 'empress' } }).state;
    expect(eligiblePalaceDialogues(next, next.people.empress).some((s) => s.id === scene.id)).toBe(false);
    next.clock = { ...next.clock, day: next.clock.day + 5 };
    expect(eligiblePalaceDialogues(next, next.people.empress).some((s) => s.id === scene.id)).toBe(true);
    expect(pickPalaceDialogue(state, state.people.empress, .2)?.id).toBe('consort-daily-palace-lanterns');
    expect(inferEventType({ ...scene, eventType: undefined, tags: ['rivalry'] })).toBe('RIVALRY');
  });
});
