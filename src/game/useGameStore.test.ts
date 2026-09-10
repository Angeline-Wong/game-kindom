import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { migrateGameState } from './initialGameState';
import { useGameStore } from './useGameStore';
import type { GameState } from './gameState';
import type { SaveRepository } from './saveRepository';

it('saves independent full snapshots, restores settings and clears all saves on reset', async () => {
  const records = new Map<string, GameState>();
  const repository: SaveRepository = {
    load: async id => structuredClone(records.get(id) ?? null),
    save: async state => { records.set(state.saveId, structuredClone(state)); },
    clear: async () => { records.clear(); },
  };
  const { result, unmount } = renderHook(() => useGameStore(repository));
  await waitFor(() => expect(result.current.hydrated).toBe(true));
  act(() => result.current.setGameState(s => ({ ...s, gameSettings: { pregnancyRate: 40, maleBirthRate: 70 } })));
  await act(() => result.current.saveManual(1));
  const snapshot = records.get('manualSave1')!;
  act(() => result.current.setGameState(s => ({ ...s, clock: { ...s.clock, year: 22 }, gameSettings: { pregnancyRate: 90, maleBirthRate: 20 } })));
  await act(() => result.current.saveManual(2));
  expect(records.get('manualSave2')?.clock.year).toBe(22);
  expect(records.get('manualSave1')).toEqual(snapshot);
  await act(() => result.current.loadManual(1));
  expect(result.current.gameState.gameSettings).toEqual(migrateGameState(snapshot).gameSettings);
  expect(result.current.gameState.clock).toEqual(snapshot.clock);
  expect(result.current.gameState.people).toEqual(migrateGameState(snapshot).people);
  expect(result.current.gameState.saveId).toBe('autosave');
  await act(() => result.current.resetGame());
  expect(records.size).toBe(0);
  expect(result.current.gameState.gameSettings).toEqual({ pregnancyRate: 30, maleBirthRate: 50, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 });
  expect(result.current.manualSaves).toEqual([null, null]);
  unmount();
});


it('waits for an in-flight autosave before clearing and never restores it after reset', async () => {
  vi.useFakeTimers();
  let finishSave: (() => void) | undefined;
  const records = new Map<string, GameState>();
  const repository: SaveRepository = {
    load: async id => records.get(id) ?? null,
    save: state => new Promise<void>(resolve => { finishSave = () => { records.set(state.saveId, structuredClone(state)); resolve(); }; }),
    clear: async () => { records.clear(); },
  };
  const { result, unmount } = renderHook(() => useGameStore(repository));
  try {
    await act(async () => {});
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(finishSave).toBeDefined();
    let resetting: Promise<void>;
    act(() => { resetting = result.current.resetGame(); });
    expect(result.current.busy).toBe(true);
    await act(async () => { finishSave!(); await resetting!; });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(records.size).toBe(0);
    expect(result.current.lastSavedAt).toBeNull();
  } finally { unmount(); vi.useRealTimers(); }
});

it('persists probability changes and hydrates them on a fresh mount', async () => {
  vi.useFakeTimers();
  const records = new Map<string, GameState>();
  const repository: SaveRepository = {
    load: async id => structuredClone(records.get(id) ?? null),
    save: async state => { records.set(state.saveId, structuredClone(state)); },
    clear: async () => { records.clear(); },
  };
  const first = renderHook(() => useGameStore(repository));
  try {
    await act(async () => {});
    act(() => first.result.current.setGameState(s => ({ ...s, gameSettings: { pregnancyRate: 0, maleBirthRate: 100 } })));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    first.unmount();
    const second = renderHook(() => useGameStore(repository));
    await act(async () => {});
    expect(second.result.current.gameState.gameSettings).toEqual({ pregnancyRate: 0, maleBirthRate: 100, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 });
    second.unmount();
  } finally { first.unmount(); vi.useRealTimers(); }
});

it('resumes automatic saving after a failed manual operation', async () => {
  vi.useFakeTimers();
  const save = vi.fn(async (state: GameState) => { if (state.saveId !== 'autosave') throw new Error('disk full'); });
  const repository: SaveRepository = { load: async () => null, save, clear: async () => {} };
  const { result, unmount } = renderHook(() => useGameStore(repository));
  try {
    await act(async () => {});
    await act(async () => { await expect(result.current.saveManual(1)).rejects.toThrow('disk full'); });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(save.mock.calls.some(([state]) => state.saveId === 'autosave')).toBe(true);
  } finally { unmount(); vi.useRealTimers(); }
});

it('does not overwrite existing progress when initial save loading fails', async () => {
  vi.useFakeTimers();
  const save = vi.fn(async () => {});
  const repository: SaveRepository = { load: async () => { throw new Error('read failed'); }, save, clear: async () => {} };
  const { result, unmount } = renderHook(() => useGameStore(repository));
  try {
    await act(async () => {});
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toContain('读取失败');
  } finally { unmount(); vi.useRealTimers(); }
});
