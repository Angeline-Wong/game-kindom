import { processHealth } from './health';
import { isPersonAlive, killPerson, normalizePersonLife, clampHealth } from './person';
import { consortVisitEligibility, expireGrounding, isGrounded } from './palacePunishments';
import { processPalaceCases } from './palaceCases';
import { advanceClock, type GameClock, type TimeSpeed } from './clock';
import type { WeatherKind } from '../components/WeatherEffects';
import { calculateAge, clockDate, type GameDate, type GameEvent, type GameState, type HistoryEntry, type PersonRecord } from './gameState';
import { CONSORT_HONORIFICS, isValidRoyalName, royalBirthIdentity } from './royalNames';
import { processPalaceSelection } from './palaceSelection';
import { canOccupyMainHall, getAvailableMainHalls, getResidenceSceneId, parseResidenceLabel, type ConsortRank } from './residences';
import { getNextPromotionOption } from './ranks';
import { toChineseNumber } from './chineseNumbers';
import { applyRoyalBanquetLocations, processRoyalMarriagesForDay } from './royalMarriage';
import { MINISTER_NAME_POOL_ALL, pickUnusedNames } from './namePools';
import { processMonthlyStipends } from './economy';
import { childLivesWithMother } from './heirCare';
import { normalizeHeirStats } from './heirEducation';
import { applyConsortGrowth } from './consortGrowth';
import { processCivilExamForDay } from './civilExam';
import { clearSummonedRoyals } from './royalRoster';
import { calculateDailyMiscarriageChance, rollFetusCount, shouldBecomeInfertile } from './pregnancyRules';

function royalOrdinal(value: number) { return value === 1 ? '大' : toChineseNumber(value); }

function legacyBirthOrder(person: PersonRecord) {
  if (Number.isInteger(person.birthOrder) && person.birthOrder! > 0) return person.birthOrder!;
  const title = person.preHeirTitle ?? person.title;
  const match = title.match(/^(?:皇)?(大|长|次|[一二三四五六七八九十]+)皇?(?:皇子|子|公主|女)$/);
  if (!match) return undefined;
  if (match[1] === '大' || match[1] === '长') return 1;
  if (match[1] === '次' || match[1] === '二') return 2;
  const digits = '一二三四五六七八九十';
  return match[1].split('').reduce((value, digit) => value * 10 + digits.indexOf(digit) + 1, 0);
}

function nextBirthOrder(people: Record<string, PersonRecord>, kind: 'PRINCE' | 'PRINCESS') {
  return Object.values(people).filter((person) => person.kind === kind)
    .map(legacyBirthOrder).filter((value): value is number => Number.isInteger(value))
    .reduce((max, value) => Math.max(max, value), 0) + 1;
}

function daysInMonth(month: number) {
  return month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function compareDate(a: GameDate, b: GameDate) {
  return a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : a.day - b.day;
}

export function nextDate(date: GameDate): GameDate {
  let { year, month, day } = date;
  day += 1;
  if (day > daysInMonth(month)) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

export function addMonths(date: GameDate, count: number): GameDate {
  const zeroBased = date.year * 12 + date.month - 1 + count;
  const year = Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(month)) };
}

function seedForDate(date: GameDate, salt = 0) {
  let value = (date.year + 997) * 73856093 ^ date.month * 19349663 ^ date.day * 83492791 ^ salt;
  value = Math.imul(value ^ (value >>> 16), 2246822507);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967296;
}

export function weatherForDate(date: GameDate): WeatherKind {
  const roll = seedForDate(date);
  if ([12, 1, 2].includes(date.month)) return roll < .26 ? '雪' : roll < .38 ? '雾' : '晴';
  if ([6, 7, 8].includes(date.month)) return roll < .48 ? '雨' : roll < .58 ? '雾' : '晴';
  if ([3, 4, 5].includes(date.month)) return roll < .32 ? '雨' : roll < .42 ? '雾' : '晴';
  return roll < .16 ? '雨' : roll < .32 ? '雾' : '晴';
}

function makeHistory(date: GameDate, type: string, summary: string, personIds: string[]): HistoryEntry {
  return { id: `history-${type}-${date.year}-${date.month}-${date.day}-${personIds.join('-')}`, date, type, summary, personIds };
}

