import { isPersonAlive } from '../game/person';
import { createPalaceCase } from '../game/palaceCases';
import { PalaceCasesPanel } from './PalaceCases';
import { useOptionalGameState } from '../game/GameStateContext';
import { recordDialogueChoice, resolveEffectTarget } from '../game/palaceEffects';
import { pickPalaceDialogue } from '../game/palaceEvents';
import { consortVisitEligibility, type PunishmentRequest } from '../game/palacePunishments';
import { PalacePunishmentDialog } from '../components/PalacePunishmentDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Crown, Gift, Heart, MessageCircle, MoveRight, Scale, ShieldAlert, Sparkles, X } from 'lucide-react';
import portraits from '../assets/character-portraits.png';
import detailPrototype from '../assets/person-detail-prototype.html?raw';
import favorPrototype from '../assets/favor-prototype.html?raw';
import consortRankPrototype from '../assets/consort-rank-prototype.html?raw';
import ministerRankPrototype from '../assets/minister-rank-prototype.html?raw';
import princeTitlePrototype from '../assets/prince-title-prototype.html?raw';
import ministerOfficePrototype from '../assets/minister-office-prototype.html?raw';
import edictPrototype from '../assets/edict-prototype.html?raw';
import { proposeAppointment } from '../game/appointments';
import { getPersonActions } from '../game/personActions';
import { getAvailableRoyalActions, summonRoyal } from '../game/royalRoster';
import { getScenePeople, movePerson, type PeopleState, type ScenePersonType } from '../game/people';
import { getDemotionOptions, getPromotionOptions, isConsortRankAvailable } from '../game/ranks';
import { assignResidence, getAvailableResidences, type ConsortRank, type Residence, type ResidenceState } from '../game/residences';
import { personLifeStatusLabel, type HistoryEffect, type HistoryEntry, type PersonKind, type PersonLifeStatus, type PersonRecord, type RelationshipRecord } from '../game/gameState';
import { CONSORT_HONORIFICS, royalIdentityTitle } from '../game/royalNames';
import { personPortraitUrl, emperorPortraitUrls } from '../game/personPortraits';
import { royalTitleEligibility } from '../game/royalTitles';
import { ApprovedPersonDetail } from '../components/ApprovedPersonDetail';
import { getHeirChoices, getHeirEducationStage, getHeirInteractionOutcome, type HeirChoice, type HeirInteractionKind } from '../game/heirEducation';
import { pickDialogueForPerson, type DialogueScene, type DialogueChoice } from '../game/dialogueLibrary';
import { buildDialogueHistory, type DialogueHistoryChoice } from '../game/dialogueHistory';

export interface PersonProfile { id: string; name: string; title: string; avatar: string; portrait: string; portraitUrl?: string; type: ScenePersonType; priority: number; dialogue?: string; dialogueScene?: DialogueScene; }

const profiles: Record<string, PersonProfile> = {
  'minister-001': { id: 'minister-001', name: '沈砚之', title: '翰林学士', avatar: '沈', portrait: 'minister', type: 'MINISTER', priority: 1, dialogue: '臣已将本季经筵策问拟好，请陛下定夺题旨。' },
  'consort-001': { id: 'consort-001', name: '顾清漪', title: '贵人', avatar: '顾', portrait: 'consort', type: 'CONSORT', priority: 1, dialogue: '臣妾今日在庭中见到一名陌生宫女，似有要事相求。' },
  'prince-001': { id: 'prince-001', name: '萧景昀', title: '三皇子', avatar: '昀', portrait: 'prince', type: 'PRINCE', priority: 1, dialogue: '儿臣今日的策论，想请父皇亲自过目。' },
  empress: { id: 'empress', name: '沈清和', title: '皇后', avatar: '沈', portrait: 'empress', type: 'CONSORT', priority: 1, dialogue: '六宫月例已核对完毕，尚有一笔御膳房支出需要陛下过目。' },
  attendant: { id: 'attendant', name: '值房内侍', title: '通传内侍', avatar: '内', portrait: 'minister', type: 'EUNUCH', priority: 5 },
};

function profileForRecord(record: PersonRecord): PersonProfile {
  const preset = profiles[record.id];
  const portraitUrl = personPortraitUrl(record);
  if (preset) return { ...preset, name: record.name, title: royalIdentityTitle(record), portraitUrl, dialogue: record.dialogue ?? preset.dialogue };
  const type: ScenePersonType = record.kind === 'MINISTER' ? 'MINISTER' : record.kind === 'CONSORT' ? 'CONSORT' : record.kind === 'DOWAGER' ? 'DOWAGER' : record.kind === 'EUNUCH' ? 'EUNUCH' : record.kind === 'PRINCESS' ? 'PRINCESS' : 'PRINCE';
  const portrait = record.kind === 'MINISTER' || record.kind === 'EUNUCH' ? 'minister' : record.kind === 'CONSORT' ? 'consort' : record.kind === 'DOWAGER' ? 'dowager' : record.kind === 'NOBLE' ? 'noble' : 'prince';
  return { id: record.id, name: record.name, title: royalIdentityTitle(record), avatar: record.name.slice(0, 1), portrait, portraitUrl, type, priority: 2, dialogue: record.dialogue };
}

const sceneFallback: Record<string, PersonProfile[]> = { kuning: [profiles.empress] };

export type PendingAction = { person: PersonProfile; actionId: string; title: string; body: string; confirmLabel: string; target?: string; commit?: 'RANK' | 'OFFICE' | 'TITLE' | 'RESIDENCE' };
type MoveStep = { person: PersonProfile; palace?: string };
type RankStep = { person: PersonProfile; mode: 'change'; target?: string };
type SelectionStep = { person: PersonProfile; kind: 'reward' | 'accountability' | 'transfer' | 'ennoble' };
type AdjustmentKind = 'consort-rank' | 'minister-rank' | 'prince-title' | 'minister-office';

function edictPersonLabel(record: PersonRecord | undefined, rank: string, personName: string, office?: string) {
  const honorific = record?.honorific ?? '';
  const position = office ?? record?.office ?? (record?.kind === 'MINISTER' ? record.title : rank);
  return `${honorific}${position}${personName}`;
}

function buildConsortRankEdict(record: PersonRecord | undefined, personName: string, currentRank: string, target: string, demotion: boolean) {
  const identity = edictPersonLabel(record, currentRank, personName);
  if (demotion) return [
    '朕惟六宫之治，位序当明，赏罚不可失度。',
    `今有${identity}，因失仪失德，不宜仍居原位。`,
    `著由${currentRank}降为${target}，收回相应宫权与仪制，月例依新位份施行，迁居符合新位份的宫殿。`,
  ].join('\n');
  const honorificNotice = record?.honorific ? '原有封号仍旧，' : '';
  return [
    '朕惟六宫之治，在于敬慎柔嘉，内助有仪。',
    `今有${identity}，温恭淑慎，侍奉勤谨，宜加宠秩。`,
    `特晋封为${target}，${honorificNotice}迁居符合新位份的宫殿，月例仪制依新位份施行。`,
  ].join('\n');
}

function buildMinisterRankEdict(record: PersonRecord | undefined, personName: string, currentRank: string, target: string, demotion: boolean) {
  const identity = edictPersonLabel(record, currentRank, personName, record?.office ?? record?.title);
  if (demotion) return [
    '朕惟治国之道，在于选贤任能，明赏罚，定纲纪。',
    `今有${identity}，因考绩未孚，品秩不宜仍居原列。`,
    `著由${currentRank}降为${target}，俸禄班次照新例更定，仍令谨慎奉职，以观后效。`,
  ].join('\n');
  return [
    '朕惟治国之道，在于选贤任能，明赏罚，定纲纪。',
    `今有${identity}，才识卓著，品行端方，历任有功，深孚众望。`,
    `特擢其品秩，由${currentRank}升为${target}，赐金百两，仍令勤勉奉职，辅弼朝纲。`,
  ].join('\n');
}

function buildMinisterOfficeEdict(record: PersonRecord | undefined, personName: string, target: string) {
  const identity = edictPersonLabel(record, record?.rank ?? record?.title ?? '官员', personName, record?.office ?? record?.title);
  return [
    '朕惟用人之道，在于量能授任，内外咸宜。',
    `今有${identity}，才具可用，任事勤慎。`,
    `特调任${target}，品秩俸禄照新职施行，即日赴任，不得有误。`,
  ].join('\n');
}

function buildPrinceTitleEdict(record: PersonRecord | undefined, personName: string, target: string) {
  const identity = record?.title ?? '皇嗣';
  return [
    '朕惟宗室之封，必酬功德，必正名分。',
    `今有${identity}${personName}，敦敏恭谨，克勤克俭。`,
    `特封为${target}，赐以相应仪仗岁俸。`,
  ].join('\n');
}

function buildPrinceStripTitleEdict(record: PersonRecord | undefined, personName: string, restoredTitle: string) {
  const currentTitle = record?.title ?? '爵位';
  return [
    '朕惟宗室之序，贵在守礼，爵号不可妄承。',
    `今有${currentTitle}${personName}，因失仪失德，有负宗室体面。`,
    `著削去${currentTitle}，褫夺封号，复归${restoredTitle}，收回相应仪制岁俸。`,
  ].join('\n');
}

