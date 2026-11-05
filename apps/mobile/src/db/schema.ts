/**
 * @file schema.ts
 * @description Local SQLite database initialization and schema definitions for ProxiCommerce OS.
 * Manages the offline-first SQLite database tables: stores, products, and transactions.
 */

import * as SQLite from "expo-sqlite";

/**
 * SQLite database file name for local storage.
 */
export const DB_NAME = "proxi_commerce.db";

/**
 * Initializes the local SQLite database, sets performance and integrity pragmas,
 * and creates all required tables (`store`, `products`, and `transactions`) if they do not exist.
 *
 * @returns {Promise<SQLite.SQLiteDatabase>} Open SQLite database instance.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Open or create the local SQLite database file
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Drop transactions table to ensure fresh schema during development iterations
  await db.execAsync(`DROP TABLE IF EXISTS transactions;`);

  // Configure pragmas and declare core entity tables
  await db.execAsync(`
    -- Enable Write-Ahead Logging (WAL) for better concurrent read/write throughput
    PRAGMA journal_mode = WAL;
    -- Enforce relational integrity constraints
    PRAGMA foreign_keys = ON;

    -- Store entity table: holds local merchant identity and online profile settings
    CREATE TABLE IF NOT EXISTS store (
      id TEXT PRIMARY KEY NOT NULL,
      owner_auth_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      stripe_account_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table: contains catalog items, stock counters, prices, and photo URIs
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      stock_count INTEGER NOT NULL DEFAULT 0,
      image_uri TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Transactions table: records offline/online sales, payment types, total sums, and item snapshots.
    -- refund_for_id links a refund record back to the original transaction (NULL for normal sales).
    -- Refund records carry a negative total and trigger stock restoration in the same atomic write.
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('NFC', 'AI_SCAN', 'ONLINE_WEB', 'CASH')) NOT NULL,
      total REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      items TEXT NOT NULL,
      refund_for_id TEXT REFERENCES transactions(id)
    );
  `);

  return db;
}

