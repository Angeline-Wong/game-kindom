import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/initialGameState';
import { CourtSession } from './CourtSession';

describe('temp court component', () => {
  it('starts', () => {
    function Harness() {
      const [state, setState] = React.useState(createInitialGameState);
      return <CourtSession state={state} onChange={setState} onBack={() => undefined} />;
    }
    render(<Harness />);
    fireEvent.click(screen.getByTestId('court-start'));
    expect(screen.getByText('朝会议事台')).toBeInTheDocument();
  });
});
