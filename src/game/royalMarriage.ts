import type {
  GameDate,
  GameEvent,
  GameState,
  MarriageCandidate,
  PersonRecord,
  RelationshipRecord,
  RoyalMarriageRecord,
} from './gameState';
import { getResidenceSceneId, parseResidenceLabel } from './residences';

export const ROYAL_ADULT_AGE = 15;

const givenNames = ['静姝', '令仪', '清和', '明徽', '婉宁', '昭华', '若蘅', '玉衡', '怀瑾', '景行', '修远', '文茵', '知礼', '端和', '云昭', '砚秋'];

function dayCount(date: GameDate) {
  return date.year * 372 + (date.month - 1) * 31 + date.day;
}

export function addDays(date: GameDate, count: number) {
  const current = { ...date };
  for (let index = 0; index < count; index += 1) {
    current.day += 1;
    const days = current.month === 2 ? 28 : [4, 6, 9, 11].includes(current.month) ? 30 : 31;
    if (current.day > days) {
      current.day = 1;
      current.month += 1;
    }
    if (current.month > 12) {
      current.month = 1;
      current.year += 1;
    }
  }
  return current;
}

function sameDate(a: GameDate, b: GameDate) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function hasSpouse(state: GameState, personId: string) {
  return state.relationships.some((relationship) => relationship.kind === 'SPOUSE'
    && (relationship.personAId === personId || relationship.personBId === personId));
}

function hasPendingMarriage(state: GameState, personId: string) {
  return state.royalMarriages.some((record) => record.royalId === personId
    && !['COMPLETED', 'REJECTED'].includes(record.status));
}

export function eligibleRoyalHeirs(state: GameState) {
  return Object.values(state.people).filter((person) =>
    (person.kind === 'PRINCE' || person.kind === 'PRINCESS')
    && person.age >= ROYAL_ADULT_AGE
    && person.status === 'NORMAL'
    && !hasSpouse(state, person.id)
    && !hasPendingMarriage(state, person.id));
}

export function createMinistryCandidates(state: GameState, royalId: string) {
  const royal = state.people[royalId];
  const ministers = Object.values(state.people).filter((person) =>
    person.kind === 'MINISTER' && person.status !== 'DEAD' && person.id !== 'attendant');
  return ministers.slice(0, 4).map((minister, index): MarriageCandidate => {
    const relation = royal?.sex === 'FEMALE' ? '子' : '女';
    const familyName = minister.name.slice(0, 1);
    return {
      id: `candidate-${royalId}-${minister.id}-${index}`,
      name: `${familyName}${givenNames[(index + royalId.length + minister.id.length) % givenNames.length]}`,
      sex: relation === '子' ? 'MALE' : 'FEMALE',
      parentMinisterId: minister.id,
      parentName: minister.name,
      familyRank: minister.rank ?? '正五品',
      familyOffice: minister.office ?? minister.title,
      legitimacy: index % 3 === 2 ? '庶' : '嫡',
      relation,
      charm: 72 + ((index * 11 + royalId.length) % 24),
      strategy: 68 + ((index * 13 + minister.name.length) % 28),
    };
  });
}

function spouseRelation(royalId: string, spouseId: string): RelationshipRecord {
  return {
    id: `rel-spouse-${royalId}-${spouseId}`,
    personAId: royalId,
    personBId: spouseId,
    kind: 'SPOUSE',
    labelA: '配偶',
    labelB: '皇室配偶',
    affinity: 62,
    trust: 55,
  };
}

function createCandidatePerson(candidate: MarriageCandidate, royal: PersonRecord, date: GameDate): PersonRecord {
  const portrait = candidate.sex === 'MALE' ? 'portrait.prince' : 'portrait.consort';
  return {
    id: `noble-${candidate.id}`,
    kind: 'NOBLE',
    name: candidate.name,
    sex: candidate.sex,
    birthDate: { year: date.year - Math.max(15, Math.min(28, royal.age)), month: 1, day: 1 },
    age: Math.max(15, Math.min(28, royal.age)),
    title: `${candidate.familyRank}${candidate.familyOffice}${candidate.legitimacy}${candidate.relation}`,
    residence: royal.residence,
    sceneId: royal.sceneId,
    status: 'NORMAL',
    assets: { avatar: portrait, portrait },
    parents: [candidate.parentMinisterId],
    children: [],
    stats: { 魅力: candidate.charm, 谋略: candidate.strategy },
    traits: [candidate.legitimacy === '嫡' ? '端方' : '谨慎'],
  };
}

