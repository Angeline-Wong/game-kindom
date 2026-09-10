import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import palaceBackground from '../assets/inner-palace-west-hall.png';
import { personPortraitUrl } from '../game/personPortraits';
import type { GameDate, PalaceSelectionRecord, SelectionCandidate, SelectionDecision } from '../game/gameState';
import type { ResidenceState } from '../game/residences';
import type { SelectionAssignment } from '../game/palaceSelection';
import { canOccupyMainHall, type ConsortRank } from '../game/residences';
import './PalaceSelection.css';

const reviewRanks = ['嫔', '贵人', '常在', '答应', '官女子'];
const numerals = ['壹', '贰', '叁', '肆', '伍', '陆'];

function candidatePortrait(candidate: SelectionCandidate) {
  return personPortraitUrl({ id: candidate.id, kind: 'CONSORT', assets: { avatar: 'portrait.consort', portrait: candidate.portrait ?? 'portrait.consort' } });
}

function formatDate(date?: GameDate) {
  return date ? `永和${date.year}年${date.month}月${date.day}日` : '日期未定';
}

function CandidateSelection({ selection, onDecision, onClose }: {
  selection: PalaceSelectionRecord;
  onDecision: (candidateId: string, decision: SelectionDecision) => void;
  onClose: () => void;
}) {
  const firstPending = Math.max(0, selection.candidates.findIndex((candidate) => !candidate.decision));
  const [index, setIndex] = useState(firstPending);
  const [tab, setTab] = useState<'family' | 'talent'>('family');
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState('');
  const candidate = selection.candidates[index];
  const portrait = candidatePortrait(candidate);

  useEffect(() => {
    if (index < selection.candidates.length) return;
    setIndex(0);
  }, [index, selection.candidates.length]);

  const move = (delta: number) => {
    setLeaving(true);
    window.setTimeout(() => {
      setIndex((current) => (current + delta + selection.candidates.length) % selection.candidates.length);
      setLeaving(false);
    }, 150);
  };

  const decide = (decision: SelectionDecision) => {
    const text = decision === 'SELECTED' ? `已留牌 · ${candidate.name}入宫候选` : `已赐花 · ${candidate.name}遣归本家`;
    setMessage(text);
    onDecision(candidate.id, decision);
    if (index < selection.candidates.length - 1) window.setTimeout(() => move(1), 520);
    window.setTimeout(() => setMessage(''), 1400);
  };

  return <div className="selection-game-overlay">
    <section className="selection-game" aria-label="殿选秀女">
      <div className="selection-palace-bg" style={{ backgroundImage: `linear-gradient(180deg,rgba(18,7,3,.07),rgba(10,4,2,.08) 36%,rgba(10,4,2,.9) 82%,#0c0604),url(${palaceBackground})` }} />
      <div className="selection-rays" />
      <header className="selection-game-header">
        <button className="selection-round" aria-label="音效">♪</button>
        <div><small>紫宸纪事 · 永和三年</small><h2>殿　选</h2><p>— 第 <b>{numerals[index]}</b> 轮 · 阅看秀女 —</p></div>
        <button className="selection-round selection-exit" aria-label="关闭选秀" onClick={onClose}>×</button>
      </header>

      <section className="selection-stage">
        <button className="selection-turn prev" aria-label="上一位" onClick={() => move(-1)}>‹</button>
        <div className="selection-portrait-wrap">
          {portrait && <img className={`selection-portrait ${leaving ? 'leaving' : ''}`} src={portrait} alt={`${candidate.name}立绘`} />}
          <div className="selection-portrait-fade" />
        </div>
        <button className="selection-turn next" aria-label="下一位" onClick={() => move(1)}>›</button>
        <div className="selection-identity"><span className="selection-seal">候选</span><div><h3>{candidate.name}</h3><p>{candidate.fatherOffice ?? '官宦人家'}嫡女</p></div><b>{numerals[index]}</b></div>
        <div className="selection-traits">{candidate.traits.slice(0, 3).map((trait) => <span key={trait}>{trait}</span>)}</div>
      </section>

      <section className="selection-scroll">
        <nav><button className={tab === 'family' ? 'active' : ''} onClick={() => setTab('family')}>家世</button><button className={tab === 'talent' ? 'active' : ''} onClick={() => setTab('talent')}>才情品貌</button></nav>
        {tab === 'family' ? <>
          <div className="selection-family">
            <div><small>父亲</small><strong>{candidate.fatherName ?? '家世待考'}</strong><em>{candidate.fatherOffice ?? '暂无官职'}</em></div>
            <div><small>母族</small><strong>{candidate.motherClan ?? '书香门第'}</strong><em>清流世家</em></div>
            <div><small>家势</small><strong>{candidate.familyStanding ?? '中正'}</strong><em>门风谨严，素有贤名</em></div>
          </div>
          <p className="selection-assessment"><b>司礼监评语</b><span>仪态娴雅，应对有度，可堪宫中礼仪。</span></p>
        </> : <CandidateStats candidate={candidate} />}
      </section>

      <div className="selection-progress">{selection.candidates.map((item, itemIndex) => <button key={item.id} className={`${itemIndex === index ? 'active' : ''} ${item.decision ? 'decided' : ''}`} aria-label={`第${itemIndex + 1}位`} onClick={() => setIndex(itemIndex)} />)}</div>
      <section className="selection-decisions">
        <button onClick={() => decide('REJECTED')}><span className="selection-choice-icon flower">✿</span><b>赐　花</b><small>遣归本家</small></button>
        <button className="keep" onClick={() => decide('SELECTED')}><span className="selection-choice-icon jade">留</span><b>留　牌</b><small>入宫候选</small></button>
      </section>
      {message && <div className="selection-toast">{message}</div>}
    </section>
  </div>;
}

