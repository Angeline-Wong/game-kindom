import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, BookOpen, Crown, Gift, Heart, MessageCircle, MoveRight, Scale, ShieldAlert, Sparkles, X } from 'lucide-react';
import portraits from '../assets/character-portraits.png';
import detailPrototype from '../assets/person-detail-prototype.html?raw';
import edictPrototype from '../assets/edict-prototype.html?raw';
import favorPrototype from '../assets/favor-prototype.html?raw';
import consortRankPrototype from '../assets/consort-rank-prototype.html?raw';
import ministerRankPrototype from '../assets/minister-rank-prototype.html?raw';
import princeTitlePrototype from '../assets/prince-title-prototype.html?raw';
import ministerOfficePrototype from '../assets/minister-office-prototype.html?raw';
import { assignChildSchedule, proposeAppointment } from '../game/appointments';
import { confirmGiftEvent, createGiftEvent, type GiftState } from '../game/gifts';
import { getPersonActions } from '../game/personActions';
import { getScenePeople, type PeopleState, type ScenePersonType } from '../game/people';
import { getDemotionOptions, getPromotionOptions } from '../game/ranks';
import { assignResidence, getAvailableResidences, type ConsortRank, type Residence, type ResidenceState } from '../game/residences';
import { personLifeStatusLabel, type HistoryEntry, type PersonLifeStatus, type PersonRecord, type RelationshipRecord } from '../game/gameState';
import { CONSORT_HONORIFICS } from '../game/royalNames';

export interface PersonProfile { id: string; name: string; title: string; avatar: string; portrait: string; type: ScenePersonType; priority: number; dialogue?: string; }

const profiles: Record<string, PersonProfile> = {
  'minister-001': { id: 'minister-001', name: '沈砚之', title: '翰林学士', avatar: '沈', portrait: 'minister', type: 'MINISTER', priority: 1, dialogue: '臣已将本季经筵策问拟好，请陛下定夺题旨。' },
  'consort-001': { id: 'consort-001', name: '顾清漪', title: '贵人', avatar: '顾', portrait: 'consort', type: 'CONSORT', priority: 1, dialogue: '臣妾今日在庭中见到一名陌生宫女，似有要事相求。' },
  'prince-001': { id: 'prince-001', name: '萧景昀', title: '三皇子', avatar: '昀', portrait: 'prince', type: 'PRINCE', priority: 1, dialogue: '儿臣今日的策论，想请父皇亲自过目。' },
  empress: { id: 'empress', name: '沈皇后', title: '皇后', avatar: '沈', portrait: 'empress', type: 'CONSORT', priority: 1, dialogue: '六宫月例已核对完毕，尚有一笔御膳房支出需要陛下过目。' },
  attendant: { id: 'attendant', name: '值房内侍', title: '通传内侍', avatar: '内', portrait: 'minister', type: 'MINISTER', priority: 5 },
};

function profileForRecord(record: PersonRecord): PersonProfile {
  const preset = profiles[record.id];
  if (preset) return { ...preset, name: record.name, title: record.rank ?? record.title, dialogue: record.dialogue ?? preset.dialogue };
  const type: ScenePersonType = record.kind === 'MINISTER' ? 'MINISTER' : record.kind === 'CONSORT' ? 'CONSORT' : record.kind === 'DOWAGER' ? 'DOWAGER' : 'PRINCE';
  const portrait = record.kind === 'MINISTER' ? 'minister' : record.kind === 'CONSORT' ? 'consort' : record.kind === 'DOWAGER' ? 'empress' : 'prince';
  return { id: record.id, name: record.name, title: record.rank ?? record.title, avatar: record.name.slice(0, 1), portrait, type, priority: 2, dialogue: record.dialogue };
}

const sceneFallback: Record<string, PersonProfile[]> = { kuning: [profiles.empress] };
const consortCounts: Partial<Record<ConsortRank, number>> = { 皇后: 1, 皇贵妃: 0, 贵妃: 0, 妃: 0, 嫔: 0 };
export type PendingAction = { person: PersonProfile; actionId: string; title: string; body: string; confirmLabel: string; target?: string; commit?: 'RANK' | 'OFFICE' | 'TITLE' | 'RESIDENCE' };
type MoveStep = { person: PersonProfile; palace?: string };
type RankStep = { person: PersonProfile; mode: 'change'; target?: string };
type SelectionStep = { person: PersonProfile; kind: 'reward' | 'accountability' | 'transfer' | 'ennoble' };
type AdjustmentKind = 'consort-rank' | 'minister-rank' | 'prince-title' | 'minister-office';

function FramedModal({ variant, children, onClose }: { variant: 'dialogue' | 'notice'; children: React.ReactNode; onClose: () => void }) {
  return <div className="interaction-overlay"><section className={variant === 'dialogue' ? 'dialogue-options-modal' : 'selection-modal'}><div className={variant === 'dialogue' ? 'dialogue-options-content' : 'selection-modal-content'}>{children}</div><button type="button" className="dialogue-close" aria-label="关闭" onPointerDown={(event) => { event.preventDefault(); onClose(); }} onClick={onClose}><X /></button></section></div>;
}

function SceneDialogue({ person, onComplete, onRecord }: { person: PersonProfile; onComplete: () => void; onRecord: (summary: string) => void }) {
  const choices = [
    { text: '知道了，稍后细谈', speaker: '皇帝', reply: '此事朕已知晓，稍后再召你细谈。' },
    { text: '立刻询问详情', speaker: '皇帝', reply: '将你所见所闻，如实禀来。' },
  ];
  const selectChoice = (choice: typeof choices[number]) => {
    onRecord(`皇帝与${person.name}交谈，并答复：“${choice.text}”。`);
    onComplete();
  };
  const skipDialogue = () => {
    onRecord(`皇帝略过了与${person.name}的此次谈话。`);
    onComplete();
  };
  return <div className="interaction-overlay scene-dialogue-overlay"><main className="game-ui"><button className="skip-btn" onClick={skipDialogue}>跳过</button><div className="character-layer" aria-hidden="true"><div className="character-slot left"><div className={`character-placeholder ${person.portrait}`} style={{ backgroundImage: `url(${portraits})` }} /></div><div className="character-slot right"><div className="character-placeholder emperor" style={{ backgroundImage: `url(${portraits})` }} /></div></div><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">{person.name}</div><div className="dialogue-box"><p className="dialogue-text">{person.dialogue}</p></div></div></section><section className="choice-panel" aria-label="剧情选项">{choices.map((choice) => <button key={choice.text} className="choice-btn" onClick={() => selectChoice(choice)}>{choice.text}</button>)}</section></div></main></div>;
}

