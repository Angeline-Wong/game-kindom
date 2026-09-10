import { describe, expect, it } from 'vitest';
import { availableDialoguesFor, dialogueCounts, dialogueLibraryFor, pickDialogueForPerson } from './dialogueLibrary';
import type { PersonRecord } from './gameState';

const consort = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'consort-test', kind: 'CONSORT', name: '顾清漪', sex: 'FEMALE', birthDate: { year: -10, month: 1, day: 1 }, age: 22,
  title: '贵人', rank: '贵人', status: 'NORMAL', sceneId: 'yikun:西侧殿', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: {}, traits: [], ...overrides,
});

const prince = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'prince-test', kind: 'PRINCE', name: '萧景昀', sex: 'MALE', birthDate: { year: -8, month: 1, day: 1 }, age: 12,
  title: '三皇子', status: 'NORMAL', sceneId: 'xiefang', assets: { avatar: '', portrait: '' },
  parents: ['emperor', 'empress'], children: [], stats: {}, traits: [], ...overrides,
});

const dowager = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'dowager-test', kind: 'DOWAGER', name: '孝和太后', sex: 'FEMALE', birthDate: { year: -55, month: 2, day: 16 }, age: 58,
  title: '皇太后', rank: '皇太后', status: 'NORMAL', sceneId: 'cining', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: {}, traits: [], ...overrides,
});

const noble = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'noble-test', kind: 'NOBLE', name: '荣太妃', sex: 'FEMALE', birthDate: { year: -50, month: 9, day: 7 }, age: 53,
  title: '太妃', rank: '太妃', status: 'NORMAL', sceneId: 'shoukang', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: {}, traits: [], ...overrides,
});

const princess = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'princess-test', kind: 'PRINCESS', name: '萧景宁', sex: 'FEMALE', birthDate: { year: -7, month: 3, day: 4 }, age: 14,
  title: '大公主', status: 'NORMAL', sceneId: 'shouning', assets: { avatar: '', portrait: '' },
  parents: ['emperor', 'empress'], children: [], stats: {}, traits: [], ...overrides,
});

const minister = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'minister-test', kind: 'MINISTER', name: '沈砚之', sex: 'MALE', birthDate: { year: -43, month: 1, day: 5 }, age: 46,
  title: '翰林学士', rank: '正五品', status: 'NORMAL', sceneId: 'wenhua', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: {}, traits: [], ...overrides,
});

const eunuch = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'eunuch-test', kind: 'EUNUCH', name: '李安', sex: 'MALE', birthDate: { year: -34, month: 5, day: 6 }, age: 34,
  title: '内侍', rank: '正七品', status: 'NORMAL', sceneId: 'taihe', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: {}, traits: [], ...overrides,
});

const courtLady = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: 'courtlady-test', kind: 'COURT_LADY', name: '青儿', sex: 'FEMALE', birthDate: { year: -28, month: 6, day: 9 }, age: 22,
  title: '宫女', status: 'NORMAL', sceneId: 'kuning:主殿', assets: { avatar: '', portrait: '' },
  parents: [], children: [], stats: {}, traits: [], ...overrides,
});

