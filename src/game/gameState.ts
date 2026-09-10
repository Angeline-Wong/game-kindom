import type { GameClock, TimeSpeed } from './clock';
import type { WeatherKind } from '../components/WeatherEffects';
import type { FinanceState } from './economy';
import type { GiftState } from './gifts';
import type { PunishmentDetails } from './palaceTypes';
import type { PalaceCase } from './palaceCaseTypes';

export type PersonKind = 'EMPEROR' | 'CONSORT' | 'DOWAGER' | 'MINISTER' | 'PRINCE' | 'PRINCESS' | 'NOBLE' | 'EUNUCH' | 'COURT_LADY';
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
  reignName?: string;
  clanName?: string;
  honorific?: string;
  mayRaiseOwnChildren?: boolean;
  named?: boolean;
  restUntil?: GameDate;
  rank?: string;
  office?: string;
  residence?: string;
  /** 婚姻、正式住所与临时奉召状态彼此独立；旧存档缺失时由 selector 兼容推导。 */
  maritalStatus?: 'UNMARRIED' | 'MARRIED';
  /** 皇嗣配偶属于姻亲，不列入宗亲或入宫。 */
  royalSpouseOf?: string;
  residenceType?: 'PALACE' | 'OUTSIDE_PALACE';
  isSummoned?: boolean;
  sceneId: string;
  status: PersonLifeStatus;
  illness?: { name: string; severity: number; startedAt: GameDate };
  deathDate?: GameDate;
  deathReason?: string;
  posthumousTitle?: string;
  posthumousRank?: string;
  posthumousGrantedAt?: GameDate;
  assets: PersonAssets;
  parents: string[];
  motherId?: string;
  adoptiveMotherId?: string;
  birthOrder?: number;
  royalTitle?: string;
  children: string[];
  stats: Record<string, number>;
  traits: string[];
  dialogue?: string;
  previousSceneId?: string;
  previousResidence?: string;
  preHeirTitle?: string;
  preHeirResidence?: string;
  preHeirSceneId?: string;
  arrearsMonths?: number;
  /** 游戏日历中的绝对日序；不覆盖孕期、休养等状态。 */
  groundingUntilDay?: number;
  fineMonthsRemaining?: number;
  miscarriageCount?: number;
  infertile?: boolean;
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
  fetusCount?: 1 | 2;
}

export interface VisitRecord {
  id: string;
  consortId: string;
  scheduledOn: GameDate;
  processAfterMinute: number;
  status: 'PENDING' | 'PROCESSED' | 'CANCELLED';
}

export type SelectionDecision = 'SELECTED' | 'REJECTED';
export type PalaceSelectionStatus = 'SCHEDULED' | 'SELECTING' | 'AWAITING_ENTRY' | 'AWAITING_REVIEW' | 'COMPLETED';

export interface SelectionCandidate {
  portrait?: string;
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
  parentMinisterId?: string;
  fatherName?: string;
  fatherOffice?: string;
  motherClan?: string;
  familyStanding?: string;
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
  palaceCaseId?: string;
  id: string;
  type: 'PREGNANCY_NOTICE' | 'MISCARRIAGE_NOTICE' | 'BIRTH_NOTICE' | 'MARRIAGE_BANQUET' | 'MARRIAGE_NOTICE' | 'SYSTEM_NOTICE';
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

export interface HistoryEffect {
  label: string;
  value: number;
}

export interface HistoryEntry {
  palaceCaseId?: string;
  id: string;
  date: GameDate;
  type: string;
  summary: string;
  personIds: string[];
  effects?: HistoryEffect[];
  punishment?: PunishmentDetails;
  dialogue?: { sceneId: string; choiceId: string; interactionId: string };
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

export type CourtIssueStatus = 'PENDING' | 'DEBATING' | 'DEFERRED' | 'RESOLVED';
export type CourtDepartment = '吏部' | '户部' | '礼部' | '兵部' | '刑部' | '工部';
export interface CourtResolutionRecord {
  issueId: string;
  optionId: string;
  label: string;
  result: string;
  effects: Record<string, number>;
  date: GameDate;
}
export interface CourtAgendaItem {
  id: string;
  title: string;
  category: 'MAJOR' | 'ORDINARY' | 'EMERGENCY';
  summary: string;
  reporterId: string;
  department: CourtDepartment;
  confidence: string;
  status: CourtIssueStatus;
  revealed: string[];
  speeches: string[];
  ruling?: string;
}
export interface CourtAttendance { personId: string; status: 'PRESENT' | 'LATE' | 'ABSENT' | 'IMPROPER'; note: string }
export interface CourtSessionRecord {
  id: string;
  date: GameDate;
  status: 'IN_PROGRESS' | 'COMPLETED';
  agenda: CourtAgendaItem[];
  currentIssueId?: string;
  attendance: CourtAttendance[];
  fear: number;
  candor: number;
  elapsedMinutes: number;
  lastResolution?: CourtResolutionRecord;
}

export type CivilExamStatus = 'PROVINCIAL_RESULTS' | 'METROPOLITAN_READY' | 'GRADING' | 'WAITING_QUESTION' | 'PALACE_EXAM_READY' | 'PROCLAMATION_READY' | 'APPOINTMENT_READY' | 'COMPLETED';
export interface CivilExamCandidate {
  id: string;
  name: string;
  age: number;
  origin: string;
  background: string;
  classics: number;
  policy: number;
  integrity: number;
  ambition: number;
  metropolitanScore?: number;
  palaceScore?: number;
  finalRank?: '状元' | '榜眼' | '探花' | '二甲' | '三甲';
}
export interface CivilExamRecord {
  id: string;
  cycleYear: number;
  status: CivilExamStatus;
  startedOn: GameDate;
  focus: string;
  chiefExaminerId: string;
  candidates: CivilExamCandidate[];
  question?: string;
  topCandidateIds: string[];
  readyOn?: GameDate;
  completedOn?: GameDate;
}
export interface GameSettings {
  pregnancyRate: number;
  maleBirthRate: number;
  miscarriageRate?: number;
  postMiscarriageInfertilityRate?: number;
  twinRate?: number;
}
export interface GameState {
  palaceCases: PalaceCase[];
  gameSettings: GameSettings;
  version: 1;
  saveId: string;
  updatedAt: number;
  clock: GameClock;
  speed: TimeSpeed;
  weather: WeatherKind;
  finances: FinanceState;
  gifts: GiftState;
  people: Record<string, PersonRecord>;
  pregnancies: PregnancyRecord[];
  visits: VisitRecord[];
  events: GameEvent[];
  history: HistoryEntry[];
  relationships: RelationshipRecord[];
  sixPalaceAssistants: string[];
  palaceSelection: PalaceSelectionRecord | null;
  royalMarriages: RoyalMarriageRecord[];
  crownPrinceId: string | null;
  courtSession: CourtSessionRecord | null;
  civilExam: CivilExamRecord | null;
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
