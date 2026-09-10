import { clockDate, type GameState, type PersonRecord } from './gameState';
import { isPersonAlive } from './person';
import { isRoyalInLaw } from './royalInLaws';
import { consortRanks } from './ranks';
import { princeTitleRules, princessTitleRules } from './royalTitles';

export function deceasedRoyals(people: GameState['people']) {
  return Object.values(people).filter(person => !isRoyalInLaw(person) && !isPersonAlive(person) && ['CONSORT', 'PRINCE', 'PRINCESS', 'NOBLE', 'DOWAGER'].includes(person.kind));
}
export function activeConsorts(people: GameState['people']) {
  return Object.values(people).filter(person => isPersonAlive(person) && person.kind === 'CONSORT' && person.status !== 'COLD_PALACE' && person.status !== 'PRISON');
}

/** Ascending honors only; active favor, residence and office quotas do not apply. */
export function posthumousTitleOptions(person: PersonRecord): string[] {
  if (isPersonAlive(person) || isRoyalInLaw(person)) return [];
  if (person.kind === 'CONSORT') {
    const rank = person.posthumousRank ?? person.rank ?? person.title;
    const index = consortRanks.indexOf(rank as typeof consortRanks[number]);
    return index < 0 ? [] : consortRanks.slice(index + 1);
  }
  if (!['PRINCE', 'PRINCESS', 'NOBLE'].includes(person.kind)) return [];
  const rules = person.kind === 'PRINCESS' || (person.kind === 'NOBLE' && person.sex === 'FEMALE') ? princessTitleRules : princeTitleRules;
  const title = person.posthumousTitle ?? person.royalTitle ?? person.title;
  // Existing crown titles outrank all ordinary titles in these tables.
  if (['太子', '皇太女', '长公主', '大长公主'].some(rank => title.endsWith(rank))) return [];
  const index = rules.findIndex(rule => title === rule.name || (title.endsWith(rule.suffix) && (rule.suffix !== '公主' || title.startsWith(rule.prefix))));
  if (index >= 0) return rules.slice(0, index).map(rule => rule.name).reverse();
  // Unranked royal children may receive their first honor. Unknown noble titles
  // keep the interface but cannot be ordered safely until a hierarchy exists.
  if (person.kind === 'NOBLE' || !/皇子[一二三四五六七八九十]*$|公主[一二三四五六七八九十]*$/.test(title)) return [];
  return rules.map(rule => rule.name).reverse();
}

export function grantPosthumousTitle(state: GameState, id: string, requestedTitle: string) {
  const person = state.people[id];
  const title = requestedTitle.trim();
  if (!person || isPersonAlive(person) || !posthumousTitleOptions(person).includes(title)) {
    return { ok: false, state, message: '此人物不能获此追封，请选择更高的身后位份或爵位。' };
  }
  const date = clockDate(state.clock);
  const changed: PersonRecord = { ...person, posthumousGrantedAt: date, ...(person.kind === 'CONSORT' ? { posthumousRank: title } : { posthumousTitle: title }) };
  const message = `追封${person.name}为${title}。`;
  return { ok: true, message, state: { ...state,
    people: { ...state.people, [id]: changed },
    history: [...state.history, { id: `posthumous-${id}-${state.history.length}`, date, type: 'POSTHUMOUS_TITLE', summary: message, personIds: [id, 'emperor'] }],
  } };
}
