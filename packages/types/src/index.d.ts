/**
 * Supported payment methods and transaction channels for ProxiCommerce OS.
 */
export type TransactionType = "NFC" | "AI_SCAN" | "ONLINE_WEB" | "CASH";
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
    items: Array<{
        product_id: string;
        title: string;
        quantity: number;
        unit_price: number;
        remaining_stock: number;
    }>;
}
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
}
