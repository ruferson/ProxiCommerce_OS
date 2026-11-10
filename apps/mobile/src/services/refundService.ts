/**
 * @file refundService.ts
 * @description SQLite service for processing full transaction refunds.
 * Atomically inserts a negative-total refund record and restores product stock
 * within a single `withTransactionAsync` block to guarantee data integrity.
 */

import * as SQLite from "expo-sqlite";
import {
  Transaction,
  TransactionItem,
  TransactionType,
} from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";
import { enqueueSyncOperation } from "../db/syncQueue";

/**
 * Result of a successful refund operation.
 */
export interface RefundResult {
  /** The newly created refund transaction record ID */
  refundId: string;
  /** Refunded amount (positive number for display; stored as negative in SQLite) */
  refundedTotal: number;
  /** Number of product stock lines restored */
  stockLinesRestored: number;
}

/**
 * Fetches a single transaction by ID from SQLite and parses its items.
 * Returns null if the transaction does not exist.
 *
 * @param {string} transactionId - Target transaction primary key.
 * @returns {Promise<Transaction | null>} Parsed transaction or null.
 */
export async function getTransactionById(
  transactionId: string,
): Promise<Transaction | null> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  const row = await db.getFirstAsync<{
    id: string;
    store_id: string;
    type: string;
    total: number;
    timestamp: string;
    items: string;
    refund_for_id: string | null;
  }>(
    `SELECT id, store_id, type, total, timestamp, items, refund_for_id
     FROM transactions
     WHERE id = ?;`,
    [transactionId],
  );

  if (!row) return null;

  return {
    id: row.id,
    store_id: row.store_id,
    type: row.type as TransactionType,
    total: row.total,
    timestamp: row.timestamp,
    refund_for_id: row.refund_for_id,
    items: (() => {
      try {
        return JSON.parse(row.items) as TransactionItem[];
      } catch {
        return [];
      }
    })(),
  };
}

/**
 * Checks whether a transaction has already been refunded.
 *
 * @param {string} transactionId - Original transaction ID to check.
 * @returns {Promise<boolean>} True if a refund record for this transaction exists.
 */
export async function isAlreadyRefunded(
  transactionId: string,
): Promise<boolean> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM transactions WHERE refund_for_id = ?;`,
    [transactionId],
  );
  return (row?.count ?? 0) > 0;
}

/**
 * Processes a full refund for the given transaction.
 *
 * Steps performed inside a single atomic SQLite transaction:
 *  1. Validates the original transaction exists and has not already been refunded.
 *  2. Inserts a new refund record with `total = -originalTotal` and `refund_for_id` set.
 *  3. Restores `stock_count` for every item line in the original transaction.
 *
 * @param {string} originalTransactionId - ID of the sale transaction to reverse.
 * @returns {Promise<RefundResult>} Metadata about the completed refund.
 * @throws {Error} If the transaction is not found, already refunded, or has no parseable items.
 */
export async function processFullRefund(
  originalTransactionId: string,
): Promise<RefundResult> {
  // --- Pre-flight validation ---
  const original = await getTransactionById(originalTransactionId);
  if (!original) {
    throw new Error(`Transacción ${originalTransactionId} no encontrada.`);
  }
  if (original.total < 0) {
    throw new Error("Esta transacción ya es un registro de devolución.");
  }

  const alreadyRefunded = await isAlreadyRefunded(originalTransactionId);
  if (alreadyRefunded) {
    throw new Error("Esta venta ya tiene una devolución registrada.");
  }

  const items = Array.isArray(original.items)
    ? (original.items as TransactionItem[])
    : (() => {
        try {
          return JSON.parse(original.items as string) as TransactionItem[];
        } catch {
          return [] as TransactionItem[];
        }
      })();

  if (items.length === 0) {
    throw new Error("No se encontraron artículos en la transacción original.");
  }

  // --- Atomic write ---
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const refundId = `rfnd_${Date.now()}`;
  const refundTotal = -original.total; // negative value stored in SQLite

  // Build the refund items snapshot: same products, quantities negated for clarity
  const refundItems: TransactionItem[] = items.map((item) => ({
    ...item,
    quantity: -Math.abs(item.quantity),
  }));

  await db.withTransactionAsync(async () => {
    // 1. Insert refund transaction record
    await db.runAsync(
      `INSERT INTO transactions (id, store_id, type, total, items, refund_for_id)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        refundId,
        original.store_id,
        original.type,
        refundTotal,
        JSON.stringify(refundItems),
        originalTransactionId,
      ],
    );

    // 2. Restore stock for each sold item
    for (const rawItem of items) {
      const anyItem = rawItem as any;
      const productId = anyItem.product_id || anyItem.product?.id;
      const quantity = Math.abs(anyItem.quantity || 1);

      if (productId) {
        await db.runAsync(
          `UPDATE products
           SET stock_count = stock_count + ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?;`,
          [quantity, productId],
        );

        // Fetch updated product record to enqueue restored stock for cloud sync
        const updatedProd = await db.getFirstAsync<any>(
          `SELECT * FROM products WHERE id = ?;`,
          [productId],
        );
        if (updatedProd) {
          await enqueueSyncOperation(
            "product",
            productId,
            "UPDATE",
            updatedProd,
          );
        }
      }
    }
  });

  // 3. Queue refund transaction for cloud synchronization
  await enqueueSyncOperation("transaction", refundId, "INSERT", {
    id: refundId,
    store_id: original.store_id,
    type: original.type,
    total: refundTotal,
    timestamp: new Date().toISOString(),
    items: refundItems,
    refund_for_id: originalTransactionId,
  });

  return {
    refundId,
    refundedTotal: original.total,
    stockLinesRestored: items.length,
  };
}
