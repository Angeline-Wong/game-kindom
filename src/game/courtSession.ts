import { isPersonAlive } from './person';
import type { CourtAgendaItem, CourtDepartment, CourtResolutionRecord, CourtSessionRecord, GameDate, GameState } from './gameState';
import { clockDate } from './gameState';

export type DailyCourtAction =
  | { type: 'QUESTION' }
  | { type: 'ASK'; personId: string }
  | { type: 'RAGE' }
  | { type: 'INVESTIGATE' }
  | { type: 'DEFER' }
  | { type: 'RULE'; ruling: string };

export interface CourtDecisionOption {
  id: string;
  label: string;
  result: string;
  effects: Record<string, number>;
  action: Extract<DailyCourtAction, { type: 'RULE' | 'DEFER' | 'INVESTIGATE' }>;
}

const ruleOption = (id: string, label: string, result: string, effects: Record<string, number>): CourtDecisionOption => ({ id, label, result, effects, action: { type: 'RULE', ruling: result } });
const investigateOption = (id: string, label: string, result: string, effects: Record<string, number>): CourtDecisionOption => ({ id, label, result, effects, action: { type: 'INVESTIGATE' } });

export function courtDecisionOptions(issue: CourtAgendaItem): CourtDecisionOption[] {
  const options: Record<CourtDepartment, CourtDecisionOption[]> = {
    '吏部': [
      ruleOption('discipline', '严查整肃，明定考成', '准其从严查处，整饬吏治，三月内复核各地考成。', { 政治: 3, 民生: 1, 忠诚: 2, 朝堂畏惧: 3, 直言意愿: -2 }),
      ruleOption('warning', '从轻发落，警告了事', '暂予警告，命吏部具结，相关官员留任察看。', { 政治: -1, 民生: -1, 朝堂畏惧: -1, 直言意愿: 1 }),
      investigateOption('investigate', '暗中调查，再作定夺', '命都察院会同吏部暗查，待证据齐备后再行裁决。', { 政治: 1, 忠诚: 1, 直言意愿: 2 }),
    ],
    '户部': [
      ruleOption('relief', '开仓赈济，先济灾民', '准开仓赈济，限户部核账追责，先解地方燃眉之急。', { 民生: 5, 国库: -3000, 快乐: 2, 忠诚: 1 }),
      ruleOption('audit-first', '先核账目，再行拨付', '命户部与都察院先核账目，核实后分批拨付赈粮。', { 民生: 2, 政治: 2, 国库: -1200, 直言意愿: 1 }),
      investigateOption('warehouse-audit', '封存仓册，限期查明', '封存相关仓册，限期查明亏空，赈济之事暂缓一日。', { 政治: 1, 民生: -1, 国库: 800, 朝堂畏惧: 1 }),
    ],
    '礼部': [
      ruleOption('follow-rites', '依礼施行，限期办妥', '依旧例准行，命礼部按期具报，不得铺张误事。', { 文: 2, 政治: 1, 国库: -600, 快乐: 1 }),
      ruleOption('simplify-rites', '从简办理，节省用度', '礼仪从简，节省用度转作官学与贡院修缮。', { 文: 1, 民生: 1, 国库: 900 }),
      investigateOption('rites-review', '会同诸司，复核章程', '交礼部会同相关衙门复核章程，十日后再议。', { 文: 1, 政治: 1, 直言意愿: 1 }),
    ],
    '兵部': [
      ruleOption('reform-army', '采纳整军，立即革新', '采纳兵部建议，整军革新，限期重定操典与军饷章程。', { 武: 4, 政治: 1, 国库: -1800, 朝堂畏惧: 1 }),
      ruleOption('hold-course', '维持现状，谨慎修订', '维持现行军制，择其可行者小幅修订，暂不大动。', { 武: 1, 国库: -500, 直言意愿: 1 }),
      investigateOption('military-review', '派员核查，再议军制', '派遣兵部官员查核边军与军械，查明后再议军制。', { 武: 1, 政治: 1, 忠诚: 1, 直言意愿: 2 }),
    ],
    '刑部': [
      ruleOption('strict-trial', '从严复核，依法定谳', '命刑部会同都察院逐案复核，证据确凿者依法定谳。', { 政治: 2, 民生: 1, 朝堂畏惧: 2, 直言意愿: -1 }),
      ruleOption('cautious-trial', '慎重审理，暂缓行刑', '暂缓执行，命刑部补齐口供与证物后再行定谳。', { 政治: 1, 民生: 1, 朝堂畏惧: -1, 直言意愿: 2 }),
      investigateOption('prison-review', '提审复核，限期回奏', '提审相关人证，限期回奏，未明之处不得擅自定罪。', { 政治: 1, 忠诚: 1, 直言意愿: 1 }),
    ],
    '工部': [
      ruleOption('repair-now', '先修河工，迁民从缓', '准先修河工、安置灾民，迁徙之议待查明后再定。', { 民生: 4, 国库: -2200, 政治: 1, 快乐: 1 }),
      ruleOption('budget-review', '核定工费，分段施行', '命工部核定工费，分段施行，严禁浮报冒领。', { 民生: 2, 国库: -900, 政治: 2 }),
      investigateOption('river-survey', '派员勘验，待报再议', '派员实地勘验河工与民情，待勘验结果回奏后再议。', { 民生: 1, 政治: 1, 直言意愿: 1 }),
    ],
  };
  return options[issue.department] ?? options['户部'];
}

