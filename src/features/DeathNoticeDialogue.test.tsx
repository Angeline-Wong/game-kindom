import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../App';
import { createInitialGameState } from '../game/initialGameState';
import { killPerson } from '../game/person';
import { indexedDbSaveRepository } from '../game/saveRepository';

afterEach(() => vi.restoreAllMocks());

function renderDeathNotice() {
  const state = createInitialGameState();
  state.speed = 0;
  state.events = [];
  state.people.empress.rank = '贵妃';
  const dead = killPerson(state, 'empress', '疾病');
  vi.spyOn(indexedDbSaveRepository, 'load').mockImplementation(async id => id === 'autosave' ? dead : null);
  vi.spyOn(indexedDbSaveRepository, 'save').mockResolvedValue();
  render(<App />);
}

it('opens the deceased person’s posthumous title form from the notice', async () => {
  renderDeathNotice();
  fireEvent.click(await screen.findByRole('button', { name: '前去追封' }));
  const dialog = screen.getByRole('dialog', { name: '追封' });
  expect(within(dialog).getByText('已故：沈清和')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('追封为'), { target: { value: '皇贵妃' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认追封' }));
  expect(screen.queryByRole('dialog', { name: '追封' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '前去追封' })).not.toBeInTheDocument();
});

it('keeps the grief response in a dialogue until dismissed', async () => {
  renderDeathNotice();
  fireEvent.click(await screen.findByRole('button', { name: '悲痛欲绝' }));
  expect(screen.getByRole('dialog', { name: /内侍劝慰/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '退下吧' }));
  expect(screen.queryByRole('dialog', { name: /内侍劝慰/ })).not.toBeInTheDocument();
});
