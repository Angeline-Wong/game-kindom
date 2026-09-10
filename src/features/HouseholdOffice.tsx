import { useState } from 'react';
import { ArrowLeftRight, ChevronLeft } from 'lucide-react';
import { transferFunds, type TreasuryState } from '../game/treasury';
import type { PersonRecord } from '../game/gameState';
import { PersonRoster } from './PersonRoster';

const initial: TreasuryState = { stateSilver: 800000, gold: 2345, audit: [] };

export function HouseholdOffice({ people, onBack, onOpenDetail }: { people: Record<string, PersonRecord>; onBack: () => void; onOpenDetail: (personId: string) => void }) {
  const [funds, setFunds] = useState(initial);
  const [approved, setApproved] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const transfer = () => setFunds((s) => transferFunds(s, { from: 'state', amount: 20000, reason: '京畿赈灾' }));

  return (
    <section className="feature-page">
      <header className="feature-head">
        <button className="icon-btn" aria-label="返回" onClick={onBack}><ChevronLeft /></button>
        <div>
          <p className="eyebrow">内务府 · 分账总览</p>
          <h2>皇室用度与产业</h2>
        </div>
        <button className="scene-directory-button feature-eunuch-button" onClick={() => setRosterOpen(true)}>内侍列表</button>
      </header>
      <div className="fund-grid">
        <article><small>户部国库</small><strong>{funds.stateSilver.toLocaleString()}</strong><span>银两</span></article>
      </div>
      <button className="transfer" onClick={transfer}><ArrowLeftRight /> 国库拨赈灾款二万两</button>

      <article className="procurement">
        <p className="eyebrow">冬月采购 · 待批</p>
        <h3>各宫炭火九万斤</h3>
        <p>皇商许氏报价较去年高二成。会计司称煤窑受秋雨影响，广储司旧账却显示仍有一万七千斤未盘点。</p>
        <div className="confidence"><span>报价：存疑</span><span>库存：未核</span></div>
        <button onClick={() => setApproved(true)} className="primary">{approved ? '已批准并记账' : '批准采购'}</button>
      </article>
      <div className="ledger">
        <h3>调拨记录</h3>
        {funds.audit.length ? funds.audit.map((x, i) => <p key={i}>国库支出　{x.amount.toLocaleString()}两　{x.reason}</p>) : <p className="muted">尚无支出</p>}
      </div>
      {rosterOpen && <PersonRoster kind="EUNUCH" people={people} onClose={() => setRosterOpen(false)} onOpenDetail={onOpenDetail} />}
    </section>
  );
}
