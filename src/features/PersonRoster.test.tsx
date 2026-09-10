import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PersonRoster } from './PersonRoster';
import type { PersonRecord } from '../game/gameState';

const heir = (overrides: Partial<PersonRecord>): PersonRecord => ({
  id: 'heir',
  kind: 'PRINCE',
  name: '皇嗣',
  sex: 'MALE',
  birthDate: { year: 1, month: 1, day: 1 },
  age: 12,
  title: '皇子',
  sceneId: 'xiefang',
  status: 'NORMAL',
  assets: { avatar: '', portrait: '' },
  parents: [],
  children: [],
  stats: { 宠爱: 0 },
  traits: [],
  ...overrides,
});

describe('heir roster sorting', () => {
  it('defaults to unmarried and switches all roster views with the marriage filter', () => {
    const people = {
      unmarried: heir({ id: 'unmarried', name: '未婚皇子', title: '皇子', maritalStatus: 'UNMARRIED', residence: '长春宫西侧殿' }),
      married: heir({ id: 'married', name: '已婚皇子', title: '皇子', maritalStatus: 'MARRIED', residence: '宫外' }),
      princess: heir({ id: 'princess', kind: 'PRINCESS', sex: 'FEMALE', name: '已婚公主', title: '公主', maritalStatus: 'MARRIED', residence: '宫外' }),
    };
    const { container } = render(<PersonRoster kind="HEIR" people={people} onClose={() => undefined} onOpenDetail={() => undefined} />);
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('button.active small')).toHaveTextContent('未婚');
    expect(dialog).toHaveTextContent('未婚皇子');
    expect(dialog).not.toHaveTextContent('已婚皇子');

    fireEvent.click([...dialog.querySelectorAll('.heir-marriage-summary button')].find((button) => button.textContent?.includes('已婚'))!);
    expect(dialog).toHaveTextContent('已婚皇子');
    expect(dialog).toHaveTextContent('已婚公主');
    expect(dialog).not.toHaveTextContent('未婚皇子');

    fireEvent.click(dialog.querySelector('.consort-list-nav button:nth-child(3)')!);
    expect(dialog).toHaveTextContent('宫外');
    expect(dialog).not.toHaveTextContent('长春宫西侧殿');
  });

  it('keeps crown prince as a separate order group and shows no empty crown group', () => {
    const people = {
      crown: heir({ id: 'crown', name: '储君', title: '太子', birthOrder: 1 }),
      prince: heir({ id: 'prince', name: '普通皇子', title: '皇子', birthOrder: 2 }),
    };
    const { container } = render(<PersonRoster kind="HEIR" people={people} onClose={() => undefined} onOpenDetail={() => undefined} />);
    const dialog = container.querySelector('[role="dialog"]')!;
    fireEvent.click(dialog.querySelector('.consort-list-nav button:nth-child(2)')!);
    expect(dialog).toHaveTextContent('太子');
    expect(dialog).toHaveTextContent('皇子');
    expect(dialog.querySelectorAll('.heir-group')).toHaveLength(2);
  });

  it('sorts princes and princesses together by favor after clicking the sort button', () => {
    const people = {
      princeLow: heir({ id: 'princeLow', name: '低宠皇子', birthOrder: 1, birthDate: { year: 1, month: 1, day: 1 }, stats: { 宠爱: 20 } }),
      princessHigh: heir({ id: 'princessHigh', kind: 'PRINCESS', sex: 'FEMALE', name: '高宠公主', birthOrder: 1, birthDate: { year: 2, month: 1, day: 1 }, stats: { 宠爱: 90 } }),
      princeMiddle: heir({ id: 'princeMiddle', name: '中宠皇子', birthOrder: 2, birthDate: { year: 3, month: 1, day: 1 }, stats: { 宠爱: 60 } }),
    };
    const { container } = render(<PersonRoster kind="HEIR" people={people} onClose={() => undefined} onOpenDetail={() => undefined} />);
    const dialog = container.querySelector('[role="dialog"]')!;
    const sortButton = dialog.querySelector('.heir-list-tools button') as HTMLButtonElement;

    expect([...dialog.querySelectorAll('.heir-card-title')].map((button) => button.textContent)).toEqual([
      '皇长子·低宠皇子',
      '皇长女·高宠公主',
      '皇次子·中宠皇子',
    ]);

    fireEvent.click(sortButton);

    expect(sortButton).toHaveTextContent('宠爱高→低');
    expect([...dialog.querySelectorAll('.heir-card-title')].map((button) => button.textContent)).toEqual([
      '皇长女·高宠公主',
      '皇次子·中宠皇子',
      '皇长子·低宠皇子',
    ]);
  });
});
