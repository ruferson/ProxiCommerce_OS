/**
 * @file syncQueue.ts
 * @description Local SQLite operations for managing the offline-first synchronization queue.
 * Captures mutations (INSERT, UPDATE, DELETE, UPSERT) and persists them in SQLite
 * so they can be pushed upstream to Supabase when network connectivity is established.
 */

import * as SQLite from "expo-sqlite";
import { DB_NAME } from "./schema";

export type EntityType = "product" | "transaction" | "closure";
export type SyncOperation = "INSERT" | "UPDATE" | "DELETE" | "UPSERT";

export interface SyncQueueItem {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  status: "PENDING" | "SYNCING" | "ERROR" | "COMPLETED";
  attempts: number;
  error_message?: string | null;
  created_at?: string;
}

let queueListener: (() => void) | null = null;
let cloudSyncEnabled = false;

/**
 * Registers a callback invoked whenever a new mutation is added to the queue.
 */
export function setSyncQueueListener(listener: () => void): void {
  queueListener = listener;
}

/**
 * Controls whether local mutations should be queued for Supabase synchronization.
 */
export function setSyncQueueEnabled(enabled: boolean): void {
  cloudSyncEnabled = enabled;
}

/**
 * Generates a unique collision-resistant identifier for sync operations.
 */
function generateSyncId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Enqueues a mutation into the local `sync_queue` table in SQLite.
 * Must be called immediately following a successful local SQLite write.
 *
 * @param {EntityType} entityType - Entity classification ('product', 'transaction', 'closure').
 * @param {string} entityId - Primary key of the affected entity.
 * @param {SyncOperation} operation - SQL mutation type ('INSERT', 'UPDATE', 'DELETE', 'UPSERT').
 * @param {any} payload - Full JSON serializable state or delta payload.
 */
export async function enqueueSyncOperation(
  entityType: EntityType,
  entityId: string,
  operation: SyncOperation,
  payload: any,
): Promise<void> {
  if (!cloudSyncEnabled) return;

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const syncId = generateSyncId();
    const payloadStr = JSON.stringify(payload);

    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, attempts)
       VALUES (?, ?, ?, ?, ?, 'PENDING', 0);`,
      [syncId, entityType, entityId, operation, payloadStr],
    );

    console.log(`[SyncQueue] Enqueued ${operation} for ${entityType}:${entityId}`);

    // Notify listener to trigger background sync immediately if online
    if (queueListener) {
      queueListener();
    }
  } catch (error) {
    console.error("[SyncQueue] Failed to enqueue sync mutation:", error);
  }
}

/**
 * Retrieves pending and retryable error items from the sync queue ordered chronologically.
 *
 * @param {number} limit - Maximum number of items to fetch in a single batch (default 50).
 * @returns {Promise<SyncQueueItem[]>} List of queued sync items.
 */
export async function getPendingSyncItems(
  limit: number = 50,
): Promise<SyncQueueItem[]> {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const items = await db.getAllAsync<SyncQueueItem>(
      `SELECT id, entity_type, entity_id, operation, payload, status, attempts, error_message, created_at
       FROM sync_queue
       WHERE status = 'PENDING' OR (status = 'ERROR' AND attempts < 5)
       ORDER BY created_at ASC
       LIMIT ?;`,
      [limit],
    );
    return items;
  } catch (error) {
    console.error("[SyncQueue] Failed to fetch pending sync items:", error);
    return [];
  }
}

/**
 * Returns the count of items waiting in the local sync queue.
 *
 * @returns {Promise<number>} Number of pending operations.
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING' OR status = 'ERROR';`,
    );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Updates status and diagnostic info for a sync queue entry.
 * When status is 'COMPLETED', removes the row to preserve disk space.
 *
 * @param {string} id - Sync queue item ID.
 * @param {SyncQueueItem['status']} status - New processing state.
 * @param {string | null} errorMessage - Error details if status is 'ERROR'.
 */
export async function updateSyncItemStatus(
  id: string,
  status: SyncQueueItem["status"],
  errorMessage: string | null = null,
): Promise<void> {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    if (status === "COMPLETED") {
      // Purge successfully synced item from local storage
      await db.runAsync(`DELETE FROM sync_queue WHERE id = ?;`, [id]);
    } else {
      await db.runAsync(
        `UPDATE sync_queue
         SET status = ?, attempts = attempts + 1, error_message = ?
         WHERE id = ?;`,
        [status, errorMessage, id],
      );
    }
  } catch (error) {
    console.error(`[SyncQueue] Failed to update item ${id} status:`, error);
  }
}
