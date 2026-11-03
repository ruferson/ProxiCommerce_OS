/**
 * @file catalogService.ts
 * @description Local SQLite database service for managing the product catalog.
 * Provides CRUD queries to read products, create items, and update details or inventory levels.
 */

import * as SQLite from "expo-sqlite";
import { Product } from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";

/**
 * Fetches all products stored in the local SQLite database ordered by creation date descending.
 *
 * @returns {Promise<Product[]>} Array of all stored product entities.
 */
export async function getProducts(): Promise<Product[]> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Retrieve all products sorted so that newest additions appear first
  return await db.getAllAsync<Product>(
    "SELECT * FROM products ORDER BY created_at DESC;",
  );
}

/**
 * Persists a new product record into the local SQLite database.
 *
 * @param {Omit<Product, "created_at" | "updated_at">} product - Product input data without timestamps.
 * @returns {Promise<void>} Resolves when the product record is created.
 */
export async function createProduct(
  product: Omit<Product, "created_at" | "updated_at">,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Insert the product entity with initial stock and photo URI
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
 * Updates the stock quantity for a specific product and refreshes its modified timestamp.
 *
 * @param {string} productId - Unique product identifier.
 * @param {number} newStock - Non-negative updated stock count.
 * @returns {Promise<void>} Resolves when the stock count is updated.
 */
export async function updateProductStock(
  productId: string,
  newStock: number,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Directly set new stock and update modification timestamp
  await db.runAsync(
    `UPDATE products SET stock_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
    [newStock, productId],
  );
}

/**
 * Updates all editable fields of a product in local SQLite storage.
 *
 * @param {Omit<Product, "created_at" | "updated_at">} product - Product entity containing modified data.
 * @returns {Promise<void>} Resolves when the product details have been saved.
 */
export async function updateProductDetails(
  product: Omit<Product, "created_at" | "updated_at">,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Update title, price, stock count, and image path while updating the timestamp
  await db.runAsync(
    `UPDATE products SET title = ?, price = ?, stock_count = ?, image_uri = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
    [
      product.title,
      product.price,
      product.stock_count,
      product.image_uri,
      product.id,
    ],
  );
}

/**
 * Removes a product record from the local SQLite database by its identifier.
 *
 * @param {string} productId - Unique product identifier to remove.
 * @returns {Promise<void>} Resolves when the product record has been deleted.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Execute deletion of the target product
  await db.runAsync(`DELETE FROM products WHERE id = ?;`, [productId]);
}


