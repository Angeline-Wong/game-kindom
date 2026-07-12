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
import { ScenePeople } from './features/ScenePeople';
import { CharacterSheet } from './components/CharacterSheet';
import { CourtSession } from './features/CourtSession';
import { HouseholdOffice } from './features/HouseholdOffice';
import { Treasury } from './features/Treasury';
import { WeatherEffects, type WeatherKind } from './components/WeatherEffects';
import { initialPeopleState } from './game/people';
import { initialGiftState } from './game/gifts';
import { initialResidenceState } from './game/residences';
import { demoConsort, demoEmperor, type Character } from './game/characters';
import { advanceClock, formatShichen, type GameClock, type TimeSpeed } from './game/clock';
import { palaceScenes, type PalaceScene } from './game/palaceMap';
import './styles.css';
import './a11y.css';

type View = 'front' | 'inner' | 'treasury' | 'more' | 'court' | 'household' | 'yangxin' | 'yikun';
type DetailId = 'taihe' | 'qianqing-gate' | 'yangxin-base' | 'military' | 'wumen' | 'wenhua' | 'huitong' | 'household' | 'clan' | 'study' | 'drill' | 'inner-palace' | 'inner-study' | 'cold-palace' | 'medical' | 'shoukang' | 'kitchen' | 'cining' | 'xiefang' | 'yuqing' | 'qianqing-palace' | 'jiaotai' | 'garden' | 'kuning';

interface DetailScene {
  id: DetailId;
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

export default function App() {
  const [view, setView] = useState<View>('front');
  const [emperor, setEmperor] = useState<Character>(demoEmperor);
  const [speed, setSpeed] = useState<TimeSpeed>(1);
  const [clock, setClock] = useState<GameClock>({ year: 3, month: 10, day: 18, minuteOfDay: 420 });
  const [character, setCharacter] = useState<Character | null>(null);
  const [toast, setToast] = useState('');
  const [zoom, setZoom] = useState(1);
  const [detail, setDetail] = useState<DetailScene | null>(null);
  const [palaceRoom, setPalaceRoom] = useState<'主殿' | '东侧殿' | '西侧殿' | '庭院' | null>(null);
  const [peopleState, setPeopleState] = useState(initialPeopleState);
  const [giftState, setGiftState] = useState(initialGiftState);
  const [residenceState, setResidenceState] = useState(initialResidenceState);
  const [personRanks, setPersonRanks] = useState<Record<string, string>>({ 'consort-001': '贵人', 'minister-001': '正五品', empress: '皇后' });

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      setClock((current) => advanceClock(current, now - last, speed));
      last = now;
    }, 250);
    return () => clearInterval(id);
  }, [speed]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const weather: WeatherKind = '雪';
  const date = useMemo(() => `永和${clock.year}年 十月${clock.day}日 · ${formatShichen(clock.minuteOfDay)} · 初雪`, [clock]);

  if (view === 'court') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}><CourtSession onBack={() => setView('front')} />{character && <CharacterSheet character={character} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}</PhoneFrame>;
  }

  if (view === 'household') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}><HouseholdOffice onBack={() => setView('front')} />{character && <CharacterSheet character={character} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}</PhoneFrame>;
  }

  if (view === 'treasury') {
    return <PhoneFrame emperor={emperor} date={date} weather={weather} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}><Treasury onBack={() => setView('front')} giftState={giftState} /><BottomNav view={view} setView={(next) => setView(next)} /></PhoneFrame>;
  }

  if (detail) {
    return (
      <PhoneFrame emperor={emperor} date={date} weather={weather} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}>
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
          onResidenceChange={setResidenceState}
          personRanks={personRanks}
          onRankChange={(personId, rank) => setPersonRanks((current) => ({ ...current, [personId]: rank }))}
        />
        {toast && <button className="toast" onClick={() => setToast('')}>{toast}</button>}
      </PhoneFrame>
    );
  }

  const structuredScene = view === 'yangxin' ? palaceScenes.yangxin : view === 'yikun' ? palaceScenes.yikun : null;

  return (
    <PhoneFrame emperor={emperor} date={date} weather={weather} speed={speed} setSpeed={setSpeed} onEmperor={() => setCharacter(emperor)}>
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
              setDetail({ ...detailScenes[gate.detail], title: gate.label });
              return;
            }
            gate.target === view ? setToast(`${gate.label}还在布置中`) : setView(gate.target);
          }}
          onCharacter={setCharacter}
        />
      )}
      <BottomNav view={view} setView={(next) => { setZoom(1); setView(next); }} />
      {toast && <button className="toast" onClick={() => setToast('')}>{toast}</button>}
      {character && <CharacterSheet character={character} onClose={() => setCharacter(null)} onUpdate={setEmperor} />}
    </PhoneFrame>
  );
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

