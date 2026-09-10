import { useState } from 'react';
import { useOptionalGameState } from '../game/GameStateContext';
import { grantPosthumousTitle, posthumousTitleOptions } from '../game/posthumousTitles';
import './PalacePunishmentDialog.css';
import './PosthumousTitleDialog.css';

export function PosthumousTitleDialog({ personId, onClose }: { personId: string; onClose: () => void }) {
  const store = useOptionalGameState();
  const [selection, setSelection] = useState('');
  if (!store) return null;
  const person = store.gameState.people[personId];
  const options = person ? posthumousTitleOptions(person) : [];
  const selected = options.includes(selection) ? selection : options[0] ?? '';
  return <div className="interaction-overlay palace-punishment-overlay posthumous-overlay">
    <section className="selection-modal" role="dialog" aria-modal="true" aria-label="追封">
      <div className="selection-modal-content">
        <h2 className="dialogue-speaker">追封</h2>
        <p className="dialogue-copy">已故：{person?.name}</p>
        <p>生前身份：{person?.rank ?? person?.title}</p>
        {(person?.posthumousRank || person?.posthumousTitle) && <p>当前追封：{person.posthumousRank ?? person.posthumousTitle}</p>}
        {options.length ? <label>追封为<select aria-label="追封为" value={selected} onChange={event => setSelection(event.target.value)}>{options.map(title => <option key={title} value={title}>{title}</option>)}</select></label> : <p>暂无更高的可追封位份或爵位。</p>}
        <div className="choice-grid"><button onClick={onClose}>取消</button><button disabled={!selected} onClick={() => {
          store.setGameState(current => grantPosthumousTitle(current, personId, selected).state);
          onClose();
        }}>确认追封</button></div>
      </div>
    </section>
  </div>;
}
