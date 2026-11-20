-- Phase 4 foundation for Stripe payments and order fulfillment.
-- This migration assumes 20261117110000_public_storefront.sql has been applied.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store-level Stripe Connect status.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_default_currency TEXT NOT NULL DEFAULT 'eur';

-- Separate payment, fulfillment, and refund state from the transaction channel.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS amount_total NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'eur',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS pickup_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS pickup_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_validated_by TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_payment_provider_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_payment_provider_check
      CHECK (payment_provider IN ('NONE', 'STRIPE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_payment_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_payment_status_check
      CHECK (
        payment_status IN (
          'NOT_REQUIRED',
          'PENDING',
          'PAID',
          'FAILED',
          'CANCELLED',
          'PARTIALLY_REFUNDED',
          'REFUNDED'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_refund_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_refund_status_check
      CHECK (refund_status IN ('NONE', 'PENDING', 'PARTIAL', 'FULL', 'FAILED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_fulfillment_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_fulfillment_status_check
      CHECK (
        fulfillment_status IS NULL OR fulfillment_status IN (
          'PENDING',
          'PREPARING',
          'READY_FOR_PICKUP',
          'OUT_FOR_DELIVERY',
          'COMPLETED',
          'CANCELLED'
        )
      );
  END IF;
END;
$$;

-- Existing POS transactions do not require provider payment state.
UPDATE public.transactions
SET payment_status = 'NOT_REQUIRED'
WHERE type IN ('CASH', 'NFC', 'AI_SCAN')
  AND payment_status = 'PENDING';

-- Existing web orders must become explicit pending-payment or in-progress fulfillment records.
UPDATE public.transactions
SET
  payment_status =
    CASE
      WHEN payment_status IN ('NOT_REQUIRED', 'PENDING') THEN 'PENDING'
      ELSE payment_status
    END,
  payment_provider =
    CASE
      WHEN type = 'ONLINE_WEB' THEN 'STRIPE'
      ELSE 'NONE'
    END,
  fulfillment_status =
    CASE
      WHEN type = 'ONLINE_WEB' AND fulfillment_status IS NULL THEN 'PENDING'
      ELSE fulfillment_status
    END
WHERE type = 'ONLINE_WEB';

-- Enforce payment and fulfillment defaults for every newly created web order.
CREATE OR REPLACE FUNCTION public.set_online_order_phase4_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.type = 'ONLINE_WEB' THEN
      NEW.payment_provider := 'STRIPE';
      NEW.currency := COALESCE(NULLIF(NEW.currency, ''), 'eur');
      NEW.amount_total := COALESCE(NEW.amount_total, NEW.total);

      IF NEW.payment_status IS NULL OR NEW.payment_status = 'NOT_REQUIRED' THEN
        NEW.payment_status := 'PENDING';
      END IF;

      IF NEW.fulfillment_status IS NULL THEN
        NEW.fulfillment_status := 'PENDING';
      END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_online_order_phase4_defaults ON public.transactions;
CREATE TRIGGER set_online_order_phase4_defaults
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_online_order_phase4_defaults();

REVOKE ALL ON FUNCTION public.set_online_order_phase4_defaults() FROM PUBLIC;

CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent
  ON public.transactions (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_checkout_session
  ON public.transactions (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_store_payment_status
  ON public.transactions (store_id, payment_status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_store_fulfillment_status
  ON public.transactions (store_id, fulfillment_status, timestamp DESC);

-- Provider events provide idempotency for webhooks and provider callbacks.
CREATE TABLE IF NOT EXISTS public.provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  payload_hash TEXT,
  error TEXT,
  UNIQUE (provider, event_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_events_status_check'
  ) THEN
    ALTER TABLE public.provider_events
      ADD CONSTRAINT provider_events_status_check
      CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_provider_events_received
  ON public.provider_events (received_at DESC);

-- Payment attempts track server-side provider operations.
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'STRIPE',
  operation TEXT NOT NULL,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  amount NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'eur',
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_transaction
  ON public.payment_attempts (transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_store
  ON public.payment_attempts (store_id, created_at DESC);

-- Pickup validations create an audit trail for successful and rejected scans.
CREATE TABLE IF NOT EXISTS public.pickup_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  validated_by TEXT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT NOT NULL,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_pickup_validations_transaction
  ON public.pickup_validations (transaction_id, validated_at DESC);

ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_validations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.provider_events,
  public.payment_attempts,
  public.pickup_validations
FROM PUBLIC, anon, authenticated;

-- Provider events are exclusively written and read by service-role functions.
-- Payment attempts and pickup audits are visible only to the store owner.
GRANT SELECT ON TABLE public.payment_attempts TO authenticated;
GRANT SELECT ON TABLE public.pickup_validations TO authenticated;

DROP POLICY IF EXISTS "Store owners read payment attempts"
  ON public.payment_attempts;
CREATE POLICY "Store owners read payment attempts"
  ON public.payment_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = payment_attempts.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  );

DROP POLICY IF EXISTS "Store owners read pickup validations"
  ON public.pickup_validations;
CREATE POLICY "Store owners read pickup validations"
  ON public.pickup_validations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores AS store
      WHERE store.id = pickup_validations.store_id
        AND store.owner_auth_id = (SELECT auth.uid()::TEXT)
    )
  );

-- Updates fulfillment state and validates ownership and valid state transitions.
CREATE OR REPLACE FUNCTION public.update_order_fulfillment(
  p_store_id TEXT,
  p_transaction_id TEXT,
  p_fulfillment_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'UNAUTHENTICATED';
  END IF;

  IF p_fulfillment_status NOT IN (
    'PENDING',
    'PREPARING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_FULFILLMENT_STATUS';
  END IF;

  SELECT transaction_record.*
  INTO v_transaction
  FROM public.transactions AS transaction_record
  JOIN public.stores AS store
    ON store.id = transaction_record.store_id
  WHERE transaction_record.id = p_transaction_id
    AND transaction_record.store_id = p_store_id
    AND store.owner_auth_id = auth.uid()::TEXT
  FOR UPDATE;

  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'ORDER_NOT_FOUND';
  END IF;

  IF v_transaction.type <> 'ONLINE_WEB' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'NOT_AN_ONLINE_ORDER';
  END IF;

  UPDATE public.transactions
  SET
    fulfillment_status = p_fulfillment_status,
    cancelled_at =
      CASE WHEN p_fulfillment_status = 'CANCELLED' THEN NOW() ELSE cancelled_at END
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'fulfillment_status', p_fulfillment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_fulfillment(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_fulfillment(TEXT, TEXT, TEXT)
  TO authenticated;

-- Atomically validates one-time in-store pickup by short code.
CREATE OR REPLACE FUNCTION public.validate_pickup_order(
  p_store_id TEXT,
  p_pickup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_clean_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'UNAUTHENTICATED';
  END IF;

  v_clean_code := upper(btrim(COALESCE(p_pickup_code, '')));
  IF v_clean_code = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PICKUP_CODE';
  END IF;

  SELECT transaction_record.*
  INTO v_transaction
  FROM public.transactions AS transaction_record
  JOIN public.stores AS store
    ON store.id = transaction_record.store_id
  WHERE transaction_record.store_id = p_store_id
    AND transaction_record.pickup_code = v_clean_code
    AND transaction_record.type = 'ONLINE_WEB'
    AND store.owner_auth_id = auth.uid()::TEXT
  FOR UPDATE;

  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'ORDER_NOT_FOUND';
  END IF;

  IF v_transaction.pickup_validated_at IS NOT NULL
    OR v_transaction.fulfillment_status = 'COMPLETED'
  THEN
    INSERT INTO public.pickup_validations (
      transaction_id,
      store_id,
      validated_by,
      result,
      reason
    )
    VALUES (
      v_transaction.id,
      p_store_id,
      auth.uid()::TEXT,
      'REJECTED',
      'ALREADY_VALIDATED'
    );

    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ALREADY_VALIDATED';
  END IF;

  IF v_transaction.payment_status NOT IN ('PAID', 'NOT_REQUIRED') THEN
    INSERT INTO public.pickup_validations (
      transaction_id,
      store_id,
      validated_by,
      result,
      reason
    )
    VALUES (
      v_transaction.id,
      p_store_id,
      auth.uid()::TEXT,
      'REJECTED',
      'PAYMENT_NOT_CONFIRMED'
    );

    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_NOT_CONFIRMED';
  END IF;

  IF v_transaction.pickup_token_expires_at IS NOT NULL
    AND v_transaction.pickup_token_expires_at < NOW()
  THEN
    INSERT INTO public.pickup_validations (
      transaction_id,
      store_id,
      validated_by,
      result,
      reason
    )
    VALUES (
      v_transaction.id,
      p_store_id,
      auth.uid()::TEXT,
      'REJECTED',
      'PICKUP_TOKEN_EXPIRED'
    );

    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PICKUP_TOKEN_EXPIRED';
  END IF;

  UPDATE public.transactions
  SET
    fulfillment_status = 'COMPLETED',
    pickup_validated_at = NOW(),
    pickup_validated_by = auth.uid()::TEXT
  WHERE id = v_transaction.id;

  INSERT INTO public.pickup_validations (
    transaction_id,
    store_id,
    validated_by,
    result
  )
  VALUES (
    v_transaction.id,
    p_store_id,
    auth.uid()::TEXT,
    'VALIDATED'
  );

  RETURN jsonb_build_object(
    'transaction_id', v_transaction.id,
    'fulfillment_status', 'COMPLETED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_pickup_order(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_pickup_order(TEXT, TEXT)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
