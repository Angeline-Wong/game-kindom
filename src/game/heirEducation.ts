import { isPersonAlive } from './person';
import { clockDate, type GameState, type PersonRecord } from './gameState';

export type HeirInteractionKind = 'education' | 'encourage' | 'talk';

/** 皇子/皇女的年龄分档（六档制），用于剧情对话与互动操作的适龄裁剪。 */
export type HeirAgeBand = 'INFANT' | 'TODDLER' | 'PRESCHOOL' | 'SCHOOL' | 'TEEN' | 'ADULT';

/** 各档的最小年龄（含），用于分段判断与文案前缀。 */
export interface HeirAgeBandInfo {
  band: HeirAgeBand;
  label: string;
  minAge: number;
  maxAge: number;
}

const AGE_BANDS: HeirAgeBandInfo[] = [
  { band: 'INFANT', label: '襁褓', minAge: 0, maxAge: 1 },
  { band: 'TODDLER', label: '幼童', minAge: 2, maxAge: 3 },
  { band: 'PRESCHOOL', label: '蒙学', minAge: 4, maxAge: 6 },
  { band: 'SCHOOL', label: '课业', minAge: 7, maxAge: 12 },
  { band: 'TEEN', label: '少年', minAge: 13, maxAge: 17 },
  { band: 'ADULT', label: '成年', minAge: 18, maxAge: 999 },
];

/** 返回 age 所属的年龄档；非皇子/公主等无意义调用上也安全（按年龄段映射）。 */
export function heirAgeBand(age: number): HeirAgeBand {
  const info = AGE_BANDS.find((entry) => age >= entry.minAge && age <= entry.maxAge);
  return (info ?? AGE_BANDS[AGE_BANDS.length - 1]).band;
}

/** 用于显示「0 岁 / 12 岁」年龄段的人类可读标签。 */
export function heirAgeBandLabel(age: number): string {
  const info = AGE_BANDS.find((entry) => age >= entry.minAge && age <= entry.maxAge);
  return (info ?? AGE_BANDS[AGE_BANDS.length - 1]).label;
}

/** 判断 age 是否落在给定的闭区间内（含两端）。 */
export function ageWithin(age: number, minAge: number | undefined, maxAge: number | undefined): boolean {
  if (typeof minAge === 'number' && age < minAge) return false;
  if (typeof maxAge === 'number' && age > maxAge) return false;
  return true;
}

export interface HeirInteractionOutcome { gains: Record<string, number>; summary: string }