function buildAdjustmentEdict(kind: AdjustmentKind, record: PersonRecord | undefined, personName: string, currentRank: string, target: string, demotion: boolean) {
  if (kind === 'consort-rank') return buildConsortRankEdict(record, personName, currentRank, target, demotion);
  if (kind === 'minister-rank') return buildMinisterRankEdict(record, personName, currentRank, target, demotion);
  if (kind === 'minister-office') return buildMinisterOfficeEdict(record, personName, target);
  return buildPrinceTitleEdict(record, personName, target);
}

function FramedModal({ variant, children, onClose }: { variant: 'dialogue' | 'notice'; children: React.ReactNode; onClose: () => void }) {
  return <div className="interaction-overlay"><section className={variant === 'dialogue' ? 'dialogue-options-modal' : 'selection-modal'}><div className={variant === 'dialogue' ? 'dialogue-options-content' : 'selection-modal-content'}>{children}</div><button type="button" className="dialogue-close" aria-label="关闭" onPointerDown={(event) => { event.preventDefault(); onClose(); }} onClick={onClose}><X /></button></section></div>;
}

export function SceneDialogue({ person, peopleRecords, onComplete, onRecord }: { person: PersonProfile; peopleRecords: Record<string, PersonRecord>; onComplete: () => void; onRecord: (summary: string, effects?: HistoryEffect[]) => void }) {
  const store = useOptionalGameState();
  const [interactionId] = useState(() => crypto.randomUUID());
  const committed = useRef(new Set<string>());
  const [stage, setStage] = useState<'opening' | 'reply' | 'follow-up'>('opening');
  const [reply, setReply] = useState('');
  const [openingChoice, setOpeningChoice] = useState<DialogueHistoryChoice | null>(null);
  const [nextStage, setNextStage] = useState<'follow-up' | 'done' | 'punishment'>('done');
  const [punishment, setPunishment] = useState<PunishmentRequest | null>(null);
  const [punishmentOpen, setPunishmentOpen] = useState(false);
  const [palaceCaseId, setPalaceCaseId] = useState<string>();
  const [choiceKey, setChoiceKey] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  useEffect(() => {
    if (!choiceKey) return;
    setShowFeedback(true);
    const timer = window.setTimeout(() => setShowFeedback(false), 1500);
    return () => window.clearTimeout(timer);
  }, [choiceKey]);
  const scene = person.dialogueScene;
  const modern = Boolean(scene?.eventType || scene?.choices.some((c) => c.effects !== undefined || c.action) || scene?.followUp?.choices.some((c) => c.effects !== undefined || c.action));
  const followUp = scene?.followUp;
  const toChoice = (choice: DialogueChoice) => ({ ...choice, text: choice.label, speaker: '皇帝' });
  const choices = stage === 'reply' ? [{ id: 'continue', text: modern && nextStage === 'punishment' ? '选择处罚' : modern && nextStage === 'done' ? '结束交谈' : '继续', speaker: '皇帝', reply: '' }]
    : stage === 'opening' ? scene?.choices.map(toChoice) ?? [
      { id: 'later', text: '知道了，稍后细谈', speaker: '皇帝', reply: '此事朕已知晓，稍后再召你细谈。' },
      { id: 'ask', text: '立刻询问详情', speaker: '皇帝', reply: '将你所见所闻，如实禀来。' },
    ] : followUp?.choices.map(toChoice) ?? [{ id: 'end', text: '结束闲聊', speaker: '皇帝', reply: '今日闲聊到此为止。' }];
  const activeText = stage === 'opening' ? person.dialogue : stage === 'reply' ? reply : followUp?.text ?? person.dialogue;
  const activeSpeaker = stage === 'reply' ? '皇帝' : stage === 'opening' ? (scene?.speaker ?? person.name) : followUp?.speaker ?? person.name;
  const isEmperorSpeaking = activeSpeaker === '皇帝';
  const personRecord = peopleRecords[person.id];
  const recordForHistory: Pick<PersonRecord, 'kind' | 'name' | 'sex' | 'traits'> = personRecord ?? {
    kind: person.type, name: person.name,
    sex: person.type === 'CONSORT' || person.type === 'DOWAGER' || person.type === 'PRINCESS' ? 'FEMALE' : 'MALE', traits: [],
  };
  const personPortraitImage = person.portraitUrl ?? (personRecord ? personPortraitUrl(personRecord) : undefined);
  const personPortraitSlot = person.portrait ?? 'consort';
  const emperorPortraitImage = emperorPortraitUrls[0];
  const feedback = store?.gameState.history.find((h) => h.dialogue?.interactionId === interactionId && h.dialogue.choiceId === choiceKey)?.effects ?? [];
  const commitHistory = (opening: DialogueHistoryChoice, follow?: DialogueHistoryChoice) => {
    const result = buildDialogueHistory({ record: recordForHistory, scene, opening, followUp: follow });
    onRecord(result.summary, result.effects);
  };
  const selectChoice = (choice: typeof choices[number]) => {
    if (modern && store && scene) {
      if (stage === 'reply') {
        if (nextStage === 'punishment') setPunishmentOpen(true);
        else if (nextStage === 'follow-up') setStage('follow-up');
        else onComplete();
        return;
      }
      const key = stage + ':' + choice.id;
      if (committed.current.has(stage)) return;
      committed.current.add(stage);
      const original = (stage === 'opening' ? scene.choices : followUp?.choices)?.find((c) => c.id === choice.id);
      const participants = scene.participants ?? { speakerId: person.id };
      const caseInput = original?.action?.type === 'START_CASE' ? { id: `case-${interactionId}-${key}`, templateId: original.action.caseTemplateId ?? '', relatedDialogueId: scene.id, sourceInteractionId: interactionId, participants, truthRoll: Math.random() } : undefined;
      const previewCase = caseInput ? createPalaceCase(store.gameState, caseInput) : undefined;
      store.setGameState((current) => {
        const updated = recordDialogueChoice(current, { interactionId, sceneId: scene.id, choiceId: key, summary: choice.reply, participants, effects: original?.effects ?? [] }).state;
        return caseInput ? createPalaceCase(updated, caseInput).state : updated;
      });
      if (previewCase?.caseId) setPalaceCaseId(previewCase.caseId);
      setChoiceKey(key);
      setReply(choice.reply + (previewCase?.error ? ` ${previewCase.error}` : ''));
      if (original?.action?.type === 'OPEN_PUNISHMENT') {
        const targetId = resolveEffectTarget(original.action.target, participants, original.action.targetId);
        if (targetId && store.gameState.people[targetId]) {
          setPunishment({ id: 'punishment-' + interactionId + '-' + key, targetId, sourceEventId: scene.id, severity: scene.severity ?? 'MINOR', reason: original.action.reason ?? scene.text });
          setNextStage('punishment');
        } else { setReply(choice.reply + ' 当前没有可处置的对象。'); setNextStage('done'); }
      } else setNextStage(stage === 'opening' && followUp ? 'follow-up' : 'done');
      setStage('reply');
      return;
    }
    if (stage === 'opening') {
      if (followUp) { setOpeningChoice({ text: choice.text, reply: choice.reply }); setReply(choice.reply); setStage('reply'); return; }
      commitHistory({ text: choice.text, reply: choice.reply }); onComplete(); return;
    }
    if (stage === 'reply') { setStage('follow-up'); return; }
    commitHistory(openingChoice ?? { text: '继续闲谈', reply }, { text: choice.text, reply: choice.reply }); onComplete();
  };
  const skipDialogue = () => {
    if (!modern) {
      const result = buildDialogueHistory({ record: recordForHistory, scene, opening: { text: '跳过', reply: '' }, skipped: true });
      onRecord(result.summary, result.effects);
    }
    onComplete();
  };
  return (
    <div className="interaction-overlay scene-dialogue-overlay">
      {palaceCaseId && <PalaceCasesPanel initialCaseId={palaceCaseId} onClose={onComplete} />}
      {punishmentOpen && punishment && <PalacePunishmentDialog request={punishment} onClose={onComplete} onApplied={onComplete} />}
      <main className="game-ui">
        <button className="skip-btn" onClick={skipDialogue}>跳过</button>
        <div className="character-layer" aria-hidden="true">
          <div className={`character-slot left ${isEmperorSpeaking ? 'is-listener' : 'is-speaker'}`}>
            <div className={`character-placeholder ${personPortraitSlot} ${personPortraitImage ? 'has-custom-portrait' : ''}`} style={{ backgroundImage: `url(${personPortraitImage ?? portraits})` }} />
          </div>
          <div className={`character-slot right ${isEmperorSpeaking ? 'is-speaker' : 'is-listener'}`}>
            <div className="character-placeholder has-custom-portrait" style={{ backgroundImage: `url(${emperorPortraitImage})` }} />
          </div>
        </div>
        <div className="story-stack">
          <section className="dialogue-section">
            <div className="dialogue-wrap">
              <div className="nameplate">{activeSpeaker}</div>
              <div className="dialogue-box">
                <p className="dialogue-text">{activeText}</p>
                {modern && stage === 'reply' && showFeedback && <div className="palace-effect-feedback" role="status" aria-label="属性变化">{feedback.map((f, i) => <span key={i}>{f.label} {f.value > 0 ? '+' : ''}{f.value}</span>)}</div>}
              </div>
            </div>
          </section>
          <section className="choice-panel" aria-label="剧情选项">{choices.map((choice) => <button key={choice.text} className="choice-btn" onClick={() => selectChoice(choice)}>{choice.text}</button>)}</section>
        </div>
      </main>
    </div>
  );
}
function buildHeirCareScene(person: PersonProfile, actionId: string): DialogueScene {
  const scenes: Record<string, DialogueScene> = {
    care: {
      id: `heir-care-${person.id}`,
      kind: 'PRINCE',
      speaker: '乳母',
      text: `乳母抱着${person.name}在榻边，孩子睁着眼望着陛下，小手攥着被角。`,
      choices: [
        { id: 'hold', label: '轻轻抱起', reply: `皇帝将${person.name}轻轻抱起，孩子安静下来。` },
        { id: 'tuck', label: '掖好被角', reply: `皇帝替${person.name}掖好被角，又摸了摸额头。` },
      ],
    },
    feed: {
      id: `heir-feed-${person.id}`,
      kind: 'PRINCE',
      speaker: '乳母',
      text: `到了进乳的时辰，${person.name}咂着小嘴，乳母请示是否由陛下亲自喂些。`,
      choices: [
        { id: 'feed-self', label: '亲自喂些', reply: `皇帝接过玉碗，小心喂了${person.name}几口，孩子吃得格外认真。` },
        { id: 'let-nurse', label: '让乳母来', reply: '皇帝让乳母仔细喂养，又叮嘱了几句。' },
      ],
    },
    play: {
      id: `heir-play-${person.id}`,
      kind: 'PRINCE',
      speaker: person.name,
      text: `${person.name}躺在锦褥上，手脚轻轻乱动，似乎想让人陪一会儿。`,
      choices: [
        { id: 'bell', label: '摇铃逗笑', reply: `皇帝拿起小金铃摇了摇，${person.name}咯咯笑了起来。` },
        { id: 'face', label: '作个鬼脸', reply: `皇帝作了个鬼脸，${person.name}瞪大眼睛，随后咧开小嘴。` },
      ],
    },
  };
  return scenes[actionId] ?? scenes.care;
}