function sameDate(a: GameDate, b: GameDate) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function issueTemplates(date: GameDate): CourtAgendaItem[] {
  const major = [
    { department: '户部' as const, title: '河东旱情与赈粮亏空', summary: '河东三府连月无雨，地方请求开仓三十万石；户部账目与巡按奏报相差七万石。', reporterId: 'minister-005', confidence: '灾情多方印证，仓储账目存疑' },
    { department: '兵部' as const, title: '西北军饷与边军哗变', summary: '西北两镇欠饷三月，督抚称转运受阻，军机处另报地方截留军粮。', reporterId: 'minister-004', confidence: '军报紧急，截留数目未经复核' },
    { department: '工部' as const, title: '河工决口与迁民之议', summary: '黄河决口淹没七县，工部请求征调民夫十万并迁徙沿岸百姓。', reporterId: 'minister-003', confidence: '灾情可信，工程预算仅有工部单方估算' },
  ][(date.year + date.month + date.day) % 3];
  const departmental = [
    { department: '吏部' as const, title: '地方官员京察考成', summary: '吏部汇总各省督抚考语，请裁定三名政绩卓异者与两名贪懒不职者的升黜。', reporterId: 'minister-003', confidence: '考语俱全，部分地方互相保荐' },
    { department: '户部' as const, title: '京仓春季盘点', summary: '户部请依例盘查京仓，补足陈粮损耗。', reporterId: 'minister-005', confidence: '例行奏报，可信较高' },
    { department: '礼部' as const, title: '会试礼制与贡院修缮', summary: '礼部奏请厘定会试仪程，并拨银修缮贡院号舍。', reporterId: 'minister-006', confidence: '仪程有旧例可循，修缮报价尚待核验' },
    { department: '兵部' as const, title: '禁军冬衣采办', summary: '禁军统领奏请提前采买冬衣，内务府报价高于往年。', reporterId: 'minister-004', confidence: '需求属实，采买价格存疑' },
    { department: '刑部' as const, title: '秋审重案复核', summary: '刑部呈上数宗重案，请会同都察院复核口供与证物后定谳。', reporterId: 'minister-007', confidence: '案卷齐备，其中一案口供前后不一' },
    { department: '工部' as const, title: '驿路修缮与河渠工费', summary: '工部请修京畿驿路并疏浚河渠，所报工费较去年增加两成。', reporterId: 'minister-008', confidence: '路况属实，工程预算仅为工部估算' },
  ];
  return departmental.map((item, index) => {
    const selected = item.department === major.department ? major : item;
    return {
      id: `court-${date.year}-${date.month}-${date.day}-${selected.department}`,
      category: item.department === major.department ? 'MAJOR' : 'ORDINARY',
      status: 'PENDING',
      revealed: [],
      speeches: [],
      ...selected,
    };
  });
}
function inferDepartment(issue: CourtAgendaItem): CourtDepartment {
  if (issue.department) return issue.department;
  if (/军|边|禁军/.test(issue.title)) return '兵部';
  if (/河工|修缮|驿路|工程/.test(issue.title)) return '工部';
  if (/刑|案|审/.test(issue.title)) return '刑部';
  if (/礼|会试|翰林|实录/.test(issue.title)) return '礼部';
  if (/官员|京察|升黜/.test(issue.title)) return '吏部';
  return '户部';
}

