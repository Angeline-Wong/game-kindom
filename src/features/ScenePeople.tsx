import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

type PersonType = 'MINISTER' | 'PRINCE' | 'CONSORT';
interface ScenePerson { id: string; name: string; title: string; avatar: string; type: PersonType; priority: number; dialogue?: string; }

const people: Record<string, ScenePerson[]> = {
  wenhua: [{ id: 'hanlin', name: '沈砚之', title: '翰林学士', avatar: '沈', type: 'MINISTER', priority: 1, dialogue: '臣已将本季经筵策问拟好，请陛下定夺题旨。' }, { id: 'prince', name: '萧景明', title: '三皇子', avatar: '景', type: 'PRINCE', priority: 2 }],
  'inner-palace': [{ id: 'consort', name: '顾清漪', title: '容妃', avatar: '顾', type: 'CONSORT', priority: 1, dialogue: '臣妾今日在庭中见到一名陌生宫女，似有要事相求。' }, { id: 'princess', name: '萧令仪', title: '长公主', avatar: '仪', type: 'PRINCE', priority: 3 }],
  kuning: [{ id: 'empress', name: '沈皇后', title: '皇后', avatar: '沈', type: 'CONSORT', priority: 1, dialogue: '六宫月例已核对完毕，尚有一笔御膳房支出需要陛下过目。' }],
  garden: [{ id: 'consort-garden', name: '顾清漪', title: '容妃', avatar: '顾', type: 'CONSORT', priority: 1, dialogue: '春寒未尽，臣妾想在御花园多留片刻。' }],
};

const fallback: ScenePerson[] = [{ id: 'attendant', name: '值房内侍', title: '通传内侍', avatar: '内', type: 'MINISTER', priority: 5 }];

export function ScenePeople({ sceneId, sceneTitle }: { sceneId: string; sceneTitle: string }) {
  const list = useMemo(() => (people[sceneId] ?? fallback).slice().sort((a, b) => a.priority - b.priority), [sceneId]);
  const [selected, setSelected] = useState<ScenePerson | null>(null);
  const [dialogue, setDialogue] = useState<ScenePerson | null>(null);
  const select = (person: ScenePerson) => person.dialogue ? setDialogue(person) : setSelected(person);
  const actions = selected?.type === 'CONSORT' ? ['宠幸', '交谈', '晋升', '赏赐', '搬迁'] : selected?.type === 'PRINCE' ? ['教育', '鼓励', '封爵', '赏赐', '批评'] : ['查看履历', '关注', '调任', '升品', '赏赐'];

  return <>
    <div className="scene-people" aria-label="场景人物">{list.slice(0, 4).map((person) => <button key={person.id} className="scene-person" onClick={() => select(person)}><span>{person.avatar}</span><b>{person.name}</b><small>{person.title}</small>{person.dialogue && <i />}</button>)}{list.length > 4 && <button className="scene-person more-person">更多</button>}</div>
    {dialogue && <div className="interaction-overlay"><section className="dialogue-card"><button className="dialogue-close" aria-label="关闭对话" onClick={() => setDialogue(null)}><X /></button><p className="dialogue-speaker">{dialogue.name}</p><p className="dialogue-copy">{dialogue.dialogue}</p><button className="dialogue-option" onClick={() => { setDialogue(null); setSelected(dialogue); }}>知道了，稍后细谈</button><button className="dialogue-option" onClick={() => { setDialogue(null); setSelected(dialogue); }}>立刻询问详情</button></section></div>}
    {selected && <div className="interaction-overlay"><section className="person-detail-card"><button className="dialogue-close" aria-label="关闭人物详情" onClick={() => setSelected(null)}><X /></button><div className="person-large-avatar">{selected.avatar}</div><div><p className="dialogue-speaker">{selected.name}</p><p className="person-status">{selected.title} · 当前在{sceneTitle}</p></div><div className="person-actions">{actions.map((action) => <button key={action} onClick={() => setSelected(null)}>{action}</button>)}</div></section></div>}
  </>;
}
