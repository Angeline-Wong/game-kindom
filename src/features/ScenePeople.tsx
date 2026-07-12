import { useMemo, useState } from 'react';
import { ArrowUp, BookOpen, Crown, Gift, MessageCircle, MoveRight, Scale, ShieldAlert, Sparkles, X } from 'lucide-react';
import portraits from '../assets/character-portraits.png';
import { assignChildSchedule, proposeAppointment } from '../game/appointments';
import { scheduleConsortVisit } from '../game/consortEvents';
import { confirmGiftEvent, createGiftEvent, type GiftState } from '../game/gifts';
import { getPersonActions } from '../game/personActions';
import { getScenePeople, type PeopleState, type ScenePersonType } from '../game/people';
import { getDemotionOptions, getPromotionOptions } from '../game/ranks';
import { assignResidence, getAvailableResidences, type ConsortRank, type Residence, type ResidenceState } from '../game/residences';

interface PersonProfile { id: string; name: string; title: string; avatar: string; portrait: string; type: ScenePersonType; priority: number; dialogue?: string; }

const profiles: Record<string, PersonProfile> = {
  'minister-001': { id: 'minister-001', name: '沈砚之', title: '翰林学士', avatar: '沈', portrait: 'minister', type: 'MINISTER', priority: 1, dialogue: '臣已将本季经筵策问拟好，请陛下定夺题旨。' },
  'consort-001': { id: 'consort-001', name: '顾清漪', title: '贵人', avatar: '顾', portrait: 'consort', type: 'CONSORT', priority: 1, dialogue: '臣妾今日在庭中见到一名陌生宫女，似有要事相求。' },
  'prince-001': { id: 'prince-001', name: '萧景昀', title: '三皇子', avatar: '昀', portrait: 'prince', type: 'PRINCE', priority: 1, dialogue: '儿臣今日的策论，想请父皇亲自过目。' },
  empress: { id: 'empress', name: '沈皇后', title: '皇后', avatar: '沈', portrait: 'empress', type: 'CONSORT', priority: 1, dialogue: '六宫月例已核对完毕，尚有一笔御膳房支出需要陛下过目。' },
  attendant: { id: 'attendant', name: '值房内侍', title: '通传内侍', avatar: '内', portrait: 'minister', type: 'MINISTER', priority: 5 },
};

const sceneFallback: Record<string, PersonProfile[]> = { kuning: [profiles.empress], garden: [profiles['consort-001']] };
const consortCounts: Partial<Record<ConsortRank, number>> = { 皇后: 1, 皇贵妃: 0, 贵妃: 0, 妃: 0, 嫔: 0 };
type PendingAction = { person: PersonProfile; actionId: string; title: string; body: string; confirmLabel: string };
type MoveStep = { person: PersonProfile; palace?: string };
type RankStep = { person: PersonProfile; mode: 'promote' | 'demote'; target?: string };

function FramedModal({ variant, children, onClose }: { variant: 'dialogue' | 'notice'; children: React.ReactNode; onClose: () => void }) {
  return <div className="interaction-overlay"><section className={variant === 'dialogue' ? 'dialogue-options-modal' : 'selection-modal'}><button className="dialogue-close" aria-label="关闭" onClick={onClose}><X /></button><div className={variant === 'dialogue' ? 'dialogue-options-content' : 'selection-modal-content'}>{children}</div></section></div>;
}

function ActionIcon({ actionId }: { actionId: string }) {
  const icons: Record<string, React.ReactNode> = {
    favor: <Crown />, talk: <MessageCircle />, gift: <Gift />, move: <MoveRight />, promote: <ArrowUp />, demote: <ArrowUp />, 'promote-rank': <ArrowUp />, education: <BookOpen />, teacher: <BookOpen />, accountability: <ShieldAlert />, biography: <BookOpen />, 'appoint-duty': <Scale />,
  };
  return icons[actionId] ?? <Sparkles />;
}

