import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from './initialGameState';
import { confirmPalaceSelection, schedulePalaceSelection } from './palaceSelection';
import { consortPortraitUrls } from './personPortraits';
import { givenStartIndex, isManchuSurname } from './namePools';

describe('palace selection family binding', () => {
  it('keeps a Manchu compound surname intact when binding the candidate to her father', () => {
    const scheduled = schedulePalaceSelection(createInitialGameState());
    const manchuCandidate = scheduled.palaceSelection!.candidates.find((candidate) => givenStartIndex(candidate.name) >= 2);

    expect(manchuCandidate).toBeDefined();
    const surnameLength = givenStartIndex(manchuCandidate!.name);
    expect(isManchuSurname(manchuCandidate!.name.slice(0, surnameLength))).toBe(true);
  });

  it('binds an admitted consort to her minister father in people and relationships', () => {
    const scheduled = schedulePalaceSelection(createInitialGameState());
    const candidate = scheduled.palaceSelection!.candidates[0];
    const fatherId = candidate.parentMinisterId!;
    const reviewState = {
      ...scheduled,
      palaceSelection: {
        ...scheduled.palaceSelection!,
        status: 'AWAITING_REVIEW' as const,
        candidates: scheduled.palaceSelection!.candidates.map((item, index) => ({
          ...item,
          decision: index === 0 ? 'SELECTED' as const : 'REJECTED' as const,
        })),
      },
    };

    const confirmed = confirmPalaceSelection(reviewState, [{
      candidateId: candidate.id,
      rank: '贵人',
      residence: '储秀宫东侧殿',
    }]);

    expect(confirmed.people[candidate.id].assets.portrait).toBe(candidate.portrait);
    const entries = confirmed.history.filter((entry) => entry.type === 'CONSORT_ENTRY');
    expect(entries).toHaveLength(1);
    expect(entries[0].personIds).toEqual([candidate.id]);
    expect(entries[0].summary).toContain(candidate.name + '经选秀入宫');
    expect(entries[0].summary).toContain('贵人');
    expect(entries[0].summary).toContain('储秀宫东侧殿');
    expect(confirmPalaceSelection(confirmed, []).history).toEqual(confirmed.history);
    expect(confirmed.people[candidate.id].parents).toContain(fatherId);
    expect(confirmed.people[fatherId].children).toContain(candidate.id);
    expect(confirmed.relationships).toContainEqual(expect.objectContaining({
      personAId: fatherId,
      personBId: candidate.id,
      kind: 'PARENT_CHILD',
      labelA: '女儿',
      labelB: '父亲',
    }));
  });
});

describe('selection portraits', () => {
  it('draws without replacement and persists portraits in the selection record', () => {
    const scheduled = schedulePalaceSelection(createInitialGameState());
    const candidates = scheduled.palaceSelection!.candidates;
    expect(consortPortraitUrls.length).toBeGreaterThan(0);
    expect(new Set(candidates.map((candidate) => candidate.portrait)).size)
      .toBe(Math.min(candidates.length, consortPortraitUrls.length));
    expect(JSON.parse(JSON.stringify(scheduled)).palaceSelection.candidates).toEqual(candidates);
  });

  it('uses randomness instead of candidate IDs for new selections', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      random.mockReturnValue(0);
      const first = schedulePalaceSelection(createInitialGameState());
      random.mockReturnValue(0.99999);
      const second = schedulePalaceSelection(createInitialGameState());
      expect(first.palaceSelection!.candidates[0].id).toBe(second.palaceSelection!.candidates[0].id);
      if (consortPortraitUrls.length > 1) {
        expect(first.palaceSelection!.candidates[0].portrait).not.toBe(second.palaceSelection!.candidates[0].portrait);
      }
    } finally {
      random.mockRestore();
    }
  });

  it('assigns portraits for old candidates and ignores rejected or duplicate assignments', () => {
    const state = schedulePalaceSelection(createInitialGameState());
    state.palaceSelection!.status = 'AWAITING_REVIEW';
    state.palaceSelection!.candidates.forEach((candidate, index) => {
      delete candidate.portrait;
      candidate.decision = index < 2 ? 'SELECTED' : 'REJECTED';
    });
    const candidates = state.palaceSelection!.candidates;
    const assignments = candidates.map((candidate) => ({ candidateId: candidate.id, rank: '常在', residence: '储秀宫东侧殿' }));
    const result = confirmPalaceSelection(state, [...assignments, assignments[0]]);
    expect(result.history.filter((entry) => entry.type === 'CONSORT_ENTRY')).toHaveLength(2);
    expect(result.people[candidates[2].id]).toBeUndefined();
    for (const candidate of result.palaceSelection!.candidates.slice(0, 2)) {
      expect(result.people[candidate.id].assets.portrait).toBe(candidate.portrait);
    }
  });
});