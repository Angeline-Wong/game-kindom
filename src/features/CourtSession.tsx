import { useState, type ReactNode } from 'react';
import { Gavel, ScrollText, Users, X } from 'lucide-react';
import type { CourtAgendaItem, CourtDepartment, GameState, PersonRecord } from '../game/gameState';
import { courtDecisionOptions, endDailyCourt, handleCourtDecision, resumeDailyCourt, startDailyCourt, selectCourtDepartment, type CourtDecisionOption } from '../game/courtSession';

interface CourtSessionProps {
  state: GameState;
  onChange: (state: GameState | ((current: GameState) => GameState)) => void;
  onBack: () => void;
}

type CourtPhase = 'overview' | 'announce' | 'memorial' | 'result';
interface CourtResolutionView {
  issue: CourtAgendaItem;
  reporterName: string;
  option: CourtDecisionOption;
}

const departments: CourtDepartment[] = ['吏部', '户部', '礼部', '兵部', '刑部', '工部'];
const statusLabels = { PRESENT: '到班', LATE: '迟到', ABSENT: '缺席', IMPROPER: '失仪' } as const;
const effectLabels: Record<string, string> = { 文: '文治', 武: '武备', 政治: '政务', 民生: '民生', 魅力: '魅力', 健康: '健康', 快乐: '帝王心情', 国库: '国库', 私库: '国库', 黄金: '黄金', 元宝: '元宝', 智慧: '智慧', 武略: '武略', 忠诚: '忠诚', 野心: '野心', 派系影响: '派系影响', 朝堂畏惧: '朝堂畏惧', 直言意愿: '直言意愿' };

function reporterFor(state: GameState, issue?: CourtAgendaItem) {
  return issue ? state.people[issue.reporterId] : undefined;
}

function officialLabel(person?: PersonRecord) {
  if (!person) return '值房官员';
  return `${person.office ?? person.title ?? '官员'}${person.name}`;
}

function effectText(effects: Record<string, number>) {
  return Object.entries(effects).map(([key, value]) => `${effectLabels[key] ?? key}${value > 0 ? '+' : ''}${value}`).join(' · ');
}

function pendingForDepartment(session: NonNullable<GameState['courtSession']>, department: CourtDepartment) {
  return session.agenda.filter((issue) => issue.department === department && (issue.status === 'PENDING' || issue.status === 'DEBATING'));
}

function CourtFrame({ phase, session, onClose, onDocket, onRetire, children }: {
  phase: CourtPhase;
  session?: NonNullable<GameState['courtSession']>;
  onClose: () => void;
  onDocket?: () => void;
  onRetire?: () => void;
  children: ReactNode;
}) {
  const title = phase === 'overview' ? '朝会议事台' : phase === 'announce' ? '有本启奏' : phase === 'memorial' ? '奏折御览' : '裁决已下';
  const resolved = session?.agenda.filter((issue) => issue.status === 'RESOLVED').length ?? 0;
  const pending = session?.agenda.filter((issue) => issue.status === 'PENDING' || issue.status === 'DEBATING').length ?? 0;
  return <section className="court-page court-rework-page court-flow-page">
    <header className="court-rework-header court-flow-header"><div><small>乾清门 · 常朝</small><h2>{title}</h2></div><button className="court-scene-back" aria-label="关闭朝会" onClick={onClose}><X /></button></header>
    {session && <nav className="court-flow-meter"><span className={resolved ? 'done' : ''}><i>{resolved ? '✓' : ''}</i><small>今日已议</small><b>{resolved}本</b></span><span className={pending ? 'active' : 'done'}><i /><small>尚待议决</small><b>{pending}本</b></span><span><i /><small>朝会用时</small><b>{session.elapsedMinutes}分</b></span></nav>}
    <div className="court-flow-content">{children}</div>
    {session && onDocket && onRetire && <footer className="court-flow-footer"><button onClick={onDocket}>六部议事台</button><button className="primary" onClick={onRetire}>今日退朝</button></footer>}
  </section>;
}

