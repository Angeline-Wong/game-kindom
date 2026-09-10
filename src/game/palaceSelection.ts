import { normalizePalacePerson } from './palaceEffects';
import { clockDate, type GameDate, type GameState, type PalaceSelectionRecord, type SelectionCandidate, type SelectionDecision } from './gameState';
import { generateConsortCandidates, normalizePersonName } from './namePools';
import { canOccupyMainHall, getResidenceSceneId, palaceNames, palaceRooms, parseResidenceLabel, type ConsortRank } from './residences';
import { consortPortraitUrls } from './personPortraits';

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
  ['端庄', '善琴', '知礼'], ['聪慧', '善书', '明艳'], ['温婉', '善画', '谨慎'],
  ['爽朗', '善舞', '英气'], ['沉静', '善弈', '持重'], ['灵秀', '善诗', '机敏'],
];

function makeCandidate(name: string, index: number, date: GameDate, selectionId: string, father?: GameState['people'][string]): SelectionCandidate {
  const age = 16 + index;
  return {
    id: `${selectionId}-candidate-${index + 1}`,
    name,
    birthDate: { year: date.year - age, month: ((date.month + index * 2 - 1) % 12) + 1, day: 4 + index * 3 },
    age,
    traits: candidateTraits[index % candidateTraits.length],
    parentMinisterId: father?.id,
    fatherName: father?.name,
    fatherOffice: father ? `${father.office ?? father.title} · ${father.rank ?? ''}`.replace(/ · $/, '') : undefined,
    motherClan: ['金陵顾氏', '河东裴氏', '兰陵郑氏', '清河崔氏', '太原王氏', '吴兴沈氏'][index % 6],
    familyStanding: father?.rank?.includes('一品') || father?.rank?.includes('二品') ? '显贵' : father?.rank?.includes('三品') ? '清贵' : '中正',
    stats: {
      才情: 68 + index * 4,
      礼仪: 76 + (index % 3) * 5,
      容貌: 79 + (index * 3) % 14,
      健康: 75 + (index * 5) % 16,
      野心: 28 + (index * 7) % 39,
      宠爱: 40,
    },
  };
}
function assignCandidatePortraits(candidates: SelectionCandidate[]): SelectionCandidate[] {
  const keys = consortPortraitUrls.map((_, index) => 'consort.' + String(index + 1).padStart(2, '0'));
  let available = keys.filter((key) => !candidates.some((candidate) => candidate.portrait === key));
  return candidates.map((candidate) => {
    if (candidate.portrait) return candidate;
    if (!available.length) available = [...keys];
    const [portrait] = available.splice(Math.floor(Math.random() * available.length), 1);
    return { ...candidate, portrait: portrait ?? 'portrait.consort' };
  });
}
export function schedulePalaceSelection(state: GameState): GameState {
  if (state.palaceSelection && state.palaceSelection.status !== 'COMPLETED') return state;
  const date = clockDate(state.clock);
  const id = `selection-${date.year}-${date.month}-${date.day}`;
  const candidateNames = generateConsortCandidates({
    usedFullNames: state.usedNames.consorts,
    count: 6,
    seed: date.year * 372 + date.month * 31 + date.day,
  });
  const eligibleFathers = Object.values(state.people).filter((person) => person.kind === 'MINISTER');
  const usedBoundNames = new Set(state.usedNames.consorts);
  const uniquenessSuffixes = ['宁', '仪', '和', '月', '婉', '昭', '清', '嘉'];
  const boundNames = candidateNames.map((name, index) => {
    // 候选姓名已经按汉姓/满族复姓生成，不能再用父亲的汉姓首字覆盖复姓。
    const baseName = normalizePersonName(name);
    let uniqueName = baseName;
    let attempt = 0;
    while (usedBoundNames.has(uniqueName)) {
      uniqueName = `${baseName}${uniquenessSuffixes[(index + attempt) % uniquenessSuffixes.length]}`;
      attempt += 1;
    }
    usedBoundNames.add(uniqueName);
    return uniqueName;
  });
  const selection: PalaceSelectionRecord = {
    id,
    announcedOn: date,
    selectionOn: addMonths(date, 1),
    status: 'SCHEDULED',
    candidates: assignCandidatePortraits(boundNames.map((name, index) => makeCandidate(name, index, date, id, eligibleFathers[index % eligibleFathers.length]))),
  };
  return {
    ...state,
    palaceSelection: selection,
    usedNames: { ...state.usedNames, consorts: [...state.usedNames.consorts, ...boundNames] },
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
  const entryHistory: GameState['history'] = [];
  const candidates = assignCandidatePortraits(selection.candidates);
  const occupiedResidences = new Set(Object.values(people).map((person) => person.residence).filter(Boolean));
  const acceptedHonorifics = new Set(Object.values(people).map((person) => person.honorific).filter(Boolean));
  assignments.forEach((assignment) => {
    const candidate = candidates.find((item) => item.id === assignment.candidateId && item.decision === 'SELECTED');
    if (!candidate || people[candidate.id]) return;
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
      assets: { avatar: 'portrait.consort', portrait: candidate.portrait! }, parents: candidate.parentMinisterId ? [candidate.parentMinisterId] : [], children: [], stats: { ...candidate.stats }, traits: [...candidate.traits],
    };
    people[candidate.id] = normalizePalacePerson(people[candidate.id]);
    if (candidate.parentMinisterId && people[candidate.parentMinisterId]) {
      const father = people[candidate.parentMinisterId];
      people[candidate.parentMinisterId] = {
        ...father,
        children: father.children.includes(candidate.id) ? father.children : [...father.children, candidate.id],
      };
      if (!relationships.some((relationship) => relationship.personAId === candidate.parentMinisterId && relationship.personBId === candidate.id && relationship.kind === 'PARENT_CHILD')) {
        relationships.push({
          id: `rel-${candidate.parentMinisterId}-${candidate.id}`,
          personAId: candidate.parentMinisterId,
          personBId: candidate.id,
          kind: 'PARENT_CHILD',
          labelA: '女儿',
          labelB: '父亲',
          affinity: 76,
          trust: 82,
        });
      }
    }
    relationships.push({
      id: `rel-emperor-${candidate.id}`, personAId: 'emperor', personBId: candidate.id, kind: 'SPOUSE',
      labelA: '妃嫔', labelB: '夫君', affinity: 48, trust: 42, jealousy: 12,
    });
    entryHistory.push({
      id: 'history-' + selection.id + '-' + candidate.id + '-entry', date, type: 'CONSORT_ENTRY',
      summary: candidate.name + '经选秀入宫，册封为' + (acceptedHonorific ?? '') + assignment.rank + '，入住' + finalResidence + '。',
      personIds: [candidate.id],
    });
    summaries.push(`${candidate.name}封${acceptedHonorific ?? ''}${assignment.rank}，居${finalResidence}`);
  });
  return {
    ...state,
    people,
    relationships,
    palaceSelection: { ...selection, status: 'COMPLETED', candidates: candidates.map((candidate) => {
      const assignment = assignments.find((item) => item.candidateId === candidate.id);
      return assignment ? { ...candidate, proposedRank: assignment.rank, proposedResidence: people[candidate.id]?.residence ?? assignment.residence, proposedHonorific: people[candidate.id]?.honorific } : candidate;
    }) },
    history: [...state.history, ...entryHistory, {
      id: `history-${selection.id}-confirmed`, date, type: 'PALACE_SELECTION_CONFIRMED',
      summary: `皇帝复核本届新人：${summaries.join('；')}。`, personIds: ['emperor', 'empress', ...assignments.map((item) => item.candidateId)],
    }],
  };
}
