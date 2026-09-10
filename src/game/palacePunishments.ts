import { isPersonAlive } from './person';
import { clockDate, personLifeStatusLabel, type GameDate, type GameState, type PersonRecord } from './gameState';
import { applyDialogueEffects } from './palaceEffects';
import type { DialogueEffect, EventSeverity, PunishmentType } from './palaceTypes';

export function gameDay(date: GameDate) {
  const preceding = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return date.year * 365 + preceding[date.month - 1] + date.day - 1;
}
export function isGrounded(person: PersonRecord, date: GameDate) {
  return person.status === 'CONFINED' || (person.groundingUntilDay !== undefined && person.groundingUntilDay > gameDay(date));
}
export function consortVisitEligibility(person: PersonRecord | undefined, date: GameDate): { allowed: boolean; reason?: string } {
  if (!person || person.kind !== 'CONSORT') return { allowed: false, reason: '该人物不能侍寝。' };
  if (!isPersonAlive(person)) return { allowed: false, reason: '该妃嫔已经薨逝，不能临幸。' };
  if (person.status === 'COLD_PALACE' || person.status === 'PRISON') return { allowed: false, reason: `该妃嫔当前${personLifeStatusLabel(person.status)}，不能临幸。` };
  if (person.illness || (person.stats['健康'] ?? 100) < 50) return { allowed: false, reason: '该妃嫔正在抱病休养，不能临幸。' };
  if (isGrounded(person, date)) return { allowed: false, reason: '该妃嫔正在禁足中。' };
  if (person.status !== 'NORMAL') return { allowed: false, reason: `该妃嫔当前${personLifeStatusLabel(person.status)}，不能临幸。` };
  return { allowed: true };
}
export interface PunishmentDefinition { id: string; type: PunishmentType; name: string; effects: DialogueEffect[]; days?: number; months?: number }
const effect = (type: DialogueEffect['type'], value: number): DialogueEffect => ({ type, value, target: 'SPEAKER' });
export const punishmentDefinitions: PunishmentDefinition[] = [
  { id: 'warning', type: 'WARNING', name: '训诫', effects: [effect('FAVOR', -2), effect('FEAR', 2), effect('RESENTMENT', 1)] },
  { id: 'fine-1', type: 'FINE', name: '罚俸一月', months: 1, effects: [effect('FAVOR', -3), effect('PRESTIGE', -1), effect('FEAR', 3), effect('RESENTMENT', 2)] },
  { id: 'fine-3', type: 'FINE', name: '罚俸三月', months: 3, effects: [effect('FAVOR', -4), effect('PRESTIGE', -2), effect('FEAR', 4), effect('RESENTMENT', 3)] },
  { id: 'fine-12', type: 'FINE', name: '罚俸一年', months: 12, effects: [effect('FAVOR', -5), effect('PRESTIGE', -3), effect('FEAR', 5), effect('RESENTMENT', 6)] },
  ...[3, 7, 30].map((days): PunishmentDefinition => ({ id: `grounding-${days}`, type: 'GROUNDING', name: `禁足${days}日`, days, effects: [effect('FAVOR', -5), effect('PRESTIGE', -2), effect('FEAR', 5), effect('RESENTMENT', 4)] })),
];
export interface PunishmentRequest { id: string; targetId: string; reason: string; severity: EventSeverity; sourceEventId?: string; sourceCaseId?: string }
export function applyPunishment(state: GameState, request: PunishmentRequest, definitionId: string) {
  const person = state.people[request.targetId];
  const definition = punishmentDefinitions.find((d) => d.id === definitionId);
  if (!definition || !isPersonAlive(person) || person.kind !== 'CONSORT' || ['DEAD', 'COLD_PALACE', 'PRISON'].includes(person.status)) return { state, feedback: [], error: '该人物当前不能接受此项处置。' };
  if (state.history.some((h) => h.id === request.id)) return { state, feedback: [], error: '此项处置已经执行。' };
  const result = applyDialogueEffects(state, definition.effects, { speakerId: person.id });
  const changed = result.state.people[person.id];
  const date = clockDate(state.clock);
  const nextPerson = { ...changed,
    ...(definition.days ? { groundingUntilDay: Math.max(gameDay(date), changed.groundingUntilDay ?? 0) + definition.days } : {}),
    ...(definition.months ? { fineMonthsRemaining: (changed.fineMonthsRemaining ?? 0) + definition.months } : {}),
  };
  return { feedback: result.feedback, state: { ...result.state,
    people: { ...result.state.people, [person.id]: nextPerson },
    visits: definition.days ? result.state.visits.map((visit) => visit.consortId === person.id && visit.status === 'PENDING' ? { ...visit, status: 'CANCELLED' as const } : visit) : result.state.visits,
    history: [...result.state.history, { id: request.id, date, type: 'PALACE_PUNISHMENT',
      summary: `${person.name}因${request.reason}，受处置：${definition.name}。${definition.days ? '禁足期间不可临幸，未结算侍寝已取消。' : ''}`,
      personIds: [person.id, 'emperor'], effects: result.feedback, palaceCaseId: request.sourceCaseId,
      punishment: { type: definition.type, targetId: person.id, reason: request.reason, severity: request.severity, sourceEventId: request.sourceEventId, sourceCaseId: request.sourceCaseId, days: definition.days, months: definition.months },
    }],
  } };
}
/** 定期禁足是附加限制，到期仅清除此限制；不改变孕期、休养或旧式无限期禁足。 */
export function expireGrounding(state: GameState, date: GameDate): GameState {
  let people = state.people;
  for (const person of Object.values(state.people)) {
    if (!isPersonAlive(person)) continue;
    if (person.groundingUntilDay !== undefined && person.groundingUntilDay <= gameDay(date)) {
      if (people === state.people) people = { ...people };
      people[person.id] = { ...person, groundingUntilDay: undefined };
    }
  }
  return people === state.people ? state : { ...state, people };
}