function HeirCareDialog({ person, actionId, peopleRecords, onComplete, onRecord }: { person: PersonProfile; actionId: string; peopleRecords: Record<string, PersonRecord>; onComplete: () => void; onRecord: (summary: string, effects?: HistoryEffect[]) => void }) {
  const scene = useMemo(() => buildHeirCareScene(person, actionId), [actionId, person]);
  return <SceneDialogue person={{ ...person, dialogue: scene.text, dialogueScene: scene }} peopleRecords={peopleRecords} onRecord={onRecord} onComplete={onComplete} />;
}

function heirOpening(kind: HeirInteractionKind, choice: HeirChoice, person: PersonProfile) {
  if (kind === 'talk' && choice.id === 'daily') return '最近怎么样啊？在宫里住得可还习惯？';
  if (kind === 'talk' && choice.id === 'interest') return `朕听说你近日很喜欢${choice.description.replace(/^聊聊|。$/g, '')}，可有新的心得？`;
  if (kind === 'talk') return '今日政务稍歇，朕陪你自在玩一会儿。';
  if (kind === 'encourage') return choice.id === 'example' ? '古来成大事者，无不从勤学自持开始。朕相信你也能做到。' : choice.id === 'promise' ? '若你把近日课业做好，朕便赐你一件心爱之物。' : '朕看得见你近日的用功，不必急躁，持之以恒便好。';
  return `${person.name}，今日朕亲自陪你学习“${choice.label}”，不懂之处尽管问。`;
}

function heirFollowups(kind: HeirInteractionKind, choice: HeirChoice) {
  if (kind === 'talk' && choice.id === 'daily') return [
    { label: '可有烦心之事', reply: '回父皇，偶尔会想念母妃，也担心功课做得不好。不过父皇来问，儿臣心里便安定多了。' },
    { label: '询问近日课业', reply: '师傅昨日夸儿臣字写得比从前稳了，只是还有几篇文章没能读懂。' },
  ];
  if (kind === 'talk') return [{ label: '耐心听他说完', reply: '儿臣还有许多话想讲，父皇以后也要常来。' }, { label: '说说朕的少年事', reply: '原来父皇小时候也会遇到难题，儿臣便不怕了。' }];
  if (kind === 'encourage') return [{ label: '再勉励一句', reply: '儿臣会把父皇今日的话记在心里。' }, { label: '约定下次考校', reply: '儿臣定会认真准备，请父皇下次考校。' }];
  return [{ label: '亲自示范', reply: `父皇讲得明白，儿臣对“${choice.label}”已有些懂了。` }, { label: '让他自行思考', reply: '儿臣想明白了一些，余下的会再向师傅请教。' }];
}

function HeirCultivationDialog({ person, record, kind, onApply, onClose }: { person: PersonProfile; record: PersonRecord; kind: HeirInteractionKind; onApply: (optionId: string) => void; onClose: () => void }) {
  const [choice, setChoice] = useState<HeirChoice | null>(null);
  const [step, setStep] = useState<'request' | 'emperor' | 'child' | 'followup' | 'final' | 'result'>('request');
  const [finalReply, setFinalReply] = useState('');
  const choices = getHeirChoices(record, kind);
  const outcome = choice ? getHeirInteractionOutcome(record, kind, choice.id) : null;
  const request = kind === 'education'
    ? `启禀陛下，${person.name}已到${getHeirEducationStage(record.age)}阶段。今日应选何种课业？`
    : kind === 'encourage' ? `启禀陛下，${person.name}近日正在用功，可要亲自勉励几句？` : `启禀陛下，${person.name}正在殿外候见，可要陪皇嗣闲聊片刻？`;
  const speaker = step === 'request' ? '内侍请示' : step === 'emperor' ? '皇帝' : step === 'result' ? '内侍回禀' : person.name;
  const copy = step === 'request' ? request
    : step === 'emperor' ? heirOpening(kind, choice!, person)
      : step === 'child' ? choice!.reply
        : step === 'followup' ? `${person.name}望着父皇，似乎还有话想说。`
          : step === 'final' ? finalReply
            : `本次${kind === 'education' ? '教育' : kind === 'encourage' ? '鼓励' : '闲聊'}已经结束。${Object.entries(outcome?.gains ?? {}).map(([name, gain]) => `${name} +${gain}`).join('，') || '属性已达到上限'}。`;
  const advance = () => {
    if (step === 'emperor') setStep('child');
    else if (step === 'child') setStep('followup');
    else if (step === 'final' && choice) { onApply(choice.id); setStep('result'); }
    else if (step === 'result') onClose();
  };
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay heir-cultivation-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label="皇嗣培养剧情"><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">{speaker}</div><div className="dialogue-box"><p className="dialogue-text">{copy}</p></div></div></section><section className="choice-panel" aria-label="皇嗣培养选项">{step === 'request' && choices.map((item) => <button key={item.id} className="choice-btn" onClick={() => { setChoice(item); setStep('emperor'); }}>{item.label}<small>{item.description}</small></button>)}{step === 'followup' && heirFollowups(kind, choice!).map((item) => <button key={item.label} className="choice-btn" onClick={() => { setFinalReply(item.reply); setStep('final'); }}>{item.label}</button>)}{!['request', 'followup'].includes(step) && <button className="choice-btn" onClick={advance}>{step === 'result' ? '知道了' : '继续'}</button>}</section></div></main></div>;
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
  const detailPortraitStyle = person.portraitUrl
    ? `background-image:url('${person.portraitUrl}');background-size:contain;background-position:center bottom;color:transparent`
    : `background-image:url('${portraits}');background-size:500% 100%;background-position:${person.portrait === 'empress' ? '25%' : person.portrait === 'consort' ? '50%' : person.portrait === 'minister' ? '75%' : person.portrait === 'prince' ? '100%' : '0%'} 50%;color:transparent`;
  const document = useMemo(() => detailPrototype
    .replaceAll('徐珍淑', person.name)
    .replace('贵妃 · 翊坤宫', title)
    .replace('<button class="back" id="backBtn">↩</button>', '<button class="back" id="backBtn" aria-label="关闭人物详情">×</button>')
    .replace('<div class="portrait">淑</div>', `<div class="portrait ${person.portraitUrl ? 'has-custom-portrait' : ''}" style="${detailPortraitStyle}"></div>`)
    .replace('</head>', '<style>html,body,.phone,.veil{background:transparent!important}.page{background:transparent!important}</style></head>')
    .replace('</body>', `${localizedDynamicScript}</body>`), [person, title, localizedDynamicScript, detailPortraitStyle]);
  return <div className="prototype-overlay person-detail-overlay"><iframe title="人物详情" srcDoc={document} /></div>;
}

