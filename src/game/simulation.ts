import { advanceClock, type GameClock, type TimeSpeed } from './clock';
import type { WeatherKind } from '../components/WeatherEffects';
import { calculateAge, clockDate, type GameDate, type GameEvent, type GameState, type HistoryEntry, type PersonRecord } from './gameState';
import { isValidRoyalName } from './royalNames';
import { processPalaceSelection } from './palaceSelection';
import { canOccupyMainHall, getAvailableMainHalls, getResidenceSceneId, parseResidenceLabel, type ConsortRank } from './residences';
import { toChineseNumber } from './chineseNumbers';
import { applyRoyalBanquetLocations, processRoyalMarriagesForDay } from './royalMarriage';
import { MINISTER_NAME_POOL, pickUnusedNames } from './namePools';

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

function makeBirthEvent(mother: PersonRecord, child: PersonRecord, date: GameDate): GameEvent {
  const rank = mother.rank ?? mother.title;
  const motherDisplayName = mother.name.includes(rank) ? mother.name : `${rank}${mother.name}`;
  return {
    id: `event-birth-${child.id}`, type: 'BIRTH_NOTICE', priority: 100, createdOn: date, personIds: [mother.id, child.id], title: '内侍传言',
    body: `${mother.residence ?? '宫中'}传来喜讯，${motherDisplayName}平安诞下${child.kind === 'PRINCE' ? '皇子' : '公主'}。`,
    choices: [
      { id: 'birth-treasure', label: '赏赐珍宝', result: `已开国库，可为${motherDisplayName}择取贺生珍宝。` },
      { id: 'birth-promote', label: '晋升位份', result: `${motherDisplayName}以诞育皇嗣之功，位份晋升一级。` },
      { id: 'birth-rejoice', label: '大喜过望', result: `皇帝得闻皇嗣平安降生，龙心大悦。` },
      { id: 'birth-visit', label: '前去关怀', result: `陛下亲往${mother.residence ?? '宫中'}探视${motherDisplayName}与新生皇嗣。` },
    ], defaultChoiceId: 'birth-rejoice', status: 'PENDING',
  };
}

