import { isPersonAlive, killPerson } from './game/person';
import { isRoyalInLaw } from './game/royalInLaws';
import { PosthumousTitleDialog } from './components/PosthumousTitleDialog';
import { GameStateContext, useSharedGameState } from './game/GameStateContext';
import { consortVisitEligibility } from './game/palacePunishments';
import { useEffect, useMemo, useState } from 'react';
import { PalaceCasesPanel } from './features/PalaceCases';
import { ChevronLeft, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react';
import frontMap from './assets/front-court-base.png';
import innerMap from './assets/inner-court-base.png';
import yangxinScene from './assets/yangxin-scene.png';
import yikunScene from './assets/yikun-scene.png';
import yikunCourtyardMap from './assets/yikun-courtyard-map.png';
import taiheScene from './assets/front-taihe.png';
import qianqingGateScene from './assets/front-qianqing-gate.png';
import yangxinBaseScene from './assets/front-yangxin.png';
import militaryScene from './assets/front-military.png';
import wumenScene from './assets/front-wumen.png';
import wenhuaScene from './assets/front-wenhua.png';
import innerPalaceScene from './assets/inner-palace-compound.png';
import innerPalaceMainScene from './assets/inner-palace-main-hall.png';
import huitongScene from './assets/front-huitong.png';
import householdScene from './assets/front-household.png';
import clanScene from './assets/front-clan.png';
import innerStudyScene from './assets/inner-study.png';
import coldPalaceScene from './assets/inner-cold-palace.png';
import medicalScene from './assets/inner-medical.png';
import shoukangScene from './assets/inner-shoukang.png';
import kitchenScene from './assets/inner-kitchen.png';
import ciningScene from './assets/inner-cining.png';
import xiefangScene from './assets/inner-xiefang.png';
import yuqingScene from './assets/inner-yuqing.png';
import frontStudyScene from './assets/front-study.png';
import frontDrillScene from './assets/front-drill.png';
import innerQianqingScene from './assets/inner-qianqing.png';
import innerJiaotaiScene from './assets/inner-jiaotai.png';
import innerKuningMainScene from './assets/inner-kuning-main.png';
import innerGardenScene from './assets/inner-garden.png';
import innerEastHallScene from './assets/inner-palace-east-hall.png';
import innerWestHallScene from './assets/inner-palace-west-hall.png';
import innerCourtyardScene from './assets/inner-palace-courtyard.png';
import { EdictPrototype, FavorPrototype, ScenePeople, type PendingAction, type PersonProfile } from './features/ScenePeople';
import flipCardPrototype from '../docs/交互代码/翻牌子.txt?raw';
import { PersonRoster, type RosterKind } from './features/PersonRoster';
import { PalaceSelectionPanel } from './features/PalaceSelection';
import { RoyalMarriagePanel } from './features/RoyalMarriage';
import { CrownPrincePanel } from './features/CrownPrince';
import { CivilExaminationPanel, type CivilExamVenue } from './features/CivilExamination';
import { SettingsPage } from './features/Settings';
import { CharacterSheet } from './components/CharacterSheet';
import { CourtSession } from './features/CourtSession';
import { HouseholdOffice } from './features/HouseholdOffice';
import { Treasury } from './features/Treasury';
import { getTimePhase, WeatherEffects, type WeatherKind } from './components/WeatherEffects';
import type { PeopleState, ScenePersonStatus, ScenePersonType } from './game/people';
import { grantDirectReward, grantInventoryGift, grantRoyalTitle, type FinanceState } from './game/economy';
import { canOccupyMainHall, getAvailableMainHalls, getAvailableResidences, getResidenceSceneId, parseResidenceLabel, residenceStateFromPeople, type ConsortRank, type ResidenceState } from './game/residences';
import { demoConsort, demoEmperor, type Character } from './game/characters';
import { formatClockTime, formatShichen, type TimeSpeed } from './game/clock';
import { useGameStore } from './game/useGameStore';
import { accompanyPregnantConsort, advanceGameState, currentEvent, nameRoyalChild, resolveEvent, schedulePalaceVisit, skipGameMonths, skipGameYears } from './game/simulation';
import { clockDate, type CourtDepartment, type GameEvent, type PersonRecord } from './game/gameState';
import { getRoyalNameSuggestions, isValidRoyalName } from './game/royalNames';
import { confirmPalaceSelection, decideSelectionCandidate, schedulePalaceSelection } from './game/palaceSelection';
import { eligibleRoyalHeirs, marriageTitleFollowUp, resolveRoyalMarriageEvent } from './game/royalMarriage';
import { appointCrownPrince, crownPrinceCandidates } from './game/crownPrince';
import { civilExamActionForScene } from './game/civilExam';
import { courtEntryLabel, selectCourtDepartment, startDailyCourt } from './game/courtSession';
import { palaceScenes, type PalaceScene } from './game/palaceMap';
import { adoptRoyalChild, grantPersonalChildCare, orphanConsortChildren, separateMotherAndChildren } from './game/heirCare';
import { consortRanks, getPromotionOptions } from './game/ranks';
import { applyHeirInteraction, type HeirInteractionKind } from './game/heirEducation';
import './styles.css';
import './a11y.css';

type View = 'front' | 'inner' | 'treasury' | 'settings' | 'court' | 'household' | 'yangxin' | 'yikun';
type DetailId = 'taihe' | 'qianqing-gate' | 'yangxin-base' | 'military' | 'wumen' | 'wenhua' | 'huitong' | 'household' | 'clan' | 'study' | 'drill' | 'inner-palace' | 'inner-study' | 'cold-palace' | 'medical' | 'shoukang' | 'kitchen' | 'cining' | 'xiefang' | 'yuqing' | 'qianqing-palace' | 'jiaotai' | 'garden' | 'kuning';

interface DetailScene {
  id: DetailId;
  locationId?: string;
  title: string;
  art: string;
  description: string;
  isPalaceCompound?: boolean;
  mainArt?: string;
}

interface MapGate {
  id: string;
  label: string;
  aria: string;
  top: number;
  left: number;
  target: View;
  layout?: 'horizontal' | 'vertical';
  detail?: DetailId;
}

const firstLevelGates: Record<'front' | 'inner', MapGate[]> = {
  front: [
    { id: 'taihe', label: '太和殿', aria: '查看太和殿', top: 13, left: 50, target: 'front', detail: 'taihe' },
    { id: 'court', label: '乾清门', aria: '进入乾清门', top: 28, left: 50, target: 'court', detail: 'qianqing-gate' },
    { id: 'yangxin', label: '养心殿', aria: '进入养心殿', top: 37, left: 18, target: 'yangxin', layout: 'vertical', detail: 'yangxin-base' },
    { id: 'military', label: '军机处', aria: '查看军机处', top: 37, left: 82, target: 'front', layout: 'vertical', detail: 'military' },
    { id: 'study', label: '御书房', aria: '查看御书房', top: 51, left: 18, target: 'front', layout: 'vertical', detail: 'study' },
    { id: 'wenhua', label: '文华殿', aria: '查看文华殿', top: 51, left: 82, target: 'front', layout: 'vertical', detail: 'wenhua' },
    { id: 'drill', label: '演武场', aria: '查看演武场', top: 60, left: 50, target: 'front', detail: 'drill' },
    { id: 'clan', label: '宗人府', aria: '查看宗人府', top: 68, left: 18, target: 'front', layout: 'vertical', detail: 'clan' },
    { id: 'household', label: '内务府', aria: '进入内务府', top: 68, left: 82, target: 'household', layout: 'vertical', detail: 'household' },
    { id: 'huitong', label: '会同馆', aria: '查看会同馆', top: 76, left: 50, target: 'front', detail: 'huitong' },
    { id: 'wumen', label: '午门', aria: '查看午门', top: 90, left: 50, target: 'front', detail: 'wumen' },
  ],
  inner: [
    { id: 'garden', label: '御花园', aria: '查看御花园', top: 13, left: 50, target: 'inner', detail: 'garden' },
    { id: 'qianqing', label: '乾清宫', aria: '查看乾清宫', top: 25, left: 50, target: 'inner', detail: 'qianqing-palace' },
    { id: 'jiaotai', label: '交泰殿', aria: '查看交泰殿', top: 36, left: 50, target: 'inner', detail: 'jiaotai' },
    { id: 'kuning', label: '坤宁宫', aria: '查看坤宁宫', top: 51, left: 50, target: 'inner', detail: 'kuning' },
    { id: 'chuxiu', label: '储秀宫', aria: '查看储秀宫', top: 25, left: 17, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'yikun', label: '翊坤宫', aria: '进入翊坤宫', top: 33, left: 17, target: 'yikun', layout: 'vertical', detail: 'inner-palace' },
    { id: 'changchun', label: '长春宫', aria: '查看长春宫', top: 41, left: 17, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'xianfu', label: '咸福宫', aria: '查看咸福宫', top: 49, left: 17, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'taiji', label: '启祥宫', aria: '查看启祥宫', top: 57, left: 17, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'yongshou', label: '永寿宫', aria: '查看永寿宫', top: 66, left: 17, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'jingren', label: '景仁宫', aria: '查看景仁宫', top: 25, left: 83, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'chengqian', label: '承乾宫', aria: '查看承乾宫', top: 33, left: 83, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'zhongcui', label: '钟粹宫', aria: '查看钟粹宫', top: 41, left: 83, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'yonghe', label: '永和宫', aria: '查看永和宫', top: 49, left: 83, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'jingyang', label: '景阳宫', aria: '查看景阳宫', top: 57, left: 83, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'yanxi', label: '延禧宫', aria: '查看延禧宫', top: 66, left: 83, target: 'inner', layout: 'vertical', detail: 'inner-palace' },
    { id: 'cining', label: '慈宁宫', aria: '查看慈宁宫', top: 80, left: 16, target: 'inner', detail: 'cining' },
    { id: 'yuqing', label: '毓庆宫', aria: '查看毓庆宫', top: 80, left: 50, target: 'inner', detail: 'yuqing' },
    { id: 'kitchen', label: '御膳房', aria: '查看御膳房', top: 80, left: 83, target: 'inner', detail: 'kitchen' },
    { id: 'shoukang', label: '寿康宫', aria: '查看寿康宫', top: 92, left: 10, target: 'inner', detail: 'shoukang' },
    { id: 'xiefang', label: '撷芳殿', aria: '查看撷芳殿', top: 92, left: 31, target: 'inner', detail: 'xiefang' },
    { id: 'school', label: '上书房', aria: '查看上书房', top: 92, left: 51, target: 'inner', detail: 'inner-study' },
    { id: 'medical', label: '太医院', aria: '查看太医院', top: 92, left: 70, target: 'inner', detail: 'medical' },
    { id: 'cold-palace', label: '冷宫', aria: '查看冷宫', top: 92, left: 91, target: 'inner', detail: 'cold-palace' },
  ],
};

const sceneArt: Record<PalaceScene['art'], string> = {
  yangxin: yangxinScene,
  yikun: yikunScene,
  yikunCourtyard: yikunCourtyardMap,
};

const detailScenes: Record<DetailId, DetailScene> = {
  taihe: { id: 'taihe', title: '太和殿', art: taiheScene, description: '殿试、传胪与重大庆典举行之地。' },
  'qianqing-gate': { id: 'qianqing-gate', title: '乾清门', art: qianqingGateScene, description: '百官每日常朝、廷议与奏对之地。' },
  'yangxin-base': { id: 'yangxin-base', title: '养心殿', art: yangxinBaseScene, description: '批阅奏折、召见大臣与休憩之所。' },
  military: { id: 'military', title: '军机处', art: militaryScene, description: '机要军政在此呈报与议定。' },
  wumen: { id: 'wumen', title: '午门', art: wumenScene, description: '百官朝拜、凯旋与大典出入之门。' },
  wenhua: { id: 'wenhua', title: '文华殿', art: wenhuaScene, description: '经筵讲学、会试考务与进士授官之所。' },
  huitong: { id: 'huitong', title: '会同馆', art: huitongScene, description: '使团接待、朝贡与外交谈判之所。' },
  household: { id: 'household', title: '内务府', art: householdScene, description: '宫廷采购、修缮、宫人与皇家产业的总管衙门。' },
  clan: { id: 'clan', title: '宗人府', art: clanScene, description: '宗室谱牒、爵位、婚丧与皇族案件之所。' },
  study: { id: 'study', title: '御书房', art: frontStudyScene, description: '阅读经史、研究政策与亲拟殿试策问之所。' },
  drill: { id: 'drill', title: '演武场', art: frontDrillScene, description: '骑射、比武与禁军检阅之所。' },
  'inner-palace': { id: 'inner-palace', title: '后宫', art: innerPalaceScene, description: '主殿、后殿与东西配殿环抱的独立院落。', isPalaceCompound: true },
  kuning: { id: 'kuning', title: '坤宁宫', art: innerPalaceScene, description: '皇后居所、册后与祭祀之所。', isPalaceCompound: true, mainArt: innerKuningMainScene },
  'qianqing-palace': { id: 'qianqing-palace', title: '乾清宫', art: innerQianqingScene, description: '家宴、宗室召集与皇室内部事务之所。' },
  jiaotai: { id: 'jiaotai', title: '交泰殿', art: innerJiaotaiScene, description: '皇后管理六宫、宫务账册与节庆仪式之所。' },
  garden: { id: 'garden', title: '御花园', art: innerGardenScene, description: '游赏、偶遇与季节事件发生之所。' },
  'inner-study': { id: 'inner-study', title: '上书房', art: innerStudyScene, description: '皇嗣统一授课、考核与师生事件之所。' },
  'cold-palace': { id: 'cold-palace', title: '冷宫', art: coldPalaceScene, description: '失势妃嫔安置与特殊宫务调查之所。' },
  medical: { id: 'medical', title: '太医院', art: medicalScene, description: '诊脉、用药、疾病与生产处置之所。' },
  shoukang: { id: 'shoukang', title: '寿康宫', art: shoukangScene, description: '太妃与长辈居停、请安与家宴之所。' },
  kitchen: { id: 'kitchen', title: '御膳房', art: kitchenScene, description: '膳食供给、食材品质与传膳记录之所。' },
  cining: { id: 'cining', title: '慈宁宫', art: ciningScene, description: '太后居所与六宫长辈事务之所。' },
  xiefang: { id: 'xiefang', title: '撷芳殿', art: xiefangScene, description: '年幼皇嗣照料、健康与启蒙之所。' },
  yuqing: { id: 'yuqing', title: '毓庆宫', art: yuqingScene, description: '储君培养、政治班底与监国事务之所。' },
};

function sceneDisplayName(sceneId: string) {
  const [locationId, room] = sceneId.split(':');
  const gate = [...firstLevelGates.front, ...firstLevelGates.inner].find((item) => item.id === locationId);
  const base = gate?.label ?? detailScenes[locationId as DetailId]?.title ?? locationId;
  return room ? `${base}${room}` : base;
}

function formatGameDate(date: import('./game/gameState').GameDate) {
  return `永和${date.year}年${date.month}月${date.day}日`;
}

export default function App() {
  const store = useGameStore();
  return <GameStateContext.Provider value={store}><GameApplication key={store.revision} store={store} /></GameStateContext.Provider>;
}

function GameApplication({ store }: { store: ReturnType<typeof useGameStore> }) {
  const [view, setView] = useState<View>('front');
  const { gameState, setGameState } = useSharedGameState();
  const [character, setCharacter] = useState<Character | null>(null);
  const [toast, setToast] = useState('');
  const [posthumousPersonId, setPosthumousPersonId] = useState<string | null>(null);
  const [griefEvent, setGriefEvent] = useState<GameEvent | null>(null);
  const [zoom, setZoom] = useState(1);
  const [detail, setDetail] = useState<DetailScene | null>(null);
  const [palaceRoom, setPalaceRoom] = useState<'主殿' | '东侧殿' | '西侧殿' | '庭院' | null>(null);
  const giftState = gameState.gifts;
  const [treasuryRecipientId, setTreasuryRecipientId] = useState<string | null>(null);
  const [treasuryReturn, setTreasuryReturn] = useState<{ detail: DetailScene; room: '主殿' | '东侧殿' | '西侧殿' | '庭院' | null; personId: string } | null>(null);
  const [resumePersonId, setResumePersonId] = useState<string | null>(null);
  const [residenceState, setResidenceState] = useState(() => residenceStateFromPeople(gameState.people));
  const [autoOpenSelection, setAutoOpenSelection] = useState(false);
  const [namingChildId, setNamingChildId] = useState<string | null>(null);
  const [namingQueue, setNamingQueue] = useState<string[]>([]);
  const [birthCare, setBirthCare] = useState<{ motherId: string; childId: string } | null>(null);
  const [namingEdict, setNamingEdict] = useState<{ child: PersonRecord; name: string } | null>(null);
  const [flipCardsOpen, setFlipCardsOpen] = useState(false);
  const [flippedConsortId, setFlippedConsortId] = useState<string | null>(null);
  const [marriageOpen, setMarriageOpen] = useState(false);
  const [marriageResult, setMarriageResult] = useState<{ royalId: string; message: string } | null>(null);
  const [marriageTitlePersonId, setMarriageTitlePersonId] = useState<string | null>(null);
  const [marriageTitleResult, setMarriageTitleResult] = useState<{ name: string; fullTitle: string } | null>(null);
  const [crownPrinceOpen, setCrownPrinceOpen] = useState(false);
  const [pendingCrownPrinceId, setPendingCrownPrinceId] = useState<string | null>(null);
  const [civilExamVenue, setCivilExamVenue] = useState<CivilExamVenue | null>(null);
  const [sceneInteractionBusy, setSceneInteractionBusy] = useState(false);
  const [palaceCasesOpen, setPalaceCasesOpen] = useState(false);
  const [selectedPalaceCaseId, setSelectedPalaceCaseId] = useState<string>();

  const activeSceneId = detail
    ? detail.isPalaceCompound
      ? palaceRoom ? `${detail.locationId ?? detail.id}:${palaceRoom}` : null
      : detail.id
    : null;

  const clock = gameState.clock;
  const speed = gameState.speed;
  const setSpeed = (next: TimeSpeed) => setGameState((current) => ({ ...current, speed: next }));
  const emperorRecord = gameState.people.emperor;
  const emperor: Character = { ...demoEmperor, name: emperorRecord.name, title: emperorRecord.title, age: emperorRecord.age, avatar: emperorRecord.name.slice(0, 1) };
  const setEmperor = (next: Character & Pick<PersonRecord, 'reignName' | 'clanName'>) => setGameState((current) => ({ ...current, people: { ...current.people, emperor: { ...current.people.emperor, name: next.name, title: next.title, reignName: next.reignName, clanName: next.clanName } } }));
  const peopleState: PeopleState = { people: Object.values(gameState.people).filter((person) => isPersonAlive(person) && !isRoyalInLaw(person, gameState) && (person.kind === 'MINISTER' || person.kind === 'CONSORT' || person.kind === 'DOWAGER' || person.kind === 'NOBLE' || person.kind === 'PRINCE' || person.kind === 'PRINCESS')).map((person) => ({ id: person.id, type: (person.kind === 'MINISTER' ? 'MINISTER' : person.kind === 'CONSORT' ? 'CONSORT' : person.kind === 'DOWAGER' ? 'DOWAGER' : person.kind === 'NOBLE' ? 'NOBLE' : 'PRINCE') as ScenePersonType, name: person.name, sceneId: person.sceneId, status: (person.status === 'NORMAL' || person.status === 'PREGNANT' || person.status === 'CONFINED' || person.status === 'COLD_PALACE' || person.status === 'PRISON' ? 'IN_SCENE' : person.status === 'SICK' ? 'SICK' : person.status === 'REST' ? 'REST' : person.status === 'OUTSIDE' ? 'OUTSIDE' : 'LOCK') as ScenePersonStatus, priority: person.kind === 'CONSORT' || person.kind === 'DOWAGER' || person.kind === 'NOBLE' ? 1 : 2 })) };
  const setPeopleState = (next: PeopleState) => setGameState((current) => ({ ...current, people: Object.fromEntries(Object.entries(current.people).map(([id, person]) => { const scenePerson = next.people.find((item) => item.id === id); return [id, scenePerson && isPersonAlive(person) ? { ...person, sceneId: scenePerson.sceneId } : person]; })) }));
  const personRanks = Object.fromEntries(Object.values(gameState.people).map((person) => [person.id, person.rank ?? person.title]));
  const characterRecord = character ? Object.values(gameState.people).find((person) => person.name === character.name || (character.kind === 'emperor' && person.id === 'emperor')) : undefined;
  const openEunuchDetail = (personId: string) => {
    const record = gameState.people[personId];
    if (!record) return;
    setCharacter({
      id: record.id,
      kind: 'eunuch',
      name: record.name,
      title: [record.office, record.rank].filter(Boolean).join(' · ') || record.title,
      age: record.age,
      avatar: record.name.slice(0, 1),
      radar: [
        { label: '忠诚', value: record.stats['忠诚'] ?? 0 },
        { label: '智慧', value: record.stats['智慧'] ?? 0 },
        { label: '野心', value: record.stats['野心'] ?? null },
        { label: '派系影响', value: record.stats['派系影响'] ?? 0 },
        { label: '已知财富', value: record.stats['已知财富'] ?? 0 },
        { label: '健康', value: record.stats['健康'] ?? 0 },
      ],
      note: `${record.traits.join('、') || '性情待察'} · ${record.residence ?? '宫中'}`,
    });
  };
  const pendingEvent = currentEvent(gameState);
  const presentedEvent = palaceCasesOpen || posthumousPersonId || griefEvent || sceneInteractionBusy || character || toast || namingChildId || birthCare || namingEdict || flipCardsOpen || flippedConsortId || marriageOpen || marriageResult || marriageTitleResult || crownPrinceOpen || pendingCrownPrinceId || civilExamVenue
    ? null
    : pendingEvent;
  const navigateToScene = (sceneId: string) => {
    const [locationId, room] = sceneId.split(':');
    const innerGate = firstLevelGates.inner.find((gate) => gate.id === locationId);
    const frontGate = firstLevelGates.front.find((gate) => gate.id === locationId || gate.detail === locationId);
    const gate = innerGate ?? frontGate;
    setZoom(1);
    setPalaceRoom(null);
    if (room && innerGate) {
      const sceneIdForGate = innerGate.detail === 'kuning' ? 'kuning' : 'inner-palace';
      setView('inner');
      setDetail({ ...detailScenes[sceneIdForGate], title: innerGate.label, locationId: innerGate.id });
      setPalaceRoom(room as '主殿' | '东侧殿' | '西侧殿' | '庭院');
      return;
    }
    if (gate?.detail) {
      setView(innerGate ? 'inner' : 'front');
      setDetail({ ...detailScenes[gate.detail], title: gate.label, locationId: gate.id });
      return;
    }
    if (detailScenes[locationId as DetailId]) {
      const target = detailScenes[locationId as DetailId];
      setView(['jiaotai', 'garden', 'kuning', 'qianqing-palace', 'yuqing', 'xiefang'].includes(locationId) ? 'inner' : 'front');
      setDetail({ ...target, locationId });
      return;
    }
    setDetail(null);
    setView(locationId === 'inner' ? 'inner' : 'front');
  };
  const chooseEvent = (event: GameEvent, choiceId: string) => {
    if (event.type !== 'SYSTEM_NOTICE' && event.personIds.some(id => !isPersonAlive(gameState.people[id]))) return;
    const choice = event.choices.find((item) => item.id === choiceId);
    if (event.type === 'MARRIAGE_BANQUET' || event.type === 'MARRIAGE_NOTICE') {
      const next = resolveRoyalMarriageEvent(gameState, event.id, choiceId);
      setGameState(next);
      if (choiceId === 'go-banquet') navigateToScene('garden');
      else if (choiceId === 'approve-marriage') setMarriageResult({ royalId: event.personIds[0], message: choice?.result ?? '婚配已经定下。' });
      else setToast(choice?.result ?? '婚配事务已经处理。');
      return;
    }
    setGameState((current) => resolveEvent(current, event.id, choiceId));
    if (event.palaceCaseId) {
      setSelectedPalaceCaseId(event.palaceCaseId);
      setPalaceCasesOpen(true);
      return;
    }
    if (event.type === 'SYSTEM_NOTICE' && event.id.startsWith('death-notice-')) {
      if (choiceId === 'posthumous') setPosthumousPersonId(event.personIds[0]);
      if (choiceId === 'grieve' && choice) setGriefEvent({ ...event, title: '内侍劝慰', body: choice.result, choices: [{ id: 'close', label: '退下吧', result: '' }] });
      return;
    }
    if (event.id.startsWith('event-selection-open-')) {
      if (choiceId === 'go-selection') {
        setAutoOpenSelection(true);
        navigateToScene('jiaotai');
      }
      return;
    }
    if (event.id.startsWith('event-selection-review-')) {
      if (choiceId === 'go-selection-review') {
        setAutoOpenSelection(true);
        navigateToScene('jiaotai');
      }
      return;
    }
    if (event.id.startsWith('event-civil-exam-')) {
      if (choiceId === 'go-civil-exam-wenhua') navigateToScene('wenhua');
      if (choiceId === 'go-civil-exam-study') navigateToScene('study');
      if (choiceId === 'go-civil-exam-taihe') navigateToScene('taihe');
      return;
    }    if (event.type === 'PREGNANCY_NOTICE') {
      const consort = gameState.people[event.personIds[0]];
      if (choiceId === 'visit' && consort) {
        const residence = parseResidenceLabel(consort.residence);
        const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
        if (sceneId) navigateToScene(sceneId);
        return;
      }
      if (choiceId === 'reward') {
        setTreasuryRecipientId(event.personIds[0] ?? null);
        setDetail(null);
        setPalaceRoom(null);
        setView('treasury');
        return;
      }
      if (choiceId === 'silence') return;
      setToast('龙心大悦，皇帝快乐 +8。');
      return;
    }
    if (event.type === 'BIRTH_NOTICE') {
      const mother = gameState.people[event.personIds[0]];
      const childIds = event.personIds.slice(1).filter((id) => Boolean(gameState.people[id]));
      const child = childIds[0] ? gameState.people[childIds[0]] : undefined;
      if (!child) return;
      if (choiceId === 'birth-visit' && mother) {
        const residence = parseResidenceLabel(mother.residence);
        const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
        if (sceneId) navigateToScene(sceneId);
        setNamingQueue(childIds.slice(1));
        setBirthCare({ motherId: mother.id, childId: child.id });
        return;
      }
      if (choiceId === 'birth-treasure') {
        setTreasuryRecipientId(mother?.id ?? null);
        setDetail(null);
        setPalaceRoom(null);
        setView('treasury');
      }
      setNamingQueue(childIds.slice(1));
      setNamingChildId(child.id);
      return;
    }
    setToast(choice?.result ?? '此事已处理。');
  };
  const changePersonRank = (personId: string, rank: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!isPersonAlive(person) || person.rank === rank) return current;
    if (person.kind === 'CONSORT') {
      const counts = Object.values(current.people).reduce<Partial<Record<ConsortRank, number>>>((result, item) => {
        if (item.kind === 'CONSORT' && isPersonAlive(item)) {
          const currentRank = (item.rank ?? item.title) as ConsortRank;
          result[currentRank] = (result[currentRank] ?? 0) + 1;
        }
        return result;
      }, {});
      const target = getPromotionOptions('CONSORT', person.rank ?? person.title, counts).find((option) => option.label === rank);
      if (target && !target.available) {
        setToast(`内侍提醒：${rank}位编制已满，无法晋升。`);
        return current;
      }
    }
    let changedPerson = { ...person, rank, title: person.kind === 'CONSORT' ? rank : person.title };
    let relocation = '';
    if (person.kind === 'CONSORT' && canOccupyMainHall(rank as ConsortRank) && parseResidenceLabel(person.residence)?.room !== '主殿') {
      const halls = getAvailableMainHalls(current.people);
      const hall = halls[Math.floor(Math.random() * halls.length)];
      if (hall) {
        relocation = `，并迁居${hall.palace}${hall.room}`;
        changedPerson = { ...changedPerson, residence: `${hall.palace}${hall.room}`, sceneId: getResidenceSceneId(hall.palace, hall.room) ?? changedPerson.sceneId };
      }
    }
    const promoted = person.kind === 'CONSORT' && consortRanks.indexOf(rank as ConsortRank) > consortRanks.indexOf((person.rank ?? person.title) as ConsortRank);
    if (promoted) changedPerson = { ...changedPerson, stats: { ...changedPerson.stats, 宠爱: Math.min(100, (changedPerson.stats['宠爱'] ?? 0) + 6) } };
    return {
      ...current,
      people: { ...current.people, [personId]: changedPerson },
      history: [...current.history, { id: `history-rank-${personId}-${Date.now()}`, date: clockDate(current.clock), type: person.kind === 'CONSORT' ? 'CONSORT_RANK' : 'OFFICIAL_GRADE', summary: `${person.name}由${person.rank ?? person.title}调整为${rank}${relocation}${promoted ? '，宠爱 +6' : ''}。`, personIds: [personId, 'emperor'] }],
    };
  });
  const changePersonOffice = (personId: string, office: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!isPersonAlive(person) || person.office === office) return current;
    return { ...current, people: { ...current.people, [personId]: { ...person, office, title: office } }, history: [...current.history, { id: `history-office-${personId}-${Date.now()}`, date: clockDate(current.clock), type: 'OFFICIAL_APPOINTMENT', summary: `${person.name}由${person.office ?? person.title}奉旨调任${office}。`, personIds: [personId, 'emperor'] }] };
  });
  const changePersonTitle = (personId: string, title: string) => setGameState((current) => grantRoyalTitle(current, personId, title).state);
  const changePersonHonorific = (personId: string, honorific: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!isPersonAlive(person) || person.kind !== 'CONSORT' || (person.honorific ?? '') === honorific) return current;
    const summary = honorific ? `${person.name}获赐“${honorific}”字封号。` : `${person.name}的封号已被褫夺。`;
    return { ...current, people: { ...current.people, [personId]: { ...person, honorific: honorific || undefined } }, history: [...current.history, { id: `history-honorific-${personId}-${Date.now()}`, date: clockDate(current.clock), type: honorific ? 'CONSORT_HONORIFIC' : 'CONSORT_HONORIFIC_REMOVED', summary, personIds: [personId, 'emperor'] }] };
  });
  const changePersonStatus = (personId: string, status: PersonRecord['status'], destination?: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!isPersonAlive(person) || !isPersonAlive(person)) return current;
    if (status === 'DEAD') return killPerson(current, personId, '奉旨处死');
    const sceneId = destination ?? person.sceneId;
    const prisonName = person.kind === 'PRINCE' || person.kind === 'PRINCESS' || person.kind === 'NOBLE' ? '宗人府' : '天牢';
    const summary = status === 'COLD_PALACE' ? `${person.name}奉旨打入冷宫。`
      : status === 'PRISON' ? `${person.name}奉旨收押于${prisonName}。`
        : `${person.name}的状态改为${status}。`;
    const changed = {
      ...person,
      status,
      sceneId,
      residence: status === 'COLD_PALACE' ? '冷宫' : status === 'PRISON' ? prisonName : person.residence,
      dialogue: undefined,
      previousSceneId: person.previousSceneId ?? person.sceneId,
      previousResidence: person.previousResidence ?? person.residence,
    };
    const changedState = {
      ...current,
      people: { ...current.people, [personId]: changed },
      history: [...current.history, { id: `history-status-${personId}-${Date.now()}`, date: clockDate(current.clock), type: 'PERSON_STATUS', summary, personIds: [personId, 'emperor'] }],
    };
    return person.kind === 'CONSORT' && status === 'COLD_PALACE' ? orphanConsortChildren(changedState, personId) : changedState;
  });
  const restorePerson = (personId: string, rank?: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!isPersonAlive(person) || (person.status !== 'COLD_PALACE' && person.status !== 'PRISON')) return current;
    let sceneId = person.previousSceneId ?? person.sceneId;
    let residence = person.previousResidence ?? person.residence;
    let title = person.title;
    if (person.kind === 'CONSORT' && rank) {
      title = rank;
      const available = getAvailableResidences(rank as ConsortRank, residenceStateFromPeople(current.people));
      const previous = available.find((room) => `${room.palace}${room.room}` === residence);
      const room = previous ?? available[0];
      if (room) {
        residence = `${room.palace}${room.room}`;
        sceneId = getResidenceSceneId(room.palace, room.room) ?? sceneId;
      }
    }
    const changed = { ...person, status: 'NORMAL' as const, rank: person.kind === 'CONSORT' && rank ? rank : person.rank, title, residence, sceneId, previousSceneId: undefined, previousResidence: undefined };
    return {
      ...current,
      people: { ...current.people, [personId]: changed },
      history: [...current.history, { id: `history-restore-${personId}-${Date.now()}`, date: clockDate(current.clock), type: 'PERSON_RESTORED', summary: person.kind === 'CONSORT' ? `${person.name}获准恢复为${rank ?? person.rank ?? person.title}，封号照旧。` : `${person.name}获释并恢复自由。`, personIds: [personId, 'emperor'] }],
    };
  });
  const confirmRoyalName = (childId: string, name: string) => {
    const child = gameState.people[childId];
    if (!isPersonAlive(child) || !isValidRoyalName(name, childId, gameState.people, gameState.usedNames.royals)) return false;
    setGameState((current) => nameRoyalChild(current, childId, name));
    setNamingChildId(null);
    setBirthCare(null);
    setNamingEdict({ child, name: name.trim() });
    return true;
  };
  const recordPersonAction = (personId: string, type: string, summary: string, effects?: import('./game/gameState').HistoryEffect[]) => setGameState((current) => {
    if (!isPersonAlive(current.people[personId])) return current;
    const affinityDelta = type === 'ACCOUNTABILITY' ? -6 : type === 'CUSTODY_VISIT' ? 4 : type === 'REWARD' ? 4 : type === 'DIALOGUE' ? 2 : 0;
    const trustDelta = type === 'ACCOUNTABILITY' ? -4 : type === 'CUSTODY_VISIT' ? 1 : type === 'REWARD' ? 2 : type === 'DIALOGUE' ? 1 : 0;
    const relationships = current.relationships.map((relationship) => {
      const isEmperorRelation = (relationship.personAId === 'emperor' && relationship.personBId === personId) || (relationship.personBId === 'emperor' && relationship.personAId === personId);
      return isEmperorRelation ? { ...relationship, affinity: Math.max(0, Math.min(100, relationship.affinity + affinityDelta)), trust: Math.max(0, Math.min(100, relationship.trust + trustDelta)) } : relationship;
    });
    const person = current.people[personId];
    const isHeirDialogue = type === 'DIALOGUE' && (person?.kind === 'PRINCE' || person?.kind === 'PRINCESS');
    let people = current.people;
    if (isHeirDialogue && effects) {
      const stats = { ...person.stats };
      effects = effects.map((effect) => {
        if (!['宠爱', '勤奋', '文学', '才学'].includes(effect.label)) return effect;
        const before = stats[effect.label] ?? 0;
        stats[effect.label] = Math.max(0, Math.min(100, before + effect.value));
        return { ...effect, value: stats[effect.label] - before };
      });
      people = { ...people, [personId]: { ...person, stats } };
    }
    return { ...current, people, relationships, history: [...current.history, { id: `history-${type.toLowerCase()}-${personId}-${Date.now()}`, date: clockDate(current.clock), type, summary, effects, personIds: [personId, 'emperor'] }] };
  });
  const rewardPerson = (personId: string, reward: string) => setGameState((current) => {
    const result = grantDirectReward(current, personId, reward);
    window.setTimeout(() => setToast(result.message), 0);
    return result.state;
  });
  const rewardFromTreasury = (personId: string, itemId: string, quantity: number) => setGameState((current) => {
    const result = grantInventoryGift(current, personId, itemId, quantity);
    window.setTimeout(() => {
      setToast(result.message);
      if (result.ok && treasuryReturn?.personId === personId) {
        setDetail(treasuryReturn.detail);
        setPalaceRoom(treasuryReturn.room);
        setResumePersonId(personId);
        setTreasuryRecipientId(null);
        setTreasuryReturn(null);
        setView('front');
      }
    }, 0);
    return result.state;
  });

  const changeResidences = (next: ResidenceState) => {
    setResidenceState(next);
    setGameState((current) => {
      const people = { ...current.people };
      next.residences.forEach((residence) => {
        if (!residence.occupantId || !isPersonAlive(people[residence.occupantId])) return;
        const sceneId = getResidenceSceneId(residence.palace, residence.room);
        people[residence.occupantId] = { ...people[residence.occupantId], residence: `${residence.palace}${residence.room}`, sceneId: sceneId ?? people[residence.occupantId].sceneId };
      });
      return { ...current, people };
    });
  };

  useEffect(() => {
    if (!store.hydrated || store.busy) return;
    let last = performance.now();
    let lastCommit = last;
    let carriedRealMs = 0;
    let frameId = 0;
    const renderFrame = (now: number) => {
      const elapsed = Math.min(250, Math.max(0, now - last));
      last = now;
      carriedRealMs += elapsed;
      if (now - lastCommit < 50) {
        frameId = requestAnimationFrame(renderFrame);
        return;
      }
      lastCommit = now;
      setGameState((current) => {
        if (current.speed === 0) {
          carriedRealMs = 0;
          return current;
        }
        const realMsPerGameMinute = 50 / current.speed;
        const elapsedGameMinutes = Math.floor(carriedRealMs / realMsPerGameMinute);
        if (elapsedGameMinutes < 1) return current;
        const consumedRealMs = elapsedGameMinutes * realMsPerGameMinute;
        carriedRealMs -= consumedRealMs;
        return advanceGameState(current, consumedRealMs, current.speed, activeSceneId);
      });
      frameId = requestAnimationFrame(renderFrame);
    };
    const resetFrameClock = () => {
      last = performance.now();
      lastCommit = last;
      carriedRealMs = 0;
    };
    document.addEventListener('visibilitychange', resetFrameClock);
    frameId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', resetFrameClock);
    };
  }, [activeSceneId, setGameState, store.hydrated, store.busy]);

  const residenceSignature = Object.values(gameState.people).filter((person) => person.kind === 'CONSORT').map((person) => `${person.id}:${person.residence ?? ''}`).sort().join('|');
  useEffect(() => {
    setResidenceState(residenceStateFromPeople(gameState.people));
  }, [residenceSignature]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const weather: WeatherKind = gameState.weather;
  const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const date = useMemo(() => `永和${clock.year}年 ${monthNames[clock.month - 1]}月${clock.day}日 · ${formatShichen(clock.minuteOfDay)} ${formatClockTime(clock.minuteOfDay)} · ${weather}`, [clock, weather]);
  const namingChild = namingChildId ? gameState.people[namingChildId] : undefined;
  const careMother = birthCare ? gameState.people[birthCare.motherId] : undefined;
  const careChild = birthCare ? gameState.people[birthCare.childId] : undefined;
  const flippedConsort = flippedConsortId ? gameState.people[flippedConsortId] : undefined;
  const pendingCrownPrince = pendingCrownPrinceId ? gameState.people[pendingCrownPrinceId] : undefined;
  const currentCrownPrince = gameState.crownPrinceId ? gameState.people[gameState.crownPrinceId] : undefined;
  const crownPrinceEdictAction: PendingAction | null = pendingCrownPrince ? {
    person: { id: pendingCrownPrince.id, name: pendingCrownPrince.name, title: pendingCrownPrince.title, avatar: pendingCrownPrince.name.slice(-1), portrait: 'prince', type: 'PRINCE', priority: 1 } satisfies PersonProfile,
    actionId: gameState.crownPrinceId ? 'replace-crown-prince' : 'appoint-crown-prince',
    title: gameState.crownPrinceId ? '改立储君' : '册立储君',
    confirmLabel: '奉旨用印',
    body: currentCrownPrince
      ? `今改立${pendingCrownPrince.name}为${pendingCrownPrince.kind === 'PRINCESS' ? '皇太女' : '太子'}，原储君${currentCrownPrince.name}复归原序，新储君迁居毓庆宫，以固国本，钦此。`
      : `今册立${pendingCrownPrince.name}为${pendingCrownPrince.kind === 'PRINCESS' ? '皇太女' : '太子'}，迁居毓庆宫，以承宗祧、固国本，钦此。`,
  } : null;
  const namingEdictAction: PendingAction | null = namingEdict ? {
    person: { id: namingEdict.child.id, name: namingEdict.name, title: namingEdict.child.title, avatar: namingEdict.name.slice(-1), portrait: 'prince', type: 'PRINCE', priority: 1 } satisfies PersonProfile,
    actionId: 'royal-naming', title: '赐名皇嗣', confirmLabel: '奉旨用印',
    body: `今有${namingEdict.child.kind === 'PRINCESS' ? '皇女' : '皇子'}初诞，嘉祥可庆，特赐名“${namingEdict.name}”，录入宗牒，以昭皇绪，钦此。`,
  } : null;
  const birthFlowOverlays = <>
    {palaceCasesOpen && <PalaceCasesPanel initialCaseId={selectedPalaceCaseId} onClose={() => setPalaceCasesOpen(false)} />}
    {posthumousPersonId && <PosthumousTitleDialog key={posthumousPersonId} personId={posthumousPersonId} onClose={() => setPosthumousPersonId(null)} />}
    {griefEvent && <AttendantEventDialog event={griefEvent} onChoose={() => setGriefEvent(null)} />}
    {careMother && careChild && <PostBirthCareDialog mother={careMother} child={careChild} people={gameState.people} usedNames={gameState.usedNames.royals} onRecord={(summary) => recordPersonAction(careMother.id, 'POSTPARTUM_CARE', summary)} onNeedName={() => { setBirthCare(null); setNamingChildId(careChild.id); }} onAcceptName={(name) => confirmRoyalName(careChild.id, name)} />}
    {namingChild && <RoyalNameDialog child={namingChild} people={gameState.people} usedNames={gameState.usedNames.royals} onConfirm={(name) => confirmRoyalName(namingChild.id, name)} />}
    {namingEdict && namingEdictAction && <EdictPrototype action={namingEdictAction} peopleRecords={gameState.people} onComplete={() => {
      const [nextChildId, ...remaining] = namingQueue;
      setNamingEdict(null);
      setNamingQueue(remaining);
      if (nextChildId) setNamingChildId(nextChildId);
    }} />}
    {flipCardsOpen && <FlipCardPrototype people={gameState.people} date={clockDate(gameState.clock)} onClose={() => setFlipCardsOpen(false)} onSelect={(personId) => { setFlipCardsOpen(false); setFlippedConsortId(personId); }} />}
    {flippedConsort && <FavorPrototype placement="flip" person={{ id: flippedConsort.id, name: flippedConsort.name, title: flippedConsort.rank ?? flippedConsort.title, avatar: flippedConsort.name.slice(0, 1), portrait: flippedConsort.id === 'empress' ? 'empress' : 'consort', type: 'CONSORT', priority: 1 }} onClose={() => { const name = flippedConsort.name; const eligibility = consortVisitEligibility(gameState.people[flippedConsort.id], clockDate(gameState.clock)); if (!eligibility.allowed) { setFlippedConsortId(null); setToast(eligibility.reason ?? '无法临幸'); return; } setGameState((current) => schedulePalaceVisit(current, flippedConsort.id)); setFlippedConsortId(null); setToast(`今夜临幸${name}，宠爱 +8，其他结果将于明日卯时（6点）结算。`); }} />}
    {marriageOpen && <RoyalMarriagePanel state={gameState} onChange={setGameState} onClose={() => setMarriageOpen(false)} onNotice={setToast} onMarriageComplete={(royalId, message) => { setMarriageOpen(false); setMarriageResult({ royalId, message }); }} />}
    {marriageResult && <MessageDialog message={marriageResult.message} onClose={() => { const followUp = marriageTitleFollowUp(gameState, marriageResult.royalId); setMarriageResult(null); if (followUp) { setMarriageTitlePersonId(followUp.personId); navigateToScene('xiefang'); } }} />}
    {marriageTitleResult && <MarriageTitleResultDialog name={marriageTitleResult.name} fullTitle={marriageTitleResult.fullTitle} onClose={() => setMarriageTitleResult(null)} />}
    {crownPrinceOpen && <CrownPrincePanel state={gameState} onClose={() => setCrownPrinceOpen(false)} onSelect={(personId) => { setCrownPrinceOpen(false); setPendingCrownPrinceId(personId); }} />}
    {civilExamVenue && <CivilExaminationPanel state={gameState} venue={civilExamVenue} onChange={setGameState} onClose={() => setCivilExamVenue(null)} onNotice={setToast} />}
    {pendingCrownPrince && crownPrinceEdictAction && <EdictPrototype action={crownPrinceEdictAction} peopleRecords={gameState.people} onComplete={() => { const name = pendingCrownPrince.name; const title = pendingCrownPrince.kind === 'PRINCESS' ? '皇太女' : '太子'; setGameState((current) => appointCrownPrince(current, pendingCrownPrince.id)); setPendingCrownPrinceId(null); setToast(`${name}已奉旨册立为${title}，迁居毓庆宫。`); }} />}
  </>;

  if (view === 'court') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} finances={gameState.finances} onEmperor={() => setCharacter(emperor)}><CourtSession state={gameState} onChange={setGameState} onBack={() => { setDetail(null); setView('front'); }} />{character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}</PhoneFrame>;
  }

  if (view === 'household') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} finances={gameState.finances} onEmperor={() => setCharacter(emperor)}><HouseholdOffice people={gameState.people} onBack={() => setView('front')} onOpenDetail={openEunuchDetail} />{character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}</PhoneFrame>;
  }

  if (view === 'settings') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} finances={gameState.finances} onEmperor={() => setCharacter(emperor)} noDaylight noWeather><SettingsPage store={store} clock={clock} pendingEvents={gameState.events.filter((event) => event.status === 'PENDING').length} onSkipMonth={() => setGameState((current) => { const before = current.events.filter((event) => event.status === 'PENDING').length; const next = skipGameMonths(current, 1); const accumulated = Math.max(0, next.events.filter((event) => event.status === 'PENDING').length - before); window.setTimeout(() => setToast(`已推进一月，期间新增${accumulated}件待呈报事件，宫廷事务均已正常结算。`), 0); return next; })} onSkipYears={(years) => setGameState((current) => { const before = current.events.filter((event) => event.status === 'PENDING').length; const next = skipGameYears(current, years); const accumulated = Math.max(0, next.events.filter((event) => event.status === 'PENDING').length - before); window.setTimeout(() => setToast(`已推进${years}年，期间新增${accumulated}件待呈报事件，宫廷事务均已正常结算。`), 0); return next; })} /><BottomNav view={view} setView={setView} />{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}</PhoneFrame>;
  }
  if (view === 'treasury') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} finances={gameState.finances} onEmperor={() => setCharacter(emperor)} noDaylight noWeather><Treasury onBack={() => { setTreasuryRecipientId(null); setView('front'); }} giftState={giftState} people={gameState.people} recipientId={treasuryRecipientId} onGift={rewardFromTreasury} /><BottomNav view={view} setView={(next) => setView(next)} />{character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}</PhoneFrame>;
  }

  if (detail) {
    return (
      <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} finances={gameState.finances} onEmperor={() => setCharacter(emperor)}>
        <DetailSceneView
          scene={detail}
          activeRoom={palaceRoom}
          onBack={() => { if (palaceRoom) setPalaceRoom(null); else setDetail(null); }}
          onOpenRoom={setPalaceRoom}
          onNotice={setToast}
          peopleState={peopleState}
          onPeopleChange={setPeopleState}
          onReward={rewardPerson}
          residenceState={residenceState}
          onResidenceChange={changeResidences}
          personRanks={personRanks}
          onRankChange={changePersonRank}
          peopleRecords={gameState.people}
          history={gameState.history}
          relationships={gameState.relationships}
          onOfficeChange={changePersonOffice}
          onTitleChange={changePersonTitle}
          onHonorificChange={changePersonHonorific}
          onRecordAction={recordPersonAction}
          sixPalaceAssistants={gameState.sixPalaceAssistants}
          onSetSixPalaceAssistant={(personId) => setGameState((current) => !isPersonAlive(current.people[personId]) || current.sixPalaceAssistants.includes(personId) || current.sixPalaceAssistants.length >= 3 ? current : { ...current, sixPalaceAssistants: [...current.sixPalaceAssistants, personId] })}
          onConsortVisit={(personId) => setGameState((current) => schedulePalaceVisit(current, personId))}
          onConsortCompanion={(personId) => setGameState((current) => accompanyPregnantConsort(current, personId))}
          onPersonStatusChange={changePersonStatus}
          onSeparateMotherAndChildren={(motherId) => setGameState((current) => separateMotherAndChildren(current, motherId))}
          onGrantPersonalChildCare={(motherId) => setGameState((current) => grantPersonalChildCare(current, motherId))}
          onAdoptRoyalChild={(childId, motherId) => setGameState((current) => adoptRoyalChild(current, childId, motherId))}
          onHeirInteraction={(childId, kind, optionId) => setGameState((current) => applyHeirInteraction(current, childId, kind, optionId))}
          onRestorePerson={restorePerson}
          onOpenTreasury={(recipientId) => { setTreasuryReturn({ detail, room: palaceRoom, personId: recipientId }); setTreasuryRecipientId(recipientId); setDetail(null); setView('treasury'); }}
          palaceSelection={gameState.palaceSelection}
          currentDate={clockDate(gameState.clock)}
          onScheduleSelection={() => setGameState((current) => schedulePalaceSelection(current))}
          onSelectionDecision={(candidateId, decision) => setGameState((current) => decideSelectionCandidate(current, candidateId, decision))}
          onConfirmSelection={(assignments) => setGameState((current) => confirmPalaceSelection(current, assignments))}
          onNavigateToScene={navigateToScene}
          onTravelToPerson={(personId, sceneId) => { const person = gameState.people[personId]; setToast(`内侍高声传驾：“摆驾${person?.residence ?? '后宫'}，看望${person?.rank ?? person?.title ?? ''}${person?.name ?? ''}。”`); navigateToScene(sceneId); }}
          onNavigateToYangxin={() => navigateToScene('yangxin-base')}
          autoOpenSelection={autoOpenSelection}
          onSelectionAutoOpened={() => setAutoOpenSelection(false)}
          onOpenFlipCards={() => setFlipCardsOpen(true)}
          onOpenRoyalMarriage={() => {
            if (!eligibleRoyalHeirs(gameState).length) { setToast('当前没有年满十五岁且尚未婚配的皇嗣。'); return; }
            setMarriageOpen(true);
          }}
          courtActionLabel={detail.id === 'qianqing-gate' ? courtEntryLabel(gameState) : null}
          civilExamActionLabel={civilExamActionForScene(gameState, detail.id)}
          onOpenCourt={(department) => {
            if (!department) { setView('court'); return; }
            const prepared = startDailyCourt(gameState);
            const issue = prepared.courtSession?.agenda.find((item) => item.department === department && (item.status === 'PENDING' || item.status === 'DEBATING'));
            if (!issue) { setToast(`内侍回禀：${department}今日已无待议事项。`); return; }
            setGameState(selectCourtDepartment(prepared, department));
            setView('court');
          }}
          onOpenCivilExam={() => setCivilExamVenue(detail.id as CivilExamVenue)}
          crownPrinceId={gameState.crownPrinceId}
          onOpenCrownPrince={() => {
            const candidates = crownPrinceCandidates(gameState).filter((person) => person.id !== gameState.crownPrinceId);
            if (!candidates.length) { setToast(gameState.crownPrinceId ? '当前没有其他可改立的皇嗣。' : '当前没有可册立为储君的皇嗣。'); return; }
            setCrownPrinceOpen(true);
          }}
          resumePersonId={resumePersonId}
          onResumePersonHandled={() => setResumePersonId(null)}
          marriageTitlePersonId={marriageTitlePersonId}
          onMarriageTitlePersonHandled={() => setMarriageTitlePersonId(null)}
          onRoyalTitleComplete={(personId, fullTitle) => { if (personId !== marriageTitlePersonId) return false; const person = gameState.people[personId]; setMarriageTitleResult({ name: person?.name ?? '', fullTitle }); setMarriageTitlePersonId(null); return true; }}
          onInteractionChange={setSceneInteractionBusy}
        />
        {character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}
        {toast && <MessageDialog message={toast} onClose={() => setToast('')} />}
        {presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}
        {birthFlowOverlays}
      </PhoneFrame>
    );
  }

  const structuredScene = view === 'yangxin' ? palaceScenes.yangxin : view === 'yikun' ? palaceScenes.yikun : null;

  return (
    <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} finances={gameState.finances} onEmperor={() => setCharacter(emperor)}>
      {structuredScene ? (
        <StructuredScene
          scene={structuredScene}
          zoom={zoom}
          onBack={() => setView(view === 'yangxin' ? 'front' : 'inner')}
          onZoom={(next) => setZoom(next)}
          onCharacter={setCharacter}
          onNotice={setToast}
        />
      ) : (
        <PalaceOverview
          kind={view === 'inner' ? 'inner' : 'front'}
          onGate={(gate) => {
            if (gate.detail) {
              setPalaceRoom(null);
              setDetail({ ...detailScenes[gate.detail], title: gate.label, locationId: gate.id });
              return;
            }
            gate.target === view ? setToast(`${gate.label}还在布置中`) : setView(gate.target);
          }}
          onCharacter={setCharacter}
        />
      )}
      <BottomNav view={view} setView={(next) => { setZoom(1); setView(next); }} />
      {toast && <MessageDialog message={toast} onClose={() => setToast('')} />}
      {character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}
      {presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}
      {birthFlowOverlays}
    </PhoneFrame>
  );
}

