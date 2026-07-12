export interface AuditEntry { from: 'state' | 'private'; amount: number; reason: string }
export interface TreasuryState { stateSilver: number; privateSilver: number; gold: number; audit: AuditEntry[] }
export interface TransferRequest extends AuditEntry {}
export function transferFunds(state: TreasuryState, request: TransferRequest): TreasuryState {
  const source = request.from === 'state' ? state.stateSilver : state.privateSilver;
  if (request.amount <= 0 || request.amount > source) throw new Error('余额不足');
  return {
    ...state,
    stateSilver: state.stateSilver + (request.from === 'state' ? -request.amount : request.amount),
    privateSilver: state.privateSilver + (request.from === 'private' ? -request.amount : request.amount),
    audit: [...state.audit, request],
  };
}
