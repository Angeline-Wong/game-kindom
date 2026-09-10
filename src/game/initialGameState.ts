import { normalizePersonLife, isPersonAlive } from './person';
import { demoEmperor } from './characters';
import { normalizePalacePerson, normalizePalaceRelationships } from './palaceEffects';
import type { GameState, PersonRecord, RelationshipRecord } from './gameState';
import { weatherForDate } from './simulation';
import { getResidenceSceneId, parseResidenceLabel } from './residences';
import { initialFinances } from './economy';
import { initialGiftState } from './gifts';
import { toChineseNumber } from './chineseNumbers';
import { childLivesWithMother } from './heirCare';
import { normalizeHeirStats } from './heirEducation';
import { normalizePersonName } from './namePools';
import { royalBirthIdentity } from './royalNames';

function royalOrdinal(value: number) { return value === 1 ? '大' : toChineseNumber(value); }
function birthValue(person: PersonRecord) { return person.birthDate.year * 10000 + person.birthDate.month * 100 + person.birthDate.day; }
function parseBirthOrder(title: string, kind: 'PRINCE' | 'PRINCESS') {
  const suffix = kind === 'PRINCE' ? '(?:皇子|子)' : '(?:公主|女)';
  const match = title.match(new RegExp(`^(?:皇)?(大|长|次|[一二三四五六七八九十]+|\\d+)皇?${suffix}$`));
  if (!match) return undefined;
  if (match[1] === '大' || match[1] === '长') return 1;
  if (match[1] === '次') return 2;
  if (/^\d+$/.test(match[1])) return Number(match[1]);
  const digits = '一二三四五六七八九十';
  return match[1].split('').reduce((value, digit) => value * 10 + digits.indexOf(digit) + 1, 0);
}

function looksLikeBirthIdentity(title: string, kind: 'PRINCE' | 'PRINCESS') {
  return parseBirthOrder(title, kind) !== undefined || title === (kind === 'PRINCE' ? '皇子' : '公主') || title === (kind === 'PRINCE' ? '太子' : '皇太女');
}

