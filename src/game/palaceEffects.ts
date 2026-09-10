import { isPersonAlive } from './person';
import { clockDate, type GameState, type HistoryEffect, type PersonRecord, type RelationshipRecord } from './gameState';
import type { DialogueEffect, DialogueParticipants, EffectTarget } from './palaceTypes';

export const clampPalaceValue = (value: number, min = 0) => Math.max(min, Math.min(100, Number.isFinite(value) ? value : min));
const defaults = { 宠爱: 0, 心情: 70, 威望: 0, 怨恨: 0, 畏惧: 0 };
export function normalizePalacePerson(person: PersonRecord): PersonRecord {
  if (person.kind !== 'CONSORT') return person;
  const stats = { ...person.stats };
  for (const [key, fallback] of Object.entries(defaults)) stats[key] = clampPalaceValue(stats[key] ?? fallback);
  return { ...person, stats, fineMonthsRemaining: Math.max(0, Math.floor(person.fineMonthsRemaining ?? 0)) };
}
export function emperorRelationship(relationships: RelationshipRecord[], personId: string) {
  return relationships.find((r) => (r.personAId === 'emperor' && r.personBId === personId) || (r.personBId === 'emperor' && r.personAId === personId));
}
export function normalizePalaceRelationships(people: GameState['people'], relationships: RelationshipRecord[]) {
  const result = relationships.map((r) => ({ ...r }));
  for (const person of Object.values(people).filter((p) => p.kind === 'CONSORT')) {
    const relation = emperorRelationship(result, person.id);
    if (relation) relation.jealousy = clampPalaceValue(relation.jealousy ?? 0);
    else result.push({ id: `rel-emperor-${person.id}`, personAId: 'emperor', personBId: person.id, kind: 'SPOUSE', labelA: '妃嫔', labelB: '夫君', affinity: 0, trust: 0, jealousy: 0 });
  }
  return result;
}
export function resolveEffectTarget(target: EffectTarget | undefined, context: DialogueParticipants, custom?: string) {
  return target === 'CUSTOM' ? custom : target === 'ACCUSED' ? context.accusedId : target === 'VICTIM' ? context.victimId : context.speakerId;
}
export function palaceJealousy(state: Pick<GameState, 'relationships'>, personId: string) {
  return emperorRelationship(state.relationships, personId)?.jealousy ?? 0;
}
const statKeys = { FAVOR: '宠爱', MOOD: '心情', PRESTIGE: '威望', RESENTMENT: '怨恨', FEAR: '畏惧' } as const;

/** 返回实际变化量；纯函数可安全用于 React state updater。 */
export function applyDialogueEffects(state: GameState, effects: DialogueEffect[], context: DialogueParticipants) {
  let next = state;
  const feedback: HistoryEffect[] = [];
  for (const effect of effects) {
    if (!Number.isFinite(effect.value)) continue;
    const targetId = resolveEffectTarget(effect.target, context, effect.targetId);
    const person = targetId ? next.people[targetId] : undefined;
    if (!person || !isPersonAlive(person)) continue;
    if (effect.type === 'RELATIONSHIP') {
      const otherId = effect.otherTarget && resolveEffectTarget(effect.otherTarget, context, effect.otherTargetId);
      if (!otherId || otherId === person.id || !next.people[otherId] || !isPersonAlive(next.people[otherId])) continue;
      const existing = next.relationships.find((r) => (r.personAId === person.id && r.personBId === otherId) || (r.personBId === person.id && r.personAId === otherId));
      const before = existing?.affinity ?? 0;
      const after = clampPalaceValue(before + effect.value, -100);
      const pair = [person.id, otherId].sort();
      const relation: RelationshipRecord = existing ? { ...existing, affinity: after } : { id: `rel-palace-${pair.join('-')}`, personAId: pair[0], personBId: pair[1], kind: after < 0 ? 'RIVAL' : 'ALLY', labelA: '宫中往来', labelB: '宫中往来', affinity: after, trust: 0 };
      next = { ...next, relationships: existing ? next.relationships.map((r) => r === existing ? relation : r) : [...next.relationships, relation] };
      feedback.push({ label: `${person.name}与${next.people[otherId].name}关系`, value: after - before });
    } else if (person.kind === 'CONSORT' && effect.type === 'JEALOUSY') {
      const relationships = normalizePalaceRelationships(next.people, next.relationships);
      const relation = emperorRelationship(relationships, person.id)!;
      const before = relation.jealousy ?? 0;
      relation.jealousy = clampPalaceValue(before + effect.value);
      next = { ...next, relationships };
      feedback.push({ label: `${person.name}·嫉妒`, value: relation.jealousy - before });
    } else if (person.kind === 'CONSORT' && effect.type !== 'JEALOUSY') {
      const key = statKeys[effect.type];
      const normalized = normalizePalacePerson(person);
      const before = normalized.stats[key];
      const after = clampPalaceValue(before + effect.value);
      next = { ...next, people: { ...next.people, [person.id]: { ...normalized, stats: { ...normalized.stats, [key]: after } } } };
      feedback.push({ label: `${person.name}·${key}`, value: after - before });
    }
  }
  return { state: next, feedback };
}

export function recordDialogueChoice(state: GameState, input: { interactionId: string; sceneId: string; choiceId: string; summary: string; effects: DialogueEffect[]; participants: DialogueParticipants }) {
  if (state.history.some((h) => h.dialogue?.interactionId === input.interactionId && h.dialogue.choiceId === input.choiceId)) return { state, feedback: [] as HistoryEffect[] };
  const result = applyDialogueEffects(state, input.effects, input.participants);
  return { ...result, state: { ...result.state, history: [...result.state.history, { id: `history-${input.interactionId}-${input.choiceId}`, date: clockDate(state.clock), type: 'PALACE_DIALOGUE', summary: input.summary, personIds: [...new Set(['emperor', ...Object.values(input.participants).filter((id): id is string => Boolean(id))])], effects: result.feedback, dialogue: { sceneId: input.sceneId, choiceId: input.choiceId, interactionId: input.interactionId } }] } };
}
