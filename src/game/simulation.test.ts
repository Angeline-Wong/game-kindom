import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { accompanyPregnantConsort, addMonths, advanceGameState, nameRoyalChild, nextDate, processDailyLifeCycle, processPregnancies, resolveEvent, schedulePalaceVisit, skipGameYears, updateConsortLocations, weatherForDate } from './simulation';
import type { GameState, PersonRecord } from './gameState';
import { PRINCE_GIVEN_NAMES, PRINCESS_GIVEN_NAMES, getRoyalNameSuggestions } from './royalNames';
import { confirmPalaceSelection, decideSelectionCandidate, schedulePalaceSelection } from './palaceSelection';
import { generateConsortCandidates, MANCHU_MINISTER_NAME_POOL, MINISTER_NAME_POOL, MINISTER_NAME_POOL_ALL, givenStartIndex, isManchuSurname, manchuSurnames, normalizePersonName } from './namePools';

const testConsort: PersonRecord = {
  id: 'consort-test', kind: 'CONSORT', name: '顾清漪', sex: 'FEMALE',
  birthDate: { year: -19, month: 3, day: 6 }, age: 22, title: '贵人', rank: '贵人',
  residence: '翊坤宫西侧殿', sceneId: 'yikun:西侧殿', status: 'NORMAL',
  assets: { avatar: 'portrait.consort', portrait: 'portrait.consort' },
  parents: [], children: [],
  stats: { 才情: 88, 礼仪: 84, 容貌: 91, 健康: 89, 野心: 52, 心情: 68, 宠爱: 72 },
  traits: ['温婉'],
};

function withConsort(state: GameState = createInitialGameState()) {
  state.people[testConsort.id] = { ...testConsort, stats: { ...testConsort.stats } };
  state.relationships.push({
    id: 'rel-emperor-consort-test', personAId: 'emperor', personBId: testConsort.id,
    kind: 'SPOUSE', labelA: '妃嫔', labelB: '夫君', affinity: 77, trust: 68,
  });
  return state;
}

