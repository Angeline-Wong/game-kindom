export type CourtStatus = 'debating' | 'deferred' | 'ruled';
export interface CourtIssue { title: string; urgency: string; summary: string; status: CourtStatus; fear: number; candor: number; revealed: string[]; history: string[] }
export type CourtAction = { type: 'question' } | { type: 'defer' } | { type: 'rage' } | { type: 'ask'; official: string } | { type: 'rule'; ruling: string };
export const demoCourtIssue: CourtIssue = { title: '河东旱情与赈粮亏空', urgency: '重大', summary: '河东三府连月无雨，地方请求开仓三十万石。户部账目与巡按奏报相差七万石。', status: 'debating', fear: 18, candor: 74, revealed: [], history: ['河东巡抚呈报灾情，户部尚书请求复核账目。'] };

export function applyCourtAction(issue: CourtIssue, action: CourtAction): CourtIssue {
  if (action.type === 'question') return { ...issue, revealed: [...issue.revealed, '两路驿报相互印证旱情，但仓储数字仅来自地方单方账册。'], history: [...issue.history, '皇帝追问情报来源。'] };
  if (action.type === 'ask') return { ...issue, history: [...issue.history, `皇帝点名${action.official}作答。`] };
  if (action.type === 'defer') return { ...issue, status: 'deferred', history: [...issue.history, '容后再议，明日继续。'] };
  if (action.type === 'rage') return { ...issue, fear: Math.min(100, issue.fear + 22), candor: Math.max(0, issue.candor - 18), history: [...issue.history, '皇帝震怒，命百官据实以奏。'] };
  return { ...issue, status: 'ruled', history: [...issue.history, `朱批：${action.ruling}`] };
}
