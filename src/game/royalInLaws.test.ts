import { expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { createMinistryCandidates, marryCandidate } from './royalMarriage';
import { killPerson } from './person';
import { deceasedRoyals, posthumousTitleOptions } from './posthumousTitles';
import { getAvailableRoyalActions, isCurrentlyInPalace, summonRoyal } from './royalRoster';

it.each(['PRINCE', 'PRINCESS'] as const)('keeps a %s spouse outside and reports the marriage relationship on death', kind => {
  const initial = createInitialGameState();
  initial.people.royal = { ...initial.people.empress, id: 'royal', kind, name: '萧承安', age: 20, sex: kind === 'PRINCE' ? 'MALE' : 'FEMALE', title: kind === 'PRINCE' ? '皇子' : '公主' };
  initial.events = [];
  const candidate = createMinistryCandidates(initial, 'royal')[0];
  const married = marryCandidate(initial, 'royal', candidate);
  const spouseId = `noble-${candidate.id}`;
  const spouse = married.people[spouseId];
  expect(spouse.sceneId).toBe('outside');
  expect(isCurrentlyInPalace({ ...spouse, isSummoned: true, residenceType: 'PALACE' }, married)).toBe(false);
  expect(getAvailableRoyalActions(spouse, married)).toEqual([]);
  expect(summonRoyal(married, spouseId)).toBe(married);

  // Older saves stored the spouse as a noble in the royal child's palace.
  married.people[spouseId] = { ...spouse, royalSpouseOf: undefined, title: '朝臣嫡子女', sceneId: 'yuqing', residenceType: 'PALACE', isSummoned: true };
  const loaded = migrateGameState(JSON.parse(JSON.stringify(married)));
  expect(loaded.people[spouseId].sceneId).toBe('outside');
  expect(loaded.people[spouseId].isSummoned).toBe(false);
  const dead = killPerson(loaded, spouseId, '疾病');
  const notice = dead.events.find(e => e.id === `death-notice-${spouseId}`)!;
  expect(notice.title).toBe('内侍禀报 · 姻亲丧讯');
  expect(notice.body).toContain(kind === 'PRINCE' ? '萧承安皇子的王妃' : '萧承安公主的驸马');
  expect(notice.choices.map(c => c.label)).toEqual(['朕知道了']);
  expect(deceasedRoyals(dead.people).some(p => p.id === spouseId)).toBe(false);
  expect(posthumousTitleOptions(dead.people[spouseId])).toEqual([]);
  // Pending notices created by an older build also lose royal mourning choices.
  dead.events = dead.events.map(e => ({ ...e, title: '宗亲丧讯', choices: [{ id: 'posthumous', label: '前去追封', result: '' }] }));
  expect(migrateGameState(dead).events[0].choices.map(c => c.label)).toEqual(['朕知道了']);
});