function attendanceFor(state: GameState, date: GameDate) {
  return Object.values(state.people).filter((person) => person.kind === 'MINISTER' && isPersonAlive(person)).map((person, index) => {
    const roll = (person.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + date.day * 7 + index) % 29;
    if (roll === 0) return { personId: person.id, status: 'ABSENT' as const, note: '称病未入朝，尚未验看医案' };
    if (roll <= 2) return { personId: person.id, status: 'LATE' as const, note: '误了点卯，于班次将定时入列' };
    if (roll === 3) return { personId: person.id, status: 'IMPROPER' as const, note: '朝服佩饰不合定制' };
    return { personId: person.id, status: 'PRESENT' as const, note: '按班入列' };
  });
}

export function startDailyCourt(state: GameState): GameState {
  const date = clockDate(state.clock);
  if (state.courtSession && sameDate(state.courtSession.date, date)) {
    const normalized = state.courtSession.agenda.map((issue) => ({ ...issue, department: inferDepartment(issue) }));
    if (state.courtSession.status === 'COMPLETED') {
      return normalized.every((issue, index) => issue.department === state.courtSession!.agenda[index].department) ? state : { ...state, courtSession: { ...state.courtSession, agenda: normalized } };
    }
    const departments = new Set(normalized.map((issue) => issue.department));
    const missing = issueTemplates(date).filter((issue) => !departments.has(issue.department)).map((issue) => ({ ...issue, status: 'PENDING' as const }));
    if (!missing.length && normalized.every((issue, index) => issue.department === state.courtSession!.agenda[index].department)) return state;
    return { ...state, courtSession: { ...state.courtSession, agenda: [...normalized, ...missing] } };
  }
  const carried = (state.courtSession?.agenda ?? []).filter((issue) => issue.status === 'DEFERRED' || issue.status === 'PENDING').map((issue) => ({ ...issue, id: `${issue.id}-carry-${date.year}-${date.month}-${date.day}`, status: 'PENDING' as const, speeches: [...issue.speeches, '此议题奉旨留中，今日继续廷议。'] }));
  const fresh = issueTemplates(date);
  const agenda = carried.length ? [...carried, ...fresh.filter((issue) => issue.category !== 'MAJOR')] : fresh;
  const session: CourtSessionRecord = {
    id: `court-session-${date.year}-${date.month}-${date.day}`,
    date,
    status: 'IN_PROGRESS',
    agenda,
    currentIssueId: undefined,
    attendance: attendanceFor(state, date),
    fear: state.courtSession?.fear ?? 18,
    candor: state.courtSession?.candor ?? 74,
    elapsedMinutes: 0,
  };
  return {
    ...state,
    courtSession: session,
    history: [...state.history, { id: `history-${session.id}`, date, type: 'COURT_OPENED', summary: `乾清门常朝开始，今日列议${agenda.length}项。`, personIds: ['emperor', ...session.attendance.map((item) => item.personId)] }],
  };
}

export function selectCourtDepartment(state: GameState, department: CourtDepartment): GameState {
  const prepared = startDailyCourt(state);
  const session = prepared.courtSession;
  if (!session || session.status !== 'IN_PROGRESS') return prepared;
  const target = session.agenda.find((issue) => inferDepartment(issue) === department && (issue.status === 'PENDING' || issue.status === 'DEBATING'));
  if (!target) return prepared;
  const agenda = session.agenda.map((issue) => {
    if (issue.id === target.id) return { ...issue, status: 'DEBATING' as const };
    if (issue.status === 'DEBATING') return { ...issue, status: 'PENDING' as const };
    return issue;
  });
  return { ...prepared, courtSession: { ...session, agenda, currentIssueId: target.id } };
}

