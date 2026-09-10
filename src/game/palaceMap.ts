export type SceneId = 'front' | 'inner' | 'yangxin' | 'yikun' | 'yangxin-east' | 'yikun-main';

export interface Point {
  x: number;
  y: number;
}

export interface MapLayer {
  id: string;
  kind: 'background' | 'occluder' | 'ui';
  asset?: string;
  opacity?: number;
}

export interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetScene?: SceneId;
  action: 'enter' | 'rename' | 'upgrade' | 'inspect' | 'summon';
}

export interface PalaceScene {
  id: SceneId;
  title: string;
  subtitle: string;
  art: 'yangxin' | 'yikun' | 'yikunCourtyard';
  layers: MapLayer[];
  nodes: Record<string, Point>;
  paths: Record<string, Point[]>;
  hotspots: Hotspot[];
}

export const palaceScenes = {
  yangxin: {
    id: 'yangxin',
    title: '养心殿',
    subtitle: '批阅奏折、召见臣工、就寝养病',
    art: 'yangxin',
    layers: [
      { id: 'yangxin-ground', kind: 'background', asset: 'yangxin' },
      { id: 'yangxin-roof-eaves', kind: 'occluder', opacity: 0.92 },
      { id: 'yangxin-signs', kind: 'ui' },
    ],
    nodes: {
      gate: { x: 50, y: 88 },
      forecourt: { x: 50, y: 70 },
      'main-hall': { x: 50, y: 48 },
      'east-warm-room': { x: 73, y: 49 },
      'west-warm-room': { x: 27, y: 49 },
      chamber: { x: 50, y: 25 },
    },
    paths: {
      emperor: [
        { x: 50, y: 88 },
        { x: 50, y: 70 },
        { x: 50, y: 48 },
        { x: 58, y: 35 },
      ],
      procession: [
        { x: 24, y: 90 },
        { x: 36, y: 78 },
        { x: 50, y: 70 },
        { x: 64, y: 58 },
        { x: 73, y: 49 },
      ],
      servants: [
        { x: 18, y: 62 },
        { x: 30, y: 58 },
        { x: 45, y: 63 },
        { x: 70, y: 58 },
      ],
    },
    hotspots: [
      { id: 'main-hall', label: '正殿', x: 50, y: 47, width: 30, height: 16, targetScene: 'yangxin-east', action: 'enter' },
      { id: 'east-warm-room', label: '东暖阁', x: 73, y: 49, width: 22, height: 18, targetScene: 'yangxin-east', action: 'enter' },
      { id: 'west-warm-room', label: '西暖阁', x: 27, y: 49, width: 22, height: 18, action: 'inspect' },
      { id: 'bedchamber', label: '寝殿', x: 50, y: 25, width: 34, height: 18, action: 'summon' },
    ],
  },
  yikun: {
    id: 'yikun',
    title: '翊坤宫',
    subtitle: '宫门、回廊、主殿、后殿与东西配殿',
    art: 'yikunCourtyard',
    layers: [
      { id: 'yikun-ground', kind: 'background', asset: 'yikunCourtyard' },
      { id: 'yikun-eaves-trees', kind: 'occluder', opacity: 0.9 },
      { id: 'yikun-signs', kind: 'ui' },
    ],
    nodes: {
      gate: { x: 50, y: 82 },
      courtyard: { x: 50, y: 60 },
      'main-hall': { x: 50, y: 43 },
      'east-side-hall': { x: 82, y: 42 },
      'west-side-hall': { x: 18, y: 42 },
      'east-back-hall': { x: 82, y: 68 },
      'west-back-hall': { x: 18, y: 68 },
      'back-hall': { x: 50, y: 23 },
      cloister: { x: 50, y: 62 },
    },
    paths: {
      procession: [
        { x: 50, y: 84 },
        { x: 50, y: 70 },
        { x: 50, y: 60 },
        { x: 50, y: 51 },
        { x: 50, y: 43 },
      ],
      maids: [
        { x: 18, y: 68 },
        { x: 32, y: 62 },
        { x: 50, y: 60 },
        { x: 68, y: 62 },
        { x: 82, y: 68 },
      ],
      intrigue: [
        { x: 82, y: 42 },
        { x: 70, y: 48 },
        { x: 50, y: 43 },
        { x: 30, y: 48 },
        { x: 18, y: 42 },
      ],
    },
    hotspots: [
      // Anchors sit on the visual door plaque; keep the target intentionally narrow.
      { id: 'main-hall', label: '主殿', x: 50, y: 42, width: 18, height: 8, targetScene: 'yikun-main', action: 'enter' },
      { id: 'back-hall', label: '后殿', x: 50, y: 23, width: 18, height: 8, action: 'inspect' },
      { id: 'east-side-hall', label: '东配殿', x: 82, y: 42, width: 14, height: 8, action: 'inspect' },
      { id: 'west-side-hall', label: '西配殿', x: 18, y: 42, width: 14, height: 8, action: 'inspect' },
      { id: 'east-back-hall', label: '东后配殿', x: 82, y: 68, width: 14, height: 8, action: 'inspect' },
      { id: 'west-back-hall', label: '西后配殿', x: 18, y: 68, width: 14, height: 8, action: 'inspect' },
      { id: 'cloister', label: '庭院与回廊', x: 50, y: 60, width: 18, height: 8, action: 'summon' },
      { id: 'gate', label: '宫门', x: 50, y: 82, width: 16, height: 8, action: 'inspect' },
    ],
  },
} satisfies Record<'yangxin' | 'yikun', PalaceScene>;

export function getInteractivePlace(scene: PalaceScene, x: number, y: number): Hotspot | null {
  return scene.hotspots.find((hotspot) => {
    const withinX = x >= hotspot.x - hotspot.width / 2 && x <= hotspot.x + hotspot.width / 2;
    const withinY = y >= hotspot.y - hotspot.height / 2 && y <= hotspot.y + hotspot.height / 2;
    return withinX && withinY;
  }) ?? null;
}

export function getRoute(scene: PalaceScene, nodeIds: string[]): Point[] {
  return nodeIds.map((nodeId) => {
    const point = scene.nodes[nodeId];
    if (!point) {
      throw new Error(`Unknown node "${nodeId}" in scene "${scene.id}"`);
    }
    return point;
  });
}
