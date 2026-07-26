import { clockDate, type GameDate, type GameState, type PalaceSelectionRecord, type SelectionCandidate, type SelectionDecision } from './gameState';
import { CONSORT_NAME_POOL, pickUnusedNames } from './namePools';
import { canOccupyMainHall, getResidenceSceneId, palaceNames, palaceRooms, parseResidenceLabel, type ConsortRank } from './residences';

function daysInMonth(month: number) {
  return month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function compareDate(a: GameDate, b: GameDate) {
  return a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : a.day - b.day;
}

function addMonths(date: GameDate, count: number): GameDate {
  const zeroBased = date.year * 12 + date.month - 1 + count;
  const year = Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(month)) };
}

export interface SelectionAssignment {
  candidateId: string;
  rank: string;
  residence: string;
  honorific?: string;
}

const candidateTraits = [
  ['端雅', '善琴'], ['明敏', '善书'], ['温婉', '善画'],
  ['爽朗', '善舞'], ['谨慎', '善弈'], ['沉静', '善诗'],
];

function makeCandidate(name: string, index: number, date: GameDate, selectionId: string): SelectionCandidate {
  const age = 16 + index;
  return {
    id: `${selectionId}-candidate-${index + 1}`,
    name,
    birthDate: { year: date.year - age, month: ((date.month + index * 2 - 1) % 12) + 1, day: 4 + index * 3 },
    age,
    traits: candidateTraits[index % candidateTraits.length],
    stats: {
      才情: 68 + index * 4,
      礼仪: 76 + (index % 3) * 5,
      容貌: 79 + (index * 3) % 14,
      健康: 75 + (index * 5) % 16,
      野心: 28 + (index * 7) % 39,
      争宠: 35 + (index * 9) % 42,
      宠爱: 40,
    },
  };
}

export function schedulePalaceSelection(state: GameState): GameState {
  if (state.palaceSelection && state.palaceSelection.status !== 'COMPLETED') return state;
  const date = clockDate(state.clock);
  const id = `selection-${date.year}-${date.month}-${date.day}`;
  const candidateNames = pickUnusedNames(
    CONSORT_NAME_POOL,
    state.usedNames.consorts,
    6,
    date.year * 372 + date.month * 31 + date.day,
  );
  const selection: PalaceSelectionRecord = {
    id,
    announcedOn: date,
    selectionOn: addMonths(date, 1),
    status: 'SCHEDULED',
    candidates: candidateNames.map((name, index) => makeCandidate(name, index, date, id)),
  };
  return {
    ...state,
    palaceSelection: selection,
    usedNames: { ...state.usedNames, consorts: [...state.usedNames.consorts, ...candidateNames] },
    history: [...state.history, {
      id: `history-${id}-scheduled`, date, type: 'PALACE_SELECTION_SCHEDULED',
      summary: `皇帝命交泰殿筹办选秀，定于一月后阅选。`, personIds: ['emperor', 'empress'],
    }],
  };
}

export function decideSelectionCandidate(state: GameState, candidateId: string, decision: SelectionDecision): GameState {
  const selection = state.palaceSelection;
  if (!selection || selection.status !== 'SELECTING') return state;
  const candidates = selection.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, decision } : candidate);
  if (!candidates.every((candidate) => candidate.decision)) return { ...state, palaceSelection: { ...selection, candidates } };
  const selected = candidates.filter((candidate) => candidate.decision === 'SELECTED');
  const date = clockDate(state.clock);
  const status = selected.length ? 'AWAITING_ENTRY' as const : 'COMPLETED' as const;
  return {
    ...state,
    palaceSelection: { ...selection, candidates, status, entryOn: selected.length ? addMonths(date, 1) : undefined },
    history: [...state.history, {
      id: `history-${selection.id}-decided`, date, type: 'PALACE_SELECTION_DECIDED',
      summary: selected.length ? `${selected.map((candidate) => candidate.name).join('、')}撂牌子入选，一月后入宫。` : '本届秀女尽数赐花落选。',
      personIds: ['emperor', 'empress'],
    }],
  };
}

function proposeAssignments(state: GameState, candidates: SelectionCandidate[]) {
  const occupied = new Set(Object.values(state.people).map((person) => person.residence).filter(Boolean));
  const available = palaceNames.flatMap((palace) => palaceRooms.filter((room) => room !== '主殿').map((room) => `${palace}${room}`)).filter((label) => !occupied.has(label));
  const ranks = ['贵人', '常在', '答应'];
  return candidates.map((candidate, index) => ({
    ...candidate,
    proposedRank: ranks[index % ranks.length],
    proposedResidence: available[index] ?? `${palaceNames[index % palaceNames.length]}东侧殿`,
  }));
}