export function marryCandidate(
  state: GameState,
  royalId: string,
  candidate: MarriageCandidate,
  date: GameDate = state.clock,
): GameState {
  const royal = state.people[royalId];
  if (!royal || hasSpouse(state, royalId)) return state;
  const spouse = createCandidatePerson(candidate, royal, date);
  const parentRelation: RelationshipRecord = {
    id: `rel-parent-${candidate.parentMinisterId}-${spouse.id}`,
    personAId: candidate.parentMinisterId,
    personBId: spouse.id,
    kind: 'PARENT_CHILD',
    labelA: candidate.relation,
    labelB: '父亲',
    affinity: 78,
    trust: 74,
  };
  return {
    ...state,
    people: { ...state.people, [spouse.id]: spouse },
    relationships: [...state.relationships, spouseRelation(royalId, spouse.id), parentRelation],
    history: [...state.history, {
      id: `history-marriage-${royalId}-${spouse.id}`,
      date,
      type: 'ROYAL_MARRIAGE',
      summary: `${royal.name}奉旨与${candidate.familyRank}${candidate.familyOffice}${candidate.legitimacy}${candidate.relation}${candidate.name}成婚。`,
      personIds: ['emperor', royalId, spouse.id, candidate.parentMinisterId],
    }],
  };
}

export function ministerSpouse(state: GameState, ministerId: string) {
  const relation = state.relationships.find((item) => item.kind === 'SPOUSE'
    && (item.personAId === ministerId || item.personBId === ministerId));
  if (!relation) return undefined;
  return state.people[relation.personAId === ministerId ? relation.personBId : relation.personAId];
}

export function marryMinister(
  state: GameState,
  royalId: string,
  ministerId: string,
  eliminateExistingSpouse = false,
): GameState {
  const royal = state.people[royalId];
  const minister = state.people[ministerId];
  if (!royal || !minister || hasSpouse(state, royalId)) return state;
  const existingSpouse = ministerSpouse(state, ministerId);
  if (existingSpouse && !eliminateExistingSpouse) return state;

  const people = { ...state.people };
  let relationships = [...state.relationships];
  const history = [...state.history];
  if (existingSpouse) {
    people[existingSpouse.id] = { ...existingSpouse, status: 'DEAD', dialogue: undefined };
    relationships = relationships.filter((item) => !(item.kind === 'SPOUSE'
      && (item.personAId === existingSpouse.id || item.personBId === existingSpouse.id)));
    history.push({
      id: `history-eliminate-spouse-${existingSpouse.id}-${Date.now()}`,
      date: state.clock,
      type: 'CAPITAL_PUNISHMENT',
      summary: `${existingSpouse.name}因皇室婚配之争遭刺身亡。`,
      personIds: ['emperor', ministerId, existingSpouse.id],
    });
  }
  relationships.push(spouseRelation(royalId, ministerId));
  history.push({
    id: `history-marriage-${royalId}-${ministerId}`,
    date: state.clock,
    type: 'ROYAL_MARRIAGE',
    summary: `${royal.name}奉旨与${minister.rank ?? ''}${minister.office ?? minister.title}${minister.name}成婚。`,
    personIds: ['emperor', royalId, ministerId],
  });
  return { ...state, people, relationships, history };
}

export function scheduleMarriageBanquet(state: GameState, royalId: string): GameState {
  const royal = state.people[royalId];
  if (!royal || !eligibleRoyalHeirs(state).some((person) => person.id === royalId)) return state;
  const candidates = createMinistryCandidates(state, royalId);
  const date = { year: state.clock.year, month: state.clock.month, day: state.clock.day };
  const banquetOn = addDays(date, 14);
  const record: RoyalMarriageRecord = {
    id: `marriage-banquet-${royalId}-${dayCount(date)}`,
    royalId,
    method: 'BANQUET',
    status: 'BANQUET_SCHEDULED',
    createdOn: date,
    banquetOn,
    candidates,
  };
  return {
    ...state,
    royalMarriages: [...state.royalMarriages, record],
    history: [...state.history, {
      id: `history-banquet-scheduled-${record.id}`,
      date,
      type: 'ROYAL_MARRIAGE_BANQUET',
      summary: `御花园将于${banquetOn.year}年${banquetOn.month}月${banquetOn.day}日为${royal.name}举办相看宴。`,
      personIds: ['emperor', royalId],
    }],
  };
}

function motherOf(state: GameState, royal: PersonRecord) {
  return royal.parents.map((id) => state.people[id]).find((person) => person?.kind === 'CONSORT');
}

function restoreResidence(person: PersonRecord) {
  const residence = parseResidenceLabel(person.residence);
  const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
  return { ...person, sceneId: sceneId ?? person.sceneId, dialogue: undefined };
}

function eventExists(events: GameEvent[], id: string) {
  return events.some((event) => event.id === id);
}

