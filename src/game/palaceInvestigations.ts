import type { GameState, GameDate, PersonRecord } from './gameState';
import type { PalaceCase, PalaceCaseResult, PalaceCaseTemplate, PalaceInvestigator } from './palaceCaseTypes';
import { isPersonAlive } from './person';
import { isGrounded } from './palacePunishments';
import { clampPalaceValue } from './palaceEffects';

export const householdInvestigator: PalaceInvestigator = { type: 'NEIWUFU', name: '内务府', ability: 70, integrity: 85, speed: 60 };

export function canInvestigate(person: PersonRecord | undefined, palaceCase: PalaceCase, date: GameDate) {
  return Boolean(isPersonAlive(person) && person.kind === 'CONSORT' && person.status === 'NORMAL'
    && !person.illness && (person.stats.健康 ?? 100) >= 50 && !isGrounded(person, date)
    && !palaceCase.accusedIds.includes(person.id) && !palaceCase.victimIds.includes(person.id)
    && palaceCase.complainantId !== person.id);
}

export function personInvestigator(person: PersonRecord): PalaceInvestigator {
  // 没有智慧/谋略的妃嫔，使用现有才情/礼仪作为保守替代，不新增人物属性。
  const wisdom = clampPalaceValue(person.stats.智慧 ?? person.stats.才情 ?? 40);
  const strategy = clampPalaceValue(person.stats.谋略 ?? person.stats.礼仪 ?? 40);
  const prestige = clampPalaceValue(person.stats.威望 ?? 0);
  const integrity = clampPalaceValue(person.stats.忠诚 ?? person.stats.礼仪 ?? 50);
  const type = (person.rank ?? person.title) === '皇后' ? 'EMPRESS' : 'CONSORT';
  return { type, personId: person.id, name: `${person.rank ?? person.title}${person.name}`,
    ability: Math.round(wisdom * .4 + strategy * .4 + prestige * .2), integrity,
    speed: Math.round(40 + wisdom * .3), attributes: { wisdom, strategy, prestige } };
}

export function investigationCandidates(state: GameState, palaceCase: PalaceCase): PalaceInvestigator[] {
  return [{ ...householdInvestigator }, ...Object.values(state.people)
    .filter((person) => canInvestigate(person, palaceCase, state.clock)).map(personInvestigator)
    .sort((a, b) => Number(b.type === 'EMPRESS') - Number(a.type === 'EMPRESS') || b.ability - a.ability)];
}
export const investigatorKey = (investigator: PalaceInvestigator) => investigator.personId ?? 'NEIWUFU';
export function investigationDuration(template: PalaceCaseTemplate, investigator: PalaceInvestigator, roll: number) {
  const base = template.minInvestigationDays + Math.floor(Math.max(0, Math.min(.999999, roll)) * (template.maxInvestigationDays - template.minInvestigationDays + 1));
  const modifier = Math.round((investigator.speed - 50) / 25);
  return Math.max(Math.max(1, template.minInvestigationDays - 2), Math.min(template.maxInvestigationDays, base - modifier));
}

/** 此函数读取内部 truth，只返回玩家可见的调查认知，不能返回 truth 本身。 */
export function resolveInvestigation(palaceCase: PalaceCase): PalaceCaseResult {
  const score = (palaceCase.investigator?.ability ?? 0) + Math.floor((palaceCase.investigationRoll ?? .5) * 41) - 20 - palaceCase.truth.difficulty;
  if (score < -20) return { conclusion: 'INCONCLUSIVE', suspectedIds: [], confidence: 10, summary: '供膳与传送记录未能相互印证，此次调查未获得有效结论。' };
  if (score < 0) return { conclusion: 'INSUFFICIENT_EVIDENCE', suspectedIds: [], confidence: 30, summary: '虽发现供膳环节存在疏漏，但现有材料不足以确定责任人。' };
  const truth = palaceCase.truth;
  if (score < 20) return { conclusion: 'PARTIAL_EVIDENCE', suspectedIds: [...truth.culpritIds], confidence: 55,
    summary: truth.culpritIds.length ? '部分供膳记录与相关人物的往来相符，但材料尚不完整，只能列为疑点，不宜据此认定全部责任。' : '查到部分保存与传送疏漏，尚不能确定是意外还是人为。' };
  if (truth.type === 'FALSE_ACCUSATION') return { conclusion: 'FALSE_ACCUSATION_FOUND', suspectedIds: [...truth.culpritIds], confidence: 85, summary: '原指控与核实记录矛盾，调查指向告状者捏造指控；尚未发现原被告涉事的根据。' };
  if (truth.type === 'ACCIDENT') return { conclusion: 'ACCIDENT', suspectedIds: [], confidence: 85, summary: '膳食保存与传送不当导致变质，现有调查支持意外疏失，并无人物蓄意加害的根据。' };
  if (truth.type === 'UNKNOWN') return { conclusion: 'INCONCLUSIVE', suspectedIds: [], confidence: 25, summary: '现存记录无法还原膳食异常的来由，暂不能判定是否有人应当负责。' };
  if (truth.type === 'PARTIAL') return { conclusion: 'PARTIAL_EVIDENCE', suspectedIds: [...truth.culpritIds], confidence: 75, summary: '已核实相关人物干预了供膳，但原指控有所夸大，尚不能将全部异常归责于此人。' };
  return { conclusion: 'CULPRIT_FOUND', suspectedIds: [...truth.culpritIds], confidence: 90, summary: '供膳记录与宫人口供能够相互印证，送膳环节确有人为干预，主要责任指向以下人物。' };
}
