import { posthumousTitleOptions } from '../game/posthumousTitles';
import { PosthumousTitleDialog } from './PosthumousTitleDialog';
import { isPersonAlive } from '../game/person';
import { getHealthStatus } from '../game/health';
import { useOptionalGameState } from '../game/GameStateContext';
import { palaceJealousy } from '../game/palaceEffects';
import { isGrounded, gameDay } from '../game/palacePunishments';
import { useEffect, useMemo, useState } from 'react';
import palaceBackground from '../assets/inner-palace-west-hall.png';
import portraits from '../assets/character-portraits.png';
import type { HistoryEntry, PersonRecord, RelationshipRecord } from '../game/gameState';
import type { PersonAction } from '../game/personActions';
import { personLifeStatusLabel } from '../game/gameState';
import { royalBirthIdentity, royalIdentityTitle } from '../game/royalNames';
import { getMarriageStatus, getResidenceType } from '../game/royalRoster';
import './ApprovedPersonDetail.css';

type PersonView = {
  id: string;
  name: string;
  title: string;
  portrait: string;
  portraitUrl?: string;
};

type Tab = 'attribute' | 'history' | 'relation' | 'gift';

export function ApprovedPersonDetail({
  person,
  title,
  record,
  history,
  relationships,
  people,
  actionItems,
  onAction,
  onClose,
}: {
  person: PersonView;
  title: string;
  record: PersonRecord;
  history: HistoryEntry[];
  relationships: RelationshipRecord[];
  people: Record<string, PersonRecord>;
  actionItems: PersonAction[];
  onAction: (actionId: string) => void;
  onClose: () => void;
}) {
  const store = useOptionalGameState();
  const [honoring, setHonoring] = useState(false);
  const alive = isPersonAlive(record);
  const visibleActions = alive ? actionItems : [];
  const afterlifeTitle = record.posthumousRank ?? record.posthumousTitle;
  const grounded = record.status === 'CONFINED' || (store ? isGrounded(record, store.gameState.clock) : false);
  const [tab, setTab] = useState<Tab>('attribute');
  const [toast, setToast] = useState('');
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'person-detail-close') onClose();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onClose]);
  const statNamesByKind: Record<string, string[]> = {
    PRINCE: ['健康', '天资', '文学', '武力', '野心', '宠爱', '勤奋'],
    PRINCESS: ['健康', '天资', '礼仪', '才学', '野心', '宠爱', '勤奋'],
    CONSORT: ['宠爱', '心情', '嫉妒', '怨恨', '威望', '畏惧', '野心', '才情', '容貌', '健康', '礼仪'],
    MINISTER: ['忠诚', '野心', '智慧', '派系影响', '已知财富', '武略'],
    DOWAGER: ['健康', '威望', '谋略', '野心', '才情', '礼仪'],
    NOBLE: ['健康', '威望', '谋略', '野心', '才情', '礼仪'],
    EUNUCH: ['忠诚', '野心', '智慧', '健康'],
    COURT_LADY: ['忠诚', '野心', '才情', '健康'],
    EMPEROR: ['健康', '政治', '文', '魅力', '武', '民生', '快乐'],
  };
  const stats = (() => {
    const ordered = statNamesByKind[record.kind];
    if (ordered) return ordered.map((name) => [name, name === '健康' && !isPersonAlive(record) ? 0 : name === '嫉妒' ? palaceJealousy({ relationships }, record.id) : record.stats[name] ?? 0] as [string, number]);
    const entries = Object.entries(record.stats) as [string, number][];
    const fallback: [string, number][] = [['健康', record.stats['健康'] ?? 0]];
    return (entries.length ? entries : fallback).slice(0, 4);
  })();
  const relatedHistory = history.filter((entry) => entry.personIds.includes(record.id)).slice(-12).reverse();
  const related = relationships.filter((item) => item.personAId === record.id || item.personBId === record.id).map((item) => {
    const fromA = item.personAId === record.id;
    const other = people[fromA ? item.personBId : item.personAId];
    return { ...item, other, label: fromA ? item.labelA : item.labelB };
  });
  const roleLabel = record.kind === 'MINISTER' ? '官职' : record.kind === 'CONSORT' ? '位份' : '身份';
  const metricLabel = record.kind === 'MINISTER' ? '忠诚' : record.kind === 'CONSORT' ? '宠爱' : '学业';
  const metricValue = record.stats[metricLabel] ?? record.stats.政治 ?? record.stats.文才 ?? 0;
  const identityTitle = record.kind === 'PRINCE' || record.kind === 'PRINCESS' ? royalBirthIdentity(record) : royalIdentityTitle(record);
  const mother = (record.motherId ? people[record.motherId] : undefined) ?? record.parents.map((id) => people[id]).find((item) => item?.kind === 'CONSORT');
  const adoptiveMother = record.adoptiveMotherId ? people[record.adoptiveMotherId] : undefined;
  const isRoyal = record.kind === 'PRINCE' || record.kind === 'PRINCESS';
  const rosterState = store?.gameState ?? ({ people, relationships, crownPrinceId: null } as never);
  const consortLabel = (person: PersonRecord) => `${!isPersonAlive(person) ? (person.posthumousRank ?? person.posthumousTitle ?? person.rank ?? person.title) : (person.rank ?? person.title)}·${person.name}${isPersonAlive(person) ? '' : '（已故）'}`;
  const portraitStyle = useMemo(() => person.portraitUrl
    ? { backgroundImage: `url(${person.portraitUrl})`, backgroundSize: 'contain', backgroundPosition: 'center top' }
    : {
        backgroundImage: `url(${portraits})`,
        backgroundSize: '500% 100%',
        backgroundPosition: person.portrait === 'empress' ? '25% 50%' : person.portrait === 'consort' ? '50% 50%' : person.portrait === 'minister' ? '75% 50%' : person.portrait === 'prince' ? '100% 50%' : '0% 50%',
      }, [person]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1200);
  };

  return <div className="approved-person-overlay" title="人物详情">
    <main className={`approved-person-page${alive ? "" : " deceased"}`} style={{ '--approved-palace': `url(${palaceBackground})` } as React.CSSProperties}>
      <header className="approved-header">
        <small>紫宸纪事 · 后宫人物</small>
        <h1>{record.residence?.replace(/(东|西)?侧殿$/, '') || '人物档案'}</h1>
        <p>{title}</p>
        <button type="button" className="approved-close" onClick={onClose} aria-label="关闭">×</button>
      </header>

      <section className="approved-hero">
        <div className="approved-role" style={portraitStyle} />
        <div className="approved-name"><b>{person.name}</b><span>{afterlifeTitle ? `追封${afterlifeTitle}` : identityTitle}</span></div>
      </section>

      <nav className="approved-actions" aria-label="人物操作">
        <h2>人物操作</h2>
        <div className="approved-action-grid">
          {!alive && store && ['CONSORT', 'PRINCE', 'PRINCESS', 'NOBLE'].includes(record.kind) && <button type="button" disabled={!posthumousTitleOptions(record).length} title={posthumousTitleOptions(record).length ? undefined : '暂无更高的可追封位份或爵位'} onClick={() => setHonoring(true)}>追封</button>}
          {visibleActions.map((action) => {
            const important = ['favor', 'accountability', 'custody-execute'].includes(action.id);
            const disabled = action.disabled || !isPersonAlive(record);
            return <button type="button" key={action.id} className={`${important ? 'important' : ''}${disabled ? ' disabled' : ''}`} aria-label={action.label} title={action.reason} disabled={disabled} onClick={() => onAction(action.id)}>
              <span className="approved-action-shine" />
              <span className="approved-action-label">{action.label}</span>
            </button>;
          })}
        </div>
        {visibleActions.filter((action) => action.disabled && action.reason).map((action) => <p key={action.id} role="status">{action.reason}</p>)}
      </nav>

      <article className="approved-panel">
        {tab === 'attribute' && <>
          <h2>人物属性 <em>卷一</em></h2>
          <h3>基础信息</h3>
          <div className="approved-basic-grid">
            <Info label="年龄" value={`${record.age}岁`} />
            <Info label={alive ? roleLabel : "生前身份"} value={`${identityTitle} · ${record.residence ?? record.office ?? '宫中'}`} compact />
            {(record.kind === 'PRINCE' || record.kind === 'PRINCESS') && record.royalTitle && <Info label="爵位" value={record.royalTitle} />}
            <Info label={alive ? "所在" : "生前居所"} value={record.residence ?? record.office ?? '宫中'} compact />
            <Info label={metricLabel} value={String(metricValue)} />
            <Info label="状态" value={(isPersonAlive(record) ? personLifeStatusLabel(record.status) : '已故') + (grounded && record.status !== 'CONFINED' ? ' · 禁足中' : '')} />
            {isRoyal && <><Info label="婚姻" value={getMarriageStatus(record, rosterState) === 'MARRIED' ? '已婚' : '未婚'} /><Info label="当前" value={getResidenceType(record, rosterState) === 'OUTSIDE_PALACE' ? (record.isSummoned ? '奉召入宫' : '未奉召') : '宫中'} /></>}
            {isPersonAlive(record) ? <Info label="健康状态" value={getHealthStatus(record)} /> : <><Info label="死亡时间" value={record.deathDate ? `${record.deathDate.year}年${record.deathDate.month}月${record.deathDate.day}日` : '不详'} /><Info label="死因" value={record.deathReason ?? '不详'} /></>}
            {afterlifeTitle && <Info label="当前追封" value={afterlifeTitle} />}
            <Info label="子女" value={`${record.children.length}人`} />
            <Info label="性情" value={record.traits[0] ?? '平静'} />
            {record.kind === 'CONSORT' ? <>{<Info label="怀孕" value={record.status === 'PREGNANT' ? '是' : '否'} />}{record.infertile && <Info label="生育状态" value="不孕" />}{(record.miscarriageCount ?? 0) > 0 && <Info label="流产次数" value={String(record.miscarriageCount)} />}</> : record.kind === 'PRINCE' || record.kind === 'PRINCESS' ? <><Info label="生母" value={mother ? consortLabel(mother) : '未载'} />{adoptiveMother && <Info label="养母" value={consortLabel(adoptiveMother)} />}</> : <Info label="品秩" value={record.rank ?? '未定'} />}
          </div>
          {grounded && record.groundingUntilDay !== undefined && store && <p>禁足剩余 {Math.max(0, record.groundingUntilDay - gameDay(store.gameState.clock))} 日</p>}
          {!alive && <p>子嗣：{record.children.map(id => people[id]?.name ?? id).join("、") || "无"}</p>}
          <div className="approved-rule" />
          <div className="approved-stats">{stats.map(([name, value]) => <div className="approved-stat" key={name}><label>{name}<span>{value}</span></label><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div>)}</div>
        </>}
        {tab === 'history' && <><h2>人物履历</h2><div className="approved-list">{relatedHistory.length ? relatedHistory.map((entry) => <section key={entry.id}><time>永和{entry.date.year}年{entry.date.month}月{entry.date.day}日</time><p>{entry.summary}</p></section>) : <p>尚无人物履历。</p>}</div></>}
        {tab === 'relation' && <><h2>人物关系</h2><div className="approved-list">{related.length ? related.map((item) => <section key={`${item.personAId}-${item.personBId}`}><b>{item.other?.name ?? '未知人物'}</b><p>{item.other?.rank ?? item.other?.title} · {item.label} · 亲近 {item.affinity} · 信任 {item.trust}</p></section>) : <p>尚未建立公开关系。</p>}</div></>}
        {tab === 'gift' && <><h2>赏赐记录</h2><div className="approved-list">{relatedHistory.filter((entry) => entry.type === 'REWARD' || entry.type === 'GIFT').map((entry) => <section key={entry.id}><time>永和{entry.date.year}年{entry.date.month}月{entry.date.day}日</time><p>{entry.summary}</p></section>)}</div></>}
      </article>

      <nav className="approved-tabs">{([['attribute', '属性'], ['history', '履历'], ['relation', '关系'], ['gift', '赏赐记录']] as [Tab, string][]).map(([key, label]) => <button type="button" className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <div className={`approved-toast ${toast ? 'show' : ''}`}>{toast}</div>
    </main>
    {honoring && <PosthumousTitleDialog personId={record.id} onClose={() => setHonoring(false)} />}
  </div>;
}

function Info({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className={`approved-info ${compact ? 'compact' : ''}`}><small>{label}</small><b>{value}</b></div>;
}