function PersonDetailPrototype({ person, title, record, history, relationships, people, onClose }: { person: PersonProfile; title: string; record: PersonRecord; history: HistoryEntry[]; relationships: RelationshipRecord[]; people: Record<string, PersonRecord>; onClose: () => void }) {
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'person-detail-close') onClose();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onClose]);
  const role = record.kind === 'MINISTER' ? '官职' : record.kind === 'CONSORT' ? '位份' : '身份';
  const metric = record.kind === 'MINISTER' ? '忠诚' : record.kind === 'CONSORT' ? '宠爱' : '学业';
  const metricValue = record.stats[metric] ?? record.stats['政治'] ?? record.stats['文才'] ?? 0;
  const related = relationships.filter((item) => item.personAId === record.id || item.personBId === record.id).map((item) => {
    const fromA = item.personAId === record.id;
    const other = people[fromA ? item.personBId : item.personAId];
    return { name: other?.name ?? '未知人物', title: other?.rank ?? other?.office ?? other?.title ?? '身份未明', label: fromA ? item.labelA : item.labelB, affinity: item.affinity, trust: item.trust, jealousy: item.jealousy ?? 0 };
  });
  const relatedHistory = history.filter((entry) => entry.personIds.includes(record.id)).slice(-30).reverse().map((entry) => ({ date: `永和${entry.date.year}年${entry.date.month}月${entry.date.day}日`, summary: entry.summary, important: ['CONSORT_RANK', 'OFFICIAL_GRADE', 'OFFICIAL_APPOINTMENT', 'ROYAL_TITLE', 'VISIT', 'BIRTH'].includes(entry.type) }));
  const stats = Object.entries(record.stats).slice(0, 6).map(([name, value]) => ({ name, value }));
  const dynamic = { role, title, location: record.residence ?? record.office ?? '宫中', metric, metricValue, children: record.children.length, status: record.status, statusLabel: personLifeStatusLabel(record.status), age: record.age, traits: record.traits, stats, related, history: relatedHistory, bio: `${record.traits.join('、') || '性情尚待观察'}。现为${record.honorific ?? ''}${record.rank ?? record.title}${record.office ? `，任职${record.office}` : ''}${record.residence ? `，居于${record.residence}` : ''}。` };
  const dynamicScript = `<script>(function(){const d=${JSON.stringify(dynamic)};const x=[...document.querySelectorAll('#detail .info-item')];const values=[['年龄',d.age+'岁'],[d.role,d.title],['所在',d.location],[d.metric,String(d.metricValue)],['状态',d.status],['子女',d.children+'人'],['性情',d.traits[0]||'平静'],['怀孕',d.status==='PREGNANT'?'是':'否']];x.forEach((e,i)=>{if(!values[i])return;e.childNodes[0].textContent=values[i][0];e.querySelector('b').textContent=values[i][1]});document.querySelector('.hero-info p').textContent=d.bio;const skills=[...document.querySelectorAll('#detail .skill')];skills.forEach((e,i)=>{const s=d.stats[i]||{name:'未识',value:0};e.querySelector('span').textContent=s.name;e.querySelector('b').textContent=s.value;e.querySelector('i').style.width=Math.max(0,Math.min(100,s.value))+'%'});const tags=document.querySelector('#detail .tags');tags.replaceChildren(...d.traits.map(t=>{const s=document.createElement('span');s.className='tag';s.textContent=t;return s}));const timeline=document.querySelector('#history .timeline');timeline.replaceChildren(...(d.history.length?d.history:[{date:'尚无记录',summary:'此人的新履历将在交互后写入。'}]).map(h=>{const e=document.createElement('div');e.className='event'+(h.important?' important':'');const time=document.createElement('time');time.textContent=h.date;const p=document.createElement('p');p.textContent=h.summary;e.append(time,p);return e}));const section=document.querySelector('#relation .section');section.querySelectorAll('.relation').forEach(e=>e.remove());(d.related.length?d.related:[{name:'暂无',title:'尚未建立公开关系',label:'未知',affinity:0,trust:0,jealousy:0}]).forEach(r=>{const row=document.createElement('div');row.className='relation';const avatar=document.createElement('div');avatar.className='mini-avatar';avatar.textContent=r.name.slice(0,1);const info=document.createElement('div');const b=document.createElement('b');b.textContent=r.name;const span=document.createElement('span');span.textContent=r.title+' · 亲近'+r.affinity+' · 信任'+r.trust+(r.jealousy?' · 嫉妒'+r.jealousy:'');info.append(b,span);const status=document.createElement('div');status.className='relation-status';status.textContent=r.label;row.append(avatar,info,status);section.append(row)});const attr=[...document.querySelectorAll('#attribute .info-item')];attr.forEach((e,i)=>{const s=d.stats[i]||{name:'未识',value:0};e.childNodes[0].textContent=s.name;e.querySelector('b').textContent=s.value});document.getElementById('backBtn').addEventListener('click',function(){window.parent.postMessage({type:'person-detail-close'},'*')});})();</script>`;
  const localizedDynamicScript = dynamicScript.replace("['状态',d.status]", "['状态',d.statusLabel]");
  const document = useMemo(() => detailPrototype
    .replaceAll('徐珍淑', person.name)
    .replace('贵妃 · 翊坤宫', title)
    .replace('<button class="back" id="backBtn">↩</button>', '<button class="back" id="backBtn" aria-label="关闭人物详情">×</button>')
    .replace('<div class="portrait">淑</div>', `<div class="portrait" style="background-image:url('${portraits}');background-size:500% 100%;background-position:${person.portrait === 'empress' ? '25%' : person.portrait === 'consort' ? '50%' : person.portrait === 'minister' ? '75%' : person.portrait === 'prince' ? '100%' : '0%'} 50%;color:transparent"></div>`)
    .replace('</head>', '<style>html,body,.phone,.veil{background:transparent!important}.page{background:transparent!important}</style></head>')
    .replace('</body>', `${localizedDynamicScript}</body>`), [person, title, localizedDynamicScript]);
  return <div className="prototype-overlay person-detail-overlay"><iframe title="人物详情" srcDoc={document} /></div>;
}

