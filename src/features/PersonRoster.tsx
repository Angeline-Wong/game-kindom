import { activeConsorts, deceasedRoyals } from '../game/posthumousTitles';
import { ApprovedPersonDetail } from '../components/ApprovedPersonDetail';
import { useOptionalGameState } from '../game/GameStateContext';
import { isPersonAlive } from '../game/person';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import portraits from '../assets/character-portraits.png';
import { personLifeStatusLabel, type PersonRecord } from '../game/gameState';
import { heirAgeBandLabel, personPortraitUrl } from '../game/personPortraits';
import { parseResidenceLabel } from '../game/residences';
import { royalBirthIdentity, royalIdentityTitle, royalTitleDisplay } from '../game/royalNames';
import { filterByMarriage, getMarriageCounts, getMarriageStatus, getRoyalResidenceGroup, type MarriageFilter } from '../game/royalRoster';

export type RosterKind = 'CONSORT' | 'MINISTER' | 'HEIR' | 'EUNUCH' | 'DECEASED' | 'COLD_PALACE';

const consortOrder = ['皇后', '皇贵妃', '贵妃', '妃', '嫔', '贵人', '常在', '答应', '官女子'];
const officialOrder = ['正一品', '从一品', '正二品', '从二品', '正三品', '从三品', '正四品', '从四品', '正五品', '从五品', '正六品', '从六品', '正七品', '从七品', '正八品', '从八品', '正九品', '从九品'];

function portraitClass(person: PersonRecord) {
  if (person.id === 'empress') return 'empress';
  if (person.kind === 'CONSORT') return 'consort';
  if (person.kind === 'MINISTER' || person.kind === 'EUNUCH') return 'minister';
  if (person.kind === 'DOWAGER') return 'dowager';
  if (person.kind === 'NOBLE') return 'noble';
  return 'prince';
}

export function consortDisplayTitle(person: PersonRecord) {
  const rank = person.rank ?? person.title;
  const honorific = person.honorific?.trim();
  if (!honorific) return rank;
  // 对皇后也保留赐字封号（如“嘉皇后”），否则已赐的封号不会显示
  return honorific.endsWith(rank) ? honorific : `${honorific}${rank}`;
}
export function consortDisplayName(person: PersonRecord) {
  const name = person.name.trim();
  const rank = (person.rank ?? '').trim();
  if (!rank || !name.endsWith(rank)) return name;
  const base = name.slice(0, -rank.length).trim();
  return base ? (base.endsWith('氏') ? base : `${base}氏`) : name;
}
function categoryFor(person: PersonRecord, kind: RosterKind) {
  if (kind === 'CONSORT') return person.rank ?? person.title;
  if (kind === 'MINISTER') {
    if (person.office?.includes('翰林')) return '翰林';
    if (person.office?.includes('内侍')) return '内廷';
    return '朝臣';
  }
  if (kind === 'EUNUCH') return '内侍';
  if (person.age < 15) return '幼年';
  return person.kind === 'PRINCESS' ? '公主' : '皇子';
}

function royalMother(person: PersonRecord, people: Record<string, PersonRecord>, adoptive = false) {
  const id = adoptive ? person.adoptiveMotherId : person.motherId;
  if (id) return people[id];
  if (adoptive) return undefined;
  return person.parents.map((parentId) => people[parentId]).find((parent) => parent?.kind === 'CONSORT');
}

function motherLabel(person: PersonRecord | undefined, people: Record<string, PersonRecord>) {
  if (!person) return undefined;
  const title = !isPersonAlive(person) ? (person.posthumousRank ?? person.posthumousTitle ?? consortDisplayTitle(person)) : consortDisplayTitle(person);
  const name = consortDisplayName(person);
  return `${title}·${name}${isPersonAlive(person) ? '' : '（已故）'}`;
}

function matchesTab(person: PersonRecord, kind: RosterKind, tab: string) {
  if (tab === '全部') return true;
  if (kind === 'HEIR') {
    if (tab === '皇子') return person.kind === 'PRINCE';
    if (tab === '公主') return person.kind === 'PRINCESS';
    if (tab === '襁褓') return person.age <= 0;
    if (tab === '幼年') return person.age >= 1 && person.age <= 5;
    if (tab === '少年') return person.age >= 6 && person.age <= 14;
    if (tab === '成年') return person.age >= 15;
  }
  if (kind === 'EUNUCH') return tab === '内侍';
  return categoryFor(person, kind) === tab;
}

function sortWeight(person: PersonRecord, kind: RosterKind) {
  if (kind === 'CONSORT') {
    const index = consortOrder.indexOf(person.rank ?? person.title);
    return index < 0 ? 99 : index;
  }
  if (kind === 'MINISTER' || kind === 'EUNUCH') {
    const index = officialOrder.indexOf(person.rank ?? '');
    return index < 0 ? 99 : index;
  }
  return -person.age;
}

