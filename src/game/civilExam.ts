import { isPersonAlive } from './person';
import type { CivilExamCandidate, CivilExamRecord, CivilExamStatus, GameDate, GameEvent, GameState, PersonRecord } from './gameState';
import { addDays } from './royalMarriage';
import { clockDate } from './gameState';
import { MINISTER_NAME_POOL_ALL, pickUnusedNames } from './namePools';

const origins = ['顺天府', '江宁府', '苏州府', '杭州府', '济南府', '开封府', '成都府', '武昌府', '长沙府', '西安府', '福州府', '广州府'];
const backgrounds = ['寒门', '耕读之家', '书香门第', '官宦旁支', '商籍儒生', '边地士子'];
const questions = [
  '论赈灾之政，当先恤民还是先清吏治？',
  '论边防、军饷与民生三者应如何权衡。',
  '论赋税轻重与国库充盈之道。',
  '论用人当重门第、科名还是实绩。',
  '论河工、漕运与京师供给之本末。',
];

const stageWaitDays: Partial<Record<CivilExamStatus, number>> = {
  PROVINCIAL_RESULTS: 30,
  METROPOLITAN_READY: 30,
  GRADING: 10,
  WAITING_QUESTION: 3,
  PALACE_EXAM_READY: 3,
  PROCLAMATION_READY: 1,
  APPOINTMENT_READY: 3,
};

const stageVenue: Partial<Record<CivilExamStatus, 'wenhua' | 'study' | 'taihe'>> = {
  PROVINCIAL_RESULTS: 'wenhua', METROPOLITAN_READY: 'wenhua', GRADING: 'wenhua', WAITING_QUESTION: 'study',
  PALACE_EXAM_READY: 'taihe', PROCLAMATION_READY: 'taihe', APPOINTMENT_READY: 'wenhua',
};

function compareDate(a: GameDate, b: GameDate) {
  return a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : a.day - b.day;
}

function scheduleStage(exam: CivilExamRecord, status: CivilExamStatus, date: GameDate): CivilExamRecord {
  return { ...exam, status, readyOn: addDays(date, stageWaitDays[status] ?? 0) };
}

export function isCivilExamStageReady(exam: CivilExamRecord | null, date: GameDate) {
  return Boolean(exam && (!exam.readyOn || compareDate(exam.readyOn, date) <= 0));
}