function migrateRoyalTitles(people: Record<string, PersonRecord>) {
  const migrated = { ...people };
  (['PRINCE', 'PRINCESS'] as const).forEach((kind) => {
    const members = Object.values(people).filter((person) => person.kind === kind);
    const explicit = new Map(members.map((person) => [person.id, person.birthOrder ?? parseBirthOrder(person.preHeirTitle ?? person.title, kind)]));
    const explicitValues = [...explicit.values()].filter((value): value is number => Number.isInteger(value));
    // Older saves could persist a global child counter (for example 104) instead
    // of the prince/princess-specific ordinal. Keep ordinary sparse legacy ranks,
    // but rebuild clearly impossible three-digit values from birth dates.
    const hasImpossibleOrdinal = explicitValues.some((value) => value > 50);
    if (hasImpossibleOrdinal) {
      explicit.clear();
      [...members].sort((left, right) => birthValue(left) - birthValue(right) || left.id.localeCompare(right.id)).forEach((person, index) => explicit.set(person.id, index + 1));
    }
    const used = new Set([...explicit.values()].filter((value): value is number => Number.isInteger(value)));
    const unresolved = members.filter((person) => !explicit.get(person.id)).sort((left, right) => birthValue(left) - birthValue(right) || left.id.localeCompare(right.id));
    let next = 1;
    unresolved.forEach((person) => {
      while (used.has(next)) next += 1;
      explicit.set(person.id, next);
      used.add(next);
      next += 1;
    });
    members.forEach((person) => {
      const birthOrder = explicit.get(person.id);
      const identity = birthOrder ? royalBirthIdentity({ ...person, birthOrder }) : person.title;
      const oldTitle = person.royalTitle ?? person.title;
      const royalTitle = person.royalTitle ?? (!looksLikeBirthIdentity(person.title, kind) && !['太子', '皇太女'].includes(person.title) ? oldTitle : undefined);
      const title = ['太子', '皇太女'].includes(person.title) ? person.title : identity;
      const placeholder = person.named === false ? `待赐名${kind === 'PRINCE' ? '皇子' : '公主'}${toChineseNumber(birthOrder ?? 1)}` : person.name;
      migrated[person.id] = { ...person, name: placeholder, title, preHeirTitle: person.preHeirTitle ?? identity, birthOrder, royalTitle };
    });
  });
  return migrated;
}
function migrateRoyalChildResidences(people: Record<string, PersonRecord>) {
  const migrated = { ...people };
  Object.values(people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').forEach((child) => {
    if (!isPersonAlive(child)) return;
    const mother = child.parents.map((id) => people[id]).find((person) => person?.kind === 'CONSORT' && !['COLD_PALACE', 'PRISON', 'DEAD'].includes(person.status));
    if (!mother) return;
    migrated[child.id] = childLivesWithMother(mother)
      ? { ...child, residence: mother.residence, sceneId: mother.sceneId }
      : { ...child, residence: '撷芳殿', sceneId: 'xiefang' };
  });
  return migrated;
}
const defaultAmbitionByKind: Partial<Record<import('./gameState').PersonKind, number>> = {
  EMPEROR: 0,
  DOWAGER: 60,
  NOBLE: 30,
  COURT_LADY: 25,
  EUNUCH: 38,
};
function ensureAmbition(people: Record<string, PersonRecord>) {
  const migrated = { ...people };
  Object.values(people).forEach((person) => {
    if (person.stats['野心'] !== undefined) return;
    const fallback = defaultAmbitionByKind[person.kind];
    if (fallback === undefined) return;
    migrated[person.id] = { ...person, stats: { ...person.stats, 野心: fallback } };
  });
  return migrated;
}
function migrateRoyalParentLinks(people: Record<string, PersonRecord>, relationships: RelationshipRecord[]) {
  const migrated = { ...people };
  Object.values(people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').forEach((child) => {
    const parentRelations = relationships.filter((relation) => relation.kind === 'PARENT_CHILD' && relation.personBId === child.id);
    const biological = parentRelations.find((relation) => relation.labelB === '生母')?.personAId;
    const adoptive = parentRelations.find((relation) => relation.labelB === '养母')?.personAId;
    const fallback = !biological && !adoptive ? child.parents.map((id) => people[id]).find((parent) => parent?.kind === 'CONSORT')?.id : undefined;
    if (biological || adoptive || fallback) migrated[child.id] = { ...migrated[child.id], motherId: migrated[child.id].motherId ?? biological ?? fallback, adoptiveMotherId: migrated[child.id].adoptiveMotherId ?? adoptive };
  });
  return migrated;
}
const people: PersonRecord[] = [
  { id: 'emperor', kind: 'EMPEROR', name: demoEmperor.name, sex: 'MALE', birthDate: { year: -21, month: 4, day: 12 }, age: 24, title: '大曜皇帝', sceneId: 'yangxin-base', status: 'NORMAL', assets: { avatar: 'portrait.emperor', portrait: 'portrait.emperor' }, parents: ['empress-dowager'], children: [], stats: { 文: 72, 武: 58, 政治: 66, 民生: 61, 魅力: 78, 健康: 83, 快乐: 60, 野心: 0 }, traits: ['勤政'] },
  { id: 'empress', kind: 'CONSORT', name: '沈清和', sex: 'FEMALE', birthDate: { year: -20, month: 8, day: 9 }, age: 23, title: '皇后', rank: '皇后', residence: '坤宁宫主殿', sceneId: 'kuning:主殿', status: 'NORMAL', assets: { avatar: 'portrait.empress', portrait: 'empress.01' }, parents: [], children: [], stats: { 才情: 81, 礼仪: 94, 容貌: 85, 健康: 82, 野心: 55, 宠爱: 76 }, traits: ['端庄', '持重'] },
  { id: 'empress-dowager', kind: 'DOWAGER', name: '孝和太后', sex: 'FEMALE', birthDate: { year: -55, month: 2, day: 16 }, age: 58, title: '皇太后', rank: '皇太后', residence: '慈宁宫', sceneId: 'cining', status: 'NORMAL', assets: { avatar: 'dowager.01', portrait: 'dowager.01' }, parents: [], children: ['emperor'], stats: { 才情: 76, 礼仪: 96, 容貌: 68, 健康: 73, 威望: 94, 谋略: 82, 宠爱: 70, 野心: 60 }, traits: ['慈严', '通达'], dialogue: '皇帝既来了，便陪哀家说说朝中近况吧。' },
  { id: 'consort-dowager', kind: 'NOBLE', name: '荣太妃', sex: 'FEMALE', birthDate: { year: -50, month: 9, day: 7 }, age: 53, title: '太妃', rank: '太妃', residence: '寿康宫', sceneId: 'shoukang', status: 'NORMAL', assets: { avatar: 'noble.01', portrait: 'noble.01' }, parents: [], children: [], stats: { 才情: 83, 礼仪: 89, 容貌: 72, 健康: 78, 威望: 76, 谋略: 69, 宠爱: 55, 野心: 30 }, traits: ['温厚', '寡言'], dialogue: '寿康宫一切安好，劳陛下挂念。' },
  { id: 'minister-001', kind: 'MINISTER', name: '沈砚之', sex: 'MALE', birthDate: { year: -43, month: 1, day: 5 }, age: 46, title: '翰林学士', rank: '正五品', office: '翰林院', sceneId: 'wenhua', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 82, 武略: 28, 野心: 61, 忠诚: 71, 派系影响: 67, 已知财富: 54 }, traits: ['严谨', '果断'] },
  { id: 'minister-002', kind: 'MINISTER', name: '傅弘毅', sex: 'MALE', birthDate: { year: -50, month: 3, day: 8 }, age: 53, title: '太傅', rank: '正一品', office: '太傅', sceneId: 'taihe', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 90, 武略: 38, 野心: 44, 忠诚: 84, 派系影响: 88, 已知财富: 72 }, traits: ['老成', '清正'] },
  { id: 'minister-003', kind: 'MINISTER', name: '顾廷钧', sex: 'MALE', birthDate: { year: -39, month: 7, day: 18 }, age: 42, title: '吏部尚书', rank: '正二品', office: '吏部尚书', sceneId: 'qianqing-gate', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 85, 武略: 35, 野心: 69, 忠诚: 73, 派系影响: 79, 已知财富: 66 }, traits: ['圆融', '善断'] },
  { id: 'minister-004', kind: 'MINISTER', name: '谢怀瑾', sex: 'MALE', birthDate: { year: -44, month: 11, day: 2 }, age: 46, title: '兵部尚书', rank: '从一品', office: '兵部尚书', sceneId: 'military', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 77, 武略: 86, 野心: 58, 忠诚: 79, 派系影响: 74, 已知财富: 52 }, traits: ['刚毅', '持重'] },
  { id: 'minister-005', kind: 'MINISTER', name: '陆文澜', sex: 'MALE', birthDate: { year: -34, month: 5, day: 22 }, age: 37, title: '户部侍郎', rank: '正三品', office: '户部侍郎', sceneId: 'household', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 81, 武略: 31, 野心: 64, 忠诚: 68, 派系影响: 61, 已知财富: 83 }, traits: ['精算', '谨慎'] },
  { id: 'minister-006', kind: 'MINISTER', name: '裴景川', sex: 'MALE', birthDate: { year: -31, month: 9, day: 14 }, age: 34, title: '礼部侍郎', rank: '正三品', office: '礼部侍郎', sceneId: 'huitong', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 84, 武略: 29, 野心: 53, 忠诚: 76, 派系影响: 59, 已知财富: 48 }, traits: ['知礼', '机敏'] },
  { id: 'minister-007', kind: 'MINISTER', name: '方肃', sex: 'MALE', birthDate: { year: -47, month: 2, day: 11 }, age: 50, title: '宗令', rank: '从二品', office: '宗人府宗令', sceneId: 'clan', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 78, 武略: 45, 野心: 49, 忠诚: 82, 派系影响: 71, 已知财富: 69 }, traits: ['守礼', '严峻'] },
  { id: 'minister-008', kind: 'MINISTER', name: '霍云峥', sex: 'MALE', birthDate: { year: -29, month: 12, day: 3 }, age: 32, title: '禁军统领', rank: '正四品', office: '禁军统领', sceneId: 'drill', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 65, 武略: 92, 野心: 47, 忠诚: 88, 派系影响: 56, 已知财富: 45 }, traits: ['勇毅', '忠直'] },
  { id: 'attendant', kind: 'EUNUCH', name: '值房内侍', sex: 'MALE', birthDate: { year: -31, month: 9, day: 2 }, age: 34, title: '通传内侍', rank: '正七品', office: '内侍省', sceneId: 'taihe', status: 'NORMAL', assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [], stats: { 智慧: 63, 武略: 18, 野心: 42, 忠诚: 74, 派系影响: 31, 已知财富: 28 }, traits: ['谨慎', '机敏'] },
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
    palaceCases: [],
    gameSettings: { pregnancyRate: 30, maleBirthRate: 50, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 },
    saveId: 'autosave',
    updatedAt: Date.now(),
    clock,
    speed: 1,
    weather: weatherForDate(clock),
    finances: { ...initialFinances },
    gifts: { inventory: { ...initialGiftState.inventory }, history: [] },
    people: Object.fromEntries(people.map((person) => [person.id, { ...person, stats: { ...normalizePalacePerson(person).stats }, parents: [...person.parents], children: [...person.children], traits: [...person.traits], miscarriageCount: person.miscarriageCount ?? 0, infertile: person.infertile ?? false }])),
    pregnancies: [],
    visits: [],
    events: [],
    history: [],
    relationships: relationships.map((relationship) => ({ ...relationship })),
    sixPalaceAssistants: [],
    palaceSelection: null,
    royalMarriages: [],
    crownPrinceId: null,
    courtSession: null,
    civilExam: null,
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
  const normalizedPeople = Object.fromEntries(Object.entries(mergedPeople).map(([id, person]) => {
    const normalized = initial.people[id] ? { ...person, stats: { ...initial.people[id].stats, ...person.stats } } : person;
    const named = { ...normalized, name: normalizePersonName(normalized.name) };
    if (named.kind !== 'CONSORT') return [id, named];
    if (named.sceneId && named.sceneId !== 'inner-palace') return [id, named];
    const residence = parseResidenceLabel(named.residence);
    const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
    return [id, sceneId ? { ...named, sceneId } : named];
  }));
  const people = ensureAmbition(migrateRoyalChildResidences(migrateRoyalTitles(Object.fromEntries(
    Object.entries(normalizedPeople).map(([id, person]) => [id, normalizePalacePerson(normalizeHeirStats(person))]),
  ))));
  const palaceSelection = stored.palaceSelection
    ? {
      ...stored.palaceSelection,
      candidates: stored.palaceSelection.candidates.map((candidate) => ({
        ...candidate,
        name: normalizePersonName(candidate.name),
      })),
    }
    : null;
  const migratedRelationships = normalizePalaceRelationships(people, stored.relationships ?? initial.relationships);
  const linkedPeople = migrateRoyalParentLinks(people, migratedRelationships);
  return normalizePersonLife({
    ...initial,
    ...stored,
    version: 1,
    palaceCases: stored.palaceCases ?? [],
    gameSettings: {
      pregnancyRate: normalizeRate(stored.gameSettings?.pregnancyRate, 30),
      maleBirthRate: normalizeRate(stored.gameSettings?.maleBirthRate, 50),
      miscarriageRate: normalizeRate(stored.gameSettings?.miscarriageRate, 10),
      postMiscarriageInfertilityRate: normalizeRate(stored.gameSettings?.postMiscarriageInfertilityRate, 5),
      twinRate: normalizeRate(stored.gameSettings?.twinRate, 3),
    },
    people: Object.fromEntries(Object.entries(linkedPeople).map(([id, person]) => [id, { ...person, miscarriageCount: Number.isFinite(person.miscarriageCount) ? Math.max(0, Math.floor(person.miscarriageCount!)) : 0, infertile: person.infertile === true }])),
    pregnancies: (stored.pregnancies ?? []).map((pregnancy) => ({ ...pregnancy, fetusCount: pregnancy.fetusCount === 2 ? 2 as const : 1 as const })),
    visits: stored.visits ?? [],
    events: stored.events ?? [],
    history: stored.history ?? [],
    relationships: migratedRelationships,
    finances: {
      nationalTreasury: normalizeMoney(stored.finances?.nationalTreasury, initial.finances.nationalTreasury),
      gold: normalizeMoney(stored.finances?.gold, initial.finances.gold),
      yuanbao: normalizeMoney(stored.finances?.yuanbao, initial.finances.yuanbao),
      lastPayrollKey: stored.finances?.lastPayrollKey,
    },
    gifts: { inventory: { ...initial.gifts.inventory, ...(stored.gifts?.inventory ?? {}) }, history: stored.gifts?.history ?? [] },
    sixPalaceAssistants: stored.sixPalaceAssistants ?? [],
    palaceSelection,
    royalMarriages: stored.royalMarriages ?? [],
    crownPrinceId: stored.crownPrinceId ?? null,
    courtSession: stored.courtSession ?? null,
    civilExam: stored.civilExam ?? null,
    usedNames: {
      consorts: [...new Set([...(stored.usedNames?.consorts ?? []), ...Object.values(people).filter((person) => person.kind === 'CONSORT').map((person) => person.name)].map(normalizePersonName))],
      ministers: [...new Set([...(stored.usedNames?.ministers ?? []), ...Object.values(people).filter((person) => person.kind === 'MINISTER').map((person) => person.name)].map(normalizePersonName))],
      royals: [...new Set([...(stored.usedNames?.royals ?? []), ...Object.values(people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').map((person) => person.name)].map(normalizePersonName))],
    },
  });
}

function normalizeRate(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

function normalizeMoney(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}
