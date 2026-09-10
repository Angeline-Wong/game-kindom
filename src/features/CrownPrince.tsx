import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { GameState } from '../game/gameState';
import { crownPrinceCandidates } from '../game/crownPrince';

export function CrownPrincePanel({ state, onSelect, onClose }: { state: GameState; onSelect: (personId: string) => void; onClose: () => void }) {
  const candidates = useMemo(() => crownPrinceCandidates(state), [state]);
  const alternatives = state.crownPrinceId ? candidates.filter((person) => person.id !== state.crownPrinceId) : candidates;
  const [selectedId, setSelectedId] = useState(alternatives[0]?.id ?? '');
  const selected = state.people[selectedId];
  const replacing = Boolean(state.crownPrinceId);

  return <div className="interaction-overlay royal-marriage-overlay" role="dialog" aria-modal="true" aria-label={replacing ? '改立太子' : '选立太子'}>
    <section className="royal-marriage-panel crown-prince-panel">
      <header><div><small>毓庆宫储位</small><h2>{replacing ? '改立太子' : '选立太子'}</h2></div><button type="button" aria-label="关闭立储界面" onClick={onClose}><X /></button></header>
      <div className="marriage-body">
        {replacing && state.crownPrinceId && <p>现任储君：{state.people[state.crownPrinceId]?.name ?? '未详'}。改立后原储君恢复原身份与原居所。</p>}
        <h3>择定储君人选</h3>
        <div className="marriage-grid crown-prince-grid">{alternatives.map((person) => <button key={person.id} className={selectedId === person.id ? 'active' : ''} onClick={() => setSelectedId(person.id)}>
          <b>{person.name}</b><small>{person.kind === 'PRINCESS' ? '公主' : '皇子'} · {person.age}岁 · {person.title}</small><small>资质 {person.stats['资质'] ?? person.stats['智慧'] ?? person.stats['文'] ?? 0} · 功绩 {person.stats['功绩'] ?? 0}</small>
        </button>)}</div>
        {!alternatives.length && <p className="roster-empty">当前没有其他可册立的皇嗣。</p>}
        {selected && <div className="heir-confirm-copy"><b>拟立：{selected.name}</b><span>册为{selected.kind === 'PRINCESS' ? '皇太女' : '太子'}，迁居毓庆宫。</span></div>}
        <button className="marriage-primary" disabled={!selected} onClick={() => selected && onSelect(selected.id)}>{replacing ? '颁旨改立' : '颁旨册立'}</button>
      </div>
    </section>
  </div>;
}