function MessageDialog({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="message-prototype"><main className="stage"><section className="dialog-wrap" aria-label="人物对话弹窗"><div className="name-ribbon">内侍传言</div><div className="dialog-box"><p className="dialog-text">{message}</p><button className="next" aria-label="关闭消息" onClick={onClose} /></div></section><div className="hint">点击右下角金色箭头关闭</div></main></div>;
}

function MarriageTitleResultDialog({ name, fullTitle, onClose }: { name: string; fullTitle: string; onClose: () => void }) {
  return <div className="message-prototype"><main className="stage"><section className="dialog-wrap" aria-label="礼部传旨"><div className="name-ribbon">礼部传旨</div><div className="dialog-box"><p className="dialog-text">制曰：既已婚配，宜加恩命。今册封为：</p><strong style={{ display: 'block', textAlign: 'center', color: '#f4d58b', fontSize: '28px', margin: '12px 0' }}>{fullTitle}</strong><p className="dialog-text" style={{ textAlign: 'center' }}>{name}</p><button className="next" aria-label="关闭册封结果" onClick={onClose} /></div></section><div className="hint">点击右下角金色箭头结束婚配与册封流程</div></main></div>;
}

export function AttendantEventDialog({ event, onChoose }: { event: GameEvent; onChoose: (choiceId: string) => void }) {
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label={`${event.title}：${event.body}`}><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">{event.title}</div><div className="dialogue-box"><p className="dialogue-text">{event.body}</p></div></div></section><section className="choice-panel" aria-label="内侍传言选项">{event.choices.map((choice) => <button key={choice.id} className="choice-btn" onClick={() => onChoose(choice.id)}>{choice.label}</button>)}</section></div></main></div>;
}

export function ConsortAwayDialog({ consortName, locationName, onDismiss, onYangxin, onFollow }: { consortName: string; locationName: string; onDismiss: () => void; onYangxin: () => void; onFollow: () => void }) {
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay consort-away-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label={`${consortName}不在宫中`}><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">宫女回禀</div><div className="dialogue-box"><p className="dialogue-text">启禀陛下，{consortName}此刻去了{locationName}，尚未回宫。</p></div></div></section><section className="choice-panel" aria-label="寻访妃嫔选项"><button className="choice-btn" onClick={onDismiss}>罢了</button><button className="choice-btn" onClick={onYangxin}>回养心殿</button><button className="choice-btn" onClick={onFollow}>拜驾{locationName}</button></section></div></main></div>;
}

export function RoyalNameDialog({ child, people, usedNames, onConfirm }: { child: PersonRecord; people: Record<string, PersonRecord>; usedNames: string[]; onConfirm: (name: string) => boolean }) {
  const suggestions = useMemo(() => getRoyalNameSuggestions(child, people, 3, usedNames), [child, people, usedNames]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const submit = (name: string) => {
    if (onConfirm(name)) return;
    setError('姓名需为二至四个汉字，且不得与已有皇嗣重名。');
  };
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay royal-name-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label="为皇嗣赐名"><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">礼部呈名</div><div className="dialogue-box"><p className="dialogue-text">请您给{child.title}赐名。</p>{customOpen && <div className="royal-name-custom"><input autoFocus value={customName} onChange={(event) => { setCustomName(event.target.value); setError(''); }} maxLength={4} placeholder="输入完整姓名" aria-label="皇嗣姓名" /><button onClick={() => submit(customName)}>确认赐名</button></div>}{error && <p className="royal-name-error">{error}</p>}</div></div></section><section className="choice-panel" aria-label="皇嗣赐名选项">{suggestions.map((name) => <button key={name} className="choice-btn" onClick={() => submit(name)}>{name}</button>)}<button className="choice-btn" onClick={() => setCustomOpen(true)}>朕亲自取名</button></section></div></main></div>;
}

function PostBirthCareDialog({ mother, child, people, usedNames, onRecord, onNeedName, onAcceptName }: { mother: PersonRecord; child: PersonRecord; people: Record<string, PersonRecord>; usedNames: string[]; onRecord: (summary: string) => void; onNeedName: () => void; onAcceptName: (name: string) => boolean }) {
  const [stage, setStage] = useState<'care' | 'request' | 'proposal'>('care');
  const suggestion = useMemo(() => getRoyalNameSuggestions(child, people, 1, usedNames)[0], [child, people, usedNames]);
  const motherMayName = useMemo(() => [...child.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 100 < 45, [child.id]);
  const finishCare = (label: string) => {
    onRecord(`皇帝产后探视${mother.name}，并${label}。`);
    if (motherMayName) setStage('request'); else onNeedName();
  };
  const speaker = stage === 'care' ? mother.name : '产后关怀';
  const copy = stage === 'care'
    ? `臣妾谢陛下亲临。孩子平安，太医说再静养几日便好。`
    : stage === 'request' ? `臣妾有一个不情之请，可否让臣妾也为孩子想一个名字？`
      : `臣妾想了许久，愿为孩子取名“${suggestion}”，不知陛下意下如何？`;
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay post-birth-care-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label="产后关怀剧情"><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">{speaker}</div><div className="dialogue-box"><p className="dialogue-text">{copy}</p></div></div></section><section className="choice-panel">{stage === 'care' && <><button className="choice-btn" onClick={() => finishCare('亲自抱过新生皇嗣')}>亲自抱过皇嗣</button><button className="choice-btn" onClick={() => finishCare('命太医留守用心照料')}>命太医照料</button><button className="choice-btn" onClick={() => finishCare('赐言宽慰')}>赐言宽慰</button></>}{stage === 'request' && <><button className="choice-btn" onClick={() => setStage('proposal')}>准你试拟</button><button className="choice-btn" onClick={onNeedName}>仍由朕定</button></>}{stage === 'proposal' && <><button className="choice-btn" onClick={() => onAcceptName(suggestion)}>同意此名</button><button className="choice-btn" onClick={onNeedName}>此名不妥</button></>}</section></div></main></div>;
}

export function FlipCardPrototype({ people, date, onClose, onSelect }: { people: Record<string, PersonRecord>; date: import('./game/gameState').GameDate; onClose: () => void; onSelect: (personId: string) => void }) {
  // Keep this opening's tray stable while the simulation updates people.
  const [candidates] = useState(() => {
    const shuffled = Object.values(people).filter((person) => consortVisitEligibility(person, date).allowed).map((person) => {
      const surname = person.name.slice(0, 1);
      const effectiveHonorific = person.honorific && person.honorific.length > 0 ? person.honorific : surname;
      return {
        id: person.id,
        name: person.name,
        rank: `${effectiveHonorific}${person.rank ?? person.title}`,
        palace: parseResidenceLabel(person.residence)?.palace ?? person.residence ?? '宫中',
      };
    });
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  });
  const pages = useMemo(() => {
    const chunks: typeof candidates[] = [];
    for (let index = 0; index < candidates.length; index += 8) chunks.push(candidates.slice(index, index + 8));
    return chunks.length ? chunks : [[]];
  }, [candidates]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'flip-card-close') onClose();
      if (event.data?.type === 'flip-card-select' && typeof event.data.personId === 'string' && consortVisitEligibility(people[event.data.personId], date).allowed) onSelect(event.data.personId);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onClose, onSelect, people, date]);
  const document = useMemo(() => flipCardPrototype
    .replace(/const pages = \[[\s\S]*?let currentPage\s*=\s*0;/, () => `const pages = ${JSON.stringify(pages).replace(/</g, '\\u003c')};\n\nlet currentPage = 0;`)
    .replace(/function render\(direction="none"\)\{[\s\S]*?(?=function showToast)/, () => `function render(direction="none") {
      const fragment = document.createDocumentFragment();
      pages[currentPage].forEach(item => {
        const slot = document.createElement('div'); slot.className = '牌-slot';
        const button = document.createElement('button'); button.className = 'green牌';
        button.innerHTML = '<span class="牌-head"></span><span class="牌-body"><span class="牌-text"><span class="牌-name"></span><span class="牌-rank"></span></span><span class="牌-palace"></span></span><span class="selected-check">✓</span>';
        button.querySelector('.牌-name').textContent = item.rank;
        button.querySelector('.牌-rank').textContent = item.name;
        button.querySelector('.牌-palace').textContent = item.palace;
        button.addEventListener('click', () => {
          rack.querySelectorAll('.green牌').forEach(el => el.classList.remove('selected'));
          button.classList.add('selected'); selected = item; confirmBtn.disabled = false;
        });
        slot.appendChild(button); fragment.appendChild(slot);
      });
      rack.replaceChildren(fragment);
      pageInfo.textContent = '第 ' + (currentPage + 1) + ' / ' + pages.length + ' 盘';
      document.getElementById('prevBtn').disabled = currentPage === 0;
      document.getElementById('nextBtn').disabled = currentPage === pages.length - 1;
      rack.style.animation = '';
    }

` )
    .replace('</head>', '<style>html,body{height:100%;background:transparent!important}.stage{height:100%!important;min-height:0!important;background:transparent!important}.mask{display:none!important;background:transparent!important}</style></head>')
    .replace('</body>', `<script>document.getElementById('closeBtn').addEventListener('click',function(){window.parent.postMessage({type:'flip-card-close'},'*')});document.getElementById('summonBtn').addEventListener('click',function(){if(selected)window.parent.postMessage({type:'flip-card-select',personId:selected.id},'*')});<\/script></body>`), [pages]);
  return <div className="prototype-overlay flip-card-overlay"><iframe title="侍寝翻牌" srcDoc={document} />{candidates.length === 0 && <p className="palace-empty-candidates" role="status">当前没有可侍寝的妃嫔。</p>}</div>;
}

function PalaceOverview({ kind, onGate, onCharacter }: { kind: 'front' | 'inner'; onGate: (gate: MapGate) => void; onCharacter: (character: Character) => void }) {
  const gates = firstLevelGates[kind];
  return (
    <section className="map-stage overview-stage" aria-label={kind === 'front' ? '前朝地图' : '后宫地图'}>
      <img className="map-art" src={kind === 'front' ? frontMap : innerMap} alt="" />
      <div className="scene-caption">
        <p>{kind === 'front' ? '前朝宫城' : '后宫禁苑'}</p>
        <span>{kind === 'front' ? '朝会议政 · 批阅奏折 · 宗亲官署' : '东西六宫 · 主殿侧殿 · 妃嫔见闻'}</span>
      </div>
      {gates.map((gate) => (
        <button
          key={gate.id}
          className={`map-plaque ${gate.layout === 'vertical' ? 'vertical' : 'horizontal'}`}
          aria-label={gate.aria}
          style={{ top: `${gate.top}%`, left: `${gate.left}%` }}
          onClick={() => onGate(gate)}
        >{gate.label}</button>
      ))}
    </section>
  );
}

function DetailSceneView({ scene, activeRoom, onBack, onOpenRoom, onNotice, peopleState, onPeopleChange, peopleRecords, history, relationships, onReward, residenceState, onResidenceChange, personRanks, onRankChange, onOfficeChange, onTitleChange, onHonorificChange, onRecordAction, onOpenTreasury, sixPalaceAssistants, onSetSixPalaceAssistant, onConsortVisit, onConsortCompanion, onPersonStatusChange, onSeparateMotherAndChildren, onGrantPersonalChildCare, onAdoptRoyalChild, onRestorePerson, onHeirInteraction, palaceSelection, currentDate, onScheduleSelection, onSelectionDecision, onConfirmSelection, onNavigateToScene, onTravelToPerson, onNavigateToYangxin, autoOpenSelection, onSelectionAutoOpened, onOpenFlipCards, onOpenRoyalMarriage, courtActionLabel, civilExamActionLabel, onOpenCourt, onOpenCivilExam, crownPrinceId, onOpenCrownPrince, resumePersonId, onResumePersonHandled, marriageTitlePersonId, onMarriageTitlePersonHandled, onRoyalTitleComplete, onInteractionChange }: { scene: DetailScene; activeRoom: '主殿' | '东侧殿' | '西侧殿' | '庭院' | null; onBack: () => void; onOpenRoom: (room: '主殿' | '东侧殿' | '西侧殿' | '庭院') => void; onNotice: (message: string) => void; peopleState: import('./game/people').PeopleState; onPeopleChange: (state: import('./game/people').PeopleState) => void; peopleRecords: import('./game/gameState').GameState['people']; history: import('./game/gameState').HistoryEntry[]; relationships: import('./game/gameState').RelationshipRecord[]; onReward: (personId: string, reward: string) => void; residenceState: import('./game/residences').ResidenceState; onResidenceChange: (state: import('./game/residences').ResidenceState) => void; personRanks: Record<string, string>; onRankChange: (personId: string, rank: string) => void; onOfficeChange: (personId: string, office: string) => void; onTitleChange: (personId: string, title: string) => void; onHonorificChange: (personId: string, honorific: string) => void; onRecordAction: (personId: string, type: string, summary: string, effects?: import('./game/gameState').HistoryEffect[]) => void; onOpenTreasury: (recipientId: string) => void; sixPalaceAssistants: string[]; onSetSixPalaceAssistant: (personId: string) => void; onConsortVisit: (personId: string) => void; onConsortCompanion: (personId: string) => void; onPersonStatusChange: (personId: string, status: import('./game/gameState').PersonLifeStatus, destination?: string) => void; onSeparateMotherAndChildren: (motherId: string) => void; onGrantPersonalChildCare: (motherId: string) => void; onAdoptRoyalChild: (childId: string, motherId: string) => void; onRestorePerson: (personId: string, rank?: string) => void; onHeirInteraction: (personId: string, kind: HeirInteractionKind, optionId: string) => void; palaceSelection: import('./game/gameState').PalaceSelectionRecord | null; currentDate: import('./game/gameState').GameDate; onScheduleSelection: () => void; onSelectionDecision: (candidateId: string, decision: import('./game/gameState').SelectionDecision) => void; onConfirmSelection: (assignments: import('./game/palaceSelection').SelectionAssignment[]) => void; onNavigateToScene: (sceneId: string) => void; onTravelToPerson: (personId: string, sceneId: string) => void; onNavigateToYangxin: () => void; autoOpenSelection: boolean; onSelectionAutoOpened: () => void; onOpenFlipCards: () => void; onOpenRoyalMarriage: () => void; courtActionLabel: string | null; civilExamActionLabel: string | null; onOpenCourt: (department?: CourtDepartment) => void; onOpenCivilExam: () => void; crownPrinceId: string | null; onOpenCrownPrince: () => void; resumePersonId: string | null; onResumePersonHandled: () => void; marriageTitlePersonId: string | null; onMarriageTitlePersonHandled: () => void; onRoyalTitleComplete: (personId: string, fullTitle: string) => void; onInteractionChange: (busy: boolean) => void }) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);
  const [requestedPersonId, setRequestedPersonId] = useState<string | null>(null);
  const [returnToRoster, setReturnToRoster] = useState(false);
  const [dismissedAwayKey, setDismissedAwayKey] = useState<string | null>(null);
  const [peopleInteractionBusy, setPeopleInteractionBusy] = useState(false);
  const isCompound = scene.isPalaceCompound && !activeRoom;
  const art = isCompound ? scene.art : activeRoom === '主殿' ? scene.mainArt ?? innerPalaceMainScene : activeRoom === '东侧殿' ? innerEastHallScene : activeRoom === '西侧殿' ? innerWestHallScene : activeRoom === '庭院' ? innerCourtyardScene : scene.art;
  const peopleSceneId = scene.isPalaceCompound ? activeRoom ? `${scene.locationId ?? scene.id}:${activeRoom}` : null : scene.id;
  const roster: { kind: RosterKind; label: string } | null = scene.id === 'clan' ? { kind: 'DECEASED', label: '已故宗亲' } : scene.id === 'cold-palace' ? { kind: 'COLD_PALACE', label: '冷宫名册' } : scene.id === 'jiaotai' ? { kind: 'CONSORT', label: '妃子列表' } : scene.id === 'yangxin-base' ? { kind: 'MINISTER', label: '臣子列表' } : scene.id === 'xiefang' ? { kind: 'HEIR', label: '皇子列表' } : null;
  const awayConsort = peopleSceneId ? Object.values(peopleRecords).find((person) => {
    if (person.kind !== 'CONSORT' || !person.residence) return false;
    const residence = parseResidenceLabel(person.residence);
    const home = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
    return home === peopleSceneId && person.sceneId !== peopleSceneId && !['CONFINED', 'COLD_PALACE', 'PRISON', 'DEAD'].includes(person.status);
  }) : undefined;
  const awayKey = awayConsort ? `${awayConsort.id}:${awayConsort.sceneId}:${peopleSceneId}` : null;
  const localInteractionBusy = peopleInteractionBusy || rosterOpen || selectionOpen || casesOpen || Boolean(awayConsort && awayKey !== dismissedAwayKey);

  useEffect(() => {
    onInteractionChange(localInteractionBusy);
    return () => onInteractionChange(false);
  }, [localInteractionBusy, onInteractionChange]);

  useEffect(() => {
    setDismissedAwayKey(null);
  }, [awayKey]);

  useEffect(() => {
    if (!autoOpenSelection || scene.id !== 'jiaotai') return;
    if (palaceSelection?.status === 'SELECTING' || palaceSelection?.status === 'AWAITING_REVIEW') setSelectionOpen(true);
    onSelectionAutoOpened();
  }, [autoOpenSelection, onSelectionAutoOpened, palaceSelection?.status, scene.id]);

  const openSelection = () => {
    if (palaceSelection?.status === 'SCHEDULED') {
      onNotice(`选秀已经在筹备中，定于${formatGameDate(palaceSelection.selectionOn)}开始，请陛下届时移驾交泰殿。`);
      return;
    }
    setSelectionOpen(true);
  };

  return (
    <section className="map-stage detail-stage" aria-label={`${scene.title}场景`}>
      <img className="map-art" src={art} alt="" />
      <div className="occluder-layer top-shadow" />
      <header className="scene-topper">
        <div className="detail-title"><h2>{activeRoom ? `${scene.title}·${activeRoom}` : scene.title}</h2><p>{activeRoom ? '起居、赏赐与召见' : scene.description}</p></div>
        <button className="round-btn detail-back" aria-label="返回上级地图" onClick={onBack}><ChevronLeft /></button>
        {roster && <button className="scene-directory-button" onClick={() => setRosterOpen(true)}>{roster.label}</button>}
        {scene.id === 'jiaotai' && <button className="scene-directory-button scene-selection-button" onClick={openSelection}>宫中选秀</button>}
        {scene.id === 'jiaotai' && <button className="scene-directory-button scene-cases-button" onClick={() => setCasesOpen(true)}>宫中事务</button>}
        {scene.id === 'yangxin-base' && <button className="scene-directory-button scene-selection-button" onClick={onOpenFlipCards}>召幸翻牌</button>}
        {scene.id === 'xiefang' && <button className="scene-directory-button scene-selection-button" onClick={onOpenRoyalMarriage}>皇子婚配</button>}
        {scene.id === 'yuqing' && <button className="scene-directory-button" onClick={onOpenCrownPrince}>{crownPrinceId ? '改立太子' : '选立太子'}</button>}
        {courtActionLabel && <button className="scene-directory-button" onClick={() => onOpenCourt()}>{courtActionLabel}</button>}
        {civilExamActionLabel && <button className="scene-directory-button" onClick={onOpenCivilExam}>{civilExamActionLabel}</button>}
      </header>
      {isCompound && <>
        <button className="map-plaque horizontal palace-room-label main-room" onClick={() => onOpenRoom('主殿')}>主殿</button>
        <button className="map-plaque vertical palace-room-label west-room" onClick={() => onOpenRoom('西侧殿')}>西侧殿</button>
        <button className="map-plaque vertical palace-room-label east-room" onClick={() => onOpenRoom('东侧殿')}>东侧殿</button>
        <button className="map-plaque horizontal palace-room-label courtyard-room" onClick={() => onOpenRoom('庭院')}>庭院</button>
      </>}
      {peopleSceneId && <ScenePeople sceneId={peopleSceneId} sceneTitle={`${scene.title}${activeRoom ?? ''}`} peopleState={peopleState} onPeopleChange={onPeopleChange} peopleRecords={peopleRecords} history={history} relationships={relationships} requestedPersonId={requestedPersonId ?? resumePersonId} onRequestedPersonHandled={() => { setRequestedPersonId(null); onResumePersonHandled(); }} requestedActionPersonId={marriageTitlePersonId} onRequestedActionHandled={onMarriageTitlePersonHandled} onRoyalTitleComplete={onRoyalTitleComplete} onNotice={onNotice} onReward={onReward} residenceState={residenceState} onResidenceChange={onResidenceChange} personRanks={personRanks} onRankChange={onRankChange} onOfficeChange={onOfficeChange} onTitleChange={onTitleChange} onHonorificChange={onHonorificChange} onRecordAction={onRecordAction} onOpenTreasury={onOpenTreasury} sixPalaceAssistants={sixPalaceAssistants} onSetSixPalaceAssistant={onSetSixPalaceAssistant} onConsortVisit={onConsortVisit} onConsortCompanion={onConsortCompanion} onPersonStatusChange={onPersonStatusChange} onSeparateMotherAndChildren={onSeparateMotherAndChildren} onGrantPersonalChildCare={onGrantPersonalChildCare} onAdoptRoyalChild={onAdoptRoyalChild} onRestorePerson={onRestorePerson} onHeirInteraction={onHeirInteraction} onTravelToPerson={onTravelToPerson} requestedFromRoster={returnToRoster} onRequestedDetailClose={() => { if (returnToRoster) { setRosterOpen(true); setReturnToRoster(false); } }} onInteractionChange={setPeopleInteractionBusy} />}
      {rosterOpen && roster && <PersonRoster kind={roster.kind} people={peopleRecords} onClose={() => setRosterOpen(false)} onOpenDetail={(personId) => { setRosterOpen(false); setReturnToRoster(true); setRequestedPersonId(personId); }} />}
      {casesOpen && <PalaceCasesPanel onClose={() => setCasesOpen(false)} />}
      {selectionOpen && <PalaceSelectionPanel selection={palaceSelection} currentDate={currentDate} residenceState={residenceState} usedHonorifics={Object.values(peopleRecords).map((person) => person.honorific).filter((item): item is string => Boolean(item))} onSchedule={onScheduleSelection} onDecision={onSelectionDecision} onConfirm={(assignments) => { onConfirmSelection(assignments); setSelectionOpen(false); onNotice('新人位份、封号与宫室已经御览确认，正式记入后宫名册。'); }} onClose={() => setSelectionOpen(false)} />}
      {awayConsort && awayKey !== dismissedAwayKey && <ConsortAwayDialog consortName={awayConsort.name} locationName={sceneDisplayName(awayConsort.sceneId)} onDismiss={() => setDismissedAwayKey(awayKey)} onYangxin={onNavigateToYangxin} onFollow={() => onNavigateToScene(awayConsort.sceneId)} />}
    </section>
  );
}

function StructuredScene({ scene, zoom, onBack, onZoom, onCharacter, onNotice }: { scene: PalaceScene; zoom: number; onBack: () => void; onZoom: (zoom: number) => void; onCharacter: (character: Character) => void; onNotice: (message: string) => void }) {
  return (
    <section className="map-stage structured-stage" aria-label={`${scene.title}结构化场景`}>
      <div className={`scene-camera ${scene.art === 'yikunCourtyard' ? 'courtyard-tone' : ''}`} style={{ transform: `scale(${zoom})` }}>
        <img className="map-art" src={sceneArt[scene.art]} alt="" />
        <div className="occluder-layer top-shadow" />
        {scene.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            className="transparent-hotspot scene-hotspot"
            aria-label={`透明热区：${hotspot.label}`}
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }}
            onClick={() => onNotice(`${hotspot.label}：${hotspot.action === 'enter' ? '进入二级房间样板待接入' : '已记录交互点'}`)}
          />
        ))}
        <Walker label="值房太监" role="通传" routeClass={scene.id === 'yangxin' ? 'route-yangxin-servant' : 'route-yikun-maid'} onClick={() => onNotice('值房太监低声禀报：有一封密折到了。')} />
        <Procession label="仪仗队" routeClass={scene.id === 'yangxin' ? 'route-yangxin-procession' : 'route-yikun-procession'} onClick={() => onCharacter(demoConsort)} />
      </div>
      <header className="scene-topper">
        <button className="round-btn" aria-label="返回上级地图" onClick={onBack}><ChevronLeft /></button>
        <div>
          <h2>{scene.title}</h2>
          <p>{scene.subtitle}</p>
        </div>
        <div className="zoom-tools">
          <button className="round-btn" aria-label="缩小" onClick={() => onZoom(Math.max(1, zoom - 0.15))}><ZoomOut /></button>
          <button className="round-btn" aria-label="放大" onClick={() => onZoom(Math.min(1.45, zoom + 0.15))}><ZoomIn /></button>
        </div>
      </header>
    </section>
  );
}

