import { describe, expect, it } from 'vitest';
import { confirmGiftEvent, createGiftEvent, initialGiftState } from './gifts';

describe('gift events', () => {
  it('deducts confirmed inventory and records history', () => {
    const result = confirmGiftEvent(createGiftEvent('four-books', 2, 'consort-001'), initialGiftState);
    expect(result.inventory['four-books']).toBe(initialGiftState.inventory['four-books'] - 2);
    expect(result.history[0].kind).toBe('GIFT');
  });
});
