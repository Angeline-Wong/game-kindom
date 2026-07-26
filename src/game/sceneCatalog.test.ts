import { describe, expect, it } from 'vitest';
import { sceneInteractions } from './sceneCatalog';

describe('scene interaction catalog', () => {
  it('defines actionable metadata for every current detail scene', () => {
    expect(Object.keys(sceneInteractions)).toHaveLength(24);
    Object.values(sceneInteractions).forEach((scene) => {
      expect(scene.actions.length).toBeGreaterThan(0);
      expect(scene.peopleKinds.length).toBeGreaterThan(0);
    });
  });
});