function makePregnancyEvent(consort: PersonRecord, date: GameDate): GameEvent {
  return {
    id: `event-pregnancy-${consort.id}-${date.year}-${date.month}-${date.day}`,
    type: 'PREGNANCY_NOTICE', priority: 80, createdOn: date, personIds: [consort.id], title: '内侍传言',
    body: `${consort.residence ?? '宫中'}传来消息，${consort.name}已有喜脉，请陛下示下。`,
    choices: [
      { id: 'rejoice', label: '大喜', result: `得知${consort.name}有喜，皇帝龙心大悦。` },
      { id: 'visit', label: '前去关怀', result: `陛下亲往探视${consort.name}，宫中上下深受触动。` },
      { id: 'reward', label: '赏赐安胎', result: `已命内务府拨出安胎药材与赏银。` },
      { id: 'silence', label: '暂不声张', result: `喜脉暂未对外公布，后宫嫉妒风险降低。` },
    ], defaultChoiceId: 'rejoice', status: 'PENDING',
  };
}

function countConsortRanks(people: Record<string, PersonRecord>) {
  return Object.values(people).reduce<Partial<Record<ConsortRank, number>>>((counts, person) => {
    if (person.kind !== 'CONSORT' || !isPersonAlive(person)) return counts;
    const rank = (person.rank ?? person.title) as ConsortRank;
    counts[rank] = (counts[rank] ?? 0) + 1;
    return counts;
  }, {});
}

function getBirthPromotionTarget(currentRank: string, counts: Partial<Record<ConsortRank, number>>, steps: number) {
  let rank = currentRank;
  const projectedCounts = { ...counts };
  for (let index = 0; index < steps; index += 1) {
    const next = getNextPromotionOption(rank, projectedCounts);
    if (!next?.available) return undefined;
    projectedCounts[next.label as ConsortRank] = (projectedCounts[next.label as ConsortRank] ?? 0) + 1;
    rank = next.label;
  }
  return { label: rank as ConsortRank };
}

function makeBirthEvent(mother: PersonRecord, children: PersonRecord[], date: GameDate, people: Record<string, PersonRecord>): GameEvent {
  const rank = mother.rank ?? mother.title;
  const motherDisplayName = mother.name.includes(rank) ? mother.name : `${rank}${mother.name}`;
  const isEmpress = rank === '皇后';
  const promotionSteps = children.length > 1 ? 2 : 1;
  const promotion = !isEmpress ? getBirthPromotionTarget(rank, countConsortRanks(people), promotionSteps) : undefined;
  const choices: GameEvent['choices'] = [
    { id: 'birth-treasure', label: '赏赐珍宝', result: `已开国库，可为${motherDisplayName}择取贺生珍宝。` },
    { id: 'birth-rejoice', label: '大喜过望', result: `皇帝得闻皇嗣平安降生，龙心大悦。` },
    { id: 'birth-visit', label: '前去关怀', result: `陛下亲往${mother.residence ?? '宫中'}探视${motherDisplayName}与新生皇嗣。` },
  ];
  if (!isEmpress) {
    if (promotion) {
      choices.splice(1, 0, { id: 'birth-promote', label: promotionSteps === 2 ? '晋升位份（连升两级）' : '晋升位份', result: `${motherDisplayName}以诞育皇嗣之功，位份晋升${promotionSteps === 2 ? '两级' : '一级'}。` });
    } else if (!mother.honorific) {
      choices.splice(1, 0, { id: 'birth-honorific', label: '赏赐封号', result: `${motherDisplayName}诞育皇嗣有功，特赐封号，以示恩宠。` });
    }
  }
  const body = children.length === 1
    ? `${mother.residence ?? '宫中'}传来喜讯，${motherDisplayName}平安诞下${children[0].kind === 'PRINCE' ? '皇子' : '公主'}。`
    : `${mother.residence ?? '宫中'}传来喜讯，${motherDisplayName}平安生产，一胎诞下${children.length}名皇嗣。${children.some((child) => child.kind === 'PRINCE') && children.some((child) => child.kind === 'PRINCESS') ? '此乃龙凤呈祥。' : '宫中上下皆为双生皇嗣之喜而庆贺。'}`;
  return {
    id: `event-birth-${children[0].id}`, type: 'BIRTH_NOTICE', priority: 100, createdOn: date, personIds: [mother.id, ...children.map((child) => child.id)], title: '内侍传言',
    body,
    choices, defaultChoiceId: 'birth-rejoice', status: 'PENDING',
  };
}
export function mortalityChance(person: PersonRecord) {
  if (person.id === 'emperor' || person.id === 'attendant' || !isPersonAlive(person)) return 0;
  const ageRisk = person.age < 50 ? .00002 : person.age < 60 ? .00008 : ((person.age - 55) ** 2) / 500_000;
  const health = person.stats['健康'] ?? 72;
  const healthRisk = Math.max(0, 45 - health) / 18_000;
  return Math.min(.08, ageRisk + healthRisk);
}

