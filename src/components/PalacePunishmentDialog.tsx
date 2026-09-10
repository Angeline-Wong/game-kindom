import { useState } from 'react';
import { useOptionalGameState } from '../game/GameStateContext';
import { applyPunishment, punishmentDefinitions, type PunishmentRequest } from '../game/palacePunishments';
import './PalacePunishmentDialog.css';

export function PalacePunishmentDialog({ request, onClose, onApplied, initialDefinitionId, apply = applyPunishment }: { request: PunishmentRequest; onClose: () => void; onApplied: () => void; initialDefinitionId?: string; apply?: typeof applyPunishment }) {
  const store = useOptionalGameState();
  const [selected, setSelected] = useState<string | null>(initialDefinitionId ?? null);
  const [submitted, setSubmitted] = useState(false);
  if (!store) return null;
  const definition = punishmentDefinitions.find((d) => d.id === selected);
  const preview = definition ? apply(store.gameState, request, definition.id) : undefined;
  const target = store.gameState.people[request.targetId];
  const confirm = () => {
    if (submitted || !definition || preview?.error) return;
    setSubmitted(true);
    store.setGameState((current) => apply(current, request, definition.id).state);
    onApplied();
  };
  return <div className="interaction-overlay palace-punishment-overlay">
    <section className="selection-modal" role="dialog" aria-modal="true" aria-label="宫规处罚确认">
      <div className="selection-modal-content">
        <p className="dialogue-speaker">处置{target?.name ?? '宫中人物'}</p>
        <p className="dialogue-copy">{request.reason}</p>
        {!definition ? <div className="choice-grid">{punishmentDefinitions.map((d) => <button key={d.id} onClick={() => setSelected(d.id)}>{d.name}</button>)}<button onClick={onClose}>不予追究</button></div> : <>
          <p className="dialogue-copy">确定对{target?.name}施以{definition.name}？</p>
          <div className="palace-effect-feedback">{preview?.feedback.map((f, i) => <span key={i}>{f.label} {f.value > 0 ? '+' : ''}{f.value}</span>)}</div>
          {definition.days && <p>禁足期间无法临幸；未结算侍寝将取消。</p>}
          {definition.months && <p>从下一次月俸结算起扣发{definition.months}个月月例。</p>}
          {preview?.error && <p role="alert">{preview.error}</p>}
          <div className="choice-grid"><button onClick={() => setSelected(null)}>返回选择</button><button disabled={submitted || Boolean(preview?.error)} onClick={confirm}>确认处罚</button></div>
        </>}
      </div>
      <button className="dialogue-close" aria-label="关闭处罚" onClick={onClose}>×</button>
    </section>
  </div>;
}