function CourtOverview({ state, session, onSelect }: { state: GameState; session: NonNullable<GameState['courtSession']>; onSelect: (department: CourtDepartment) => void }) {
  const present = session.attendance.filter((item) => item.status === 'PRESENT').length;
  const pending = session.agenda.filter((issue) => issue.status === 'PENDING' || issue.status === 'DEBATING').length;
  return <article className="court-flow-paper">
    <div className="court-flow-paper-title"><span>朝</span><h3>六部候旨</h3><p>奏折彼此独立，可自由择部议决</p></div>
    <div className="court-flow-summary"><span>待议奏折<b>{pending}</b></span><span>到班人数<b>{present}/{session.attendance.length}</b></span><span>本轮用时<b>{session.elapsedMinutes}分</b></span></div>
    <div className="court-department-grid">{departments.map((department) => {
      const queue = pendingForDepartment(session, department);
      const first = queue[0];
      const official = reporterFor(state, first);
      const attendance = official ? session.attendance.find((item) => item.personId === official.id) : undefined;
      return <button key={department} className={`court-department-node ${queue.length ? 'has-pending' : 'empty'} ${attendance && attendance.status !== 'PRESENT' ? 'not-present' : ''}`} disabled={!queue.length} onClick={() => onSelect(department)}><span className="court-department-emblem">{department[0]}</span><span className="court-department-main"><b>{department}</b><small>{first?.title ?? '今日无本'}</small></span>{queue.length > 0 && <i className="court-department-badge">{queue.length}</i>}</button>;
    })}</div>
    <section className="court-attendance-strip"><Users /><span>朝班点卯</span><div className="court-attendance-people">{session.attendance.slice(0, 8).map((item) => { const person = state.people[item.personId]; return <em key={item.personId} className={item.status.toLowerCase()} title={`${officialLabel(person)} · ${statusLabels[item.status]}`}>{person?.name.slice(0, 1) ?? '?'}</em>; })}</div></section>
  </article>;
}

function CourtAnnouncement({ state, issue, onContinue, onBack }: { state: GameState; issue: CourtAgendaItem; onContinue: () => void; onBack: () => void }) {
  const reporter = reporterFor(state, issue);
  return <article className="court-flow-paper"><div className="court-flow-paper-title"><span>奏</span><h3>{issue.department}有本启奏</h3><p>{issue.title} · {issue.category === 'MAJOR' ? '重大议题' : '常规议题'}</p></div><div className="court-flow-memorial"><h3>臣{officialLabel(reporter)}有本</h3><p>{issue.summary}</p><small>情报可信度：{issue.confidence}</small></div><button className="court-primary-button court-flow-wide" onClick={onContinue}>展开奏折 <b>›</b></button><button className="court-secondary-button court-flow-wide" onClick={onBack}>暂缓此议</button></article>;
}

function CourtMemorial({ state, issue, onChoose }: { state: GameState; issue: CourtAgendaItem; onChoose: (option: CourtDecisionOption) => void }) {
  const reporter = reporterFor(state, issue);
  const options = courtDecisionOptions(issue);
  const [selected, setSelected] = useState<CourtDecisionOption | null>(options[0] ?? null);
  return <article className="court-flow-paper"><div className="court-flow-paper-title"><span>览</span><h3>御前奏折</h3><p>{issue.department} · {issue.title}</p></div><div className="court-flow-memorial"><h3>{issue.title}</h3><p>{issue.summary}</p><small>{officialLabel(reporter)} · 情报可信度：{issue.confidence}</small></div><div className="court-decision-list court-flow-choices">{options.map((option) => <button className={selected?.id === option.id ? 'selected' : ''} key={option.id} onClick={() => setSelected(option)}>{option.label}</button>)}</div><button className="court-primary-button court-flow-wide" disabled={!selected} onClick={() => selected && onChoose(selected)}>朱批定夺</button></article>;
}