function createMinisterSuccessor(deceased: PersonRecord, date: GameDate, salt: number, name: string): PersonRecord {
  const roll = seedForDate(date, salt + deceased.id.length * 17);
  const age = 27 + Math.floor(roll * 18);
  const ability = 62 + Math.floor(seedForDate(date, salt + 91) * 28);
  return {
    id: `minister-${date.year}-${date.month}-${date.day}-${salt}`,
    kind: 'MINISTER', name, sex: 'MALE', birthDate: { year: date.year - age, month: date.month, day: date.day }, age,
    title: deceased.office ?? deceased.title, rank: deceased.rank, office: deceased.office, sceneId: deceased.sceneId, status: 'NORMAL',
    assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [],
    stats: { 智慧: ability, 武略: 45 + Math.floor(roll * 32), 野心: 35 + Math.floor(seedForDate(date, salt + 27) * 50), 忠诚: 55 + Math.floor(seedForDate(date, salt + 43) * 35), 派系影响: 30, 已知财富: 35 + Math.floor(seedForDate(date, salt + 59) * 35) },
    traits: [roll > .5 ? '稳健' : '进取'],
  };
}

export function processDailyLifeCycle(state: GameState, date: GameDate): GameState {
  state = normalizePersonLife(state, date);
  const people = { ...state.people };
  const relationships = [...state.relationships];
  const history = [...state.history];
  const usedMinisterNames = [...state.usedNames.ministers];
  const deaths: PersonRecord[] = [];
  Object.values(people).forEach((person, index) => {
    if (mortalityChance(person) <= 0) return;
    const salt = [...person.id].reduce((sum, character) => sum + character.charCodeAt(0), index * 31);
    if (seedForDate(date, salt) >= mortalityChance(person)) return;
    const killed = killPerson({ ...state, people, history }, person.id, '疾病或意外', date);
    Object.assign(people, killed.people);
    state = killed;
    deaths.push(person);
    history.push(...killed.history.filter(entry => !history.some(h => h.id === entry.id)));
  });
  deaths.filter((person) => person.kind === 'MINISTER').forEach((deceased, index) => {
    const salt = index + deaths.length + 1;
    const successorName = pickUnusedNames(MINISTER_NAME_POOL_ALL, usedMinisterNames, 1, date.year * 372 + date.month * 31 + date.day + salt)[0];
    if (!successorName) return;
    usedMinisterNames.push(successorName);
    const successor = createMinisterSuccessor(deceased, date, salt, successorName);
    people[successor.id] = successor;
    relationships.push({ id: `rel-emperor-${successor.id}`, personAId: 'emperor', personBId: successor.id, kind: 'SOVEREIGN_SUBJECT', labelA: '臣属', labelB: '君主', affinity: 55, trust: successor.stats['忠诚'] ?? 60 });
    history.push(makeHistory(date, 'OFFICIAL_SUCCESSION', `${deceased.office ?? deceased.title}出缺，${successor.name}奉旨补授${successor.office ?? successor.title}。`, ['emperor', deceased.id, successor.id]));
  });
  return deaths.length ? { ...state, people, relationships, history, usedNames: { ...state.usedNames, ministers: usedMinisterNames } } : state;
}

function processDay(state: GameState, date: GameDate): GameState {
  state = normalizePersonLife(state, date);
  state = clearSummonedRoyals(state);
  let next = { ...state, people: { ...state.people }, events: [...state.events], visits: [...state.visits], pregnancies: [...state.pregnancies], history: [...state.history], relationships: [...state.relationships] };
  const people = Object.values(next.people).map((person) => {
    if (!isPersonAlive(person)) return person;
    const rested = person.status === 'REST' && person.restUntil && compareDate(person.restUntil, date) <= 0;
    return { ...person, age: calculateAge(person.birthDate, date), status: rested ? 'NORMAL' as const : person.status, restUntil: rested ? undefined : person.restUntil };
  });
  next.people = Object.fromEntries(people.map((person) => [person.id, person]));
  next.weather = weatherForDate(date);

  next = processHealth(next, date);
  next = processDailyLifeCycle(next, date);
  next = processMonthlyStipends(next, date);

  next = processPregnancies(next, date);
  next = expireGrounding(next, date);
  next = processRoyalMarriagesForDay(next, date);
  next = processCivilExamForDay(next, date);
  next = processPalaceCases(next, date);
  return next;
}

