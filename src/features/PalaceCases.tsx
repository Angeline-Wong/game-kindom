import { useState } from 'react';
import { useSharedGameState } from '../game/GameStateContext';
import { casePunishmentTargets, closePalaceCaseWithoutPunishment, palaceCaseView, punishAndClosePalaceCase, startPalaceInvestigation } from '../game/palaceCases';
import { investigationCandidates, investigationDuration, investigatorKey } from '../game/palaceInvestigations';
import { palaceCaseTemplates } from '../game/palaceCaseTemplates';
import { PalacePunishmentDialog } from '../components/PalacePunishmentDialog';
import './PalaceCases.css';

const statuses = { PENDING: '待指派', INVESTIGATING: '调查中', WAITING_DECISION: '待裁决', CLOSED: '已结案', REOPENED: '重新立案' };
const severities = { TRIVIAL: '日常', MINOR: '轻微', MEDIUM: '中等', SERIOUS: '严重', CRITICAL: '重大' };
export function PalaceCasesPanel({ initialCaseId, onClose }: { initialCaseId?: string; onClose: () => void }) {
  const { gameState, setGameState } = useSharedGameState();
  const [selected, setSelected] = useState(initialCaseId);
  const [target, setTarget] = useState<string>();
  const [choosingTarget, setChoosingTarget] = useState(false);
  const [questioning, setQuestioning] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState('');
  const source = gameState.palaceCases.find((item) => item.id === selected);
  const item = source && palaceCaseView(source);
  const name = (id: string) => gameState.people[id]?.name ?? '宫中人物';
  const template = source && palaceCaseTemplates.find((t) => t.id === source.templateId);
  return <div className="interaction-overlay palace-cases-overlay"><section className="palace-cases-panel" role="dialog" aria-modal="true" aria-label="宫中事务">
    <header><h2>{item ? '案件卷宗' : '宫中事务'}</h2><button aria-label="关闭宫中事务" onClick={onClose}>×</button></header>
    {item && source ? <>
      <button onClick={() => { setSelected(undefined); setChoosingTarget(false); setQuestioning(false); setConfirmClose(false); }}>返回案件列表</button>
      <h3>{item.title}</h3><p>{severities[item.severity]} · {statuses[item.status]}</p><p>{item.description}</p>
      <p>呈报人：{name(item.complainantId)}<br />相关人物：{[...new Set([...item.victimIds, ...item.accusedIds])].map(name).join('、')}</p>
      {item.status === 'PENDING' && <><h3>指派调查</h3><p>请选择可承办此案的调查人。调查期间可离开卷宗，稍后从宫中事务查看进度。</p>
        {investigationCandidates(gameState, source).map((candidate) => <button className="case-investigator" key={investigatorKey(candidate)} onClick={() => {
          const rolls = { duration: Math.random(), result: Math.random() };
          const preview = startPalaceInvestigation(gameState, item.id, investigatorKey(candidate), rolls);
          setError(preview.error ?? '');
          if (!preview.error) setGameState((current) => startPalaceInvestigation(current, item.id, investigatorKey(candidate), rolls).state);
        }}><strong>{candidate.type === 'EMPRESS' ? '皇后 · ' : candidate.type === 'CONSORT' ? '妃嫔 · ' : ''}{candidate.name}</strong>
          <span>综合调查能力 {candidate.ability} · 预计 {template ? `${investigationDuration(template, candidate, 0)}～${investigationDuration(template, candidate, .999)}` : '?'} 日</span>
          {candidate.attributes && <span>智慧 {candidate.attributes.wisdom} · 谋略 {candidate.attributes.strategy} · 威望 {candidate.attributes.prestige}</span>}
        </button>)}<small>智慧、谋略缺省时分别参考才情、礼仪；仅用于本次调查评估。</small></>}
      {item.investigator && <p>负责调查：{item.investigator.name}<br />{item.status === 'INVESTIGATING' ? `还需 ${item.investigationDaysRemaining} 日` : `调查用时：${item.investigationTotalDays} 日`}</p>}
      {item.result && <><h3>{item.investigator?.name}呈报</h3><p>{item.result.summary}</p><p>调查可信度：{item.result.confidence >= 75 ? '较高' : item.result.confidence >= 50 ? '一般' : '较低'}（{item.result.confidence}%）</p>
        {!!item.result.suspectedIds.length && <p>调查涉及：{item.result.suspectedIds.map(name).join('、')}</p>}</>}
      {item.status === 'WAITING_DECISION' && <>
        {questioning && <div className="case-note">内侍已将调查呈报向相关人物宣读，众人候旨。问话未取得新的可核实信息，请陛下依据现有呈报裁决。<button onClick={() => setQuestioning(false)}>问话结束</button></div>}
        <div className="case-actions"><button onClick={() => setQuestioning(true)}>召来问话</button><button onClick={() => setChoosingTarget(true)}>直接处置</button><button onClick={() => setConfirmClose(true)}>不予追究</button><button onClick={onClose}>暂缓处理</button></div>
        {choosingTarget && <div className="case-note"><p>选择处置对象。调查结论并不等于定罪，请审慎裁决。</p>{casePunishmentTargets(gameState, source).map((person) => <button key={person.id} onClick={() => setTarget(person.id)}>处置{person.name}</button>)}{!casePunishmentTargets(gameState, source).length && <p>目前没有可处罚的相关人物，可以不予追究结案。</p>}<button onClick={() => setChoosingTarget(false)}>取消处置</button></div>}
        {confirmClose && <div className="case-note"><p>确定不予追究并结案？</p><button onClick={() => { setGameState((current) => closePalaceCaseWithoutPunishment(current, item.id)); setConfirmClose(false); }}>确认结案</button><button onClick={() => setConfirmClose(false)}>返回卷宗</button></div>}
      </>}
      {item.ruling && <p>最终裁决：{item.ruling.type === 'NO_ACTION' ? '不予追究，已结案。' : `已处置${item.ruling.targetIds.map(name).join('、')}并结案。处罚已记入人物履历。`}</p>}
      {error && <p role="alert">{error}</p>}
      {target && item.status === 'WAITING_DECISION' && <PalacePunishmentDialog request={{ id: `case-punishment-${item.id}`, targetId: target, reason: item.title, severity: item.severity }} apply={(current, request, definitionId) => punishAndClosePalaceCase(current, item.id, request, definitionId)} onClose={() => setTarget(undefined)} onApplied={() => { setTarget(undefined); setChoosingTarget(false); }} />}
    </> : <>{(['PENDING', 'INVESTIGATING', 'WAITING_DECISION', 'CLOSED'] as const).map((status) => <section key={status}><h3>{statuses[status]} {gameState.palaceCases.filter((c) => c.status === status).length}</h3>{gameState.palaceCases.filter((c) => c.status === status).map(palaceCaseView).map((entry) => <button className="case-investigator" key={entry.id} onClick={() => setSelected(entry.id)}><strong>{entry.title}</strong><span>{statuses[entry.status]} · {entry.accusedIds.map(name).join('、') || name(entry.complainantId)}{status === 'INVESTIGATING' ? ` · 还需 ${entry.investigationDaysRemaining} 日` : ''}</span></button>)}</section>)}</>}
  </section></div>;
}
