/**
 * @file inboundSyncService.ts
 * @description Inbound synchronization service for ProxiCommerce OS.
 * Manages Supabase Realtime WebSocket subscriptions and incremental pull sync
 * for incoming online web orders (ONLINE_WEB) and remote stock reconciliations.
 */

import * as SQLite from "expo-sqlite";
import { RealtimeChannel } from "@supabase/supabase-js";
import { TransactionItem } from "@proxi-commerce/types";
import { supabase } from "../lib/supabase";
import { DB_NAME } from "../db/schema";
import { enqueueSyncOperation } from "../db/syncQueue";

export interface InboundSyncResult {
  newWebOrdersCount: number;
  updatedStockCount: number;
}

export type InboundCallback = (summary: InboundSyncResult) => void;

/**
 * Normalizes an ISO timestamp string to SQLite UTC format (YYYY-MM-DD HH:MM:SS)
 * to ensure consistency with getLocalDayUTCBounds() and daily Arqueo calculations.
 */
function toSQLiteTimestamp(isoOrTimestamp?: string | null): string {
  if (!isoOrTimestamp) {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }
  const date = new Date(isoOrTimestamp);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }
  return date.toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Pulls incremental inbound changes from Supabase to SQLite:
 * 1. Downloads new ONLINE_WEB orders and inserts them into transactions table without re-enqueueing.
 * 2. Reconciles inventory stock_count against remote without overwriting unpushed local changes.
 *
 * @param {string} storeId - Identifier of the active merchant store.
 * @returns {Promise<InboundSyncResult>} Summary of newly imported orders and updated products.
 */
export async function pullInboundChanges(
  storeId: string,
): Promise<InboundSyncResult> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const kvKey = `last_inbound_sync_${storeId}`;

  // 1. Read last sync cursor from app_kv_store
  const kvRow = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_kv_store WHERE key = ?;`,
    [kvKey],
  );

  let lastSyncCursor: string | null = kvRow?.value || null;
  // Apply a 60-second safety window to handle minor clock skew between client and Supabase
  let safeQueryCursor: string | null = null;
  if (lastSyncCursor) {
    const cursorDate = new Date(lastSyncCursor);
    if (!isNaN(cursorDate.getTime())) {
      safeQueryCursor = new Date(cursorDate.getTime() - 60_000).toISOString();
    }
  }

  const syncStartTime = new Date().toISOString();
  let newWebOrdersCount = 0;
  let updatedStockCount = 0;

  try {
    // ==========================================
    // STEP A: Fetch and ingest ONLINE_WEB orders
    // ==========================================
    let txQuery = supabase
      .from("transactions")
      .select(
        `id, store_id, type, total, timestamp, refund_for_id, fulfillment_type, delivery_address, pickup_code,
         payment_provider, payment_status, payment_intent_id, checkout_session_id, amount_total, currency,
         paid_at, refund_status, pickup_validated_at, fulfillment_status, cancelled_at,
         transaction_items(product_id, title, quantity, unit_price)`,
      )
      .eq("store_id", storeId)
      .eq("type", "ONLINE_WEB");

    if (safeQueryCursor) {
      txQuery = txQuery.gt("timestamp", safeQueryCursor);
    }

    const { data: remoteTransactions, error: txError } = await txQuery;
    if (txError) {
      console.warn("[inboundSyncService] Error fetching remote transactions:", txError.message);
    }

    // Keep track of newly imported web order items for offline conflict resolution
    const newlyImportedWebItemDeltas: Map<string, number> = new Map();

    if (remoteTransactions && remoteTransactions.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const remoteTx of remoteTransactions) {
          // Idempotency check: skip if transaction already exists in local SQLite
          const existing = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM transactions WHERE id = ?;`,
            [remoteTx.id],
          );
          if (existing) continue;

          // Format items snapshot
          const rawItems = remoteTx.transaction_items || [];
          const formattedItems: TransactionItem[] = Array.isArray(rawItems)
            ? rawItems.map((item: any) => ({
                product_id: item.product_id,
                title: item.title,
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
              }))
            : [];

          for (const item of formattedItems) {
            const current = newlyImportedWebItemDeltas.get(item.product_id) || 0;
            newlyImportedWebItemDeltas.set(item.product_id, current + item.quantity);
          }

          const sqliteTimestamp = toSQLiteTimestamp(remoteTx.timestamp);
          const serializedItems = JSON.stringify(formattedItems);

          // Insert into local transactions WITHOUT enqueueing to sync_queue
          await db.runAsync(
            `INSERT INTO transactions (
               id, store_id, type, total, timestamp, items, refund_for_id,
               fulfillment_type, delivery_address, pickup_code,
               payment_provider, payment_status, payment_intent_id, checkout_session_id,
               amount_total, currency, paid_at, refund_status, pickup_validated_at,
               fulfillment_status, cancelled_at
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              remoteTx.id,
              remoteTx.store_id,
              remoteTx.type,
              remoteTx.total,
              sqliteTimestamp,
              serializedItems,
              remoteTx.refund_for_id || null,
              remoteTx.fulfillment_type || null,
              remoteTx.delivery_address || null,
              remoteTx.pickup_code || null,
              remoteTx.payment_provider || "NONE",
              remoteTx.payment_status || "NOT_REQUIRED",
              remoteTx.payment_intent_id || null,
              remoteTx.checkout_session_id || null,
              remoteTx.amount_total ?? remoteTx.total,
              remoteTx.currency || "eur",
              remoteTx.paid_at ? toSQLiteTimestamp(remoteTx.paid_at) : null,
              remoteTx.refund_status || "NONE",
              remoteTx.pickup_validated_at ? toSQLiteTimestamp(remoteTx.pickup_validated_at) : null,
              remoteTx.fulfillment_status || null,
              remoteTx.cancelled_at ? toSQLiteTimestamp(remoteTx.cancelled_at) : null,
            ],
          );

          newWebOrdersCount++;
        }
      });
    }

    // ==========================================
    // STEP B: Reconcile inventory stock levels
    // ==========================================
    // Query local products that have pending unpushed changes in sync_queue
    const pendingEntityRows = await db.getAllAsync<{ entity_id: string }>(
      `SELECT DISTINCT entity_id FROM sync_queue WHERE entity_type = 'product' AND status IN ('PENDING', 'ERROR');`,
    );
    const pendingProductIds = new Set(pendingEntityRows.map((r) => r.entity_id));

    // Fetch products updated on Supabase
    let prodQuery = supabase
      .from("products")
      .select("id, stock_count, updated_at")
      .eq("store_id", storeId);

    if (safeQueryCursor) {
      prodQuery = prodQuery.gt("updated_at", safeQueryCursor);
    }

    const { data: remoteProducts, error: prodError } = await prodQuery;
    if (prodError) {
      console.warn("[inboundSyncService] Error fetching remote products:", prodError.message);
    }

    if (remoteProducts && remoteProducts.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const remoteProd of remoteProducts) {
          const hasPendingLocalOps = pendingProductIds.has(remoteProd.id);

          if (!hasPendingLocalOps) {
            // No local conflict: safely apply the latest remote stock count
            const sqliteUpdated = toSQLiteTimestamp(remoteProd.updated_at);
            const result = await db.runAsync(
              `UPDATE products SET stock_count = ?, updated_at = ? WHERE id = ? AND store_id = ?;`,
              [remoteProd.stock_count, sqliteUpdated, remoteProd.id, storeId],
            );
            if (result.changes > 0) {
              updatedStockCount++;
            }
          } else {
            // Local conflict: Merchant made local physical sales offline while web orders came in.
            // Subtract only the newly imported web orders for this product to prevent double deduction.
            const webOrderDeduction = newlyImportedWebItemDeltas.get(remoteProd.id) || 0;
            if (webOrderDeduction > 0) {
              await db.runAsync(
                `UPDATE products SET stock_count = stock_count - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND store_id = ?;`,
                [webOrderDeduction, remoteProd.id, storeId],
              );

              // Update the latest product state into sync_queue
              const localProd = await db.getFirstAsync<any>(
                `SELECT * FROM products WHERE id = ? AND store_id = ?;`,
                [remoteProd.id, storeId],
              );
              if (localProd) {
                await enqueueSyncOperation("product", remoteProd.id, "UPDATE", localProd);
              }
              updatedStockCount++;
            }
          }
        }
      });
    }

    // Persist new cursor into app_kv_store
    await db.runAsync(
      `INSERT INTO app_kv_store (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [kvKey, syncStartTime],
    );
  } catch (err) {
    console.error("[inboundSyncService] pullInboundChanges error:", err);
  }

  return { newWebOrdersCount, updatedStockCount };
}

