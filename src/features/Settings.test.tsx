import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SettingsPage } from './Settings';
import { useGameStore } from '../game/useGameStore';
import type { SaveRepository } from '../game/saveRepository';
import type { GameState } from '../game/gameState';

it('bounds probabilities, confirms overwrite/load, and requires both reset confirmations', async () => {
  const records = new Map<string, GameState>();
  const repository: SaveRepository = {
    load: async id => structuredClone(records.get(id) ?? null),
    save: async state => { records.set(state.saveId, structuredClone(state)); },
    clear: async () => { records.clear(); },
  };
  function Harness() {
    const store = useGameStore(repository);
    return <SettingsPage store={store} clock={store.gameState.clock} pendingEvents={0} onSkipMonth={() => {}} onSkipYears={() => {}} />;
  }
  const { unmount } = render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: '辅助' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '提高孕率' })).toBeEnabled());
  const cards = () => screen.getAllByRole('button', { name: '回档' });
  fireEvent.click(screen.getByRole('button', { name: '存档' }));
  expect(cards()[0]).toBeDisabled();
  expect(cards()[1]).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '辅助' }));
  for (let i = 0; i < 25; i++) fireEvent.click(screen.getByRole('button', { name: '降低孕率' }));
  expect(screen.getByRole('button', { name: '降低孕率' })).toBeDisabled();
  for (let i = 0; i < 25; i++) fireEvent.click(screen.getByRole('button', { name: '提高生男概率' }));
  expect(screen.getByRole('button', { name: '提高生男概率' })).toBeDisabled();
  expect(screen.getByText('生女概率').closest('.settings-row')).toHaveTextContent('0%');
  fireEvent.click(screen.getByRole('button', { name: '存档' }));
  fireEvent.click(screen.getAllByRole('button', { name: '保存' })[0]);
  await screen.findByText('存档一保存成功');
  fireEvent.click(screen.getByRole('button', { name: '知道了' }));
  const snapshot = structuredClone(records.get('manualSave1'));
  fireEvent.click(screen.getByRole('button', { name: '辅助' }));
  fireEvent.click(screen.getByRole('button', { name: '提高孕率' }));
  fireEvent.click(screen.getByRole('button', { name: '存档' }));
  fireEvent.click(screen.getAllByRole('button', { name: '保存' })[0]);
  expect(screen.getByText('存档一已有记录，是否覆盖？')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(records.get('manualSave1')).toEqual(snapshot);
  fireEvent.click(cards()[0]);
  expect(screen.getByText(/当前尚未保存的进度将丢失/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '确认回档' }));
  await screen.findByText('回档成功');
  fireEvent.click(screen.getByRole('button', { name: '知道了' }));
  fireEvent.click(screen.getByRole('button', { name: '辅助' }));
  expect(screen.getByRole('button', { name: '降低孕率' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '存档' }));
  fireEvent.click(screen.getByRole('button', { name: '重置游戏' }));
  fireEvent.click(screen.getByRole('button', { name: '继续' }));
  expect(records.has('manualSave1')).toBe(true);
  fireEvent.click(within(screen.getByRole('dialog', { name: '重置游戏' })).getByRole('button', { name: '取消' }));
  expect(records.has('manualSave1')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '重置游戏' }));
  fireEvent.click(screen.getByRole('button', { name: '继续' }));
  fireEvent.click(screen.getByRole('button', { name: '确认重置' }));
  await screen.findByText('游戏已重置');
  expect(records.size).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '存档' }));
  expect(cards()[0]).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '辅助' }));
  expect(screen.getByText('30%')).toBeInTheDocument();
  unmount();
});

it('exposes miscarriage, infertility, and twin probabilities with 0-100 bounds', async () => {
  const repository: SaveRepository = {
    load: async () => null,
    save: async () => undefined,
    clear: async () => undefined,
  };
  function Harness() {
    const store = useGameStore(repository);
    return <SettingsPage store={store} clock={store.gameState.clock} pendingEvents={0} onSkipMonth={() => {}} onSkipYears={() => {}} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: '辅助' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '提高流产概率' })).toBeEnabled());
  expect(screen.getByText('单胎概率').closest('.settings-row')).toHaveTextContent('97%');
  for (let i = 0; i < 25; i++) fireEvent.click(screen.getByRole('button', { name: '降低流产概率' }));
  expect(screen.getByRole('button', { name: '降低流产概率' })).toBeDisabled();
  for (let i = 0; i < 25; i++) fireEvent.click(screen.getByRole('button', { name: '提高双胞胎概率' }));
  expect(screen.getByRole('button', { name: '提高双胞胎概率' })).toBeDisabled();
  expect(screen.getByText('单胎概率').closest('.settings-row')).toHaveTextContent('0%');
});