function advanceCourtClock(state: GameState, minutes: number) {
  return { ...state.clock, minuteOfDay: Math.min(1439, state.clock.minuteOfDay + minutes) };
}

export function handleCourtAction(state: GameState, action: DailyCourtAction): GameState {
  const session = state.courtSession;
  if (!session || session.status !== 'IN_PROGRESS' || !session.currentIssueId) return state;
  const current = session.agenda.find((issue) => issue.id === session.currentIssueId);
  if (!current) return state;
  const reporter = state.people[current.reporterId]?.name ?? '呈报官员';
  let fear = session.fear;
  let candor = session.candor;
  let minutes = 15;
  let issue = { ...current, revealed: [...current.revealed], speeches: [...current.speeches] };
  let historySummary: string | undefined;

  if (action.type === 'QUESTION') {
    issue.revealed.push(`追问后得知：${current.confidence}；${reporter}愿具结所奏。`);
    issue.speeches.push('皇帝追问情报来源与查验手续。');
  } else if (action.type === 'ASK') {
    const official = state.people[action.personId];
    const wisdom = official?.stats['智慧'] ?? 60;
    issue.speeches.push(`${official?.office ?? official?.title ?? '官员'}${official?.name ?? ''}奏称：${wisdom >= 80 ? '当先核实数字，再分急缓施行。' : '臣请依成例办理，并留意地方有无欺隐。'}`);
    minutes = 20;
  } else if (action.type === 'RAGE') {
    fear = Math.min(100, fear + 18);
    candor = Math.max(0, candor - 12);
    issue.speeches.push('皇帝震怒诘责，命百官不得欺隐。');
  } else if (action.type === 'INVESTIGATE') {
    issue.status = 'DEFERRED';
    issue.ruling = '命都察院会同相关衙门限期查明，再行廷议。';
    historySummary = `${current.title}奉旨交办调查，留待后议。`;
    minutes = 30;
  } else if (action.type === 'DEFER') {
    issue.status = 'DEFERRED';
    issue.ruling = '容后再议。';
    historySummary = `${current.title}奉旨容后再议。`;
    minutes = 10;
  } else {
    issue.status = 'RESOLVED';
    issue.ruling = action.ruling;
    historySummary = `${current.title}经廷议裁决：${action.ruling}`;
    minutes = 30;
  }

  const agenda = session.agenda.map((item) => item.id === issue.id ? issue : item);
  const terminal = issue.status === 'DEFERRED' || issue.status === 'RESOLVED';
  const hasPending = terminal && agenda.some((item) => item.status === 'PENDING');
  const status = terminal && !hasPending ? 'COMPLETED' as const : 'IN_PROGRESS' as const;
  const nextSession: CourtSessionRecord = { ...session, agenda, currentIssueId: terminal ? undefined : session.currentIssueId, status, fear, candor, elapsedMinutes: session.elapsedMinutes + minutes };
  return {
    ...state,
    clock: advanceCourtClock(state, minutes),
    courtSession: nextSession,
    history: historySummary ? [...state.history, { id: `history-court-${Date.now()}`, date: clockDate(state.clock), type: issue.status === 'RESOLVED' ? 'COURT_RULING' : 'COURT_DEFERRED', summary: historySummary, personIds: ['emperor', current.reporterId] }] : state.history,
  };
}

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }

