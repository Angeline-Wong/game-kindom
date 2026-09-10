import type { ScenePersonType } from './people';

export interface PersonAction { id: string; label: string; group: 'primary' | 'more'; disabled?: boolean; reason?: string; }
const actions: Record<ScenePersonType, PersonAction[]> = {
  MINISTER: [{ id: 'transfer', label: '调任', group: 'primary' }, { id: 'change-rank', label: '改品', group: 'primary' }, { id: 'reward', label: '奖励', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  PRINCE: [{ id: 'education', label: '教育', group: 'primary' }, { id: 'encourage', label: '鼓励', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'ennoble', label: '封爵', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  CONSORT: [{ id: 'favor', label: '临幸', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'move', label: '搬迁', group: 'primary' }, { id: 'change-rank', label: '改位', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  DOWAGER: [{ id: 'greet', label: '请安', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'visit', label: '探望', group: 'primary' }],
  NOBLE: [{ id: 'greet', label: '请安', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'visit', label: '探望', group: 'primary' }],
  PRINCESS: [{ id: 'education', label: '教育', group: 'primary' }, { id: 'encourage', label: '鼓励', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'ennoble', label: '封爵', group: 'primary' }, { id: 'gift', label: '赏赐', group: 'primary' }, { id: 'accountability', label: '问责', group: 'primary' }],
  EUNUCH: [{ id: 'greet', label: '垂问', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'reward', label: '赏赐', group: 'primary' }],
  COURT_LADY: [{ id: 'greet', label: '垂问', group: 'primary' }, { id: 'talk', label: '闲聊', group: 'primary' }, { id: 'reward', label: '赏赐', group: 'primary' }],
};

/** 0-3 襁褓/幼童：父皇亲自看顾、喂哺、逗弄；不开放 教育/鼓励/封爵/问责 */
const ROYAL_BABY: PersonAction[] = [
  { id: 'care', label: '看顾', group: 'primary' },
  { id: 'feed', label: '喂哺', group: 'primary' },
  { id: 'play', label: '逗弄', group: 'primary' },
  { id: 'gift', label: '赏赐', group: 'primary' },
];

/**
 * 皇子/公主操作按年龄分档：
 *   0-3 看护式（看顾/喂哺/逗弄/赏赐）
 *   4-6 加入 教育/闲聊，但隐藏 鼓励/封爵/问责
 *   7-12 加入 鼓励，但隐藏 封爵/问责
 *   13-17 加入 封爵，但隐藏 问责
 *   18+ 全开。
 * 操作未达适龄时整条不展示，避免出现 "0 岁封爵/问责" 这类不合理呈现。
 */
export function getPersonActions(type: ScenePersonType, options?: { pregnant?: boolean; custody?: 'COLD_PALACE' | 'PRISON'; age?: number; visitReason?: string }) {
  if (options?.custody) {
    return [
      { id: 'custody-visit', label: '探望', group: 'primary' as const },
      { id: 'custody-execute', label: type === 'CONSORT' ? '刺死' : '赐死', group: 'primary' as const },
      { id: 'custody-restore', label: type === 'CONSORT' ? '恢复' : '释放', group: 'primary' as const },
    ];
  }
  if (type === 'PRINCE' || type === 'PRINCESS') {
    const age = options?.age;
    if (typeof age === 'number' && age <= 3) return ROYAL_BABY;
    if (typeof age === 'number') {
      const base = actions[type];
      // 隐藏未达适龄的操作；保留文案稳定的展示顺序
      return base.filter((action) => {
        if (action.id === 'education') return age >= 4;
        if (action.id === 'encourage') return age >= 7;
        if (action.id === 'talk') return age >= 4;
        if (action.id === 'ennoble') return age >= 13;
        if (action.id === 'accountability') return age >= 18;
        return true;
      });
    }
    return actions[type];
  }
  if (type === 'CONSORT' && !options?.pregnant && options?.visitReason) return actions[type].map((action) => action.id === 'favor' ? { ...action, disabled: true, reason: options.visitReason } : action);
  if (type !== 'CONSORT' || !options?.pregnant) return actions[type];
  return actions[type].map((action) => action.id === 'favor' ? { ...action, id: 'companion', label: '陪伴' } : action);
}
