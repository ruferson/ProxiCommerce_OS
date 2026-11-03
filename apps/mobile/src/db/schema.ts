import * as SQLite from "expo-sqlite";

/**
 * SQLite local database name for ProxiCommerce OS.
 */
export const DB_NAME = "proxi_commerce.db";

/**
 * Initializes local SQLite tables and sets configuration pragmas.
 * Creates 'store', 'products', and 'transactions' tables if they do not exist.
 *
 * @returns {Promise<SQLite.SQLiteDatabase>} Open SQLite database instance.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS store (
      id TEXT PRIMARY KEY NOT NULL,
      owner_auth_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      stripe_account_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      store_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('NFC', 'AI_SCAN', 'ONLINE_WEB')) NOT NULL,
      total REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      items TEXT NOT NULL
    );
  `);

  return db;
}
