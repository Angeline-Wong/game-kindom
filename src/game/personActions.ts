import type { ScenePersonType } from './people';

export interface PersonAction { id: string; label: string; group: 'primary' | 'more'; }
const actions: Record<ScenePersonType, PersonAction[]> = {
  MINISTER: [{ id: 'biography', label: '查看履历', group: 'primary' }, { id: 'transfer', label: '调任', group: 'primary' }, { id: 'promote-rank', label: '升品', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'appoint-duty', label: '任命差事', group: 'more' }, { id: 'accountability', label: '问责', group: 'more' }],
  PRINCE: [{ id: 'education', label: '教育', group: 'primary' }, { id: 'encourage', label: '鼓励', group: 'primary' }, { id: 'ennoble', label: '封爵', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'teacher', label: '安排老师', group: 'more' }],
  CONSORT: [{ id: 'favor', label: '临幸', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'move', label: '搬迁', group: 'primary' }, { id: 'promote', label: '晋升', group: 'primary' }, { id: 'demote', label: '降位', group: 'more' }],
};
export function getPersonActions(type: ScenePersonType) { return actions[type]; }
