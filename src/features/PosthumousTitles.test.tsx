import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { GameStateContext } from '../game/GameStateContext';
import { createInitialGameState } from '../game/initialGameState';
import { killPerson } from '../game/person';
import { PersonRoster, type RosterKind } from './PersonRoster';

function Harness({ kind = 'DECEASED' as RosterKind }) {
  const [gameState, setGameState] = useState(() => {
    const state = createInitialGameState();
    state.people.late = { ...state.people.empress, id: 'late', name: '许令仪', title: '贵妃', rank: '贵妃' };
    state.people.cold = { ...state.people.empress, id: 'cold', name: '冷宫妃嫔', title: '妃', rank: '妃', status: 'COLD_PALACE' };
    return killPerson(state, 'late', '病逝');
  });
  return <GameStateContext.Provider value={{ gameState, setGameState }}><PersonRoster kind={kind} people={gameState.people} onClose={() => {}} onOpenDetail={() => {}} /></GameStateContext.Provider>;
}

it('opens a deceased detail, grants honors, and shows both lifetime and posthumous identity', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: /查看许令仪/ }));
  expect(screen.queryByRole('button', { name: '临幸' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '追封' }));
  const dialog = screen.getByRole('dialog', { name: '追封' });
  expect(within(dialog).queryByRole('option', { name: '嫔' })).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('追封为'), { target: { value: '皇贵妃' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认追封' }));
  expect(screen.getAllByText('追封皇贵妃').length).toBeGreaterThan(0);
  expect(screen.getByText('生前身份')).toBeInTheDocument();
  expect(screen.getByText('已故')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '履历' }));
  expect(screen.getByText('追封许令仪为皇贵妃。')).toBeInTheDocument();
});

it('keeps cold-palace and dead people out of the active consort roster', () => {
  render(<Harness kind="CONSORT" />);
  expect(screen.queryByText('许令仪')).not.toBeInTheDocument();
  expect(screen.queryByText('冷宫妃嫔')).not.toBeInTheDocument();
  expect(screen.getByText('沈清和')).toBeInTheDocument();
});

it('shows only living cold-palace consorts in the independent cold-palace list', () => {
  render(<Harness kind={'COLD_PALACE' as RosterKind} />);
  expect(screen.queryByText('许令仪')).not.toBeInTheDocument();
  expect(screen.queryByText('沈清和')).not.toBeInTheDocument();
  expect(screen.getByText('冷宫妃嫔')).toBeInTheDocument();
});
