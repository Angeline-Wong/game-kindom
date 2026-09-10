import { describe, expect, it } from 'vitest';
import { transferFunds, type TreasuryState } from './treasury';

const state: TreasuryState = { stateSilver: 800_000, gold: 2_345, audit: [] };

describe('treasury transfers', () => {
  it('spends money from the state treasury and records it', () => {
    const next = transferFunds(state, { from: 'state', amount: 20_000, reason: '修缮宫苑' });
    expect(next.stateSilver).toBe(780_000);
    expect(next.audit).toHaveLength(1);
  });
  it('rejects transfers larger than the source balance', () => {
    expect(() => transferFunds(state, { from: 'state', amount: 900_000, reason: '赈灾' })).toThrow('余额不足');
  });
});
