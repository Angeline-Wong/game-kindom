import type { DialogueScene } from './dialogueLibrary';
import type { DialogueEffect } from './palaceTypes';
const effect = (type: DialogueEffect['type'], value: number): DialogueEffect => ({ type, target: 'SPEAKER', value });
export const phaseOneDialogues: DialogueScene[] = [
  ...[
    ['moon', '臣妾见今夜月色甚好，陛下可愿一同赏月？', '陪她赏月', '皇帝陪她赏月，闲谈至夜风渐凉。'],
    ['tea', '臣妾新沏了一盏茶，陛下可愿坐一会儿？', '陪她饮茶', '皇帝与她共饮新茶，殿中气氛渐渐轻松。'],
    ['music', '臣妾新学了一段琴曲，想请陛下听听。', '听她抚琴', '皇帝静听一曲，称赞她用心。'],
  ].map(([id, text, label, reply]): DialogueScene => ({
    id: 'palace-daily-' + id, kind: 'CONSORT', eventType: 'DAILY', severity: 'TRIVIAL', tags: ['daily'], cooldownDays: 5,
    text, choices: [
      { id: 'stay', label, reply, effects: [effect('FAVOR', 2), effect('MOOD', 3)] },
      { id: 'leave', label: '改日再来', reply: '皇帝温言叮嘱几句，随后起身离去。', effects: [effect('MOOD', -1)] },
    ],
  })),
  ...[
    ['lonely', '听闻陛下近日常去{{accused}}那里，臣妾难免有些失落。'],
    ['gift', '{{accused}}近日蒙赐新衣，臣妾看着欢喜，心中却也有些酸楚。'],
  ].map(([id, text]): DialogueScene => ({
    id: 'palace-rivalry-' + id, kind: 'CONSORT', eventType: 'RIVALRY', severity: 'TRIVIAL', tags: ['rivalry'], trigger: { minJealousy: 10 }, cooldownDays: 15,
    text, choices: [
      { id: 'comfort', label: '温言安慰', reply: '皇帝安慰{{speaker}}，她的神色缓和下来。', effects: [effect('FAVOR', 2), effect('MOOD', 3), effect('JEALOUSY', -4)] },
      { id: 'rebuke', label: '劝她勿妒', reply: '皇帝告诫她不必攀比，{{speaker}}低头应下。', effects: [effect('FAVOR', -3), effect('JEALOUSY', 2), effect('FEAR', 3), effect('RESENTMENT', 2)] },
    ],
  })),
  ...[
    ['greeting', '{{accused}}今日在御花园与臣妾争执，臣妾心里委屈，请陛下作主。'],
    ['rumor', '臣妾听说{{accused}}在人前议论臣妾，伤了和气，恳请陛下处置。'],
  ].map(([id, text]): DialogueScene => ({
    id: 'palace-complaint-' + id, kind: 'CONSORT', eventType: 'COMPLAINT', severity: 'MINOR', tags: ['palaceStrife'], cooldownDays: 20,
    text, choices: [
      { id: 'punish', label: '考虑处置', reply: '皇帝听罢陈述，准备斟酌对{{accused}}的处置。', effects: [], action: { type: 'OPEN_PUNISHMENT', target: 'ACCUSED', reason: id === 'greeting' ? '御花园争执' : '宫中言语不和' } },
      { id: 'reconcile', label: '劝双方和解', reply: '皇帝劝双方各退一步，不再计较。', effects: [effect('JEALOUSY', -2), { type: 'RELATIONSHIP', target: 'SPEAKER', otherTarget: 'ACCUSED', value: 4 }] },
      { id: 'dismiss', label: '此事作罢', reply: '皇帝暂不追究，{{speaker}}低声告退。', effects: [effect('MOOD', -2), effect('RESENTMENT', 2)] },
    ],
  })),
];
