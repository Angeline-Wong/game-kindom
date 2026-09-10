import { describe, expect, it } from 'vitest';
import { getInteractivePlace, getRoute, palaceScenes } from './palaceMap';

describe('structured palace scenes', () => {
  it('keeps art layers, transparent hit areas, and walking routes separate', () => {
    const scene = palaceScenes.yangxin;

    expect(scene.layers.map((layer) => layer.kind)).toEqual(['background', 'occluder', 'ui']);
    expect(scene.hotspots.find((hotspot) => hotspot.id === 'east-warm-room')).toMatchObject({
      label: '东暖阁',
      targetScene: 'yangxin-east',
    });
    expect(scene.paths.procession.length).toBeGreaterThan(3);
  });

  it('finds a hotspot from normalized map coordinates', () => {
    const scene = palaceScenes.yikun;

    expect(getInteractivePlace(scene, 50, 43)?.label).toBe('主殿');
    expect(getInteractivePlace(scene, 18, 42)?.label).toBe('西配殿');
    expect(getInteractivePlace(scene, 82, 68)?.label).toBe('东后配殿');
    expect(getInteractivePlace(scene, 50, 49)).toBeNull();
    expect(getInteractivePlace(scene, 5, 5)).toBeNull();
  });

  it('keeps courtyard hotspots limited to their door-plaque areas', () => {
    const scene = palaceScenes.yikun;

    expect(scene.hotspots.every((hotspot) => hotspot.width <= 18 && hotspot.height <= 8)).toBe(true);
  });

  it('builds npc routes from named path nodes', () => {
    const scene = palaceScenes.yikun;

    expect(getRoute(scene, ['gate', 'courtyard', 'main-hall'])).toEqual([
      { x: 50, y: 82 },
      { x: 50, y: 60 },
      { x: 50, y: 43 },
    ]);
  });
});