/** All delivery callers share the same mother-alive guard. */
export function processPregnancies(state: GameState, date: GameDate): GameState {
  let next = normalizePersonLife(state, date);
  next = { ...next, people: { ...next.people }, events: [...next.events], history: [...next.history], relationships: [...next.relationships] };
  next.pregnancies = next.pregnancies.map((pregnancy) => {
    if (pregnancy.status !== 'ACTIVE') return pregnancy;
    const mother = next.people[pregnancy.consortId];
    if (!isPersonAlive(mother)) return { ...pregnancy, status: 'LOST' as const };
    if (compareDate(pregnancy.dueOn, date) > 0) {
      const dailyChance = calculateDailyMiscarriageChance({
        totalRate: next.gameSettings?.miscarriageRate ?? 10,
        gestationDays: 300,
        health: mother.stats['健康'] ?? 70,
        fetusCount: pregnancy.fetusCount ?? 1,
        illness: Boolean(mother.illness),
        miscarriageCount: mother.miscarriageCount ?? 0,
      });
      if (seedForDate(date, pregnancy.id.length + 701) >= dailyChance) return pregnancy;
      const miscarriageCount = (mother.miscarriageCount ?? 0) + 1;
      const healthLoss = Math.round(15 * (pregnancy.fetusCount === 2 ? 1.5 : 1));
      const infertile = shouldBecomeInfertile({
        baseRate: next.gameSettings?.postMiscarriageInfertilityRate ?? 5,
        miscarriageCount,
        health: Math.max(0, (mother.stats['健康'] ?? 70) - healthLoss),
        roll: seedForDate(date, pregnancy.id.length + 907),
      });
      next.people[mother.id] = {
        ...mother,
        status: 'NORMAL',
        miscarriageCount,
        infertile: Boolean(mother.infertile || infertile),
        stats: { ...mother.stats, 健康: clampHealth(Math.max(1, (mother.stats['健康'] ?? 70) - healthLoss)) },
      };
      const infertilityText = infertile ? '太医回禀，此次小产伤及根本，恐怕日后再难有孕。' : '';
      next.events.push({
        id: `event-miscarriage-${pregnancy.id}`,
        type: 'MISCARRIAGE_NOTICE', priority: 95, createdOn: date, personIds: [mother.id], title: '小产',
        body: `${mother.rank ?? mother.title} · ${mother.name}近日身体不适，太医诊视后确认腹中皇嗣未能保住。${mother.name}失去了腹中的孩子。健康 -${healthLoss}。${infertilityText}`,
        choices: [
          { id: 'comfort', label: '前去安抚', result: `陛下亲往安抚${mother.name}，命太医悉心调养。` },
          { id: 'medical', label: '召太医诊治', result: `已命太医院为${mother.name}调理身体。` },
          { id: 'silence', label: '暂不声张', result: `小产之事暂不声张，命内侍妥善处理。` },
        ], defaultChoiceId: 'comfort', status: 'PENDING',
      });
      next.history.push(makeHistory(date, 'MISCARRIAGE', `${mother.name}小产，健康 -${healthLoss}。${infertilityText}`, [mother.id, 'emperor']));
      if (infertile) next.history.push(makeHistory(date, 'INFERTILITY', `${mother.name}因小产伤及根本，永久不孕。`, [mother.id]));
      return { ...pregnancy, status: 'LOST' as const };
    }
    if (!isPersonAlive(next.people[mother.id]) || next.people[mother.id].status !== 'PREGNANT') return { ...pregnancy, status: 'LOST' as const };
    const children: PersonRecord[] = [];
    const fetusCount = pregnancy.fetusCount ?? 1;
    for (let index = 0; index < fetusCount; index += 1) {
      const male = seedForDate(date, pregnancy.id.length + index * 113) < (next.gameSettings?.maleBirthRate ?? 50) / 100;
      const kind = male ? 'PRINCE' : 'PRINCESS';
      const birthOrder = nextBirthOrder(next.people, kind);
      const birthIdentity = royalBirthIdentity({ kind, birthOrder, title: '' });
      const child: PersonRecord = normalizeHeirStats({
        id: `child-${date.year}-${date.month}-${date.day}-${kind.toLowerCase()}-${birthOrder}`,
        kind, name: male ? `待赐名皇子${toChineseNumber(birthOrder)}` : `待赐名公主${toChineseNumber(birthOrder)}`, named: false, sex: male ? 'MALE' : 'FEMALE', birthDate: date, age: 0,
        title: birthIdentity, motherId: mother.id, adoptiveMotherId: undefined, birthOrder, residence: childLivesWithMother(mother) ? mother.residence : '撷芳殿', sceneId: childLivesWithMother(mother) ? mother.sceneId : 'xiefang', status: 'NORMAL',
        assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' }, parents: ['emperor', mother.id], children: [], stats: { 健康: 80 }, traits: [],
      });
      children.push(child);
      next.people[child.id] = child;
      next.people.emperor = { ...next.people.emperor, children: [...next.people.emperor.children, child.id] };
      next.relationships.push(
        { id: `rel-emperor-${child.id}`, personAId: 'emperor', personBId: child.id, kind: 'PARENT_CHILD', labelA: child.kind === 'PRINCE' ? '皇子' : '公主', labelB: '父皇', affinity: 70, trust: 65 },
        { id: `rel-${mother.id}-${child.id}`, personAId: mother.id, personBId: child.id, kind: 'PARENT_CHILD', labelA: child.kind === 'PRINCE' ? '亲生皇子' : '亲生公主', labelB: '生母', affinity: 92, trust: 88 },
      );
    }
    next.people[mother.id] = { ...mother, status: 'REST', restUntil: addMonths(date, 3), children: [...mother.children, ...children.map((child) => child.id)], stats: { ...mother.stats, 健康: clampHealth(Math.max(1, (mother.stats['健康'] ?? 80) - 8 * (fetusCount === 2 ? 1.5 : 1))) } };
    next.events.push(makeBirthEvent(mother, children, date, next.people));
    next.history.push(makeHistory(date, 'BIRTH', `${mother.name}诞下${fetusCount === 2 ? '双生皇嗣' : children[0].kind === 'PRINCE' ? '皇子' : '公主'}。`, [mother.id, ...children.map((child) => child.id), 'emperor']));
    return { ...pregnancy, status: 'DELIVERED' as const };
  });
  return next;
}

