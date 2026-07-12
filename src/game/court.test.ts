import { describe, expect, it } from 'vitest';
import { applyCourtAction, demoCourtIssue } from './court';

describe('court debate', () => {
  it('reveals source context when the emperor questions the report', () => {
    expect(applyCourtAction(demoCourtIssue, { type: 'question' }).revealed.some((item) => item.includes('驿报'))).toBe(true);
  });
  it('records a named official response', () => {
    expect(applyCourtAction(demoCourtIssue, { type: 'ask', official: '沈砚之' }).history.at(-1)).toContain('沈砚之');
  });
  it('defers an issue to the next day', () => {
    expect(applyCourtAction(demoCourtIssue, { type: 'defer' }).status).toBe('deferred');
  });
  it('rage raises fear but lowers candor', () => {
    const next = applyCourtAction(demoCourtIssue, { type: 'rage' });
    expect(next.fear).toBeGreaterThan(demoCourtIssue.fear);
    expect(next.candor).toBeLessThan(demoCourtIssue.candor);
  });
});
