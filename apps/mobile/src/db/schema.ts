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

    -- Products table: contains catalog items, stock counters, prices, photo URIs, and barcodes
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      stock_count INTEGER NOT NULL DEFAULT 0,
      image_uri TEXT NOT NULL,
      barcode TEXT UNIQUE,
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

    -- Closures table: registers daily Z/X cash register balancing, counts, and discrepancies
    CREATE TABLE IF NOT EXISTS closures (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      date TEXT NOT NULL,
      expected_cash REAL NOT NULL,
      counted_cash REAL NOT NULL,
      total_digital REAL NOT NULL,
      grand_total REAL NOT NULL,
      transaction_count INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Sync Queue table: stores pending mutations to be pushed to Supabase when online
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Key-Value storage table: offline persistence fallback for auth sessions and local settings
    CREATE TABLE IF NOT EXISTS app_kv_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    -- Indexes for high-throughput offline queries
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
  `);

  // Migrate existing products table if barcode column does not exist yet
  try {
    await db.execAsync(`ALTER TABLE products ADD COLUMN barcode TEXT UNIQUE;`);
  } catch {
    // Column already exists or already defined
  }

  return db;
}

/**
 * @description Table to track local mutations that need to be synced to the cloud.
 * Implements the core of the offline-first architecture.
 */
export const SYNC_QUEUE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;