function DetailSceneView({ scene, activeRoom, onBack, onOpenRoom, onNotice, peopleState, onPeopleChange, giftState, onGiftChange, residenceState, onResidenceChange, personRanks, onRankChange }: { scene: DetailScene; activeRoom: '主殿' | '东侧殿' | '西侧殿' | '庭院' | null; onBack: () => void; onOpenRoom: (room: '主殿' | '东侧殿' | '西侧殿' | '庭院') => void; onNotice: (message: string) => void; peopleState: import('./game/people').PeopleState; onPeopleChange: (state: import('./game/people').PeopleState) => void; giftState: import('./game/gifts').GiftState; onGiftChange: (state: import('./game/gifts').GiftState) => void; residenceState: import('./game/residences').ResidenceState; onResidenceChange: (state: import('./game/residences').ResidenceState) => void; personRanks: Record<string, string>; onRankChange: (personId: string, rank: string) => void }) {
  const isCompound = scene.isPalaceCompound && !activeRoom;
  const art = isCompound ? scene.art : activeRoom === '主殿' ? scene.mainArt ?? innerPalaceMainScene : activeRoom === '东侧殿' ? innerEastHallScene : activeRoom === '西侧殿' ? innerWestHallScene : activeRoom === '庭院' ? innerCourtyardScene : scene.art;

  return (
    <section className="map-stage detail-stage" aria-label={`${scene.title}场景`}>
      <img className="map-art" src={art} alt="" />
      <div className="occluder-layer top-shadow" />
      <header className="scene-topper">
        <div className="detail-title"><h2>{activeRoom ? `${scene.title}·${activeRoom}` : scene.title}</h2><p>{activeRoom ? '起居、赏赐与召见' : scene.description}</p></div>
        <button className="round-btn detail-back" aria-label="返回上级地图" onClick={onBack}><ChevronLeft /></button>
      </header>
      {isCompound && <>
        <button className="map-plaque horizontal palace-room-label main-room" onClick={() => onOpenRoom('主殿')}>主殿</button>
        <button className="map-plaque vertical palace-room-label west-room" onClick={() => onOpenRoom('西侧殿')}>西侧殿</button>
        <button className="map-plaque vertical palace-room-label east-room" onClick={() => onOpenRoom('东侧殿')}>东侧殿</button>
        <button className="map-plaque horizontal palace-room-label courtyard-room" onClick={() => onOpenRoom('庭院')}>庭院</button>
      </>}
      {!activeRoom && <ScenePeople sceneId={scene.id} sceneTitle={scene.title} peopleState={peopleState} onNotice={onNotice} giftState={giftState} onGiftChange={onGiftChange} residenceState={residenceState} onResidenceChange={onResidenceChange} personRanks={personRanks} onRankChange={onRankChange} />}
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

function PhoneFrame({ children, emperor, date, weather, speed, setSpeed, onEmperor }: { children: React.ReactNode; emperor: Character; date: string; weather: WeatherKind; speed: TimeSpeed; setSpeed: (speed: TimeSpeed) => void; onEmperor: () => void }) {
  return (
    <main className="app">
      <h1 className="sr-only">紫宸纪</h1>
      <header className="hud">
        <button className="emperor" onClick={onEmperor}>
          <span>{emperor.avatar}</span>
          <div><b>{emperor.name} · {emperor.age}岁</b><small>{date}</small></div>
        </button>
        <div className="money"><span>国库 <b>10000万</b></span><span>私库 <b>10000万</b></span><span>元宝 <b>9999</b></span></div>
        <button className="time-control" aria-label="切换时间速度" onClick={() => setSpeed(speed === 0 ? 1 : speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 0 : 1)}>{speed === 0 ? <Play /> : <Pause />}<span>{speed === 0 ? '暂停' : `${speed}×`}</span></button>
      </header>
      {children}
      <WeatherEffects weather={weather} />
    </main>
  );
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  const items = [['front', '前朝'], ['inner', '后宫'], ['treasury', '国库'], ['more', '更多']] as const;
  return <nav className="bottom-nav">{items.map(([id, label]) => <button key={id} className={(view === id || (id === 'front' && view === 'yangxin') || (id === 'inner' && view === 'yikun')) ? 'active' : ''} onClick={() => id === 'more' ? undefined : setView(id)}><span>{label}</span></button>)}</nav>;
}
