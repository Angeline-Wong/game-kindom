export type TimeSpeed = 0 | 1 | 2 | 4 | 8;
export interface GameClock { year: number; month: number; day: number; minuteOfDay: number }

export function advanceClock(clock: GameClock, realMs: number, speed: TimeSpeed): GameClock {
  if (speed === 0) return clock;
  const gameMinutes = Math.floor(realMs * speed / 50);
  let total = clock.minuteOfDay + gameMinutes;
  let { year, month, day } = clock;
  while (total >= 1440) {
    total -= 1440;
    day += 1;
    const days = month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
    if (day > days) { day = 1; month += 1; }
    if (month > 12) { month = 1; year += 1; }
  }
  return { year, month, day, minuteOfDay: total };
}

const shichen = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export function formatShichen(minute: number) {
  const index = Math.floor(((minute + 60) % 1440) / 120);
  return `${shichen[index]}时`;
}

export function formatClockTime(minute: number) {
  const normalized = ((Math.floor(minute) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minutePart = (normalized % 60).toString().padStart(2, '0');
  return `${hour}:${minutePart}`;
}