function buildActionDialogue(action: PendingAction): { dialogue: string; scene: DialogueScene } {
  const { person, actionId, body, confirmLabel } = action;
  const kind: PersonKind = person.type === 'PRINCE' ? 'PRINCE' : person.type === 'PRINCESS' ? 'PRINCESS' : person.type === 'MINISTER' ? 'MINISTER' : person.type === 'EUNUCH' ? 'EUNUCH' : person.type === 'COURT_LADY' ? 'COURT_LADY' : person.type === 'DOWAGER' ? 'DOWAGER' : person.type === 'NOBLE' ? 'NOBLE' : 'CONSORT';
  const defaultScene = (text: string, speaker = '内侍'): { dialogue: string; scene: DialogueScene } => ({
    dialogue: text,
    scene: {
      id: `action-${actionId}-${person.id}`,
      kind,
      speaker,
      text,
      choices: [{ id: 'confirm', label: confirmLabel || '准了', reply: '皇帝准了此议。' }],
    },
  });
  switch (actionId) {
    case 'care':
      return {
        dialogue: `乳母抱着${person.name}在榻边，孩子睁着眼望着陛下，小手攥着被角。`,
        scene: {
          id: `action-care-${person.id}`, kind, speaker: '乳母',
          text: `乳母抱着${person.name}在榻边，孩子睁着眼望着陛下，小手攥着被角。`,
          choices: [
            { id: 'hold', label: '轻轻抱起', reply: `皇帝将${person.name}轻轻抱起，孩子安静下来。` },
            { id: 'tuck', label: '掖好被角', reply: `皇帝替${person.name}掖好被角，又摸了摸额头。` },
          ],
        },
      };
    case 'feed':
      return {
        dialogue: `到了进乳的时辰，${person.name}咂着小嘴，乳母请示是否由陛下亲自喂些。`,
        scene: {
          id: `action-feed-${person.id}`, kind, speaker: '乳母',
          text: `到了进乳的时辰，${person.name}咂着小嘴，乳母请示是否由陛下亲自喂些。`,
          choices: [
            { id: 'feed-self', label: '亲自喂些', reply: `皇帝接过玉碗，小心喂了${person.name}几口，孩子吃得格外认真。` },
            { id: 'let-nurse', label: '让乳母来', reply: `皇帝让乳母仔细喂养，又叮嘱了几句。` },
          ],
        },
      };
    case 'play':
      return {
        dialogue: `${person.name}躺在锦褥上，手脚轻轻乱动，似乎想让人陪一会儿。`,
        scene: {
          id: `action-play-${person.id}`, kind, speaker: person.name,
          text: `${person.name}躺在锦褥上，手脚轻轻乱动，似乎想让人陪一会儿。`,
          choices: [
            { id: 'bell', label: '摇铃逗笑', reply: `皇帝拿起小金铃摇了摇，${person.name}咯咯笑了起来。` },
            { id: 'face', label: '作个鬼脸', reply: `皇帝作了个鬼脸，${person.name}瞪大眼睛，随后咧开小嘴。` },
          ],
        },
      };
    case 'education':
      return defaultScene(`师傅已经拟好${person.name}的课业表，请陛下过目定夺。`, '内侍');
    case 'encourage':
      return {
        dialogue: `${person.name}，朕看你近日用功，不必急躁，持之以恒便好。`,
        scene: {
          id: `action-encourage-${person.id}`, kind, speaker: '皇帝',
          text: `${person.name}，朕看你近日用功，不必急躁，持之以恒便好。`,
          choices: [
            { id: 'example', label: '以古人为范', reply: `皇帝以古人事例勉励${person.name}，皇嗣恭敬聆听。` },
            { id: 'promise', label: '赐物为励', reply: `皇帝许诺${person.name}若能坚持，便赐一件心爱之物。` },
          ],
        },
      };
    case 'teacher':
      return defaultScene(`为${person.name}择师一事，内阁已推举数人，请陛下圣裁。`, '内侍');
    case 'ennoble':
    case 'prince-title':
      return defaultScene(`宗人府已拟就${person.name}的封号册文，请陛下御览用印。`, '宗人府官员');
    case 'rank-change':
    case 'consort-rank':
    case 'minister-rank':
    case 'minister-office':
    case 'transfer':
    case 'appoint-duty':
      return defaultScene(body || `${person.name}一事，请陛下决断。`, '内侍');
    case 'royal-naming':
      return defaultScene(body || `今为${person.name}赐名，请陛下用印。`, '内侍');
    case 'appoint-crown-prince':
    case 'replace-crown-prince':
      return defaultScene(body || `储君册立事关国本，请陛下决断。`, '内侍');
    default:
      return defaultScene(body || `${person.name}一事，请陛下决断。`, '内侍');
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}

function highlightEdictTerms(value: string, terms: Array<string | undefined>) {
  let html = escapeHtml(value);
  const uniqueTerms = [...new Set(terms.filter((term): term is string => Boolean(term)).map(escapeHtml))].sort((a, b) => b.length - a.length);
  uniqueTerms.forEach((term) => { html = html.split(term).join(`<span class="em">${term}</span>`); });
  return html;
}

export function EdictPrototype({ action, peopleRecords: _peopleRecords, onComplete }: { action: PendingAction; peopleRecords?: Record<string, PersonRecord>; onComplete: () => void }) {
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.data?.type === 'edict-complete') onComplete(); };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onComplete]);
  const document = useMemo(() => {
    const body = action.body.replace(/^奉皇帝谕旨[：:]\s*/u, '').replace(/钦此[。．.]?\s*$/u, '').trim();
    const bodyHtml = body.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${highlightEdictTerms(line, [action.person.name, action.target])}</p>`).join('');
    return edictPrototype
      .replace(/<div class="text" id="edictText">[\s\S]*?(?=\s*<div class="stamp-mark")/, `<div class="text" id="edictText">${bodyHtml}<p>钦此。</p><div class="signature">大曜皇帝</div></div>\n\n        `)
      .replace('</head>', `<style>html,body{background:transparent!important}.stage{width:100%!important;height:100%!important;min-height:0!important;background:transparent!important}.mask{display:none!important}.scene{padding:18px 10px 34px!important}.edict{width:min(94%,394px)!important;max-height:calc(100% - 44px)!important}.edict.open{height:min(88%,660px)!important}.roller{height:48px!important}.paper{top:26px!important;bottom:26px!important;padding:38px 24px 118px!important}.stamp-trigger{bottom:70px!important}.start{display:none!important}.hint{bottom:5px!important;color:#f2d994!important;text-shadow:0 1px 4px #351b08}.complete{background:transparent!important}.complete-card{color:#6f211b!important;background:linear-gradient(#f8e9bd,#d8b765)!important;border-color:#9a6924!important;box-shadow:0 12px 28px rgba(54,27,7,.35)!important}.complete-card span{color:#765428!important}</style></head>`)
      .replace('</body>', `<script>let reported=false;new MutationObserver(function(){if(!reported&&document.getElementById('complete').classList.contains('show')){reported=true;setTimeout(function(){window.parent.postMessage({type:'edict-complete'},'*')},650)}}).observe(document.getElementById('complete'),{attributes:true,attributeFilter:['class']});setTimeout(function(){document.getElementById('startBtn').click()},80)<\/script></body>`);
  }, [action.body]);
  return <div className="prototype-overlay edict-overlay"><iframe title={`${action.title}圣旨`} srcDoc={document} /></div>;
}

export function FavorPrototype({ person, onClose, placement = 'scene' }: { person: PersonProfile; onClose: () => void; placement?: 'scene' | 'flip' }) {
  const document = useMemo(() => favorPrototype
    .replace('今夜，帘幕轻落。', `今夜，${person.name}侍奉于前。`)
    .replace('</head>', '<style>html,body,.scene,.room{background:#2a0c0d!important}.scene{width:100%!important;height:100%!important;min-height:0!important}.room{inset:0!important}.curtain{top:0!important;bottom:0!important;height:100%!important}</style></head>')
    .replace('</body>', `<button aria-label="跳过宠幸动画" style="position:fixed;right:14px;top:14px;z-index:99;min-width:66px;height:34px;padding:0 13px;border:1px solid #a87831;border-radius:999px;background:#f0d991;color:#5c3516;font:14px STKaiti,KaiTi,serif;letter-spacing:2px;box-shadow:0 3px 10px #0006" onclick="window.parent.postMessage({type:'favor-close'},'*')">跳过 ›</button><script>(function(){let nextCount=0;const close=function(delay){setTimeout(function(){window.parent.postMessage({type:'favor-close'},'*')},delay||0)};document.getElementById('skipBtn').addEventListener('click',function(){close(280)});document.getElementById('nextBtn').addEventListener('click',function(){nextCount+=1;if(nextCount>=2)close(180)});})();<\/script></body>`), [person]);
  useEffect(() => { const receive = (event: MessageEvent) => { if (event.data?.type === 'favor-close') onClose(); }; window.addEventListener('message', receive); return () => window.removeEventListener('message', receive); }, [onClose]);
  return <div className={`prototype-overlay favor-overlay favor-${placement}`}><iframe title="临幸过场" srcDoc={document} /></div>;
}

function AdjustmentPrototype({ kind, person, record, people, currentTitle, onComplete, onClose }: { kind: AdjustmentKind; person: PersonProfile; record: PersonRecord; people: Record<string, PersonRecord>; currentTitle: string; onComplete: (target: string) => void; onClose: () => void }) {
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
      const character = {
        id: record.id,
        gender: record.sex === 'FEMALE' ? 'female' : 'male',
        name: record.name,
        initial: record.name.slice(-1),
        info: `${record.title} · ${record.age}岁 · 宠爱${record.stats['宠爱'] ?? 0} · 天资${record.stats['天资'] ?? record.stats['资质'] ?? record.stats['智慧'] ?? 70}`,
        motherRank: record.parents.map((id) => people[id]).find((parent) => parent?.kind === 'CONSORT')?.rank ?? '未详',
        legitimate: record.parents.includes('empress'),
        merit: record.stats['功绩'] ?? 0,
        favor: record.stats['宠爱'] ?? 0,
      };
      source = source
        .replace(/const CHARACTER = \{[\s\S]*?\};/, `const CHARACTER = ${JSON.stringify(character)};`)
        .replace('</body>', `<script>document.getElementById('executeBtn').addEventListener('click',function(){const target=makeFullTitle();if(target)window.parent.postMessage({type:'adjustment-complete',kind:'prince-title',target},'*')});document.getElementById('closeBtn').addEventListener('click',function(){window.parent.postMessage({type:'adjustment-close',kind:'prince-title'},'*')});<\/script></body>`);
    }
    return source.replace('</head>', '<style>html,body{background:transparent!important}</style></head>');
  }, [currentTitle, kind, person.name, person.title, prototype, record, people]);
  return <div className="prototype-overlay adjustment-overlay"><iframe title="人物调整" srcDoc={document} /></div>;
}

