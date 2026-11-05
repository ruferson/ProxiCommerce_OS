/**
 * Supported payment methods and transaction channels for ProxiCommerce OS.
 */
export type TransactionType = "NFC" | "AI_SCAN" | "ONLINE_WEB" | "CASH";

/**
 * Store merchant profile entity model.
 */
export interface Store {
  id: string;
  owner_auth_id: string;
  slug: string;
  name: string;
  stripe_account_id?: string;
  created_at?: string;
}

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
}
