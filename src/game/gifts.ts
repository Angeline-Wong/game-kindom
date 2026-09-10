export type GiftCategory = '书籍' | '珍宝' | '金银' | '玉器' | '服饰' | '器物' | '丹药' | '其他';
export type GiftCurrencyAccount = 'nationalTreasury' | 'gold';

export interface GiftItem {
  id: string;
  name: string;
  category: GiftCategory;
  initialQuantity: number;
  description: string;
  /** 在 treasury-items.png 4x4 精灵图中的格位（0-15），用于删除条目后仍保持图标位置稳定。 */
  spriteIndex?: number;
  currencyCost?: { account: GiftCurrencyAccount; amount: number };
}

export const giftCatalog: GiftItem[] = [
  { id: 'four-books', name: '四书集注', category: '书籍', initialQuantity: 12, description: '经筵常用的精校典籍。', spriteIndex: 0 },
  { id: 'yongle-encyclopedia', name: '永乐大典', category: '书籍', initialQuantity: 3, description: '内府珍藏的宏篇巨帙。', spriteIndex: 1 },
  { id: 'flower-poems', name: '百花诗集', category: '书籍', initialQuantity: 8, description: '宫中女眷喜爱的精抄诗集。', spriteIndex: 2 },
  { id: 'jade-pendant', name: '翡翠平安扣', category: '玉器', initialQuantity: 5, description: '水色清润，寓意平安。', spriteIndex: 3 },
  { id: 'phoenix-hairpin', name: '金凤簪', category: '珍宝', initialQuantity: 2, description: '内造办处精制的凤首金簪。', spriteIndex: 4 },
  { id: 'pearl-necklace', name: '东珠项链', category: '珍宝', initialQuantity: 4, description: '颗颗圆润，礼制贵重。', spriteIndex: 5 },
  { id: 'jade-bracelet', name: '和田玉镯', category: '玉器', initialQuantity: 6, description: '玉质温润，适合作为内廷赏赐。', spriteIndex: 6 },
  { id: 'jewelry-box', name: '点翠首饰盒', category: '珍宝', initialQuantity: 7, description: '点翠鎏金，内藏成套首饰。', spriteIndex: 9 },
  { id: 'brocade-robe', name: '织云锦袍', category: '服饰', initialQuantity: 9, description: '宫织局按品级织造的锦袍。', spriteIndex: 10 },
  { id: 'embroidered-shoes', name: '缂花鞋', category: '服饰', initialQuantity: 15, description: '缂丝绣面，做工精细。', spriteIndex: 11 },
  { id: 'painting-scroll', name: '名家画卷', category: '书籍', initialQuantity: 6, description: '内府收藏的名家真迹。', spriteIndex: 12 },
  { id: 'porcelain-vase', name: '青花瓷瓶', category: '器物', initialQuantity: 10, description: '官窑烧造，釉色清雅。', spriteIndex: 13 },
  { id: 'lingzhi', name: '千年灵芝', category: '丹药', initialQuantity: 3, description: '太医院验收入库的珍稀药材。', spriteIndex: 14 },
  { id: 'imperial-calligraphy', name: '御赐墨宝', category: '其他', initialQuantity: 30, description: '皇帝亲题墨宝，恩荣非凡。', spriteIndex: 15 },
];

export interface GiftEvent { kind: 'GIFT'; itemId: string; quantity: number; recipientId: string; status: 'PENDING_CONFIRMATION' | 'CONFIRMED'; }
export interface GiftState { inventory: Record<string, number>; history: GiftEvent[]; }
export const initialGiftState: GiftState = {
  inventory: Object.fromEntries(giftCatalog.map((item) => [item.id, item.initialQuantity])),
  history: [],
};
export function createGiftEvent(itemId: string, quantity: number, recipientId: string): GiftEvent {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Invalid gift quantity');
  if (!recipientId) throw new Error('Missing gift recipient');
  return { kind: 'GIFT', itemId, quantity, recipientId, status: 'PENDING_CONFIRMATION' };
}
export function confirmGiftEvent(event: GiftEvent, state: GiftState): GiftState {
  if ((state.inventory[event.itemId] ?? 0) < event.quantity) throw new Error('Insufficient inventory');
  const confirmed = { ...event, status: 'CONFIRMED' as const };
  return { inventory: { ...state.inventory, [event.itemId]: state.inventory[event.itemId] - event.quantity }, history: [confirmed, ...state.history] };
}
