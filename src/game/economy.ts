import { isPersonAlive, killPerson, clampHealth } from './person';
import { confirmGiftEvent, createGiftEvent, giftCatalog, type GiftCurrencyAccount } from './gifts';
import { applyConsortGrowth, formatConsortGrowth, giftGrowth } from './consortGrowth';
import { clockDate, type GameDate, type GameState, type HistoryEntry, type PersonRecord, type RelationshipRecord } from './gameState';
import { royalTitleEligibility } from './royalTitles';

export interface FinanceState {
  nationalTreasury: number;
  gold: number;
  yuanbao: number;
  lastPayrollKey?: string;
}

export const initialFinances: FinanceState = {
  nationalTreasury: 100_000_000,
  gold: 200_000,
  yuanbao: 9_999,
};

export interface EconomyResult { ok: boolean; state: GameState; message: string }

function rewardRelationship(relationships: RelationshipRecord[], personId: string, amount: number) {
  return relationships.map((relationship) => {
    const matches = (relationship.personAId === 'emperor' && relationship.personBId === personId)
      || (relationship.personBId === 'emperor' && relationship.personAId === personId);
    return matches ? { ...relationship, affinity: Math.min(100, relationship.affinity + amount), trust: Math.min(100, relationship.trust + Math.ceil(amount / 2)) } : relationship;
  });
}

function rewardHistory(state: GameState, person: PersonRecord, summary: string): HistoryEntry {
  return {
    id: `history-reward-${person.id}-${state.clock.year}-${state.clock.month}-${state.clock.day}-${state.clock.minuteOfDay}-${state.history.length}`,
    date: clockDate(state.clock), type: 'REWARD', summary, personIds: ['emperor', person.id],
  };
}

function hasFunds(state: GameState, account: GiftCurrencyAccount, amount: number) { return state.finances[account] >= amount; }
function deductFunds(state: GameState, account: GiftCurrencyAccount, amount: number) { return { ...state.finances, [account]: state.finances[account] - amount }; }

export function grantInventoryGift(state: GameState, personId: string, itemId: string, quantity: number): EconomyResult {
  const person = state.people[personId];
  const item = giftCatalog.find((entry) => entry.id === itemId);
  if (!person || !isPersonAlive(person)) return { ok: false, state, message: '赏赐对象不存在或已经薨逝。' };
  if (!item) return { ok: false, state, message: '国库中没有这件物品。' };
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, state, message: '赏赐数量不正确。' };
  if ((state.gifts.inventory[itemId] ?? 0) < quantity) return { ok: false, state, message: `${item.name}库存不足。` };
  const currencyAmount = (item.currencyCost?.amount ?? 0) * quantity;
  if (item.currencyCost && !hasFunds(state, item.currencyCost.account, currencyAmount)) return { ok: false, state, message: `${item.name}所需库银不足，无法赏赐。` };

  const gifts = confirmGiftEvent(createGiftEvent(itemId, quantity, personId), state.gifts);
  const finances = item.currencyCost ? deductFunds(state, item.currencyCost.account, currencyAmount) : state.finances;
  const growth = applyConsortGrowth(person, giftGrowth(item.id, item.category, quantity));
  const growthText = person.kind === 'CONSORT' ? `，${formatConsortGrowth(growth.gains)}` : '';
  const summary = `皇帝赏赐${person.name}${item.name}${quantity}件${growthText}。`;
  return {
    ok: true,
    message: `${item.name} × ${quantity}已赏赐给${person.name}${growthText}，库存、财务与履历均已更新。`,
    state: { ...state, finances, gifts, people: person.kind === 'CONSORT' ? { ...state.people, [personId]: growth.person } : state.people, relationships: rewardRelationship(state.relationships, personId, Math.min(12, 3 + quantity)), history: [...state.history, rewardHistory(state, person, summary)] },
  };
}