export function processRoyalMarriagesForDay(state: GameState, date: GameDate): GameState {
  const next: GameState = {
    ...state,
    people: { ...state.people },
    events: [...state.events],
    royalMarriages: state.royalMarriages.map((item) => ({ ...item })),
  };
  next.royalMarriages = next.royalMarriages.map((record) => {
    const royal = next.people[record.royalId];
    if (!royal || !record.banquetOn) return record;
    if (record.status === 'BANQUET_SCHEDULED' && sameDate(record.banquetOn, date)) {
      const mother = motherOf(next, royal);
      next.people[royal.id] = { ...royal, sceneId: 'garden', dialogue: '儿臣方才见过几位候选，尚在细细斟酌。' };
      if (mother) next.people[mother.id] = { ...mother, sceneId: 'garden', dialogue: '臣妾已替孩子看过人品家世，待宴后再向陛下细禀。' };
      const id = `event-banquet-start-${record.id}`;
      if (!eventExists(next.events, id)) {
        next.events.push({
          id,
          type: 'MARRIAGE_BANQUET',
          priority: 78,
          createdOn: date,
          personIds: [royal.id, ...(mother ? [mother.id] : [])],
          title: '内侍传言',
          body: `为${royal.name}筹备的御花园相看宴今日开席，请陛下示下。`,
          choices: [
            { id: 'go-banquet', label: '前往御花园', result: '移驾御花园赴宴。' },
            { id: 'later-banquet', label: '稍后前往', result: '宴席照常举行，陛下稍后再问。' },
          ],
          status: 'PENDING',
        });
      }
      return { ...record, status: 'BANQUET_ACTIVE' };
    }
    if (record.status === 'BANQUET_ACTIVE' && dayCount(date) > dayCount(record.banquetOn)) {
      const selected = record.candidates[(record.royalId.length + date.day) % Math.max(1, record.candidates.length)];
      if (!selected) return { ...record, status: 'REJECTED' };
      const id = `event-banquet-result-${record.id}`;
      if (!eventExists(next.events, id)) {
        next.events.push({
          id,
          type: 'MARRIAGE_NOTICE',
          priority: 88,
          createdOn: date,
          personIds: [royal.id],
          title: '内侍传言',
          body: `${royal.name}与其母妃相看后，属意${selected.familyRank}${selected.familyOffice}${selected.legitimacy}${selected.relation}${selected.name}。`,
          choices: [
            { id: 'approve-marriage', label: '同意婚配', result: '准其择吉完婚。' },
            { id: 'reject-marriage', label: '不同意', result: '此次人选作罢。' },
          ],
          status: 'PENDING',
        });
      }
      return { ...record, status: 'AWAITING_DECISION', selectedCandidateId: selected.id };
    }
    return record;
  });
  return next;
}

export function resolveRoyalMarriageEvent(state: GameState, eventId: string, choiceId: string): GameState {
  const event = state.events.find((item) => item.id === eventId && item.status === 'PENDING');
  if (!event || (event.type !== 'MARRIAGE_BANQUET' && event.type !== 'MARRIAGE_NOTICE')) return state;
  let next: GameState = {
    ...state,
    events: state.events.map((item) => item.id === eventId
      ? { ...item, status: 'RESOLVED', result: item.choices.find((choice) => choice.id === choiceId)?.result }
      : item),
  };
  if (event.type === 'MARRIAGE_BANQUET') return next;

  const recordIndex = next.royalMarriages.findIndex((record) => eventId === `event-banquet-result-${record.id}`);
  const record = next.royalMarriages[recordIndex];
  if (!record) return next;
  const candidate = record.candidates.find((item) => item.id === record.selectedCandidateId);
  if (choiceId === 'approve-marriage' && candidate) next = marryCandidate(next, record.royalId, candidate);
  const royalMarriages = next.royalMarriages.map((item, index) => index === recordIndex
    ? {
      ...item,
      status: choiceId === 'approve-marriage' ? 'COMPLETED' as const : 'REJECTED' as const,
      spouseId: choiceId === 'approve-marriage' && candidate ? `noble-${candidate.id}` : undefined,
    }
    : item);
  const people = { ...next.people };
  const royal = people[record.royalId];
  if (royal) {
    people[royal.id] = restoreResidence(royal);
    const mother = motherOf(next, royal);
    if (mother) people[mother.id] = restoreResidence(mother);
  }
  if (choiceId === 'reject-marriage' && royal) {
    next.history = [...next.history, {
      id: `history-marriage-rejected-${record.id}`,
      date: next.clock,
      type: 'ROYAL_MARRIAGE',
      summary: `${royal.name}相看人选未获御准，此次婚配作罢。`,
      personIds: ['emperor', royal.id],
    }];
  }
  return { ...next, people, royalMarriages };
}

export function activeBanquet(state: GameState) {
  return state.royalMarriages.find((record) => record.status === 'BANQUET_ACTIVE');
}

export function applyRoyalBanquetLocations(state: GameState, date: GameDate, minuteOfDay: number): GameState {
  const record = state.royalMarriages.find((item) =>
    item.status === 'BANQUET_ACTIVE' && item.banquetOn && sameDate(item.banquetOn, date));
  if (!record || minuteOfDay < 480 || minuteOfDay >= 1080) return state;
  const royal = state.people[record.royalId];
  if (!royal) return state;
  const people = { ...state.people, [royal.id]: { ...royal, sceneId: 'garden' } };
  const mother = motherOf(state, royal);
  if (mother) people[mother.id] = { ...mother, sceneId: 'garden' };
  return { ...state, people };
}