export function ScenePeople({ sceneId, sceneTitle, peopleState, onNotice, giftState, onGiftChange, residenceState, onResidenceChange, personRanks, onRankChange }: {
  sceneId: string;
  sceneTitle: string;
  peopleState: PeopleState;
  onNotice: (message: string) => void;
  giftState: GiftState;
  onGiftChange: (state: GiftState) => void;
  residenceState: ResidenceState;
  onResidenceChange: (state: ResidenceState) => void;
  personRanks: Record<string, string>;
  onRankChange: (personId: string, rank: string) => void;
}) {
  const [selected, setSelected] = useState<PersonProfile | null>(null);
  const [dialogue, setDialogue] = useState<PersonProfile | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [moveStep, setMoveStep] = useState<MoveStep | null>(null);
  const [rankStep, setRankStep] = useState<RankStep | null>(null);
  const [detailPerson, setDetailPerson] = useState<PersonProfile | null>(null);
  const residents = useMemo(() => getScenePeople(sceneId, peopleState).map((person) => profiles[person.id]).filter(Boolean), [peopleState, sceneId]);
  const list = residents.length ? residents : (sceneFallback[sceneId] ?? [profiles.attendant]);
  const displayTitle = (person: PersonProfile) => person.type === 'CONSORT' ? personRanks[person.id] ?? person.title : person.title;
  const openPerson = (person: PersonProfile) => person.dialogue ? setDialogue(person) : setSelected(person);

  const beginAction = (person: PersonProfile, actionId: string) => {
    setSelected(null);
    if (actionId === 'move' && person.type === 'CONSORT') { setMoveStep({ person }); return; }
    if ((actionId === 'promote' && person.type === 'CONSORT') || (actionId === 'promote-rank' && person.type === 'MINISTER')) { setRankStep({ person, mode: 'promote' }); return; }
    if (actionId === 'demote' && person.type === 'CONSORT') { setRankStep({ person, mode: 'demote' }); return; }
    const copy: Record<string, Omit<PendingAction, 'person' | 'actionId'>> = {
      favor: { title: '今夜留宿', body: `今夜前往${displayTitle(person)}${person.name}处留宿。此处已是宫中相见，无需再经敬事房翻牌。`, confirmLabel: '传旨留宿' },
      gift: { title: '御赐赏物', body: `拟从国库取出黄金万两一对，赏给${displayTitle(person)}${person.name}。`, confirmLabel: '赐下赏物' },
      transfer: { title: '调任差事', body: `拟调遣${person.name}另任差事，旨意一经发出便记入官员履历。`, confirmLabel: '拟定任命' },
      'appoint-duty': { title: '任命差事', body: `拟命${person.name}暂署经筵日讲，待御批后生效。`, confirmLabel: '降旨任命' },
      education: { title: '安排课业', body: `拟为${person.name}安排上午经史、午后骑射、晚间策论的日程。`, confirmLabel: '颁定课表' },
      teacher: { title: '指定名师', body: `拟为${person.name}指定翰林讲官，课业将自明日起执行。`, confirmLabel: '指定讲官' },
      biography: { title: '人物履历', body: `${person.name}的个人经历、属性与近月动向已整理入册。`, confirmLabel: '阅毕' },
      talk: { title: '宫中闲话', body: `${displayTitle(person)}${person.name}在此等候，或有近况与心意可供探问。`, confirmLabel: '细听其言' },
      encourage: { title: '嘉勉皇嗣', body: `拟赐言嘉勉${person.name}，其勤学与心情会受到影响。`, confirmLabel: '赐言嘉勉' },
      ennoble: { title: '分封皇嗣', body: `拟为${person.name}拟定封号与封地，需待宗人府核验礼制。`, confirmLabel: '交宗人府' },
      accountability: { title: '问责查办', body: `拟对${person.name}所涉事务启动问责，结果会影响忠诚与仕途。`, confirmLabel: '立案查办' },
    };
    const fallback = { title: '处理事务', body: `拟就${person.name}一事作出处理。`, confirmLabel: '确认办理' };
    setPending({ person, actionId, ...(copy[actionId] ?? fallback) });
  };

  const confirm = () => {
    if (!pending) return;
    const { person, actionId } = pending;
    if (actionId === 'gift') {
      onGiftChange(confirmGiftEvent(createGiftEvent('gold-ingot', 1, person.id), giftState));
      onNotice(`赏赐已记入国库：黄金万两 x1，已赐予${person.name}。`);
    } else if (actionId === 'favor') {
      scheduleConsortVisit({ source: 'PALACE', consortId: person.id });
      onNotice(`今夜将前往${person.name}处留宿，明日卯时结算结果。`);
    } else if (actionId === 'appoint-duty' || actionId === 'transfer') {
      const appointment = proposeAppointment(person.id, '经筵日讲');
      onNotice(`已拟${appointment.office}任命，待御批后记入${person.name}履历。`);
    } else if (actionId === 'education' || actionId === 'teacher') {
      const schedule = assignChildSchedule(person.id, '经史', '骑射', '策论');
      onNotice(`已为${person.name}排定课业：${schedule.morning}、${schedule.afternoon}、${schedule.evening}。`);
    } else onNotice(`${pending.title}已记录。`);
    setPending(null);
  };

  const availableRooms = moveStep ? getAvailableResidences(personRanks[moveStep.person.id] as ConsortRank ?? '贵人', residenceState) : [];
  const selectedResidence: Residence | undefined = moveStep?.palace ? availableRooms.find((room) => room.id === moveStep.palace) : undefined;
  const promotionOptions = rankStep ? rankStep.mode === 'demote' ? getDemotionOptions(personRanks[rankStep.person.id] ?? rankStep.person.title) : getPromotionOptions(rankStep.person.type === 'MINISTER' ? 'MINISTER' : 'CONSORT', personRanks[rankStep.person.id] ?? (rankStep.person.type === 'MINISTER' ? '正五品' : rankStep.person.title), consortCounts) : [];

  return <>
    <div className="scene-people" aria-label="场景人物">{list.slice(0, 4).map((person) => <button key={person.id} className="scene-person" onClick={() => openPerson(person)}><span className={`sprite-portrait ${person.portrait}`} style={{ backgroundImage: `url(${portraits})` }} aria-hidden="true" /><b>{person.name}</b><small>{displayTitle(person)}</small>{person.dialogue && <i />}</button>)}</div>
    {dialogue && <FramedModal variant="dialogue" onClose={() => setDialogue(null)}><p className="dialogue-speaker">{dialogue.name}</p><p className="dialogue-copy">{dialogue.dialogue}</p><button className="dialogue-option" onClick={() => { setDialogue(null); setSelected(dialogue); }}>知道了，稍后细谈</button><button className="dialogue-option" onClick={() => { setDialogue(null); setSelected(dialogue); }}>立刻询问详情</button></FramedModal>}
    {selected && <div className="interaction-overlay"><section className="person-operation-page"><button className="dialogue-close" aria-label="关闭" onClick={() => setSelected(null)}><X /></button><div className={`person-full-art ${selected.portrait}`} style={{ backgroundImage: `url(${portraits})` }} /><button className="nameplate" aria-label={`查看${selected.name}详情`} onClick={() => setDetailPerson(selected)}>{selected.name}<small>{displayTitle(selected)} · 当前在{sceneTitle}</small></button><div className="interaction"> <div className="path" />{getPersonActions(selected.type).map((action, index, actions) => { const step = actions.length > 1 ? 380 / (actions.length - 1) : 0; const curveOffset = Math.sin((index / Math.max(actions.length - 1, 1)) * Math.PI) * 13; return <button key={action.id} className="item" style={{ top: `${index * step}px`, left: `${curveOffset}px` }} onClick={() => beginAction(selected, action.id)}><span className="icon"><ActionIcon actionId={action.id} /></span><span className="tag">{action.label}</span></button>; })}</div></section></div>}
    {detailPerson && <div className="interaction-overlay"><section className="person-detail-sheet"><button className="dialogue-close" aria-label="关闭人物详情" onClick={() => setDetailPerson(null)}><X /></button><div className={`detail-portrait ${detailPerson.portrait}`} style={{ backgroundImage: `url(${portraits})` }} /><div className="detail-profile"><h2>{detailPerson.name}</h2><p>{displayTitle(detailPerson)} · {sceneTitle}</p><dl><div><dt>年龄</dt><dd>22 岁</dd></div><div><dt>恩宠</dt><dd>68</dd></div><div><dt>健康</dt><dd>良好</dd></div><div><dt>状态</dt><dd>在宫</dd></div></dl><p className="detail-note">近来常于庭院停留，宫人来往比平日频繁。</p></div></section></div>}
    {moveStep && !moveStep.palace && <FramedModal variant="notice" onClose={() => setMoveStep(null)}><p className="dialogue-speaker">迁转居所</p><p className="dialogue-copy">先择定宫室。仅显示符合{displayTitle(moveStep.person)}身份且尚未占用的主殿或侧殿。</p><div className="choice-grid">{availableRooms.map((room) => <button key={room.id} onClick={() => setMoveStep({ ...moveStep, palace: room.id })}>{room.palace}<small>{room.room}</small></button>)}</div></FramedModal>}
    {moveStep && selectedResidence && <FramedModal variant="notice" onClose={() => setMoveStep(null)}><p className="dialogue-speaker">迁宫确认</p><p className="dialogue-copy">拟令{moveStep.person.name}迁居{selectedResidence.palace}{selectedResidence.room}，宫人、陈设与月例将随旨调整。</p><button className="dialogue-option primary-option" onClick={() => { onResidenceChange(assignResidence(moveStep.person.id, selectedResidence.id, residenceState)); onNotice(`${moveStep.person.name}已迁居${selectedResidence.palace}${selectedResidence.room}。`); setMoveStep(null); }}>降旨迁宫</button><button className="dialogue-option" onClick={() => setMoveStep({ person: moveStep.person })}>重选宫室</button></FramedModal>}
    {rankStep && !rankStep.target && <FramedModal variant="notice" onClose={() => setRankStep(null)}><p className="dialogue-speaker">{rankStep.mode === 'demote' ? '降位处置' : rankStep.person.type === 'CONSORT' ? '册封位分' : '官员升品'}</p><p className="dialogue-copy">由陛下亲择目标{rankStep.person.type === 'CONSORT' ? '位分' : '品阶'}；满编位置不可册封。</p><div className="choice-grid">{promotionOptions.map((option) => <button key={option.label} disabled={!option.available} onClick={() => setRankStep({ ...rankStep, target: option.label })}>{option.label}<small>{option.note}</small></button>)}</div></FramedModal>}
    {rankStep?.target && <FramedModal variant="notice" onClose={() => setRankStep(null)}><p className="dialogue-speaker">{rankStep.mode === 'demote' ? '降位确认' : '册封确认'}</p><p className="dialogue-copy">拟将{rankStep.person.name}{rankStep.mode === 'demote' ? '降为' : '擢升为'}{rankStep.target}。相关品秩、俸禄、仪制与居所资格将一并更新。</p><button className="dialogue-option primary-option" onClick={() => { onRankChange(rankStep.person.id, rankStep.target!); onNotice(`${rankStep.person.name}已${rankStep.mode === 'demote' ? '降为' : '奉旨擢升为'}${rankStep.target}。`); setRankStep(null); }}>确认执行</button><button className="dialogue-option" onClick={() => setRankStep({ person: rankStep.person, mode: rankStep.mode })}>重选位阶</button></FramedModal>}
    {pending && <FramedModal variant="notice" onClose={() => setPending(null)}><p className="dialogue-speaker">{pending.title}</p><p className="dialogue-copy">{pending.body}</p><button className="dialogue-option primary-option" onClick={confirm}>{pending.confirmLabel}</button><button className="dialogue-option" onClick={() => setPending(null)}>暂缓处理</button></FramedModal>}
  </>;
}