function processVisitsAtCourtHour(state: GameState, date: GameDate, minuteOfDay: number): GameState {
  if (minuteOfDay < 360) return state;
  let next = { ...state, people: { ...state.people }, events: [...state.events], visits: [...state.visits], pregnancies: [...state.pregnancies], history: [...state.history] };
  next.visits = next.visits.map((visit) => {
    if (visit.status !== 'PENDING' || compareDate(visit.scheduledOn, date) >= 0 || minuteOfDay < visit.processAfterMinute) return visit;
    const consort = next.people[visit.consortId];
    if (!consortVisitEligibility(consort, date).allowed) {
      next.history.push(makeHistory(date, 'VISIT_CANCELLED', `待结算侍寝已取消：${consortVisitEligibility(consort, date).reason}`, [visit.consortId, 'emperor']));
      return { ...visit, status: 'CANCELLED' as const };
    }
    const alreadyPregnant = next.pregnancies.some((pregnancy) => pregnancy.consortId === visit.consortId && pregnancy.status === 'ACTIVE');
    const health = consort?.stats['健康'] ?? 70;
    const chance = (next.gameSettings?.pregnancyRate ?? 30) / 100;
    if (consort && !alreadyPregnant && !consort.infertile && isPersonAlive(consort) && seedForDate(date, visit.id.length + visit.consortId.length) < chance) {
      const pregnancy = { id: `pregnancy-${visit.id}`, consortId: consort.id, fatherId: 'emperor', conceivedOn: date, dueOn: addMonths(date, 10), status: 'ACTIVE' as const, risk: Math.max(5, 100 - health), fetusCount: rollFetusCount(next.gameSettings?.twinRate ?? 3, seedForDate(date, visit.id.length + visit.consortId.length + 313)) };
      next.pregnancies.push(pregnancy);
      next.people[consort.id] = { ...consort, status: 'PREGNANT' };
      next.events.push(makePregnancyEvent(consort, date));
      next.history.push(makeHistory(date, 'PREGNANCY', `${consort.name}经太医诊断已有喜脉。`, [consort.id, 'emperor']));
    }
    return { ...visit, status: 'PROCESSED' as const };
  });
  return next;
}