function CandidateStats({ candidate }: { candidate: SelectionCandidate }) {
  const stats = [
    ['容貌', candidate.stats['容貌'] ?? 70], ['才情', candidate.stats['才情'] ?? 70],
    ['礼仪', candidate.stats['礼仪'] ?? 70], ['心性', 100 - (candidate.stats['野心'] ?? 40)],
  ] as const;
  return <div className="selection-stats">{stats.map(([label, value]) => <label key={label}>{label}<i><b style={{ width: `${value}%` }} /></i><span>{value}</span></label>)}</div>;
}

export function PalaceSelectionPanel({ selection, currentDate, residenceState, usedHonorifics = [], onSchedule, onDecision, onConfirm, onClose }: {
  selection: PalaceSelectionRecord | null;
  currentDate: GameDate;
  residenceState: ResidenceState;
  usedHonorifics?: string[];
  onSchedule: () => void;
  onDecision: (candidateId: string, decision: SelectionDecision) => void;
  onConfirm: (assignments: SelectionAssignment[]) => void;
  onClose: () => void;
}) {
  const selectedCandidates = useMemo(() => selection?.candidates.filter((candidate) => candidate.decision === 'SELECTED') ?? [], [selection]);
  const [assignments, setAssignments] = useState<SelectionAssignment[]>([]);

  useEffect(() => {
    if (selection?.status !== 'AWAITING_REVIEW') return;
    setAssignments(selectedCandidates.map((candidate) => ({ candidateId: candidate.id, rank: candidate.proposedRank ?? '常在', residence: candidate.proposedResidence ?? '', honorific: candidate.proposedHonorific ?? '' })));
  }, [selectedCandidates, selection?.id, selection?.status]);

  if (selection?.status === 'SELECTING') return <CandidateSelection selection={selection} onDecision={onDecision} onClose={onClose} />;

  const title = !selection || selection.status === 'COMPLETED' ? '选秀筹办' : selection.status === 'SCHEDULED' ? '选秀候期' : selection.status === 'AWAITING_ENTRY' ? '新人候门入宫' : '新人入宫复核';
  const residences = residenceState.residences.filter((residence) => !residence.occupantId);
  const updateAssignment = (candidateId: string, field: 'rank' | 'residence' | 'honorific', value: string) => setAssignments((current) => current.map((item) => item.candidateId === candidateId ? { ...item, [field]: value, ...(field === 'rank' ? { residence: '' } : {}) } : item));
  const chosenHonorifics = assignments.map((item) => item.honorific?.trim()).filter(Boolean) as string[];
  const honorificsValid = chosenHonorifics.length === new Set(chosenHonorifics).size && chosenHonorifics.every((item) => !new Set(usedHonorifics).has(item));
  const canConfirm = assignments.length > 0 && assignments.every((item) => item.rank && item.residence) && new Set(assignments.map((item) => item.residence)).size === assignments.length && honorificsValid;

  return <div className="interaction-overlay selection-management-overlay"><section className="palace-selection-panel" role="dialog" aria-modal="true" aria-label={title}>
    <header><div><small>交泰殿宫务</small><h2>{title}</h2></div><button className="dialogue-close" aria-label="关闭选秀界面" onClick={onClose}><X /></button></header>
    {(!selection || selection.status === 'COMPLETED') && <div className="selection-intro"><p>{selection ? '上一届选秀名册已经归档，可另择吉日再办一届。' : '颁令筹办后，一个月开启殿选；入选秀女再候一个月入宫。'}</p><button className="selection-primary" onClick={onSchedule}>{selection ? '再办一届' : '颁令筹办'}</button></div>}
    {selection?.status === 'SCHEDULED' && <div className="selection-intro"><strong>{formatDate(selection.selectionOn)}开选</strong><p>名册、家世与教习记录正在核验。游戏时间到期后，殿选会自动开放。</p><span>今日：{formatDate(currentDate)}</span></div>}
    {selection?.status === 'AWAITING_ENTRY' && <div className="selection-intro"><strong>{formatDate(selection.entryOn)}入宫</strong><p>{selectedCandidates.map((candidate) => candidate.name).join('、')}已经入选。入宫时由皇后初拟位份与居所，再呈皇帝复核。</p></div>}
    {selection?.status === 'AWAITING_REVIEW' && <div className="selection-review-list"><p className="selection-lead">皇后已拟定名册。确认后新人正式入宫，其父女关系将同步写入妃嫔与朝臣档案。</p>
      {selectedCandidates.map((candidate) => { const assignment = assignments.find((item) => item.candidateId === candidate.id); const eligible = residences.filter((residence) => canOccupyMainHall((assignment?.rank ?? '常在') as ConsortRank) ? residence.room === '主殿' : residence.room !== '主殿'); const portrait = candidatePortrait(candidate); return <article key={candidate.id} className="selection-review-card"><div className="selection-review-identity">{portrait && <span className="selection-review-portrait" role="img" aria-label={`${candidate.name}头像`}><i style={{ backgroundImage: `url(${portrait})` }} /></span>}<h3>{candidate.name}</h3><small>{candidate.fatherName ? `${candidate.fatherName}之女` : '家世待考'}</small></div><label>位份<select value={assignment?.rank ?? ''} onChange={(event) => updateAssignment(candidate.id, 'rank', event.target.value)}>{reviewRanks.map((rank) => <option key={rank}>{rank}</option>)}</select></label><label>居所<select value={assignment?.residence ?? ''} onChange={(event) => updateAssignment(candidate.id, 'residence', event.target.value)}><option value="">请选择空置宫室</option>{eligible.map((residence) => <option key={residence.id} value={`${residence.palace}${residence.room}`}>{residence.palace} · {residence.room}</option>)}</select></label><label>封号<input value={assignment?.honorific ?? ''} maxLength={2} placeholder="无封号" onChange={(event) => updateAssignment(candidate.id, 'honorific', event.target.value.replace(/[^㐀-鿿]/g, '').slice(0, 2))} /></label></article> })}
      {!canConfirm && assignments.length > 0 && <p className="selection-warning">每位新人必须分配不同的空置宫室，封号也不得重复。</p>}<button className="selection-primary" disabled={!canConfirm} onClick={() => onConfirm(assignments)}>御览确认</button>
    </div>}
  </section></div>;
}