export interface HeirChoice {
  id: string;
  label: string;
  description: string;
  reply: string;
  focus?: string;
  interest?: string[];
  baseGain: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const stableNumber = (value: string) => [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 17);

export function normalizeHeirStats(person: PersonRecord): PersonRecord {
  if (!isPersonAlive(person) || person.kind !== 'PRINCE' && person.kind !== 'PRINCESS') return person;
  const seed = stableNumber(person.id);
  const common = {
    健康: person.stats['健康'] ?? 75 + seed % 16,
    天资: person.stats['天资'] ?? 45 + seed % 46,
    宠爱: person.stats['宠爱'] ?? 45 + seed % 21,
    勤奋: person.stats['勤奋'] ?? 35 + seed % 36,
    野心: person.stats['野心'] ?? (person.kind === 'PRINCE' ? 30 + seed % 41 : 22 + (seed >> 3) % 39),
  };
  const growth: Record<string, number> = person.kind === 'PRINCE'
    ? { 文学: person.stats['文学'] ?? 0, 武力: person.stats['武力'] ?? 0 }
    : { 礼仪: person.stats['礼仪'] ?? 0, 才学: person.stats['才学'] ?? 0 };
  const interests = person.traits.length ? person.traits : [
    person.kind === 'PRINCE' ? ['喜文', '尚武', '爱算术', '好问'][seed % 4] : ['爱诗书', '重礼仪', '爱琴乐', '好问'][seed % 4],
  ];
  return { ...person, stats: { ...person.stats, ...common, ...growth }, traits: interests };
}

export function getHeirEducationStage(age: number) {
  if (age <= 3) return '幼年启蒙';
  if (age <= 6) return '蒙学开智';
  if (age <= 12) return '书院进学';
  if (age <= 17) return '经世专修';
  return '成年研习';
}

export function getHeirChoices(person: PersonRecord, kind: HeirInteractionKind): HeirChoice[] {
  if (!isPersonAlive(person)) return [];
  // 0-3 襁褓/幼童：尚不能真正交谈，鼓励/闲聊换成陪护式动作。
  if (kind === 'encourage' && person.age <= 3) return [
    { id: 'gentle', label: '哼歌哄睡', description: '哼歌哄睡，传递安心。', reply: '皇嗣安静下来，把头埋进父皇怀里。', baseGain: 4 },
    { id: 'example', label: '以身示则', description: '在皇嗣面前演示拱手、走步。', reply: '皇嗣试图模仿父皇的动作。', baseGain: 4 },
    { id: 'promise', label: '许下陪伴', description: '承诺得空再来陪玩。', reply: '皇嗣咧着嘴笑出声来。', baseGain: 4 },
  ];
  if (kind === 'talk' && person.age <= 3) return [
    { id: 'daily', label: '哄其入睡', description: '轻拍哼唱陪伴片刻。', reply: '皇嗣在父皇拍抚下沉沉睡去。', baseGain: 4 },
    { id: 'interest', label: '念童谣识物', description: '念歌谣并指物命名。', reply: '皇嗣跟着咿呀尝试发音。', baseGain: 5 },
    { id: 'company', label: '怀抱逗弄', description: '抱着走动，逗其玩耍。', reply: '皇嗣咯咯笑出声来。', baseGain: 5 },
  ];
  if (kind === 'encourage') return [
    { id: 'gentle', label: '温言嘉勉', description: '肯定近日用功，循循勉励。', reply: '儿臣定不负父皇教诲。', baseGain: 6 },
    { id: 'example', label: '讲述先贤', description: '以先贤勤学故事勉其自省。', reply: '儿臣愿以先贤为榜样。', baseGain: 8 },
    { id: 'promise', label: '许下奖励', description: '完成课业后赐予心爱之物。', reply: '儿臣这便回去认真温习！', baseGain: 5 },
  ];
  if (kind === 'talk') return [
    { id: 'daily', label: '询问近况', description: '听孩子说说近日的生活。', reply: '父皇愿意听，儿臣很高兴。', baseGain: 6 },
    { id: 'interest', label: '谈论爱好', description: `聊聊${person.traits[0] ?? '近日喜好'}。`, reply: '原来父皇也记得儿臣喜欢什么。', baseGain: 8 },
    { id: 'company', label: '陪伴玩耍', description: '暂放政务，陪伴片刻。', reply: '今日能陪在父皇身边，真好。', baseGain: 10 },
  ];
  const prince = person.kind === 'PRINCE';
  // 0-1 襁褓：尚不及言语，重在看顾与陪护——不出现 "教说话/算术" 这类不合理选项。
  if (person.age <= 1) return [
    { id: 'comfort', label: '抱哄', description: '抱起轻拍，化解哭闹。', reply: '皇帝将皇嗣抱起，孩子在他怀里渐渐安静。', baseGain: 4 },
    { id: 'walk', label: '环殿缓步', description: '抱着在殿中缓步走，哄其入睡。', reply: '皇帝抱着皇嗣在殿中走了一圈，孩子渐渐合眼。', baseGain: 4 },
    { id: 'play-soothe', label: '逗乐安抚', description: '用轻响声、彩穗逗弄，安其情绪。', reply: '皇帝轻声逗弄，皇嗣咯咯笑起来。', baseGain: 4 },
    { id: 'nurse', label: '嘱乳母', description: '嘱乳母照看饮食起居。', reply: '皇帝嘱乳母好生看顾，皇嗣安静下来。', baseGain: 3 },
  ];
  // 2-3 幼童：已开始牙牙学语，可认物、玩游戏——不再出 "算术启蒙"。
  if (person.age <= 3) return [
    { id: 'speech', label: '教习说话', description: '以称谓、短句和故事启发言语。', reply: '儿臣会认真跟着父皇学。', focus: prince ? '文学' : '才学', interest: ['好问', '爱诗书'], baseGain: 5 },
    { id: 'play', label: '亲子游戏', description: '追游、投壶、击掌等体能游戏。', reply: '儿臣还想再玩一回。', focus: prince ? '武力' : '健康', interest: ['尚武'], baseGain: 5 },
    { id: 'listen', label: '故事启蒙', description: '讲童话神话、人物传记片段。', reply: '儿臣想再听一遍！', focus: prince ? '文学' : '才学', interest: ['喜文', '爱诗书'], baseGain: 5 },
  ];
  if (person.age <= 6) return [
    { id: 'letters', label: '识字蒙学', description: '学习识字、诵读和基础书写。', reply: '儿臣记住今日所学了。', focus: prince ? '文学' : '才学', interest: ['喜文', '爱诗书', '好问'], baseGain: 6 },
    { id: 'etiquette', label: '礼仪启蒙', description: '学习宫廷礼仪与进退规矩。', reply: '儿臣会谨记礼数。', focus: prince ? '文学' : '礼仪', interest: ['重礼仪'], baseGain: 6 },
    { id: 'riding-play', label: '骑射游戏', description: '从步射、控马和体能开始。', reply: '儿臣不怕辛苦。', focus: prince ? '武力' : '健康', interest: ['尚武'], baseGain: 6 },
  ];
  if (person.age <= 12) return prince ? [
    { id: 'classics', label: '经史讲读', description: '研读经义与前代治乱。', reply: '儿臣愿再读一遍今日篇章。', focus: '文学', interest: ['喜文', '好问'], baseGain: 7 },
    { id: 'math', label: '算学格物', description: '学习算学、历法与格物常识。', reply: '儿臣想把这道题算明白。', focus: '文学', interest: ['爱算术', '好问'], baseGain: 7 },
    { id: 'archery', label: '骑射操练', description: '练习弓马、步法与耐力。', reply: '儿臣明日也会按时操练。', focus: '武力', interest: ['尚武'], baseGain: 7 },
  ] : [
    { id: 'poetry', label: '诗书才学', description: '研读诗文并练习书画。', reply: '儿臣愿将今日诗句抄录下来。', focus: '才学', interest: ['爱诗书', '爱琴乐'], baseGain: 7 },
    { id: 'court-rites', label: '宫廷礼仪', description: '学习典礼、仪态与宫务规矩。', reply: '儿臣会把每一项礼节练好。', focus: '礼仪', interest: ['重礼仪'], baseGain: 7 },
    { id: 'music', label: '琴乐雅艺', description: '学习琴乐、舞仪与审美。', reply: '儿臣很喜欢今日的曲子。', focus: '才学', interest: ['爱琴乐'], baseGain: 7 },
  ];
  if (person.age <= 17) return prince ? [
    { id: 'policy', label: '策论治国', description: '研习民生、财赋与用人之道。', reply: '儿臣会重新斟酌这篇策论。', focus: '文学', interest: ['喜文', '好问'], baseGain: 8 },
    { id: 'strategy', label: '兵法武备', description: '研习兵法并参加实战操演。', reply: '儿臣愿从军阵小事学起。', focus: '武力', interest: ['尚武'], baseGain: 8 },
    { id: 'debate', label: '经筵辩论', description: '与师傅辩经，锻炼思辨与表达。', reply: '儿臣明白不能只会背书。', focus: '文学', interest: ['好问'], baseGain: 9 },
  ] : [
    { id: 'classics-advanced', label: '经史诗文', description: '精研经史与诗文鉴赏。', reply: '儿臣愿继续精读。', focus: '才学', interest: ['爱诗书'], baseGain: 8 },
    { id: 'rites-advanced', label: '典礼宫务', description: '学习主持典礼与管理内务。', reply: '儿臣会留心每一处细节。', focus: '礼仪', interest: ['重礼仪'], baseGain: 8 },
    { id: 'arts-advanced', label: '琴棋书画', description: '选择雅艺深入研习。', reply: '儿臣今日颇有所得。', focus: '才学', interest: ['爱琴乐'], baseGain: 8 },
  ];
  return prince ? [
    { id: 'governance', label: '协理政务', description: '随侍听政，研习奏章与决断。', reply: '儿臣会谨慎学习，不敢轻忽。', focus: '文学', interest: ['喜文', '好问'], baseGain: 6 },
    { id: 'command', label: '统军历练', description: '参与巡营、校阅与军务推演。', reply: '儿臣愿以军纪自持。', focus: '武力', interest: ['尚武'], baseGain: 6 },
  ] : [
    { id: 'palace-affairs', label: '宫务历练', description: '参与典礼筹办与宫务管理。', reply: '儿臣会妥善料理。', focus: '礼仪', interest: ['重礼仪'], baseGain: 6 },
    { id: 'academy', label: '文艺研修', description: '继续精进诗书、琴画与著述。', reply: '儿臣愿以所学自勉。', focus: '才学', interest: ['爱诗书', '爱琴乐'], baseGain: 6 },
  ];
}

export function getHeirInteractionOutcome(original: PersonRecord, kind: HeirInteractionKind, optionId: string): HeirInteractionOutcome | null {
  const child = normalizeHeirStats(original);
  const choice = getHeirChoices(child, kind).find((item) => item.id === optionId);
  if (!choice) return null;
  if (kind === 'education' && choice.focus) {
    const interestBonus = choice.interest?.some((item) => child.traits.includes(item)) ? 3 : 0;
    const requested = choice.baseGain + Math.floor((child.stats['天资'] ?? 50) / 25) + Math.floor((child.stats['勤奋'] ?? 50) / 30) + interestBonus;
    const focusGain = Math.max(0, Math.min(requested, 100 - (child.stats[choice.focus] ?? 0)));
    const diligenceGain = Math.max(0, Math.min(1, 100 - (child.stats['勤奋'] ?? 0)));
    const favorGain = Math.max(0, Math.min(3, 100 - (child.stats['宠爱'] ?? 0)));
    return { gains: { [choice.focus]: focusGain, 宠爱: favorGain, ...(diligenceGain ? { 勤奋: diligenceGain } : {}) }, summary: `皇帝为${child.name}选择“${choice.label}”，${choice.focus}提升${focusGain}点${diligenceGain ? `，勤奋提升${diligenceGain}点` : ''}，宠爱提升${favorGain}点。` };
  }
  const attribute = kind === 'encourage' ? '勤奋' : '宠爱';
  const gain = Math.max(0, Math.min(choice.baseGain, 100 - (child.stats[attribute] ?? 0)));
  return { gains: { [attribute]: gain }, summary: kind === 'encourage' ? `皇帝以“${choice.label}”鼓励${child.name}，勤奋提升${gain}点。` : `皇帝与${child.name}${choice.label}，宠爱提升${gain}点。` };
}

export function applyHeirInteraction(state: GameState, childId: string, kind: HeirInteractionKind, optionId: string): GameState {
  const original = state.people[childId];
  if (!isPersonAlive(original) || (original.kind !== 'PRINCE' && original.kind !== 'PRINCESS')) return state;
  const child = normalizeHeirStats(original);
  const outcome = getHeirInteractionOutcome(child, kind, optionId);
  if (!outcome) return state;
  const stats = { ...child.stats };
  Object.entries(outcome.gains).forEach(([attribute, gain]) => { stats[attribute] = clamp((stats[attribute] ?? 0) + gain); });
  const date = clockDate(state.clock);
  return {
    ...state,
    people: { ...state.people, [childId]: { ...child, stats } },
    history: [...state.history, { id: `heir-${kind}-${childId}-${state.clock.year}-${state.clock.month}-${state.clock.day}-${state.clock.minuteOfDay}`, date, type: kind === 'education' ? 'EDUCATION' : kind === 'encourage' ? 'ENCOURAGE' : 'DIALOGUE', summary: outcome.summary, personIds: ['emperor', childId] }],
  };
}