function cardStats(person: PersonRecord, kind: RosterKind) {
  if (kind === 'CONSORT') return [['宠爱', person.stats['宠爱'] ?? 0], ['容貌', person.stats['容貌'] ?? 0], ['年龄', person.age]] as const;
  if (kind === 'MINISTER' || kind === 'EUNUCH') return [['忠诚', person.stats['忠诚'] ?? 0], ['智慧', person.stats['智慧'] ?? 0], ['年龄', person.age]] as const;
  return person.kind === 'PRINCESS' ? [['才学', person.stats['才学'] ?? 0], ['礼仪', person.stats['礼仪'] ?? 0], ['年龄', person.age]] as const : [['文学', person.stats['文学'] ?? 0], ['武力', person.stats['武力'] ?? 0], ['年龄', person.age]] as const;
}

export function PersonRoster({ kind, people, onClose, onOpenDetail }: { kind: RosterKind; people: Record<string, PersonRecord>; onClose: () => void; onOpenDetail: (personId: string) => void }) {
  const store = useOptionalGameState();
  const [tab, setTab] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [consortView, setConsortView] = useState<'roster' | 'rank' | 'home' | 'children'>('roster');
  const [pregnantOnly, setPregnantOnly] = useState(false);
  const [consortSort, setConsortSort] = useState<'rank' | 'favor'>('rank');
  const [heirView, setHeirView] = useState<'roster' | 'order' | 'home' | 'mother'>('roster');
  const [heirSort, setHeirSort] = useState<'age' | 'favor'>('age');
  const [marriageFilter, setMarriageFilter] = useState<MarriageFilter>('UNMARRIED');
  const [ministerView, setMinisterView] = useState<'roster' | 'rank' | 'office' | 'loyal'>('roster');
  const [loyalOnly, setLoyalOnly] = useState(false);
  const [officialSorted, setOfficialSorted] = useState(true);
  const [eunuchView, setEunuchView] = useState<'roster' | 'rank' | 'office' | 'loyal'>('roster');
  const [eunuchLoyalOnly, setEunuchLoyalOnly] = useState(false);
  const [eunuchSorted, setEunuchSorted] = useState(true);
  const title = kind === 'CONSORT' ? '后宫名册' : kind === 'MINISTER' ? '大臣名册' : kind === 'EUNUCH' ? '内侍名册' : '皇嗣名册';
  const subtitle = kind === 'CONSORT' ? '六宫位序 · 宫室分明' : kind === 'MINISTER' ? '百官铨叙 · 职掌有别' : kind === 'EUNUCH' ? '内廷差遣 · 近侍在册' : '宗室序齿 · 教养有章';
  const tabs = kind === 'CONSORT' ? ['全部', '皇后', '皇贵妃', '贵妃', '妃', '嫔', '贵人'] : kind === 'MINISTER' ? ['全部', '朝臣', '翰林', '内廷'] : kind === 'EUNUCH' ? ['全部', '内侍'] : ['全部', '皇子', '公主', '襁褓', '幼年', '少年', '成年'];
  const allPeople = useMemo(() => (kind === 'CONSORT' ? activeConsorts(people) : Object.values(people).filter((person) => isPersonAlive(person))).filter((person) => kind === 'CONSORT' ? person.kind === 'CONSORT' : kind === 'MINISTER' ? person.kind === 'MINISTER' : kind === 'EUNUCH' ? person.kind === 'EUNUCH' : person.kind === 'PRINCE' || person.kind === 'PRINCESS'), [kind, people]);
  const visiblePeople = useMemo(() => allPeople.filter((person) => matchesTab(person, kind, tab)).filter((person) => !keyword.trim() || `${person.name}${person.rank ?? ''}${person.office ?? ''}${person.residence ?? ''}`.includes(keyword.trim())).sort((a, b) => sortWeight(a, kind) - sortWeight(b, kind) || a.age - b.age), [allPeople, keyword, kind, tab]);
  const selected = selectedId ? people[selectedId] : undefined;
  const secondSummary = kind === 'CONSORT' ? allPeople.filter((person) => person.status === 'PREGNANT').length : kind === 'MINISTER' || kind === 'EUNUCH' ? allPeople.filter((person) => (person.stats['忠诚'] ?? 0) >= 70).length : allPeople.filter((person) => person.age >= 15).length;
  const thirdSummary = kind === 'CONSORT' ? allPeople.filter((person) => person.children.length > 0).length : kind === 'MINISTER' || kind === 'EUNUCH' ? allPeople.filter((person) => (person.stats['智慧'] ?? 0) >= 75).length : allPeople.filter((person) => person.age <= 5).length;

  if (kind === 'DECEASED' || kind === 'COLD_PALACE') {
    const deceased = kind === 'DECEASED';
    const heading = deceased ? '已故宗亲' : '冷宫名册';
    const members = (deceased ? deceasedRoyals(people) : Object.values(people).filter(person => isPersonAlive(person) && person.kind === 'CONSORT' && person.status === 'COLD_PALACE'))
      .filter(person => !keyword.trim() || `${person.name}${person.rank ?? person.title}${person.posthumousRank ?? person.posthumousTitle ?? ''}`.includes(keyword.trim()));
    return <div className="roster-overlay approved-consort-roster" role="dialog" aria-modal="true" aria-label={heading}>
      <section className="consort-list-panel">
        <header className="consort-list-header"><small>紫宸纪事 · {deceased ? '宗人府档案' : '冷宫档案'}</small><h2>{heading}</h2><p>{deceased ? '生平留史 · 身后殊荣' : '宫眷安置'}</p><button className="consort-list-close" aria-label={`关闭${heading}`} onClick={onClose}><X /></button></header>
        <div className="consort-list-tools"><label><Search /><input aria-label="搜索人物" placeholder="搜索姓名或身份" value={keyword} onChange={event => setKeyword(event.target.value)} /></label></div>
        <div className="consort-list-content">
          {members.map(person => <article className="consort-list-card" key={person.id}>
            <span className="consort-list-portrait head-portrait" style={{ backgroundImage: `url(${personPortraitUrl(person) ?? portraits})` }} />
            <div><button className="consort-list-name" aria-label={`查看${person.name}`} onClick={() => deceased ? setSelectedId(person.id) : onOpenDetail(person.id)}>{person.name}<i>{person.posthumousRank || person.posthumousTitle ? `追封${person.posthumousRank ?? person.posthumousTitle}` : person.royalTitle ?? person.rank ?? person.title}</i></button>
              <p>{deceased ? '享年' : '年龄'} {person.age}岁 · {deceased ? '生前身份：' : ''}{person.rank ?? person.title}</p>
              <em>{deceased ? `死因：${person.deathReason ?? '不详'}` : '冷宫安置'}</em>
            </div>
          </article>)}
          {!members.length && <p className="roster-empty">暂无符合条件的人物</p>}
        </div>
      </section>
      {deceased && selected && <ApprovedPersonDetail person={{ id: selected.id, name: selected.name, title: selected.title, portrait: portraitClass(selected), portraitUrl: personPortraitUrl(selected) }} title="已故宗亲" record={selected} people={people} history={store?.gameState.history ?? []} relationships={store?.gameState.relationships ?? []} actionItems={[]} onAction={() => {}} onClose={() => setSelectedId(null)} />}
    </div>;
  }

if (kind === 'CONSORT') {
    const consorts = allPeople.filter((person) => !pregnantOnly || person.status === 'PREGNANT').filter((person) => !keyword.trim() || `${person.name}${person.rank ?? ''}${person.residence ?? ''}`.includes(keyword.trim()));
    const compareWithinRank = (a: PersonRecord, b: PersonRecord) => Number(Boolean(b.honorific?.trim())) - Number(Boolean(a.honorific?.trim())) || a.age - b.age;
    const compareConsorts = (a: PersonRecord, b: PersonRecord) => {
      if (consortSort === 'favor') return (b.stats['宠爱'] ?? 0) - (a.stats['宠爱'] ?? 0) || compareWithinRank(a, b);
      return sortWeight(a, kind) - sortWeight(b, kind) || compareWithinRank(a, b);
    };
    const displayedConsorts = [...consorts].sort(compareConsorts);
    const orderedRanks = consortOrder;
    const ranks = orderedRanks.map((rank) => ({ rank, members: consorts.filter((person) => (person.rank ?? person.title) === rank).sort(compareWithinRank) })).filter((group) => group.members.length > 0);
    const palaces = Array.from(new Set(consorts.map((person) => parseResidenceLabel(person.residence)?.palace ?? person.residence ?? '未定居所'))).map((palace) => ({ palace, rooms: ['东侧殿', '主殿', '西侧殿'].map((room) => ({ room, person: consorts.find((item) => item.residence === `${palace}${room}`) })) }));
    const families = allPeople.map((mother) => ({ mother, children: mother.children.map((id) => people[id]).filter((child): child is PersonRecord => Boolean(child) && isPersonAlive(child)) })).filter((family) => family.children.length > 0).filter((family) => !keyword.trim() || `${family.mother.name}${family.children.map((child) => child.name).join('')}`.includes(keyword.trim())).sort((a, b) => compareConsorts(a.mother, b.mother));
    const openPerson = (personId: string) => onOpenDetail(personId);
    const portrait = (person: PersonRecord, className: string) => <span role="button" tabIndex={0} aria-label={`查看${person.name}`} className={`${className} ${personPortraitUrl(person) ? 'head-portrait' : portraitClass(person)}`} style={{ backgroundImage: `url(${personPortraitUrl(person) ?? portraits})` }} onClick={() => openPerson(person.id)} onKeyDown={(event) => { if (event.key === 'Enter') openPerson(person.id); }} />;
    return <div className="roster-overlay approved-consort-roster" role="dialog" aria-modal="true" aria-label="宫眷名册">
      <section className="consort-list-panel">
        <header className="consort-list-header"><small>紫宸纪事 · 内廷档案</small><h2 aria-label="后宫名册">{consortView === 'roster' ? '宫 眷 名 册' : consortView === 'rank' ? '位 份 清 单' : consortView === 'home' ? '宫 室 居 所' : '皇 嗣 亲 缘'}</h2><p>{consortView === 'roster' ? '宫眷人物与近况总览' : consortView === 'rank' ? '按宫中品秩查看人物' : consortView === 'home' ? '按所居宫殿查看人物' : '育有子嗣的宫眷人物'}</p><button className="consort-list-close" aria-label="关闭宫眷名册" onClick={onClose}><X /></button></header>
        <div className="consort-list-summary"><span><small>在册</small><b>{allPeople.length}人</b></span><button className={pregnantOnly ? 'active' : ''} onClick={() => { setPregnantOnly((value) => !value); setConsortView('roster'); }}><small>有孕</small><b>{secondSummary}人</b></button><span><small>皇嗣</small><b>{thirdSummary}人</b></span></div>
        <div className="consort-list-tools"><label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、位份或居所" /></label><button className="active" onClick={() => setConsortSort((value) => (value === 'rank' ? 'favor' : 'rank'))}>{consortSort === 'rank' ? '位份高→低' : '宠爱高→低'}</button></div>
        <div className="consort-list-content" key={consortView}>
          {consortView === 'roster' && displayedConsorts.map((person) => <article className="consort-list-card" key={person.id}>{portrait(person, 'consort-list-portrait')}<div><button className="consort-list-name" onClick={() => openPerson(person.id)} aria-label={`查看${person.name}`}><span className="consort-list-rank">{consortDisplayTitle(person)}</span><span className="consort-list-separator">·</span><span className="consort-list-person-name">{consortDisplayName(person)}</span></button><p>{person.age}岁 · {person.residence ?? '未定居所'}</p><em>{person.traits.slice(0, 2).join(' · ')} · 子嗣 {person.children.length}{person.status === 'PREGNANT' ? ' · 有孕' : ''}</em></div><strong><small>宠爱</small>{person.stats['宠爱'] ?? 0}</strong></article>)}
          {consortView === 'rank' && ranks.map((group, index) => <section className="consort-rank-group" key={group.rank}><header><h3>{group.rank}</h3><span>第{index + 1}层级 · {group.members.length}人</span></header><div>{group.members.map((person) => <article key={person.id}>{portrait(person, 'consort-rank-portrait')}<button onClick={() => openPerson(person.id)}>{person.name}</button></article>)}</div></section>)}
          {consortView === 'home' && palaces.map((palace) => <section className="consort-palace" key={palace.palace}><h3>{palace.palace}</h3><div>{palace.rooms.map(({ room, person }) => <article className={room === '主殿' ? 'main' : ''} key={room}><small>{room}</small>{person ? <>{portrait(person, 'consort-room-portrait')}<button onClick={() => openPerson(person.id)}>{consortDisplayTitle(person)} · {consortDisplayName(person)}</button></> : <b>空殿</b>}</article>)}</div></section>)}
          {consortView === 'children' && families.map(({ mother, children }) => <section className="consort-family" key={mother.id}><header><button className="consort-mother-name" onClick={() => openPerson(mother.id)}>{consortDisplayTitle(mother)} · {consortDisplayName(mother)}名下</button><span>{children.length}名子嗣</span></header><button className="consort-mother-profile" onClick={() => openPerson(mother.id)}>{portrait(mother, 'consort-mother-portrait')}<span><b>{consortDisplayTitle(mother)} · {consortDisplayName(mother)}</b><small>点击查看母妃详情</small></span></button><div>{children.map((child) => <article key={child.id}>{portrait(child, 'consort-child-portrait')}<button onClick={() => openPerson(child.id)}>{child.title} · {child.name}</button></article>)}</div></section>)}
          {((consortView !== 'children' && consorts.length === 0) || (consortView === 'children' && families.length === 0)) && <p className="roster-empty">暂无符合条件的人物</p>}
        </div>
        <nav className="consort-list-nav">{([['roster', '☷', '名册'], ['rank', '♕', '位份'], ['home', '⌂', '居所'], ['children', '♧', '子嗣']] as const).map(([view, icon, label]) => <button className={consortView === view ? 'active' : ''} key={view} onClick={() => setConsortView(view)}><span>{icon}</span>{label}</button>)}</nav>
      </section>
    </div>;
  }
  if (kind === 'HEIR') {
    const rosterState = store?.gameState;
    const marriageCounts = getMarriageCounts(allPeople, rosterState);
    const query = keyword.trim();
    const heirSearchText = (person: PersonRecord) => {
      const mother = royalMother(person, people);
      const adoptiveMother = royalMother(person, people, true);
      return [person.name, royalBirthIdentity(person), person.title, person.royalTitle ?? '', person.residence ?? '', mother?.name ?? '', mother ? consortDisplayTitle(mother) : '', adoptiveMother?.name ?? '', adoptiveMother ? consortDisplayTitle(adoptiveMother) : ''].join('');
    };
    const compareHeirsByAge = (left: PersonRecord, right: PersonRecord) => left.birthDate.year - right.birthDate.year || left.birthDate.month - right.birthDate.month || left.birthDate.day - right.birthDate.day || (left.birthOrder ?? Number.MAX_SAFE_INTEGER) - (right.birthOrder ?? Number.MAX_SAFE_INTEGER) || left.id.localeCompare(right.id);
    const compareHeirs = (left: PersonRecord, right: PersonRecord) => heirSort === 'favor'
      ? (right.stats['宠爱'] ?? 0) - (left.stats['宠爱'] ?? 0) || compareHeirsByAge(left, right)
      : compareHeirsByAge(left, right);
    const heirs = filterByMarriage(allPeople, marriageFilter, rosterState).filter((person) => matchesTab(person, kind, tab)).filter((person) => !query || heirSearchText(person).includes(query)).sort(compareHeirs);
    const openPerson = (personId: string) => onOpenDetail(personId);
    const heirPortrait = (person: PersonRecord, className: string) => { const portraitUrl = personPortraitUrl(person); return <span role="button" tabIndex={0} aria-label={`查看${person.name}`} className={`${className} ${portraitUrl ? 'head-portrait' : 'prince'}`} style={{ backgroundImage: `url(${portraitUrl ?? portraits})` }} onClick={() => openPerson(person.id)} onKeyDown={(event) => { if (event.key === 'Enter') openPerson(person.id); }} />; };
    const isCrownPrince = (person: PersonRecord) => person.title === '太子' || rosterState?.crownPrinceId === person.id;
    const groups = [{ label: '太子', members: heirs.filter(isCrownPrince) }, { label: '皇子', members: heirs.filter((person) => person.kind === 'PRINCE' && !isCrownPrince(person)) }, { label: '公主', members: heirs.filter((person) => person.kind === 'PRINCESS') }].filter((group) => group.members.length);
    const homes = getRoyalResidenceGroup(heirs, rosterState).map(({ residence, members }) => ({ home: residence, members }));
    const families = Array.from(new Set(heirs.map((child) => royalMother(child, people)?.id).filter((id): id is string => Boolean(id))))
      .map((motherId) => ({ mother: people[motherId], children: heirs.filter((child) => royalMother(child, people)?.id === motherId) }))
      .filter((family) => family.mother && family.children.length)
      .sort((left, right) => {
        const leftRank = consortOrder.indexOf(left.mother.rank ?? left.mother.title);
        const rightRank = consortOrder.indexOf(right.mother.rank ?? right.mother.title);
        return (leftRank < 0 ? 99 : leftRank) - (rightRank < 0 ? 99 : rightRank)
          || left.mother.age - right.mother.age
          || left.mother.id.localeCompare(right.mother.id);
      });
    const heirSequence = (person: PersonRecord) => royalBirthIdentity(person);
    const tile = (person: PersonRecord) => <article className="heir-tile" key={person.id}>{heirPortrait(person, 'heir-tile-portrait')}<button title={royalIdentityTitle(person)} onClick={() => openPerson(person.id)}>{heirSequence(person)} · {person.name}</button></article>;
    return <div className="roster-overlay approved-consort-roster approved-heir-roster" role="dialog" aria-modal="true" aria-label="皇嗣名册"><section className="consort-list-panel">
      <header className="consort-list-header"><small>紫宸纪事 · 宗室玉牒</small><h2 aria-label="皇嗣名册">{heirView === 'roster' ? '皇 嗣 名 册' : heirView === 'order' ? '宗 室 序 齿' : heirView === 'home' ? '皇 嗣 居 所' : '母 妃 归 属'}</h2><p>{heirView === 'roster' ? '宗室序齿 · 教养有章' : heirView === 'order' ? '按身份与长幼查看皇嗣' : heirView === 'home' ? '按教养宫室查看皇嗣' : '按生母查看皇子与公主'}</p><button className="consort-list-close" aria-label="关闭皇嗣名册" onClick={onClose}><X /></button></header>
      <div className="consort-list-summary heir-marriage-summary"><button className={marriageFilter === 'ALL' ? 'active' : ''} onClick={() => setMarriageFilter('ALL')}><small>总数</small><b>{marriageCounts.total}人</b></button><button className={marriageFilter === 'UNMARRIED' ? 'active' : ''} onClick={() => setMarriageFilter('UNMARRIED')}><small>未婚</small><b>{marriageCounts.unmarried}人</b></button><button className={marriageFilter === 'MARRIED' ? 'active' : ''} onClick={() => setMarriageFilter('MARRIED')}><small>已婚</small><b>{marriageCounts.married}人</b></button></div>
      <div className="consort-list-tools heir-list-tools"><label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、身份或居所" /></label><button className="active" onClick={() => setHeirSort((value) => value === 'age' ? 'favor' : 'age')}>{heirSort === 'age' ? '长幼排序' : '宠爱高→低'}</button></div>
      <div className="consort-list-content">
        {heirView === 'roster' && heirs.map((person) => { const mother = royalMother(person, people); const adoptiveMother = royalMother(person, people, true); const abilityLabel = person.kind === 'PRINCESS' ? '才学/礼仪' : '文学/武力'; const abilityValue = person.kind === 'PRINCESS' ? `${person.stats['才学'] ?? 0}/${person.stats['礼仪'] ?? 0}` : `${person.stats['文学'] ?? 0}/${person.stats['武力'] ?? 0}`; const statusLabel = getMarriageStatus(person, rosterState); return <article className="consort-list-card heir-list-card" key={person.id}>{heirPortrait(person, 'consort-list-portrait')}<div className="heir-card-copy"><button className="consort-list-name heir-card-title" onClick={() => openPerson(person.id)}><span className="heir-card-identity">{heirSequence(person)}</span><span className="consort-list-separator">·</span><span className="consort-list-person-name">{person.name}</span></button><p>{person.age}岁 · {statusLabel === 'MARRIED' ? '已婚' : '未婚'} · {person.residence ?? '未定居所'}</p><em>{motherLabel(mother, people) ? `生母 ${motherLabel(mother, people)}` : '生母 未载'}{adoptiveMother ? ` ｜ 养母 ${motherLabel(adoptiveMother, people)}` : ''}{person.traits[0] ? ` ｜ 爱好 ${person.traits[0]}` : ''}</em></div><div className="heir-card-side">{person.royalTitle ? <span className="heir-royal-title" title={person.royalTitle}>{royalTitleDisplay(person.royalTitle)}</span> : <span aria-hidden="true" /> }<small>{abilityLabel}</small><b>{abilityValue}</b></div></article>; })}
        {heirView === 'order' && groups.map((group, index) => <section className="consort-rank-group heir-group" key={group.label}><header><h3>{group.label}</h3><span>第{index + 1}层级 · {group.members.length}人</span></header><div>{group.members.map(tile)}</div></section>)}
        {heirView === 'home' && homes.map((group) => <section className="consort-rank-group heir-group" key={group.home}><header><h3>{group.home}</h3><span>{group.members.length}人</span></header><div>{group.members.map(tile)}</div></section>)}
        {heirView === 'mother' && families.map(({ mother, children }) => <section className="consort-family heir-family" key={mother.id}><header><button className="consort-mother-name" onClick={() => openPerson(mother.id)}>{mother.name}名下</button><span>{consortDisplayTitle(mother)} · {children.length}名子嗣</span></header><button className="consort-mother-profile" onClick={() => openPerson(mother.id)}><span className="consort-mother-portrait head-portrait" style={{ backgroundImage: `url(${personPortraitUrl(mother) ?? portraits})` }} /><span><b>{mother.name}</b><small>点击查看母妃详情</small></span><em>{consortDisplayTitle(mother)}</em></button><div>{children.map(tile)}</div></section>)}
        {heirs.length === 0 && <p className="roster-empty">名册中暂无符合条件的人物</p>}
      </div>
      <nav className="consort-list-nav">{([['roster', '☷', '名册'], ['order', '序', '序齿'], ['home', '⌂', '居所'], ['mother', '♧', '母妃']] as const).map(([view, icon, label]) => <button className={heirView === view ? 'active' : ''} key={view} onClick={() => setHeirView(view)}><span>{icon}</span>{label}</button>)}</nav>
    </section></div>;
  }
  if (kind === 'MINISTER') {
    const query = keyword.trim();
    const compareMinisters = (left: PersonRecord, right: PersonRecord) => {
      const rankDifference = sortWeight(left, kind) - sortWeight(right, kind);
      return (officialSorted ? rankDifference : -rankDifference) || (right.stats['忠诚'] ?? 0) - (left.stats['忠诚'] ?? 0) || left.age - right.age;
    };
    const ministers = allPeople
      .filter((person) => !loyalOnly || (person.stats['忠诚'] ?? 0) >= 70)
      .filter((person) => !query || `${person.name}${person.rank ?? ''}${person.office ?? ''}${person.residence ?? ''}`.includes(query))
      .sort(compareMinisters);
    const orderedOfficialRanks = officialSorted ? officialOrder : [...officialOrder].reverse();
    const rankGroups = orderedOfficialRanks.map((rank) => ({ rank, members: ministers.filter((person) => person.rank === rank) })).filter((group) => group.members.length);
    const officeGroups = Array.from(new Set(ministers.map((person) => person.office ?? '候补官员'))).map((office) => ({ office, members: ministers.filter((person) => (person.office ?? '候补官员') === office) }));
    const loyalMinisters = ministers.filter((person) => (person.stats['忠诚'] ?? 0) >= 70).sort((left, right) => (right.stats['忠诚'] ?? 0) - (left.stats['忠诚'] ?? 0) || compareMinisters(left, right));
    const openPerson = (personId: string) => onOpenDetail(personId);
    const ministerPortrait = (person: PersonRecord, className: string) => { const portraitUrl = personPortraitUrl(person); return <span role="button" tabIndex={0} aria-label={`查看${person.name}`} className={`${className} ${portraitUrl ? 'head-portrait' : 'minister'}`} style={{ backgroundImage: `url(${portraitUrl ?? portraits})` }} onClick={() => openPerson(person.id)} onKeyDown={(event) => { if (event.key === 'Enter') openPerson(person.id); }} />; };
    const tile = (person: PersonRecord) => <article className="heir-tile minister-tile" key={person.id}>{ministerPortrait(person, 'heir-tile-portrait')}<button onClick={() => openPerson(person.id)}>{person.name}<small>{person.office ?? person.title}</small></button></article>;
    const viewPeople = ministerView === 'loyal' ? loyalMinisters : ministers;
    return <div className="roster-overlay approved-consort-roster approved-minister-roster" role="dialog" aria-modal="true" aria-label="大臣名册"><section className="consort-list-panel">
      <header className="consort-list-header"><small>紫宸纪事 · 吏部铨档</small><h2 aria-label="大臣名册">{ministerView === 'roster' ? '百 官 名 册' : ministerView === 'rank' ? '官 品 序 列' : ministerView === 'office' ? '衙 署 职 掌' : '忠 良 臣 工'}</h2><p>{ministerView === 'roster' ? '朝臣履历与任职总览' : ministerView === 'rank' ? '按官品高低查看朝臣' : ministerView === 'office' ? '按任职衙署查看朝臣' : '忠诚七十以上的臣工'}</p><button className="consort-list-close" aria-label="关闭官员名册" onClick={onClose}><X /></button></header>
      <div className="consort-list-summary"><span><small>在册</small><b>{allPeople.length}人</b></span><button className={loyalOnly ? 'active' : ''} onClick={() => { setLoyalOnly((value) => !value); setMinisterView('roster'); }}><small>忠良</small><b>{secondSummary}人</b></button><span><small>才识卓著</small><b>{thirdSummary}人</b></span></div>
      <div className="consort-list-tools"><label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、官职或品级" /></label><button className="active" onClick={() => setOfficialSorted((value) => !value)}>{officialSorted ? '官品高→低' : '官品低→高'}</button></div>
      <div className="consort-list-content">
        {(ministerView === 'roster' || ministerView === 'loyal') && viewPeople.map((person) => <article className="consort-list-card minister-list-card" key={person.id}>{ministerPortrait(person, 'consort-list-portrait')}<div><button className="consort-list-name" onClick={() => openPerson(person.id)}>{person.name}<i>{person.rank ?? '未定品'}</i></button><p>{person.office ?? person.title} · {person.age}岁</p><em>{person.traits.slice(0, 2).join(' · ') || '品行待察'} · {person.residence ?? '京师'}</em></div><strong><small>忠诚</small>{person.stats['忠诚'] ?? 0}</strong></article>)}
        {ministerView === 'rank' && rankGroups.map((group, index) => <section className="consort-rank-group heir-group minister-group" key={group.rank}><header><h3>{group.rank}</h3><span>第{index + 1}层级 · {group.members.length}人</span></header><div>{group.members.map(tile)}</div></section>)}
        {ministerView === 'office' && officeGroups.map((group) => <section className="consort-rank-group heir-group minister-group" key={group.office}><header><h3>{group.office}</h3><span>{group.members.length}人</span></header><div>{group.members.map(tile)}</div></section>)}
        {viewPeople.length === 0 && ministerView !== 'rank' && ministerView !== 'office' && <p className="roster-empty">名册中暂无符合条件的官员</p>}
      </div>
      <nav className="consort-list-nav">{([['roster', '☷', '名册'], ['rank', '品', '官品'], ['office', '⌂', '衙署'], ['loyal', '忠', '忠良']] as const).map(([view, icon, label]) => <button className={ministerView === view ? 'active' : ''} key={view} onClick={() => setMinisterView(view)}><span>{icon}</span>{label}</button>)}</nav>
    </section></div>;
  }
  if (kind === 'EUNUCH') {
    const query = keyword.trim();
    const compareEunuchs = (left: PersonRecord, right: PersonRecord) => {
      const rankDifference = sortWeight(left, kind) - sortWeight(right, kind);
      return (eunuchSorted ? rankDifference : -rankDifference) || (right.stats['忠诚'] ?? 0) - (left.stats['忠诚'] ?? 0) || left.age - right.age;
    };
    const eunuchs = allPeople
      .filter((person) => !eunuchLoyalOnly || (person.stats['忠诚'] ?? 0) >= 70)
      .filter((person) => !query || `${person.name}${person.rank ?? ''}${person.office ?? ''}${person.residence ?? ''}`.includes(query))
      .sort(compareEunuchs);
    const orderedOfficialRanks = eunuchSorted ? officialOrder : [...officialOrder].reverse();
    const rankGroups = orderedOfficialRanks.map((rank) => ({ rank, members: eunuchs.filter((person) => person.rank === rank) })).filter((group) => group.members.length);
    const officeGroups = Array.from(new Set(eunuchs.map((person) => person.office ?? '候补内侍'))).map((office) => ({ office, members: eunuchs.filter((person) => (person.office ?? '候补内侍') === office) }));
    const loyalEunuchs = eunuchs.filter((person) => (person.stats['忠诚'] ?? 0) >= 70).sort((left, right) => (right.stats['忠诚'] ?? 0) - (left.stats['忠诚'] ?? 0) || compareEunuchs(left, right));
    const openPerson = (personId: string) => onOpenDetail(personId);
    const eunuchPortrait = (person: PersonRecord, className: string) => { const portraitUrl = personPortraitUrl(person); return <span role="button" tabIndex={0} aria-label={`查看${person.name}`} className={`${className} ${portraitUrl ? 'head-portrait' : 'minister'}`} style={{ backgroundImage: `url(${portraitUrl ?? portraits})` }} onClick={() => openPerson(person.id)} onKeyDown={(event) => { if (event.key === 'Enter') openPerson(person.id); }} />; };
    const tile = (person: PersonRecord) => <article className="heir-tile minister-tile" key={person.id}>{eunuchPortrait(person, 'heir-tile-portrait')}<button onClick={() => openPerson(person.id)}>{person.name}<small>{person.office ?? person.title}</small></button></article>;
    const viewPeople = eunuchView === 'loyal' ? loyalEunuchs : eunuchs;
    return <div className="roster-overlay approved-consort-roster approved-minister-roster" role="dialog" aria-modal="true" aria-label="内侍名册"><section className="consort-list-panel">
      <header className="consort-list-header"><small>紫宸纪事 · 内务府档</small><h2 aria-label="内侍名册">{eunuchView === 'roster' ? '内 侍 名 册' : eunuchView === 'rank' ? '品 级 序 列' : eunuchView === 'office' ? '职 司 归 属' : '忠 慎 内 侍'}</h2><p>{eunuchView === 'roster' ? '内廷近侍与差遣总览' : eunuchView === 'rank' ? '按品级高低查看内侍' : eunuchView === 'office' ? '按职司归属查看内侍' : '忠诚七十以上的近侍'}</p><button className="consort-list-close" aria-label="关闭内侍名册" onClick={onClose}><X /></button></header>
      <div className="consort-list-summary"><span><small>在册</small><b>{allPeople.length}人</b></span><button className={eunuchLoyalOnly ? 'active' : ''} onClick={() => { setEunuchLoyalOnly((value) => !value); setEunuchView('roster'); }}><small>忠慎</small><b>{secondSummary}人</b></button><span><small>机敏</small><b>{thirdSummary}人</b></span></div>
      <div className="consort-list-tools"><label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、职司或品级" /></label><button className="active" onClick={() => setEunuchSorted((value) => !value)}>{eunuchSorted ? '品级高→低' : '品级低→高'}</button></div>
      <div className="consort-list-content">
        {(eunuchView === 'roster' || eunuchView === 'loyal') && viewPeople.map((person) => <article className="consort-list-card minister-list-card" key={person.id}>{eunuchPortrait(person, 'consort-list-portrait')}<div><button className="consort-list-name" onClick={() => openPerson(person.id)}>{person.name}<i>{person.rank ?? '未定品'}</i></button><p>{person.office ?? person.title} · {person.age}岁</p><em>{person.traits.slice(0, 2).join(' · ') || '品行待察'} · {person.residence ?? '宫中'}</em></div><strong><small>忠诚</small>{person.stats['忠诚'] ?? 0}</strong></article>)}
        {eunuchView === 'rank' && rankGroups.map((group, index) => <section className="consort-rank-group heir-group minister-group" key={group.rank}><header><h3>{group.rank}</h3><span>第{index + 1}层级 · {group.members.length}人</span></header><div>{group.members.map(tile)}</div></section>)}
        {eunuchView === 'office' && officeGroups.map((group) => <section className="consort-rank-group heir-group minister-group" key={group.office}><header><h3>{group.office}</h3><span>{group.members.length}人</span></header><div>{group.members.map(tile)}</div></section>)}
        {viewPeople.length === 0 && eunuchView !== 'rank' && eunuchView !== 'office' && <p className="roster-empty">名册中暂无符合条件的内侍</p>}
      </div>
      <nav className="consort-list-nav">{([['roster', '☷', '名册'], ['rank', '品', '品级'], ['office', '⌂', '职司'], ['loyal', '忠', '忠慎']] as const).map(([view, icon, label]) => <button className={eunuchView === view ? 'active' : ''} key={view} onClick={() => setEunuchView(view)}><span>{icon}</span>{label}</button>)}</nav>
    </section></div>;
  }
  return <div className="roster-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <section className="roster-panel">
      <header className="roster-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button aria-label={`关闭${title}`} onClick={onClose}><X /></button></header>
      <div className="roster-summary"><span><b>{allPeople.length}</b>{kind === 'MINISTER' ? '在册' : '皇嗣'}</span><span><b>{secondSummary}</b>{kind === 'MINISTER' ? '忠良' : '成年'}</span><span><b>{thirdSummary}</b>{kind === 'MINISTER' ? '才识卓著' : '幼年'}</span></div>
      <div className="roster-tools"><div className="roster-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div><label className="roster-search"><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={kind === 'MINISTER' ? '姓名 / 官职' : '姓名 / 身份'} /></label></div>
      <div className="roster-cards">{visiblePeople.map((person, index) => <button key={person.id} className={`roster-card ${selectedId === person.id ? 'selected' : ''}`} style={{ animationDelay: `${index * 45}ms` }} onClick={() => setSelectedId(person.id)}>
        <span className={`roster-portrait ${portraitClass(person)} ${personPortraitUrl(person) ? 'head-portrait' : ''}`} style={{ backgroundImage: `url(${personPortraitUrl(person) ?? portraits})` }} />
        <span className="roster-ribbon">{person.honorific ?? ''}{person.rank ?? person.title}</span>
        <span className="roster-name">{person.name}<small>{person.residence ?? person.office ?? person.title}</small></span>
        <span className="roster-statline">{cardStats(person, kind).map(([label, value]) => <span key={label}><b>{value}</b>{label === '年龄' ? '岁' : label}</span>)}</span>
        <span className="roster-badges">{person.traits.slice(0, 2).map((trait) => <i key={trait}>{trait}</i>)}<i>{personLifeStatusLabel(person.status)}</i></span>
      </button>)}{visiblePeople.length === 0 && <p className="roster-empty">名册中暂无符合条件的人物</p>}</div>
    </section>
    {selected && <section className="roster-sheet"><span className="roster-handle" /><button className="roster-sheet-close" aria-label="关闭人物摘要" onClick={() => setSelectedId(null)}><X /></button><h3>{selected.name} · {selected.rank ?? selected.title}</h3><p>{selected.residence ?? selected.office ?? '暂无固定居所'} · {selected.age}岁 · {selected.traits.join('、') || '性情待察'}</p><div className="roster-sheet-stats">{cardStats(selected, kind).map(([label, value]) => <span key={label}><b>{value}</b>{label}</span>)}</div><button className="roster-detail-button" onClick={() => onOpenDetail(selected.id)}>人物详情</button></section>}
  </div>;
}










