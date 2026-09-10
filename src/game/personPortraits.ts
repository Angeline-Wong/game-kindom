import type { PersonRecord } from './gameState';

const modules = import.meta.glob('../assets/consort-portraits/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const empressModules = import.meta.glob('../assets/empress-portraits/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const emperorModules = import.meta.glob('../assets/emperor-portraits/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const ministerModules = import.meta.glob('../assets/minister-portraits/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const dowagerModules = import.meta.glob('../assets/dowager-portraits/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const consortDowagerModules = import.meta.glob('../assets/consort-dowager-portraits/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const newbornPrinceModules = import.meta.glob('../assets/heir-portraits/newborn/prince.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const newbornPrincessModules = import.meta.glob('../assets/heir-portraits/newborn/princess.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const heirOneToFiveModules = import.meta.glob('../assets/heir-portraits/1-5/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const heirSixToFifteenModules = import.meta.glob('../assets/heir-portraits/6-15/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const heirAdultModules = import.meta.glob('../assets/heir-portraits/15-plus/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

function sortedUrls(entries: [string, string][]) {
  return entries.sort(([left], [right]) => left.localeCompare(right, 'zh-CN', { numeric: true })).map(([, url]) => url);
}
function byKind(entries: Record<string, string>, kind: 'PRINCE' | 'PRINCESS') {
  return sortedUrls(Object.entries(entries).filter(([path]) => path.includes(`/${kind === 'PRINCE' ? 'prince' : 'princess'}-`)));
}

export const consortPortraitUrls = sortedUrls(Object.entries(modules));
export const empressPortraitUrls = sortedUrls(Object.entries(empressModules));
export const emperorPortraitUrls = sortedUrls(Object.entries(emperorModules));
export const ministerPortraitUrls = sortedUrls(Object.entries(ministerModules));
export const dowagerPortraitUrls = sortedUrls(Object.entries(dowagerModules));
export const consortDowagerPortraitUrls = sortedUrls(Object.entries(consortDowagerModules));

export const newbornPrincePortraitUrls = sortedUrls(Object.entries(newbornPrinceModules));
export const newbornPrincessPortraitUrls = sortedUrls(Object.entries(newbornPrincessModules));
export const heirOneToFivePrincePortraitUrls = byKind(heirOneToFiveModules, 'PRINCE');
export const heirOneToFivePrincessPortraitUrls = byKind(heirOneToFiveModules, 'PRINCESS');
export const heirSixToFifteenPrincePortraitUrls = byKind(heirSixToFifteenModules, 'PRINCE');
export const heirSixToFifteenPrincessPortraitUrls = byKind(heirSixToFifteenModules, 'PRINCESS');
export const heirAdultPrincePortraitUrls = byKind(heirAdultModules, 'PRINCE');
export const heirAdultPrincessPortraitUrls = byKind(heirAdultModules, 'PRINCESS');

/** 兼容旧调用方：1-3 岁数组名称保留，但实际内容已更新为 1-5 岁图库。 */
export const youngPrincePortraitUrls = heirOneToFivePrincePortraitUrls;
export const youngPrincessPortraitUrls = heirOneToFivePrincessPortraitUrls;

function stableIndex(id: string, length = consortPortraitUrls.length) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

export function consortPortraitKeyForId(id: string) {
  return `consort.${String(stableIndex(id) + 1).padStart(2, '0')}`;
}

function heirPortraitsFor(person: Pick<PersonRecord, 'id' | 'kind'> & Partial<Pick<PersonRecord, 'age'>>) {
  const princess = person.kind === 'PRINCESS';
  if ((person.age ?? 0) <= 0) return princess ? newbornPrincessPortraitUrls : newbornPrincePortraitUrls;
  if ((person.age ?? 0) <= 5) return princess ? heirOneToFivePrincessPortraitUrls : heirOneToFivePrincePortraitUrls;
  if ((person.age ?? 0) <= 15) return princess ? heirSixToFifteenPrincessPortraitUrls : heirSixToFifteenPrincePortraitUrls;
  return princess ? heirAdultPrincessPortraitUrls : heirAdultPrincePortraitUrls;
}

export function heirAgeBandLabel(age: number) {
  if (age <= 0) return '襁褓';
  if (age <= 5) return '幼年';
  if (age <= 15) return '少年';
  return '成年';
}

export function personPortraitUrl(person: Pick<PersonRecord, 'id' | 'kind' | 'assets'> & Partial<Pick<PersonRecord, 'age'>>) {
  if (person.kind === 'EMPEROR') return emperorPortraitUrls[0];
  if ((person.kind === 'MINISTER' || person.kind === 'EUNUCH') && ministerPortraitUrls.length > 0) {
    const explicit = /^minister\.(\d+)$/.exec(person.assets.portrait);
    const index = explicit ? Number(explicit[1]) - 1 : stableIndex(person.id, ministerPortraitUrls.length);
    return ministerPortraitUrls[((index % ministerPortraitUrls.length) + ministerPortraitUrls.length) % ministerPortraitUrls.length];
  }
  if (person.kind === 'DOWAGER' && dowagerPortraitUrls.length > 0) {
    const explicit = /^dowager\.(\d+)$/.exec(person.assets.portrait);
    const index = explicit ? Number(explicit[1]) - 1 : stableIndex(person.id, dowagerPortraitUrls.length);
    return dowagerPortraitUrls[((index % dowagerPortraitUrls.length) + dowagerPortraitUrls.length) % dowagerPortraitUrls.length];
  }
  if (person.kind === 'NOBLE' && consortDowagerPortraitUrls.length > 0) {
    const explicit = /^noble\.(\d+)$/.exec(person.assets.portrait);
    const index = explicit ? Number(explicit[1]) - 1 : stableIndex(person.id, consortDowagerPortraitUrls.length);
    return consortDowagerPortraitUrls[((index % consortDowagerPortraitUrls.length) + consortDowagerPortraitUrls.length) % consortDowagerPortraitUrls.length];
  }
  if (person.kind === 'PRINCE' || person.kind === 'PRINCESS') {
    const portraits = heirPortraitsFor(person);
    if (portraits.length > 0) return portraits[stableIndex(person.id, portraits.length)];
  }
  if (person.kind !== 'CONSORT' || consortPortraitUrls.length === 0) return undefined;
  const empressExplicit = /^empress\.(\d+)$/.exec(person.assets.portrait);
  if (empressExplicit && empressPortraitUrls.length > 0) {
    const index = Number(empressExplicit[1]) - 1;
    return empressPortraitUrls[((index % empressPortraitUrls.length) + empressPortraitUrls.length) % empressPortraitUrls.length];
  }
  const explicit = /^consort\.(\d+)$/.exec(person.assets.portrait);
  const index = explicit ? Number(explicit[1]) - 1 : stableIndex(person.id);
  return consortPortraitUrls[((index % consortPortraitUrls.length) + consortPortraitUrls.length) % consortPortraitUrls.length];
}
