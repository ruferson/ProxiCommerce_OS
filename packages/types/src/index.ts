/**
 * Supported payment methods and transaction channels for ProxiCommerce OS.
 */
export type TransactionType = "NFC" | "AI_SCAN" | "ONLINE_WEB" | "CASH";

/**
 * Provider used to process a transaction payment.
 */
export type PaymentProvider = "NONE" | "STRIPE";

/**
 * Server-confirmed payment state for a transaction.
 */
export type PaymentStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

/**
 * Physical or online fulfillment state for an order.
 */
export type FulfillmentStatus =
  | "PENDING"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Stripe refund state for a transaction.
 */
export type RefundStatus = "NONE" | "PENDING" | "PARTIAL" | "FULL" | "FAILED";

/**
 * Stripe Connect onboarding state derived from the connected account.
 */
export interface StripeConnectStatus {
  account_id?: string;
  onboarding_status?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency: string;
}

/**
 * Supported fulfillment modalities for online storefront orders.
 */
export type FulfillmentType = "PICKUP" | "DELIVERY";

/**
 * Store merchant profile entity model.
 */
export interface Store {
  id: string;
  owner_auth_id: string;
  slug: string;
  name: string;
  stripe_account_id?: string;
  stripe_onboarding_status?: string;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_details_submitted?: boolean;
  stripe_default_currency?: string;
  created_at?: string;
}

/**
 * Public fields exposed to the storefront directory.
 * Deliberately excludes owner and payment-provider metadata.
 */
export interface PublicStore {
  id: string;
  slug: string;
  name: string;
  created_at?: string;
}

/**
 * Product and quantity submitted to the server-side web-order RPC.
 * Prices are intentionally omitted; the server always reads current prices.
 */
export interface CreateWebOrderItemInput {
  product_id: string;
  quantity: number;
}

// Alias for backwards compatibility
export type CreateWebOrderItem = CreateWebOrderItemInput;

/**
 * Parameters accepted by Supabase RPC `create_web_order`.
 */
export interface CreateWebOrderParams {
  p_store_id: string;
  p_items: CreateWebOrderItemInput[];
  p_fulfillment_type: FulfillmentType;
  p_delivery_address?: string | null;
  p_customer_note?: string | null;
}

/**
 * Successful response returned by Supabase RPC `create_web_order`.
 */
export interface CreateWebOrderResult {
  transaction_id: string;
  store_id: string;
  total: number;
  timestamp: string;
  fulfillment_type: FulfillmentType;
  pickup_code?: string | null;
  delivery_address?: string | null;
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  checkout_session_id?: string | null;
  payment_intent_id?: string | null;
  items: Array<{
    product_id: string;
    title: string;
    quantity: number;
    unit_price: number;
    remaining_stock: number;
  }>;
}

// Alias for backwards compatibility
export type CreateWebOrderResponse = CreateWebOrderResult;

/**
 * Catalog product entity model.
 */
export interface Product {
  id: string;
  store_id: string;
  title: string;
  price: number;
  stock_count: number;
  image_uri: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Active shopping cart line item used in the POS UI state.
 */
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

/**
 * Line item snapshot saved inside a completed transaction record.
 */
export interface TransactionItem {
  product_id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

/**
 * Transaction record structure.
 * Note: When stored in SQLite, `items` is serialized as a JSON string of `TransactionItem[]`.
 * When `refund_for_id` is set, this record represents a full or partial refund of the
 * referenced transaction. The `total` will be a negative value and stock is restored.
 */
export interface Transaction {
  id: string;
  store_id: string;
  type: TransactionType;
  total: number;
  timestamp?: string;
  items: TransactionItem[] | string;
  /** ID of the original transaction this record refunds. Null/undefined for normal sales. */
  refund_for_id?: string | null;
  /** Online fulfillment modality ('PICKUP' | 'DELIVERY', null for in-person POS sales) */
  fulfillment_type?: FulfillmentType | null;
  /** Delivery destination or delivery notes if fulfillment_type === 'DELIVERY' */
  delivery_address?: string | null;
  /** Verification code for in-store pickup if fulfillment_type === 'PICKUP' */
  pickup_code?: string | null;
  /** Provider used to process the payment, or NONE for local POS payments. */
  payment_provider?: PaymentProvider;
  /** Server-confirmed payment state. */
  payment_status?: PaymentStatus;
  /** Stripe PaymentIntent identifier. */
  payment_intent_id?: string | null;
  /** Stripe Checkout Session identifier. */
  checkout_session_id?: string | null;
  /** Optional Stripe customer identifier. */
  stripe_customer_id?: string | null;
  /** Provider amount in the configured transaction currency. */
  amount_total?: number | null;
  /** ISO 4217 currency code. */
  currency?: string;
  /** ISO timestamp for provider-confirmed payment. */
  paid_at?: string | null;
  /** Current provider refund state. */
  refund_status?: RefundStatus;
  /** Server-only hash of a signed pickup token. */
  pickup_token_hash?: string | null;
  /** Expiration timestamp for pickup validation. */
  pickup_token_expires_at?: string | null;
  /** Timestamp of successful pickup validation. */
  pickup_validated_at?: string | null;
  /** Authenticated user identifier that validated the pickup. */
  pickup_validated_by?: string | null;
  /** Independent fulfillment lifecycle state. */
  fulfillment_status?: FulfillmentStatus | null;
  /** ISO timestamp for a cancelled order. */
  cancelled_at?: string | null;
}
