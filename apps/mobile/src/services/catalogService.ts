import * as SQLite from "expo-sqlite";
import { Product } from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";

/**
 * Fetches all products stored in local SQLite database ordered by creation date.
 *
 * @returns {Promise<Product[]>} Array of product entities.
 */
export async function getProducts(): Promise<Product[]> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  return await db.getAllAsync<Product>(
    "SELECT * FROM products ORDER BY created_at DESC;",
  );
}

/**
 * Persists a new product record in local SQLite storage.
 *
 * @param {Omit<Product, 'created_at' | 'updated_at'>} product - Product input data without timestamps.
 * @returns {Promise<void>}
 */
export async function createProduct(
  product: Omit<Product, "created_at" | "updated_at">,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync(
    `INSERT INTO products (id, store_id, title, price, stock_count, image_uri) 
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      product.id,
      product.store_id,
      product.title,
      product.price,
      product.stock_count,
      product.image_uri,
    ],
  );
}

/**
 * Updates stock quantity for a specific product and updates its modified timestamp.
 *
 * @param {string} productId - Unique product identifier.
 * @param {number} newStock - Non-negative updated stock number.
 * @returns {Promise<void>}
 */
export async function updateProductStock(
  productId: string,
  newStock: number,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync(
    `UPDATE products SET stock_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
    [newStock, productId],
  );
}
