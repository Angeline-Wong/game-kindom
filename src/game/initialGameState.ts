import { demoEmperor } from './characters';
import type { GameState, PersonRecord, RelationshipRecord } from './gameState';
import { weatherForDate } from './simulation';
import { getResidenceSceneId, parseResidenceLabel } from './residences';

const people: PersonRecord[] = [
  { id: 'emperor', kind: 'EMPEROR', name: demoEmperor.name, sex: 'MALE', birthDate: { year: -21, month: 4, day: 12 }, age: 24, title: '大曜皇帝', sceneId: 'yangxin-base', status: 'NORMAL', assets: { avatar: 'portrait.emperor', portrait: 'portrait.emperor' }, parents: ['empress-dowager'], children: [], stats: { 文: 72, 武: 58, 政治: 66, 民生: 61, 魅力: 78, 健康: 83, 快乐: 60 }, traits: ['勤政'] },
  { id: 'empress', kind: 'CONSORT', name: '沈皇后', sex: 'FEMALE', birthDate: { year: -20, month: 8, day: 9 }, age: 23, title: '皇后', rank: '皇后', residence: '坤宁宫主殿', sceneId: 'kuning:主殿', status: 'NORMAL', assets: { avatar: 'portrait.empress', portrait: 'portrait.empress' }, parents: [], children: [], stats: { 才情: 81, 礼仪: 94, 容貌: 85, 健康: 82, 野心: 55, 争宠: 42, 宠爱: 76 }, traits: ['端庄', '持重'] },
  { id: 'empress-dowager', kind: 'DOWAGER', name: '孝和太后', sex: 'FEMALE', birthDate: { year: -55, month: 2, day: 16 }, age: 58, title: '皇太后', rank: '皇太后', residence: '慈宁宫', sceneId: 'cining', status: 'NORMAL', assets: { avatar: 'portrait.empress', portrait: 'portrait.empress' }, parents: [], children: ['emperor'], stats: { 才情: 76, 礼仪: 96, 容貌: 68, 健康: 73, 威望: 94, 谋略: 82, 宠爱: 70 }, traits: ['慈严', '通达'], dialogue: '皇帝既来了，便陪哀家说说朝中近况吧。' },
  { id: 'consort-dowager', kind: 'DOWAGER', name: '荣太妃', sex: 'FEMALE', birthDate: { year: -50, month: 9, day: 7 }, age: 53, title: '太妃', rank: '太妃', residence: '寿康宫', sceneId: 'shoukang', status: 'NORMAL', assets: { avatar: 'portrait.empress', portrait: 'portrait.empress' }, parents: [], children: [], stats: { 才情: 83, 礼仪: 89, 容貌: 72, 健康: 78, 威望: 76, 谋略: 69, 宠爱: 55 }, traits: ['温厚', '寡言'], dialogue: '寿康宫一切安好，劳陛下挂念。' },
  { id: 'minister-001', kind: 'MINISTER', name: '沈砚之', sex: 'MALE', birthDate: { year: -43, month: 1, day: 5 }, age: 46, title: '翰林学士', rank: '正五品', office: '翰林院', sceneId: 'wenhua', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 82, 武略: 28, 野心: 61, 忠诚: 71, 派系影响: 67, 已知财富: 54 }, traits: ['严谨', '果断'] },
  { id: 'minister-002', kind: 'MINISTER', name: '傅弘毅', sex: 'MALE', birthDate: { year: -50, month: 3, day: 8 }, age: 53, title: '太傅', rank: '正一品', office: '太傅', sceneId: 'taihe', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 90, 武略: 38, 野心: 44, 忠诚: 84, 派系影响: 88, 已知财富: 72 }, traits: ['老成', '清正'] },
  { id: 'minister-003', kind: 'MINISTER', name: '顾廷钧', sex: 'MALE', birthDate: { year: -39, month: 7, day: 18 }, age: 42, title: '吏部尚书', rank: '正二品', office: '吏部尚书', sceneId: 'qianqing-gate', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 85, 武略: 35, 野心: 69, 忠诚: 73, 派系影响: 79, 已知财富: 66 }, traits: ['圆融', '善断'] },
  { id: 'minister-004', kind: 'MINISTER', name: '谢怀瑾', sex: 'MALE', birthDate: { year: -44, month: 11, day: 2 }, age: 46, title: '兵部尚书', rank: '从一品', office: '兵部尚书', sceneId: 'military', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 77, 武略: 86, 野心: 58, 忠诚: 79, 派系影响: 74, 已知财富: 52 }, traits: ['刚毅', '持重'] },
  { id: 'minister-005', kind: 'MINISTER', name: '陆文澜', sex: 'MALE', birthDate: { year: -34, month: 5, day: 22 }, age: 37, title: '户部侍郎', rank: '正三品', office: '户部侍郎', sceneId: 'household', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 81, 武略: 31, 野心: 64, 忠诚: 68, 派系影响: 61, 已知财富: 83 }, traits: ['精算', '谨慎'] },
  { id: 'minister-006', kind: 'MINISTER', name: '裴景川', sex: 'MALE', birthDate: { year: -31, month: 9, day: 14 }, age: 34, title: '礼部侍郎', rank: '正三品', office: '礼部侍郎', sceneId: 'huitong', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 84, 武略: 29, 野心: 53, 忠诚: 76, 派系影响: 59, 已知财富: 48 }, traits: ['知礼', '机敏'] },
  { id: 'minister-007', kind: 'MINISTER', name: '方肃', sex: 'MALE', birthDate: { year: -47, month: 2, day: 11 }, age: 50, title: '宗令', rank: '从二品', office: '宗人府宗令', sceneId: 'clan', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 78, 武略: 45, 野心: 49, 忠诚: 82, 派系影响: 71, 已知财富: 69 }, traits: ['守礼', '严峻'] },
  { id: 'minister-008', kind: 'MINISTER', name: '霍云峥', sex: 'MALE', birthDate: { year: -29, month: 12, day: 3 }, age: 32, title: '禁军统领', rank: '正四品', office: '禁军统领', sceneId: 'drill', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 65, 武略: 92, 野心: 47, 忠诚: 88, 派系影响: 56, 已知财富: 45 }, traits: ['勇毅', '忠直'] },
  { id: 'attendant', kind: 'MINISTER', name: '值房内侍', sex: 'MALE', birthDate: { year: -31, month: 9, day: 2 }, age: 34, title: '通传内侍', rank: '正七品', office: '内侍省', sceneId: 'taihe', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 63, 武略: 18, 野心: 42, 忠诚: 74, 派系影响: 31, 已知财富: 28 }, traits: ['谨慎', '机敏'] },
];

