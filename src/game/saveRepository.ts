import type { GameState } from './gameState';

const DATABASE = 'zichen-chronicles';
const STORE = 'saves';

export interface SaveRepository {
  load(saveId: string): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
  clear(): Promise<void>;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'saveId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const indexedDbSaveRepository: SaveRepository = {
  async load(saveId) {
    if (!('indexedDB' in globalThis)) return null;
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(saveId);
      request.onsuccess = () => resolve((request.result as GameState | undefined) ?? null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  },
  async clear() {
    if (!('indexedDB' in globalThis)) throw new Error('当前设备无法使用存档');
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      for (const id of ['autosave', 'manualSave1', 'manualSave2']) transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error); };
    });
  },
  async save(state) {
    if (!('indexedDB' in globalThis)) throw new Error('当前设备无法使用存档');
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(state);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error); };
    });
  },
};
