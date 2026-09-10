import type { PalaceCaseTemplate } from './palaceCaseTypes';
import type { DialogueScene } from './dialogueLibrary';

export const palaceCaseTemplates: PalaceCaseTemplate[] = [{
  id: 'abnormal-food', title: '妃嫔膳食异常', severity: 'SERIOUS',
  description: '送入宫中的膳食出现异味，供膳与传送环节尚待查清，不可仅凭传言定罪。',
  baseDifficulty: 50, minInvestigationDays: 5, maxInvestigationDays: 8,
  possibleTruths: [
    { type: 'TRUE', weight: 40 }, { type: 'FALSE_ACCUSATION', weight: 15 },
    { type: 'PARTIAL', weight: 20 }, { type: 'ACCIDENT', weight: 20 }, { type: 'UNKNOWN', weight: 5 },
  ],
}];

export const palaceCaseDialogue: DialogueScene = {
  id: 'palace-case-abnormal-food', kind: 'CONSORT', eventType: 'CASE', severity: 'SERIOUS',
  tags: ['palaceStrife'], cooldownDays: 60, weight: 1,
  text: '臣妾今日的燕窝有一股异味，送膳宫人又提到{{accused}}曾过问膳食。臣妾不敢妄断，只求陛下查清原委。',
  choices: [
    { id: 'investigate', label: '命人彻查', reply: '皇帝命人保全供膳记录，准备指派调查。', effects: [], action: { type: 'START_CASE', caseTemplateId: 'abnormal-food' } },
    { id: 'wait', label: '先换膳食，暂且留意', reply: '皇帝命人更换膳食，嘱她留意起居，此事暂未立案。', effects: [{ type: 'MOOD', target: 'SPEAKER', value: 1 }] },
  ],
};
