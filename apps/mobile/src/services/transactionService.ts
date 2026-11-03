import * as SQLite from "expo-sqlite";
import { CartItem, TransactionType } from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";

export interface CreateTransactionInput {
  storeId: string;
  type: TransactionType;
  total: number;
  items: CartItem[];
}

/**
 * Persists a completed sale transaction in SQLite and updates local product stock counts.
 *
 * @param {CreateTransactionInput} input - Sale details including items and payment type.
 * @returns {Promise<void>}
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const transactionId = `tx_${Date.now()}`;
  const serializedItems = JSON.stringify(input.items);

  await db.withTransactionAsync(async () => {
    // 1. Insert transaction record
    await db.runAsync(
      `INSERT INTO transactions (id, store_id, type, total, items) VALUES (?, ?, ?, ?, ?);`,
      [transactionId, input.storeId, input.type, input.total, serializedItems],
    );

    // 2. Decrement product stock in SQLite for each sold item
    for (const item of input.items) {
      await db.runAsync(
        `UPDATE products SET stock_count = stock_count - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [item.quantity, item.product.id],
      );
    }
  });
}
