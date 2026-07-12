import { describe, expect, it } from 'vitest';
import { scheduleConsortVisit } from './consortEvents';

describe('consort events', () => {
  it('distinguishes direct palace visits from flip-card visits', () => {
    expect(scheduleConsortVisit({ source: 'PALACE', consortId: 'consort-001' }).requiresFlipCard).toBe(false);
    expect(scheduleConsortVisit({ source: 'JINGSHIFANG', consortId: 'consort-001' }).requiresFlipCard).toBe(true);
  });
});
