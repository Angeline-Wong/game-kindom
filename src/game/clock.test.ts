import { describe, expect, it } from 'vitest';
import { advanceClock, formatShichen, type GameClock } from './clock';

const start: GameClock = { year: 1, month: 1, day: 1, minuteOfDay: 0 };

describe('game clock', () => {
  it('advances one day in 72 seconds at normal speed', () => {
    expect(advanceClock(start, 72_000, 1)).toEqual({ ...start, day: 2 });
  });
  it('does not advance while paused and runs four times faster at 4x', () => {
    expect(advanceClock(start, 72_000, 0)).toEqual(start);
    expect(advanceClock(start, 18_000, 4).day).toBe(2);
  });
  it('formats the twelve double-hours', () => {
    expect(formatShichen(360)).toBe('卯时');
    expect(formatShichen(1380)).toBe('子时');
  });
});
