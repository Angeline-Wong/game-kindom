import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const approvedStyles = readFileSync(join(process.cwd(), 'src/components/ApprovedPersonDetail.css'), 'utf8');
const emperorStyles = readFileSync(join(process.cwd(), 'src/components/EmperorProfile.css'), 'utf8');

describe('person detail scrolling styles', () => {
  it('allows the shared person detail panel to scroll on short screens', () => {
    expect(approvedStyles).toMatch(/\.approved-panel\{[\s\S]*?overflow-y:auto/);
    expect(approvedStyles).toMatch(/\.approved-panel\{[\s\S]*?touch-action:pan-y/);
  });

  it('keeps the emperor detail content shrinkable and scrollable', () => {
    expect(emperorStyles).toMatch(/\.emperor-profile \.content \{[\s\S]*?min-height:0[\s\S]*?overflow-y:auto/);
  });
});
