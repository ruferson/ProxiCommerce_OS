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
 * and creates the tables required by the mobile app if they do not exist.
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
      stripe_onboarding_status TEXT,
      stripe_charges_enabled INTEGER NOT NULL DEFAULT 0,
      stripe_payouts_enabled INTEGER NOT NULL DEFAULT 0,
      stripe_details_submitted INTEGER NOT NULL DEFAULT 0,
      stripe_default_currency TEXT NOT NULL DEFAULT 'eur',
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

    -- Transactions table: records offline/online sales, payment types, total sums, item snapshots,
    -- and fulfillment details for web orders (fulfillment_type, delivery_address, pickup_code).
    -- refund_for_id links a refund record back to the original transaction (NULL for normal sales).
    -- Refund records carry a negative total and trigger stock restoration in the same atomic write.
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('NFC', 'AI_SCAN', 'ONLINE_WEB', 'CASH')) NOT NULL,
      total REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      items TEXT NOT NULL,
      refund_for_id TEXT REFERENCES transactions(id),
      fulfillment_type TEXT,
      delivery_address TEXT,
      pickup_code TEXT,
      payment_provider TEXT NOT NULL DEFAULT 'NONE',
      payment_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
      payment_intent_id TEXT,
      checkout_session_id TEXT,
      stripe_customer_id TEXT,
      amount_total REAL,
      currency TEXT NOT NULL DEFAULT 'eur',
      paid_at TEXT,
      refund_status TEXT NOT NULL DEFAULT 'NONE',
      pickup_token_hash TEXT,
      pickup_token_expires_at TEXT,
      pickup_validated_at TEXT,
      pickup_validated_by TEXT,
      fulfillment_status TEXT,
      cancelled_at TEXT
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
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
  `);

  const productColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(products);",
  );
  if (!productColumns.some((column) => column.name === "barcode")) {
    await db.execAsync("ALTER TABLE products ADD COLUMN barcode TEXT;");
  }

  const storeColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(store);",
  );
  const missingStoreColumns: Record<string, string> = {
    stripe_account_id: "TEXT",
    stripe_onboarding_status: "TEXT",
    stripe_charges_enabled: "INTEGER NOT NULL DEFAULT 0",
    stripe_payouts_enabled: "INTEGER NOT NULL DEFAULT 0",
    stripe_details_submitted: "INTEGER NOT NULL DEFAULT 0",
    stripe_default_currency: "TEXT NOT NULL DEFAULT 'eur'",
  };
  for (const [columnName, definition] of Object.entries(missingStoreColumns)) {
    if (!storeColumns.some((column) => column.name === columnName)) {
      await db.execAsync(
        `ALTER TABLE store ADD COLUMN ${columnName} ${definition};`,
      );
    }
  }

  const transactionColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(transactions);",
  );
  if (!transactionColumns.some((column) => column.name === "refund_for_id")) {
    await db.execAsync(
      "ALTER TABLE transactions ADD COLUMN refund_for_id TEXT REFERENCES transactions(id);",
    );
  }
  if (!transactionColumns.some((column) => column.name === "fulfillment_type")) {
    try {
      await db.execAsync("ALTER TABLE transactions ADD COLUMN fulfillment_type TEXT;");
    } catch {
      // Ignored if column already exists
    }
  }
  if (!transactionColumns.some((column) => column.name === "delivery_address")) {
    try {
      await db.execAsync("ALTER TABLE transactions ADD COLUMN delivery_address TEXT;");
    } catch {
      // Ignored if column already exists
    }
  }
  if (!transactionColumns.some((column) => column.name === "pickup_code")) {
    try {
      await db.execAsync("ALTER TABLE transactions ADD COLUMN pickup_code TEXT;");
    } catch {
      // Ignored if column already exists
    }
  }
  const missingTransactionColumns: Record<string, string> = {
    payment_provider: "TEXT NOT NULL DEFAULT 'NONE'",
    payment_status: "TEXT NOT NULL DEFAULT 'NOT_REQUIRED'",
    payment_intent_id: "TEXT",
    checkout_session_id: "TEXT",
    stripe_customer_id: "TEXT",
    amount_total: "REAL",
    currency: "TEXT NOT NULL DEFAULT 'eur'",
    paid_at: "TEXT",
    refund_status: "TEXT NOT NULL DEFAULT 'NONE'",
    pickup_token_hash: "TEXT",
    pickup_token_expires_at: "TEXT",
    pickup_validated_at: "TEXT",
    pickup_validated_by: "TEXT",
    fulfillment_status: "TEXT",
    cancelled_at: "TEXT",
  };
  for (const [columnName, definition] of Object.entries(
    missingTransactionColumns,
  )) {
    if (!transactionColumns.some((column) => column.name === columnName)) {
      await db.execAsync(
        `ALTER TABLE transactions ADD COLUMN ${columnName} ${definition};`,
      );
    }
  }

  return db;
}