function homeScene(person: PersonRecord) {
  const residence = parseResidenceLabel(person.residence);
  return residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
}

export function updateConsortLocations(state: GameState, date: GameDate, minuteOfDay: number, pinnedSceneId?: string | null): GameState {
  const people = { ...state.people };
  const consorts = Object.values(people).filter((person) => person.kind === 'CONSORT' && isPersonAlive(person));
  const isDaytime = minuteOfDay >= 480 && minuteOfDay < 1080;

  consorts.forEach((person, index) => {
    if (pinnedSceneId && person.sceneId === pinnedSceneId) return;
    const home = homeScene(person);
    if (!home) return;
    const restricted = Boolean(person.illness) || (person.stats['健康'] ?? 100) < 50 || isGrounded(person, date) || person.status === 'REST' || person.status === 'SICK' || person.status === 'CONFINED' || person.status === 'COLD_PALACE' || person.status === 'PRISON' || !isPersonAlive(person);
    const salt = person.id.split('').reduce((total, char) => total + char.charCodeAt(0), index);
    const outingChance = person.status === 'PREGNANT' ? .12 : .25;
    const goesOutToday = seedForDate(date, salt) < outingChance;
    const mustStayHome = !isDaytime || restricted || !goesOutToday;
    let sceneId = home;
    if (!mustStayHome) {
      const otherHomes = consorts.filter((other) => other.id !== person.id).map(homeScene).filter((item): item is string => Boolean(item));
      const destinations = person.rank === '皇后' ? ['jiaotai', 'garden', ...otherHomes] : ['garden', 'jiaotai', ...otherHomes];
      sceneId = destinations[Math.floor(seedForDate(date, salt + 97) * destinations.length)] ?? home;
      if (sceneId === home) sceneId = destinations.find((candidate) => candidate !== home) ?? home;
    }
    if (person.sceneId !== sceneId) people[person.id] = { ...person, sceneId };
  });

  const royalChildren = Object.values(people).filter((person) => (person.kind === 'PRINCE' || person.kind === 'PRINCESS') && isPersonAlive(person));
  royalChildren.forEach((child, index) => {
    const mother = child.parents.map((id) => people[id]).find((person) => person?.kind === 'CONSORT');
    if (!isPersonAlive(mother) || !childLivesWithMother(mother) || child.residence !== mother.residence) return;
    if (pinnedSceneId && child.sceneId === pinnedSceneId) return;
    const restricted = Boolean(child.illness) || (child.stats['健康'] ?? 100) < 50 || ['SICK', 'CONFINED', 'PRISON', 'DEAD'].includes(child.status);
    const salt = child.id.split('').reduce((total, char) => total + char.charCodeAt(0), index + 211);
    const outingChance = child.age < 3 ? .05 : .18;
    const goesOut = isDaytime && !restricted && seedForDate(date, salt) < outingChance;
    const destination = child.age >= 5 && seedForDate(date, salt + 37) < .72 ? 'xiefang' : 'garden';
    const sceneId = goesOut ? destination : (homeScene(mother) ?? mother.sceneId);
    if (child.sceneId !== sceneId) people[child.id] = { ...child, sceneId };
  });
  return Object.keys(people).some((id) => people[id] !== state.people[id]) ? { ...state, people } : state;
}

export function advanceGameState(state: GameState, realMs: number, speed: TimeSpeed = state.speed, pinnedSceneId?: string | null): GameState {
  const clock = advanceClock(state.clock, realMs, speed);
  if (clock === state.clock) return state;
  let next = { ...state, clock, speed, updatedAt: Date.now() };
  let cursor = clockDate(state.clock);
  const target = clockDate(clock);
  while (compareDate(cursor, target) < 0) {
    cursor = nextDate(cursor);
    next = processDay(next, cursor);
  }
  next = processVisitsAtCourtHour(next, target, clock.minuteOfDay);
  next = processPalaceSelection(next, target);
  return applyRoyalBanquetLocations(updateConsortLocations(next, target, clock.minuteOfDay, pinnedSceneId), target, clock.minuteOfDay);
}

