import { useEffect, useMemo, useState } from 'react';
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
import { CharacterSheet } from './components/CharacterSheet';
import { CourtSession } from './features/CourtSession';
import { HouseholdOffice } from './features/HouseholdOffice';
import { Treasury } from './features/Treasury';
import { getTimePhase, WeatherEffects, type WeatherKind } from './components/WeatherEffects';
import type { PeopleState, ScenePersonStatus, ScenePersonType } from './game/people';
import { initialGiftState } from './game/gifts';
import { canOccupyMainHall, getAvailableMainHalls, getAvailableResidences, getResidenceSceneId, parseResidenceLabel, residenceStateFromPeople, type ConsortRank, type ResidenceState } from './game/residences';
import { demoConsort, demoEmperor, type Character } from './game/characters';
import { formatClockTime, formatShichen, type TimeSpeed } from './game/clock';
import { useGameStore } from './game/useGameStore';
import { accompanyPregnantConsort, advanceGameState, currentEvent, nameRoyalChild, resolveEvent, schedulePalaceVisit } from './game/simulation';
import { clockDate, type GameEvent, type PersonRecord } from './game/gameState';
import { getRoyalNameSuggestions, isValidRoyalName } from './game/royalNames';
import { confirmPalaceSelection, decideSelectionCandidate, schedulePalaceSelection } from './game/palaceSelection';
import { eligibleRoyalHeirs, resolveRoyalMarriageEvent } from './game/royalMarriage';
import { palaceScenes, type PalaceScene } from './game/palaceMap';
import './styles.css';
import './a11y.css';

