import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createInitialGameState, migrateGameState } from './initialGameState';
import type { GameState } from './gameState';
import { indexedDbSaveRepository, type SaveRepository } from './saveRepository';

export function useGameStore(repository: SaveRepository = indexedDbSaveRepository): {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  hydrated: boolean;
} {
  const [gameState, setGameState] = useState(createInitialGameState);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const latestState = useRef(gameState);

  useEffect(() => {
    let active = true;
    repository.load('autosave').then((stored) => {
      if (active && stored?.version === 1) setGameState(migrateGameState(stored));
    }).catch(() => undefined).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, [repository]);

  useEffect(() => {
    if (!hydrated) return undefined;
    latestState.current = gameState;
    if (saveTimer.current === undefined) {
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = undefined;
        void repository.save(latestState.current);
      }, 1000);
    }
    return undefined;
  }, [gameState, hydrated, repository]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  return { gameState, setGameState, hydrated };
}
