export interface PendingAppointment { ministerId: string; office: string; status: 'PENDING_CONFIRMATION'; }
export function proposeAppointment(ministerId: string, office: string): PendingAppointment { return { ministerId, office, status: 'PENDING_CONFIRMATION' }; }
export function assignChildSchedule(childId: string, morning: string, afternoon: string, evening: string) { return { childId, morning, afternoon, evening, status: 'PENDING_CONFIRMATION' as const }; }
