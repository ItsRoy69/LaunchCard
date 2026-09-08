/** Tiny IndexedDB helper for heavy card assets (logo / screenshot). */

const DB_NAME = "launchcard-assets";
const DB_VERSION = 1;
const STORE = "blobs";

export type AssetKey = "logo" | "shot";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

export async function putAsset(key: AssetKey, dataUrl: string | null): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      if (dataUrl) store.put(dataUrl, key);
      else store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB put failed"));
    });
    db.close();
  } catch {
    // Fail soft — memory state still works for the session.
  }
}

export async function getAsset(key: AssetKey): Promise<string | null> {
  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const v = req.result;
        resolve(typeof v === "string" ? v : null);
      };
      req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    });
    db.close();
    return value;
  } catch {
    return null;
  }
}

export async function clearAssets(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB clear failed"));
    });
    db.close();
  } catch {
    // ignore
  }
}
