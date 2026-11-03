export type TransactionType = "NFC" | "AI_SCAN" | "ONLINE_WEB";

export interface Store {
  id: string;
  owner_auth_id: string;
  slug: string;
  name: string;
  stripe_account_id?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  store_id: string;
  title: string;
  price: number;
  stock_count: number;
  image_uri: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionItem {
  product_id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface Transaction {
  id: string;
  store_id: string;
  type: TransactionType;
  total: number;
  timestamp: string;
  items: TransactionItem[];
}
