import '@testing-library/jest-dom/vitest';
import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FlipCardPrototype } from '../App';
import { ScenePeople } from './ScenePeople';
import { createInitialGameState } from '../game/initialGameState';
import { CharacterSheet } from '../components/CharacterSheet';
import { demoEmperor } from '../game/characters';

describe('royal interaction regressions', () => {
  it('renders the actual flip script immediately and survives rapid pagination', () => {
    const { JSDOM } = createRequire(import.meta.url)('jsdom');
    const state = createInitialGameState();
    const mother = { ...state.people.empress, status: 'NORMAL' as const };
    const people = Object.fromEntries(Array.from({length:18}, (_, i) => ['card-' + i, {...mother,id:'card-' + i,name:'妃嫔' + i}]));
    render(<FlipCardPrototype people={people} date={state.clock} onClose={vi.fn()} onSelect={vi.fn()} />);
    const dom = new JSDOM(screen.getByTitle('侍寝翻牌').getAttribute('srcdoc')!, {runScripts:'dangerously'});
    try {
      const doc = dom.window.document;
      expect(doc.querySelectorAll('.green牌')).toHaveLength(8);
      for(let i=0;i<20;i++) { doc.getElementById('nextBtn').click(); doc.getElementById('prevBtn').click(); }
      expect(doc.querySelectorAll('.green牌')).toHaveLength(8);
      expect(doc.getElementById('rack').style.animation).toBe('');
      doc.querySelector('.green牌').click();
      expect(doc.getElementById('confirmBtn').disabled).toBe(false);
      doc.getElementById('confirmBtn').click();
      expect(doc.getElementById('confirmLayer').classList.contains('show')).toBe(true);
    } finally { dom.window.close(); }
  });
  it('saves the edited name, reign and clan without replacing the emperor title', () => {
    const update = vi.fn();
    render(<CharacterSheet character={demoEmperor} onClose={vi.fn()} onUpdate={update} />);
    fireEvent.click(screen.getByRole('button', {name:'编辑信息'}));
    fireEvent.change(screen.getByLabelText('名讳'), {target:{value:'萧景明'}});
    fireEvent.change(screen.getByLabelText('年号'), {target:{value:'承平'}});
    fireEvent.change(screen.getByLabelText('宗室'), {target:{value:'萧氏'}});
    fireEvent.click(screen.getByRole('button', {name:'保存帝王信息'}));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({name:'萧景明',reignName:'承平',clanName:'萧氏',title:demoEmperor.title}));
  });
  it('keeps the flip document stable when simulation replaces people', () => {
    const state = createInitialGameState();
    state.people.second = { ...state.people.empress, id:'second', name:'测试妃嫔', status:'NORMAL' };
    state.people.empress.status = 'NORMAL';
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const props = { people: state.people, date: state.clock, onClose: vi.fn(), onSelect: vi.fn() };
    const view = render(<FlipCardPrototype {...props} />);
    const frame = screen.getByTitle('侍寝翻牌');
    const original = frame.getAttribute('srcdoc');
    random.mockReturnValue(0.9);
    view.rerender(<FlipCardPrototype {...props} people={structuredClone(state.people)} />);
    expect(frame.getAttribute('srcdoc')).toBe(original);
    random.mockRestore();
  });
  it('shows the emperor reference layout and enables editing explicitly', () => {
    render(<CharacterSheet character={demoEmperor} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('帝王详情')).toBeInTheDocument();
    expect(screen.getByText('统治概览')).toBeInTheDocument();
    expect(screen.getByLabelText('名讳')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name:'编辑信息'}));
    expect(screen.getByLabelText('名讳')).toBeEnabled();
  });
  it('lets an unraised prince choose a mother and announces adoption by edict', () => {
    const state = createInitialGameState();
    const child = { ...state.people.emperor, id:'orphan', kind:'PRINCE' as const, name:'萧景安', age:8, title:'皇子', parents:['emperor'], children:[], sceneId:'xiefang' };
    const onAdopt = vi.fn();
    render(<ScenePeople sceneId="xiefang" sceneTitle="撷芳殿" peopleState={{people:[]}} peopleRecords={{...state.people, orphan:child}} history={[]} relationships={[]} requestedPersonId="orphan" residenceState={{residences:[]}} personRanks={{}} sixPalaceAssistants={[]} onPeopleChange={vi.fn()} onNotice={vi.fn()} onReward={vi.fn()} onResidenceChange={vi.fn()} onRankChange={vi.fn()} onOfficeChange={vi.fn()} onTitleChange={vi.fn()} onHonorificChange={vi.fn()} onRecordAction={vi.fn()} onOpenTreasury={vi.fn()} onSetSixPalaceAssistant={vi.fn()} onConsortVisit={vi.fn()} onConsortCompanion={vi.fn()} onPersonStatusChange={vi.fn()} onSeparateMotherAndChildren={vi.fn()} onGrantPersonalChildCare={vi.fn()} onAdoptRoyalChild={onAdopt} onRestorePerson={vi.fn()} onTravelToPerson={vi.fn()} onHeirInteraction={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', {name:'过继'}));
    fireEvent.click(screen.getByRole('button', {name: new RegExp(state.people.empress.name)}));
    expect(onAdopt).toHaveBeenCalledWith('orphan','empress');
    expect(screen.getByTitle('皇嗣过继圣旨')).toBeInTheDocument();
    fireEvent(window, new MessageEvent('message', {data:{type:'edict-complete'}}));
    expect(screen.queryByTitle('皇嗣过继圣旨')).not.toBeInTheDocument();
    expect(onAdopt).toHaveBeenCalledTimes(1);
  });

  it('does not offer adoption for an adult unraised prince', () => {
    const state = createInitialGameState();
    const adult = { ...state.people.emperor, id:'adult-orphan', kind:'PRINCE' as const, name:'萧景成年', age:15, title:'皇子', parents:['emperor'], children:[], sceneId:'xiefang' };
    render(<ScenePeople sceneId="xiefang" sceneTitle="撷芳殿" peopleState={{people:[]}} peopleRecords={{...state.people, 'adult-orphan':adult}} history={[]} relationships={[]} requestedPersonId="adult-orphan" residenceState={{residences:[]}} personRanks={{}} sixPalaceAssistants={[]} onPeopleChange={vi.fn()} onNotice={vi.fn()} onReward={vi.fn()} onResidenceChange={vi.fn()} onRankChange={vi.fn()} onOfficeChange={vi.fn()} onTitleChange={vi.fn()} onHonorificChange={vi.fn()} onRecordAction={vi.fn()} onOpenTreasury={vi.fn()} onSetSixPalaceAssistant={vi.fn()} onConsortVisit={vi.fn()} onConsortCompanion={vi.fn()} onPersonStatusChange={vi.fn()} onSeparateMotherAndChildren={vi.fn()} onGrantPersonalChildCare={vi.fn()} onAdoptRoyalChild={vi.fn()} onRestorePerson={vi.fn()} onTravelToPerson={vi.fn()} onHeirInteraction={vi.fn()} />);

    expect(screen.queryByRole('button', {name:'过继'})).not.toBeInTheDocument();
  });
});
