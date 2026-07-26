import { Check, X } from 'lucide-react';
import { useState } from 'react';
import type { Character } from '../game/characters';
import type { HistoryEntry, PersonRecord, RelationshipRecord } from '../game/gameState';
import { RadarChart } from './RadarChart';

export function CharacterSheet({ character, record, people, relationships = [], history = [], onClose, onUpdate }: { character: Character; record?: PersonRecord; people?: Record<string, PersonRecord>; relationships?: RelationshipRecord[]; history?: HistoryEntry[]; onClose: () => void; onUpdate?: (character: Character) => void }) {
  const [name, setName] = useState(character.name);
  const [title, setTitle] = useState(character.title);
  const [avatar, setAvatar] = useState(character.avatar);
  const isEmperor = character.kind === 'emperor';
  const relationRows = record && people ? relationships.filter((relation) => relation.personAId === record.id || relation.personBId === record.id).map((relation) => {
    const fromA = relation.personAId === record.id;
    const other = people[fromA ? relation.personBId : relation.personAId];
    return { name: other?.name ?? '未知人物', title: other?.rank ?? other?.office ?? other?.title ?? '', label: fromA ? relation.labelA : relation.labelB, affinity: relation.affinity, trust: relation.trust };
  }) : [];
  const historyRows = record ? history.filter((entry) => entry.personIds.includes(record.id)).slice(-8).reverse() : [];
  const save = () => { onUpdate?.({ ...character, name, title, avatar }); onClose(); };
  return <div className="sheet-backdrop" onClick={onClose}><section className="sheet emperor-sheet" onClick={(e) => e.stopPropagation()} aria-label="人物详情"><button className="icon-btn close" aria-label="关闭" onClick={onClose}><X/></button><div className="portrait">{isEmperor ? avatar : character.avatar}</div><p className="eyebrow">{isEmperor ? '帝王档案' : character.title}</p>{isEmperor ? <div className="identity-editor"><label>名讳<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>年号<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>头像<input value={avatar} maxLength={1} onChange={(e) => setAvatar(e.target.value)} /></label></div> : <><h2>{character.name}</h2><p className="muted">{character.age}岁 · {character.note}</p></>}<RadarChart axes={character.radar}/>{record && <div className="character-record"><section><h3>人物关系</h3>{relationRows.map((row) => <div className="character-record-row" key={`${row.name}-${row.label}`}><b>{row.name}</b><span>{row.title} · {row.label}</span><small>亲近 {row.affinity} / 信任 {row.trust}</small></div>)}</section><section><h3>近年履历</h3>{historyRows.length ? historyRows.map((entry) => <div className="character-history-row" key={entry.id}><time>永和{entry.date.year}年{entry.date.month}月{entry.date.day}日</time><p>{entry.summary}</p></div>) : <p className="muted">尚无新交互记录。</p>}</section></div>}{isEmperor && <button className="identity-save" onClick={save}><Check /> 保存帝王信息</button>}</section></div>;
}
