import { StrictMode, useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameStateContext } from '../game/GameStateContext';
import { createInitialGameState } from '../game/initialGameState';
import { createPalaceCase, startPalaceInvestigation } from '../game/palaceCases';
import { advanceGameState } from '../game/simulation';
import { palaceCaseDialogue } from '../game/palaceCaseTemplates';
import { instantiatePalaceScene } from '../game/palaceEvents';
import type { GameState } from '../game/gameState';
import { SceneDialogue } from './ScenePeople';
import { PalaceCasesPanel } from './PalaceCases';

function Harness({ completed = false }: { completed?: boolean }) {
  const [gameState, setGameState] = useState(() => {
    let state = createInitialGameState();
    state.people.other = { ...state.people.empress, id: 'other', name: '陈清漪', rank: '贵人', title: '贵人', stats: { ...state.people.empress.stats } };
    if (completed) {
      state = createPalaceCase(state, { id: 'ui-case', templateId: 'abnormal-food', relatedDialogueId: palaceCaseDialogue.id, sourceInteractionId: 'test', participants: { speakerId: 'empress', accusedId: 'other' }, truthRoll: .1 }).state;
      state = startPalaceInvestigation(state, 'ui-case', 'NEIWUFU', { duration: 0, result: .99 }).state;
      state = advanceGameState(state, 8 * 1440 * 50, 1);
    }
    return state;
  });
  const [closed, setClosed] = useState(false);
  const scene = instantiatePalaceScene(gameState, gameState.people.empress, palaceCaseDialogue);
  return <GameStateContext.Provider value={{ gameState, setGameState }}>
    {!closed && (completed ? <PalaceCasesPanel initialCaseId="ui-case" onClose={() => setClosed(true)} /> : <SceneDialogue person={{ id: 'empress', name: '沈清和', title: '皇后', avatar: '沈', portrait: 'empress', type: 'CONSORT', priority: 1, dialogue: scene.text, dialogueScene: scene }} peopleRecords={gameState.people} onComplete={() => setClosed(true)} onRecord={() => { throw Error('legacy effects'); }} />)}
    <output data-testid="state">{JSON.stringify(gameState)}</output>
  </GameStateContext.Provider>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!) as GameState;
describe('Phase 2 player UI', () => {
  it('opens assignment from a real dialogue choice once in StrictMode and starts without a result', () => {
    render(<StrictMode><Harness /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: '命人彻查' }));
    expect(state().palaceCases).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '指派调查' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /内务府\s*综合调查能力/ }));
    expect(state().palaceCases[0].status).toBe('INVESTIGATING');
    expect(state().palaceCases[0].result).toBeUndefined();
    expect(state().history.filter((h) => h.type === 'PALACE_CASE_STARTED')).toHaveLength(1);
  });
  it('requires separate punishment confirmation and displays closure', () => {
    render(<Harness completed />);
    fireEvent.click(screen.getByRole('button', { name: '直接处置' }));
    fireEvent.click(screen.getByRole('button', { name: '处置陈清漪' }));
    fireEvent.click(screen.getByRole('button', { name: '禁足7日' }));
    expect(state().palaceCases[0].status).toBe('WAITING_DECISION');
    fireEvent.click(screen.getByRole('button', { name: '确认处罚' }));
    expect(state().palaceCases[0].status).toBe('CLOSED');
    expect(within(screen.getByRole('dialog', { name: '宫中事务' })).getByText(/处罚已记入人物履历/)).toBeInTheDocument();
  });
  it('defers without closing or punishing', () => {
    render(<Harness completed />);
    fireEvent.click(screen.getByRole('button', { name: '暂缓处理' }));
    expect(state().palaceCases[0].status).toBe('WAITING_DECISION');
    expect(state().history.some((h) => h.punishment)).toBe(false);
  });
  it('closes without punishment only after confirmation', () => {
    render(<Harness completed />);
    fireEvent.click(screen.getByRole('button', { name: '不予追究' }));
    expect(state().palaceCases[0].status).toBe('WAITING_DECISION');
    fireEvent.click(screen.getByRole('button', { name: '确认结案' }));
    expect(state().palaceCases[0].ruling?.type).toBe('NO_ACTION');
  });
});
