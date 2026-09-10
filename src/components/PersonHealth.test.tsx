import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ApprovedPersonDetail } from './ApprovedPersonDetail';
import { createInitialGameState } from '../game/initialGameState';
import { killPerson } from '../game/person';

it('shows death details and hides stale live actions', () => {
  const state = killPerson(createInitialGameState(), 'empress', '刺杀');
  const record = state.people.empress;
  render(<ApprovedPersonDetail record={record} person={{ id: record.id, name: record.name, title: record.title, portrait: 'empress' }} title="人物" history={state.history} relationships={state.relationships} people={state.people} actionItems={[{ id: 'favor', label: '临幸', group: 'primary' }]} onAction={() => { throw new Error('dead action'); }} onClose={() => {}} />);
  expect(screen.getByText('已故')).toBeInTheDocument();
  expect(screen.getByText('刺杀')).toBeInTheDocument();
  expect(screen.getByText('3年10月18日')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '临幸' })).not.toBeInTheDocument();
});
