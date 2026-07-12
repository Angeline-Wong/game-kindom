export type ConsortVisitSource = 'PALACE' | 'JINGSHIFANG';
export function scheduleConsortVisit(input: { source: ConsortVisitSource; consortId: string }) {
  return { ...input, requiresFlipCard: input.source === 'JINGSHIFANG', status: 'PENDING_NIGHT' as const };
}
export function validatePromotion(currentCount: number, limit: number) { return { allowed: currentCount < limit, reason: currentCount < limit ? undefined : '位分编制已满' }; }
