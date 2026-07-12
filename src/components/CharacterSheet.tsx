import { Check, X } from 'lucide-react';
import { useState } from 'react';
import type { Character } from '../game/characters';
import { RadarChart } from './RadarChart';

export function CharacterSheet({ character, onClose, onUpdate }: { character: Character; onClose: () => void; onUpdate?: (character: Character) => void }) {
  const [name, setName] = useState(character.name);
  const [title, setTitle] = useState(character.title);
  const [avatar, setAvatar] = useState(character.avatar);
  const isEmperor = character.kind === 'emperor';
  const save = () => { onUpdate?.({ ...character, name, title, avatar }); onClose(); };
  return <div className="sheet-backdrop" onClick={onClose}><section className="sheet emperor-sheet" onClick={(e) => e.stopPropagation()} aria-label="人物详情"><button className="icon-btn close" aria-label="关闭" onClick={onClose}><X/></button><div className="portrait">{isEmperor ? avatar : character.avatar}</div><p className="eyebrow">{isEmperor ? '帝王档案' : character.title}</p>{isEmperor ? <div className="identity-editor"><label>名讳<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>年号<input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>头像<input value={avatar} maxLength={1} onChange={(e) => setAvatar(e.target.value)} /></label></div> : <><h2>{character.name}</h2><p className="muted">{character.age}岁 · {character.note}</p></>}<RadarChart axes={character.radar}/>{isEmperor && <button className="identity-save" onClick={save}><Check /> 保存帝王信息</button>}</section></div>;
}