function applyCourtEffects(state: GameState, reporterId: string, effects: Record<string, number>) {
  const people = { ...state.people };
  const emperor = people.emperor;
  const emperorStats = emperor ? { ...emperor.stats } : undefined;
  const reporter = people[reporterId];
  const reporterStats = reporter ? { ...reporter.stats } : undefined;
  const finances = { ...state.finances };
  const accountKeys: Record<string, keyof typeof finances> = { 国库: 'nationalTreasury', 私库: 'nationalTreasury', 黄金: 'gold', 元宝: 'yuanbao' };
  Object.entries(effects).forEach(([key, delta]) => {
    const account = accountKeys[key];
    if (account) {
      const numericAccounts = finances as unknown as Record<string, number>;
      numericAccounts[account] = Math.max(0, (numericAccounts[account] ?? 0) + delta);
    }
    else if (emperorStats && ['文', '武', '政治', '民生', '魅力', '健康', '快乐'].includes(key)) emperorStats[key] = clamp((emperorStats[key] ?? 0) + delta);
    else if (reporterStats && ['智慧', '武略', '野心', '忠诚', '派系影响', '已知财富'].includes(key)) reporterStats[key] = clamp((reporterStats[key] ?? 0) + delta);
  });
  if (emperor && emperorStats) people.emperor = { ...emperor, stats: emperorStats };
  if (reporter && reporterStats) people[reporterId] = { ...reporter, stats: reporterStats };
  return { ...state, people, finances };
}

export function handleCourtDecision(state: GameState, option: CourtDecisionOption): GameState {
  const session = state.courtSession;
  const current = session?.currentIssueId ? session.agenda.find((issue) => issue.id === session.currentIssueId) : undefined;
  if (!session || !current) return state;
  const acted = handleCourtAction(state, option.action);
  const effected = applyCourtEffects(acted, current.reporterId, option.effects);
  const actedSession = effected.courtSession;
  if (!actedSession) return effected;
  const lastResolution: CourtResolutionRecord = { issueId: current.id, optionId: option.id, label: option.label, result: option.result, effects: option.effects, date: clockDate(state.clock) };
  const fear = clamp((actedSession.fear ?? 0) + (option.effects['朝堂畏惧'] ?? 0));
  const candor = clamp((actedSession.candor ?? 0) + (option.effects['直言意愿'] ?? 0));
  const history = [...effected.history, { id: `history-court-decision-${Date.now()}`, date: clockDate(state.clock), type: 'COURT_DECISION', summary: `皇帝裁决${current.title}：${option.result}`, personIds: ['emperor', current.reporterId] }];
  return { ...effected, courtSession: { ...actedSession, fear, candor, lastResolution }, history };
}

export function endDailyCourt(state: GameState): GameState {
  const session = state.courtSession;
  if (!session || session.status === 'COMPLETED') return state;
  const agenda = session.agenda.map((issue) => issue.status === 'PENDING' || issue.status === 'DEBATING' ? { ...issue, status: 'DEFERRED' as const, ruling: '退朝后留中，次日再议。' } : issue);
  return {
    ...state,
    clock: advanceCourtClock(state, 10),
    courtSession: { ...session, agenda, currentIssueId: undefined, status: 'COMPLETED', elapsedMinutes: session.elapsedMinutes + 10 },
    history: [...state.history, { id: `history-court-close-${Date.now()}`, date: clockDate(state.clock), type: 'COURT_CLOSED', summary: '今日退朝，未决议题留待次日。', personIds: ['emperor'] }],
  };
}

export function resumeDailyCourt(state: GameState): GameState {
  const session = state.courtSession;
  if (!session || session.status !== 'COMPLETED') return startDailyCourt(state);
  const agenda = session.agenda.map((issue) => issue.status === 'DEFERRED' ? { ...issue, status: 'PENDING' as const } : issue);
  if (!agenda.some((issue) => issue.status === 'PENDING')) return state;
  return {
    ...state,
    courtSession: { ...session, agenda, currentIssueId: undefined, status: 'IN_PROGRESS' },
    history: [...state.history, { id: `history-court-resume-${Date.now()}`, date: clockDate(state.clock), type: 'COURT_RESUMED', summary: '皇帝再次升朝，命百官继续议决留中奏折。', personIds: ['emperor'] }],
  };
}

export function courtEntryLabel(state: GameState) {
  const date = clockDate(state.clock);
  if (!state.courtSession || !sameDate(state.courtSession.date, date)) return '开始朝会';
  if (state.courtSession.status !== 'COMPLETED') return '继续朝议';
  return state.courtSession.agenda.some((issue) => issue.status === 'DEFERRED' || issue.status === 'PENDING') ? '再次升朝' : '查看朝议';
}
