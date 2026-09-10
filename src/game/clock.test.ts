import { describe, expect, it } from 'vitest';
import { advanceClock, formatClockTime, formatShichen, type GameClock } from './clock';

const start: GameClock = { year: 1, month: 1, day: 1, minuteOfDay: 0 };

describe('game clock', () => {
  it('advances one day in 72 seconds at normal speed', () => {
    expect(advanceClock(start, 72_000, 1)).toEqual({ ...start, day: 2 });
  });
  it('does not advance while paused and supports four and eight times speed', () => {
    expect(advanceClock(start, 72_000, 0)).toEqual(start);
    expect(advanceClock(start, 18_000, 4).day).toBe(2);
    expect(advanceClock(start, 9_000, 8).day).toBe(2);
  });
  it('formats the twelve double-hours', () => {
    expect(formatShichen(360)).toBe('卯时');
    expect(formatShichen(1380)).toBe('子时');
  });
  it('formats a visible 24-hour clock', () => {
    expect(formatClockTime(568)).toBe('09:28');
    expect(formatClockTime(5)).toBe('00:05');
  });
  it('applies speed multipliers to visible time', () => {
    expect(advanceClock(start, 1_000, 1).minuteOfDay).toBe(20);
    expect(advanceClock(start, 1_000, 2).minuteOfDay).toBe(40);
    expect(advanceClock(start, 1_000, 4).minuteOfDay).toBe(80);
    expect(advanceClock(start, 1_000, 8).minuteOfDay).toBe(160);
  });
});