function Walker({ label, role, routeClass, onClick }: { label: string; role: string; routeClass: string; onClick: () => void }) {
  return (
    <button className={`walker ${routeClass}`} aria-label={`${label}${role}`} onClick={onClick}>
      <span className="person">
        <i className="head" />
        <i className="torso" />
        <i className="leg left" />
        <i className="leg right" />
      </span>
      <small>{role}</small>
    </button>
  );
}

function Procession({ label, routeClass, onClick }: { label: string; routeClass: string; onClick: () => void }) {
  return (
    <button className={`procession-line ${routeClass}`} aria-label={label} onClick={onClick}>
      <span className="banner-person lead"><i /></span>
      <span className="person"><i className="head" /><i className="torso robe" /><i className="leg left" /><i className="leg right" /></span>
      <span className="person"><i className="head" /><i className="torso robe" /><i className="leg left" /><i className="leg right" /></span>
      <span className="procession-label" aria-hidden="true">仪仗队</span>
    </button>
  );
}

function formatFinance(value: number) {
  if (value >= 100_000_000) return `${Math.floor(value / 10_000) / 10_000}亿`;
  if (value >= 10_000) return `${Math.floor(value / 1_000) / 10}万`;
  return `${Math.max(0, Math.floor(value))}`;
}

function PhoneFrame({ children, emperor, date, weather, minuteOfDay, speed, setSpeed, finances, onEmperor, noDaylight = false, noWeather = false }: { children: React.ReactNode; emperor: Character; date: string; weather: WeatherKind; minuteOfDay: number; speed: TimeSpeed; setSpeed: (speed: TimeSpeed) => void; finances: FinanceState; onEmperor: () => void; noDaylight?: boolean; noWeather?: boolean }) {
  const timePhase = getTimePhase(minuteOfDay);
  return (
    <main className={`app time-${timePhase}`}>
      <h1 className="sr-only">紫宸纪</h1>
      <header className="hud">
        <button className="emperor" onClick={onEmperor}>
          <span>{emperor.avatar}</span>
          <div><b>{emperor.name} · {emperor.age}岁</b><small>{date}</small></div>
        </button>
        <div className="money"><span>国库 <b>{formatFinance(finances.nationalTreasury)}</b></span><span>黄金 <b>{formatFinance(finances.gold)}</b></span><span>元宝 <b>{formatFinance(finances.yuanbao)}</b></span></div>
        <button className="time-control" aria-label="切换时间速度" onClick={() => setSpeed(speed === 0 ? 1 : speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : speed === 8 ? 0 : 1)}>{speed === 0 ? <Play /> : <Pause />}<span>{speed === 0 ? '暂停' : `${speed}×`}</span></button>
      </header>
      {children}
      <WeatherEffects weather={weather} minuteOfDay={minuteOfDay} suppressDaylight={noDaylight} suppressWeather={noWeather} />
    </main>
  );
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  const items = [['front', '前朝'], ['inner', '后宫'], ['treasury', '国库'], ['settings', '设置']] as const;
  return <nav className="bottom-nav">{items.map(([id, label]) => <button key={id} className={(view === id || (id === 'front' && view === 'yangxin') || (id === 'inner' && view === 'yikun')) ? 'active' : ''} onClick={() => setView(id)}><span>{label}</span></button>)}</nav>;
}

