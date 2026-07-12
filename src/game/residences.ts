export type ConsortRank = '皇后' | '皇贵妃' | '贵妃' | '妃' | '嫔' | '贵人' | '常在' | '答应' | '官女子';
export type PalaceRoom = '主殿' | '东侧殿' | '西侧殿';

export interface Residence { id: string; palace: string; room: PalaceRoom; occupantId?: string; }
export interface ResidenceState { residences: Residence[]; }

const palaceNames = ['储秀宫', '翊坤宫', '长春宫', '咸福宫', '启祥宫', '永寿宫', '景仁宫', '承乾宫', '钟粹宫', '永和宫', '景阳宫', '延禧宫'];
const rooms: PalaceRoom[] = ['主殿', '东侧殿', '西侧殿'];

export const initialResidenceState: ResidenceState = {
  residences: palaceNames.flatMap((palace) => rooms.map((room) => ({ id: `${palace}-${room}`, palace, room, occupantId: palace === '翊坤宫' && room === '主殿' ? 'consort-001' : undefined }))),
};

export function canOccupyMainHall(rank: ConsortRank) {
  return ['皇后', '皇贵妃', '贵妃', '妃', '嫔'].includes(rank);
}

export function getAvailableResidences(rank: ConsortRank, state: ResidenceState) {
  return state.residences.filter((residence) => !residence.occupantId && (residence.room !== '主殿' || canOccupyMainHall(rank)));
}

export function assignResidence(consortId: string, residenceId: string, state: ResidenceState): ResidenceState {
  return { residences: state.residences.map((residence) => residence.id === residenceId ? { ...residence, occupantId: consortId } : residence.occupantId === consortId ? { ...residence, occupantId: undefined } : residence) };
}
