import { describe, expect, it } from 'vitest';
import detailPrototype from './person-detail-prototype.html?raw';

describe('person detail prototype scrolling', () => {
  it('keeps the embedded phone within the iframe and scrolls each content pane', () => {
    expect(detailPrototype).toMatch(/\.phone\{[\s\S]*?min-height:0/);
    expect(detailPrototype).toMatch(/\.content\{[\s\S]*?min-height:0/);
    expect(detailPrototype).toMatch(/\.pane\{[\s\S]*?min-height:0[\s\S]*?overflow-y:auto/);
  });
});