function CourtResult({ resolution }: { resolution: CourtResolutionView }) {
  return <article className="court-flow-paper court-flow-result"><div className="court-flow-paper-title"><span>旨</span><h3>朱批已下</h3><p>{resolution.issue.department} · {resolution.reporterName}</p></div><h4>{resolution.option.label}</h4><p>{resolution.option.result}</p><div className="court-effect-row">{Object.entries(resolution.option.effects).map(([key, value]) => <span key={key} className={value < 0 ? 'negative' : 'positive'}>{effectLabels[key] ?? key} {value > 0 ? '+' : ''}{value}</span>)}</div><small>本次奏折已记入朝会与人物履历。{effectText(resolution.option.effects)}</small></article>;
}

function CourtSummary({ session, onBack, onResume }: { session: NonNullable<GameState['courtSession']>; onBack: () => void; onResume: () => void }) {
  const resolved = session.agenda.filter((item) => item.status === 'RESOLVED').length;
  const deferred = session.agenda.filter((item) => item.status === 'DEFERRED').length;
  return <article className="court-flow-paper court-flow-result"><div className="court-result-seal"><ScrollText /></div><h3>今日朝议已毕</h3><div className="court-summary-metrics"><span>已裁决<b>{resolved}</b></span><span>留中<b>{deferred}</b></span><span>用时<b>{session.elapsedMinutes}分</b></span></div><p>留中议题可稍后再次升朝继续议决，已处理事项与官员表现均已写入履历。</p>{deferred > 0 && <button className="court-primary-button court-flow-wide" onClick={onResume}>再次升朝 <b>›</b></button>}<button className="court-secondary-button court-flow-wide" onClick={onBack}>返回前朝</button></article>;
}

export function CourtSession({ state, onChange, onBack }: CourtSessionProps) {
  const session = state.courtSession;
  const [phase, setPhase] = useState<CourtPhase>('overview');
  const [resolution, setResolution] = useState<CourtResolutionView | null>(null);
  const current = session?.currentIssueId ? session.agenda.find((issue) => issue.id === session.currentIssueId) : undefined;
  const showDocket = () => { setResolution(null); setPhase('overview'); };
  const retire = () => { setResolution(null); setPhase('overview'); onChange(endDailyCourt(state)); };

  if (!session) return <CourtFrame phase="overview" onClose={onBack}><div className="court-start-stage"><div className="court-announce-seal">朝</div><h3>今日常朝尚未开始</h3><p>百官已在乾清门外候旨，开始后可自由选择六部奏折。</p><button className="court-primary-button" data-testid="court-start" onClick={() => onChange((currentState) => startDailyCourt(currentState))}>开始朝会 <b>›</b></button></div></CourtFrame>;
  if (phase === 'result' && resolution) return <CourtFrame phase="result" session={session} onClose={showDocket} onDocket={showDocket} onRetire={retire}><CourtResult resolution={resolution} /></CourtFrame>;
  if (session.status === 'COMPLETED') return <CourtFrame phase="overview" session={session} onClose={onBack}><CourtSummary session={session} onBack={onBack} onResume={() => { onChange(resumeDailyCourt(state)); showDocket(); }} /></CourtFrame>;

  const selectDepartment = (department: CourtDepartment) => { onChange(selectCourtDepartment(state, department)); setPhase('announce'); };
  if (!current || phase === 'overview') return <CourtFrame phase="overview" session={session} onClose={onBack} onDocket={showDocket} onRetire={retire}><CourtOverview state={state} session={session} onSelect={selectDepartment} /></CourtFrame>;
  const chooseDecision = (option: CourtDecisionOption) => { onChange(handleCourtDecision(state, option)); setResolution({ issue: current, reporterName: officialLabel(reporterFor(state, current)), option }); setPhase('result'); };
  return <CourtFrame phase={phase} session={session} onClose={showDocket} onDocket={showDocket} onRetire={retire}>{phase === 'announce' ? <CourtAnnouncement state={state} issue={current} onContinue={() => setPhase('memorial')} onBack={showDocket} /> : <CourtMemorial state={state} issue={current} onChoose={chooseDecision} />}</CourtFrame>;
}