describe('dialogue library', () => {
  it('contains a substantial pool across all eight person kinds', () => {
    const counts = dialogueCounts();
    expect(counts.consort).toBeGreaterThanOrEqual(38);
    expect(counts.prince).toBeGreaterThanOrEqual(25);
    expect(counts.dowager).toBeGreaterThanOrEqual(16);
    expect(counts.noble).toBeGreaterThanOrEqual(12);
    expect(counts.princess).toBeGreaterThanOrEqual(12);
    expect(counts.minister).toBeGreaterThanOrEqual(20);
    expect(counts.eunuch).toBeGreaterThanOrEqual(12);
    expect(counts.courtLady).toBeGreaterThanOrEqual(10);
  });

  it('exposes dialogue libraries per kind', () => {
    expect(dialogueLibraryFor('DOWAGER').length).toBeGreaterThan(0);
    expect(dialogueLibraryFor('NOBLE').length).toBeGreaterThan(0);
    expect(dialogueLibraryFor('PRINCESS').length).toBeGreaterThan(0);
    expect(dialogueLibraryFor('MINISTER').length).toBeGreaterThan(0);
    expect(dialogueLibraryFor('EUNUCH').length).toBeGreaterThan(0);
    expect(dialogueLibraryFor('COURT_LADY').length).toBeGreaterThan(0);
  });

  it('routes each kind to its own library through availableDialoguesFor', () => {
    expect(availableDialoguesFor(dowager()).length).toBeGreaterThan(0);
    expect(availableDialoguesFor(noble()).length).toBeGreaterThan(0);
    expect(availableDialoguesFor(princess()).length).toBeGreaterThan(0);
    expect(availableDialoguesFor(minister()).length).toBeGreaterThan(0);
    expect(availableDialoguesFor(eunuch()).length).toBeGreaterThan(0);
    expect(availableDialoguesFor(courtLady()).length).toBeGreaterThan(0);
  });

  it('filters pregnancy, postpartum, child and adult scenes by current status', () => {
    const normal = availableDialoguesFor(consort());
    expect(normal.some((scene) => scene.id === 'consort-pregnant-care')).toBe(false);
    expect(availableDialoguesFor(consort({ status: 'PREGNANT' })).some((scene) => scene.id === 'consort-pregnant-care')).toBe(true);
    expect(availableDialoguesFor(consort({ status: 'REST', children: ['child-1'] })).some((scene) => scene.id === 'consort-postpartum')).toBe(true);
    expect(availableDialoguesFor(prince()).some((scene) => scene.id === 'prince-adult-duty')).toBe(false);
    expect(availableDialoguesFor(prince({ age: 15 })).some((scene) => scene.id === 'prince-adult-duty')).toBe(true);
  });

  it('keeps low-roll selection on the first scene and interpolates the person name', () => {
    const scene = pickDialogueForPerson(consort(), .2);
    expect(scene?.id).toBe('consort-greeting');
    expect(scene?.text).toContain('臣妾');
    expect(scene?.choices).toHaveLength(2);
    expect(scene?.followUp?.choices.length).toBeGreaterThanOrEqual(1);
    expect(scene?.followUp?.choices.length).toBeLessThanOrEqual(2);
  });

  it('selects a dialogue for the dowager, minister, eunuch and court lady kinds', () => {
    const dowagerScene = pickDialogueForPerson(dowager(), .5);
    expect(dowagerScene).toBeDefined();
    expect(dowagerScene?.kind).toBe('DOWAGER');

    const ministerScene = pickDialogueForPerson(minister(), .5);
    expect(ministerScene).toBeDefined();
    expect(ministerScene?.kind).toBe('MINISTER');

    const eunuchScene = pickDialogueForPerson(eunuch(), .5);
    expect(eunuchScene).toBeDefined();
    expect(eunuchScene?.kind).toBe('EUNUCH');

    const ladyScene = pickDialogueForPerson(courtLady(), .5);
    expect(ladyScene).toBeDefined();
    expect(ladyScene?.kind).toBe('COURT_LADY');
  });

  it('keeps consort rivalry and palaceStrife tags alive in the library', () => {
    const all = dialogueLibraryFor('CONSORT');
    expect(all.some((scene) => scene.tags?.includes('rivalry'))).toBe(true);
    expect(all.some((scene) => scene.tags?.includes('palaceStrife'))).toBe(true);
  });

  it('keeps court lady rivalry and palaceStrife tags alive in the library', () => {
    const all = dialogueLibraryFor('COURT_LADY');
    expect(all.some((scene) => scene.tags?.includes('rivalry'))).toBe(true);
    expect(all.some((scene) => scene.tags?.includes('palaceStrife'))).toBe(true);
  });

  it('restricts palaceStrife and rivalry to consort and court lady only', () => {
    for (const kind of ['DOWAGER', 'NOBLE', 'PRINCESS', 'MINISTER', 'EUNUCH', 'PRINCE'] as const) {
      const all = dialogueLibraryFor(kind);
      expect(all.some((scene) => scene.tags?.includes('palaceStrife')), `${kind} should not contain palaceStrife`).toBe(false);
      expect(all.some((scene) => scene.tags?.includes('rivalry')), `${kind} should not contain rivalry`).toBe(false);
    }
  });

  it('filters prince and princess dialogues by the child\'s age band', () => {
    // 0 岁皇子：只能抽到 0-1 段，绝不出学龄/政治类对话
    const infant = availableDialoguesFor(prince({ age: 0 }));
    expect(infant.length).toBeGreaterThan(0);
    expect(infant.some((scene) => scene.id === 'prince-infant-snuggle')).toBe(true);
    expect(infant.some((scene) => scene.id === 'prince-calligraphy')).toBe(false);
    expect(infant.some((scene) => scene.id === 'prince-study')).toBe(false);
    expect(infant.some((scene) => scene.id === 'prince-adult-state')).toBe(false);
    // 8 岁皇子：可抽到 7+ 段，绝不出 0-1 段
    const school = availableDialoguesFor(prince({ age: 8 }));
    expect(school.some((scene) => scene.id === 'prince-calligraphy')).toBe(true);
    expect(school.some((scene) => scene.id === 'prince-infant-snuggle')).toBe(false);
    expect(school.some((scene) => scene.id === 'prince-study')).toBe(false);
    // 15 岁皇子：可抽到 13+ 段
    const teen = availableDialoguesFor(prince({ age: 15 }));
    expect(teen.some((scene) => scene.id === 'prince-study')).toBe(true);
    expect(teen.some((scene) => scene.id === 'prince-adult-duty')).toBe(true);
    expect(teen.some((scene) => scene.id === 'prince-infant-snuggle')).toBe(false);
    // 公主 0 岁不出学龄、4 岁可出「生辰」、「小皇子」，但不出 7+ 的「临《孝经》」
    const infantPr = availableDialoguesFor(princess({ age: 0 }));
    expect(infantPr.some((scene) => scene.id === 'princess-infant-snuggle')).toBe(true);
    expect(infantPr.some((scene) => scene.id === 'princess-calligraphy')).toBe(false);
    const lowPr = availableDialoguesFor(princess({ age: 4 }));
    expect(lowPr.some((scene) => scene.id === 'princess-birthday')).toBe(true);
    expect(lowPr.some((scene) => scene.id === 'princess-calligraphy')).toBe(false);
    const teenPr = availableDialoguesFor(princess({ age: 14 }));
    expect(teenPr.some((scene) => scene.id === 'princess-marriage')).toBe(true);
    expect(teenPr.some((scene) => scene.id === 'princess-infant-snuggle')).toBe(false);
  });
});

