import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { startDailyCourt } from './courtSession';

describe('court session debug', () => {
  it('creates a session from initial state', () => {
    const state = createInitialGameState();
    expect(state.courtSession).toBeNull();
    const next = startDailyCourt(state);
    expect(next.courtSession).not.toBeNull();
    expect(next.courtSession?.status).toBe('IN_PROGRESS');
    expect(next.courtSession?.agenda.length).toBeGreaterThan(0);
    expect(next.courtSession?.currentIssueId).toBeUndefined();
  });
});
