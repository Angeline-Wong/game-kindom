import type { ScenePersonType } from './people';

export interface PersonAction { id: string; label: string; group: 'primary' | 'more'; }
const actions: Record<ScenePersonType, PersonAction[]> = {
  MINISTER: [{ id: 'transfer', label: '调任', group: 'primary' }, { id: 'change-rank', label: '改品', group: 'primary' }, { id: 'reward', label: '奖励', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  PRINCE: [{ id: 'education', label: '教育', group: 'primary' }, { id: 'encourage', label: '鼓励', group: 'primary' }, { id: 'ennoble', label: '封爵', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  CONSORT: [{ id: 'favor', label: '临幸', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'move', label: '搬迁', group: 'primary' }, { id: 'change-rank', label: '改位', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  DOWAGER: [{ id: 'greet', label: '请安', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'visit', label: '探望', group: 'primary' }],
};
export function getPersonActions(type: ScenePersonType, options?: { pregnant?: boolean; custody?: 'COLD_PALACE' | 'PRISON' }) {
  if (options?.custody) {
    return [
      { id: 'custody-visit', label: '探望', group: 'primary' as const },
      { id: 'custody-execute', label: type === 'CONSORT' ? '刺死' : '赐死', group: 'primary' as const },
      { id: 'custody-restore', label: type === 'CONSORT' ? '恢复' : '释放', group: 'primary' as const },
    ];
  }
  if (type !== 'CONSORT' || !options?.pregnant) return actions[type];
  return actions[type].map((action) => action.id === 'favor' ? { ...action, id: 'companion', label: '陪伴' } : action);
}