export function skipGameYears(state: GameState, years: 1 | 3 | 5): GameState {
  const originalSpeed = state.speed;
  const advanced = advanceGameState(state, years * 365 * 1440 * 50, 1);
  return {
    ...advanced,
    speed: originalSpeed,
    history: [...advanced.history, makeHistory(clockDate(advanced.clock), 'TIME_SKIP', `皇帝于设置工具栏中跳过${years}年，期间宫廷事务仍依日历正常结算。`, ['emperor'])],
  };
}

function calendarDaysUntil(from: GameDate, target: GameDate) {
  let cursor = from;
  let days = 0;
  while (compareDate(cursor, target) < 0) {
    cursor = nextDate(cursor);
    days += 1;
  }
  return days;
}

/** 按自然月推进，保留当日时刻并逐日执行生育、俸禄与事件结算。 */
export function skipGameMonths(state: GameState, months: 1 = 1): GameState {
  const originalSpeed = state.speed;
  const targetDate = addMonths(clockDate(state.clock), months);
  const days = calendarDaysUntil(clockDate(state.clock), targetDate);
  const advanced = advanceGameState(state, days * 1440 * 50, 1);
  return {
    ...advanced,
    speed: originalSpeed,
    history: [...advanced.history, makeHistory(clockDate(advanced.clock), 'TIME_SKIP', `皇帝于设置工具栏中跳过${months === 1 ? '一' : toChineseNumber(months)}个月，期间宫廷事务仍依日历正常结算。`, ['emperor'])],
  };
}
export function schedulePalaceVisit(state: GameState, consortId: string): GameState {
  if (!consortVisitEligibility(state.people[consortId], clockDate(state.clock)).allowed) return state;
  const date = clockDate(state.clock);
  const id = `visit-${consortId}-${date.year}-${date.month}-${date.day}`;
  if (state.visits.some((visit) => visit.id === id)) return state;
  const relationships = state.relationships.map((relationship) => {
    const matches = (relationship.personAId === 'emperor' && relationship.personBId === consortId) || (relationship.personBId === 'emperor' && relationship.personAId === consortId);
    return matches ? { ...relationship, affinity: Math.min(100, relationship.affinity + 4), trust: Math.min(100, relationship.trust + 2) } : relationship;
  });
  const growth = applyConsortGrowth(state.people[consortId], { 宠爱: 8 });
  return {
    ...state,
    people: { ...state.people, [consortId]: growth.person },
    relationships,
    visits: [...state.visits, { id, consortId, scheduledOn: date, processAfterMinute: 360, status: 'PENDING' }],
    history: [...state.history, makeHistory(date, 'VISIT', `皇帝今夜临幸${state.people[consortId]?.name ?? consortId}。`, ['emperor', consortId])],
  };
}

export function accompanyPregnantConsort(state: GameState, consortId: string): GameState {
  const consort = state.people[consortId];
  if (!isPersonAlive(consort) || consort.kind !== 'CONSORT' || consort.status !== 'PREGNANT') return state;
  const relationships = state.relationships.map((relationship) => {
    const matches = (relationship.personAId === 'emperor' && relationship.personBId === consortId) || (relationship.personBId === 'emperor' && relationship.personAId === consortId);
    return matches ? { ...relationship, affinity: Math.min(100, relationship.affinity + 3), trust: Math.min(100, relationship.trust + 3) } : relationship;
  });
  return {
    ...state,
    people: { ...state.people, [consortId]: { ...consort, stats: { ...consort.stats, 心情: Math.min(100, (consort.stats.心情 ?? 70) + 6) } } },
    relationships,
    history: [...state.history, makeHistory(clockDate(state.clock), 'COMPANION', `皇帝前往${consort.residence ?? '宫中'}陪伴有孕的${consort.name}。`, ['emperor', consortId])],
  };
}

