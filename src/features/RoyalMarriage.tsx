import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { GameState, MarriageCandidate } from '../game/gameState';
import { createMinistryCandidates, eligibleRoyalHeirs, marryCandidate, marryMinister, ministerSpouse, scheduleMarriageBanquet } from '../game/royalMarriage';

type Route = 'MINISTRY' | 'MINISTER' | 'BANQUET';

function candidateLabel(candidate: MarriageCandidate) {
  return `${candidate.familyRank}${candidate.familyOffice}${candidate.legitimacy}${candidate.relation}`;
}

export function RoyalMarriagePanel({ state, onChange, onClose, onNotice }: { state: GameState; onChange: (state: GameState) => void; onClose: () => void; onNotice: (message: string) => void }) {
  const heirs = useMemo(() => eligibleRoyalHeirs(state), [state]);
  const [royalId, setRoyalId] = useState(heirs[0]?.id ?? '');
  const [route, setRoute] = useState<Route | null>(null);
  const [conflictMinisterId, setConflictMinisterId] = useState<string | null>(null);
  const royal = state.people[royalId];
  const candidates = useMemo(() => royalId ? createMinistryCandidates(state, royalId) : [], [royalId, state]);
  const ministers = useMemo(() => Object.values(state.people).filter((person) => person.kind === 'MINISTER' && person.status !== 'DEAD' && person.id !== 'attendant'), [state.people]);

  const finishCandidate = (candidate: MarriageCandidate) => {
    if (!royal) return;
    onChange(marryCandidate(state, royal.id, candidate));
    onNotice(`${royal.name}与${candidateLabel(candidate)}${candidate.name}的婚配已定，礼部将择吉完婚。`);
    onClose();
  };

  const chooseMinister = (ministerId: string) => {
    if (!royal) return;
    const spouse = ministerSpouse(state, ministerId);
    if (spouse) { setConflictMinisterId(ministerId); return; }
    const minister = state.people[ministerId];
    onChange(marryMinister(state, royal.id, ministerId));
    onNotice(`${royal.name}与${minister.rank ?? ''}${minister.office ?? minister.title}${minister.name}的婚配已定。`);
    onClose();
  };

  const scheduleBanquet = () => {
    if (!royal) return;
    const next = scheduleMarriageBanquet(state, royal.id);
    const record = next.royalMarriages.at(-1);
    onChange(next);
    onNotice(record?.banquetOn ? `相看宴定于${record.banquetOn.year}年${record.banquetOn.month}月${record.banquetOn.day}日在御花园举行。` : '相看宴已交礼部筹备。');
    onClose();
  };

  return <div className="interaction-overlay royal-marriage-overlay" role="dialog" aria-modal="true" aria-label="皇嗣婚配">
    <section className="royal-marriage-panel">
      <header><div><small>毓庆宫宫务</small><h2>皇嗣婚配</h2></div><button type="button" aria-label="关闭皇嗣婚配" onClick={onClose}><X /></button></header>
      {!route && <div className="marriage-body">
        <h3>一、择定皇嗣</h3>
        <div className="marriage-grid">{heirs.map((person) => <button key={person.id} className={royalId === person.id ? 'active' : ''} onClick={() => setRoyalId(person.id)}><b>{person.name}</b><small>{person.title} · {person.age}岁</small></button>)}</div>
        <h3>二、选择婚配方式</h3>
        <div className="marriage-routes"><button onClick={() => setRoute('MINISTRY')}>礼部挑选<small>呈选四名门第相宜人选</small></button><button onClick={() => setRoute('MINISTER')}>婚配大臣<small>从当前在朝臣子中亲择</small></button><button onClick={() => setRoute('BANQUET')}>举宴相看<small>十四日后御花园相看</small></button></div>
      </div>}
      {route === 'MINISTRY' && <div className="marriage-body"><h3>礼部呈选</h3><p>家世、嫡庶与人物属性均会影响婚后关系。</p><div className="candidate-list">{candidates.map((candidate) => <button key={candidate.id} onClick={() => finishCandidate(candidate)}><span><b>{candidate.name}</b><small>{candidateLabel(candidate)}</small></span><span><i>魅力 {candidate.charm}</i><i>谋略 {candidate.strategy}</i></span></button>)}</div><button className="marriage-back" onClick={() => setRoute(null)}>返回重选</button></div>}
      {route === 'MINISTER' && <div className="marriage-body"><h3>亲择大臣</h3><p>已有配偶者会先提示处置，不会直接覆盖婚姻关系。</p><div className="candidate-list minister-candidates">{ministers.map((minister) => <button key={minister.id} onClick={() => chooseMinister(minister.id)}><span><b>{minister.name}</b><small>{minister.rank} · {minister.office}</small></span><span><i>忠诚 {minister.stats['忠诚'] ?? 0}</i><i>{ministerSpouse(state, minister.id) ? '已有原配' : '尚未婚配'}</i></span></button>)}</div><button className="marriage-back" onClick={() => setRoute(null)}>返回重选</button></div>}
      {route === 'BANQUET' && <div className="marriage-body banquet-confirm"><h3>御花园举宴相看</h3><p>礼部将在十四日后设宴。届时该皇嗣与其母妃白天必在御花园，陛下可前往询问；次日由内侍回禀双方属意的人选。</p><button className="marriage-primary" onClick={scheduleBanquet}>颁令筹宴</button><button className="marriage-back" onClick={() => setRoute(null)}>返回重选</button></div>}
      {conflictMinisterId && royal && <div className="marriage-conflict"><section><h3>婚配有碍</h3><p>{state.people[conflictMinisterId].name}已有原配。可换一位大臣，或刺死原配后继续婚配。</p><button onClick={() => setConflictMinisterId(null)}>换一位</button><button className="danger" onClick={() => { const minister = state.people[conflictMinisterId]; onChange(marryMinister(state, royal.id, conflictMinisterId, true)); onNotice(`${minister.name}原配已被刺死，${royal.name}与${minister.name}奉旨成婚。`); onClose(); }}>刺死原配</button></section></div>}
    </section>
  </div>;
}
