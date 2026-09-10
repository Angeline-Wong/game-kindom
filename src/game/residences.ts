import { isPersonAlive } from './person';
import type { PersonRecord } from './gameState';
export type ConsortRank = '皇后' | '皇贵妃' | '贵妃' | '妃' | '嫔' | '贵人' | '常在' | '答应' | '官女子';
export type PalaceRoom = '主殿' | '东侧殿' | '西侧殿';

export interface Residence { id: string; palace: string; room: PalaceRoom; occupantId?: string; }
export interface ResidenceState { residences: Residence[]; }

export const palaceNames = ['储秀宫', '翊坤宫', '长春宫', '咸福宫', '启祥宫', '永寿宫', '景仁宫', '承乾宫', '钟粹宫', '永和宫', '景阳宫', '延禧宫'];
export const palaceRooms: PalaceRoom[] = ['主殿', '东侧殿', '西侧殿'];
export const palaceSceneIds: Record<string, string> = { 储秀宫: 'chuxiu', 翊坤宫: 'yikun', 长春宫: 'changchun', 咸福宫: 'xianfu', 启祥宫: 'taiji', 永寿宫: 'yongshou', 景仁宫: 'jingren', 承乾宫: 'chengqian', 钟粹宫: 'zhongcui', 永和宫: 'yonghe', 景阳宫: 'jingyang', 延禧宫: 'yanxi', 坤宁宫: 'kuning' };

export const initialResidenceState: ResidenceState = {
  residences: palaceNames.flatMap((palace) => palaceRooms.map((room) => ({ id: `${palace}-${room}`, palace, room, occupantId: palace === '翊坤宫' && room === '西侧殿' ? 'consort-001' : undefined }))),
};

export function residenceStateFromPeople(people: Record<string, { id: string; kind: string; residence?: string; status?: PersonRecord['status']; deathDate?: PersonRecord['deathDate'] }>): ResidenceState {
  const occupantByRoom = new Map<string, string>();
  Object.values(people).forEach((person) => {
    if (!isPersonAlive(person) || person.kind !== 'CONSORT') return;
    const residence = parseResidenceLabel(person.residence);
    if (residence) occupantByRoom.set(`${residence.palace}-${residence.room}`, person.id);
  });
  return {
    residences: palaceNames.flatMap((palace) => palaceRooms.map((room) => {
      const id = `${palace}-${room}`;
      return { id, palace, room, occupantId: occupantByRoom.get(id) };
    })),
  };
}

export function getResidenceSceneId(palace: string, room: PalaceRoom) {
  const palaceId = palaceSceneIds[palace];
  return palaceId ? `${palaceId}:${room}` : undefined;
}

export function parseResidenceLabel(label?: string) {
  if (!label) return undefined;
  const room = palaceRooms.find((candidate) => label.endsWith(candidate));
  if (!room) return undefined;
  return { palace: label.slice(0, -room.length), room };
}

export function canOccupyMainHall(rank: ConsortRank) {
  return ['皇后', '皇贵妃', '贵妃', '妃', '嫔'].includes(rank);
}

export function getAvailableResidences(rank: ConsortRank, state: ResidenceState) {
  return state.residences.filter((residence) => !residence.occupantId && (residence.room !== '主殿' || canOccupyMainHall(rank)));
}

export function assignResidence(consortId: string, residenceId: string, state: ResidenceState): ResidenceState {
  return { residences: state.residences.map((residence) => residence.id === residenceId ? { ...residence, occupantId: consortId } : residence.occupantId === consortId ? { ...residence, occupantId: undefined } : residence) };
}

export function getAvailableMainHalls(people: Record<string, { id: string; kind: string; residence?: string; status?: PersonRecord['status']; deathDate?: PersonRecord['deathDate'] }>) {
  const occupied = new Set(Object.values(people).filter((person) => person.kind === 'CONSORT' && isPersonAlive(person)).map((person) => person.residence).filter(Boolean));
  return palaceNames.map((palace) => ({ id: `${palace}-主殿`, palace, room: '主殿' as const })).filter((residence) => !occupied.has(`${residence.palace}${residence.room}`));
}