export function civilExamReadyDateLabel(exam: CivilExamRecord | null) {
  return exam?.readyOn ? `永和${exam.readyOn.year}年${exam.readyOn.month}月${exam.readyOn.day}日` : '';
}
function seeded(year: number, index: number, salt: number) {
  let value = Math.imul(year + 977, 1103515245) ^ Math.imul(index + 31, 12345) ^ salt;
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function history(state: GameState, type: string, summary: string, personIds: string[] = ['emperor']) {
  return [...state.history, { id: `history-exam-${type}-${Date.now()}`, date: clockDate(state.clock), type, summary, personIds }];
}

export function canStartCivilExam(state: GameState) {
  return !state.civilExam || (state.civilExam.status === 'COMPLETED' && state.clock.year >= state.civilExam.cycleYear + 3);
}

export function startCivilExam(state: GameState, focus: string, chiefExaminerId: string): GameState {
  if (!canStartCivilExam(state)) return state;
  const chief = state.people[chiefExaminerId];
  if (!chief || chief.kind !== 'MINISTER' || !isPersonAlive(chief)) return state;
  const names = pickUnusedNames(MINISTER_NAME_POOL_ALL, state.usedNames.ministers, 12, state.clock.year * 97 + state.clock.month * 13 + state.clock.day);
  const candidates: CivilExamCandidate[] = names.map((name, index) => ({
    id: `exam-${state.clock.year}-${index + 1}`,
    name,
    age: 19 + Math.floor(seeded(state.clock.year, index, 11) * 17),
    origin: origins[index % origins.length],
    background: backgrounds[Math.floor(seeded(state.clock.year, index, 23) * backgrounds.length)],
    classics: 58 + Math.floor(seeded(state.clock.year, index, 37) * 40),
    policy: 55 + Math.floor(seeded(state.clock.year, index, 47) * 43),
    integrity: 45 + Math.floor(seeded(state.clock.year, index, 59) * 53),
    ambition: 25 + Math.floor(seeded(state.clock.year, index, 71) * 70),
  }));
  const record: CivilExamRecord = {
    id: `civil-exam-${state.clock.year}`,
    cycleYear: state.clock.year,
    status: 'PROVINCIAL_RESULTS',
    startedOn: clockDate(state.clock),
    focus,
    chiefExaminerId,
    candidates,
    topCandidateIds: [],
    readyOn: addDays(clockDate(state.clock), stageWaitDays.PROVINCIAL_RESULTS ?? 30),
  };
  return {
    ...state,
    civilExam: record,
    usedNames: { ...state.usedNames, ministers: [...new Set([...state.usedNames.ministers, ...names])] },
    history: history(state, 'EXAM_OPENED', `奉旨开科，命${chief.name}为主考，本科侧重${focus}；各省奉旨筹备乡试，待中式名录汇送京城。`, ['emperor', chiefExaminerId]),
  };
}

export function advanceCivilExamAtWenhua(state: GameState): GameState {
  const exam = state.civilExam;
  if (!exam || !isCivilExamStageReady(exam, clockDate(state.clock))) return state;
  if (exam.status === 'PROVINCIAL_RESULTS') return { ...state, civilExam: scheduleStage(exam, 'METROPOLITAN_READY', clockDate(state.clock)), history: history(state, 'PROVINCIAL_REVIEWED', `皇帝御览乡试名录，准${exam.candidates.length}名举人入京会试。`) };
  if (exam.status === 'METROPOLITAN_READY') {
    const candidates = exam.candidates.map((candidate, index) => ({ ...candidate, metropolitanScore: Math.round(candidate.classics * .45 + candidate.policy * .45 + candidate.integrity * .1 + seeded(exam.cycleYear, index, 83) * 5) }));
    return { ...state, civilExam: { ...scheduleStage(exam, 'GRADING', clockDate(state.clock)), candidates }, history: history(state, 'METROPOLITAN_EXAM', `${exam.candidates.length}名举人于文华殿会试事务中完成考校，试卷已糊名送阅。`) };
  }
  if (exam.status === 'GRADING') {
    const topCandidateIds = [...exam.candidates].sort((a, b) => (b.metropolitanScore ?? 0) - (a.metropolitanScore ?? 0)).slice(0, 6).map((candidate) => candidate.id);
    return { ...state, civilExam: { ...scheduleStage(exam, 'WAITING_QUESTION', clockDate(state.clock)), topCandidateIds }, history: history(state, 'EXAM_GRADING', `会试阅卷完毕，取六名贡士候御书房拟题、太和殿殿试。`) };
  }
  if (exam.status === 'APPOINTMENT_READY') return appointCivilExamGraduates(state);
  return state;
}

export function setCivilExamQuestion(state: GameState, question: string): GameState {
  const exam = state.civilExam;
  if (!exam || exam.status !== 'WAITING_QUESTION' || !isCivilExamStageReady(exam, clockDate(state.clock)) || !questions.includes(question)) return state;
  return { ...state, civilExam: { ...scheduleStage(exam, 'PALACE_EXAM_READY', clockDate(state.clock)), question }, history: history(state, 'PALACE_QUESTION', `皇帝于御书房亲定殿试策问：“${question}”`) };
}

export function civilExamQuestions() {
  return [...questions];
}

export function completePalaceExam(state: GameState, rankedIds: string[]): GameState {
  const exam = state.civilExam;
  const unique = [...new Set(rankedIds)];
  if (!exam || exam.status !== 'PALACE_EXAM_READY' || !isCivilExamStageReady(exam, clockDate(state.clock)) || unique.length !== 3 || unique.some((id) => !exam.topCandidateIds.includes(id))) return state;
  const ranks = new Map(unique.map((id, index) => [id, index === 0 ? '状元' as const : index === 1 ? '榜眼' as const : '探花' as const]));
  const candidates = exam.candidates.map((candidate, index) => {
    if (!exam.topCandidateIds.includes(candidate.id)) return { ...candidate, finalRank: '三甲' as const };
    const palaceScore = Math.round(candidate.policy * .55 + candidate.classics * .25 + candidate.integrity * .1 + (100 - candidate.ambition) * .1 + seeded(exam.cycleYear, index, 101) * 4);
    return { ...candidate, palaceScore, finalRank: ranks.get(candidate.id) ?? '二甲' as const };
  });
  return { ...state, civilExam: { ...scheduleStage(exam, 'PROCLAMATION_READY', clockDate(state.clock)), candidates, topCandidateIds: unique }, history: history(state, 'PALACE_EXAM', `太和殿殿试完成，皇帝亲定${candidates.find((item) => item.id === unique[0])?.name}为状元、${candidates.find((item) => item.id === unique[1])?.name}为榜眼、${candidates.find((item) => item.id === unique[2])?.name}为探花。`) };
}

export function proclaimCivilExam(state: GameState): GameState {
  const exam = state.civilExam;
  if (!exam || exam.status !== 'PROCLAMATION_READY' || !isCivilExamStageReady(exam, clockDate(state.clock))) return state;
  const top = exam.topCandidateIds.map((id) => exam.candidates.find((candidate) => candidate.id === id)?.name).filter(Boolean);
  return { ...state, civilExam: scheduleStage(exam, 'APPOINTMENT_READY', clockDate(state.clock)), history: history(state, 'GOLDEN_PROCLAMATION', `太和殿金殿传胪：${top.join('、')}分列一甲，诸贡士依次唱名。`) };
}

function appointmentFor(candidate: CivilExamCandidate, index: number) {
  if (candidate.finalRank === '状元') return { title: '翰林院修撰', office: '翰林院', rank: '从六品' };
  if (candidate.finalRank === '榜眼' || candidate.finalRank === '探花') return { title: '翰林院编修', office: '翰林院', rank: '正七品' };
  return index < 6 ? { title: '庶吉士', office: '翰林院', rank: '从七品' } : { title: '候补知县', office: '吏部候选', rank: '正七品' };
}

export function appointCivilExamGraduates(state: GameState): GameState {
  const exam = state.civilExam;
  if (!exam || exam.status !== 'APPOINTMENT_READY' || !isCivilExamStageReady(exam, clockDate(state.clock))) return state;
  const ordered = [...exam.candidates].sort((a, b) => {
    const order = { 状元: 0, 榜眼: 1, 探花: 2, 二甲: 3, 三甲: 4 };
    return order[a.finalRank ?? '三甲'] - order[b.finalRank ?? '三甲'] || (b.metropolitanScore ?? 0) - (a.metropolitanScore ?? 0);
  });
  const people = { ...state.people };
  const relationships = [...state.relationships];
  ordered.forEach((candidate, index) => {
    const appointment = appointmentFor(candidate, index);
    const person: PersonRecord = {
      id: `minister-exam-${exam.cycleYear}-${index + 1}`, kind: 'MINISTER', name: candidate.name, sex: 'MALE',
      birthDate: { year: state.clock.year - candidate.age, month: state.clock.month, day: state.clock.day }, age: candidate.age,
      title: appointment.title, rank: appointment.rank, office: appointment.office, sceneId: 'wenhua', status: 'NORMAL',
      assets: { avatar: 'portrait.minister', portrait: 'portrait.minister' }, parents: [], children: [],
      stats: { 智慧: Math.round((candidate.classics + candidate.policy) / 2), 武略: 25 + Math.round(candidate.policy * .25), 野心: candidate.ambition, 忠诚: 45 + Math.round(candidate.integrity * .45), 派系影响: candidate.background === '寒门' ? 18 : 30, 已知财富: candidate.background === '寒门' ? 20 : 45 },
      traits: [candidate.background, candidate.finalRank ?? '进士'],
    };
    people[person.id] = person;
    relationships.push({ id: `rel-emperor-${person.id}`, personAId: 'emperor', personBId: person.id, kind: 'SOVEREIGN_SUBJECT', labelA: '新科臣属', labelB: '君主', affinity: 60, trust: person.stats['忠诚'] ?? 60 });
  });
  return {
    ...state,
    people,
    relationships,
    civilExam: { ...exam, status: 'COMPLETED', completedOn: clockDate(state.clock) },
    history: history(state, 'EXAM_APPOINTMENT', `新科进士${ordered.length}人奉旨授官，分别入翰林院及吏部候选。`, ['emperor', ...ordered.map((_, index) => `minister-exam-${exam.cycleYear}-${index + 1}`)]),
  };
}

function stageReminder(exam: CivilExamRecord, date: GameDate): GameEvent | null {
  const venue = stageVenue[exam.status];
  if (!venue) return null;
  const messages: Partial<Record<CivilExamStatus, string>> = {
    PROVINCIAL_RESULTS: `各省乡试已毕，${exam.candidates.length}名中式举人名录送抵京城，请陛下前往文华殿御览。`,
    METROPOLITAN_READY: `${exam.candidates.length}名举人已经陆续抵京，贡院考务齐备，请陛下前往文华殿举行会试。`,
    GRADING: '会试试卷已经糊名誊录并评阅完毕，请陛下前往文华殿御览、钦定贡士。',
    WAITING_QUESTION: '六名贡士已经取定，礼部请陛下前往御书房亲拟殿试策问。',
    PALACE_EXAM_READY: '殿试考场与贡士班次已经齐备，请陛下前往太和殿举行殿试。',
    PROCLAMATION_READY: '礼部已将一甲名次与金榜核定，请陛下前往太和殿举行金殿传胪。',
    APPOINTMENT_READY: '新科进士的授官名册已经拟妥，请陛下前往文华殿颁旨授官。',
  };
  return {
    id: `event-civil-exam-${exam.id}-${exam.status}`,
    type: 'SYSTEM_NOTICE', priority: 86, createdOn: date, personIds: ['emperor', exam.chiefExaminerId], title: '内侍传言',
    body: messages[exam.status] ?? '科举事务已经准备完毕，请陛下移驾办理。',
    choices: [
      { id: `go-civil-exam-${venue}`, label: venue === 'wenhua' ? '前往文华殿' : venue === 'study' ? '前往御书房' : '前往太和殿', result: '摆驾前往办理科举事务。' },
      { id: 'civil-exam-later', label: '稍后再去', result: '科举事务暂候圣驾。' },
    ],
    defaultChoiceId: 'civil-exam-later', status: 'PENDING',
  };
}

export function processCivilExamForDay(state: GameState, date: GameDate): GameState {
  const exam = state.civilExam;
  if (!exam || exam.status === 'COMPLETED' || !isCivilExamStageReady(exam, date)) return state;
  const reminder = stageReminder(exam, date);
  if (!reminder || state.events.some((event) => event.id === reminder.id)) return state;
  return { ...state, events: [...state.events, reminder] };
}
export function civilExamActionForScene(state: GameState, sceneId: string) {
  const exam = state.civilExam;
  const ready = isCivilExamStageReady(exam, clockDate(state.clock));
  if (sceneId === 'wenhua') {
    if (canStartCivilExam(state)) return '科举事务';
    if (!exam) return null;
    if (!ready && ['PROVINCIAL_RESULTS', 'METROPOLITAN_READY', 'GRADING', 'APPOINTMENT_READY'].includes(exam.status)) return '科举进度';
    if (exam.status === 'PROVINCIAL_RESULTS') return '乡试汇报';
    if (exam.status === 'METROPOLITAN_READY') return '举行会试';
    if (exam.status === 'GRADING') return '御览试卷';
    if (exam.status === 'APPOINTMENT_READY') return '进士授官';
    if (exam.status === 'COMPLETED') return '科举档案';
    return '科举进度';
  }
  if (sceneId === 'study' && exam?.status === 'WAITING_QUESTION' && ready) return '拟定策问';
  if (sceneId === 'taihe' && exam?.status === 'PALACE_EXAM_READY' && ready) return '举行殿试';
  if (sceneId === 'taihe' && exam?.status === 'PROCLAMATION_READY' && ready) return '金殿传胪';
  return null;
}
