export interface AuditEntry { from: 'state'; amount: number; reason: string }
export interface TreasuryState { stateSilver: number; gold: number; audit: AuditEntry[] }
export interface TransferRequest extends AuditEntry {}
export function transferFunds(state: TreasuryState, request: TransferRequest): TreasuryState {
  if (request.amount <= 0 || request.amount > state.stateSilver) throw new Error('余额不足');
  return {
    ...state,
    stateSilver: state.stateSilver - request.amount,
    audit: [...state.audit, request],
  };
}
