import { isPersonAlive } from './person';
import { availableDialoguesFor, pickDialogueForPerson, type DialogueScene } from './dialogueLibrary';
import { phaseOneDialogues } from './palaceDialogues';
import { palaceCaseDialogue } from './palaceCaseTemplates';
import type { GameState, PersonRecord } from './gameState';
import type { DialogueParticipants, PalaceEventType } from './palaceTypes';
import { palaceJealousy } from './palaceEffects';
import { gameDay } from './palacePunishments';

export function inferEventType(scene: DialogueScene): PalaceEventType {
  if (scene.eventType) return scene.eventType;
  if (scene.tags?.includes('palaceStrife')) return 'VIOLATION';
  if (scene.tags?.includes('rivalry')) return 'RIVALRY';
  if (scene.tags?.includes('relationship')) return 'EMOTION';
  return 'DAILY';
}
export function renderDialogueTemplate(text: string, context: DialogueParticipants, state: GameState) {
  const name = (id?: string) => id ? state.people[id]?.name ?? '宫中人物' : '宫中人物';
  const speaker = state.people[context.speakerId];
  return text.replaceAll('{{speaker}}', name(context.speakerId)).replaceAll('{{accused}}', name(context.accusedId))
    .replaceAll('{{victim}}', name(context.victimId)).replaceAll('{name}', name(context.speakerId)).replaceAll('{title}', speaker?.rank ?? speaker?.title ?? '');
}
export function selectPalaceCounterpart(state: GameState, speakerId: string) {
  return Object.values(state.people).filter((p) => isPersonAlive(p) && p.kind === 'CONSORT' && p.id !== speakerId && !['DEAD', 'COLD_PALACE', 'PRISON', 'OUTSIDE'].includes(p.status))
    .sort((a, b) => {
      const score = (p: PersonRecord) => {
        const relation = state.relationships.find((r) => (r.personAId === speakerId && r.personBId === p.id) || (r.personBId === speakerId && r.personAId === p.id));
        return (p.stats.宠爱 ?? 0) - (relation?.affinity ?? 0);
      };
      return score(b) - score(a) || a.id.localeCompare(b.id);
    })[0];
}
export function eligiblePalaceDialogues(state: GameState, person: PersonRecord, scenes = phaseOneDialogues) {
  const counterpart = selectPalaceCounterpart(state, person.id);
  return scenes.filter((scene) => {
    if (person.kind !== scene.kind || !isPersonAlive(person)) return false;
    if (['RIVALRY', 'COMPLAINT', 'CASE'].includes(inferEventType(scene)) && !counterpart) return false;
    if (scene.eventType === 'CASE' && state.palaceCases.some((c) => c.relatedDialogueId === scene.id && c.complainantId === person.id && c.status !== 'CLOSED')) return false;
    const trigger = scene.trigger;
    if ((person.stats.宠爱 ?? 0) < (trigger?.minFavor ?? 0) || (person.stats.宠爱 ?? 0) > (trigger?.maxFavor ?? 100)) return false;
    if (palaceJealousy(state, person.id) < (trigger?.minJealousy ?? 0) || (person.stats.怨恨 ?? 0) < (trigger?.minResentment ?? 0)) return false;
    const last = state.history.filter((h) => h.dialogue?.sceneId === scene.id && h.personIds.includes(person.id)).at(-1);
    return !last || gameDay(state.clock) - gameDay(last.date) >= (scene.cooldownDays ?? 0);
  });
}
export function instantiatePalaceScene(state: GameState, person: PersonRecord, scene: DialogueScene): DialogueScene {
  const counterpart = selectPalaceCounterpart(state, person.id);
  const context = scene.participants ?? { speakerId: person.id, ...(['RIVALRY', 'COMPLAINT', 'CASE'].includes(inferEventType(scene)) ? { accusedId: counterpart?.id } : {}), ...(scene.eventType === 'CASE' ? { victimId: person.id } : {}) };
  const render = (text: string) => renderDialogueTemplate(text, context, state);
  return { ...scene, participants: context, text: render(scene.text),
    choices: scene.choices.map((choice) => ({ ...choice, label: render(choice.label), reply: render(choice.reply) })),
    followUp: scene.followUp ? { ...scene.followUp, text: render(scene.followUp.text), choices: scene.followUp.choices.map((choice) => ({ ...choice, label: render(choice.label), reply: render(choice.reply) })) } : undefined,
  };
}
export function pickPalaceDialogue(state: GameState, person: PersonRecord, random = Math.random()) {
  if (!isPersonAlive(person)) return undefined;
  if (person.kind !== 'CONSORT') return pickDialogueForPerson(person, random);
  const eligible = eligiblePalaceDialogues(state, person, [...phaseOneDialogues, palaceCaseDialogue]);
  // 保留原随机入口和旧池；仅为新事件划分少量机会，不改写旧数据。
  if (!eligible.length || (random < .65 && availableDialoguesFor(person).length)) return pickDialogueForPerson(person, random);
  const weighted = eligible.map((scene) => ({ scene, weight: Math.max(0, scene.weight ?? 1) * (inferEventType(scene) === 'RIVALRY' ? 1 + palaceJealousy(state, person.id) / 20 : 1) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return pickDialogueForPerson(person, random);
  let cursor = Math.max(0, Math.min(.999999, (random - .65) / .35)) * total;
  const chosen = weighted.find((entry) => (cursor -= entry.weight) < 0)?.scene ?? eligible[0];
  return instantiatePalaceScene(state, person, chosen);
}
