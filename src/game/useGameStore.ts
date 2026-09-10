import { useEffect, useRef, useState } from 'react';
import { createInitialGameState, migrateGameState } from './initialGameState';
import type { GameState } from './gameState';
import { indexedDbSaveRepository, type SaveRepository } from './saveRepository';

export function useGameStore(repository: SaveRepository = indexedDbSaveRepository) {
  const [gameState, setGameState] = useState(createInitialGameState);
  const [hydrated, setHydrated] = useState(false);
  const [manualSaves, setManualSaves] = useState<(GameState | null)[]>([null, null]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState('正在读取');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const latestState = useRef(gameState);
  const locked = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const cleanState = useRef<GameState | null>(null);
  latestState.current = gameState;

  const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(operation);
    queue.current = next.catch(() => undefined);
    return next;
  };
  useEffect(() => {
    let active = true;
    Promise.all(['autosave', 'manualSave1', 'manualSave2'].map(id => repository.load(id))).then(([stored, one, two]) => {
      if (!active) return;
      if (stored && stored.version !== 1) throw new Error('存档版本不受支持');
      if (stored?.version === 1) { setGameState(migrateGameState(stored)); setLastSavedAt(stored.updatedAt); }
      setManualSaves([one, two]);
      setSaveStatus(stored ? '已同步' : '尚未保存');
      setHydrated(true);
    }).catch(() => { if (active) setSaveStatus('读取失败，请刷新重试'); });
    return () => { active = false; };
  }, [repository]);

  useEffect(() => {
    if (!hydrated || locked.current || cleanState.current === gameState) return;
    setSaveStatus('待同步');
    if (saveTimer.current === undefined) {
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = undefined;
        const snapshot = { ...latestState.current, saveId: 'autosave', updatedAt: Date.now() };
        void enqueue(() => repository.save(snapshot)).then(() => {
          setLastSavedAt(snapshot.updatedAt); setSaveStatus('已同步');
        }).catch(() => setSaveStatus('保存失败'));
      }, 1000);
    }
  }, [gameState, hydrated, repository]);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  async function exclusive(operation: () => Promise<void>) {
    if (!hydrated || locked.current) throw new Error('请等待存档操作完成');
    locked.current = true; setBusy(true);
    window.clearTimeout(saveTimer.current); saveTimer.current = undefined;
    try { await enqueue(operation); }
    finally {
      locked.current = false; setBusy(false);
      setGameState(current => cleanState.current === current ? current : { ...current });
    }
  }
  async function saveManual(slot: 1 | 2) {
    const snapshot = structuredClone({ ...latestState.current, saveId: `manualSave${slot}`, updatedAt: Date.now() });
    await exclusive(async () => {
      await repository.save(snapshot);
      setManualSaves(current => current.map((saved, index) => index === slot - 1 ? snapshot : saved));
    });
  }
  async function loadManual(slot: 1 | 2) {
    await exclusive(async () => {
      const stored = await repository.load(`manualSave${slot}`);
      if (!stored || stored.version !== 1) throw new Error('存档为空或版本不受支持');
      const restored = { ...migrateGameState(stored), saveId: 'autosave', updatedAt: Date.now() };
      await repository.save(restored);
      latestState.current = restored; cleanState.current = restored;
      setGameState(restored); setLastSavedAt(restored.updatedAt); setSaveStatus('已同步'); setRevision(value => value + 1);
    });
  }
  async function resetGame() {
    await exclusive(async () => {
      await repository.clear();
      const initial = createInitialGameState();
      latestState.current = initial; cleanState.current = initial;
      setGameState(initial); setManualSaves([null, null]); setLastSavedAt(null); setSaveStatus('尚未保存'); setRevision(value => value + 1);
    });
  }
  return { gameState, setGameState, hydrated, manualSaves, lastSavedAt, saveStatus, revision, busy, saveManual, loadManual, resetGame };
}
