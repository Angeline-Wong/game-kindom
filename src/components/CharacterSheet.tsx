import { useOptionalGameState } from '../game/GameStateContext';
import { personLifeStatusLabel } from '../game/gameState';
import './EmperorProfile.css';
import { Check, ScrollText, UserRound, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import type { Character } from '../game/characters';
import type { HistoryEntry, PersonRecord, RelationshipRecord } from '../game/gameState';
import { emperorPortraitUrls, personPortraitUrl } from '../game/personPortraits';
import { RadarChart } from './RadarChart';

type SheetTab = 'overview' | 'relations' | 'history';
type RelationCategory = '后宫' | '宗亲' | '朝臣' | '内廷';
type HistoryCategory = '全部' | '前朝' | '后宫' | '子嗣' | '个人';
const relationCategories: RelationCategory[] = ['后宫', '宗亲', '朝臣', '内廷'];
const historyCategories: HistoryCategory[] = ['全部', '前朝', '后宫', '子嗣', '个人'];
const frontHistoryTypes = /COURT|OFFICIAL|CIVIL|EXAM|MINISTER|PAYROLL|RESIGNATION|CAPITAL/;
const haremHistoryTypes = /CONSORT|PALACE_SELECTION|VISIT|PREGNANCY|FAVOR|HONORIFIC/;
const heirHistoryTypes = /BIRTH|CHILD|HEIR|EDUCATION|ENCOURAGE|DIALOGUE|ADOPTION|CROWN_PRINCE|ROYAL_MARRIAGE|MARRIAGE/;
function historyCategory(entry: HistoryEntry, people?: Record<string, PersonRecord>): Exclude<HistoryCategory, '全部'> {
  if (heirHistoryTypes.test(entry.type) || entry.personIds.some((id) => people?.[id]?.kind === 'PRINCE' || people?.[id]?.kind === 'PRINCESS')) return '子嗣';
  if (haremHistoryTypes.test(entry.type) || entry.personIds.some((id) => people?.[id]?.kind === 'CONSORT' || people?.[id]?.kind === 'DOWAGER' || people?.[id]?.kind === 'NOBLE')) return '后宫';
  if (frontHistoryTypes.test(entry.type) || entry.personIds.some((id) => people?.[id]?.kind === 'MINISTER')) return '前朝';
  return '个人';
}
function relationCategory(kind?: PersonRecord['kind']): RelationCategory {
  if (kind === 'CONSORT' || kind === 'DOWAGER' || kind === 'NOBLE') return '后宫';
  if (kind === 'PRINCE' || kind === 'PRINCESS') return '宗亲';
  if (kind === 'MINISTER') return '朝臣';
  return '内廷';
}

export function CharacterSheet({ character, record, people, relationships = [], history = [], onClose, onUpdate }: { character: Character; record?: PersonRecord; people?: Record<string, PersonRecord>; relationships?: RelationshipRecord[]; history?: HistoryEntry[]; onClose: () => void; onUpdate?: (character: Character & Pick<PersonRecord, 'reignName' | 'clanName'>) => void }) {
  const store = useOptionalGameState();
  const [editing, setEditing] = useState(false);
  const [reignName, setReignName] = useState(record?.reignName ?? '永和');
  const [clanName, setClanName] = useState(record?.clanName ?? `${character.name.slice(0, 1)}氏`);
  const [name, setName] = useState(character.name);
  const [title, setTitle] = useState(character.title);
  const [avatar, setAvatar] = useState(character.avatar);
  const [tab, setTab] = useState<SheetTab>('overview');
  const [relationTab, setRelationTab] = useState<RelationCategory>('后宫');
  const [historyTab, setHistoryTab] = useState<HistoryCategory>('全部');
  const isEmperor = character.kind === 'emperor';
  const portraitUrl = isEmperor ? emperorPortraitUrls[0] : record ? personPortraitUrl(record) : undefined;
  const relationRows = record && people ? relationships.filter((relation) => relation.personAId === record.id || relation.personBId === record.id).map((relation) => {
    const fromA = relation.personAId === record.id;
    const other = people[fromA ? relation.personBId : relation.personAId];
    return { id: relation.id, kind: other?.kind, name: other?.name ?? '未知人物', title: other?.rank ?? other?.office ?? other?.title ?? '', label: fromA ? relation.labelA : relation.labelB, affinity: relation.affinity, trust: relation.trust };
  }) : [];
  const visibleRelations = relationRows.filter((row) => relationCategory(row.kind) === relationTab);
  const allHistoryRows = record ? history.filter((entry) => entry.personIds.includes(record.id)).reverse() : [];
  const historyRows = allHistoryRows.filter((entry) => historyTab === '全部' || historyCategory(entry, people) === historyTab).slice(0, 20);
  const save = () => { onUpdate?.({ ...character, name, title, avatar }); onClose(); };

  if (isEmperor) {
    const year = store?.gameState.clock.year;
    const percent = (value: number) => Math.max(0, Math.min(100, value));
    const saveEmperor = () => {
      if (!name.trim() || !reignName.trim() || !clanName.trim()) return;
      onUpdate?.({ ...character, name: name.trim(), reignName: reignName.trim(), clanName: clanName.trim() });
      onClose();
    };
    return <div className="sheet-backdrop emperor-profile" onClick={onClose}>
      <div className="page" onClick={(event) => event.stopPropagation()}>
        <main className="frame" role="dialog" aria-modal="true" aria-label="帝王详情">
          <header className="top"><div className="title"><h1>帝王详情</h1><span className="caption">人物档案</span></div><button className="close" aria-label="关闭" onClick={onClose}>×</button></header>
          <section className="hero"><div className="portrait-area"><img className="portrait" src={portraitUrl} alt="皇帝立绘" /></div><div className="identity"><div className="name">{name}</div><div className="meta"><strong>{character.title}</strong> · {reignName}{year ? year + '年' : '朝'}<br />{record?.age ?? character.age}岁 · {record?.status === 'NORMAL' || !record ? '安康' : personLifeStatusLabel(record.status)}</div><div className="desc">{character.note}</div></div></section>
          <nav className="tabs" aria-label="档案分类">{([['overview', '御览'], ['relations', '关系 ' + relationRows.length], ['history', '履历 ' + allHistoryRows.length]] as [SheetTab, string][]).map(([key, label]) => <button className={'tab ' + (tab === key ? 'active' : '')} key={key} onClick={() => setTab(key)}>{label}</button>)}</nav>
          <section className="content">
            {tab === 'overview' && <>
              <section className="section"><div className="section-head"><div className="section-title">身份信息</div><div className="section-note">点击底部按钮可编辑</div></div><div className="info-grid"><label className="info"><span>名讳</span><input aria-label="名讳" value={name} disabled={!editing} onChange={(event) => setName(event.target.value)} /></label><label className="info"><span>年号</span><input aria-label="年号" value={reignName} disabled={!editing} onChange={(event) => setReignName(event.target.value)} /></label><label className="info"><span>宗室</span><input aria-label="宗室" value={clanName} disabled={!editing} onChange={(event) => setClanName(event.target.value)} /></label></div></section>
              <section className="section"><div className="section-head"><div className="section-title">帝王六维</div><div className="section-note">满值 100</div></div><div className="metrics">{character.radar.map((axis) => { const value = record?.stats[axis.label] ?? axis.value ?? 0; return <div className="metric" key={axis.label}><span className="label">{axis.label === '文' ? '文治' : axis.label === '武' ? '武略' : axis.label}</span><b>{value}</b><div className="track"><div className="fill" style={{width: percent(value) + '%'}} /></div></div>; })}</div></section>
              <section className="section"><div className="section-head"><div className="section-title">统治概览</div></div><div className="summary"><div className="summary-item"><span>朝廷稳定</span><b>{record?.stats['朝廷稳定'] ?? '暂无'}</b></div><div className="summary-item"><span>民望</span><b>{record?.stats['民望'] ?? '暂无'}</b></div><div className="summary-item"><span>国库</span><b>{store ? store.gameState.finances.nationalTreasury.toLocaleString('zh-CN') : '暂无'}</b></div></div></section>
            </>}
            {tab === 'relations' && <section className="section"><div className="section-head"><div className="section-title">人物关系</div><div className="section-note">分类查阅</div></div><div className="category-bar">{relationCategories.map((category) => <button key={category} className={'category-btn ' + (relationTab === category ? 'active' : '')} onClick={() => setRelationTab(category)}><b>{category}</b><small>{relationRows.filter((row) => relationCategory(row.kind) === category).length}</small></button>)}</div><div className="relationship-grid">{visibleRelations.map((row) => <article className="person-card" key={row.id}><div className="person-top"><div className="person-name">{row.name}</div><span className="role-tag">{row.title}</span></div><div className="person-stats">{[['亲近', row.affinity], ['信任', row.trust]].map(([label, value]) => <div className="person-stat" key={label}><div className="person-stat-line"><span>{label}</span><b>{value}</b></div><div className="mini-track"><div className="mini-fill" style={{width: percent(Number(value)) + '%'}} /></div></div>)}</div></article>)}</div>{!visibleRelations.length && <p className="empty-state show">暂无{relationTab}关系记录</p>}</section>}
            {tab === 'history' && <section className="section"><div className="section-head"><div className="section-title">近期履历</div><div className="section-note">由近及远 · 最多显示20条</div></div><div className="category-bar history-cats">{historyCategories.map((category) => <button key={category} className={'category-btn ' + (historyTab === category ? 'active' : '')} onClick={() => setHistoryTab(category)}><b>{category}</b><small>{allHistoryRows.filter((entry) => category === '全部' || historyCategory(entry, people) === category).length}</small></button>)}</div><div className="timeline-head"><span>时间线</span><span>{historyTab}记录</span></div><div className="history-list">{historyRows.map((entry) => <article className="history-event" key={entry.id}><div className="history-meta"><time className="history-date">{reignName}{entry.date.year}年 · {entry.date.month}月{entry.date.day}日</time><span className="history-type">{historyCategory(entry, people)}</span></div><div className="history-text">{entry.summary}</div></article>)}</div>{!historyRows.length && <p className="empty-state show">暂无履历记录</p>}</section>}
          </section>
          <footer className="footer"><button className="btn secondary" onClick={() => { setTab('overview'); setEditing(!editing); }}>{editing ? '完成编辑' : '编辑信息'}</button><button className="btn primary" disabled={!name.trim() || !reignName.trim() || !clanName.trim()} onClick={saveEmperor}>保存帝王信息</button></footer>
        </main>
      </div>
    </div>;
  }

  return <div className="sheet-backdrop imperial-profile-backdrop" onClick={onClose}>
    <section className="sheet imperial-profile" onClick={(event) => event.stopPropagation()} aria-label="人物详情">
      <header className="imperial-profile-head">
        
        <div className="imperial-heading"><small>紫宸纪事 · 帝王玉牒</small><h2>{isEmperor ? '御前档案' : '人物档案'}</h2><p>{title} · {character.age}岁</p></div>
        <button className="imperial-close" aria-label="关闭" onClick={onClose}><X /></button>
      </header>

      <div className="imperial-hero">
        <div className={`imperial-portrait ${portraitUrl ? 'has-custom-portrait' : ''}`} style={portraitUrl ? { backgroundImage: `url(${portraitUrl})` } : undefined}>{portraitUrl ? null : avatar}</div>
        <div className="imperial-identity">
          <span className="imperial-kicker">{isEmperor ? '当今天子' : character.title}</span>
          <strong>{name}</strong>
          <p>{character.note}</p>
          <div className="imperial-chips"><i>{character.age}岁</i><i>{record?.status === 'NORMAL' || !record ? '安康' : record.status}</i><i>{isEmperor ? '永和朝' : record?.residence ?? '宫中'}</i></div>
        </div>
      </div>

      <nav className="imperial-tabs" aria-label="档案分类">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><UserRound />御览</button>
        <button className={tab === 'relations' ? 'active' : ''} onClick={() => setTab('relations')}><UsersRound />关系<em>{relationRows.length}</em></button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><ScrollText />履历<em>{allHistoryRows.length}</em></button>
      </nav>

      <div className="imperial-profile-body">
        {tab === 'overview' && <>
          {isEmperor && <section className="imperial-card identity-card"><div className="imperial-section-title"><span>御讳与年号</span><small>点击文字即可修订</small></div><div className="identity-editor"><label>名讳<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>年号<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>印记<input value={avatar} maxLength={1} onChange={(event) => setAvatar(event.target.value)} /></label></div></section>}
          <section className="imperial-card ability-card"><div className="imperial-section-title"><span>帝王六维</span><small>满值一百</small></div><div className="imperial-ability-layout"><RadarChart axes={character.radar}/><div className="imperial-stat-list">{character.radar.map((axis) => <div key={axis.label}><span>{axis.label}</span><b>{axis.value ?? '未明'}</b><i><u style={{ width: `${axis.value ?? 0}%` }} /></i></div>)}</div></div></section>
        </>}

        {tab === 'relations' && <section className="imperial-card imperial-record-card relation-directory"><div className="imperial-section-title"><span>人物关系</span><small>分册查阅</small></div><div className="relation-categories">{relationCategories.map((category) => { const count = relationRows.filter((row) => relationCategory(row.kind) === category).length; return <button key={category} className={relationTab === category ? 'active' : ''} onClick={() => setRelationTab(category)}><span>{category}</span><b>{count}</b></button>; })}</div>{visibleRelations.length ? <div className="relation-card-grid">{visibleRelations.map((row) => <article className="relation-person-card" key={row.id}><div className="relation-card-head"><div><b>{row.name}</b><span>{row.title}</span></div></div><dl><div><dt>亲近</dt><dd>{row.affinity}</dd><i><u style={{ width: `${row.affinity}%` }} /></i></div><div><dt>信任</dt><dd>{row.trust}</dd><i><u style={{ width: `${row.trust}%` }} /></i></div></dl></article>)}</div> : <p className="imperial-empty">{relationTab}分册中尚无记载。</p>}</section>}

        {tab === 'history' && <section className="imperial-card imperial-record-card history-directory"><div className="imperial-section-title"><span>近年履历</span><small>由近及远 · 最多显示20条</small></div><div className="history-filters">{historyCategories.map((category) => { const count = category === '全部' ? allHistoryRows.length : allHistoryRows.filter((entry) => historyCategory(entry, people) === category).length; return <button key={category} className={historyTab === category ? 'active' : ''} onClick={() => setHistoryTab(category)}><span>{category}</span><b>{count}</b></button>; })}</div>{historyRows.length ? <div className="imperial-timeline">{historyRows.map((entry) => <article key={entry.id}><div className="history-entry-meta"><time>永和{entry.date.year}年 · {entry.date.month}月{entry.date.day}日</time><em>{historyCategory(entry, people)}</em></div><p>{entry.summary}</p></article>)}</div> : <p className="imperial-empty">暂无{historyTab === '全部' ? '' : historyTab}履历。</p>}</section>}
      </div>

      {isEmperor && <footer className="imperial-profile-foot"><button onClick={onClose}>暂不修改</button><button className="identity-save" onClick={save}><Check />保存帝王信息</button></footer>}
    </section>
  </div>;
}






