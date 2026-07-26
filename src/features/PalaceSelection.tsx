import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { GameDate, PalaceSelectionRecord, SelectionDecision } from '../game/gameState';
import type { ResidenceState } from '../game/residences';
import type { SelectionAssignment } from '../game/palaceSelection';
import { canOccupyMainHall, type ConsortRank } from '../game/residences';

const reviewRanks = ['嫔', '贵人', '常在', '答应', '官女子'];

function formatDate(date?: GameDate) {
  return date ? `永和${date.year}年${date.month}月${date.day}日` : '日期未定';
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
    setAssignments(selectedCandidates.map((candidate) => ({
      candidateId: candidate.id,
      rank: candidate.proposedRank ?? '常在',
      residence: candidate.proposedResidence ?? '',
      honorific: candidate.proposedHonorific ?? '',
    })));
  }, [selectedCandidates, selection?.id, selection?.status]);

  const title = !selection || selection.status === 'COMPLETED' ? '选秀筹办' : selection.status === 'SCHEDULED' ? '选秀候期' : selection.status === 'SELECTING' ? '殿选秀女' : selection.status === 'AWAITING_ENTRY' ? '新人候旨入宫' : '新人入宫复核';
  const residences = residenceState.residences.filter((residence) => !residence.occupantId);
  const updateAssignment = (candidateId: string, field: 'rank' | 'residence' | 'honorific', value: string) => setAssignments((current) => current.map((item) => item.candidateId === candidateId ? { ...item, [field]: value, ...(field === 'rank' ? { residence: '' } : {}) } : item));
  const chosenHonorifics = assignments.map((item) => item.honorific?.trim()).filter(Boolean) as string[];
  const existingHonorifics = new Set(usedHonorifics);
  const honorificsValid = chosenHonorifics.length === new Set(chosenHonorifics).size && chosenHonorifics.every((honorific) => !existingHonorifics.has(honorific));
  const canConfirm = assignments.length > 0 && assignments.every((item) => item.rank && item.residence) && new Set(assignments.map((item) => item.residence)).size === assignments.length && honorificsValid;

  return <div className="interaction-overlay selection-management-overlay">
    <section className="palace-selection-panel" role="dialog" aria-modal="true" aria-label={title}>
      <header><div><small>交泰殿宫务</small><h2>{title}</h2></div><button className="dialogue-close" aria-label="关闭选秀界面" onClick={onClose}><X /></button></header>

      {(!selection || selection.status === 'COMPLETED') && <div className="selection-intro">
        <p>{selection?.status === 'COMPLETED' ? '上一届选秀名册已经归档，可另择吉日再办一届。' : '颁令筹办后，一个月开启殿选；入选秀女再候一个月入宫。'}</p>
        <button className="selection-primary" onClick={onSchedule}>{selection ? '再办一届' : '颁令筹办'}</button>
      </div>}

      {selection?.status === 'SCHEDULED' && <div className="selection-intro">
        <strong>{formatDate(selection.selectionOn)}开选</strong>
        <p>名册、家世与教习记录正在核验。游戏时间到期后，殿选会自动开放。</p>
        <span>今日：{formatDate(currentDate)}</span>
      </div>}

      {selection?.status === 'SELECTING' && <div className="selection-candidate-list">
        <p className="selection-lead">依次阅看秀女。撂牌子者入选，赐花者落选。</p>
        {selection.candidates.map((candidate) => <article key={candidate.id} className="selection-candidate-card">
          <div className="candidate-seal">{candidate.name.slice(0, 1)}</div>
          <div className="candidate-copy"><h3>{candidate.name}</h3><p>{candidate.age}岁 · {candidate.traits.join('、')}</p><span>才情 {candidate.stats.才情}　礼仪 {candidate.stats.礼仪}　容貌 {candidate.stats.容貌}</span></div>
          <div className="candidate-decisions">
            <button className={candidate.decision === 'SELECTED' ? 'active' : ''} onClick={() => onDecision(candidate.id, 'SELECTED')}>撂牌子（入选）</button>
            <button className={candidate.decision === 'REJECTED' ? 'active reject' : ''} onClick={() => onDecision(candidate.id, 'REJECTED')}>赐花（落选）</button>
          </div>
        </article>)}
      </div>}

      {selection?.status === 'AWAITING_ENTRY' && <div className="selection-intro">
        <strong>{formatDate(selection.entryOn)}入宫</strong>
        <p>{selectedCandidates.map((candidate) => candidate.name).join('、')}已经入选。入宫时由皇后初拟位份与居所，再呈皇帝复核。</p>
      </div>}

      {selection?.status === 'AWAITING_REVIEW' && <div className="selection-review-list">
        <p className="selection-lead">皇后已拟定名册。皇帝可更改位份和宫室，确认后新人正式入宫。</p>
        {selectedCandidates.map((candidate) => {
          const assignment = assignments.find((item) => item.candidateId === candidate.id);
          const eligibleResidences = residences.filter((residence) => canOccupyMainHall((assignment?.rank ?? '常在') as ConsortRank) ? residence.room === '主殿' : residence.room !== '主殿');
          return <article key={candidate.id} className="selection-review-card">
            <h3>{candidate.name}</h3>
            <label>位份<select value={assignment?.rank ?? ''} onChange={(event) => updateAssignment(candidate.id, 'rank', event.target.value)}>{reviewRanks.map((rank) => <option key={rank}>{rank}</option>)}</select></label>
            <label>居所<select value={assignment?.residence ?? ''} onChange={(event) => updateAssignment(candidate.id, 'residence', event.target.value)}><option value="">请选择空置宫室</option>{eligibleResidences.map((residence) => <option key={residence.id} value={`${residence.palace}${residence.room}`}>{residence.palace} · {residence.room}</option>)}</select></label>
            <label>封号<input value={assignment?.honorific ?? ''} maxLength={2} placeholder="无封号" onChange={(event) => updateAssignment(candidate.id, 'honorific', event.target.value.replace(/[^㐀-鿿]/g, '').slice(0, 2))} /></label>
          </article>;
        })}
        {!canConfirm && assignments.length > 0 && <p className="selection-warning">每位新人必须分配不同的空置宫室，封号若填写也不得重复。</p>}
        <button className="selection-primary" disabled={!canConfirm} onClick={() => onConfirm(assignments)}>御览确认</button>
      </div>}
    </section>
  </div>;
}
