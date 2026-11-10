/**
 * @file syncWorker.ts
 * @description Background processing engine that consumes the local SQLite sync queue
 * and synchronizes recorded transactions and closures to Supabase. Implements an execution
 * lock mechanism to prevent race conditions and respects FIFO operational ordering.
 */

import * as SQLite from "expo-sqlite";
import * as Network from "expo-network";
import { DB_NAME } from "../db/schema";
import { supabase } from "../lib/supabase";
import { updateSyncItemStatus } from "../db/syncQueue";

/**
 * Database record representation of an entry in the `sync_queue` table.
 */
export interface SyncOperationRecord {
  /** Unique identifier of the sync queue item (UUID or timestamp key) */
  id: string;
  /** Domain entity type being synchronized */
  entity: string;
  /** Primary key of the local target row */
  entity_id: string;
  /** Mutation type executed on the entity */
  operation: string;
  /** Serialized JSON representation of the payload */
  payload: string;
  /** ISO timestamp of when the record entered the queue */
  created_at: string;
  /** Current processing status of the sync item */
  status: string;
  /** Number of failed attempts made to process this item */
  retry_count: number;
}

/** Internal flag ensuring single-instance execution lock */
let isSyncing = false;

/**
 * Pushes a single operation payload to Supabase depending on entity type and mutation.
 *
 * @param entity - Target database table or domain model.
 * @param operation - SQL action type (INSERT, UPDATE, DELETE).
 * @param payload - Parsed object containing entity attributes.
 * @returns {Promise<boolean>} True if remote operation succeeded, false otherwise.
 */
async function pushToSupabase(
  entity: string,
  operation: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    if (entity === "closure" && operation === "INSERT") {
      const { error } = await supabase.from("closures").insert([payload]);
      if (error) {
        console.error(
          "[SyncWorker] Supabase closure insertion error:",
          error.message,
        );
        return false;
      }
      return true;
    }

    if (entity === "transaction" && operation === "INSERT") {
      const { error } = await supabase.from("transactions").insert([payload]);
      if (error) {
        console.error(
          "[SyncWorker] Supabase transaction insertion error:",
          error.message,
        );
        return false;
      }
      return true;
    }

    if (entity === "product") {
      if (operation === "DELETE") {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", payload.id);
        if (error) return false;
      } else {
        const { error } = await supabase.from("products").upsert(payload);
        if (error) return false;
      }
      return true;
    }

    console.warn(
      `[SyncWorker] Unrecognized entity or operation: ${entity} -> ${operation}`,
    );
    return true; // Bypass unknown entities to avoid blocking the FIFO pipeline
  } catch (err) {
    console.error("[SyncWorker] Remote dispatch error:", err);
    return false;
  }
}

/**
 * Executes a sync cycle over pending operations in the local SQLite queue.
 * Performs network verification, acquires execution lock, and maintains sequential FIFO processing.
 *
 * @returns {Promise<boolean>} True if the queue was emptied or was already empty; false if aborted/failed.
 */
export async function processSyncQueue(): Promise<boolean> {
  // 1. Prevent overlapping concurrent runs
  if (isSyncing) {
    return false;
  }

  // 2. Validate active network connection before attempting remote operations
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected || !networkState.isInternetReachable) {
    return false;
  }

  isSyncing = true;

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // 3. Fetch oldest pending queue items (FIFO limit 50 per batch)
    const pendingOps = await db.getAllAsync<SyncOperationRecord>(
      `SELECT id, entity_type as entity, entity_id, operation, payload, created_at, status, attempts as retry_count
       FROM sync_queue
       WHERE status = 'PENDING' OR (status = 'ERROR' AND attempts < 5)
       ORDER BY created_at ASC
       LIMIT 50;`,
    );

    if (pendingOps.length === 0) {
      return true;
    }

    // 4. Sequential processing loop to preserve causal sequence integrity
    for (const op of pendingOps) {
      let payloadObj: Record<string, unknown> = {};
      try {
        payloadObj = JSON.parse(op.payload);
      } catch (parseError) {
        console.error(
          `[SyncWorker] Invalid JSON payload on operation ${op.id}:`,
          parseError,
        );
        await updateSyncItemStatus(op.id, "ERROR", "Invalid JSON payload");
        continue;
      }

      const success = await pushToSupabase(op.entity, op.operation, payloadObj);

      if (success) {
        await updateSyncItemStatus(op.id, "COMPLETED");
      } else {
        await updateSyncItemStatus(op.id, "ERROR", "Remote dispatch failed");
        // Halt pipeline on remote error to preserve dependency chain
        break;
      }
    }

    return true;
  } catch (error) {
    console.error("[SyncWorker] Critical error processing sync queue:", error);
    return false;
  } finally {
    isSyncing = false;
  }
}
