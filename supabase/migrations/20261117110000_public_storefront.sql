-- Public storefront access, atomic web-order submission and realtime publication.
-- This migration assumes the base tables from ../schema.sql exist.
-- It is additive and safe to run on an existing database.

-- 1. Ensure columns for products and transactions
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS customer_note TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_code TEXT;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_store_type_timestamp
  ON public.transactions (store_id, type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_products_store_updated_at
  ON public.products (store_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_stores_slug
  ON public.stores (slug);

-- 3. Trigger for updated_at on products
CREATE OR REPLACE FUNCTION public.set_products_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_products_updated_at();

REVOKE ALL ON FUNCTION public.set_products_updated_at() FROM PUBLIC;

-- 4. View exposing storefront-safe store fields
CREATE OR REPLACE VIEW public.public_stores
WITH (security_barrier = true)
AS
SELECT id, slug, name, created_at
FROM public.stores;

REVOKE ALL ON public.public_stores FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_stores TO anon, authenticated;

-- 5. Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

-- 6. Row Level Security policies
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closures ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'stores',
        'products',
        'transactions',
        'transaction_items',
        'closures'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END;
$$;

REVOKE ALL ON TABLE
  public.stores,
  public.products,
  public.transactions,
  public.transaction_items,
  public.closures
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.closures TO authenticated;

-- Public can read stores and products
GRANT SELECT ON TABLE public.stores TO anon;
GRANT SELECT ON TABLE public.products TO anon;

CREATE POLICY "Public read stores"
  ON public.stores
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Store owners manage their stores"
  ON public.stores
  FOR ALL
  TO authenticated
  USING (owner_auth_id = (SELECT auth.uid()::TEXT))
  WITH CHECK (owner_auth_id = (SELECT auth.uid()::TEXT));

CREATE POLICY "Public read products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Store owners manage their products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = products.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = products.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  );

CREATE POLICY "Store owners manage their transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = transactions.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = transactions.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  );

CREATE POLICY "Store owners manage their transaction items"
  ON public.transaction_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions AS transaction_record
      JOIN public.stores AS store
        ON store.id = transaction_record.store_id
      WHERE transaction_record.id = transaction_items.transaction_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.transactions AS transaction_record
      JOIN public.stores AS store
        ON store.id = transaction_record.store_id
      WHERE transaction_record.id = transaction_items.transaction_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  );

CREATE POLICY "Store owners manage their closures"
  ON public.closures
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = closures.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = closures.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  );

-- 7. Supabase Realtime setup
DO $$
BEGIN
  -- Add tables to publication if publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions, public.products;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
