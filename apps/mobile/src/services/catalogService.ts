/**
 * @file catalogService.ts
 * @description Local SQLite database service for managing the product catalog.
 * Provides CRUD queries to read products, create items, and update details or inventory levels.
 */

import * as SQLite from "expo-sqlite";
import { Product } from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";
import { enqueueSyncOperation } from "../db/syncQueue";

/**
 * Fetches all products stored in the local SQLite database ordered by creation date descending.
 *
 * @returns {Promise<Product[]>} Array of all stored product entities.
 */
export async function getProducts(storeId: string): Promise<Product[]> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  return await db.getAllAsync<Product>(
    "SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC;",
    [storeId],
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
  // Insert the product entity with initial stock, photo URI, and optional barcode
  await db.runAsync(
    `INSERT INTO products (id, store_id, title, price, stock_count, image_uri, barcode) 
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      product.id,
      product.store_id,
      product.title,
      product.price,
      product.stock_count,
      product.image_uri,
      product.barcode ?? null,
    ],
  );

  // Queue mutation for cloud sync
  await enqueueSyncOperation("product", product.id, "INSERT", product);
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
  storeId: string,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Directly set new stock and update modification timestamp
  await db.runAsync(
    `UPDATE products SET stock_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND store_id = ?;`,
    [newStock, productId, storeId],
  );

  // Fetch updated product or enqueue delta for cloud sync
  const updatedProduct = await db.getFirstAsync<Product>(
    `SELECT * FROM products WHERE id = ? AND store_id = ?;`,
    [productId, storeId],
  );
  if (updatedProduct) {
    await enqueueSyncOperation("product", productId, "UPDATE", updatedProduct);
  }
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
  // Update title, price, stock count, barcode, and image path while updating the timestamp
  await db.runAsync(
    `UPDATE products SET title = ?, price = ?, stock_count = ?, image_uri = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND store_id = ?;`,
    [
      product.title,
      product.price,
      product.stock_count,
      product.image_uri,
      product.barcode ?? null,
      product.id,
      product.store_id,
    ],
  );

  // Queue mutation for cloud sync
  await enqueueSyncOperation("product", product.id, "UPDATE", product);
}

/**
 * Finds a product in SQLite by its unique barcode (EAN-13, UPC, etc.).
 *
 * @param {string} barcode - Scanned barcode text string.
 * @returns {Promise<Product | null>} Matching product record or null if not registered.
 */
export async function getProductByBarcode(
  barcode: string,
  storeId: string,
): Promise<Product | null> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const row = await db.getFirstAsync<Product>(
    `SELECT * FROM products WHERE barcode = ? AND store_id = ? LIMIT 1;`,
    [barcode.trim(), storeId],
  );
  return row ?? null;
}

/**
 * Removes a product record from the local SQLite database by its identifier.
 *
 * @param {string} productId - Unique product identifier to remove.
 * @returns {Promise<void>} Resolves when the product record has been deleted.
 */
export async function deleteProduct(
  productId: string,
  storeId: string,
): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync(`DELETE FROM products WHERE id = ? AND store_id = ?;`, [
    productId,
    storeId,
  ]);

  // Queue deletion for cloud sync
  await enqueueSyncOperation("product", productId, "DELETE", {
    id: productId,
    store_id: storeId,
  });
}
