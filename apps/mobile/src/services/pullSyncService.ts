/**
 * @file pullSyncService.ts
 * @description Manages pull operations from Supabase into local SQLite and provides
 * conflict resolution strategies (Overwrite Local vs Overwrite Remote).
 */

import * as SQLite from "expo-sqlite";
import { supabase } from "../lib/supabase";
import { DB_NAME } from "../db/schema";
import { Product } from "@proxi-commerce/types";
import { enqueueSyncOperation } from "../db/syncQueue";

/**
 * Downloads products from Supabase and overwrites local SQLite tables with remote data.
 *
 * @param {string} storeId - Store identifier.
 * @returns {Promise<number>} Number of products imported locally.
 */
export async function overwriteLocalWithRemote(
  storeId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId);

  if (error) throw error;
  if (!data) return 0;

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.withTransactionAsync(async () => {
    // 1. Clear local products for this store
    await db.runAsync(`DELETE FROM products WHERE store_id = ?;`, [storeId]);

    // 2. Insert fresh products downloaded from Supabase
    for (const item of data as Product[]) {
      await db.runAsync(
        `INSERT INTO products (id, store_id, title, price, stock_count, image_uri, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          item.id,
          item.store_id,
          item.title,
          item.price,
          item.stock_count,
          item.image_uri || null,
          item.barcode || null,
        ],
      );
    }
  });

  return data.length;
}

/**
 * Replaces the remote catalog for a store with its local catalog.
 * Local products are uploaded first; remote-only products are deleted afterward.
 *
 * @param {string} storeId - Store identifier.
 * @returns {Promise<number>} Number of local records pushed.
 */
export async function overwriteRemoteWithLocal(
  storeId: string,
): Promise<number> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  const localProducts = await db.getAllAsync<Product>(
    `SELECT * FROM products WHERE store_id = ?;`,
    [storeId],
  );

  if (localProducts.length > 0) {
    const { error } = await supabase
      .from("products")
      .upsert(localProducts, { onConflict: "id" });

    if (error) throw error;
  }

  const { data: remoteProducts, error: fetchError } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId);

  if (fetchError) throw fetchError;

  const localProductIds = new Set(localProducts.map((product) => product.id));
  const remoteOnlyIds = remoteProducts
    .map((product) => product.id)
    .filter((id) => !localProductIds.has(id));

  for (let offset = 0; offset < remoteOnlyIds.length; offset += 100) {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("store_id", storeId)
      .in("id", remoteOnlyIds.slice(offset, offset + 100));

    if (error) throw error;
  }

  // Enqueue local records to sync queue to ensure background sync tracking
  for (const prod of localProducts) {
    await enqueueSyncOperation("product", prod.id, "UPDATE", prod as any);
  }

  return localProducts.length;
}
