import type { GameClock, TimeSpeed } from './clock';
import type { WeatherKind } from '../components/WeatherEffects';

export type PersonKind = 'EMPEROR' | 'CONSORT' | 'DOWAGER' | 'MINISTER' | 'PRINCE' | 'PRINCESS' | 'NOBLE';
export type PersonLifeStatus = 'NORMAL' | 'PREGNANT' | 'SICK' | 'REST' | 'OUTSIDE' | 'CONFINED' | 'COLD_PALACE' | 'PRISON' | 'DEAD';

export interface GameDate { year: number; month: number; day: number }
export interface PersonAssets { avatar: string; portrait: string }
export interface PersonRecord {
  id: string;
  kind: PersonKind;
  name: string;
  sex: 'MALE' | 'FEMALE';
  birthDate: GameDate;
  age: number;
  title: string;
  honorific?: string;
  named?: boolean;
  restUntil?: GameDate;
  rank?: string;
  office?: string;
  residence?: string;
  sceneId: string;
  status: PersonLifeStatus;
  assets: PersonAssets;
  parents: string[];
  children: string[];
  stats: Record<string, number>;
  traits: string[];
  dialogue?: string;
  previousSceneId?: string;
  previousResidence?: string;
}

const personLifeStatusLabels: Record<PersonLifeStatus, string> = {
  NORMAL: '安好',
  PREGNANT: '有孕',
  SICK: '抱病',
  REST: '休养',
  OUTSIDE: '外出',
  CONFINED: '禁足',
  COLD_PALACE: '冷宫',
  PRISON: '在押',
  DEAD: '薨逝',
};

export function personLifeStatusLabel(status: PersonLifeStatus) {
  return personLifeStatusLabels[status];
}

export interface PregnancyRecord {
  id: string;
  consortId: string;
  fatherId: string;
  conceivedOn: GameDate;
  dueOn: GameDate;
  status: 'ACTIVE' | 'DELIVERED' | 'LOST';
  risk: number;
}

export interface VisitRecord {
  id: string;
  consortId: string;
  scheduledOn: GameDate;
  processAfterMinute: number;
  status: 'PENDING' | 'PROCESSED';
}

export type SelectionDecision = 'SELECTED' | 'REJECTED';
export type PalaceSelectionStatus = 'SCHEDULED' | 'SELECTING' | 'AWAITING_ENTRY' | 'AWAITING_REVIEW' | 'COMPLETED';

export interface SelectionCandidate {
  id: string;
  name: string;
  birthDate: GameDate;
  age: number;
  traits: string[];
  stats: Record<string, number>;
  decision?: SelectionDecision;
  proposedRank?: string;
  proposedResidence?: string;
  proposedHonorific?: string;
}

export interface PalaceSelectionRecord {
  id: string;
  announcedOn: GameDate;
  selectionOn: GameDate;
  entryOn?: GameDate;
  status: PalaceSelectionStatus;
  candidates: SelectionCandidate[];
}

export interface EventChoice { id: string; label: string; result: string }
export interface GameEvent {
  id: string;
  type: 'PREGNANCY_NOTICE' | 'BIRTH_NOTICE' | 'MARRIAGE_BANQUET' | 'MARRIAGE_NOTICE' | 'SYSTEM_NOTICE';
  priority: number;
  createdOn: GameDate;
  personIds: string[];
  title: string;
  body: string;
  choices: EventChoice[];
  defaultChoiceId?: string;
  status: 'PENDING' | 'RESOLVED' | 'READ' | 'MISSED';
  result?: string;
}

export interface HistoryEntry {
  id: string;
  date: GameDate;
  type: string;
  summary: string;
  personIds: string[];
}

export type RelationshipKind = 'SPOUSE' | 'PARENT_CHILD' | 'SOVEREIGN_SUBJECT' | 'ALLY' | 'RIVAL' | 'SERVICE';
export interface RelationshipRecord {
  id: string;
  personAId: string;
  personBId: string;
  kind: RelationshipKind;
  labelA: string;
  labelB: string;
  affinity: number;
  trust: number;
  jealousy?: number;
}

export interface MarriageCandidate {
  id: string;
  name: string;
  sex: 'MALE' | 'FEMALE';
  parentMinisterId: string;
  parentName: string;
  familyRank: string;
  familyOffice: string;
  legitimacy: '嫡' | '庶';
  relation: '子' | '女';
  charm: number;
  strategy: number;
}

export type RoyalMarriageStatus = 'BANQUET_SCHEDULED' | 'BANQUET_ACTIVE' | 'AWAITING_DECISION' | 'COMPLETED' | 'REJECTED';
export interface RoyalMarriageRecord {
  id: string;
  royalId: string;
  method: 'MINISTRY' | 'MINISTER' | 'BANQUET';
  status: RoyalMarriageStatus;
  createdOn: GameDate;
  banquetOn?: GameDate;
  candidates: MarriageCandidate[];
  selectedCandidateId?: string;
  spouseId?: string;
}

export interface GameState {
  version: 1;
  saveId: string;
  updatedAt: number;
  clock: GameClock;
  speed: TimeSpeed;
  weather: WeatherKind;
  people: Record<string, PersonRecord>;
  pregnancies: PregnancyRecord[];
  visits: VisitRecord[];
  events: GameEvent[];
  history: HistoryEntry[];
  relationships: RelationshipRecord[];
  sixPalaceAssistants: string[];
  palaceSelection: PalaceSelectionRecord | null;
  royalMarriages: RoyalMarriageRecord[];
  usedNames: {
    consorts: string[];
    ministers: string[];
    royals: string[];
  };
}

export function calculateAge(birthDate: GameDate, current: GameDate) {
  const birthdayPassed = current.month > birthDate.month || (current.month === birthDate.month && current.day >= birthDate.day);
  return Math.max(0, current.year - birthDate.year - (birthdayPassed ? 0 : 1));
}

export function clockDate(clock: GameClock): GameDate {
  return { year: clock.year, month: clock.month, day: clock.day };
}
