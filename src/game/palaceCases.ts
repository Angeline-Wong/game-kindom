import { clockDate, type GameDate, type GameState, type HistoryEntry } from './gameState';
import type { DialogueParticipants } from './palaceTypes';
import type { PalaceCase } from './palaceCaseTypes';
import { palaceCaseTemplates } from './palaceCaseTemplates';
import { applyPunishment, gameDay, type PunishmentRequest } from './palacePunishments';
import { canInvestigate, investigationCandidates, investigationDuration, investigatorKey, resolveInvestigation } from './palaceInvestigations';
import { isPersonAlive } from './person';

export const casePeople = (item: PalaceCase) => [...new Set(['emperor', item.complainantId, ...item.victimIds, ...item.accusedIds, ...(item.investigator?.personId ? [item.investigator.personId] : [])])];
function historyEntry(item: PalaceCase, date: GameDate, stage: string, summary: string): HistoryEntry {
  return { id: `${item.id}-${stage}-${gameDay(date)}`, date: { ...date }, type: `PALACE_CASE_${stage}`, summary, personIds: casePeople(item), palaceCaseId: item.id };
}
export interface CreatePalaceCaseInput { id: string; templateId: string; relatedDialogueId: string; sourceInteractionId: string; participants: DialogueParticipants; truthRoll: number }
export function createPalaceCase(state: GameState, input: CreatePalaceCaseInput): { state: GameState; caseId?: string; error?: string } {
  const cases = state.palaceCases ?? [];
  const existing = cases.find((item) => item.id === input.id || item.sourceInteractionId === input.sourceInteractionId
    || (item.templateId === input.templateId && item.complainantId === input.participants.speakerId && item.status !== 'CLOSED'));
  if (existing) return { state, caseId: existing.id };
  const template = palaceCaseTemplates.find((t) => t.id === input.templateId);
  const speaker = state.people[input.participants.speakerId];
  if (!template || !isPersonAlive(speaker) || speaker.kind !== 'CONSORT') return { state, error: '当前无法为此事立案。' };
  const accused = input.participants.accusedId && state.people[input.participants.accusedId];
  const accusedIds = accused && isPersonAlive(accused) && accused.id !== speaker.id ? [accused.id] : [];
  const victim = input.participants.victimId && state.people[input.participants.victimId];
  const victimIds = [victim && isPersonAlive(victim) ? victim.id : speaker.id];
  const total = template.possibleTruths.reduce((sum, possibility) => sum + possibility.weight, 0);
  let cursor = Math.max(0, Math.min(.999999, input.truthRoll)) * total;
  let type = template.possibleTruths.find((possibility) => (cursor -= possibility.weight) < 0)?.type ?? 'UNKNOWN';
  if (!accusedIds.length && (type === 'TRUE' || type === 'PARTIAL')) type = 'ACCIDENT';
  const date = clockDate(state.clock);
  const item: PalaceCase = {
    id: input.id, templateId: template.id, title: `${speaker.name}膳食异常案`, description: template.description,
    severity: template.severity, status: 'PENDING', createdDate: date, createdDay: gameDay(date),
    complainantId: speaker.id, accusedIds, victimIds, relatedDialogueId: input.relatedDialogueId, sourceInteractionId: input.sourceInteractionId,
    truth: { type, difficulty: Math.max(0, Math.min(100, template.baseDifficulty)), culpritIds: type === 'FALSE_ACCUSATION' ? [speaker.id] : type === 'TRUE' || type === 'PARTIAL' ? [...accusedIds] : [] },
    investigationDaysRemaining: 0,
  };
  return { caseId: item.id, state: { ...state, palaceCases: [...cases, item], history: [...state.history, historyEntry(item, date, 'CREATED', `${item.title}立案，膳食异常原因待查。`)] } };
}

/** roll 在用户点击时生成并传入；不可在 React updater 或读档迁移中重新随机。 */
export function startPalaceInvestigation(state: GameState, caseId: string, candidateKey: string, rolls: { duration: number; result: number }): { state: GameState; error?: string } {
  const item = (state.palaceCases ?? []).find((c) => c.id === caseId);
  if (!item || item.status !== 'PENDING') return { state, error: '此案当前不能重新指派调查。' };
  const template = palaceCaseTemplates.find((t) => t.id === item.templateId);
  const investigator = investigationCandidates(state, item).find((candidate) => investigatorKey(candidate) === candidateKey);
  if (!template || !investigator) return { state, error: '该调查人当前无法承办此案，请重新选择。' };
  const days = investigationDuration(template, investigator, rolls.duration);
  const date = clockDate(state.clock);
  const updated: PalaceCase = { ...item, status: 'INVESTIGATING', investigator, investigationDaysRemaining: days, investigationTotalDays: days,
    investigationStartedDay: gameDay(date), lastProcessedDay: gameDay(date), investigationRoll: Math.max(0, Math.min(.999999, rolls.result)) };
  return { state: { ...state, palaceCases: state.palaceCases.map((c) => c.id === caseId ? updated : c), history: [...state.history, historyEntry(updated, date, 'STARTED', `${investigator.name}奉命调查${item.title}，预计${days}日呈报。`)] } };
}