type View = 'front' | 'inner' | 'treasury' | 'more' | 'court' | 'household' | 'yangxin' | 'yikun';
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
  taihe: { id: 'taihe', title: '太和殿', art: taiheScene, description: '百官朝会与重大国策裁决之地。' },
  'qianqing-gate': { id: 'qianqing-gate', title: '乾清门', art: qianqingGateScene, description: '内廷与前朝之间的礼制关隘。' },
  'yangxin-base': { id: 'yangxin-base', title: '养心殿', art: yangxinBaseScene, description: '批阅奏折、召见大臣与休憩之所。' },
  military: { id: 'military', title: '军机处', art: militaryScene, description: '机要军政在此呈报与议定。' },
  wumen: { id: 'wumen', title: '午门', art: wumenScene, description: '百官朝拜、凯旋与大典出入之门。' },
  wenhua: { id: 'wenhua', title: '文华殿', art: wenhuaScene, description: '经筵讲学与皇嗣教育之所。' },
  huitong: { id: 'huitong', title: '会同馆', art: huitongScene, description: '使团接待、朝贡与外交谈判之所。' },
  household: { id: 'household', title: '内务府', art: householdScene, description: '宫廷采购、修缮、宫人与皇家产业的总管衙门。' },
  clan: { id: 'clan', title: '宗人府', art: clanScene, description: '宗室谱牒、爵位、婚丧与皇族案件之所。' },
  study: { id: 'study', title: '御书房', art: frontStudyScene, description: '阅读经史、研究政策与教导皇子之所。' },
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
  const [view, setView] = useState<View>('front');
  const { gameState, setGameState } = useGameStore();
  const [character, setCharacter] = useState<Character | null>(null);
  const [toast, setToast] = useState('');
  const [zoom, setZoom] = useState(1);
  const [detail, setDetail] = useState<DetailScene | null>(null);
  const [palaceRoom, setPalaceRoom] = useState<'主殿' | '东侧殿' | '西侧殿' | '庭院' | null>(null);
  const [giftState, setGiftState] = useState(initialGiftState);
  const [residenceState, setResidenceState] = useState(() => residenceStateFromPeople(gameState.people));
  const [autoOpenSelection, setAutoOpenSelection] = useState(false);
  const [namingChildId, setNamingChildId] = useState<string | null>(null);
  const [birthCare, setBirthCare] = useState<{ motherId: string; childId: string } | null>(null);
  const [namingEdict, setNamingEdict] = useState<{ child: PersonRecord; name: string } | null>(null);
  const [flipCardsOpen, setFlipCardsOpen] = useState(false);
  const [flippedConsortId, setFlippedConsortId] = useState<string | null>(null);
  const [marriageOpen, setMarriageOpen] = useState(false);
  const [sceneInteractionBusy, setSceneInteractionBusy] = useState(false);

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
  const setEmperor = (next: Character) => setGameState((current) => ({ ...current, people: { ...current.people, emperor: { ...current.people.emperor, name: next.name, title: next.title } } }));
  const peopleState: PeopleState = { people: Object.values(gameState.people).filter((person) => person.status !== 'DEAD' && (person.kind === 'MINISTER' || person.kind === 'CONSORT' || person.kind === 'DOWAGER' || person.kind === 'PRINCE' || person.kind === 'PRINCESS')).map((person) => ({ id: person.id, type: (person.kind === 'MINISTER' ? 'MINISTER' : person.kind === 'CONSORT' ? 'CONSORT' : person.kind === 'DOWAGER' ? 'DOWAGER' : 'PRINCE') as ScenePersonType, name: person.name, sceneId: person.sceneId, status: (person.status === 'NORMAL' || person.status === 'PREGNANT' || person.status === 'CONFINED' || person.status === 'COLD_PALACE' || person.status === 'PRISON' ? 'IN_SCENE' : person.status === 'SICK' ? 'SICK' : person.status === 'REST' ? 'REST' : person.status === 'OUTSIDE' ? 'OUTSIDE' : 'LOCK') as ScenePersonStatus, priority: person.kind === 'CONSORT' || person.kind === 'DOWAGER' ? 1 : 2 })) };
  const setPeopleState = (next: PeopleState) => setGameState((current) => ({ ...current, people: Object.fromEntries(Object.entries(current.people).map(([id, person]) => { const scenePerson = next.people.find((item) => item.id === id); return [id, scenePerson ? { ...person, sceneId: scenePerson.sceneId } : person]; })) }));
  const personRanks = Object.fromEntries(Object.values(gameState.people).map((person) => [person.id, person.rank ?? person.title]));
  const characterRecord = character ? Object.values(gameState.people).find((person) => person.name === character.name || (character.kind === 'emperor' && person.id === 'emperor')) : undefined;
  const pendingEvent = currentEvent(gameState);
  const presentedEvent = sceneInteractionBusy || character || toast || namingChildId || birthCare || namingEdict || flipCardsOpen || flippedConsortId || marriageOpen
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
    const choice = event.choices.find((item) => item.id === choiceId);
    if (event.type === 'MARRIAGE_BANQUET' || event.type === 'MARRIAGE_NOTICE') {
      setGameState((current) => resolveRoyalMarriageEvent(current, event.id, choiceId));
      if (choiceId === 'go-banquet') navigateToScene('garden');
      else setToast(choice?.result ?? '婚配事务已经处理。');
      return;
    }
    setGameState((current) => resolveEvent(current, event.id, choiceId));
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
    if (event.type === 'PREGNANCY_NOTICE') {
      const consort = gameState.people[event.personIds[0]];
      if (choiceId === 'visit' && consort) {
        const residence = parseResidenceLabel(consort.residence);
        const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
        if (sceneId) navigateToScene(sceneId);
        return;
      }
      if (choiceId === 'reward') {
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
      const child = gameState.people[event.personIds[1]];
      if (!child) return;
      if (choiceId === 'birth-visit' && mother) {
        const residence = parseResidenceLabel(mother.residence);
        const sceneId = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
        if (sceneId) navigateToScene(sceneId);
        setBirthCare({ motherId: mother.id, childId: child.id });
        return;
      }
      if (choiceId === 'birth-treasure') {
        setDetail(null);
        setPalaceRoom(null);
        setView('treasury');
      }
      setNamingChildId(child.id);
      return;
    }
    setToast(choice?.result ?? '此事已处理。');
  };
  const changePersonRank = (personId: string, rank: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!person || person.rank === rank) return current;
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
    return {
      ...current,
      people: { ...current.people, [personId]: changedPerson },
      history: [...current.history, { id: `history-rank-${personId}-${Date.now()}`, date: clockDate(current.clock), type: person.kind === 'CONSORT' ? 'CONSORT_RANK' : 'OFFICIAL_GRADE', summary: `${person.name}由${person.rank ?? person.title}调整为${rank}${relocation}。`, personIds: [personId, 'emperor'] }],
    };
  });
  const changePersonOffice = (personId: string, office: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!person || person.office === office) return current;
    return { ...current, people: { ...current.people, [personId]: { ...person, office, title: office } }, history: [...current.history, { id: `history-office-${personId}-${Date.now()}`, date: clockDate(current.clock), type: 'OFFICIAL_APPOINTMENT', summary: `${person.name}由${person.office ?? person.title}奉旨调任${office}。`, personIds: [personId, 'emperor'] }] };
  });
  const changePersonTitle = (personId: string, title: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!person || person.title === title) return current;
    return { ...current, people: { ...current.people, [personId]: { ...person, title } }, history: [...current.history, { id: `history-title-${personId}-${Date.now()}`, date: clockDate(current.clock), type: 'ROYAL_TITLE', summary: `${person.name}由${person.title}奉旨册封为${title}。`, personIds: [personId, 'emperor'] }] };
  });
  const changePersonHonorific = (personId: string, honorific: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!person || person.kind !== 'CONSORT' || (person.honorific ?? '') === honorific) return current;
    const summary = honorific ? `${person.name}获赐“${honorific}”字封号。` : `${person.name}的封号已被褫夺。`;
    return { ...current, people: { ...current.people, [personId]: { ...person, honorific: honorific || undefined } }, history: [...current.history, { id: `history-honorific-${personId}-${Date.now()}`, date: clockDate(current.clock), type: honorific ? 'CONSORT_HONORIFIC' : 'CONSORT_HONORIFIC_REMOVED', summary, personIds: [personId, 'emperor'] }] };
  });
  const changePersonStatus = (personId: string, status: PersonRecord['status'], destination?: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!person || person.status === 'DEAD') return current;
    const sceneId = destination ?? person.sceneId;
    const prisonName = person.kind === 'PRINCE' || person.kind === 'PRINCESS' || person.kind === 'NOBLE' ? '宗人府' : '天牢';
    const summary = status === 'COLD_PALACE' ? `${person.name}奉旨打入冷宫。`
      : status === 'PRISON' ? `${person.name}奉旨收押于${prisonName}。`
        : status === 'DEAD' ? `${person.name}奉旨处死。` : `${person.name}的状态改为${status}。`;
    const changed = {
      ...person,
      status,
      sceneId,
      residence: status === 'COLD_PALACE' ? '冷宫' : status === 'PRISON' ? prisonName : person.residence,
      dialogue: undefined,
      previousSceneId: person.previousSceneId ?? person.sceneId,
      previousResidence: person.previousResidence ?? person.residence,
    };
    return {
      ...current,
      people: { ...current.people, [personId]: changed },
      history: [...current.history, { id: `history-status-${personId}-${Date.now()}`, date: clockDate(current.clock), type: status === 'DEAD' ? 'DEATH' : 'PERSON_STATUS', summary, personIds: [personId, 'emperor'] }],
    };
  });
  const restorePerson = (personId: string, rank?: string) => setGameState((current) => {
    const person = current.people[personId];
    if (!person || (person.status !== 'COLD_PALACE' && person.status !== 'PRISON')) return current;
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
    if (!child || !isValidRoyalName(name, childId, gameState.people, gameState.usedNames.royals)) return false;
    setGameState((current) => nameRoyalChild(current, childId, name));
    setNamingChildId(null);
    setBirthCare(null);
    setNamingEdict({ child, name: name.trim() });
    return true;
  };
  const recordPersonAction = (personId: string, type: string, summary: string) => setGameState((current) => {
    const affinityDelta = type === 'ACCOUNTABILITY' ? -6 : type === 'CUSTODY_VISIT' ? 4 : type === 'REWARD' ? 4 : type === 'DIALOGUE' ? 2 : 0;
    const trustDelta = type === 'ACCOUNTABILITY' ? -4 : type === 'CUSTODY_VISIT' ? 1 : type === 'REWARD' ? 2 : type === 'DIALOGUE' ? 1 : 0;
    const relationships = current.relationships.map((relationship) => {
      const isEmperorRelation = (relationship.personAId === 'emperor' && relationship.personBId === personId) || (relationship.personBId === 'emperor' && relationship.personAId === personId);
      return isEmperorRelation ? { ...relationship, affinity: Math.max(0, Math.min(100, relationship.affinity + affinityDelta)), trust: Math.max(0, Math.min(100, relationship.trust + trustDelta)) } : relationship;
    });
    return { ...current, relationships, history: [...current.history, { id: `history-${type.toLowerCase()}-${personId}-${Date.now()}`, date: clockDate(current.clock), type, summary, personIds: [personId, 'emperor'] }] };
  });
  const changeResidences = (next: ResidenceState) => {
    setResidenceState(next);
    setGameState((current) => {
      const people = { ...current.people };
      next.residences.forEach((residence) => {
        if (!residence.occupantId || !people[residence.occupantId]) return;
        const sceneId = getResidenceSceneId(residence.palace, residence.room);
        people[residence.occupantId] = { ...people[residence.occupantId], residence: `${residence.palace}${residence.room}`, sceneId: sceneId ?? people[residence.occupantId].sceneId };
      });
      return { ...current, people };
    });
  };

  useEffect(() => {
    let last = performance.now();
    let carriedRealMs = 0;
    let frameId = 0;
    const renderFrame = (now: number) => {
      const elapsed = Math.min(250, Math.max(0, now - last));
      last = now;
      setGameState((current) => {
        if (current.speed === 0) {
          carriedRealMs = 0;
          return current;
        }
        carriedRealMs += elapsed;
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
      carriedRealMs = 0;
    };
    document.addEventListener('visibilitychange', resetFrameClock);
    frameId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', resetFrameClock);
    };
  }, [activeSceneId, setGameState]);

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
  const namingEdictAction: PendingAction | null = namingEdict ? {
    person: { id: namingEdict.child.id, name: namingEdict.name, title: namingEdict.child.title, avatar: namingEdict.name.slice(-1), portrait: 'prince', type: 'PRINCE', priority: 1 } satisfies PersonProfile,
    actionId: 'royal-naming', title: '赐名皇嗣', confirmLabel: '奉旨用印',
    body: `今有${namingEdict.child.kind === 'PRINCESS' ? '皇女' : '皇子'}初诞，嘉祥可庆，特赐名“${namingEdict.name}”，录入宗牒，以昭皇绪，钦此。`,
  } : null;
  const birthFlowOverlays = <>
    {careMother && careChild && <PostBirthCareDialog mother={careMother} child={careChild} people={gameState.people} usedNames={gameState.usedNames.royals} onRecord={(summary) => recordPersonAction(careMother.id, 'POSTPARTUM_CARE', summary)} onNeedName={() => { setBirthCare(null); setNamingChildId(careChild.id); }} onAcceptName={(name) => confirmRoyalName(careChild.id, name)} />}
    {namingChild && <RoyalNameDialog child={namingChild} people={gameState.people} usedNames={gameState.usedNames.royals} onConfirm={(name) => confirmRoyalName(namingChild.id, name)} />}
    {namingEdict && namingEdictAction && <EdictPrototype action={namingEdictAction} onComplete={() => setNamingEdict(null)} onClose={() => setNamingEdict(null)} />}
    {flipCardsOpen && <FlipCardPrototype people={gameState.people} onClose={() => setFlipCardsOpen(false)} onSelect={(personId) => { setFlipCardsOpen(false); setFlippedConsortId(personId); }} />}
    {flippedConsort && <FavorPrototype person={{ id: flippedConsort.id, name: flippedConsort.name, title: flippedConsort.rank ?? flippedConsort.title, avatar: flippedConsort.name.slice(0, 1), portrait: flippedConsort.id === 'empress' ? 'empress' : 'consort', type: 'CONSORT', priority: 1 }} onClose={() => { setGameState((current) => schedulePalaceVisit(current, flippedConsort.id)); setFlippedConsortId(null); }} />}
    {marriageOpen && <RoyalMarriagePanel state={gameState} onChange={setGameState} onClose={() => setMarriageOpen(false)} onNotice={setToast} />}
  </>;

  if (view === 'court') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}><CourtSession onBack={() => setView('front')} />{character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}</PhoneFrame>;
  }

  if (view === 'household') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}><HouseholdOffice onBack={() => setView('front')} />{character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}</PhoneFrame>;
  }

  if (view === 'treasury') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}><Treasury onBack={() => setView('front')} giftState={giftState} /><BottomNav view={view} setView={(next) => setView(next)} />{character && <CharacterSheet character={character} record={characterRecord} people={gameState.people} relationships={gameState.relationships} history={gameState.history} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}{presentedEvent && <AttendantEventDialog event={presentedEvent} onChoose={(choiceId) => chooseEvent(presentedEvent, choiceId)} />}{birthFlowOverlays}{toast && <MessageDialog message={toast} onClose={() => setToast('')} />}</PhoneFrame>;
  }

  if (detail) {
    return (
      <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}>
        <DetailSceneView
          scene={detail}
          activeRoom={palaceRoom}
          onBack={() => { if (palaceRoom) setPalaceRoom(null); else setDetail(null); }}
          onOpenRoom={setPalaceRoom}
          onNotice={setToast}
          peopleState={peopleState}
          onPeopleChange={setPeopleState}
          giftState={giftState}
          onGiftChange={setGiftState}
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
          onSetSixPalaceAssistant={(personId) => setGameState((current) => current.sixPalaceAssistants.includes(personId) || current.sixPalaceAssistants.length >= 3 ? current : { ...current, sixPalaceAssistants: [...current.sixPalaceAssistants, personId] })}
          onConsortVisit={(personId) => setGameState((current) => schedulePalaceVisit(current, personId))}
          onConsortCompanion={(personId) => setGameState((current) => accompanyPregnantConsort(current, personId))}
          onPersonStatusChange={changePersonStatus}
          onRestorePerson={restorePerson}
          onOpenTreasury={() => { setDetail(null); setView('treasury'); }}
          palaceSelection={gameState.palaceSelection}
          currentDate={clockDate(gameState.clock)}
          onScheduleSelection={() => setGameState((current) => schedulePalaceSelection(current))}
          onSelectionDecision={(candidateId, decision) => setGameState((current) => decideSelectionCandidate(current, candidateId, decision))}
          onConfirmSelection={(assignments) => setGameState((current) => confirmPalaceSelection(current, assignments))}
          onNavigateToScene={navigateToScene}
          onNavigateToYangxin={() => navigateToScene('yangxin-base')}
          autoOpenSelection={autoOpenSelection}
          onSelectionAutoOpened={() => setAutoOpenSelection(false)}
          onOpenFlipCards={() => setFlipCardsOpen(true)}
          onOpenRoyalMarriage={() => {
            if (!eligibleRoyalHeirs(gameState).length) { setToast('当前没有年满十五岁且尚未婚配的皇嗣。'); return; }
            setMarriageOpen(true);
          }}
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
    <PhoneFrame emperor={emperor} date={date} weather={weather} minuteOfDay={clock.minuteOfDay} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}>
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