END;
$$;

ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 8. Atomic Web Order RPC
DROP FUNCTION IF EXISTS public.create_web_order(TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_web_order(TEXT, JSONB, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_web_order(
  p_store_id TEXT,
  p_items JSONB,
  p_fulfillment_type TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_item JSONB;
  v_product RECORD;
  v_requested_ids TEXT[];
  v_requested_product_count INTEGER;
  v_locked_product_count INTEGER := 0;
  v_quantity NUMERIC;
  v_total NUMERIC := 0;
  v_items_json JSONB := '[]'::JSONB;
  v_now TIMESTAMPTZ := pg_catalog.now();
  v_transaction_id TEXT;
  v_pickup_code TEXT := NULL;
  v_clean_address TEXT := NULL;
  v_clean_note TEXT := NULL;
  v_remaining_stock INTEGER;
BEGIN
  -- 1. Validate Store
  IF p_store_id IS NULL OR pg_catalog.btrim(p_store_id) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_STORE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stores AS store
    WHERE store.id = p_store_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_STORE';
  END IF;

  -- 2. Validate Fulfillment
  IF p_fulfillment_type NOT IN ('PICKUP', 'DELIVERY') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_FULFILLMENT_TYPE';
  END IF;

  v_clean_address := NULLIF(pg_catalog.btrim(COALESCE(p_delivery_address, '')), '');
  IF p_fulfillment_type = 'DELIVERY' AND v_clean_address IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'DELIVERY_ADDRESS_REQUIRED';
  END IF;

  v_clean_note := NULLIF(pg_catalog.btrim(COALESCE(p_customer_note, '')), '');
  IF v_clean_note IS NOT NULL AND pg_catalog.length(v_clean_note) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CUSTOMER_NOTE_TOO_LONG';
  END IF;

  -- 3. Validate Items array
  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEMS';
  END IF;

  IF pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEMS';
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_items)
  LOOP
    IF pg_catalog.jsonb_typeof(v_item) IS DISTINCT FROM 'object'
      OR pg_catalog.jsonb_typeof(v_item -> 'product_id') IS DISTINCT FROM 'string'
      OR pg_catalog.btrim(v_item ->> 'product_id') = ''
      OR pg_catalog.jsonb_typeof(v_item -> 'quantity') IS DISTINCT FROM 'number'
      OR (v_item ->> 'quantity') !~ '^[1-9][0-9]*$'
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEMS';
    END IF;

    v_quantity := (v_item ->> 'quantity')::NUMERIC;
    IF v_quantity > 2147483647 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITEMS';
    END IF;
  END LOOP;

  SELECT pg_catalog.array_agg(DISTINCT item ->> 'product_id')
  INTO v_requested_ids
  FROM pg_catalog.jsonb_array_elements(p_items) AS requested(item);

  SELECT pg_catalog.cardinality(v_requested_ids)
  INTO v_requested_product_count;

  -- 4. Generate transaction ID and pickup code
  v_transaction_id :=
    'tx_web_'
    || (EXTRACT(EPOCH FROM v_now)::BIGINT)::TEXT
    || '_'
    || pg_catalog.substr(
      pg_catalog.md5(pg_catalog.random()::TEXT || pg_catalog.clock_timestamp()::TEXT),
      1,
      6
    );

  IF p_fulfillment_type = 'PICKUP' THEN
    v_pickup_code := pg_catalog.upper(
      pg_catalog.substr(
        pg_catalog.md5(pg_catalog.random()::TEXT || pg_catalog.clock_timestamp()::TEXT),
        1,
        8
      )
    );
  END IF;

  -- 5. Lock and decrement products with FOR UPDATE
  FOR v_product IN
    SELECT product.id, product.title, product.price, product.stock_count
    FROM public.products AS product
    WHERE product.store_id = p_store_id
      AND product.id = ANY(v_requested_ids)
    ORDER BY product.id
    FOR UPDATE
  LOOP
    v_locked_product_count := v_locked_product_count + 1;

    SELECT pg_catalog.sum((requested.item ->> 'quantity')::NUMERIC)
    INTO v_quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS requested(item)
    WHERE requested.item ->> 'product_id' = v_product.id;

    IF v_product.stock_count < v_quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'INSUFFICIENT_STOCK:' || v_product.id;
    END IF;

    v_remaining_stock := (v_product.stock_count - v_quantity::INTEGER);
    v_total := v_total + v_product.price * v_quantity;

    v_items_json := v_items_json || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'product_id', v_product.id,
        'title', v_product.title,
        'quantity', v_quantity::INTEGER,
        'unit_price', v_product.price,
        'remaining_stock', v_remaining_stock
      )
    );

    UPDATE public.products
    SET stock_count = v_remaining_stock,
        updated_at = v_now
    WHERE id = v_product.id
      AND store_id = p_store_id;
  END LOOP;

  IF v_locked_product_count <> v_requested_product_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PRODUCT';
  END IF;

  -- 6. Insert transaction
  INSERT INTO public.transactions (
    id,
    store_id,
    type,
    total,
    refund_for_id,
    timestamp,
    customer_note,
    fulfillment_type,
    delivery_address,
    pickup_code
  )
  VALUES (
    v_transaction_id,
    p_store_id,
    'ONLINE_WEB',
    v_total,
    NULL,
    v_now,
    v_clean_note,
    p_fulfillment_type,
    v_clean_address,
    v_pickup_code
  );

  -- 7. Insert transaction line items
  INSERT INTO public.transaction_items (
    id,
    transaction_id,
    product_id,
    title,
    quantity,
    unit_price
  )
  SELECT
    v_transaction_id || '_it_' || (item.ordinality - 1)::TEXT || '_' || (item.value ->> 'product_id'),
    v_transaction_id,
    item.value ->> 'product_id',
    item.value ->> 'title',
    (item.value ->> 'quantity')::INTEGER,
    (item.value ->> 'unit_price')::NUMERIC
  FROM pg_catalog.jsonb_array_elements(v_items_json) WITH ORDINALITY AS item(value, ordinality);

  -- 8. Return comprehensive order result
  RETURN pg_catalog.jsonb_build_object(
    'transaction_id', v_transaction_id,
    'store_id', p_store_id,
    'total', v_total,
    'timestamp', v_now,
    'fulfillment_type', p_fulfillment_type,
    'pickup_code', v_pickup_code,
    'delivery_address', v_clean_address,
    'items', v_items_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_web_order(TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_order(TEXT, JSONB, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Tell PostgREST to refresh its schema cache after creating or replacing the RPC.
NOTIFY pgrst, 'reload schema';