export function processPalaceCases(state: GameState, date: GameDate): GameState {
  let next = state;
  for (const item of state.palaceCases ?? []) {
    if (item.status !== 'INVESTIGATING') continue;
    const lastDay = item.lastProcessedDay ?? item.investigationStartedDay ?? item.createdDay;
    const elapsed = gameDay(date) - lastDay;
    if (elapsed <= 0) continue;
    if (item.investigator?.personId && !canInvestigate(next.people[item.investigator.personId], item, date)) {
      const pending: PalaceCase = { ...item, status: 'PENDING', investigator: undefined, investigationDaysRemaining: 0 };
      next = { ...next, palaceCases: next.palaceCases.map((c) => c.id === item.id ? pending : c),
        history: [...next.history, historyEntry(item, date, 'INTERRUPTED', `${item.title}的调查人已无法继续承办，请重新指派；案件尚未结案。`)] };
      continue;
    }
    const remaining = Math.max(0, item.investigationDaysRemaining - elapsed);
    let updated: PalaceCase = { ...item, investigationDaysRemaining: remaining, lastProcessedDay: gameDay(date) };
    if (remaining === 0) {
      const result = resolveInvestigation(item);
      updated = { ...updated, status: 'WAITING_DECISION', result, completedDate: { ...date } };
      next = { ...next, history: [...next.history, historyEntry(updated, date, 'COMPLETED', `${item.investigator?.name ?? '调查人'}呈报${item.title}：${result.summary} 此案待陛下裁决。`)],
        events: [...next.events, { id: `notice-${item.id}`, type: 'SYSTEM_NOTICE', priority: 65, createdOn: { ...date }, personIds: casePeople(updated), palaceCaseId: item.id,
          title: `${item.investigator?.name ?? '调查人'}呈报`, body: `${item.title}已有调查结果，请陛下裁决。`, choices: [{ id: 'view-palace-case', label: '查看调查结果', result: '已呈上案件卷宗。' }], defaultChoiceId: 'view-palace-case', status: 'PENDING' }],
      };
    }
    next = { ...next, palaceCases: next.palaceCases.map((c) => c.id === item.id ? updated : c) };
  }
  return next;
}

/** 明确构造玩家视图；内部 truth、随机数不传入案件面板。 */
export function palaceCaseView(item: PalaceCase) {
  return { id: item.id, title: item.title, description: item.description, severity: item.severity, status: item.status, createdDate: item.createdDate,
    complainantId: item.complainantId, victimIds: item.victimIds, accusedIds: item.accusedIds, investigator: item.investigator,
    result: item.result, investigationDaysRemaining: item.investigationDaysRemaining, investigationTotalDays: item.investigationTotalDays,
    completedDate: item.completedDate, ruling: item.ruling };
}

export function casePunishmentTargets(state: GameState, item: PalaceCase) {
  // 只依据公开结果与原指控，不读取 truth；诬告结论允许处置原告。
  const ids = [...new Set([...(item.result?.suspectedIds ?? []), ...item.accusedIds])];
  return ids.map((id) => state.people[id]).filter((p) => isPersonAlive(p) && p.kind === 'CONSORT' && !['COLD_PALACE', 'PRISON'].includes(p.status));
}
function closeCase(state: GameState, item: PalaceCase, ruling: NonNullable<PalaceCase['ruling']>): GameState {
  const updated: PalaceCase = { ...item, status: 'CLOSED', ruling };
  return { ...state, palaceCases: state.palaceCases.map((c) => c.id === item.id ? updated : c),
    events: state.events.map((event) => event.palaceCaseId === item.id && event.status === 'PENDING' ? { ...event, status: 'RESOLVED', result: '此案已裁决结案。' } : event),
    history: [...state.history, historyEntry(updated, ruling.date, 'CLOSED', `${item.title}奉旨${ruling.type === 'PUNISH' ? '处置相关人物后结案' : '不予追究，结案'}。`)] };
}
export function closePalaceCaseWithoutPunishment(state: GameState, caseId: string): GameState {
  const item = (state.palaceCases ?? []).find((c) => c.id === caseId);
  if (!item || item.status !== 'WAITING_DECISION') return state;
  return closeCase(state, item, { type: 'NO_ACTION', date: clockDate(state.clock), targetIds: [] });
}
export function punishAndClosePalaceCase(state: GameState, caseId: string, request: PunishmentRequest, definitionId: string): ReturnType<typeof applyPunishment> {
  const item = (state.palaceCases ?? []).find((c) => c.id === caseId);
  if (!item || item.status !== 'WAITING_DECISION' || !casePunishmentTargets(state, item).some((p) => p.id === request.targetId)) return { state, feedback: [], error: '此案或处罚对象已发生变化，请返回卷宗重新确认。' };
  const result = applyPunishment(state, { ...request, id: `case-punishment-${item.id}`, sourceCaseId: item.id, sourceEventId: item.relatedDialogueId, reason: item.title, severity: item.severity }, definitionId);
  if (result.error) return result;
  return { ...result, state: closeCase(result.state, item, { type: 'PUNISH', date: clockDate(state.clock), targetIds: [request.targetId], punishmentHistoryId: `case-punishment-${item.id}` }) };
}