export function EdictPrototype({ action, onComplete, onClose }: { action: PendingAction; onComplete: () => void; onClose: () => void }) {
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.data?.type === 'edict-complete') onComplete(); };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onComplete]);
  const document = useMemo(() => edictPrototype
    .replace(/<div class="text" id="edictText">[\s\S]*?(?=\s*<div class="stamp-mark")/, `<div class="text" id="edictText"><p>奉天承运，皇帝制曰：</p><p>${action.body}</p><p>布告中外，咸使闻知。</p></div>\n\n        `)
    .replace('</head>', `<style>html,body{background:transparent!important}.stage{width:100%!important;height:100%!important;min-height:0!important;background:transparent!important}.mask{display:none!important}.scene{padding:18px 10px 34px!important}.edict{width:min(94%,394px)!important;max-height:calc(100% - 44px)!important}.edict.open{height:min(88%,660px)!important}.roller{height:48px!important}.paper{top:26px!important;bottom:26px!important;padding:38px 24px 118px!important}.stamp-trigger{bottom:70px!important}.start{display:none!important}.hint{bottom:5px!important;color:#f2d994!important;text-shadow:0 1px 4px #351b08}.complete{background:transparent!important}.complete-card{color:#6f211b!important;background:linear-gradient(#f8e9bd,#d8b765)!important;border-color:#9a6924!important;box-shadow:0 12px 28px rgba(54,27,7,.35)!important}.complete-card span{color:#765428!important}</style></head>`)
    .replace('</body>', `<script>let reported=false;new MutationObserver(function(){if(!reported&&document.getElementById('complete').classList.contains('show')){reported=true;setTimeout(function(){window.parent.postMessage({type:'edict-complete'},'*')},650)}}).observe(document.getElementById('complete'),{attributes:true,attributeFilter:['class']});setTimeout(function(){document.getElementById('startBtn').click()},80)<\/script></body>`), [action]);
  return <div className="prototype-overlay edict-overlay"><button className="prototype-close" aria-label="取消诏书" onClick={onClose}><X /></button><iframe title="圣旨颁布" srcDoc={document} /></div>;
}

export function FavorPrototype({ person, onClose }: { person: PersonProfile; onClose: () => void }) {
  const document = useMemo(() => favorPrototype
    .replace('今夜，帘幕轻落。', `今夜，${person.name}侍奉于前。`)
    .replace('</body>', `<button style="position:fixed;right:14px;top:14px;z-index:99;border:0;border-radius:50%;width:36px;height:36px;background:#e1ba61;color:#4c2710;font-size:22px" onclick="window.parent.postMessage({type:'favor-close'},'*')">×</button><script>(function(){let nextCount=0;const close=function(delay){setTimeout(function(){window.parent.postMessage({type:'favor-close'},'*')},delay||0)};document.getElementById('skipBtn').addEventListener('click',function(){close(280)});document.getElementById('nextBtn').addEventListener('click',function(){nextCount+=1;if(nextCount>=2)close(180)});})();<\/script></body>`), [person]);
  useEffect(() => { const receive = (event: MessageEvent) => { if (event.data?.type === 'favor-close') onClose(); }; window.addEventListener('message', receive); return () => window.removeEventListener('message', receive); }, [onClose]);
  return <div className="prototype-overlay"><iframe title="临幸过场" srcDoc={document} /></div>;
}

