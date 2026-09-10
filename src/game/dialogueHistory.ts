import type { DialogueScene } from './dialogueLibrary';
import type { HistoryEffect, PersonKind, PersonRecord } from './gameState';

export interface DialogueHistoryChoice {
  text: string;
  reply: string;
}

export interface DialogueHistoryInput {
  record: Pick<PersonRecord, 'kind' | 'name' | 'sex' | 'traits'>;
  scene?: DialogueScene;
  opening: DialogueHistoryChoice;
  followUp?: DialogueHistoryChoice;
  skipped?: boolean;
}

export interface DialogueHistoryResult {
  summary: string;
  effects: HistoryEffect[];
}

function topicFor(scene?: DialogueScene) {
  const tags = scene?.tags ?? [];
  if (tags.includes('study')) return '课业与近日所学';
  if (tags.includes('child')) return '孩子的近况';
  if (tags.includes('pregnant') || tags.includes('postpartum')) return '身子与起居';
  if (tags.includes('festival')) return '节礼与宫中近况';
  if (tags.includes('relationship') || tags.includes('rivalry') || tags.includes('palaceStrife')) return '宫中近来的琐事';
  if (tags.includes('daily')) return '近日的起居';
  return '近日的事务';
}

function roleLead(kind: PersonKind, name: string, topic: string) {
  if (kind === 'MINISTER') return `朕召${name}近前，问起${topic}`;
  if (kind === 'PRINCE' || kind === 'PRINCESS') return `朕与${name}谈起${topic}`;
  if (kind === 'CONSORT' || kind === 'DOWAGER') return `朕问起${name}${topic}`;
  return `朕与${name}闲谈${topic}`;
}

function normalizeReply(reply: string) {
  const text = reply.trim();
  if (!text) return '';
  // 对话库中的回复以“皇帝……”记录时，履历改用第一人称叙述，更像帝王日记。
  return text.replace(/^皇帝(?=与|向|替|陪|命|收|称|说|提醒|让|许诺|出言|坐|将|拿起|作了|接过|轻轻)/, '朕');
}

function makeSentenceLead(input: DialogueHistoryInput) {
  const topic = topicFor(input.scene);
  return `${roleLead(input.record.kind, input.record.name, topic)}，`;
}

export function buildDialogueHistory(input: DialogueHistoryInput): DialogueHistoryResult {
  const effects: HistoryEffect[] = [
    { label: '亲近', value: 2 },
    { label: '信任', value: 1 },
  ];
  if (input.skipped) {
    return {
      summary: `朕听${input.record.name}禀报近日的${topicFor(input.scene)}，未作久留，谈话便暂告一段。`,
      effects,
    };
  }

  if (input.record.kind === 'PRINCE' || input.record.kind === 'PRINCESS') {
    effects.push({ label: '宠爱', value: 3 }, { label: '勤奋', value: 1 }, { label: input.record.kind === 'PRINCE' ? '文学' : '才学', value: 1 });
  }
  const opening = normalizeReply(input.opening.reply);
  const followUp = input.followUp ? normalizeReply(input.followUp.reply) : '';
  const lead = makeSentenceLead(input);
  const parts = [opening ? `${lead}${opening}` : `${lead}略叙片刻`];
  if (followUp) parts.push(followUp);
  const summary = `${parts.join(' ')}${/[。！？]$/.test(parts.at(-1) ?? '') ? '' : '。'} `
    .replace(/ +/g, ' ')
    .trim();
  return { summary, effects };
}