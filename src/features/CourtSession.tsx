import { useState } from 'react';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { applyCourtAction, demoCourtIssue } from '../game/court';

export function CourtSession({ onBack }: { onBack: () => void }) {
  const [issue, setIssue] = useState(demoCourtIssue);
  const act = (type: 'question'|'defer'|'rage') => setIssue((current) => applyCourtAction(current, { type }));
  return <section className="feature-page"><header className="feature-head"><button className="icon-btn" aria-label="返回" onClick={onBack}><ChevronLeft/></button><div><p className="eyebrow">乾清门常朝</p><h2>河东旱情与赈粮亏空</h2></div><span className="danger-tag"><AlertTriangle/>重大</span></header><div className="issue-copy"><p>{issue.summary}</p><div className="confidence"><span>呈报可信：较高</span><span>账目可信：存疑</span></div></div><div className="speaker"><div className="official-avatar">沈</div><div><b>户部尚书 沈砚之</b><p>臣请先发十万石稳住灾民，再遣钦差盘库。仓储差额若不查明，拨得越多，亏空越大。</p></div></div>{issue.revealed.map((x) => <p className="clue" key={x}>{x}</p>)}<div className="history">{issue.history.slice(-3).map((x) => <p key={x}>{x}</p>)}</div><div className="court-actions"><button onClick={() => act('question')}>追问来源</button><button onClick={() => setIssue((c) => applyCourtAction(c,{type:'ask',official:'礼部尚书'}))}>点名作答</button><button onClick={() => act('rage')}>震怒诘责</button><button onClick={() => act('defer')}>容后再议</button><button className="primary" onClick={() => setIssue((c) => applyCourtAction(c,{type:'rule',ruling:'先赈十万石，命都察院随钦差查仓。'}))}>朱批裁决</button></div><footer className="court-meter"><span>朝堂畏惧 {issue.fear}</span><span>直言意愿 {issue.candor}</span><span>状态 {issue.status === 'deferred' ? '明日再议' : issue.status === 'ruled' ? '已裁决' : '辩论中'}</span></footer></section>;
}