const relationships: RelationshipRecord[] = [
  { id: 'rel-emperor-empress', personAId: 'emperor', personBId: 'empress', kind: 'SPOUSE', labelA: '皇后', labelB: '夫君', affinity: 72, trust: 84, jealousy: 18 },
  { id: 'rel-dowager-emperor', personAId: 'empress-dowager', personBId: 'emperor', kind: 'PARENT_CHILD', labelA: '皇帝', labelB: '母后', affinity: 88, trust: 91 },
  { id: 'rel-taifei-emperor', personAId: 'consort-dowager', personBId: 'emperor', kind: 'ALLY', labelA: '皇帝', labelB: '太妃', affinity: 67, trust: 74 },
  { id: 'rel-emperor-minister-001', personAId: 'emperor', personBId: 'minister-001', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 65, trust: 71 },
  { id: 'rel-emperor-minister-002', personAId: 'emperor', personBId: 'minister-002', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 71, trust: 84 },
  { id: 'rel-emperor-minister-003', personAId: 'emperor', personBId: 'minister-003', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 66, trust: 73 },
  { id: 'rel-emperor-minister-004', personAId: 'emperor', personBId: 'minister-004', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 69, trust: 79 },
  { id: 'rel-emperor-minister-005', personAId: 'emperor', personBId: 'minister-005', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 61, trust: 68 },
  { id: 'rel-emperor-minister-006', personAId: 'emperor', personBId: 'minister-006', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 64, trust: 76 },
  { id: 'rel-emperor-minister-007', personAId: 'emperor', personBId: 'minister-007', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 68, trust: 82 },
  { id: 'rel-emperor-minister-008', personAId: 'emperor', personBId: 'minister-008', kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 75, trust: 88 },
  { id: 'rel-emperor-attendant', personAId: 'emperor', personBId: 'attendant', kind: 'SERVICE', labelA: '近侍', labelB: '君主', affinity: 58, trust: 74 },
  { id: 'rel-minister-attendant', personAId: 'minister-001', personBId: 'attendant', kind: 'ALLY', labelA: '宫中联络', labelB: '朝中联络', affinity: 48, trust: 52 },
];

export function createInitialGameState(): GameState {
  const clock = { year: 3, month: 10, day: 18, minuteOfDay: 420 };
  return {
    version: 1,
    saveId: 'autosave',
    updatedAt: Date.now(),
    clock,
    speed: 1,
    weather: weatherForDate(clock),
    people: Object.fromEntries(people.map((person) => [person.id, { ...person, stats: { ...person.stats }, parents: [...person.parents], children: [...person.children], traits: [...person.traits] }])),
    pregnancies: [],
    visits: [],
    events: [],
    history: [],
    relationships: relationships.map((relationship) => ({ ...relationship })),
    sixPalaceAssistants: [],
    palaceSelection: null,
    royalMarriages: [],
    usedNames: {
      consorts: people.filter((person) => person.kind === 'CONSORT').map((person) => person.name),
      ministers: people.filter((person) => person.kind === 'MINISTER').map((person) => person.name),
      royals: people.filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').map((person) => person.name),
    },
  };
}

export function migrateGameState(stored: GameState): GameState {
  const initial = createInitialGameState();
  const mergedPeople = { ...initial.people, ...(stored.people ?? {}) };
  const people = Object.fromEntries(Object.entries(mergedPeople).map(([id, person]) => {
    const normalized = initial.people[id] ? { ...person, stats: { ...initial.people[id].stats, ...person.stats } } : person;
    if (normalized.kind !== 'CONSORT') return [id, normalized];
    if (normalized.sceneId && normalized.sceneId !== 'inner-palace') return [id, normalized];
    const residence = parseResidenceLabel(normalized.residence);
    const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
    return [id, sceneId ? { ...normalized, sceneId } : normalized];
  }));
  return {
    ...initial,
    ...stored,
    version: 1,
    people,
    pregnancies: stored.pregnancies ?? [],
    visits: stored.visits ?? [],
    events: stored.events ?? [],
    history: stored.history ?? [],
    relationships: stored.relationships ?? initial.relationships,
    sixPalaceAssistants: stored.sixPalaceAssistants ?? [],
    palaceSelection: stored.palaceSelection ?? null,
    royalMarriages: stored.royalMarriages ?? [],
    usedNames: {
      consorts: [...new Set(stored.usedNames?.consorts ?? Object.values(people).filter((person) => person.kind === 'CONSORT').map((person) => person.name))],
      ministers: [...new Set(stored.usedNames?.ministers ?? Object.values(people).filter((person) => person.kind === 'MINISTER').map((person) => person.name))],
      royals: [...new Set(stored.usedNames?.royals ?? Object.values(people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').map((person) => person.name))],
    },
  };
}
