-- ==============================================================================
-- ProxiCommerce OS - Supabase Cloud Schema (PostgreSQL)
-- Aligned with packages/types and offline-first SQLite sync engine.
-- Run this script in the Supabase Dashboard -> SQL Editor.
-- ==============================================================================

-- Drop existing old/mismatched tables to recreate aligned schema
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS closures CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- 1. STORES TABLE (Multitenant merchant profiles)
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  owner_auth_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed demo store so foreign keys match default POS local store ID
INSERT INTO stores (id, owner_auth_id, slug, name)
VALUES ('store_local_001', 'offline_local_owner', 'tienda-demo', 'Mi Comercio Local')
ON CONFLICT (id) DO NOTHING;

-- 2. PRODUCTS TABLE (Catalog items, prices, barcodes, and inventory counters)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stock_count INTEGER NOT NULL DEFAULT 0,
  image_uri TEXT NOT NULL DEFAULT '',
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- 3. TRANSACTIONS TABLE (POS Tickets & Refunds)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('NFC', 'AI_SCAN', 'ONLINE_WEB', 'CASH')) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  refund_for_id TEXT REFERENCES transactions(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);

-- 4. TRANSACTION ITEMS TABLE (Normalized line items per ticket)
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_items_transaction ON transaction_items(transaction_id);

-- 5. CLOSURES TABLE (Daily Z/X cash balancing reports)
CREATE TABLE IF NOT EXISTS closures (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  expected_cash NUMERIC(10, 2) NOT NULL,
  counted_cash NUMERIC(10, 2) NOT NULL,
  total_digital NUMERIC(10, 2) NOT NULL,
  grand_total NUMERIC(10, 2) NOT NULL,
  transaction_count INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closures_store_date ON closures(store_id, date DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products (needed for Phase 3 Next.js storefront)
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);

-- Allow authenticated / anon sync clients to upsert & read during active operation
-- In production, replace with owner_auth_id = auth.uid() checks
CREATE POLICY "Allow all stores access" ON stores
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all products access" ON products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all transactions access" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all transaction_items access" ON transaction_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all closures access" ON closures
  FOR ALL USING (true) WITH CHECK (true);

