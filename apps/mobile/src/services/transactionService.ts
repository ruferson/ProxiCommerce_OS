/**
 * @file transactionService.ts
 * @description Local SQLite database service for processing sales transactions.
 * Handles atomic creation of transaction records and updates inventory stock levels within a single SQLite transaction.
 */

import * as SQLite from "expo-sqlite";
import { CartItem, TransactionType } from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";
import { enqueueSyncOperation } from "../db/syncQueue";

/**
 * Parameters required to record a completed sale transaction.
 */
export interface CreateTransactionInput {
  /** Identifier of the store where the transaction occurred */
  storeId: string;
  /** Payment method used (e.g., 'CASH', 'NFC', 'ONLINE_WEB', 'AI_SCAN') */
  type: TransactionType;
  /** Total monetary value of the sale in Euros */
  total: number;
  /** Snapshot list of cart line items sold */
  items: CartItem[];
}

/**
 * Persists a completed sale transaction in SQLite and atomically decrements local product stock counts.
 * Uses an SQLite transaction (`withTransactionAsync`) to ensure both the transaction log and inventory changes
 * succeed or rollback together.
 *
 * @param {CreateTransactionInput} input - Sale details including store ID, payment type, total sum, and sold items.
 * @returns {Promise<void>} Resolves when the transaction and stock updates are successfully committed.
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Generate a client-side unique transaction identifier with timestamp prefix
  const transactionId = `tx_${Date.now()}`;
  // Standardize the snapshot to TransactionItem[] format
  const transactionItems = input.items.map((item) => ({
    product_id: item.product.id,
    title: item.product.title,
    quantity: item.quantity,
    unit_price: item.product.price,
  }));
  const serializedItems = JSON.stringify(transactionItems);

  // Wrap both insertions and inventory adjustments inside an atomic SQLite transaction
  await db.withTransactionAsync(async () => {
    // 1. Insert transaction record into the transactions table
    await db.runAsync(
      `INSERT INTO transactions (id, store_id, type, total, items) VALUES (?, ?, ?, ?, ?);`,
      [transactionId, input.storeId, input.type, input.total, serializedItems],
    );

    // 2. Decrement available product stock in SQLite for each sold item
    for (const item of input.items) {
      await db.runAsync(
        `UPDATE products SET stock_count = stock_count - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [item.quantity, item.product.id],
      );
    }
  });

  // 3. Enqueue mutation for cloud synchronization
  await enqueueSyncOperation("transaction", transactionId, "INSERT", {
    id: transactionId,
    store_id: input.storeId,
    type: input.type,
    total: input.total,
    timestamp: new Date().toISOString(),
    items: transactionItems,
    refund_for_id: null,
  });
}