export function grantDirectReward(state: GameState, personId: string, reward: string): EconomyResult {
  if (reward === '御赐墨宝') return grantInventoryGift(state, personId, 'imperial-calligraphy', 1);
  const person = state.people[personId];
  if (!person || !isPersonAlive(person)) return { ok: false, state, message: '赏赐对象不存在或已经薨逝。' };
  const rewardSpec = reward === '赏银百两'
    ? { account: 'nationalTreasury' as const, amount: 100, label: '白银百两' }
    : reward === '赏金百两' ? { account: 'gold' as const, amount: 100, label: '黄金百两' } : null;
  if (!rewardSpec) return { ok: false, state, message: '尚未配置这项赏赐。' };
  if (!hasFunds(state, rewardSpec.account, rewardSpec.amount)) return { ok: false, state, message: `${rewardSpec.label}不足，赏赐未能执行。` };
  const growth = applyConsortGrowth(person, { 宠爱: 3 });
  const growthText = person.kind === 'CONSORT' ? `，${formatConsortGrowth(growth.gains)}` : '';
  const summary = `皇帝赏赐${person.name}${rewardSpec.label}${growthText}。`;
  return {
    ok: true, message: `${rewardSpec.label}已赏赐给${person.name}${growthText}，财务与人物履历已经同步。`,
    state: { ...state, people: person.kind === 'CONSORT' ? { ...state.people, [personId]: growth.person } : state.people, finances: deductFunds(state, rewardSpec.account, rewardSpec.amount), relationships: rewardRelationship(state.relationships, personId, 5), history: [...state.history, rewardHistory(state, person, summary)] },
  };
}

export function grantRoyalTitle(state: GameState, personId: string, title: string): EconomyResult {
  const person = state.people[personId];
  const normalized = title.trim();
  if (!isPersonAlive(person) || (person.kind !== 'PRINCE' && person.kind !== 'PRINCESS')) return { ok: false, state, message: '册封对象并非皇子或公主。' };
  if (!normalized) return { ok: false, state, message: '爵位与封号不能为空。' };
  if (person.title === normalized) return { ok: false, state, message: `${person.name}已经是${normalized}。` };
  const eligibility = royalTitleEligibility(person, normalized);
  if (!eligibility.ok) return { ok: false, state, message: eligibility.reason };
  const summary = `${person.name}由${person.title}奉旨册封为${normalized}。`;
  return {
    ok: true,
    message: `${person.name}已正式册封为${normalized}，爵位、岁俸与履历均已更新。`,
    state: {
      ...state,
      people: { ...state.people, [personId]: { ...person, royalTitle: normalized } },
      history: [...state.history, { id: `history-title-${personId}-${state.clock.year}-${state.clock.month}-${state.clock.day}-${state.history.length}`, date: clockDate(state.clock), type: 'ROYAL_TITLE', summary, personIds: [personId, 'emperor'] }],
    },
  };
}

const consortStipends: Record<string, number> = { 皇后: 500, 皇贵妃: 400, 贵妃: 300, 妃: 200, 嫔: 100, 贵人: 60, 常在: 40, 答应: 20, 官女子: 10 };
function officialGrade(rank?: string) { const match = rank?.match(/[一二三四五六七八九]/); return match ? '一二三四五六七八九'.indexOf(match[0]) + 1 : 9; }

export function monthlyStipend(person: PersonRecord) {
  if (person.kind === 'CONSORT') return consortStipends[person.rank ?? person.title] ?? 20;
  if (person.kind === 'MINISTER') return person.office ? Math.max(20, 220 - officialGrade(person.rank) * 20) : 0;
  if (person.kind === 'PRINCE' || person.kind === 'PRINCESS') {
    if (person.title.includes('亲王')) return 500;
    if (person.title.includes('郡王')) return 350;
    if (person.title.includes('贝勒')) return 250;
    if (person.title.includes('贝子')) return 180;
    return 120;
  }
  return 0;
}

