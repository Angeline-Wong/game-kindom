import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import portraits from '../assets/character-portraits.png';
import { personLifeStatusLabel, type PersonRecord } from '../game/gameState';

export type RosterKind = 'CONSORT' | 'MINISTER' | 'HEIR';

const consortOrder = ['皇后', '皇贵妃', '贵妃', '妃', '嫔', '贵人', '常在', '答应', '官女子'];
const officialOrder = ['正一品', '从一品', '正二品', '从二品', '正三品', '从三品', '正四品', '从四品', '正五品', '从五品', '正六品', '从六品', '正七品', '从七品', '正八品', '从八品', '正九品', '从九品'];

function portraitClass(person: PersonRecord) {
  if (person.id === 'empress') return 'empress';
  if (person.kind === 'CONSORT') return 'consort';
  if (person.kind === 'MINISTER') return 'minister';
  return 'prince';
}

function categoryFor(person: PersonRecord, kind: RosterKind) {
  if (kind === 'CONSORT') return person.rank ?? person.title;
  if (kind === 'MINISTER') {
    if (person.office?.includes('翰林')) return '翰林';
    if (person.office?.includes('内侍')) return '内廷';
    return '朝臣';
  }
  if (person.age < 15) return '幼年';
  return person.kind === 'PRINCESS' ? '公主' : '皇子';
}

function matchesTab(person: PersonRecord, kind: RosterKind, tab: string) {
  if (tab === '全部') return true;
  if (kind === 'HEIR') {
    if (tab === '皇子') return person.kind === 'PRINCE';
    if (tab === '公主') return person.kind === 'PRINCESS';
    if (tab === '幼年') return person.age < 15;
    if (tab === '成年') return person.age >= 15;
  }
  return categoryFor(person, kind) === tab;
}

function sortWeight(person: PersonRecord, kind: RosterKind) {
  if (kind === 'CONSORT') {
    const index = consortOrder.indexOf(person.rank ?? person.title);
    return index < 0 ? 99 : index;
  }
  if (kind === 'MINISTER') {
    const index = officialOrder.indexOf(person.rank ?? '');
    return index < 0 ? 99 : index;
  }
  return -person.age;
}

function cardStats(person: PersonRecord, kind: RosterKind) {
  if (kind === 'CONSORT') return [['宠爱', person.stats['宠爱'] ?? 0], ['容貌', person.stats['容貌'] ?? 0], ['年龄', person.age]] as const;
  if (kind === 'MINISTER') return [['忠诚', person.stats['忠诚'] ?? 0], ['智慧', person.stats['智慧'] ?? 0], ['年龄', person.age]] as const;
  return [['文才', person.stats['文才'] ?? 0], ['武略', person.stats['武略'] ?? 0], ['年龄', person.age]] as const;
}