export function mortalityChance(person: PersonRecord) {
  if (person.id === 'emperor' || person.id === 'attendant' || person.status === 'DEAD') return 0;
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
  const people = { ...state.people };
  const relationships = [...state.relationships];
  const history = [...state.history];
  const usedMinisterNames = [...state.usedNames.ministers];
  const deaths: PersonRecord[] = [];
  Object.values(people).forEach((person, index) => {
    if (mortalityChance(person) <= 0) return;
    const salt = [...person.id].reduce((sum, character) => sum + character.charCodeAt(0), index * 31);
    if (seedForDate(date, salt) >= mortalityChance(person)) return;
    people[person.id] = { ...person, status: 'DEAD', dialogue: undefined };
    deaths.push(person);
    history.push(makeHistory(date, 'DEATH', `${person.name}因病或意外身故，享年${person.age}岁。`, [person.id]));
  });
  deaths.filter((person) => person.kind === 'MINISTER').forEach((deceased, index) => {
    const salt = index + deaths.length + 1;
    const successorName = pickUnusedNames(MINISTER_NAME_POOL, usedMinisterNames, 1, date.year * 372 + date.month * 31 + date.day + salt)[0];
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
  let next = { ...state, people: { ...state.people }, events: [...state.events], visits: [...state.visits], pregnancies: [...state.pregnancies], history: [...state.history], relationships: [...state.relationships] };
  const people = Object.values(next.people).map((person) => {
    const rested = person.status === 'REST' && person.restUntil && compareDate(person.restUntil, date) <= 0;
    return { ...person, age: calculateAge(person.birthDate, date), status: rested ? 'NORMAL' as const : person.status, restUntil: rested ? undefined : person.restUntil };
  });
  next.people = Object.fromEntries(people.map((person) => [person.id, person]));
  next.weather = weatherForDate(date);

  next.pregnancies = next.pregnancies.map((pregnancy) => {
    if (pregnancy.status !== 'ACTIVE' || compareDate(pregnancy.dueOn, date) > 0) return pregnancy;
    const mother = next.people[pregnancy.consortId];
    if (!mother) return pregnancy;
    const childNumber = Object.values(next.people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS').length + 1;
    const male = seedForDate(date, pregnancy.id.length) >= .5;
    const child: PersonRecord = {
      id: `child-${date.year}-${date.month}-${date.day}-${childNumber}`,
      kind: male ? 'PRINCE' : 'PRINCESS', name: male ? `待赐名皇子${toChineseNumber(childNumber)}` : `待赐名公主${toChineseNumber(childNumber)}`, named: false, sex: male ? 'MALE' : 'FEMALE', birthDate: date, age: 0,
      title: male ? `${toChineseNumber(childNumber)}皇子` : `${toChineseNumber(childNumber)}公主`, residence: '撷芳殿', sceneId: 'xiefang', status: 'NORMAL',
      assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' }, parents: ['emperor', mother.id], children: [], stats: { 健康: 80 }, traits: [],
    };
    next.people[child.id] = child;
    next.people[mother.id] = { ...mother, status: 'REST', restUntil: addMonths(date, 3), children: [...mother.children, child.id], stats: { ...mother.stats, 健康: Math.max(1, (mother.stats['健康'] ?? 80) - 8) } };
    next.people.emperor = { ...next.people.emperor, children: [...next.people.emperor.children, child.id] };
    next.relationships.push(
      { id: `rel-emperor-${child.id}`, personAId: 'emperor', personBId: child.id, kind: 'PARENT_CHILD', labelA: child.kind === 'PRINCE' ? '皇子' : '公主', labelB: '父皇', affinity: 70, trust: 65 },
      { id: `rel-${mother.id}-${child.id}`, personAId: mother.id, personBId: child.id, kind: 'PARENT_CHILD', labelA: child.kind === 'PRINCE' ? '亲生皇子' : '亲生公主', labelB: '生母', affinity: 92, trust: 88 },
    );
    next.events.push(makeBirthEvent(mother, child, date));
    next.history.push(makeHistory(date, 'BIRTH', `${mother.name}诞下${child.kind === 'PRINCE' ? '皇子' : '公主'}。`, [mother.id, child.id, 'emperor']));
    return { ...pregnancy, status: 'DELIVERED' as const };
  });
  next = processDailyLifeCycle(next, date);
  next = processRoyalMarriagesForDay(next, date);
  return next;
}

function processVisitsAtCourtHour(state: GameState, date: GameDate, minuteOfDay: number): GameState {
  if (minuteOfDay < 360) return state;
  let next = { ...state, people: { ...state.people }, events: [...state.events], visits: [...state.visits], pregnancies: [...state.pregnancies], history: [...state.history] };
  next.visits = next.visits.map((visit) => {
    if (visit.status !== 'PENDING' || compareDate(visit.scheduledOn, date) >= 0 || minuteOfDay < visit.processAfterMinute) return visit;
    const consort = next.people[visit.consortId];
    const alreadyPregnant = next.pregnancies.some((pregnancy) => pregnancy.consortId === visit.consortId && pregnancy.status === 'ACTIVE');
    const health = consort?.stats['健康'] ?? 70;
    const chance = Math.min(.55, .18 + health / 500 + (consort?.stats['宠爱'] ?? 50) / 1000);
    if (consort && !alreadyPregnant && seedForDate(date, visit.id.length + visit.consortId.length) < chance) {
      const pregnancy = { id: `pregnancy-${visit.id}`, consortId: consort.id, fatherId: 'emperor', conceivedOn: date, dueOn: addMonths(date, 10), status: 'ACTIVE' as const, risk: Math.max(5, 100 - health) };
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
  const consorts = Object.values(people).filter((person) => person.kind === 'CONSORT');
  const isDaytime = minuteOfDay >= 480 && minuteOfDay < 1080;

  consorts.forEach((person, index) => {
    if (pinnedSceneId && person.sceneId === pinnedSceneId) return;
    const home = homeScene(person);
    if (!home) return;
    const restricted = person.status === 'REST' || person.status === 'SICK' || person.status === 'CONFINED' || person.status === 'COLD_PALACE' || person.status === 'PRISON' || person.status === 'DEAD';
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

export function schedulePalaceVisit(state: GameState, consortId: string): GameState {
  if (state.people[consortId]?.status !== 'NORMAL') return state;
  const date = clockDate(state.clock);
  const id = `visit-${consortId}-${date.year}-${date.month}-${date.day}`;
  if (state.visits.some((visit) => visit.id === id)) return state;
  const relationships = state.relationships.map((relationship) => {
    const matches = (relationship.personAId === 'emperor' && relationship.personBId === consortId) || (relationship.personBId === 'emperor' && relationship.personAId === consortId);
    return matches ? { ...relationship, affinity: Math.min(100, relationship.affinity + 4), trust: Math.min(100, relationship.trust + 2) } : relationship;
  });
  return {
    ...state,
    relationships,
    visits: [...state.visits, { id, consortId, scheduledOn: date, processAfterMinute: 360, status: 'PENDING' }],
    history: [...state.history, makeHistory(date, 'VISIT', `皇帝今夜临幸${state.people[consortId]?.name ?? consortId}。`, ['emperor', consortId])],
  };
}

export function accompanyPregnantConsort(state: GameState, consortId: string): GameState {
  const consort = state.people[consortId];
  if (!consort || consort.kind !== 'CONSORT' || consort.status !== 'PREGNANT') return state;
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
      const ranks = ['管女子', '答应', '常在', '贵人', '嫔', '妃', '贵妃', '皇贵妃', '皇后'];
      const index = Math.max(0, ranks.indexOf(mother.rank ?? mother.title));
      const rank = ranks[Math.min(ranks.length - 1, index + 1)];
      let promoted = { ...mother, rank, title: rank };
      const currentResidence = parseResidenceLabel(mother.residence);
      if (canOccupyMainHall(rank as ConsortRank) && currentResidence?.room !== '主殿') {
        const halls = getAvailableMainHalls(people);
        const hall = halls[Math.floor(seedForDate(clockDate(state.clock), mother.id.length + rank.length) * halls.length)];
        if (hall) promoted = { ...promoted, residence: `${hall.palace}${hall.room}`, sceneId: getResidenceSceneId(hall.palace, hall.room) ?? promoted.sceneId };
      }
      people[motherId] = promoted;
    }
    if (choice.id === 'birth-visit' && mother) {
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
  if (!child || (child.kind !== 'PRINCE' && child.kind !== 'PRINCESS') || !isValidRoyalName(normalized, childId, state.people, state.usedNames.royals)) return state;
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