describe('palace simulation', () => {
  it('returns summoned married royals outside when the calendar enters the next day', () => {
    const royal: PersonRecord = {
      id: 'summoned-royal', kind: 'PRINCE', name: '萧清安', sex: 'MALE', birthDate: { year: 1, month: 1, day: 1 }, age: 20,
      title: '皇长子', residence: '宫外', sceneId: 'outside', status: 'NORMAL', maritalStatus: 'MARRIED', residenceType: 'OUTSIDE_PALACE', isSummoned: true,
      assets: { avatar: 'x', portrait: 'x' }, parents: [], children: [], stats: {}, traits: [],
    };
    const state = { ...createInitialGameState(), people: { ...createInitialGameState().people, [royal.id]: royal } };
    const next = advanceGameState(state, (1440 - state.clock.minuteOfDay + 1) * 50, 1);
    expect(next.people[royal.id].isSummoned).toBe(false);
    expect(next.people[royal.id].residence).toBe('宫外');
  });

  it('skips whole years through daily simulation while preserving speed and accumulated events', () => {
    const state = { ...withConsort(), speed: 4 as const };
    const skipped = skipGameYears(state, 1);

    expect(skipped.clock).toMatchObject({
      year: state.clock.year + 1,
      month: state.clock.month,
      day: state.clock.day,
    });
    expect(skipped.speed).toBe(4);
    expect(skipped.history.some((entry) => entry.type === 'MONTHLY_PAYROLL')).toBe(true);
    expect(skipped.history.at(-1)?.type).toBe('TIME_SKIP');
  });

  it('keeps weather deterministic for a saved date', () => {
    const date = { year: 3, month: 10, day: 18 };
    expect(weatherForDate(date)).toBe(weatherForDate(date));
  });

  it('adds newly shipped people when an older save is loaded', () => {
    const oldSave = withConsort();
    delete oldSave.people.attendant;
    oldSave.people['consort-test'].sceneId = 'inner-palace';
    const migrated = migrateGameState(oldSave);
    expect(migrated.people.attendant.rank).toBe('正七品');
    expect(migrated.people['consort-test'].sceneId).toBe('yikun:西侧殿');
  });

  it('updates age after a birthday passes', () => {
    const state = createInitialGameState();
    state.clock = { year: 3, month: 4, day: 11, minuteOfDay: 0 };
    state.people.emperor.birthDate = { year: -21, month: 4, day: 12 };
    state.people.emperor.age = 23;
    const next = advanceGameState(state, 144_000, 1);
    expect(next.clock).toMatchObject({ month: 4, day: 13 });
    expect(next.people.emperor.age).toBe(24);
  });

  it('calculates ten calendar months and clamps invalid days', () => {
    expect(addMonths({ year: 3, month: 10, day: 31 }, 10)).toEqual({ year: 4, month: 8, day: 31 });
    expect(addMonths({ year: 3, month: 4, day: 30 }, 10)).toEqual({ year: 4, month: 2, day: 28 });
  });

  it('records a palace visit only once', () => {
    const state = withConsort();
    const before = state.relationships.find((relation) => relation.id === 'rel-emperor-consort-test')!;
    const once = schedulePalaceVisit(state, 'consort-test');
    const twice = schedulePalaceVisit(once, 'consort-test');
    expect(twice.visits).toHaveLength(1);
    expect(twice.history[0].type).toBe('VISIT');
    expect(once.relationships.find((relation) => relation.id === before.id)?.affinity).toBe(before.affinity + 4);
    expect(once.people['consort-test'].stats['宠爱']).toBe(state.people['consort-test'].stats['宠爱'] + 8);
    expect(twice.people['consort-test'].stats['宠爱']).toBe(once.people['consort-test'].stats['宠爱']);
  });

  it('blocks favor for pregnancy and records companionship instead', () => {
    const state = withConsort();
    state.people['consort-test'].status = 'PREGNANT';
    expect(schedulePalaceVisit(state, 'consort-test').visits).toHaveLength(0);
    const accompanied = accompanyPregnantConsort(state, 'consort-test');
    expect(accompanied.history.at(-1)?.type).toBe('COMPANION');
    expect(accompanied.people['consort-test'].stats.心情).toBe(74);
    expect(accompanied.relationships.find((relation) => relation.id === 'rel-emperor-consort-test')?.affinity).toBe(80);
  });

  it('allows an infertile consort to be visited but never creates a pregnancy', () => {
    const state = withConsort();
    state.people['consort-test'].infertile = true;
    state.gameSettings.pregnancyRate = 100;
    const next = advanceGameState(schedulePalaceVisit(state, 'consort-test'), 69_000, 1);
    expect(next.visits[0].status).toBe('PROCESSED');
    expect(next.pregnancies).toHaveLength(0);
    expect(next.people['consort-test'].status).toBe('NORMAL');
  });

  it('locks twin count when conception succeeds', () => {
    const state = withConsort();
    state.gameSettings.pregnancyRate = 100;
    state.gameSettings.miscarriageRate = 0;
    state.gameSettings.twinRate = 100;
    const next = advanceGameState(schedulePalaceVisit(state, 'consort-test'), 69_000, 1);
    expect(next.pregnancies[0]).toMatchObject({ status: 'ACTIVE', fetusCount: 2 });
  });

  it('settles a palace visit at the next mao hour, not at midnight', () => {
    const state = schedulePalaceVisit(withConsort(), 'consort-test');
    const beforeMao = advanceGameState(state, 66_000, 1);
    expect(beforeMao.clock.minuteOfDay).toBe(300);
    expect(beforeMao.visits[0].status).toBe('PENDING');
    const atMao = advanceGameState(beforeMao, 3_000, 1);
    expect(atMao.clock.minuteOfDay).toBe(360);
    expect(atMao.visits[0].status).toBe('PROCESSED');
  });

  it('resolves an attendant event only once', () => {
    const state = withConsort();
    state.events = [{ id: 'notice', type: 'SYSTEM_NOTICE', priority: 1, createdOn: { year: 3, month: 10, day: 18 }, personIds: [], title: '内侍传言', body: '测试', choices: [{ id: 'ok', label: '知悉', result: '已知悉。' }], defaultChoiceId: 'ok', status: 'PENDING' }];
    const resolved = resolveEvent(state, 'notice', 'ok');
    const duplicate = resolveEvent(resolved, 'notice', 'ok');
    expect(resolved.events[0].status).toBe('RESOLVED');
    expect(duplicate.history).toHaveLength(1);
  });

  it('raises emperor happiness only when a pregnancy notice is greeted with joy', () => {
    const state = withConsort();
    state.events = [{ id: 'pregnancy-notice', type: 'PREGNANCY_NOTICE', priority: 80, createdOn: { year: 3, month: 10, day: 18 }, personIds: ['consort-test'], title: '内侍传言', body: '顾贵人已有喜脉。', choices: [{ id: 'rejoice', label: '大喜', result: '龙心大悦。' }, { id: 'silence', label: '暂不声张', result: '暂不声张。' }], status: 'PENDING' }];
    const before = state.people.emperor.stats.快乐;
    const rejoiced = resolveEvent(state, 'pregnancy-notice', 'rejoice');
    expect(rejoiced.people.emperor.stats.快乐).toBe(before + 8);

    const silentState = withConsort();
    silentState.events = [{ ...state.events[0], status: 'PENDING' }];
    expect(resolveEvent(silentState, 'pregnancy-notice', 'silence').people.emperor.stats.快乐).toBe(before);
  });

  it('keeps one daytime destination for the whole day and returns consorts home at night', () => {
    const state = withConsort();
    const outingDate = Array.from({ length: 100 }, (_, index) => ({ year: 3, month: 1 + Math.floor(index / 28), day: 1 + index % 28 })).find((date) => updateConsortLocations(state, date, 600).people['consort-test'].sceneId !== 'yikun:西侧殿')!;
    const morning = updateConsortLocations(state, outingDate, 600);
    const afternoon = updateConsortLocations(morning, outingDate, 960);
    expect(morning.people['consort-test'].sceneId).not.toBe('yikun:西侧殿');
    expect(afternoon.people['consort-test'].sceneId).toBe(morning.people['consort-test'].sceneId);
    const night = updateConsortLocations(afternoon, outingDate, 1080);
    expect(night.people['consort-test'].sceneId).toBe('yikun:西侧殿');
    expect(night.people.empress.sceneId).toBe('kuning:主殿');
  });

  it('pins a visible consort in the current scene while the emperor is interacting there', () => {
    const state = withConsort();
    const date = { year: 3, month: 3, day: 18 };
    state.people['consort-test'].sceneId = 'garden';
    const next = updateConsortLocations(state, date, 1200, 'garden');
    expect(next.people['consort-test'].sceneId).toBe('garden');
  });

  it('keeps ordinary consort daytime outings uncommon', () => {
    const state = withConsort();
    const outings = Array.from({ length: 100 }, (_, index) => ({ year: 3, month: 1 + Math.floor(index / 28), day: 1 + index % 28 })).filter((date) => updateConsortLocations(state, date, 600).people['consort-test'].sceneId !== 'yikun:西侧殿');
    expect(outings.length).toBeGreaterThanOrEqual(15);
    expect(outings.length).toBeLessThanOrEqual(35);
  });

  it('runs selection, entry wait, empress proposal, and emperor confirmation across two months', () => {
    let state = schedulePalaceSelection(createInitialGameState());
    expect(state.palaceSelection?.status).toBe('SCHEDULED');
    state = advanceGameState(state, 31 * 72_000, 1);
    expect(state.palaceSelection?.status).toBe('SELECTING');
    expect(state.events.find((event) => event.id.startsWith('event-selection-open-'))).toMatchObject({
      title: '内侍传言',
      status: 'PENDING',
      choices: expect.arrayContaining([expect.objectContaining({ id: 'go-selection', label: '前往交泰殿' })]),
    });
    const candidates = state.palaceSelection!.candidates;
    candidates.forEach((candidate, index) => {
      state = decideSelectionCandidate(state, candidate.id, index < 2 ? 'SELECTED' : 'REJECTED');
    });
    expect(state.palaceSelection?.status).toBe('AWAITING_ENTRY');
    state = advanceGameState(state, 30 * 72_000, 1);
    expect(state.palaceSelection?.status).toBe('AWAITING_REVIEW');
    expect(state.events.find((event) => event.id.startsWith('event-selection-review-'))).toMatchObject({
      title: '内侍传言',
      status: 'PENDING',
      choices: expect.arrayContaining([expect.objectContaining({ id: 'go-selection-review', label: '前往交泰殿' })]),
    });
    const selected = state.palaceSelection!.candidates.filter((candidate) => candidate.decision === 'SELECTED');
    state = confirmPalaceSelection(state, selected.map((candidate, index) => ({ candidateId: candidate.id, rank: index ? '常在' : '贵人', residence: index ? '储秀宫西侧殿' : '储秀宫东侧殿' })));
    expect(state.palaceSelection?.status).toBe('COMPLETED');
    expect(state.people[selected[0].id]).toMatchObject({ kind: 'CONSORT', rank: '贵人', residence: '储秀宫东侧殿', sceneId: 'chuxiu:东侧殿' });
    expect(state.relationships.some((relation) => relation.personBId === selected[0].id && relation.kind === 'SPOUSE')).toBe(true);
  });

  it('never reuses a candidate name in a later selection of the same dynasty', () => {
    let state = schedulePalaceSelection(createInitialGameState());
    const firstNames = new Set(state.palaceSelection!.candidates.map((candidate) => candidate.name));
    state = { ...state, palaceSelection: { ...state.palaceSelection!, status: 'COMPLETED' } };
    state = schedulePalaceSelection(state);
    expect(state.palaceSelection!.candidates.every((candidate) => !firstNames.has(candidate.name))).toBe(true);
  });

  it('creates a royal child and birth notice on the due date', () => {
    const state = withConsort();
    state.gameSettings.maleBirthRate = 100;
    state.pregnancies = [{ id: 'pregnancy-demo', consortId: 'consort-test', fatherId: 'emperor', conceivedOn: { year: 2, month: 12, day: 19 }, dueOn: { year: 3, month: 10, day: 19 }, status: 'ACTIVE', risk: 10 }];
    state.people['consort-test'].status = 'PREGNANT';
    const next = advanceGameState(state, 72_000, 1);
    const child = Object.values(next.people).find((person) => person.id.startsWith('child-'));
    expect(child?.parents).toEqual(['emperor', 'consort-test']);
    expect(next.events.some((event) => event.type === 'BIRTH_NOTICE')).toBe(true);
    expect(next.events.find((event) => event.type === 'BIRTH_NOTICE')?.body).toContain('贵人顾清漪平安诞下');
    expect(next.pregnancies[0].status).toBe('DELIVERED');
    expect(next.relationships.some((relation) => relation.personAId === 'consort-test' && relation.personBId === child?.id)).toBe(true);
    expect(child?.status).toBe('NORMAL');
    expect(next.people['consort-test'].status).toBe('REST');
    expect(child?.title).toBe('皇长子');
    expect(child?.birthOrder).toBe(1);
    expect(child?.motherId).toBe('consort-test');
    expect(child?.adoptiveMotherId).toBeUndefined();
    expect(next.events.find((event) => event.type === 'BIRTH_NOTICE')?.choices.map((choice) => choice.id)).toEqual(['birth-treasure', 'birth-promote', 'birth-rejoice', 'birth-visit']);
  });

  it('resolves a pregnancy as a miscarriage before the due date', () => {
    const state = withConsort();
    state.gameSettings.miscarriageRate = 100;
    state.gameSettings.postMiscarriageInfertilityRate = 100;
    state.pregnancies = [{ id: 'pregnancy-loss', consortId: 'consort-test', fatherId: 'emperor', conceivedOn: { year: 3, month: 10, day: 1 }, dueOn: { year: 4, month: 8, day: 1 }, status: 'ACTIVE', risk: 10, fetusCount: 1 }];
    state.people['consort-test'].status = 'PREGNANT';
    const beforeHealth = state.people['consort-test'].stats.健康;
    const next = processPregnancies(state, { year: 3, month: 10, day: 2 });
    expect(next.pregnancies[0].status).toBe('LOST');
    expect(next.people['consort-test']).toMatchObject({ status: 'NORMAL', miscarriageCount: 1, infertile: true });
    expect(next.people['consort-test'].stats.健康).toBe(beforeHealth - 15);
    expect(next.events.filter((event) => event.type === 'MISCARRIAGE_NOTICE')).toHaveLength(1);
    expect(Object.values(next.people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS')).toHaveLength(0);
  });

  it('does not produce after the mother has died', () => {
    const state = withConsort();
    state.people['consort-test'].status = 'DEAD';
    state.people['consort-test'].deathDate = state.clock;
    state.pregnancies = [{ id: 'pregnancy-dead', consortId: 'consort-test', fatherId: 'emperor', conceivedOn: state.clock, dueOn: state.clock, status: 'ACTIVE', risk: 10, fetusCount: 2 }];
    const next = processPregnancies(state, state.clock);
    expect(next.pregnancies[0].status).toBe('LOST');
    expect(next.events.some((event) => event.type === 'BIRTH_NOTICE' || event.type === 'MISCARRIAGE_NOTICE')).toBe(false);
    expect(next.people['consort-test'].status).toBe('DEAD');
  });

  it('creates two independently-sexed children and one twin event', () => {
    const state = withConsort();
    state.gameSettings.maleBirthRate = 50;
    state.gameSettings.miscarriageRate = 0;
    state.pregnancies = [{ id: 'pregnancy-twins', consortId: 'consort-test', fatherId: 'emperor', conceivedOn: { year: 2, month: 12, day: 19 }, dueOn: { year: 3, month: 10, day: 19 }, status: 'ACTIVE', risk: 10, fetusCount: 2 }];
    state.people['consort-test'].status = 'PREGNANT';
    const next = processPregnancies(state, { year: 3, month: 10, day: 19 });
    const children = Object.values(next.people).filter((person) => person.id.startsWith('child-'));
    expect(children).toHaveLength(2);
    expect(next.events.filter((event) => event.type === 'BIRTH_NOTICE')).toHaveLength(1);
    const birthBody = next.events.find((event) => event.type === 'BIRTH_NOTICE')?.body ?? '';
    expect(birthBody).toMatch(/双生|龙凤呈祥/);
    expect(birthBody).not.toContain('待赐名');
    expect(children.every((child) => !birthBody.includes(child.name))).toBe(true);
    const birthEvent = next.events.find((event) => event.type === 'BIRTH_NOTICE');
    expect(birthEvent?.choices.find((choice) => choice.id === 'birth-promote')).toMatchObject({ label: '晋升位份（连升两级）' });
    const promoted = resolveEvent(next, birthEvent!.id, 'birth-promote');
    expect(promoted.people['consort-test'].rank).toBe('妃');
    expect(next.people['consort-test'].children).toEqual(children.map((child) => child.id));
  });

  it('keeps birth order after death and counts princes separately from princesses', () => {
    const state = withConsort();
    state.gameSettings.maleBirthRate = 100;
    state.people['dead-prince'] = { id: 'dead-prince', kind: 'PRINCE', name: '萧故', sex: 'MALE', birthDate: { year: 1, month: 1, day: 1 }, age: 20, title: '皇长子', birthOrder: 1, motherId: 'consort-test', residence: '撷芳殿', sceneId: 'xiefang', status: 'DEAD', deathDate: { year: 3, month: 1, day: 1 }, assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' }, parents: ['emperor', 'consort-test'], children: [], stats: {}, traits: [] };
    state.people['dead-princess'] = { ...state.people['dead-prince'], id: 'dead-princess', kind: 'PRINCESS', name: '萧故宁', sex: 'FEMALE', title: '皇长女', birthOrder: 1 };
    state.pregnancies = [{ id: 'pregnancy-next-prince', consortId: 'consort-test', fatherId: 'emperor', conceivedOn: { year: 2, month: 12, day: 19 }, dueOn: { year: 3, month: 10, day: 19 }, status: 'ACTIVE', risk: 10 }];
    state.people['consort-test'].status = 'PREGNANT';
    const next = processPregnancies(state, { year: 3, month: 10, day: 19 });
    const child = Object.values(next.people).find((person) => person.id.startsWith('child-'));
    expect(child).toMatchObject({ kind: 'PRINCE', birthOrder: 2, title: '皇次子', motherId: 'consort-test' });
  });

  it('offers a birth honorific when the next consort rank is full', () => {
    const state = withConsort();
    state.people['consort-test'] = { ...state.people['consort-test'], rank: '皇贵妃', title: '皇贵妃' };
    state.pregnancies = [{ id: 'pregnancy-full-rank', consortId: 'consort-test', fatherId: 'emperor', conceivedOn: { year: 2, month: 12, day: 19 }, dueOn: { year: 3, month: 10, day: 19 }, status: 'ACTIVE', risk: 10 }];
    state.people['consort-test'].status = 'PREGNANT';
    const next = advanceGameState(state, 72_000, 1);
    const birthEvent = next.events.find((event) => event.type === 'BIRTH_NOTICE');
    expect(birthEvent?.choices.map((choice) => choice.id)).toContain('birth-honorific');
    expect(birthEvent?.choices.map((choice) => choice.id)).not.toContain('birth-promote');
  });
  it('does not offer a rank promotion choice when the empress gives birth', () => {
    const state = createInitialGameState();
    state.pregnancies = [{ id: 'pregnancy-empress', consortId: 'empress', fatherId: 'emperor', conceivedOn: { year: 2, month: 12, day: 19 }, dueOn: { year: 3, month: 10, day: 19 }, status: 'ACTIVE', risk: 10 }];
    state.people.empress.status = 'PREGNANT';
    const next = advanceGameState(state, 72_000, 1);
    const birthEvent = next.events.find((event) => event.type === 'BIRTH_NOTICE');
    expect(birthEvent).toBeDefined();
    expect(birthEvent!.body).toContain('皇后沈清和平安诞下');
    expect(birthEvent!.choices.map((choice) => choice.id)).not.toContain('birth-promote');
    expect(birthEvent!.choices.map((choice) => choice.id)).toEqual(['birth-treasure', 'birth-rejoice', 'birth-visit']);
  });

  it('applies birth rewards and names a royal child without duplication', () => {
    const state = withConsort();
    state.people['child-demo'] = { id: 'child-demo', kind: 'PRINCE', name: '待赐名皇子二', named: false, sex: 'MALE', birthDate: { year: 3, month: 10, day: 18 }, age: 0, title: '二皇子', residence: '撷芳殿', sceneId: 'xiefang', status: 'NORMAL', assets: { avatar: 'portrait.prince', portrait: 'portrait.prince' }, parents: ['emperor', 'consort-test'], children: [], stats: { 健康: 80 }, traits: [] };
    state.people['existing-child'] = { ...state.people['child-demo'], id: 'existing-child', name: '萧景明', named: true };
    state.events = [{ id: 'event-birth-child-demo', type: 'BIRTH_NOTICE', priority: 100, createdOn: { year: 3, month: 10, day: 18 }, personIds: ['consort-test', 'child-demo'], title: '内侍传言', body: '顾清漪诞下皇子。', choices: [{ id: 'birth-promote', label: '晋升位份', result: '晋升一级。' }], status: 'PENDING' }];
    state.people['consort-test'].honorific = '慧';
    const promoted = resolveEvent(state, 'event-birth-child-demo', 'birth-promote');
    expect(promoted.people['consort-test'].rank).toBe('嫔');
    expect(promoted.people['consort-test'].honorific).toBe('慧');
    const suggestion = getRoyalNameSuggestions(promoted.people['child-demo'], promoted.people, 1)[0];
    const named = nameRoyalChild(promoted, 'child-demo', suggestion);
    expect(named.people['child-demo']).toMatchObject({ name: suggestion, named: true });
    expect(nameRoyalChild(named, 'child-demo', named.people['existing-child'].name)).toBe(named);
  });

  it('starts with one empress, no royal children, and a working court', () => {
    const state = createInitialGameState();
    expect(Object.values(state.people).filter((person) => person.kind === 'CONSORT')).toHaveLength(1);
    expect(Object.values(state.people).filter((person) => person.kind === 'PRINCE' || person.kind === 'PRINCESS')).toHaveLength(0);
    expect(Object.values(state.people).filter((person) => person.kind === 'MINISTER').length).toBeGreaterThanOrEqual(8);
  });

  it('replaces a deceased minister while preserving the vacant office', () => {
    const state = createInitialGameState();
    state.people['minister-002'] = { ...state.people['minister-002'], age: 110, stats: { ...state.people['minister-002'].stats, 健康: 1 } };
    let next = state;
    let date = { year: 4, month: 1, day: 1 };
    for (let day = 0; day < 400 && next.people['minister-002'].status !== 'DEAD'; day += 1) {
      next = processDailyLifeCycle(next, date);
      date = nextDate(date);
    }
    expect(next.people['minister-002'].status).toBe('DEAD');
    expect(Object.values(next.people).some((person) => person.id !== 'minister-002' && person.kind === 'MINISTER' && person.office === '太傅')).toBe(true);
    expect(next.history.some((entry) => entry.type === 'OFFICIAL_SUCCESSION')).toBe(true);
    const successor = Object.values(next.people).find((person) => person.id !== 'minister-002' && person.kind === 'MINISTER' && person.office === '太傅');
    expect(successor).toBeDefined();
    expect(next.usedNames.ministers).toContain(successor!.name);
  });

  it('provides unique five-hundred-name libraries for every generated role', () => {
    expect(PRINCE_GIVEN_NAMES).toHaveLength(500);
    expect(PRINCESS_GIVEN_NAMES).toHaveLength(500);
    expect(MINISTER_NAME_POOL).toHaveLength(500);
    expect(new Set(PRINCE_GIVEN_NAMES).size).toBe(500);
    expect(new Set(PRINCESS_GIVEN_NAMES).size).toBe(500);
    expect(new Set(MINISTER_NAME_POOL).size).toBe(500);
  });

  it('generates multiple consort candidates that are unique among themselves and against the used-name set', () => {
    const usedFullNames = new Set(['沈含章', '顾云蘅', '陆瑾瑜']);
    const result = generateConsortCandidates({
      usedFullNames,
      count: 6,
      seed: 2026_09_04,
    });
    expect(result).toHaveLength(6);
    expect(new Set(result).size).toBe(6);
    for (const name of result) {
      expect(usedFullNames.has(name)).toBe(false);
      expect(name.length).toBeGreaterThanOrEqual(3);
    }
    // 同一批候选的字对不重复（不允许出现同字对两次）
    const usedGiven = new Set<string>();
    for (const name of result) {
      const given = name.slice(1);
      expect(usedGiven.has(given)).toBe(false);
      usedGiven.add(given);
    }
  });

  it('Yields candidates with diverse given-name pairs across batches (low 重名率)', () => {
    // 模拟多轮选秀：连续 6 批，每批 6 个候选，应至少出现 30 个不同的字对
    const usedFullNames = new Set<string>();
    const allPairs = new Set<string>();
    for (let seed = 1; seed <= 6; seed += 1) {
      const batch = generateConsortCandidates({
        usedFullNames,
        count: 6,
        seed: 2026_09_00 + seed,
      });
      for (const name of batch) {
        usedFullNames.add(name);
        allPairs.add(name.slice(1));
      }
    }
    // 36 个人的后宫里至少有 25+ 种不重复字对（旧方案最多 25 种）
    expect(allPairs.size).toBeGreaterThanOrEqual(25);
  });

  it('ships a Manchu surname and minister-name pool distinct from the Han pool', () => {
    expect(manchuSurnames).toContain('乌拉那拉');
    expect(manchuSurnames).toContain('富察');
    expect(MANCHU_MINISTER_NAME_POOL).toContain('乌拉那拉景则');
    expect(MANCHU_MINISTER_NAME_POOL).toContain('富察德林');
    expect(MANCHU_MINISTER_NAME_POOL).toContain('叶赫那拉图海');
    expect(new Set(MANCHU_MINISTER_NAME_POOL).size).toBe(MANCHU_MINISTER_NAME_POOL.length);
    // 汉族池与满族池应当完全不相交
    const overlap = MANCHU_MINISTER_NAME_POOL.filter((name) => MINISTER_NAME_POOL.includes(name));
    expect(overlap).toEqual([]);
  });

  it('merges the Han and Manchu minister name pools into MINISTER_NAME_POOL_ALL', () => {
    expect(MINISTER_NAME_POOL_ALL.length).toBe(MINISTER_NAME_POOL.length + MANCHU_MINISTER_NAME_POOL.length);
    expect(new Set(MINISTER_NAME_POOL_ALL).size).toBe(MINISTER_NAME_POOL_ALL.length);
    expect(MINISTER_NAME_POOL_ALL).toContain('沈砚之');
    expect(MINISTER_NAME_POOL_ALL).toContain('乌拉那拉景则');
  });

  it('detects Manchu surnames and slices the given name after the compound surname', () => {
    expect(isManchuSurname('乌拉那拉')).toBe(true);
    expect(isManchuSurname('叶赫那拉')).toBe(true);
    expect(isManchuSurname('富察')).toBe(true);
    expect(isManchuSurname('沈')).toBe(false);
    expect(givenStartIndex('沈含章')).toBe(1);
    expect(givenStartIndex('乌拉那拉海兰')).toBe(4);
    expect(givenStartIndex('叶赫那拉绮云')).toBe(4);
    expect(givenStartIndex('富察')).toBe(2); // 单"富察"本身也按 2 字处理
    expect(givenStartIndex('富察德林')).toBe(2);
  });

  it('removes a legacy Han surname accidentally prepended to a Manchu name', () => {
    expect(normalizePersonName('陆赫那拉蒂蕊')).toBe('叶赫那拉蒂蕊');
    expect(normalizePersonName('陆乌拉那拉海兰')).toBe('乌拉那拉海兰');
    expect(normalizePersonName('叶赫那拉蒂蕊')).toBe('叶赫那拉蒂蕊');
    expect(normalizePersonName('沈含章')).toBe('沈含章');
  });

  it('occasionally includes Manchu-surnamed consort candidates with proper naming', () => {
    // 高概率满族采样 → 6 个候选里至少出现 1 个满族复姓
    const usedFullNames = new Set<string>();
    const result = generateConsortCandidates({
      usedFullNames,
      count: 6,
      seed: 2026_09_05,
      manchuProbability: 1,
      fallbackSurnames: [], // 关掉汉姓支路，确保只走满族路径
    });
    expect(result).toHaveLength(6);
    for (const name of result) {
      expect(name.length).toBeGreaterThanOrEqual(4);
      const offset = givenStartIndex(name);
      expect(offset).toBeGreaterThanOrEqual(2);
      const given = name.slice(offset);
      expect(given.length).toBe(2);
      // 满族名仍然去重
      expect(usedFullNames.has(name)).toBe(false);
      usedFullNames.add(name);
    }
    // 满族名 6 个互不重复
    expect(new Set(result).size).toBe(6);
  });

  it('mixes Han and Manchu surnames in default consort candidate batches', () => {
    // 30% 满族概率 + 默认姓氏池 → 60 个候选里至少 5 个满族复姓
    const usedFullNames = new Set<string>();
    let manchuCount = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const batch = generateConsortCandidates({
        usedFullNames,
        count: 6,
        seed: 2026_09_10 + seed,
      });
      for (const name of batch) {
        usedFullNames.add(name);
        const offset = givenStartIndex(name);
        if (offset >= 2) manchuCount += 1;
      }
    }
    // 10 批 × 6 = 60 个候选，理论期望 60 × 0.3 ≈ 18 个满族；
    // 给一个稳健下界 8，避免小概率抖动
    expect(manchuCount).toBeGreaterThanOrEqual(8);
  });
});
