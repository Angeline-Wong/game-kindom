import { StrictMode, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GameStateContext } from '../game/GameStateContext';
import { createInitialGameState } from '../game/initialGameState';
import { phaseOneDialogues } from '../game/palaceDialogues';
import { instantiatePalaceScene } from '../game/palaceEvents';
import { SceneDialogue } from './ScenePeople';
import { ApprovedPersonDetail } from '../components/ApprovedPersonDetail';
import { getPersonActions } from '../game/personActions';
import { consortVisitEligibility, applyPunishment } from '../game/palacePunishments';
import { FlipCardPrototype } from '../App';
import type { GameState } from '../game/gameState';
import type { DialogueScene } from '../game/dialogueLibrary';

function fixture() {
  const state = createInitialGameState();
  state.people.other = { ...state.people.empress, id: 'other', name: '顾清漪', stats: { ...state.people.empress.stats } };
  return state;
}
function Harness({ template = phaseOneDialogues[0] }: { template?: DialogueScene }) {
  const [gameState, setGameState] = useState(fixture);
  const [scene] = useState(() => instantiatePalaceScene(gameState, gameState.people.empress, template));
  const [done, setDone] = useState(false);
  const record = gameState.people.empress;
  const person = { id: record.id, name: record.name, title: record.title, avatar: '沈', portrait: 'consort', type: 'CONSORT' as const, priority: 1, dialogue: scene.text, dialogueScene: scene };
  return <GameStateContext.Provider value={{ gameState, setGameState }}>
    {!done && <SceneDialogue person={person} peopleRecords={gameState.people} onComplete={() => setDone(true)} onRecord={() => { throw Error('New dialogue must not call legacy rewards'); }} />}
    <output data-testid="state">{JSON.stringify(gameState)}</output>
  </GameStateContext.Provider>;
}
const stateFromUi = () => JSON.parse(screen.getByTestId('state').textContent!) as GameState;
describe('phase one dialogue UI', () => {
  it('shows actual effects with reply and saves once in StrictMode', () => {
    render(<StrictMode><Harness /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: '陪她赏月' }));
    expect(screen.getByText('皇帝陪她赏月，闲谈至夜风渐凉。')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '属性变化' })).toHaveTextContent('宠爱 +2');
    expect(stateFromUi().people.empress.stats.心情).toBe(73);
    fireEvent.click(screen.getByRole('button', { name: '结束交谈' }));
    expect(stateFromUi().people.empress.stats.宠爱).toBe(78);
    expect(stateFromUi().history.filter((h) => h.type === 'PALACE_DIALOGUE')).toHaveLength(1);
  });
  it('requires punishment confirmation and records grounding only after it', () => {
    render(<Harness template={phaseOneDialogues[5]} />);
    fireEvent.click(screen.getByRole('button', { name: '考虑处置' }));
    expect(stateFromUi().people.other.groundingUntilDay).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: '选择处罚' }));
    fireEvent.click(screen.getByRole('button', { name: '禁足7日' }));
    expect(stateFromUi().people.other.groundingUntilDay).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: '确认处罚' }));
    const state = stateFromUi();
    expect(consortVisitEligibility(state.people.other, state.clock).allowed).toBe(false);
    expect(state.history.at(-1)?.punishment?.targetId).toBe('other');
  });
  it('closing punishment or skipping a new dialogue grants no legacy rewards', () => {
    const first = render(<Harness template={phaseOneDialogues[5]} />);
    fireEvent.click(screen.getByRole('button', { name: '考虑处置' }));
    fireEvent.click(screen.getByRole('button', { name: '选择处罚' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭处罚' }));
    expect(stateFromUi().history.some((h) => h.punishment)).toBe(false);
    expect(stateFromUi().relationships[0].affinity).toBe(72);
    first.unmount();
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '跳过' }));
    expect(stateFromUi().history).toHaveLength(0);
  });
  it('shows and executes a new follow-up choice reply without double rewards', () => {
    const template: DialogueScene = { ...phaseOneDialogues[0], followUp: { speaker: '沈清和', text: '陛下可愿再坐片刻？', choices: [{ id: 'stay', label: '再坐片刻', reply: '皇帝又坐了一会儿。', effects: [{ type: 'MOOD', target: 'SPEAKER', value: 2 }] }] } };
    render(<Harness template={template} />);
    fireEvent.click(screen.getByRole('button', { name: '陪她赏月' }));
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    fireEvent.click(screen.getByRole('button', { name: '再坐片刻' }));
    expect(screen.getByText('皇帝又坐了一会儿。')).toBeInTheDocument();
    expect(stateFromUi().people.empress.stats.心情).toBe(75);
    expect(stateFromUi().history).toHaveLength(2);
  });
  it('keeps old id/label/reply choices working through the legacy callback', () => {
    const state = fixture(), onRecord = vi.fn(), onComplete = vi.fn();
    const person = { id: 'empress', name: '沈清和', title: '皇后', avatar: '沈', portrait: 'consort', type: 'CONSORT' as const, priority: 1, dialogue: '旧剧情', dialogueScene: { id: 'old', kind: 'CONSORT' as const, text: '旧剧情', choices: [{ id: 'ok', label: '旧选择', reply: '旧回复' }] } };
    render(<SceneDialogue person={person} peopleRecords={state.people} onComplete={onComplete} onRecord={onRecord} />);
    fireEvent.click(screen.getByRole('button', { name: '旧选择' }));
    expect(onRecord).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });
  it('disables direct visits, displays the reason and exposes punishment in existing history', () => {
    const state = applyPunishment(fixture(), { id: 'test', targetId: 'empress', reason: '宫中失仪', severity: 'MINOR' }, 'grounding-7').state;
    const record = state.people.empress;
    const actionItems = getPersonActions('CONSORT', { visitReason: consortVisitEligibility(record, state.clock).reason });
    render(<GameStateContext.Provider value={{ gameState: state, setGameState: vi.fn() }}><ApprovedPersonDetail person={{ ...record, portrait: 'consort' }} title="皇后" record={record} people={state.people} relationships={state.relationships} history={state.history} actionItems={actionItems} onAction={vi.fn()} onClose={vi.fn()} /></GameStateContext.Provider>);
    expect(screen.getByRole('button', { name: '临幸' })).toBeDisabled();
    expect(screen.getByText('该妃嫔正在禁足中。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '履历' }));
    expect(screen.getByText(/因宫中失仪，受处置：禁足7日/)).toBeInTheDocument();
  });
  it('excludes grounded candidates from flip cards and rejects stale selections', () => {
    const state = applyPunishment(fixture(), { id: 'test', targetId: 'empress', reason: '宫中失仪', severity: 'MINOR' }, 'grounding-7').state;
    const onSelect = vi.fn();
    render(<FlipCardPrototype people={state.people} date={state.clock} onClose={vi.fn()} onSelect={onSelect} />);
    const document = screen.getByTitle('侍寝翻牌').getAttribute('srcdoc')!;
    expect(document).not.toContain('"id":"empress"');
    expect(document).toContain('"id":"other"');
    fireEvent(window, new MessageEvent('message', { data: { type: 'flip-card-select', personId: 'empress' } }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
