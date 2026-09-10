import { describe, expect, it } from 'vitest';
import { assignChildSchedule, proposeAppointment } from './appointments';

describe('appointments and education', () => {
  it('creates pending ceremonial records', () => {
    expect(proposeAppointment('minister-001', '兵部尚书').status).toBe('PENDING_CONFIRMATION');
    expect(assignChildSchedule('prince-001', '经学', '骑射', '书法').evening).toBe('书法');
  });
});