export function PersonRoster({ kind, people, onClose, onOpenDetail }: { kind: RosterKind; people: Record<string, PersonRecord>; onClose: () => void; onOpenDetail: (personId: string) => void }) {
  const [tab, setTab] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const title = kind === 'CONSORT' ? '后宫名册' : kind === 'MINISTER' ? '大臣名册' : '皇嗣名册';
  const subtitle = kind === 'CONSORT' ? '六宫位序 · 宫室分明' : kind === 'MINISTER' ? '百官铨叙 · 职掌有别' : '宗室序齿 · 教养有章';
  const tabs = kind === 'CONSORT' ? ['全部', '皇后', '皇贵妃', '贵妃', '妃', '嫔', '贵人'] : kind === 'MINISTER' ? ['全部', '朝臣', '翰林', '内廷'] : ['全部', '皇子', '公主', '幼年', '成年'];
  const allPeople = useMemo(() => Object.values(people).filter((person) => person.status !== 'DEAD').filter((person) => kind === 'CONSORT' ? person.kind === 'CONSORT' : kind === 'MINISTER' ? person.kind === 'MINISTER' : person.kind === 'PRINCE' || person.kind === 'PRINCESS'), [kind, people]);
  const visiblePeople = useMemo(() => allPeople.filter((person) => matchesTab(person, kind, tab)).filter((person) => !keyword.trim() || `${person.name}${person.rank ?? ''}${person.office ?? ''}${person.residence ?? ''}`.includes(keyword.trim())).sort((a, b) => sortWeight(a, kind) - sortWeight(b, kind) || a.age - b.age), [allPeople, keyword, kind, tab]);
  const selected = selectedId ? people[selectedId] : undefined;
  const secondSummary = kind === 'CONSORT' ? allPeople.filter((person) => person.status === 'PREGNANT').length : kind === 'MINISTER' ? allPeople.filter((person) => (person.stats['忠诚'] ?? 0) >= 70).length : allPeople.filter((person) => person.age >= 15).length;
  const thirdSummary = kind === 'CONSORT' ? allPeople.filter((person) => person.children.length > 0).length : kind === 'MINISTER' ? allPeople.filter((person) => (person.stats['智慧'] ?? 0) >= 75).length : allPeople.filter((person) => person.age < 15).length;

  return <div className="roster-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <section className="roster-panel">
      <header className="roster-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button aria-label={`关闭${title}`} onClick={onClose}><X /></button></header>
      <div className="roster-summary"><span><b>{allPeople.length}</b>{kind === 'CONSORT' ? '妃嫔' : kind === 'MINISTER' ? '在册' : '皇嗣'}</span><span><b>{secondSummary}</b>{kind === 'CONSORT' ? '有孕' : kind === 'MINISTER' ? '忠良' : '成年'}</span><span><b>{thirdSummary}</b>{kind === 'CONSORT' ? '育有皇嗣' : kind === 'MINISTER' ? '才识卓著' : '幼年'}</span></div>
      <div className="roster-tools"><div className="roster-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div><label className="roster-search"><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={kind === 'CONSORT' ? '姓名 / 宫殿' : kind === 'MINISTER' ? '姓名 / 官职' : '姓名 / 身份'} /></label></div>
      <div className="roster-cards">{visiblePeople.map((person, index) => <button key={person.id} className={`roster-card ${selectedId === person.id ? 'selected' : ''}`} style={{ animationDelay: `${index * 45}ms` }} onClick={() => setSelectedId(person.id)}>
        <span className={`roster-portrait ${portraitClass(person)}`} style={{ backgroundImage: `url(${portraits})` }} />
        <span className="roster-ribbon">{person.honorific ?? ''}{person.rank ?? person.title}</span>
        <span className="roster-name">{person.name}<small>{person.residence ?? person.office ?? person.title}</small></span>
        <span className="roster-statline">{cardStats(person, kind).map(([label, value]) => <span key={label}><b>{value}</b>{label === '年龄' ? '岁' : label}</span>)}</span>
        <span className="roster-badges">{person.traits.slice(0, 2).map((trait) => <i key={trait}>{trait}</i>)}<i>{personLifeStatusLabel(person.status)}</i></span>
      </button>)}{visiblePeople.length === 0 && <p className="roster-empty">名册中暂无符合条件的人物</p>}</div>
    </section>
    {selected && <section className="roster-sheet"><span className="roster-handle" /><button className="roster-sheet-close" aria-label="关闭人物摘要" onClick={() => setSelectedId(null)}><X /></button><h3>{selected.name} · {selected.rank ?? selected.title}</h3><p>{selected.residence ?? selected.office ?? '暂无固定居所'} · {selected.age}岁 · {selected.traits.join('、') || '性情待察'}</p><div className="roster-sheet-stats">{cardStats(selected, kind).map(([label, value]) => <span key={label}><b>{value}</b>{label}</span>)}</div><button className="roster-detail-button" onClick={() => onOpenDetail(selected.id)}>人物详情</button></section>}
  </div>;
}
