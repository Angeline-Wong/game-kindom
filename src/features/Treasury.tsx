import { isPersonAlive } from '../game/person';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import itemSprite from '../assets/treasury-items.png';
import treasuryBackground from '../assets/treasury-background.png';
import { giftCatalog, type GiftCategory, type GiftState } from '../game/gifts';
import type { PersonRecord } from '../game/gameState';

const categories = ['全部', '书籍', '珍宝', '金银', '玉器', '服饰', '器物', '丹药', '其他'] as const;

export function Treasury({ onBack, giftState, people, recipientId, onGift }: {
  onBack: () => void;
  giftState: GiftState;
  people: Record<string, PersonRecord>;
  recipientId?: string | null;
  onGift: (recipientId: string, itemId: string, quantity: number) => void;
}) {
  const [category, setCategory] = useState<(typeof categories)[number]>('全部');
  const [selectedId, setSelectedId] = useState('four-books');
  const [amount, setAmount] = useState(1);
  const [targetId, setTargetId] = useState(recipientId ?? '');
  useEffect(() => setTargetId(recipientId ?? ''), [recipientId]);

  const recipients = useMemo(() => Object.values(people)
    .filter((person) => ['CONSORT', 'MINISTER', 'PRINCE', 'PRINCESS', 'DOWAGER'].includes(person.kind) && isPersonAlive(person))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)), [people]);
  const visible = giftCatalog.map((item, index) => ({ item, index })).filter(({ item }) => category === '全部' || item.category === category as GiftCategory);
  const selected = giftCatalog.find((item) => item.id === selectedId) ?? giftCatalog[0];
  const selectedIndex = giftCatalog.findIndex((item) => item.id === selected.id);
  const quantity = giftState.inventory[selected.id] ?? 0;
  const target = people[targetId];

  return <section className="treasury-page" aria-label="国库" style={{ backgroundImage: `linear-gradient(#120d0ad9, #120d0af0), url(${treasuryBackground})` }}>
    <header className="treasury-header"><h2>国库</h2><button className="treasury-back" aria-label="返回前朝" onClick={onBack}><ChevronLeft /></button></header>
    <aside className="treasury-categories">{categories.map((entry) => <button key={entry} className={category === entry ? 'active' : ''} onClick={() => setCategory(entry)}>{entry}</button>)}</aside>
    <div className="treasury-content">
      <div className="treasury-intro"><span>内府藏珍</span><label className="treasury-recipient"><span>赏赐对象</span><select aria-label="选择赏赐对象" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">请选择人物</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.title} · {person.name}</option>)}</select></label></div>
      <div className="inventory-grid">{visible.map(({ item, index }) => {
        const stock = giftState.inventory[item.id] ?? 0;
        const sprite = item.spriteIndex ?? index;
        return <button key={item.id} disabled={stock <= 0} className={`inventory-card ${selected.id === item.id ? 'selected' : ''}`} onClick={() => { setSelectedId(item.id); setAmount(1); }}><span className="item-sprite" style={{ backgroundImage: `url(${itemSprite})`, backgroundPosition: `${(sprite % 4) * 33.333}% ${Math.floor(sprite / 4) * 33.333}%` }} /><b>{item.name}</b><small>数量：{stock}</small></button>;
      })}</div>
    </div>
    <footer className="treasury-detail"><span className="detail-emblem item-sprite" style={{ backgroundImage: `url(${itemSprite})`, backgroundPosition: `${((selected.spriteIndex ?? selectedIndex) % 4) * 33.333}% ${Math.floor((selected.spriteIndex ?? selectedIndex) / 4) * 33.333}%` }} /><div className="detail-copy"><h3>{selected.name}</h3><p>类别：{selected.category}　库存：{quantity}</p><span>{selected.description}</span>{target && <strong>将赏赐给：{target.title} {target.name}</strong>}</div><div className="gift-controls"><div><span>赏赐数量</span><button aria-label="减少数量" onClick={() => setAmount(Math.max(1, amount - 1))}><Minus /></button><b>{amount}</b><button aria-label="增加数量" disabled={quantity <= 0} onClick={() => setAmount(Math.min(quantity, amount + 1))}><Plus /></button></div><button className="gift-button" disabled={!targetId || quantity <= 0 || amount > quantity} onClick={() => onGift(targetId, selected.id, amount)}>确认赏赐</button></div></footer>
  </section>;
}