function ActionIcon({ actionId }: { actionId: string }) {
  const icons: Record<string, React.ReactNode> = {
    favor: <Crown />, companion: <Heart />, talk: <MessageCircle />, gift: <Gift />, move: <MoveRight />, promote: <ArrowUp />, demote: <ArrowUp />, 'promote-rank': <ArrowUp />, education: <BookOpen />, teacher: <BookOpen />, accountability: <ShieldAlert />, biography: <BookOpen />, 'appoint-duty': <Scale />,
  };
  return icons[actionId] ?? <Sparkles />;
}

export function ScenePeople({ sceneId, sceneTitle, peopleState, onPeopleChange, peopleRecords, history, relationships, requestedPersonId, onRequestedPersonHandled, requestedActionPersonId, onRequestedActionHandled, onRoyalTitleComplete, onNotice, onReward, residenceState, onResidenceChange, personRanks, onRankChange, onOfficeChange, onTitleChange, onHonorificChange, onRecordAction, onOpenTreasury, sixPalaceAssistants, onSetSixPalaceAssistant, onConsortVisit, onConsortCompanion, onPersonStatusChange, onSeparateMotherAndChildren, onGrantPersonalChildCare, onAdoptRoyalChild, onRestorePerson, onTravelToPerson, onHeirInteraction, requestedFromRoster, onRequestedDetailClose, onInteractionChange, crownPrinceId, onRoyalSummon }: {
  sceneId: string;
  sceneTitle: string;
  peopleState: PeopleState;
  onPeopleChange: (state: PeopleState) => void;
  peopleRecords: Record<string, PersonRecord>;
  history: HistoryEntry[];
  relationships: RelationshipRecord[];
  requestedPersonId?: string | null;
  onRequestedPersonHandled?: () => void;
  requestedActionPersonId?: string | null;
  onRequestedActionHandled?: () => void;
  onRoyalTitleComplete?: (personId: string, fullTitle: string) => void | boolean;
  onNotice: (message: string) => void;
  onReward: (personId: string, reward: string) => void;
  residenceState: ResidenceState;
  onResidenceChange: (state: ResidenceState) => void;
  personRanks: Record<string, string>;
  onRankChange: (personId: string, rank: string) => void;
  onOfficeChange: (personId: string, office: string) => void;
  onTitleChange: (personId: string, title: string) => void;
  onHonorificChange: (personId: string, honorific: string) => void;
  onRecordAction: (personId: string, type: string, summary: string, effects?: HistoryEffect[]) => void;
  onOpenTreasury: (recipientId: string) => void;
  sixPalaceAssistants: string[];
  onSetSixPalaceAssistant: (personId: string) => void;
  onConsortVisit: (personId: string) => void;
  onConsortCompanion: (personId: string) => void;
  onPersonStatusChange: (personId: string, status: PersonLifeStatus, destination?: string) => void;
  onSeparateMotherAndChildren: (motherId: string) => void;
  onGrantPersonalChildCare: (motherId: string) => void;
  onAdoptRoyalChild: (childId: string, motherId: string) => void;
  onRestorePerson: (personId: string, rank?: string) => void;
  onTravelToPerson: (personId: string, sceneId: string) => void;
  onHeirInteraction: (personId: string, kind: HeirInteractionKind, optionId: string) => void;
  crownPrinceId?: string | null;
  onRoyalSummon?: (personId: string) => void;
  requestedFromRoster?: boolean;
  onRequestedDetailClose?: () => void;
  onInteractionChange?: (busy: boolean) => void;
}) {
  const store = useOptionalGameState();
  const [palacePunishment, setPalacePunishment] = useState<{ request: PunishmentRequest; initialDefinitionId?: string } | null>(null);
  const pickScene = (record: PersonRecord) => store ? pickPalaceDialogue(store.gameState, record) : pickDialogueForPerson(record);
  const visitEligibility = (id: string) => consortVisitEligibility(peopleRecords[id], store?.gameState.clock ?? { year: 0, month: 1, day: 1 });
  const [selected, setSelected] = useState<PersonProfile | null>(null);
  const [dialogue, setDialogue] = useState<PersonProfile | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [moveStep, setMoveStep] = useState<MoveStep | null>(null);
  const [rankStep, setRankStep] = useState<RankStep | null>(null);
  const [detailPerson, setDetailPerson] = useState<PersonProfile | null>(null);
  const [detailFromRoster, setDetailFromRoster] = useState(false);
  const [summonedGreetingId, setSummonedGreetingId] = useState<string | null>(null);
  const [selectionStep, setSelectionStep] = useState<SelectionStep | null>(null);
  const [favorPerson, setFavorPerson] = useState<PersonProfile | null>(null);
  const [adjustment, setAdjustment] = useState<{ kind: AdjustmentKind; person: PersonProfile } | null>(null);
  const [honorificPerson, setHonorificPerson] = useState<PersonProfile | null>(null);
  const [restorePersonProfile, setRestorePersonProfile] = useState<PersonProfile | null>(null);
  const [adoptionEdict, setAdoptionEdict] = useState<PendingAction | null>(null);
  const [adoptChild, setAdoptChild] = useState<PersonProfile | null>(null);
  const [heirInteraction, setHeirInteraction] = useState<{ person: PersonProfile; kind: HeirInteractionKind } | null>(null);
  const [heirCare, setHeirCare] = useState<{ person: PersonProfile; actionId: string } | null>(null);
  const [customHonorific, setCustomHonorific] = useState('');
  const interactionBusy = Boolean(adoptionEdict || palacePunishment || selected || dialogue || pending || moveStep || rankStep || detailPerson || selectionStep || favorPerson || adjustment || honorificPerson || restorePersonProfile || adoptChild || heirInteraction || heirCare);

  useEffect(() => {
    onInteractionChange?.(interactionBusy);
    return () => onInteractionChange?.(false);
  }, [interactionBusy, onInteractionChange]);
  const residents = useMemo(() => getScenePeople(sceneId, peopleState).map((person) => {
    const profile = profiles[person.id];
    const record = peopleRecords[person.id];
    const portraitUrl = record ? personPortraitUrl(record) : undefined;
    if (profile) return { ...profile, name: person.name, title: record ? royalIdentityTitle(record) : profile.title, portraitUrl };
    const portrait = person.type === 'MINISTER' ? 'minister' : person.type === 'PRINCE' ? 'prince' : person.type === 'DOWAGER' ? 'dowager' : person.type === 'NOBLE' ? 'noble' : 'consort';
    return { id: person.id, name: person.name, title: personRanks[person.id] ?? (person.type === 'PRINCE' ? '皇嗣' : person.type === 'MINISTER' ? '官员' : person.type === 'DOWAGER' ? '太后' : person.type === 'NOBLE' ? '太妃' : '妃嫔'), avatar: person.name.slice(0, 1), portrait, portraitUrl, type: person.type, priority: person.priority } satisfies PersonProfile;
  }), [peopleRecords, peopleState, personRanks, sceneId]);
  const fallbackResidents = (sceneFallback[sceneId] ?? (sceneId.includes(':') ? [] : [profiles.attendant])).map((profile) => {
    const record = peopleRecords[profile.id];
    return record ? { ...profile, name: record.name, title: royalIdentityTitle(record), portraitUrl: personPortraitUrl(record) } : profile;
  });
  const list = residents.length ? residents : fallbackResidents;
  const baseTitle = (person: PersonProfile) => personRanks[person.id] ?? person.title;
  const displayTitle = (person: PersonProfile) => {
    const record = peopleRecords[person.id];
    const honorific = record?.honorific;
    if (record && (record.kind === 'PRINCE' || record.kind === 'PRINCESS')) return royalIdentityTitle(record);
    return honorific && person.type === 'CONSORT' ? `${honorific}${baseTitle(person)}` : baseTitle(person);
  };
  const openPerson = (person: PersonProfile) => {
    onInteractionChange?.(true);
    const roll = Math.random();
    const canUseLibrary = true;
    if (canUseLibrary && roll < .3) {
      const record = peopleRecords[person.id];
      const scene = record ? pickScene(record) : undefined;
      if (scene) {
        setDialogue({ ...person, dialogue: scene.text, dialogueScene: scene });
        return;
      }
    }
    person.dialogue && roll < .3 ? setDialogue(person) : setSelected(person);
  };

  useEffect(() => {
    if (!requestedPersonId) return;
    const record = peopleRecords[requestedPersonId];
    if (record) { setDetailPerson(profileForRecord(record)); setDetailFromRoster(Boolean(requestedFromRoster)); }
    onRequestedPersonHandled?.();
  }, [onRequestedPersonHandled, peopleRecords, requestedFromRoster, requestedPersonId]);

  useEffect(() => {
    if (!requestedActionPersonId) return;
    const record = peopleRecords[requestedActionPersonId];
    if (record && (record.kind === 'PRINCE' || record.kind === 'PRINCESS') && !record.royalTitle) {
      setAdjustment({ person: profileForRecord(record), kind: 'prince-title' });
    }
    onRequestedActionHandled?.();
  }, [onRequestedActionHandled, peopleRecords, requestedActionPersonId]);

  const beginAction = (person: PersonProfile, actionId: string) => {
    if (peopleRecords[person.id] && !isPersonAlive(peopleRecords[person.id])) return;
    onInteractionChange?.(true);
    setSelected(null);
    setDetailFromRoster(false);
if (actionId === 'travel' && person.type === 'CONSORT') {
      const record = peopleRecords[person.id];
      setDetailPerson(null);
      onTravelToPerson(person.id, record?.sceneId ?? sceneId);
      return;
    }
    if (actionId === 'summon' && person.type === 'CONSORT') {
      const existing = peopleState.people.some((item) => item.id === person.id);
      const nextPeople = existing
        ? movePerson(person.id, sceneId, peopleState)
        : { ...peopleState, people: [...peopleState.people, { id: person.id, type: 'CONSORT' as const, name: person.name, sceneId, status: 'IN_SCENE' as const, priority: person.priority }] };
      onPeopleChange(nextPeople);
      setDetailPerson(null);
      setSummonedGreetingId(person.id);
      setDialogue({ ...person, dialogue: `臣妾${person.name}奉召前来，给陛下请安。` });
      onRecordAction(person.id, 'SUMMON', `${person.name}奉召来到${sceneTitle}请安。`);
      return;
    }
    if (actionId === 'summon' && (person.type === 'PRINCE' || person.type === 'PRINCESS')) {
      store?.setGameState((current) => summonRoyal(current, person.id));
      onRecordAction(person.id, 'SUMMON', `${person.name}奉召入宫。`);
      onNotice(`${person.name}已奉召入宫，今日本人操作已恢复。`);
      return;
    }
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
      if (person.type === 'EUNUCH') {
        onRecordAction(person.id, actionId.toUpperCase(), `陛下唤来${person.name}问话。`);
        onNotice(`陛下唤来${person.name}问话。`);
      } else {
        onRecordAction(person.id, actionId.toUpperCase(), `皇帝向${person.name}请安问候。`);
        onNotice(`陛下向${person.name}问候请安。`);
      }
      return;
    }
    if (actionId === 'favor') { const eligible = visitEligibility(person.id); if (!eligible.allowed) { onNotice(eligible.reason!); return; } setFavorPerson(person); return; }
    if (actionId === 'companion') {
      onConsortCompanion(person.id);
      onNotice(`陛下留在${person.name}身边陪伴安胎，她的心情与信任有所提升。`);
      return;
    }
    if ((person.type === 'PRINCE' || person.type === 'PRINCESS') && (actionId === 'education' || actionId === 'encourage')) { setHeirInteraction({ person, kind: actionId }); return; }
    if ((person.type === 'PRINCE' || person.type === 'PRINCESS') && ['care', 'feed', 'play'].includes(actionId)) { setHeirCare({ person, actionId }); return; }
    if ((person.type === 'PRINCE' || person.type === 'PRINCESS') && actionId === 'talk') {
      const record = peopleRecords[person.id];
      const scene = record ? pickScene(record) : undefined;
      setDialogue(scene ? { ...person, dialogue: scene.text, dialogueScene: scene } : person);
      return;
    }
    if (actionId === 'talk') {
      const record = peopleRecords[person.id];
      const scene = record && record.kind !== 'EMPEROR'
        ? pickScene(record)
        : undefined;
      setDialogue(scene ? { ...person, dialogue: scene.text, dialogueScene: scene } : person);
      return;
    }
    if (actionId === 'gift' || actionId === 'reward') { setSelectionStep({ person, kind: 'reward' }); return; }
    if (actionId === 'accountability') { setSelectionStep({ person, kind: 'accountability' }); return; }
    if (actionId === 'adopt' && (person.type === 'PRINCE' || person.type === 'PRINCESS')) { setAdoptChild(person); return; }
    if (actionId === 'transfer') { setAdjustment({ person, kind: 'minister-office' }); return; }
    if (actionId === 'ennoble' && (person.type === 'PRINCE' || person.type === 'PRINCESS')) { setAdjustment({ person, kind: 'prince-title' }); return; }
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
      if (person.type === 'CONSORT' && !isConsortRankAvailable(pending.target as ConsortRank, consortCounts)) {
        onNotice(`内侍提醒：${pending.target}位编制已满，无法晋升。`);
        setPending(null);
        return;
      }
      onRankChange(person.id, pending.target);
      onNotice(`${person.name}的位阶已改定为${pending.target}，宠爱 +6，圣旨与履历均已入档。`);
    } else if (pending.commit === 'OFFICE' && pending.target) {
      onOfficeChange(person.id, pending.target);
      onNotice(`${person.name}已奉旨调任${pending.target}。`);
    } else if (pending.commit === 'TITLE' && pending.target) {
      onTitleChange(person.id, pending.target);
      const handledByFlow = actionId === 'prince-title' ? onRoyalTitleComplete?.(person.id, pending.target) === true : false;
      if (!handledByFlow) onNotice(actionId === 'strip-title' ? `${person.name}已奉旨削爵，复归${pending.target}身份。` : `${person.name}已奉旨册封为${pending.target}。`);

    } else if (actionId === 'favor') {
      const eligible = visitEligibility(person.id);
      if (!eligible.allowed) { onNotice(eligible.reason!); setPending(null); return; }
      onConsortVisit(person.id);
      onNotice(`今夜将前往${person.name}处留宿，明日卯时结算结果。`);
    } else if (actionId === 'appoint-duty' || actionId === 'transfer') {
      const appointment = proposeAppointment(person.id, '经筵日讲');
      onNotice(`已拟${appointment.office}任命，待御批后记入${person.name}履历。`);
    } else if (actionId === 'teacher') {
      onRecordAction(person.id, 'EDUCATION', `皇帝为${person.name}安排了师傅。`);
    } else {
      onRecordAction(person.id, actionId.toUpperCase(), `${pending.title}：${pending.body}`);
      onNotice(`${pending.title}已记录。`);
    }
    setPending(null);
  };

  const consortCounts = Object.values(peopleRecords).reduce<Partial<Record<ConsortRank, number>>>((counts, person) => {
    if (person.kind === 'CONSORT' && isPersonAlive(person)) {
      const rank = (person.rank ?? person.title) as ConsortRank;
      counts[rank] = (counts[rank] ?? 0) + 1;
    }
    return counts;
  }, {});
  const availableRooms = moveStep ? getAvailableResidences(personRanks[moveStep.person.id] as ConsortRank ?? '贵人', residenceState) : [];
  const selectedResidence: Residence | undefined = moveStep?.palace ? availableRooms.find((room) => room.id === moveStep.palace) : undefined;
  const promotionOptions = rankStep ? [...getPromotionOptions(rankStep.person.type === 'MINISTER' ? 'MINISTER' : 'CONSORT', personRanks[rankStep.person.id] ?? (rankStep.person.type === 'MINISTER' ? '正五品' : rankStep.person.title), consortCounts), ...(rankStep.person.type === 'CONSORT' ? getDemotionOptions(personRanks[rankStep.person.id] ?? rankStep.person.title) : [])] : [];
  const selectedMother = selectionStep?.person.type === 'CONSORT' ? peopleRecords[selectionStep.person.id] : undefined;
  const linkedChildIds = new Set(selectedMother?.children ?? []);
  if (selectedMother) relationships.forEach((relation) => {
    if (relation.kind !== 'PARENT_CHILD') return;
    if (relation.personAId === selectedMother.id) linkedChildIds.add(relation.personBId);
    if (relation.personBId === selectedMother.id) linkedChildIds.add(relation.personAId);
  });
  const hasBiologicalChildren = Boolean(selectedMother && Object.values(peopleRecords).some((person) =>
    ['PRINCE', 'PRINCESS'].includes(person.kind)
    && (person.parents.includes(selectedMother.id) || linkedChildIds.has(person.id))));
  const rewardOptions = selectionStep?.kind === 'reward' ? ['御赐墨宝', '赏银百两', '赏金百两', '国库珍宝', ...(selectionStep.person.type === 'CONSORT' ? ['赏赐封号', ...(hasBiologicalChildren ? ['特许亲自抚养'] : [])] : []), ...(selectionStep.person.type === 'CONSORT' && ['皇后', '皇贵妃', '贵妃', '妃', '嫔'].includes(baseTitle(selectionStep.person)) ? ['协理六宫'] : [])] : [];
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
    : selectionStep?.kind === 'accountability' ? selectionStep.person.type === 'CONSORT' ? ['严厉呵斥', '罚俸一月', '罚俸一年', '禁足', '褫夺封号', ...(peopleRecords[selectionStep.person.id]?.children.some((childId) => peopleRecords[childId]?.residence === peopleRecords[selectionStep.person.id]?.residence) ? ['母子分离'] : []), '打入冷宫', '赐自尽'] : selectionStep.person.type === 'PRINCE' ? ['严厉呵斥', '禁足', '削爵', '打入宗人府', '赐死'] : ['严厉呵斥', '罚俸一月', '罚俸一年', '抄家落狱', '流放百里', '株连九族']
      : selectionStep?.kind === 'transfer' ? ['翰林侍讲', '礼部侍郎', '外放知府', '罢职待勘'] : ['贝子', '贝勒', '郡王', '亲王'];
  const chooseSelectionOption = (option: string) => {
    if (!selectionStep || (peopleRecords[selectionStep.person.id] && !isPersonAlive(peopleRecords[selectionStep.person.id]))) return;
    if (store && selectionStep.person.type === 'CONSORT' && ['严厉呵斥', '罚俸一月', '罚俸一年', '禁足'].includes(option)) {
      setPalacePunishment({ request: { id: 'punishment-' + crypto.randomUUID(), targetId: selectionStep.person.id, reason: '宫规问责', severity: 'MINOR' }, initialDefinitionId: option === '严厉呵斥' ? 'warning' : option === '罚俸一月' ? 'fine-1' : option === '罚俸一年' ? 'fine-12' : undefined });
      setSelectionStep(null); return;
    }
    if (option === '国库珍宝') {
      const recipientId = selectionStep.person.id;
      setSelectionStep(null);
      onOpenTreasury(recipientId);
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
    if (['御赐墨宝', '赏银百两', '赏金百两'].includes(option)) {
      const rewardedPerson = selectionStep.person;
      onReward(rewardedPerson.id, option);
      setSelectionStep(null);
      setDetailPerson(rewardedPerson);
      return;
    }
    if (option === '协理六宫') onSetSixPalaceAssistant(selectionStep.person.id);
    if (option === '特许亲自抚养') {
      if (!hasBiologicalChildren) {
        onNotice(`${selectionStep.person.name}当前没有可交由本人抚养的皇嗣。`);
        return;
      }
      onGrantPersonalChildCare(selectionStep.person.id);
      onNotice(`${selectionStep.person.name}已奉旨获准亲自抚养所生皇嗣，不受位份限制。`);
      setSelectionStep(null);
      return;
    }
    if (option === '母子分离') {
      onSeparateMotherAndChildren(selectionStep.person.id);
      onNotice(`${selectionStep.person.name}与所育皇嗣已奉旨分居，皇嗣迁往撷芳殿。`);
      setSelectionStep(null);
      return;
    }
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
    if (option === '削爵' && selectionStep.person.type === 'PRINCE') {
      const record = peopleRecords[selectionStep.person.id];
      const restoredTitle = record?.preHeirTitle ?? '皇子';
      setPending({
        person: selectionStep.person,
        actionId: 'strip-title',
        title: '削夺爵位',
        body: buildPrinceStripTitleEdict(record, selectionStep.person.name, restoredTitle),
        confirmLabel: '奉旨用印',
        target: restoredTitle,
        commit: 'TITLE',
      });
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

  const isUnraisedRoyal = (personId: string) => {
    const record = peopleRecords[personId];
    return Boolean(record && record.age < 15 && (record.kind === 'PRINCE' || record.kind === 'PRINCESS') && !record.parents.some((id) => peopleRecords[id]?.kind === 'CONSORT'));
  };
  const isEmpress = (personId: string) => {
    const record = peopleRecords[personId];
    return Boolean(record && record.kind === 'CONSORT' && record.rank === '皇后');
  };
  const actionsFor = (person: PersonProfile) => {
    const record = peopleRecords[person.id];
    if (record && !isPersonAlive(record)) return [];
    if (record && (record.kind === 'PRINCE' || record.kind === 'PRINCESS')) {
      const rosterState = { people: peopleRecords, relationships, crownPrinceId: store?.gameState.crownPrinceId ?? crownPrinceId ?? null } as never;
      const base = getAvailableRoyalActions(record, rosterState);
      return isUnraisedRoyal(person.id) && isPersonAlive(record) ? [...base, { id: 'adopt', label: '过继', group: 'primary' as const }] : base;
    }
    const base = getPersonActions(person.type, { pregnant: record?.status === 'PREGNANT', custody: record?.status === 'COLD_PALACE' ? 'COLD_PALACE' : record?.status === 'PRISON' ? 'PRISON' : undefined, age: record?.age, visitReason: person.type === 'CONSORT' ? visitEligibility(person.id).reason : undefined });
    const withDisabledMove = base.map((action) => action.id === 'move' && isEmpress(person.id) ? { ...action, disabled: true as const } : action);
    return isUnraisedRoyal(person.id) && isPersonAlive(record) ? [...withDisabledMove, { id: 'adopt', label: '过继', group: 'primary' as const }] : withDisabledMove;
  };
  const adoptiveMothers = Object.values(peopleRecords).filter((person) => person.kind === 'CONSORT' && ['皇后', '皇贵妃', '贵妃', '妃', '嫔'].includes(person.rank ?? person.title) && !['COLD_PALACE', 'PRISON', 'DEAD'].includes(person.status));
  return <>
    {palacePunishment && <PalacePunishmentDialog request={palacePunishment.request} initialDefinitionId={palacePunishment.initialDefinitionId} onClose={() => setPalacePunishment(null)} onApplied={() => { setPalacePunishment(null); onNotice('处罚已执行，已写入人物履历。'); }} />}
    <div className="people-dock" aria-label="场景人物">{list.slice(0, 4).map((person) => <button key={person.id} className="person-btn idle" onClick={() => openPerson(person)}><div className="portrait-wrap"><div className="portrait-glow" /><div className="portrait-frame"><div className={`portrait ${person.portrait} ${person.portraitUrl ? 'head-portrait' : ''}`} style={{ backgroundImage: `url(${person.portraitUrl ?? portraits})` }} /></div><span className="rank-mark">{displayTitle(person)}</span>{person.dialogue && <span className="event-dot" />}<span className="click-wave" /><span className="spark" /></div><span className="person-name">{person.name}</span></button>)}</div>
    {heirCare && <HeirCareDialog person={heirCare.person} actionId={heirCare.actionId} peopleRecords={peopleRecords} onRecord={(summary) => onRecordAction(heirCare.person.id, 'CARE', summary)} onComplete={() => { const completed = heirCare; setHeirCare(null); setDetailFromRoster(false); const record = peopleRecords[completed.person.id]; if (record) setDetailPerson(profileForRecord(record)); }} />}
    {heirInteraction && peopleRecords[heirInteraction.person.id] && <HeirCultivationDialog person={heirInteraction.person} record={peopleRecords[heirInteraction.person.id]} kind={heirInteraction.kind} onApply={(optionId) => onHeirInteraction(heirInteraction.person.id, heirInteraction.kind, optionId)} onClose={() => setHeirInteraction(null)} />}
    {dialogue && <SceneDialogue person={dialogue} peopleRecords={peopleRecords} onRecord={(summary, effects) => onRecordAction(dialogue.id, 'DIALOGUE', summary, effects)} onComplete={() => { const completed = dialogue; setDialogue(null); if (summonedGreetingId === completed.id) setSummonedGreetingId(null); setDetailFromRoster(false); const record = peopleRecords[completed.id]; if (record) setDetailPerson(profileForRecord(record)); }} />}
    {selected && peopleRecords[selected.id] && <ApprovedPersonDetail person={selected} title={`${displayTitle(selected)} · ${sceneTitle}`} record={peopleRecords[selected.id]} history={history} relationships={relationships} people={peopleRecords} actionItems={actionsFor(selected)} onAction={(actionId) => beginAction(selected, actionId)} onClose={() => setSelected(null)} />}
    {detailPerson && peopleRecords[detailPerson.id] && <ApprovedPersonDetail person={detailPerson} title={`${displayTitle(detailPerson)} · ${sceneTitle}`} record={peopleRecords[detailPerson.id]} history={history} relationships={relationships} people={peopleRecords} actionItems={(() => {
            const base = actionsFor(detailPerson);
            if (!detailFromRoster || detailPerson.type !== 'CONSORT') return base;
            return [{ id: 'travel', label: '前往', group: 'primary' as const }, { id: 'summon', label: '召见', group: 'primary' as const }, ...base.slice(2)];
          })()} onAction={(actionId) => { setDetailPerson(null); beginAction(detailPerson, actionId); }} onClose={() => { const wasRosterDetail = detailFromRoster; setDetailPerson(null); if (wasRosterDetail) onRequestedDetailClose?.(); }} />}
    {moveStep && !moveStep.palace && <FramedModal variant="notice" onClose={() => setMoveStep(null)}><p className="dialogue-speaker">迁转居所</p><p className="dialogue-copy">先择定宫室。仅显示符合{displayTitle(moveStep.person)}身份且尚未占用的主殿或侧殿。</p><div className="choice-grid">{availableRooms.map((room) => <button key={room.id} onClick={() => setMoveStep({ ...moveStep, palace: room.id })}>{room.palace}<small>{room.room}</small></button>)}</div></FramedModal>}
    {moveStep && selectedResidence && <FramedModal variant="notice" onClose={() => setMoveStep(null)}><p className="dialogue-speaker">迁宫确认</p><p className="dialogue-copy">拟令{moveStep.person.name}迁居{selectedResidence.palace}{selectedResidence.room}，宫人、陈设与月例将随旨调整。</p><button className="dialogue-option primary-option" onClick={() => { onResidenceChange(assignResidence(moveStep.person.id, selectedResidence.id, residenceState)); onRecordAction(moveStep.person.id, 'RESIDENCE', `${moveStep.person.name}奉旨迁居${selectedResidence.palace}${selectedResidence.room}。`); onNotice(`${moveStep.person.name}已迁居${selectedResidence.palace}${selectedResidence.room}。`); setMoveStep(null); }}>降旨迁宫</button><button className="dialogue-option" onClick={() => setMoveStep({ person: moveStep.person })}>重选宫室</button></FramedModal>}
    {selectionStep && <FramedModal variant="notice" onClose={() => setSelectionStep(null)}><p className="dialogue-speaker">{selectionStep.kind === 'reward' ? '选择赏赐' : selectionStep.kind === 'accountability' ? '问责处置' : selectionStep.kind === 'transfer' ? '调任去向' : '选择爵位'}</p><p className="dialogue-copy">{selectionStep.kind === 'reward' ? `为${selectionStep.person.name}择定赏赐。` : selectionStep.kind === 'accountability' ? `为${selectionStep.person.name}选择具体处置。` : selectionStep.kind === 'transfer' ? `为${selectionStep.person.name}选择新的差事与去向。` : `为${selectionStep.person.name}拟定爵位与封号。`}</p><div className="choice-grid">{selectionOptions.map((option) => <button key={option} disabled={(option === '协理六宫' && !sixPalaceAssistants.includes(selectionStep.person.id) && sixPalaceAssistants.length >= 3) || (option === '褫夺封号' && !peopleRecords[selectionStep.person.id]?.honorific)} onClick={() => chooseSelectionOption(option)}>{option}</button>)}</div>{selectionStep.kind === 'ennoble' && <input className="title-input" aria-label="封号" placeholder="输入自定义封号" />}</FramedModal>}
    {honorificPerson && <FramedModal variant="notice" onClose={() => { setHonorificPerson(null); setCustomHonorific(''); }}><p className="dialogue-speaker">赏赐封号</p><p className="dialogue-copy">可为{honorificPerson.name}择一至两字，宫中已使用的完整封号不再列出。</p><div className="honorific-grid">{availableHonorifics.map((honorific) => <button key={honorific} className={customHonorific.includes(honorific) ? 'active' : ''} onClick={() => toggleHonorific(honorific)}>{honorific}</button>)}</div><div className="honorific-custom"><input value={customHonorific} onChange={(event) => setCustomHonorific(event.target.value.replace(/[^㐀-鿿]/g, '').slice(0, 2))} maxLength={2} placeholder="已选封号，也可自定义" aria-label="待赐封号" /><button disabled={!customHonorific} onClick={() => grantHonorific(customHonorific)}>确认赐号</button></div></FramedModal>}
    {adoptionEdict && <EdictPrototype action={adoptionEdict} onComplete={() => { onNotice(adoptionEdict.body); setAdoptionEdict(null); }} />}
    {adoptChild && <FramedModal variant="notice" onClose={() => setAdoptChild(null)}><p className="dialogue-speaker">皇嗣过继</p><p className="dialogue-copy">{adoptChild.name}当前无人抚养，请择一位妃嫔为养母。妃位及以上随养母同住，其他皇嗣仍居撷芳殿。</p><div className="choice-grid">{adoptiveMothers.map((mother) => <button key={mother.id} onClick={() => { onAdoptRoyalChild(adoptChild.id, mother.id); setAdoptionEdict({ person: adoptChild, actionId: 'adopt', title: '皇嗣过继', body: `${adoptChild.name}奉旨过继给${mother.name}（${mother.rank ?? mother.title}）抚养。自即日起，悉心教养，宗人府录入玉牒。`, target: mother.name, confirmLabel: '过继完成' }); setAdoptChild(null); }}>{mother.name}<small>{mother.honorific ?? ''}{mother.rank ?? mother.title} · {mother.residence ?? '未定居所'}</small></button>)}</div>{adoptiveMothers.length === 0 && <p className="selection-warning">当前没有可承担抚养职责的妃嫔。</p>}</FramedModal>}    {restorePersonProfile && <FramedModal variant="notice" onClose={() => setRestorePersonProfile(null)}><p className="dialogue-speaker">恢复位份</p><p className="dialogue-copy">请选择恢复{restorePersonProfile.name}的位份。恢复后将重新安排符合位份的宫室。</p><div className="choice-grid">{['官女子', '答应', '常在', '贵人', '嫔', '妃', '贵妃', '皇贵妃'].map((rank) => <button key={rank} onClick={() => { onRestorePerson(restorePersonProfile.id, rank); onNotice(`${restorePersonProfile.name}已恢复为${rank}，并重新安排宫室。`); setRestorePersonProfile(null); }}>{rank}</button>)}</div></FramedModal>}
    {favorPerson && <FavorPrototype person={favorPerson} onClose={() => { const eligible = visitEligibility(favorPerson.id); if (!eligible.allowed) { onNotice(eligible.reason!); setFavorPerson(null); return; } onConsortVisit(favorPerson.id); onNotice(`今夜临幸${favorPerson.name}，宠爱 +8，其他结果将于明日卯时（6点）结算。`); setFavorPerson(null); }} />}
    {rankStep && !rankStep.target && <FramedModal variant="notice" onClose={() => setRankStep(null)}><p className="dialogue-speaker">{rankStep.person.type === 'CONSORT' ? '改定位分' : '改定品阶'}</p><p className="dialogue-copy">由陛下亲择目标{rankStep.person.type === 'CONSORT' ? '位分' : '品阶'}；上调满编位置不可选择。</p><div className="choice-grid">{promotionOptions.map((option) => <button key={option.label} disabled={!option.available} onClick={() => setRankStep({ ...rankStep, target: option.label })}>{option.label}<small>{option.note}</small></button>)}</div></FramedModal>}
    {rankStep?.target && <FramedModal variant="notice" onClose={() => setRankStep(null)}><p className="dialogue-speaker">改位确认</p><p className="dialogue-copy">拟将{rankStep.person.name}改为{rankStep.target}。相关品秩、俸禄、仪制与居所资格将一并更新。</p><button className="dialogue-option primary-option" onClick={() => { const target = rankStep.target!; const currentRank = personRanks[rankStep.person.id] ?? rankStep.person.title; const isDemotion = rankStep.person.type === 'CONSORT' && getDemotionOptions(currentRank).some((option) => option.label === target); const record = peopleRecords[rankStep.person.id]; const title = rankStep.person.type === 'CONSORT' ? isDemotion ? '贬降位份' : '册定位分' : isDemotion ? '降定品阶' : '擢升品阶'; const body = rankStep.person.type === 'CONSORT' ? buildConsortRankEdict(record, rankStep.person.name, currentRank, target, isDemotion) : buildMinisterRankEdict(record, rankStep.person.name, currentRank, target, isDemotion); setPending({ person: rankStep.person, actionId: 'rank-change', title, body, confirmLabel: isDemotion ? '奉旨降位' : '奉旨用印', target, commit: 'RANK' }); setRankStep(null); }}>确认执行</button><button className="dialogue-option" onClick={() => setRankStep({ person: rankStep.person, mode: 'change' })}>重选位阶</button></FramedModal>}
    {pending && <EdictPrototype action={pending} peopleRecords={peopleRecords} onComplete={confirm} />}
    {adjustment && <AdjustmentPrototype kind={adjustment.kind} person={adjustment.person} record={peopleRecords[adjustment.person.id]} people={peopleRecords} currentTitle={personRanks[adjustment.person.id] ?? adjustment.person.title} onComplete={(target) => { const person = adjustment.person; const kind = adjustment.kind; const currentRank = personRanks[person.id] ?? person.title; const unavailablePromotion = kind === 'consort-rank' && isConsortRankAvailable(target as ConsortRank, consortCounts) === false ? target : undefined; const unavailableRoyalTitle = kind === 'prince-title' ? royalTitleEligibility(peopleRecords[person.id], target) : undefined; if (unavailablePromotion) { setAdjustment(null); onNotice(`内侍提醒：${target}位编制已满，无法晋升。`); return; } if (unavailableRoyalTitle && !unavailableRoyalTitle.ok) { setAdjustment(null); onNotice(`内侍提醒：${unavailableRoyalTitle.reason}`); return; } const oldTitle = kind === 'minister-office' ? peopleRecords[person.id]?.office ?? person.title : displayTitle(person); const isConsortDemotion = kind === 'consort-rank' && getDemotionOptions(currentRank).some((option) => option.label === target); const title = isConsortDemotion ? '贬降位份' : kind === 'consort-rank' ? '册定位分' : kind === 'minister-rank' ? '整饬品秩' : kind === 'minister-office' ? '调任官职' : '册封爵位'; const body = buildAdjustmentEdict(kind, peopleRecords[person.id], person.name, currentRank, target, isConsortDemotion); const commit = kind === 'minister-office' ? 'OFFICE' : kind === 'prince-title' ? 'TITLE' : 'RANK'; setAdjustment(null); setPending({ person, actionId: kind, title, body, confirmLabel: isConsortDemotion ? '奉旨降位' : '奉旨用印', target, commit }); }} onClose={() => setAdjustment(null)} />}
  </>;
}