/**
 * Opens a Supabase Realtime WebSocket subscription on store_inbound_${storeId}.
 * Listens for new ONLINE_WEB orders and product stock updates.
 *
 * @param {string} storeId - Store identifier.
 * @param {InboundCallback} onInboundUpdate - Callback triggered when new orders or stock updates are ingested.
 * @returns {() => void} Cleanup function to unsubscribe and teardown the Realtime channel.
 */
export function subscribeToStoreInboundEvents(
  storeId: string,
  onInboundUpdate: InboundCallback,
): () => void {
  if (!storeId) {
    return () => {};
  }

  const channelName = `store_inbound_${storeId}`;
  const channel: RealtimeChannel = supabase.channel(channelName);

  channel
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `store_id=eq.${storeId}`,
      },
      async (payload) => {
        const newRow = payload.new as any;
        if (newRow && newRow.type === "ONLINE_WEB") {
          console.log("[inboundSyncService] Realtime: Incoming ONLINE_WEB order detected:", newRow.id);
          const result = await pullInboundChanges(storeId);
          onInboundUpdate(result);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "products",
        filter: `store_id=eq.${storeId}`,
      },
      async (payload) => {
        const updatedRow = payload.new as any;
        if (!updatedRow?.id) return;

        try {
          const db = await SQLite.openDatabaseAsync(DB_NAME);
          // Check if local product has pending unpushed mutations
          const pending = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM sync_queue WHERE entity_type = 'product' AND entity_id = ? AND status IN ('PENDING', 'ERROR');`,
            [updatedRow.id],
          );

          if (!pending) {
            const sqliteUpdated = toSQLiteTimestamp(updatedRow.updated_at);
            await db.runAsync(
              `UPDATE products SET stock_count = ?, updated_at = ? WHERE id = ? AND store_id = ?;`,
              [updatedRow.stock_count, sqliteUpdated, updatedRow.id, storeId],
            );
            onInboundUpdate({ newWebOrdersCount: 0, updatedStockCount: 1 });
          }
        } catch (err) {
          console.warn("[inboundSyncService] Realtime product update handler error:", err);
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[inboundSyncService] Subscribed to Realtime channel: ${channelName}`);
      }
    });

  return () => {
    console.log(`[inboundSyncService] Unsubscribing from Realtime channel: ${channelName}`);
    supabase.removeChannel(channel);
  };
}
