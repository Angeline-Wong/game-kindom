import type { GameDate } from './gameState';
import type { EventSeverity } from './palaceTypes';

export type PalaceCaseStatus = 'PENDING' | 'INVESTIGATING' | 'WAITING_DECISION' | 'CLOSED' | 'REOPENED';
export type PalaceTruthType = 'TRUE' | 'FALSE_ACCUSATION' | 'PARTIAL' | 'ACCIDENT' | 'UNKNOWN';
export interface PalaceCaseTruth { type: PalaceTruthType; culpritIds: string[]; difficulty: number }
export interface PalaceCaseResult {
  conclusion: 'CULPRIT_FOUND' | 'PARTIAL_EVIDENCE' | 'INSUFFICIENT_EVIDENCE' | 'FALSE_ACCUSATION_FOUND' | 'ACCIDENT' | 'INCONCLUSIVE';
  suspectedIds: string[];
  confidence: number;
  summary: string;
}
export interface PalaceInvestigator {
  type: 'NEIWUFU' | 'EMPRESS' | 'CONSORT';
  personId?: string;
  name: string;
  ability: number;
  integrity: number;
  speed: number;
  attributes?: { wisdom: number; strategy: number; prestige: number };
}
export interface PalaceCase {
  id: string;
  templateId: string;
  title: string;
  description: string;
  severity: EventSeverity;
  status: PalaceCaseStatus;
  createdDate: GameDate;
  createdDay: number;
  complainantId: string;
  victimIds: string[];
  accusedIds: string[];
  investigator?: PalaceInvestigator;
  /** 内部事实，任何玩家视图都不能读取。 */
  truth: PalaceCaseTruth;
  result?: PalaceCaseResult;
  investigationDaysRemaining: number;
  investigationTotalDays?: number;
  investigationStartedDay?: number;
  lastProcessedDay?: number;
  /** 开始调查时保存，刷新/跳日/React 重算均不重掷。 */
  investigationRoll?: number;
  completedDate?: GameDate;
  relatedDialogueId: string;
  sourceInteractionId: string;
  ruling?: { type: 'PUNISH' | 'NO_ACTION'; date: GameDate; targetIds: string[]; punishmentHistoryId?: string };
}
export interface PalaceCaseTemplate {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  baseDifficulty: number;
  minInvestigationDays: number;
  maxInvestigationDays: number;
  possibleTruths: { type: PalaceTruthType; weight: number }[];
}