export function AttendantEventDialog({ event, onChoose }: { event: GameEvent; onChoose: (choiceId: string) => void }) {
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label={`${event.title}：${event.body}`}><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">{event.title}</div><div className="dialogue-box"><p className="dialogue-text">{event.body}</p></div></div></section><section className="choice-panel" aria-label="内侍传言选项">{event.choices.map((choice) => <button key={choice.id} className="choice-btn" onClick={() => onChoose(choice.id)}>{choice.label}</button>)}</section></div></main></div>;
}

export function ConsortAwayDialog({ consortName, locationName, onDismiss, onYangxin, onFollow }: { consortName: string; locationName: string; onDismiss: () => void; onYangxin: () => void; onFollow: () => void }) {
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay consort-away-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label={`${consortName}不在宫中`}><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">宫女回禀</div><div className="dialogue-box"><p className="dialogue-text">启禀陛下，{consortName}此刻去了{locationName}，尚未回宫。</p></div></div></section><section className="choice-panel" aria-label="寻访妃嫔选项"><button className="choice-btn" onClick={onDismiss}>罢了</button><button className="choice-btn" onClick={onYangxin}>回养心殿</button><button className="choice-btn" onClick={onFollow}>拜驾{locationName}</button></section></div></main></div>;
}

function RoyalNameDialog({ child, people, usedNames, onConfirm }: { child: PersonRecord; people: Record<string, PersonRecord>; usedNames: string[]; onConfirm: (name: string) => boolean }) {
  const suggestions = useMemo(() => getRoyalNameSuggestions(child, people, 3, usedNames), [child, people, usedNames]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const submit = (name: string) => {
    if (onConfirm(name)) return;
    setError('姓名需为二至四个汉字，且不得与已有皇嗣重名。');
  };
  return <div className="interaction-overlay scene-dialogue-overlay attendant-event-overlay royal-name-overlay"><main className="game-ui" role="dialog" aria-modal="true" aria-label="为皇嗣赐名"><div className="story-stack"><section className="dialogue-section"><div className="dialogue-wrap"><div className="nameplate">礼部呈名</div><div className="dialogue-box"><p className="dialogue-text">礼部已为新生{child.kind === 'PRINCESS' ? '皇女' : '皇子'}择定三个吉名，请陛下圣裁。</p>{customOpen && <div className="royal-name-custom"><input autoFocus value={customName} onChange={(event) => { setCustomName(event.target.value); setError(''); }} maxLength={4} placeholder="输入完整姓名" aria-label="皇嗣姓名" /><button onClick={() => submit(customName)}>确认赐名</button></div>}{error && <p className="royal-name-error">{error}</p>}</div></div></section><section className="choice-panel" aria-label="皇嗣赐名选项">{suggestions.map((name) => <button key={name} className="choice-btn" onClick={() => submit(name)}>{name}</button>)}<button className="choice-btn" onClick={() => setCustomOpen(true)}>朕亲自取名</button></section></div></main></div>;
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

function FlipCardPrototype({ people, onClose, onSelect }: { people: Record<string, PersonRecord>; onClose: () => void; onSelect: (personId: string) => void }) {
  const candidates = useMemo(() => Object.values(people).filter((person) => person.kind === 'CONSORT' && person.status === 'NORMAL').map((person) => ({
    id: person.id,
    name: person.name,
    rank: `${person.honorific ?? ''}${person.rank ?? person.title}`,
    palace: parseResidenceLabel(person.residence)?.palace ?? person.residence ?? '宫中',
  })), [people]);
  const pages = useMemo(() => {
    const chunks: typeof candidates[] = [];
    for (let index = 0; index < candidates.length; index += 8) chunks.push(candidates.slice(index, index + 8));
    return chunks.length ? chunks : [[]];
  }, [candidates]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'flip-card-close') onClose();
      if (event.data?.type === 'flip-card-select' && typeof event.data.personId === 'string') onSelect(event.data.personId);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onClose, onSelect]);
  const document = useMemo(() => flipCardPrototype
    .replace(/const pages = \[[\s\S]*?let currentPage\s*=\s*0;/, `const pages = ${JSON.stringify(pages)};\n\nlet currentPage = 0;`)
    .replace('</head>', '<style>html,body{background:transparent!important}.stage{height:100%!important;min-height:0!important;background:transparent!important}.mask{background:rgba(8,5,3,.58)!important}</style></head>')
    .replace('</body>', `<script>document.getElementById('closeBtn').addEventListener('click',function(){window.parent.postMessage({type:'flip-card-close'},'*')});document.getElementById('summonBtn').addEventListener('click',function(){if(selected)window.parent.postMessage({type:'flip-card-select',personId:selected.id},'*')});<\/script></body>`), [pages]);
  return <div className="prototype-overlay flip-card-overlay"><iframe title="侍寝翻牌" srcDoc={document} /></div>;
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

function DetailSceneView({ scene, activeRoom, onBack, onOpenRoom, onNotice, peopleState, onPeopleChange, peopleRecords, history, relationships, giftState, onGiftChange, residenceState, onResidenceChange, personRanks, onRankChange, onOfficeChange, onTitleChange, onHonorificChange, onRecordAction, onOpenTreasury, sixPalaceAssistants, onSetSixPalaceAssistant, onConsortVisit, onConsortCompanion, onPersonStatusChange, onRestorePerson, palaceSelection, currentDate, onScheduleSelection, onSelectionDecision, onConfirmSelection, onNavigateToScene, onNavigateToYangxin, autoOpenSelection, onSelectionAutoOpened, onOpenFlipCards, onOpenRoyalMarriage, onInteractionChange }: { scene: DetailScene; activeRoom: '主殿' | '东侧殿' | '西侧殿' | '庭院' | null; onBack: () => void; onOpenRoom: (room: '主殿' | '东侧殿' | '西侧殿' | '庭院') => void; onNotice: (message: string) => void; peopleState: import('./game/people').PeopleState; onPeopleChange: (state: import('./game/people').PeopleState) => void; peopleRecords: import('./game/gameState').GameState['people']; history: import('./game/gameState').HistoryEntry[]; relationships: import('./game/gameState').RelationshipRecord[]; giftState: import('./game/gifts').GiftState; onGiftChange: (state: import('./game/gifts').GiftState) => void; residenceState: import('./game/residences').ResidenceState; onResidenceChange: (state: import('./game/residences').ResidenceState) => void; personRanks: Record<string, string>; onRankChange: (personId: string, rank: string) => void; onOfficeChange: (personId: string, office: string) => void; onTitleChange: (personId: string, title: string) => void; onHonorificChange: (personId: string, honorific: string) => void; onRecordAction: (personId: string, type: string, summary: string) => void; onOpenTreasury: () => void; sixPalaceAssistants: string[]; onSetSixPalaceAssistant: (personId: string) => void; onConsortVisit: (personId: string) => void; onConsortCompanion: (personId: string) => void; onPersonStatusChange: (personId: string, status: import('./game/gameState').PersonLifeStatus, destination?: string) => void; onRestorePerson: (personId: string, rank?: string) => void; palaceSelection: import('./game/gameState').PalaceSelectionRecord | null; currentDate: import('./game/gameState').GameDate; onScheduleSelection: () => void; onSelectionDecision: (candidateId: string, decision: import('./game/gameState').SelectionDecision) => void; onConfirmSelection: (assignments: import('./game/palaceSelection').SelectionAssignment[]) => void; onNavigateToScene: (sceneId: string) => void; onNavigateToYangxin: () => void; autoOpenSelection: boolean; onSelectionAutoOpened: () => void; onOpenFlipCards: () => void; onOpenRoyalMarriage: () => void; onInteractionChange: (busy: boolean) => void }) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [requestedPersonId, setRequestedPersonId] = useState<string | null>(null);
  const [dismissedAwayKey, setDismissedAwayKey] = useState<string | null>(null);
  const [peopleInteractionBusy, setPeopleInteractionBusy] = useState(false);
  const isCompound = scene.isPalaceCompound && !activeRoom;
  const art = isCompound ? scene.art : activeRoom === '主殿' ? scene.mainArt ?? innerPalaceMainScene : activeRoom === '东侧殿' ? innerEastHallScene : activeRoom === '西侧殿' ? innerWestHallScene : activeRoom === '庭院' ? innerCourtyardScene : scene.art;
  const peopleSceneId = scene.isPalaceCompound ? activeRoom ? `${scene.locationId ?? scene.id}:${activeRoom}` : null : scene.id;
  const roster: { kind: RosterKind; label: string } | null = scene.id === 'jiaotai' ? { kind: 'CONSORT', label: '妃子列表' } : scene.id === 'yangxin-base' ? { kind: 'MINISTER', label: '臣子列表' } : scene.id === 'yuqing' ? { kind: 'HEIR', label: '皇子列表' } : null;
  const awayConsort = peopleSceneId ? Object.values(peopleRecords).find((person) => {
    if (person.kind !== 'CONSORT' || !person.residence) return false;
    const residence = parseResidenceLabel(person.residence);
    const home = residence ? getResidenceSceneId(residence.palace, residence.room) : undefined;
    return home === peopleSceneId && person.sceneId !== peopleSceneId && !['CONFINED', 'COLD_PALACE', 'PRISON', 'DEAD'].includes(person.status);
  }) : undefined;
  const awayKey = awayConsort ? `${awayConsort.id}:${awayConsort.sceneId}:${peopleSceneId}` : null;
  const localInteractionBusy = peopleInteractionBusy || rosterOpen || selectionOpen || Boolean(awayConsort && awayKey !== dismissedAwayKey);

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
        {scene.id === 'yangxin-base' && <button className="scene-directory-button scene-selection-button" onClick={onOpenFlipCards}>召幸翻牌</button>}
        {scene.id === 'yuqing' && <button className="scene-directory-button scene-selection-button" onClick={onOpenRoyalMarriage}>皇子婚配</button>}
      </header>
      {isCompound && <>
        <button className="map-plaque horizontal palace-room-label main-room" onClick={() => onOpenRoom('主殿')}>主殿</button>
        <button className="map-plaque vertical palace-room-label west-room" onClick={() => onOpenRoom('西侧殿')}>西侧殿</button>
        <button className="map-plaque vertical palace-room-label east-room" onClick={() => onOpenRoom('东侧殿')}>东侧殿</button>
        <button className="map-plaque horizontal palace-room-label courtyard-room" onClick={() => onOpenRoom('庭院')}>庭院</button>
      </>}
      {peopleSceneId && <ScenePeople sceneId={peopleSceneId} sceneTitle={`${scene.title}${activeRoom ?? ''}`} peopleState={peopleState} peopleRecords={peopleRecords} history={history} relationships={relationships} requestedPersonId={requestedPersonId} onRequestedPersonHandled={() => setRequestedPersonId(null)} onNotice={onNotice} giftState={giftState} onGiftChange={onGiftChange} residenceState={residenceState} onResidenceChange={onResidenceChange} personRanks={personRanks} onRankChange={onRankChange} onOfficeChange={onOfficeChange} onTitleChange={onTitleChange} onHonorificChange={onHonorificChange} onRecordAction={onRecordAction} onOpenTreasury={onOpenTreasury} sixPalaceAssistants={sixPalaceAssistants} onSetSixPalaceAssistant={onSetSixPalaceAssistant} onConsortVisit={onConsortVisit} onConsortCompanion={onConsortCompanion} onPersonStatusChange={onPersonStatusChange} onRestorePerson={onRestorePerson} onInteractionChange={setPeopleInteractionBusy} />}
      {rosterOpen && roster && <PersonRoster kind={roster.kind} people={peopleRecords} onClose={() => setRosterOpen(false)} onOpenDetail={(personId) => { setRosterOpen(false); setRequestedPersonId(personId); }} />}
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

function PhoneFrame({ children, emperor, date, weather, minuteOfDay, speed, setSpeed, onEmperor }: { children: React.ReactNode; emperor: Character; date: string; weather: WeatherKind; minuteOfDay: number; speed: TimeSpeed; setSpeed: (speed: TimeSpeed) => void; onEmperor: () => void }) {
  const timePhase = getTimePhase(minuteOfDay);
  return (
    <main className={`app time-${timePhase}`}>
      <h1 className="sr-only">紫宸纪</h1>
      <header className="hud">
        <button className="emperor" onClick={onEmperor}>
          <span>{emperor.avatar}</span>
          <div><b>{emperor.name} · {emperor.age}岁</b><small>{date}</small></div>
        </button>
        <div className="money"><span>国库 <b>10000万</b></span><span>私库 <b>10000万</b></span><span>元宝 <b>9999</b></span></div>
        <button className="time-control" aria-label="切换时间速度" onClick={() => setSpeed(speed === 0 ? 1 : speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : speed === 8 ? 0 : 1)}>{speed === 0 ? <Play /> : <Pause />}<span>{speed === 0 ? '暂停' : `${speed}×`}</span></button>
      </header>
      {children}
      <WeatherEffects weather={weather} minuteOfDay={minuteOfDay} />
    </main>
  );
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  const items = [['front', '前朝'], ['inner', '后宫'], ['treasury', '国库'], ['more', '更多']] as const;
  return <nav className="bottom-nav">{items.map(([id, label]) => <button key={id} className={(view === id || (id === 'front' && view === 'yangxin') || (id === 'inner' && view === 'yikun')) ? 'active' : ''} onClick={() => id === 'more' ? undefined : setView(id)}><span>{label}</span></button>)}</nav>;
}
