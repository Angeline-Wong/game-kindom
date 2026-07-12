export interface GiftEvent { kind: 'GIFT'; itemId: string; quantity: number; recipientId: string; status: 'PENDING_CONFIRMATION' | 'CONFIRMED'; }
export interface GiftState { inventory: Record<string, number>; history: GiftEvent[]; }
export const initialGiftState: GiftState = { inventory: { 'gold-ingot': 20, 'jade-pendant': 5 }, history: [] };
export function createGiftEvent(itemId: string, quantity: number, recipientId: string): GiftEvent { return { kind: 'GIFT', itemId, quantity, recipientId, status: 'PENDING_CONFIRMATION' }; }
export function confirmGiftEvent(event: GiftEvent, state: GiftState): GiftState {
  if ((state.inventory[event.itemId] ?? 0) < event.quantity) throw new Error('Insufficient inventory');
  const confirmed = { ...event, status: 'CONFIRMED' as const };
  return { inventory: { ...state.inventory, [event.itemId]: state.inventory[event.itemId] - event.quantity }, history: [confirmed, ...state.history] };
}
