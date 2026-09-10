import { clockDate, type GameDate, type GameState, type PersonRecord, type HistoryEntry } from './gameState';
import { isRoyalInLaw, normalizeRoyalInLaws, royalSpouse } from './royalInLaws';

/** DEAD is the canonical terminal state; deathDate also protects damaged legacy saves. */
export function isPersonAlive<T extends { status?: PersonRecord['status']; deathDate?: GameDate }>(person: T | undefined): person is T & { status: Exclude<PersonRecord['status'], 'DEAD'> } {
  return Boolean(person && person.status !== 'DEAD' && !person.deathDate);
}

export function clampHealth(value: number = 100) {
  return Number.isNaN(value) ? 100 : Math.max(0, Math.min(100, value));
}

function recordsDeath(entry: HistoryEntry, personId: string) {
  return entry.type === 'CAPITAL_PUNISHMENT' ? entry.personIds.at(-1) === personId
    : ['DEATH', 'STARVATION_DEATH'].includes(entry.type) && entry.personIds[0] === personId;
}

const deathNoticeChoices = [
  { id: 'grieve', label: '悲痛欲绝', result: '陛下闻讯悲痛欲绝，久久不能平复，内侍垂首劝慰：请陛下节哀，保重龙体。' },
  { id: 'posthumous', label: '前去追封', result: '陛下命呈身后位份与爵位，亲定追封。' },
  { id: 'acknowledge', label: '朕知道了', result: '陛下已知悉丧讯。' },
];

export function killPerson(state: GameState, personId: string, reason: string, date: GameDate = clockDate(state.clock)): GameState {
  const person = state.people[personId];
  if (!person) return state;
  const recorded = state.history.some(h => h.type === 'DEATH' && recordsDeath(h, personId));
  const deathDate = person.deathDate ?? state.history.find(h => recordsDeath(h, personId))?.date ?? date;
  const noticeId = `death-notice-${personId}`;
  const royal = royalSpouse(person, state);
  const inLaw = isRoyalInLaw(person, state);
  const noticeContent = inLaw ? {
    title: '内侍禀报 · 姻亲丧讯',
    body: `启禀陛下，${royal ? `${royal.name}${royal.kind === 'PRINCESS' ? '公主' : '皇子'}的${royal.kind === 'PRINCESS' ? '驸马' : '王妃'}` : person.title}${person.name}去世了。`,
    choices: deathNoticeChoices.filter(choice => choice.id === 'acknowledge'),
  } : { choices: deathNoticeChoices };
  const events = state.events.map(e => e.type !== 'SYSTEM_NOTICE' && e.status === 'PENDING' && e.personIds.includes(personId) ? { ...e, status: 'MISSED' as const, result: '相关人物已故，此事终止。' } : e);
  if (isPersonAlive(person) && !recorded && (inLaw || ['CONSORT', 'DOWAGER', 'PRINCE', 'PRINCESS', 'NOBLE'].includes(person.kind)) && !events.some(e => e.id === noticeId)) {
    events.push({
      id: noticeId, type: 'SYSTEM_NOTICE', priority: 100, createdOn: deathDate,
      personIds: [personId, 'emperor'], title: '内侍禀报 · 宗亲丧讯',
      body: `启禀陛下，${person.title}${person.name}于${deathDate.year}年${deathDate.month}月${deathDate.day}日因${person.deathReason ?? reason}身故，终年${person.age}岁。请陛下节哀。`,
      choices: deathNoticeChoices,
      defaultChoiceId: 'acknowledge', status: 'PENDING',
    });
  }
  return {
    ...state,
    people: { ...state.people, [personId]: { ...person, status: 'DEAD', stats: { ...person.stats, 健康: 0 }, deathDate: { year: deathDate.year, month: deathDate.month, day: deathDate.day }, deathReason: person.deathReason ?? reason, illness: undefined, restUntil: undefined, dialogue: undefined, groundingUntilDay: undefined, fineMonthsRemaining: undefined } },
    pregnancies: state.pregnancies.map(p => p.consortId === personId && p.status === 'ACTIVE' ? { ...p, status: 'LOST' } : p),
    visits: state.visits.map(v => v.consortId === personId && v.status === 'PENDING' ? { ...v, status: 'CANCELLED' } : v),
    events: events.map(event => event.id === noticeId && event.status === 'PENDING' ? { ...event, ...noticeContent } : event),
    royalMarriages: state.royalMarriages.map(r => r.royalId === personId && !['COMPLETED', 'REJECTED'].includes(r.status) ? { ...r, status: 'REJECTED' } : r),
    crownPrinceId: state.crownPrinceId === personId ? null : state.crownPrinceId,
    sixPalaceAssistants: state.sixPalaceAssistants.filter(id => id !== personId),
    history: recorded ? state.history : [...state.history, { id: `death-${personId}`, date: deathDate, type: 'DEATH', summary: `【死亡】${person.name}因${reason}身故，享年${person.age}岁。${state.pregnancies.some(p => p.consortId === personId && p.status === 'ACTIVE') ? '死亡时怀有身孕，孕期终止。' : ''}`, personIds: [personId, ...(personId === 'emperor' ? [] : ['emperor'])] }],
  };
}

export function normalizePersonLife(state: GameState, date: GameDate = clockDate(state.clock)): GameState {
  state = normalizeRoyalInLaws(state);
  let next = state;
  for (const person of Object.values(state.people)) {
    const health = clampHealth(person.stats['健康']);
    const historicalDeath = state.history.some(h => recordsDeath(h, person.id));
    if (!isPersonAlive(person) || health === 0 || historicalDeath) {
      next = killPerson(next, person.id, person.deathReason ?? (health === 0 ? '健康恶化' : '旧存档死因未详'), date);
    } else if (health !== person.stats['健康']) {
      next = { ...next, people: { ...next.people, [person.id]: { ...person, stats: { ...person.stats, 健康: health } } } };
    }
  }
  return { ...next, pregnancies: next.pregnancies.map(p => p.status === 'ACTIVE' && !isPersonAlive(next.people[p.consortId]) ? { ...p, status: 'LOST' } : p) };
}
