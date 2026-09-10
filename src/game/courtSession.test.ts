import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { courtDecisionOptions, endDailyCourt, handleCourtAction, handleCourtDecision, resumeDailyCourt, selectCourtDepartment, startDailyCourt } from './courtSession';

describe('daily court session', () => {
  it('opens one persistent daily session with attendance and ordered agenda', () => {
    const initial = createInitialGameState();
    const opened = startDailyCourt(initial);
    expect(opened.courtSession?.status).toBe('IN_PROGRESS');
    expect(opened.courtSession?.agenda).toHaveLength(6);
    expect(new Set(opened.courtSession?.agenda.map((issue) => issue.department))).toEqual(new Set(['吏部', '户部', '礼部', '兵部', '刑部', '工部']));
    expect(opened.courtSession?.agenda.filter((issue) => issue.category === 'MAJOR')).toHaveLength(1);
    expect(opened.courtSession?.attendance.length).toBeGreaterThan(5);
    expect(startDailyCourt(opened)).toBe(opened);
  });

  it('opens the pending issue for the selected department', () => {
    const opened = selectCourtDepartment(startDailyCourt(createInitialGameState()), '户部');
    const selected = selectCourtDepartment(opened, '刑部');
    const current = selected.courtSession?.agenda.find((issue) => issue.id === selected.courtSession?.currentIssueId);
    expect(current?.department).toBe('刑部');
    expect(current?.status).toBe('DEBATING');
  });
  it('persists questioning and advances time without mutating the former session', () => {
    const opened = selectCourtDepartment(startDailyCourt(createInitialGameState()), '户部');
    const originalSession = opened.courtSession;
    const issueIndex = opened.courtSession!.agenda.findIndex((issue) => issue.id === opened.courtSession!.currentIssueId);
    const questioned = handleCourtAction(opened, { type: 'QUESTION' });
    expect(questioned.clock.minuteOfDay).toBe(opened.clock.minuteOfDay + 15);
    expect(questioned.courtSession?.agenda[issueIndex].revealed).toHaveLength(1);
    expect(originalSession?.agenda[issueIndex].revealed).toHaveLength(0);
    const ruled = handleCourtAction(questioned, { type: 'RULE', ruling: '准行赈济，并遣御史核账。' });
    expect(ruled.courtSession?.agenda[issueIndex].status).toBe('RESOLVED');
    expect(ruled.courtSession?.currentIssueId).toBeUndefined();
    expect(questioned.courtSession?.agenda.find((_, index) => index !== issueIndex)?.status).toBe('PENDING');
    expect(ruled.history.some((entry) => entry.type === 'COURT_RULING')).toBe(true);
  });

  it('carries deferred issues into the following day', () => {
    const opened = selectCourtDepartment(startDailyCourt(createInitialGameState()), '户部');
    const deferred = handleCourtAction(opened, { type: 'DEFER' });
    const closed = endDailyCourt(deferred);
    const tomorrow = { ...closed, clock: { ...closed.clock, day: closed.clock.day + 1 } };
    const resumed = startDailyCourt(tomorrow);
    expect(resumed.courtSession?.agenda[0].title).toBe(opened.courtSession?.agenda[0].title);
    expect(resumed.courtSession?.agenda[0].status).toBe('PENDING');
    expect(resumed.courtSession?.agenda[0].speeches.at(-1)).toContain('继续廷议');
  });

  it('can resume deferred issues after retiring on the same day', () => {
    const opened = startDailyCourt(createInitialGameState());
    const closed = endDailyCourt(opened);
    const resumed = resumeDailyCourt(closed);
    expect(resumed.courtSession?.status).toBe('IN_PROGRESS');
    expect(resumed.courtSession?.currentIssueId).toBeUndefined();
    expect(resumed.courtSession?.agenda.every((issue) => issue.status === 'PENDING')).toBe(true);
  });

  it('applies the selected department decision and records its effects', () => {
    const opened = selectCourtDepartment(startDailyCourt(createInitialGameState()), '吏部');
    const issue = opened.courtSession?.agenda.find((item) => item.id === opened.courtSession?.currentIssueId);
    expect(issue).toBeDefined();
    const option = courtDecisionOptions(issue!)[0];
    const beforePolitics = opened.people.emperor.stats['政治'] ?? 0;
    const decided = handleCourtDecision(opened, option);

    expect(decided.people.emperor.stats['政治']).toBe(beforePolitics + (option.effects['政治'] ?? 0));
    expect(decided.courtSession?.lastResolution?.optionId).toBe(option.id);
    expect(decided.courtSession?.lastResolution?.result).toBe(option.result);
    expect(decided.history.some((entry) => entry.type === 'COURT_DECISION' && entry.summary.includes(option.result))).toBe(true);
  });
});
