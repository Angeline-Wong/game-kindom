import { describe, expect, it } from 'vitest';
import { royalTitleDisplay } from './royalNames';

describe('royalTitleDisplay', () => {
  it('shortens formal hereditary titles for heir cards', () => {
    expect(royalTitleDisplay('和硕亲王')).toBe('和亲王');
    expect(royalTitleDisplay('和硕贝子')).toBe('和贝子');
    expect(royalTitleDisplay('和硕贝勒')).toBe('和贝勒');
  });

  it('keeps ordinary titles and empty values unchanged', () => {
    expect(royalTitleDisplay('皇贵太妃')).toBe('皇贵太妃');
    expect(royalTitleDisplay(undefined)).toBeUndefined();
  });
});
