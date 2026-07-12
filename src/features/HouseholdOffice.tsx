import { useState } from 'react';
import { ArrowLeftRight, ChevronLeft } from 'lucide-react';
import { transferFunds, type TreasuryState } from '../game/treasury';

const initial: TreasuryState = { stateSilver: 800000, privateSilver: 120000, gold: 2345, audit: [] };
export function HouseholdOffice({ onBack }: { onBack: () => void }) {
  const [funds,setFunds] = useState(initial); const [approved,setApproved] = useState(false);
  const transfer = () => setFunds((s) => transferFunds(s,{from:'private',amount:20000,reason:'京畿赈灾'}));
  return <section className="feature-page"><header className="feature-head"><button className="icon-btn" aria-label="返回" onClick={onBack}><ChevronLeft/></button><div><p className="eyebrow">内务府 · 分账总览</p><h2>皇室用度与产业</h2></div></header><div className="fund-grid"><article><small>户部国库</small><strong>{funds.stateSilver.toLocaleString()}</strong><span>银两</span></article><article><small>皇室私库</small><strong>{funds.privateSilver.toLocaleString()}</strong><span>银两</span></article></div><button className="transfer" onClick={transfer}><ArrowLeftRight/> 私库拨赈灾款二万两</button><article className="procurement"><p className="eyebrow">冬月采购 · 待批</p><h3>各宫炭火九万斤</h3><p>皇商许氏报价较去年高二成。会计司称煤窑受秋雨影响，广储司旧账却显示仍有一万七千斤未盘点。</p><div className="confidence"><span>报价：存疑</span><span>库存：未核</span></div><button onClick={() => setApproved(true)} className="primary">{approved ? '已批准并记账' : '批准采购'}</button></article><div className="ledger"><h3>调拨记录</h3>{funds.audit.length ? funds.audit.map((x,i)=><p key={i}>私库 → 国库　{x.amount.toLocaleString()}两　{x.reason}</p>):<p className="muted">尚无调拨</p>}</div></section>;
}