export function resolveEvent(state: GameState, eventId: string, choiceId?: string): GameState {
  const event = state.events.find((item) => item.id === eventId);
  if (!event || event.status !== 'PENDING') return state;
  if (event.type !== 'SYSTEM_NOTICE' && event.personIds.some(id => !isPersonAlive(state.people[id]))) return { ...state, events: state.events.map(e => e.id === eventId ? { ...e, status: 'MISSED' as const } : e) };
  const choice = event.choices.find((item) => item.id === (choiceId ?? event.defaultChoiceId));
  const events = state.events.map((item) => item.id === eventId ? { ...item, status: 'RESOLVED' as const, result: choice?.result ?? '此事已知悉。' } : item);
  const history = [...state.history, makeHistory(clockDate(state.clock), 'EVENT_CHOICE', `${event.body} ${choice?.label ?? '知悉'}：${choice?.result ?? ''}`, event.personIds)];
  if (event.type === 'PREGNANCY_NOTICE' && choice?.id === 'rejoice' && state.people.emperor) {
    const emperor = state.people.emperor;
    return {
      ...state,
      people: { ...state.people, emperor: { ...emperor, stats: { ...emperor.stats, 快乐: Math.min(100, (emperor.stats.快乐 ?? 60) + 8) } } },
      events,
      history,
    };
  }
  if (event.type === 'BIRTH_NOTICE' && choice) {
    const motherId = event.personIds[0];
    const mother = state.people[motherId];
    let people = { ...state.people };
    let relationships = state.relationships;
    if (choice.id === 'birth-rejoice' && people.emperor) {
      people.emperor = { ...people.emperor, stats: { ...people.emperor.stats, 快乐: Math.min(100, (people.emperor.stats.快乐 ?? 60) + 12) } };
    }
    if (choice.id === 'birth-promote' && mother) {
      const currentRank = (mother.rank ?? mother.title) as ConsortRank;
      const promotionSteps = event.personIds.length > 2 ? 2 : 1;
      const nextPromotion = getBirthPromotionTarget(currentRank, countConsortRanks(people), promotionSteps);
      if (nextPromotion) {
        const rank = nextPromotion.label;
        let promoted = { ...mother, rank, title: rank };
        const currentResidence = parseResidenceLabel(mother.residence);
        if (canOccupyMainHall(rank as ConsortRank) && currentResidence?.room !== '主殿') {
          const halls = getAvailableMainHalls(people);
          const hall = halls[Math.floor(seedForDate(clockDate(state.clock), mother.id.length + rank.length) * halls.length)];
          if (hall) promoted = { ...promoted, residence: `${hall.palace}${hall.room}`, sceneId: getResidenceSceneId(hall.palace, hall.room) ?? promoted.sceneId };
        }
        people[motherId] = promoted;
      }
    }
    if (choice.id === 'birth-honorific' && mother && !mother.honorific) {
      const usedHonorifics = new Set(Object.values(people).map((person) => person.honorific).filter(Boolean));
      const honorific = CONSORT_HONORIFICS.find((item) => !usedHonorifics.has(item));
      if (honorific) people[motherId] = { ...people[motherId], honorific };
    }    if (choice.id === 'birth-visit' && mother) {
      relationships = relationships.map((relationship) => {
        const matches = (relationship.personAId === 'emperor' && relationship.personBId === motherId) || (relationship.personBId === 'emperor' && relationship.personAId === motherId);
        return matches ? { ...relationship, affinity: Math.min(100, relationship.affinity + 5), trust: Math.min(100, relationship.trust + 4) } : relationship;
      });
      people[motherId] = { ...mother, stats: { ...mother.stats, 心情: Math.min(100, (mother.stats.心情 ?? 70) + 8) } };
    }
    return { ...state, people, relationships, events, history };
  }
  return { ...state, events, history };
}

export function nameRoyalChild(state: GameState, childId: string, name: string): GameState {
  const child = state.people[childId];
  const normalized = name.trim();
  if (!isPersonAlive(child) || (child.kind !== 'PRINCE' && child.kind !== 'PRINCESS') || !isValidRoyalName(normalized, childId, state.people, state.usedNames.royals)) return state;
  return {
    ...state,
    people: { ...state.people, [childId]: { ...child, name: normalized, named: true } },
    usedNames: { ...state.usedNames, royals: [...state.usedNames.royals, normalized] },
    history: [...state.history, makeHistory(clockDate(state.clock), 'ROYAL_NAMING', `皇帝为${child.title}赐名${normalized}。`, ['emperor', childId, ...child.parents.filter((id) => id !== 'emperor')])],
  };
}

export function currentEvent(state: GameState) {
  return state.events.filter((event) => event.status === 'PENDING').sort((a, b) => b.priority - a.priority)[0];
}
