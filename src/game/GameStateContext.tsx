import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { GameState } from './gameState';

// 仅传递 useGameStore 的现有状态及 setter，不建立第二份 store。
export const GameStateContext = createContext<{ gameState: GameState; setGameState: Dispatch<SetStateAction<GameState>> } | null>(null);
export const useOptionalGameState = () => useContext(GameStateContext);
export function useSharedGameState() {
  const store = useOptionalGameState();
  if (!store) throw new Error('GameStateContext is required');
  return store;
}
