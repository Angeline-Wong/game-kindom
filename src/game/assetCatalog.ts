export interface AssetEntry { key: string; category: 'portrait' | 'avatar' | 'scene' | 'item'; path: string; label: string }

export const assetCatalog: Record<string, AssetEntry> = {
  'portrait.emperor': { key: 'portrait.emperor', category: 'portrait', path: 'character-portraits.png#emperor', label: '皇帝立绘' },
  'portrait.empress': { key: 'portrait.empress', category: 'portrait', path: 'character-portraits.png#empress', label: '皇后立绘' },
  'portrait.consort': { key: 'portrait.consort', category: 'portrait', path: 'character-portraits.png#consort', label: '妃嫔立绘' },
  'portrait.minister': { key: 'portrait.minister', category: 'portrait', path: 'character-portraits.png#minister', label: '官员立绘' },
  'portrait.prince': { key: 'portrait.prince', category: 'portrait', path: 'character-portraits.png#prince', label: '皇子立绘' },
};

export function getAsset(key: string) {
  return assetCatalog[key] ?? assetCatalog['portrait.consort'];
}

