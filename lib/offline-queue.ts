// Queues POS orders in IndexedDB when the network is unavailable, and
// flushes them to /api/orders automatically once connectivity returns.
// Each queued order carries a client-generated id so a retried sync is
// idempotent (the server returns the existing order instead of duplicating it).

const DB_NAME = "hanaeats-offline";
const STORE = "pending_orders";
const DB_VERSION = 1;

export interface QueuedOrder {
  client_order_id: string;
  payload: Record<string, unknown>;
  queued_at: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "client_order_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function newClientOrderId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function queueOrder(order: QueuedOrder): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(order);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueuedOrders(): Promise<QueuedOrder[]> {
  const db = await openDb();
  const rows = await new Promise<QueuedOrder[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedOrder[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function removeQueuedOrder(clientOrderId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(clientOrderId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

let syncing = false;

export async function syncQueuedOrders(onSynced?: (clientOrderId: string, order: Record<string, unknown>) => void): Promise<number> {
  if (syncing || typeof navigator !== "undefined" && !navigator.onLine) return 0;
  syncing = true;
  let synced = 0;
  try {
    const queued = await getQueuedOrders();
    for (const q of queued) {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q.payload),
        });
        if (res.ok) {
          const order = await res.json();
          await removeQueuedOrder(q.client_order_id);
          synced++;
          onSynced?.(q.client_order_id, order);
        }
      } catch {
        // Still offline or request failed — leave it queued, retry on the next sync pass.
        break;
      }
    }
  } finally {
    syncing = false;
  }
  return synced;
}