function payrollEvent(date: GameDate, person: PersonRecord, body: string) {
  return {
    id: `event-payroll-${person.id}-${date.year}-${date.month}`, type: 'SYSTEM_NOTICE' as const, priority: 75, createdOn: date,
    personIds: [person.id, 'emperor'], title: person.kind === 'MINISTER' ? '户部急报' : '内务府急报', body,
    choices: [{ id: 'acknowledge', label: '朕知道了', result: '欠俸事件已经记入史册。' }], defaultChoiceId: 'acknowledge', status: 'PENDING' as const,
  };
}

export function processMonthlyStipends(state: GameState, date: GameDate): GameState {
  const payrollKey = `${date.year}-${date.month}`;
  if (date.day !== 1 || state.finances.lastPayrollKey === payrollKey) return state;
  const deaths: string[] = [];
  let treasury = state.finances.nationalTreasury;
  const people = { ...state.people };
  const events = [...state.events];
  const history = [...state.history];
  const payable = Object.values(people).filter((person) => isPersonAlive(person) && monthlyStipend(person) > 0).sort((a, b) => a.id.localeCompare(b.id));
  let paidTotal = 0;
  let arrearsTotal = 0;

  payable.forEach((person) => {
    const stipend = monthlyStipend(person);
    if (person.kind === 'CONSORT' && (person.fineMonthsRemaining ?? 0) > 0) {
      people[person.id] = { ...person, fineMonthsRemaining: person.fineMonthsRemaining! - 1 };
      history.push({ id: `history-fine-${person.id}-${payrollKey}`, date, type: 'PALACE_FINE_WITHHELD', summary: `${person.name}本月依宫规罚俸，扣发月例${stipend}两。`, personIds: [person.id, 'emperor'] });
      return;
    }
    if (treasury >= stipend) {
      treasury -= stipend;
      paidTotal += stipend;
      if (person.arrearsMonths) people[person.id] = { ...person, arrearsMonths: 0 };
      return;
    }
    arrearsTotal += stipend;
    const arrearsMonths = (person.arrearsMonths ?? 0) + 1;
    if (person.kind === 'MINISTER') {
      people[person.id] = { ...person, arrearsMonths, status: 'OUTSIDE', office: undefined, title: '辞官归里', sceneId: 'world' };
      events.push(payrollEvent(date, person, `国库无银发放月俸，${person.name}已经挂冠辞官。`));
      history.push({ id: `history-resign-${person.id}-${payrollKey}`, date, type: 'RESIGNATION', summary: `${person.name}因朝廷欠俸辞官归里。`, personIds: [person.id, 'emperor'] });
      return;
    }
    const health = clampHealth((person.stats['健康'] ?? 80) - 35);
    const starved = arrearsMonths >= 2 || health <= 0;
    if (starved) deaths.push(person.id);
    people[person.id] = { ...person, arrearsMonths, stats: { ...person.stats, 健康: health } };
    events.push(payrollEvent(date, person, starved ? `国库连续无力供应月例，${person.title}${person.name}已在饥寒中身亡。` : `国库已经告罄，${person.title}${person.name}本月月例停发，健康严重下降。`));
    history.push({ id: `history-arrears-${person.id}-${payrollKey}`, date, type: starved ? 'STARVATION_DEATH' : 'STIPEND_ARREARS', summary: starved ? `${person.name}因连续欠俸饥寒而亡。` : `${person.name}本月月例未能发放。`, personIds: [person.id, 'emperor'] });
  });

  history.push({ id: `history-payroll-${payrollKey}`, date, type: 'MONTHLY_PAYROLL', summary: `户部于本月初一发放月俸${paidTotal}两${arrearsTotal ? `，另有${arrearsTotal}两未能支给` : ''}。`, personIds: ['emperor'] });
  const next = { ...state, people, events, history, finances: { ...state.finances, nationalTreasury: treasury, lastPayrollKey: payrollKey } };
  return deaths.reduce<GameState>((current, id) => killPerson(current, id, '连续欠俸饥寒', date), next);
}