function AdjustmentPrototype({ kind, person, currentTitle, onComplete, onClose }: { kind: AdjustmentKind; person: PersonProfile; currentTitle: string; onComplete: (target: string) => void; onClose: () => void }) {
  const prototype = kind === 'consort-rank' ? consortRankPrototype : kind === 'minister-rank' ? ministerRankPrototype : kind === 'prince-title' ? princeTitlePrototype : ministerOfficePrototype;
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'adjustment-complete' && event.data.kind === kind && typeof event.data.target === 'string') onComplete(event.data.target);
      if (event.data?.type === 'adjustment-close' && event.data.kind === kind) onClose();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [kind, onClose, onComplete]);
  const document = useMemo(() => {
    let source = prototype.replaceAll('徐珍淑', person.name).replaceAll('张居正', person.name);
    if (kind === 'consort-rank') {
      source = source
        .replace(/const currentIndex = ranks\.findIndex\(item=>item\.name==="[^"]+"\);/, `const currentIndex = Math.max(0,ranks.findIndex(item=>item.name==="${currentTitle}"));`)
        .replace('let selectedIndex = currentIndex - 1;', 'let selectedIndex = currentIndex > 0 ? currentIndex - 1 : Math.min(ranks.length - 1, currentIndex + 1);')
        .replace('<div class="current-rank">贵人</div>', `<div class="current-rank">${currentTitle}</div>`)
        .replace('<b id="fromRank">贵人</b>', `<b id="fromRank">${currentTitle}</b>`);
    }
    if (kind === 'minister-rank') {
      const grades = ['正一品','从一品','正二品','从二品','正三品','从三品','正四品','从四品','正五品','从五品','正六品','从六品','正七品','从七品','正八品','从八品','正九品','从九品'];
      const rankData = grades.map((name, index) => ({ name, salary: 100 - index * 4, power: 100 - index * 5, favor: 90 - index * 3, home: index < 4 ? '中枢重臣' : index < 10 ? '京官要职' : '基层官职', special: index < 6 ? '可任部院堂官' : index < 12 ? '可任司官' : '可任属官' }));
      const officialTitle = grades.includes(currentTitle) ? currentTitle : '正七品';
      source = source
        .replaceAll('位份调整', '品阶调整')
        .replace('翊坤宫 · 宠爱92 · 皇嗣2 · 德行86', `${person.title} · 当前${officialTitle}`)
        .replace('<div class="current-rank">贵人</div>', `<div class="current-rank">${officialTitle}</div>`)
        .replace('<b id="fromRank">贵人</b>', `<b id="fromRank">${officialTitle}</b>`)
        .replace(/const ranks = \[[\s\S]*?\];/, `const ranks = ${JSON.stringify(rankData)};`)
        .replace(/const currentIndex = ranks\.findIndex\(item=>item\.name==="[^"]+"\);/, `const currentIndex = ranks.findIndex(item=>item.name==="${officialTitle}");`)
        .replace('let selectedIndex = currentIndex - 1;', 'let selectedIndex = currentIndex > 0 ? currentIndex - 1 : Math.min(ranks.length - 1, currentIndex + 1);')
        .replaceAll('宫权', '职权').replaceAll('居住权限', '任职资格').replaceAll('居所', '官职').replaceAll('晋封', '擢升');
    }
    if (kind === 'consort-rank' || kind === 'minister-rank') {
      source = source.replace('</body>', `<script>document.getElementById('executeBtn').addEventListener('click',function(){const target=ranks[selectedIndex];window.parent.postMessage({type:'adjustment-complete',kind:${JSON.stringify(kind)},target:target.name},'*')});document.getElementById('closeBtn').addEventListener('click',function(){window.parent.postMessage({type:'adjustment-close',kind:${JSON.stringify(kind)}},'*')});<\/script></body>`);
    }
    if (kind === 'minister-office') {
      source = source.replace('</body>', `<script>document.getElementById('executeBtn').addEventListener('click',function(){if(selected)window.parent.postMessage({type:'adjustment-complete',kind:'minister-office',target:selected.name},'*')});document.getElementById('closeBtn').addEventListener('click',function(){window.parent.postMessage({type:'adjustment-close',kind:'minister-office'},'*')});<\/script></body>`);
    }
    if (kind === 'prince-title') {
      source = source.replace(/name:\s*"[^"]+"/, `name: ${JSON.stringify(person.name)}`).replace('</body>', `<script>document.getElementById('executeBtn').addEventListener('click',function(){const target=makeFullTitle();if(target)window.parent.postMessage({type:'adjustment-complete',kind:'prince-title',target},'*')});document.getElementById('closeBtn').addEventListener('click',function(){window.parent.postMessage({type:'adjustment-close',kind:'prince-title'},'*')});<\/script></body>`);
    }
    return source.replace('</head>', '<style>html,body{background:transparent!important}</style></head>');
  }, [currentTitle, kind, person.name, person.title, prototype]);
  return <div className="prototype-overlay"><button className="prototype-close" aria-label="关闭调整" onClick={onClose}><X /></button><iframe title="人物调整" srcDoc={document} /></div>;
}

function ActionIcon({ actionId }: { actionId: string }) {
  const icons: Record<string, React.ReactNode> = {
    favor: <Crown />, companion: <Heart />, talk: <MessageCircle />, gift: <Gift />, move: <MoveRight />, promote: <ArrowUp />, demote: <ArrowUp />, 'promote-rank': <ArrowUp />, education: <BookOpen />, teacher: <BookOpen />, accountability: <ShieldAlert />, biography: <BookOpen />, 'appoint-duty': <Scale />,
  };
  return icons[actionId] ?? <Sparkles />;
}

export function ScenePeople({ sceneId, sceneTitle, peopleState, peopleRecords, history, relationships, requestedPersonId, onRequestedPersonHandled, onNotice, giftState, onGiftChange, residenceState, onResidenceChange, personRanks, onRankChange, onOfficeChange, onTitleChange, onHonorificChange, onRecordAction, onOpenTreasury, sixPalaceAssistants, onSetSixPalaceAssistant, onConsortVisit, onConsortCompanion, onPersonStatusChange, onRestorePerson, onInteractionChange }: {
  sceneId: string;
  sceneTitle: string;
  peopleState: PeopleState;
  peopleRecords: Record<string, PersonRecord>;
  history: HistoryEntry[];
  relationships: RelationshipRecord[];
  requestedPersonId?: string | null;
  onRequestedPersonHandled?: () => void;
  onNotice: (message: string) => void;
  giftState: GiftState;
  onGiftChange: (state: GiftState) => void;
  residenceState: ResidenceState;
  onResidenceChange: (state: ResidenceState) => void;
  personRanks: Record<string, string>;
  onRankChange: (personId: string, rank: string) => void;
  onOfficeChange: (personId: string, office: string) => void;
  onTitleChange: (personId: string, title: string) => void;
  onHonorificChange: (personId: string, honorific: string) => void;
  onRecordAction: (personId: string, type: string, summary: string) => void;
  onOpenTreasury: () => void;
  sixPalaceAssistants: string[];
  onSetSixPalaceAssistant: (personId: string) => void;
  onConsortVisit: (personId: string) => void;
  onConsortCompanion: (personId: string) => void;
  onPersonStatusChange: (personId: string, status: PersonLifeStatus, destination?: string) => void;
  onRestorePerson: (personId: string, rank?: string) => void;
  onInteractionChange?: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState<PersonProfile | null>(null);
  const [dialogue, setDialogue] = useState<PersonProfile | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [moveStep, setMoveStep] = useState<MoveStep | null>(null);
  const [rankStep, setRankStep] = useState<RankStep | null>(null);
  const [detailPerson, setDetailPerson] = useState<PersonProfile | null>(null);
  const [selectionStep, setSelectionStep] = useState<SelectionStep | null>(null);
  const [favorPerson, setFavorPerson] = useState<PersonProfile | null>(null);
  const [adjustment, setAdjustment] = useState<{ kind: AdjustmentKind; person: PersonProfile } | null>(null);
  const [honorificPerson, setHonorificPerson] = useState<PersonProfile | null>(null);
  const [restorePersonProfile, setRestorePersonProfile] = useState<PersonProfile | null>(null);
  const [customHonorific, setCustomHonorific] = useState('');
  const interactionBusy = Boolean(selected || dialogue || pending || moveStep || rankStep || detailPerson || selectionStep || favorPerson || adjustment || honorificPerson || restorePersonProfile);

  useEffect(() => {
    onInteractionChange?.(interactionBusy);
    return () => onInteractionChange?.(false);
  }, [interactionBusy, onInteractionChange]);
  const residents = useMemo(() => getScenePeople(sceneId, peopleState).map((person) => {
    const profile = profiles[person.id];
    if (profile) return { ...profile, name: person.name };
    const portrait = person.type === 'MINISTER' ? 'minister' : person.type === 'PRINCE' ? 'prince' : person.type === 'DOWAGER' ? 'empress' : 'consort';
    return { id: person.id, name: person.name, title: personRanks[person.id] ?? (person.type === 'PRINCE' ? '皇嗣' : person.type === 'MINISTER' ? '官员' : person.type === 'DOWAGER' ? '太后' : '妃嫔'), avatar: person.name.slice(0, 1), portrait, type: person.type, priority: person.priority } satisfies PersonProfile;
  }), [peopleState, personRanks, sceneId]);
  const list = residents.length ? residents : (sceneFallback[sceneId] ?? (sceneId.includes(':') ? [] : [profiles.attendant]));
  const baseTitle = (person: PersonProfile) => personRanks[person.id] ?? person.title;
  const displayTitle = (person: PersonProfile) => {
    const honorific = peopleRecords[person.id]?.honorific;
    return honorific && person.type === 'CONSORT' ? `${honorific}${baseTitle(person)}` : baseTitle(person);
  };
  const openPerson = (person: PersonProfile) => {
    onInteractionChange?.(true);
    person.dialogue && Math.random() < .3 ? setDialogue(person) : setSelected(person);
  };

  useEffect(() => {
    if (!requestedPersonId) return;
    const record = peopleRecords[requestedPersonId];
    if (record) setDetailPerson(profileForRecord(record));
    onRequestedPersonHandled?.();
  }, [onRequestedPersonHandled, peopleRecords, requestedPersonId]);

  const beginAction = (person: PersonProfile, actionId: string) => {
    onInteractionChange?.(true);
    setSelected(null);
    if (actionId === 'custody-visit') {
      onRecordAction(person.id, 'CUSTODY_VISIT', `皇帝前往探望受拘禁的${person.name}。`);
      onNotice(`陛下探望了${person.name}，其好感有所提升。`);
      return;
    }
    if (actionId === 'custody-execute') {
      onPersonStatusChange(person.id, 'DEAD');
      onNotice(`${person.name}已奉旨赐死，人物状态与履历已经更新。`);
      return;
    }
    if (actionId === 'custody-restore') {
      if (person.type === 'CONSORT') setRestorePersonProfile(person);
      else {
        onRestorePerson(person.id);
        onNotice(`${person.name}已获释，恢复正常活动。`);
      }
      return;
    }
    if (actionId === 'greet' || actionId === 'visit') {
      onRecordAction(person.id, actionId.toUpperCase(), `皇帝向${person.name}请安问候。`);
      onNotice(`陛下向${person.name}问候请安。`);
      return;
    }
    if (actionId === 'favor') { setFavorPerson(person); return; }
    if (actionId === 'companion') {
      onConsortCompanion(person.id);
      onNotice(`陛下留在${person.name}身边陪伴安胎，她的心情与信任有所提升。`);
      return;
    }
    if (actionId === 'talk') { setDialogue(person); return; }
    if (actionId === 'gift' || actionId === 'reward') { setSelectionStep({ person, kind: 'reward' }); return; }
    if (actionId === 'accountability') { setSelectionStep({ person, kind: 'accountability' }); return; }
    if (actionId === 'transfer') { setAdjustment({ person, kind: 'minister-office' }); return; }
    if (actionId === 'ennoble') { setAdjustment({ person, kind: 'prince-title' }); return; }
    if (actionId === 'move' && person.type === 'CONSORT') { setMoveStep({ person }); return; }
    if (actionId === 'change-rank') { setAdjustment({ person, kind: person.type === 'CONSORT' ? 'consort-rank' : 'minister-rank' }); return; }
    const copy: Record<string, Omit<PendingAction, 'person' | 'actionId'>> = {
      education: { title: '安排课业', body: `拟为${person.name}安排上午经史、午后骑射、晚间策论的日程。`, confirmLabel: '颁定课表' },
      encourage: { title: '嘉勉皇嗣', body: `拟赐言嘉勉${person.name}，其勤学与心情会受到影响。`, confirmLabel: '赐言嘉勉' },
      ennoble: { title: '分封皇嗣', body: `拟为${person.name}拟定封号与封地，需待宗人府核验礼制。`, confirmLabel: '交宗人府' },
    };
    const fallback = { title: '处理事务', body: `拟就${person.name}一事作出处理。`, confirmLabel: '确认办理' };
    setPending({ person, actionId, ...(copy[actionId] ?? fallback) });
  };

  const confirm = () => {
    if (!pending) return;
    const { person, actionId } = pending;
    if (pending.commit === 'RANK' && pending.target) {
      onRankChange(person.id, pending.target);
      onNotice(`${person.name}的位阶已改定为${pending.target}，圣旨与履历均已入档。`);
    } else if (pending.commit === 'OFFICE' && pending.target) {
      onOfficeChange(person.id, pending.target);
      onNotice(`${person.name}已奉旨调任${pending.target}。`);
    } else if (pending.commit === 'TITLE' && pending.target) {
      onTitleChange(person.id, pending.target);
      onNotice(`${person.name}已奉旨册封为${pending.target}。`);
    } else if (actionId === 'gift') {
      onGiftChange(confirmGiftEvent(createGiftEvent('gold-ingot', 1, person.id), giftState));
      onNotice(`赏赐已记入国库：黄金万两 x1，已赐予${person.name}。`);
    } else if (actionId === 'favor') {
      onConsortVisit(person.id);
      onNotice(`今夜将前往${person.name}处留宿，明日卯时结算结果。`);
    } else if (actionId === 'appoint-duty' || actionId === 'transfer') {
      const appointment = proposeAppointment(person.id, '经筵日讲');
      onNotice(`已拟${appointment.office}任命，待御批后记入${person.name}履历。`);
    } else if (actionId === 'education' || actionId === 'teacher') {
      const schedule = assignChildSchedule(person.id, '经史', '骑射', '策论');
      onRecordAction(person.id, 'EDUCATION', `皇帝为${person.name}排定课业：${schedule.morning}、${schedule.afternoon}、${schedule.evening}。`);
      onNotice(`已为${person.name}排定课业：${schedule.morning}、${schedule.afternoon}、${schedule.evening}。`);
    } else {
      onRecordAction(person.id, actionId.toUpperCase(), `${pending.title}：${pending.body}`);
      onNotice(`${pending.title}已记录。`);
    }
    setPending(null);
  };

  const availableRooms = moveStep ? getAvailableResidences(personRanks[moveStep.person.id] as ConsortRank ?? '贵人', residenceState) : [];
  const selectedResidence: Residence | undefined = moveStep?.palace ? availableRooms.find((room) => room.id === moveStep.palace) : undefined;
  const promotionOptions = rankStep ? [...getPromotionOptions(rankStep.person.type === 'MINISTER' ? 'MINISTER' : 'CONSORT', personRanks[rankStep.person.id] ?? (rankStep.person.type === 'MINISTER' ? '正五品' : rankStep.person.title), consortCounts), ...(rankStep.person.type === 'CONSORT' ? getDemotionOptions(personRanks[rankStep.person.id] ?? rankStep.person.title) : [])] : [];
  const isRankPromotion = rankStep?.target ? getPromotionOptions(rankStep.person.type === 'MINISTER' ? 'MINISTER' : 'CONSORT', personRanks[rankStep.person.id] ?? (rankStep.person.type === 'MINISTER' ? '正五品' : rankStep.person.title), consortCounts).some((option) => option.label === rankStep.target) : false;
  const rewardOptions = selectionStep?.kind === 'reward' ? ['御赐墨宝', '赏银百两', '赏金百两', '国库珍宝', ...(selectionStep.person.type === 'CONSORT' ? ['赏赐封号'] : []), ...(selectionStep.person.type === 'CONSORT' && ['皇后', '皇贵妃', '贵妃', '妃', '嫔'].includes(baseTitle(selectionStep.person)) ? ['协理六宫'] : [])] : [];
  const usedHonorifics = new Set(Object.values(peopleRecords).map((person) => person.honorific).filter(Boolean));
  const availableHonorifics = CONSORT_HONORIFICS.filter((honorific) => !usedHonorifics.has(honorific));
  const toggleHonorific = (honorific: string) => setCustomHonorific((current) => current.includes(honorific) ? current.replace(honorific, '') : current.length < 2 ? `${current}${honorific}` : current);
  const grantHonorific = (honorific: string) => {
    if (!honorificPerson) return;
    const normalized = honorific.trim().replace(/封号|皇贵妃|贵妃|妃|嫔|贵人|常在|答应|官女子/g, '').slice(0, 2);
    if (!normalized || usedHonorifics.has(normalized)) {
      onNotice(normalized ? '该封号已有人使用，请另择。' : '请输入一至两个汉字作为封号。');
      return;
    }
    onHonorificChange(honorificPerson.id, normalized);
    onNotice(`${honorificPerson.name}获赐“${normalized}”字封号，今后宫中以${normalized}${baseTitle(honorificPerson)}称之。`);
    setHonorificPerson(null);
    setCustomHonorific('');
  };
  const selectionOptions = selectionStep?.kind === 'reward' ? rewardOptions
    : selectionStep?.kind === 'accountability' ? selectionStep.person.type === 'CONSORT' ? ['严厉呵斥', '罚俸一月', '罚俸一年', '褫夺封号', '打入冷宫', '赐自尽'] : selectionStep.person.type === 'PRINCE' ? ['严厉呵斥', '禁足', '削爵', '打入宗人府', '赐死'] : ['严厉呵斥', '罚俸一月', '罚俸一年', '抄家落狱', '流放百里', '株连九族']
      : selectionStep?.kind === 'transfer' ? ['翰林侍讲', '礼部侍郎', '外放知府', '罢职待勘'] : ['贝子', '贝勒', '郡王', '亲王'];
  const chooseSelectionOption = (option: string) => {
    if (!selectionStep) return;
    if (option === '国库珍宝') {
      onRecordAction(selectionStep.person.id, 'REWARD', `${selectionStep.person.name}获准从国库择取珍宝。`);
      setSelectionStep(null);
      onOpenTreasury();
      return;
    }
    if (option === '赏赐封号') {
      setHonorificPerson(selectionStep.person);
      setCustomHonorific('');
      setSelectionStep(null);
      return;
    }
    if (option === '褫夺封号') {
      onHonorificChange(selectionStep.person.id, '');
      onNotice(`${selectionStep.person.name}的封号已被褫夺。`);
      setSelectionStep(null);
      return;
    }
    if (option === '协理六宫') onSetSixPalaceAssistant(selectionStep.person.id);
    if (option === '打入冷宫') {
      onPersonStatusChange(selectionStep.person.id, 'COLD_PALACE', 'cold-palace');
      onNotice(`${selectionStep.person.name}已被打入冷宫，此后不得擅离。`);
      setSelectionStep(null);
      return;
    }
    if (option === '打入宗人府' || option === '抄家落狱') {
      onPersonStatusChange(selectionStep.person.id, 'PRISON', 'clan');
      onNotice(`${selectionStep.person.name}已被收押，未经释放不得离开。`);
      setSelectionStep(null);
      return;
    }
    if (option === '赐自尽' || option === '赐死' || option === '株连九族') {
      onPersonStatusChange(selectionStep.person.id, 'DEAD');
      onNotice(`${selectionStep.person.name}已死，人物状态与履历已经更新。`);
      setSelectionStep(null);
      return;
    }
    if (option === '禁足') {
      onPersonStatusChange(selectionStep.person.id, 'CONFINED', peopleRecords[selectionStep.person.id]?.sceneId);
      onNotice(`${selectionStep.person.name}已被禁足，不得离开当前居所。`);
      setSelectionStep(null);
      return;
    }
    if (option === '流放百里') {
      onPersonStatusChange(selectionStep.person.id, 'OUTSIDE', 'world');
      onNotice(`${selectionStep.person.name}已被流放京外。`);
      setSelectionStep(null);
      return;
    }
    const isReward = option === '御赐墨宝' || option.startsWith('赏') || option === '协理六宫';
    onRecordAction(selectionStep.person.id, isReward ? 'REWARD' : 'ACCOUNTABILITY', `${selectionStep.person.name}${isReward ? '获赐' : '受处置'}${option}。`);
    onNotice(`${selectionStep.person.name}${isReward ? '已获' : '已执行'}${option}。`);
    setSelectionStep(null);
  };

  return <>
    <div className="people-dock" aria-label="场景人物">{list.slice(0, 4).map((person) => <button key={person.id} className="person-btn idle" onClick={() => openPerson(person)}><div className="portrait-wrap"><div className="portrait-glow" /><div className="portrait-frame"><div className={`portrait ${person.portrait}`} style={{ backgroundImage: `url(${portraits})` }} /></div><span className="rank-mark">{displayTitle(person)}</span>{person.dialogue && <span className="event-dot" />}<span className="click-wave" /><span className="spark" /></div><span className="person-name">{person.name}</span></button>)}</div>
    {dialogue && <SceneDialogue person={dialogue} onRecord={(summary) => onRecordAction(dialogue.id, 'DIALOGUE', summary)} onComplete={() => { const completed = dialogue; setDialogue(null); setSelected(completed); }} />}
    {selected && <div className="interaction-overlay"><section className="person-operation-page"><button className="dialogue-close" aria-label="关闭" onClick={() => setSelected(null)}><X /></button><div className={`person-full-art ${selected.portrait}`} style={{ backgroundImage: `url(${portraits})` }} /><button className="nameplate" aria-label={`查看${selected.name}详情`} onClick={() => setDetailPerson(selected)}>{selected.name}<small>{displayTitle(selected)} · 当前在{sceneTitle}</small></button><div className="interaction"> <div className="path" />{getPersonActions(selected.type, { pregnant: peopleRecords[selected.id]?.status === 'PREGNANT', custody: peopleRecords[selected.id]?.status === 'COLD_PALACE' ? 'COLD_PALACE' : peopleRecords[selected.id]?.status === 'PRISON' ? 'PRISON' : undefined }).map((action, index, actions) => { const step = actions.length > 1 ? 380 / (actions.length - 1) : 0; const curveOffset = Math.sin((index / Math.max(actions.length - 1, 1)) * Math.PI) * 13; return <button key={action.id} className="item" style={{ top: `${index * step}px`, left: `${curveOffset}px` }} onClick={() => beginAction(selected, action.id)}><span className="icon"><ActionIcon actionId={action.id} /></span><span className="tag">{action.label}</span></button>; })}</div></section></div>}
    {detailPerson && peopleRecords[detailPerson.id] && <PersonDetailPrototype person={detailPerson} title={`${displayTitle(detailPerson)} · ${sceneTitle}`} record={peopleRecords[detailPerson.id]} history={history} relationships={relationships} people={peopleRecords} onClose={() => setDetailPerson(null)} />}
    {moveStep && !moveStep.palace && <FramedModal variant="notice" onClose={() => setMoveStep(null)}><p className="dialogue-speaker">迁转居所</p><p className="dialogue-copy">先择定宫室。仅显示符合{displayTitle(moveStep.person)}身份且尚未占用的主殿或侧殿。</p><div className="choice-grid">{availableRooms.map((room) => <button key={room.id} onClick={() => setMoveStep({ ...moveStep, palace: room.id })}>{room.palace}<small>{room.room}</small></button>)}</div></FramedModal>}
    {moveStep && selectedResidence && <FramedModal variant="notice" onClose={() => setMoveStep(null)}><p className="dialogue-speaker">迁宫确认</p><p className="dialogue-copy">拟令{moveStep.person.name}迁居{selectedResidence.palace}{selectedResidence.room}，宫人、陈设与月例将随旨调整。</p><button className="dialogue-option primary-option" onClick={() => { onResidenceChange(assignResidence(moveStep.person.id, selectedResidence.id, residenceState)); onRecordAction(moveStep.person.id, 'RESIDENCE', `${moveStep.person.name}奉旨迁居${selectedResidence.palace}${selectedResidence.room}。`); onNotice(`${moveStep.person.name}已迁居${selectedResidence.palace}${selectedResidence.room}。`); setMoveStep(null); }}>降旨迁宫</button><button className="dialogue-option" onClick={() => setMoveStep({ person: moveStep.person })}>重选宫室</button></FramedModal>}
    {selectionStep && <FramedModal variant="notice" onClose={() => setSelectionStep(null)}><p className="dialogue-speaker">{selectionStep.kind === 'reward' ? '选择赏赐' : selectionStep.kind === 'accountability' ? '问责处置' : selectionStep.kind === 'transfer' ? '调任去向' : '选择爵位'}</p><p className="dialogue-copy">{selectionStep.kind === 'reward' ? `为${selectionStep.person.name}择定赏赐。` : selectionStep.kind === 'accountability' ? `为${selectionStep.person.name}选择具体处置。` : selectionStep.kind === 'transfer' ? `为${selectionStep.person.name}选择新的差事与去向。` : `为${selectionStep.person.name}拟定爵位与封号。`}</p><div className="choice-grid">{selectionOptions.map((option) => <button key={option} disabled={(option === '协理六宫' && !sixPalaceAssistants.includes(selectionStep.person.id) && sixPalaceAssistants.length >= 3) || (option === '褫夺封号' && !peopleRecords[selectionStep.person.id]?.honorific)} onClick={() => chooseSelectionOption(option)}>{option}</button>)}</div>{selectionStep.kind === 'ennoble' && <input className="title-input" aria-label="封号" placeholder="输入自定义封号" />}</FramedModal>}
    {honorificPerson && <FramedModal variant="notice" onClose={() => { setHonorificPerson(null); setCustomHonorific(''); }}><p className="dialogue-speaker">赏赐封号</p><p className="dialogue-copy">可为{honorificPerson.name}择一至两字，宫中已使用的完整封号不再列出。</p><div className="honorific-grid">{availableHonorifics.map((honorific) => <button key={honorific} className={customHonorific.includes(honorific) ? 'active' : ''} onClick={() => toggleHonorific(honorific)}>{honorific}</button>)}</div><div className="honorific-custom"><input value={customHonorific} onChange={(event) => setCustomHonorific(event.target.value.replace(/[^㐀-鿿]/g, '').slice(0, 2))} maxLength={2} placeholder="已选封号，也可自定义" aria-label="待赐封号" /><button disabled={!customHonorific} onClick={() => grantHonorific(customHonorific)}>确认赐号</button></div></FramedModal>}
    {restorePersonProfile && <FramedModal variant="notice" onClose={() => setRestorePersonProfile(null)}><p className="dialogue-speaker">恢复位份</p><p className="dialogue-copy">请选择恢复{restorePersonProfile.name}的位份。恢复后将重新安排符合位份的宫室。</p><div className="choice-grid">{['官女子', '答应', '常在', '贵人', '嫔', '妃', '贵妃', '皇贵妃'].map((rank) => <button key={rank} onClick={() => { onRestorePerson(restorePersonProfile.id, rank); onNotice(`${restorePersonProfile.name}已恢复为${rank}，并重新安排宫室。`); setRestorePersonProfile(null); }}>{rank}</button>)}</div></FramedModal>}
    {favorPerson && <FavorPrototype person={favorPerson} onClose={() => { onConsortVisit(favorPerson.id); onNotice(`今夜临幸${favorPerson.name}，相关结果将于明日卯时结算。`); setFavorPerson(null); }} />}
    {rankStep && !rankStep.target && <FramedModal variant="notice" onClose={() => setRankStep(null)}><p className="dialogue-speaker">{rankStep.person.type === 'CONSORT' ? '改定位分' : '改定品阶'}</p><p className="dialogue-copy">由陛下亲择目标{rankStep.person.type === 'CONSORT' ? '位分' : '品阶'}；上调满编位置不可选择。</p><div className="choice-grid">{promotionOptions.map((option) => <button key={option.label} disabled={!option.available} onClick={() => setRankStep({ ...rankStep, target: option.label })}>{option.label}<small>{option.note}</small></button>)}</div></FramedModal>}
    {rankStep?.target && <FramedModal variant="notice" onClose={() => setRankStep(null)}><p className="dialogue-speaker">改位确认</p><p className="dialogue-copy">拟将{rankStep.person.name}改为{rankStep.target}。相关品秩、俸禄、仪制与居所资格将一并更新。</p><button className="dialogue-option primary-option" onClick={() => { onRankChange(rankStep.person.id, rankStep.target!); if (isRankPromotion) setPending({ person: rankStep.person, actionId: 'rank-change', title: rankStep.person.type === 'CONSORT' ? '册封位分' : '擢升品阶', body: `今特将${rankStep.person.name}擢升为${rankStep.target}，钦此。`, confirmLabel: '奉旨用印' }); else onNotice(`${rankStep.person.name}已改为${rankStep.target}。`); setRankStep(null); }}>确认执行</button><button className="dialogue-option" onClick={() => setRankStep({ person: rankStep.person, mode: 'change' })}>重选位阶</button></FramedModal>}
    {pending && <EdictPrototype action={pending} onComplete={confirm} onClose={() => setPending(null)} />}
    {adjustment && <AdjustmentPrototype kind={adjustment.kind} person={adjustment.person} currentTitle={personRanks[adjustment.person.id] ?? adjustment.person.title} onComplete={(target) => { const person = adjustment.person; const kind = adjustment.kind; const oldTitle = kind === 'minister-office' ? peopleRecords[person.id]?.office ?? person.title : displayTitle(person); const title = kind === 'consort-rank' ? '册定位分' : kind === 'minister-rank' ? '整饬品秩' : kind === 'minister-office' ? '调任官职' : '册封爵位'; const body = kind === 'consort-rank' ? `奉皇帝谕旨：${person.name}在宫谨慎勤勉，著由${oldTitle}改定为${target}，其仪制、月例依新位分施行，钦此。` : kind === 'minister-rank' ? `奉皇帝谕旨：${person.name}任事勤慎，著由${oldTitle}改授${target}品秩，俸禄班次照例更定，钦此。` : kind === 'minister-office' ? `奉皇帝谕旨：${person.name}才具可用，著由${oldTitle}调任${target}，即日赴任，不得有误，钦此。` : `奉皇帝谕旨：皇嗣${person.name}敦敏恭谨，著册封为${target}，赐以相应仪仗岁俸，钦此。`; const commit = kind === 'minister-office' ? 'OFFICE' : kind === 'prince-title' ? 'TITLE' : 'RANK'; setAdjustment(null); setPending({ person, actionId: kind, title, body, confirmLabel: '奉旨用印', target, commit }); }} onClose={() => setAdjustment(null)} />}
  </>;
}