export function processPalaceSelection(state: GameState, date: GameDate): GameState {
  const selection = state.palaceSelection;
  if (!selection) return state;
  if (selection.status === 'SCHEDULED' && compareDate(date, selection.selectionOn) >= 0) {
    const reminderId = `event-selection-open-${selection.id}`;
    const events = state.events.some((event) => event.id === reminderId) ? state.events : [...state.events, {
      id: reminderId,
      type: 'SYSTEM_NOTICE' as const,
      priority: 90,
      createdOn: date,
      personIds: ['emperor', 'empress'],
      title: '内侍传言',
      body: '交泰殿选秀今日开选，候选秀女已经依次候旨，请陛下移驾阅选。',
      choices: [
        { id: 'go-selection', label: '前往交泰殿', result: '摆驾交泰殿阅选秀女。' },
        { id: 'later-selection', label: '稍后再去', result: '选秀名册暂留交泰殿候旨。' },
      ],
      defaultChoiceId: 'go-selection',
      status: 'PENDING' as const,
    }];
    return {
      ...state,
      events,
      palaceSelection: { ...selection, status: 'SELECTING' },
      history: [...state.history, { id: `history-${selection.id}-opened`, date, type: 'PALACE_SELECTION_OPENED', summary: '交泰殿选秀开选，秀女依次入殿候选。', personIds: ['emperor', 'empress'] }],
    };
  }
  if (selection.status === 'AWAITING_ENTRY' && selection.entryOn && compareDate(date, selection.entryOn) >= 0) {
    const candidates = proposeAssignments(state, selection.candidates.filter((candidate) => candidate.decision === 'SELECTED'));
    const rejected = selection.candidates.filter((candidate) => candidate.decision !== 'SELECTED');
    const reminderId = `event-selection-review-${selection.id}`;
    const events = state.events.some((event) => event.id === reminderId) ? state.events : [...state.events, {
      id: reminderId,
      type: 'SYSTEM_NOTICE' as const,
      priority: 92,
      createdOn: date,
      personIds: ['emperor', 'empress'],
      title: '内侍传言',
      body: '皇后已为本届入选秀女拟定位份、封号与宫室，特请陛下移驾交泰殿御览确认。',
      choices: [
        { id: 'go-selection-review', label: '前往交泰殿', result: '摆驾交泰殿复核新人名册。' },
        { id: 'later-selection-review', label: '稍后再议', result: '新人名册暂留交泰殿候旨。' },
      ],
      defaultChoiceId: 'go-selection-review',
      status: 'PENDING' as const,
    }];
    return {
      ...state,
      events,
      palaceSelection: { ...selection, status: 'AWAITING_REVIEW', candidates: [...candidates, ...rejected] },
      history: [...state.history, { id: `history-${selection.id}-entered`, date, type: 'PALACE_SELECTION_ENTERED', summary: '本届入选秀女已入宫，皇后拟定位份与居所，候皇帝复核。', personIds: ['emperor', 'empress'] }],
    };
  }
  return state;
}

export function confirmPalaceSelection(state: GameState, assignments: SelectionAssignment[]): GameState {
  const selection = state.palaceSelection;
  if (!selection || selection.status !== 'AWAITING_REVIEW') return state;
  const date = clockDate(state.clock);
  const people = { ...state.people };
  const relationships = [...state.relationships];
  const summaries: string[] = [];
  const occupiedResidences = new Set(Object.values(people).map((person) => person.residence).filter(Boolean));
  const acceptedHonorifics = new Set(Object.values(people).map((person) => person.honorific).filter(Boolean));
  assignments.forEach((assignment) => {
    const candidate = selection.candidates.find((item) => item.id === assignment.candidateId && item.decision === 'SELECTED');
    if (!candidate) return;
    let finalResidence = assignment.residence;
    const requestedResidence = parseResidenceLabel(finalResidence);
    if (canOccupyMainHall(assignment.rank as ConsortRank) && requestedResidence?.room !== '主殿') {
      finalResidence = palaceNames.map((palace) => `${palace}主殿`).find((label) => !occupiedResidences.has(label)) ?? finalResidence;
    }
    const residence = parseResidenceLabel(finalResidence);
    const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
    const honorific = assignment.honorific?.trim().slice(0, 2);
    const acceptedHonorific = honorific && !acceptedHonorifics.has(honorific) ? honorific : undefined;
    if (acceptedHonorific) acceptedHonorifics.add(acceptedHonorific);
    occupiedResidences.add(finalResidence);
    people[candidate.id] = {
      id: candidate.id, kind: 'CONSORT', name: candidate.name, sex: 'FEMALE', birthDate: candidate.birthDate, age: candidate.age,
      title: assignment.rank, rank: assignment.rank, honorific: acceptedHonorific, residence: finalResidence, sceneId: sceneId ?? 'jiaotai', status: 'NORMAL',
      assets: { avatar: 'portrait.consort', portrait: 'portrait.consort' }, parents: [], children: [], stats: { ...candidate.stats }, traits: [...candidate.traits],
    };
    relationships.push({
      id: `rel-emperor-${candidate.id}`, personAId: 'emperor', personBId: candidate.id, kind: 'SPOUSE',
      labelA: '妃嫔', labelB: '夫君', affinity: 48, trust: 42, jealousy: 12,
    });
    summaries.push(`${candidate.name}封${acceptedHonorific ?? ''}${assignment.rank}，居${finalResidence}`);
  });
  return {
    ...state,
    people,
    relationships,
    palaceSelection: { ...selection, status: 'COMPLETED', candidates: selection.candidates.map((candidate) => {
      const assignment = assignments.find((item) => item.candidateId === candidate.id);
      return assignment ? { ...candidate, proposedRank: assignment.rank, proposedResidence: people[candidate.id]?.residence ?? assignment.residence, proposedHonorific: people[candidate.id]?.honorific } : candidate;
    }) },
    history: [...state.history, {
      id: `history-${selection.id}-confirmed`, date, type: 'PALACE_SELECTION_CONFIRMED',
      summary: `皇帝复核本届新人：${summaries.join('；')}。`, personIds: ['emperor', 'empress', ...assignments.map((item) => item.candidateId)],
    }],
  };
}
