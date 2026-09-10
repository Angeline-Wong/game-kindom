import type { GameDate, GameState, PersonRecord } from './gameState';
import { clampHealth, isPersonAlive, killPerson } from './person';

export const HEALTH_RULES = {
  healthy: 80, sick: 50, serious: 30, critical: 10,
  illnessChance: [ { min: 80, chance: .0005 }, { min: 60, chance: .002 }, { min: 40, chance: .01 }, { min: 20, chance: .03 }, { min: 0, chance: .08 } ],
  onsetDamage: 8, illnessDamage: 4, recoveryChance: .6, recoveryGain: 6,
  seriousDeathChance: .002, criticalDeathChance: .02,
} as const;

export function getHealthStatus(person: PersonRecord) {
  if (!isPersonAlive(person)) return '已故';
  const health = clampHealth(person.stats['健康']);
  if (health < HEALTH_RULES.critical) return '病危';
  if (health < HEALTH_RULES.serious) return '重病';
  if (person.illness || person.status === 'SICK' || health < HEALTH_RULES.sick) return '生病';
  return health < HEALTH_RULES.healthy ? '虚弱' : '健康';
}

/** Stable by person, day and purpose; reloading or chunking time cannot reroll health. */
function dailyRoll(id: string, date: GameDate, purpose: string) {
  let hash = 2166136261;
  for (const char of `${id}:${date.year}:${date.month}:${date.day}:${purpose}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967296;
}

export function processHealth(state: GameState, date: GameDate, random?: () => number): GameState {
  let next = state;
  for (const person of Object.values(state.people)) {
    if (!isPersonAlive(person) || !['CONSORT', 'PRINCE', 'PRINCESS'].includes(person.kind)) continue;
    let health = clampHealth(person.stats['健康']);
    if (health === 0) { next = killPerson(next, person.id, '疾病或健康恶化', date); continue; }
    const roll = (purpose: string) => random ? random() : dailyRoll(person.id, date, purpose);
    const before = health;
    let illness = person.illness;
    let summary = '';
    if (illness || person.status === 'SICK' || health < HEALTH_RULES.sick) {
      illness ??= { name: '风寒', severity: 1, startedAt: date };
      const recovering = roll('recovery') < HEALTH_RULES.recoveryChance;
      health = clampHealth(health + (recovering ? HEALTH_RULES.recoveryGain : -HEALTH_RULES.illnessDamage));
      summary = recovering ? '身体逐渐康复' : '病情加重';
      if (health >= HEALTH_RULES.healthy) illness = undefined;
    } else if (roll('onset') < HEALTH_RULES.illnessChance.find(band => health >= band.min)!.chance) {
      illness = { name: '风寒', severity: 1, startedAt: date };
      health = clampHealth(health - HEALTH_RULES.onsetDamage);
      summary = '偶感风寒';
    }
    if (illness) illness = { ...illness, severity: health < HEALTH_RULES.critical ? 3 : health < HEALTH_RULES.serious ? 2 : 1 };
    // Pregnancy, custody and postpartum rest remain independent of illness.
    const status = person.status === 'SICK' && !illness ? 'NORMAL' : person.status;
    next = { ...next, people: { ...next.people, [person.id]: { ...person, status, illness, stats: { ...person.stats, 健康: health } } } };
    if (summary) next = { ...next, history: [...next.history, { id: `health-${person.id}-${date.year}-${date.month}-${date.day}`, date, type: 'HEALTH', summary: `【健康】${person.name}${summary}，健康 ${health - before >= 0 ? '+' : ''}${health - before}`, personIds: [person.id, 'emperor'], effects: [{ label: '健康', value: health - before }] }] };
    const deathChance = health < HEALTH_RULES.critical ? HEALTH_RULES.criticalDeathChance : health < HEALTH_RULES.serious ? HEALTH_RULES.seriousDeathChance : 0;
    if (health === 0 || roll('death') < deathChance) next = killPerson(next, person.id, '疾病或健康恶化', date);
  }
  return next;
}
