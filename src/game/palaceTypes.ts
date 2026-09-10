export type PalaceEventType = 'DAILY' | 'EMOTION' | 'RIVALRY' | 'COMPLAINT' | 'VIOLATION' | 'CASE';
export type EventSeverity = 'TRIVIAL' | 'MINOR' | 'MEDIUM' | 'SERIOUS' | 'CRITICAL';
export type EffectTarget = 'SPEAKER' | 'ACCUSED' | 'VICTIM' | 'CUSTOM';
export interface DialogueEffect {
  type: 'FAVOR' | 'MOOD' | 'JEALOUSY' | 'RESENTMENT' | 'PRESTIGE' | 'FEAR' | 'RELATIONSHIP';
  target: EffectTarget;
  targetId?: string;
  /** RELATIONSHIP 的另一端，必须明确指定。 */
  otherTarget?: EffectTarget;
  otherTargetId?: string;
  value: number;
}
export interface DialogueAction { type: 'NONE' | 'OPEN_PUNISHMENT' | 'START_CASE'; target?: EffectTarget; targetId?: string; reason?: string; caseTemplateId?: string }
export interface DialogueParticipants { speakerId: string; accusedId?: string; victimId?: string }
export interface DialogueTrigger { minFavor?: number; maxFavor?: number; minJealousy?: number; minResentment?: number }
export type PunishmentType = 'WARNING' | 'FINE' | 'GROUNDING';
export interface PunishmentDetails {
  type: PunishmentType;
  targetId: string;
  reason: string;
  severity: EventSeverity;
  sourceEventId?: string;
  sourceCaseId?: string;
  days?: number;
  months?: number;
}
