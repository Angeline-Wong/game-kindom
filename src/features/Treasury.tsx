import { useState } from 'react';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import itemSprite from '../assets/treasury-items.png';
import treasuryBackground from '../assets/treasury-background.png';

const categories = ['全部', '书籍', '珍宝', '金银', '玉器', '服饰', '器物', '丹药', '其他'] as const;
const items = [
  ['四书集注', '书籍', 12], ['永乐大典', '书籍', 3], ['百花诗集', '书籍', 8], ['翡翠平安扣', '玉器', 5], ['金凤簪', '珍宝', 2],
  ['东珠项链', '珍宝', 4], ['和田玉镯', '玉器', 6], ['黄金万两', '金银', 20], ['白银万两', '金银', 50], ['点翠首饰盒', '珍宝', 7],
  ['织云锦袍', '服饰', 9], ['缂花鞋', '服饰', 15], ['名家画卷', '书籍', 6], ['青花瓷瓶', '器物', 10], ['千年灵芝', '丹药', 3],
] as const;

export function Treasury({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<(typeof categories)[number]>('全部');
  const [selected, setSelected] = useState(7);
  const [amount, setAmount] = useState(1);
  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => category === '全部' || item[1] === category);
  const [name, type, quantity] = items[selected];

  return <section className="treasury-page" aria-label="国库" style={{ backgroundImage: `linear-gradient(#120d0ad9, #120d0af0), url(${treasuryBackground})` }}>
    <header className="treasury-header"><h2>国库</h2><button className="treasury-back" aria-label="返回前朝" onClick={onBack}><ChevronLeft /></button></header>
    <aside className="treasury-categories">{categories.map((entry) => <button key={entry} className={category === entry ? 'active' : ''} onClick={() => setCategory(entry)}>{entry}</button>)}</aside>
    <div className="treasury-content">
      <div className="treasury-intro"><span>内府藏珍</span><small>仅显示可赏赐</small></div>
      <div className="inventory-grid">{visible.map(({ item, index }) => <button key={item[0]} className={`inventory-card ${selected === index ? 'selected' : ''}`} onClick={() => { setSelected(index); setAmount(1); }}><span className="item-sprite" style={{ backgroundImage: `url(${itemSprite})`, backgroundPosition: `${(index % 4) * 33.333}% ${Math.floor(index / 4) * 33.333}%` }} /><b>{item[0]}</b><small>数量：{item[2]}</small></button>)}</div>
    </div>
    <footer className="treasury-detail"><div className="detail-emblem">{name.slice(0, 1)}</div><div className="detail-copy"><h3>{name}</h3><p>类别：{type}　数量：{quantity}</p><span>可作为赏赐，提升人物好感与声望。</span></div><div className="gift-controls"><div><span>赏赐数量</span><button aria-label="减少数量" onClick={() => setAmount(Math.max(1, amount - 1))}><Minus /></button><b>{amount}</b><button aria-label="增加数量" onClick={() => setAmount(Math.min(quantity, amount + 1))}><Plus /></button></div><button className="gift-button">赏赐</button></div></footer>
  </section>;
}
