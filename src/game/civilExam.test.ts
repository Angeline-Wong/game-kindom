import { describe, expect, it } from 'vitest';
import { advanceCivilExamAtWenhua, canStartCivilExam, civilExamQuestions, completePalaceExam, processCivilExamForDay, proclaimCivilExam, setCivilExamQuestion, startCivilExam } from './civilExam';
import type { GameState } from './gameState';
import { createInitialGameState } from './initialGameState';

function advanceToReady(state: GameState) {
  const readyOn = state.civilExam?.readyOn;
  return readyOn ? { ...state, clock: { ...state.clock, ...readyOn } } : state;
}

describe('civil examination', () => {
  it('persists the timed multi-venue examination flow and appoints new ministers', () => {
    const initial = createInitialGameState();
    const ministerCount = Object.values(initial.people).filter((person) => person.kind === 'MINISTER').length;
    let state = startCivilExam(initial, '经世策论', 'minister-001');
    expect(state.civilExam?.status).toBe('PROVINCIAL_RESULTS');
    expect(state.civilExam?.candidates).toHaveLength(12);
    expect(state.civilExam?.readyOn).not.toEqual(state.civilExam?.startedOn);
    expect(advanceCivilExamAtWenhua(state)).toBe(state);

    state = advanceCivilExamAtWenhua(advanceToReady(state));
    expect(state.civilExam?.status).toBe('METROPOLITAN_READY');
    state = advanceCivilExamAtWenhua(advanceToReady(state));
    expect(state.civilExam?.status).toBe('GRADING');
    expect(state.civilExam?.candidates.every((candidate) => candidate.metropolitanScore != null)).toBe(true);
    state = advanceCivilExamAtWenhua(advanceToReady(state));
    expect(state.civilExam?.status).toBe('WAITING_QUESTION');
    expect(state.civilExam?.topCandidateIds).toHaveLength(6);

    state = setCivilExamQuestion(advanceToReady(state), civilExamQuestions()[0]);
    expect(state.civilExam?.status).toBe('PALACE_EXAM_READY');
    state = completePalaceExam(advanceToReady(state), state.civilExam!.topCandidateIds.slice(0, 3));
    expect(state.civilExam?.status).toBe('PROCLAMATION_READY');
    state = proclaimCivilExam(advanceToReady(state));
    expect(state.civilExam?.status).toBe('APPOINTMENT_READY');
    state = advanceCivilExamAtWenhua(advanceToReady(state));
    expect(state.civilExam?.status).toBe('COMPLETED');
    expect(Object.values(state.people).filter((person) => person.kind === 'MINISTER')).toHaveLength(ministerCount + 12);
    expect(canStartCivilExam(state)).toBe(false);
  });

  it('issues one attendant reminder at the due date with the correct destination', () => {
    const started = startCivilExam(createInitialGameState(), '经义根基', 'minister-001');
    const before = processCivilExamForDay(started, started.clock);
    expect(before.events.some((event) => event.id.startsWith('event-civil-exam-'))).toBe(false);
    const due = started.civilExam!.readyOn!;
    const reminded = processCivilExamForDay(started, due);
    const event = reminded.events.find((item) => item.id.startsWith('event-civil-exam-'));
    expect(event).toMatchObject({ title: '内侍传言', status: 'PENDING' });
    expect(event?.choices).toContainEqual(expect.objectContaining({ id: 'go-civil-exam-wenhua', label: '前往文华殿' }));
    expect(processCivilExamForDay(reminded, due).events).toHaveLength(reminded.events.length);
  });

  it('rejects invalid stage transitions and non-minister examiners', () => {
    const initial = createInitialGameState();
    expect(startCivilExam(initial, '经义根基', 'empress')).toBe(initial);
    expect(setCivilExamQuestion(initial, civilExamQuestions()[0])).toBe(initial);
    expect(completePalaceExam(initial, ['a', 'b', 'c'])).toBe(initial);
  });
});