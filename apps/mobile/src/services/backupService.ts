/**
 * @file backupService.ts
 * @description Creates and restores explicit, store-scoped data snapshots in Google Drive.
 */

import * as SQLite from "expo-sqlite";
import { DB_NAME } from "../db/schema";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const BACKUP_FORMAT = "proxi-commerce-store-backup";
const BACKUP_VERSION = 1;

interface BackupProduct {
  id: string;
  store_id: string;
  title: string;
  price: number;
  stock_count: number;
  image_uri: string;
  barcode: string | null;
}

interface BackupTransaction {
  id: string;
  store_id: string;
  type: string;
  total: number;
  timestamp: string;
  items: string;
  refund_for_id: string | null;
}

interface BackupClosure {
  id: string;
  store_id: string;
  date: string;
  expected_cash: number;
  counted_cash: number;
  total_digital: number;
  grand_total: number;
  transaction_count: number;
  notes: string | null;
}

interface StoreBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  storeId: string;
  createdAt: string;
  products: BackupProduct[];
  transactions: BackupTransaction[];
  closures: BackupClosure[];
}

export interface GoogleDriveBackup {
  id: string;
  name: string;
  createdTime: string;
}

async function createStoreBackup(storeId: string): Promise<StoreBackup> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  let products: BackupProduct[] = [];
  let transactions: BackupTransaction[] = [];
  let closures: BackupClosure[] = [];
  await db.withExclusiveTransactionAsync(async (transaction) => {
    products = await transaction.getAllAsync<BackupProduct>(
      `SELECT id, store_id, title, price, stock_count, image_uri, barcode
       FROM products WHERE store_id = ? ORDER BY created_at ASC;`,
      [storeId],
    );
    transactions = await transaction.getAllAsync<BackupTransaction>(
      `SELECT id, store_id, type, total, timestamp, items, refund_for_id
       FROM transactions WHERE store_id = ? ORDER BY timestamp ASC;`,
      [storeId],
    );
    closures = await transaction.getAllAsync<BackupClosure>(
      `SELECT id, store_id, date, expected_cash, counted_cash, total_digital,
              grand_total, transaction_count, notes
       FROM closures WHERE store_id = ? ORDER BY date ASC;`,
      [storeId],
    );
  });
  const portableProducts = products.map((product) => ({
    ...product,
    image_uri: product.image_uri.startsWith("file://")
      ? ""
      : product.image_uri,
  }));

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    storeId,
    createdAt: new Date().toISOString(),
    products: portableProducts,
    transactions,
    closures,
  };
}

/**
 * Uploads a store-scoped JSON snapshot to Google Drive. This is an explicit backup,
 * independent of the automatic Supabase synchronization queue.
 */
export async function uploadToGoogleDrive(
  accessToken: string,
  storeId: string,
): Promise<void> {
  const backup = await createStoreBackup(storeId);
  const content = JSON.stringify(backup);
  const timestamp = backup.createdAt.replace(/[:.]/g, "-");
  const metadata = {
    name: `proxi_backup_${storeId}_${timestamp}.json`,
    mimeType: "application/json",
    appProperties: {
      product: BACKUP_FORMAT,
      storeId,
      version: String(BACKUP_VERSION),
    },
  };

  const sessionResponse = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=resumable&fields=id`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!sessionResponse.ok) {
    throw new Error(
      `Google Drive could not start the upload (${sessionResponse.status}): ${await sessionResponse.text()}`,
    );
  }

  const uploadUrl = sessionResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Google Drive did not return a resumable upload URL.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: content,
  });
  if (!uploadResponse.ok) {
    throw new Error(
      `Google Drive backup upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`,
    );
  }
}

/**
 * Lists backups created by this app for the selected store.
 */
export async function listGoogleDriveBackups(
  accessToken: string,
  storeId: string,
): Promise<GoogleDriveBackup[]> {
  const escapedStoreId = storeId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = [
    `appProperties has { key='product' and value='${BACKUP_FORMAT}' }`,
    `appProperties has { key='storeId' and value='${escapedStoreId}' }`,
    "trashed = false",
  ].join(" and ");
  const backups: GoogleDriveBackup[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: query,
      orderBy: "createdTime desc",
      pageSize: "100",
      fields: "nextPageToken,files(id,name,createdTime)",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(`${DRIVE_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `Google Drive could not list backups (${response.status}): ${await response.text()}`,
      );
    }

    const result = (await response.json()) as {
      files?: GoogleDriveBackup[];
      nextPageToken?: string;
    };
    if (!Array.isArray(result.files)) {
      throw new Error("Google Drive returned an invalid backup list.");
    }
    backups.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);

  return backups;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new Error(`Invalid backup: "${field}" must be a string.`);
  }
  return value;
}

function requireNumber(
  record: Record<string, unknown>,
  field: string,
): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid backup: "${field}" must be a number.`);
  }
  return value;
}

function parseBackup(value: unknown, storeId: string): StoreBackup {
  if (
    !isRecord(value) ||
    value.format !== BACKUP_FORMAT ||
    value.version !== BACKUP_VERSION ||
    value.storeId !== storeId ||
    !Array.isArray(value.products) ||
    !Array.isArray(value.transactions) ||
    !Array.isArray(value.closures)
  ) {
    throw new Error("El archivo seleccionado no es una copia válida de esta tienda.");
  }

  const products = value.products.map((entry): BackupProduct => {
    if (!isRecord(entry)) throw new Error("Producto no válido en la copia.");
    const barcodeValue = entry.barcode;
    if (barcodeValue !== null && typeof barcodeValue !== "string") {
      throw new Error("Código de barras no válido en la copia.");
    }
    const barcode =
      typeof barcodeValue === "string" ? barcodeValue : null;
    const productStoreId = requireString(entry, "store_id");
    if (productStoreId !== storeId) {
      throw new Error("La copia contiene productos de otra tienda.");
    }
    return {
      id: requireString(entry, "id"),
      store_id: productStoreId,
      title: requireString(entry, "title"),
      price: requireNumber(entry, "price"),
      stock_count: requireNumber(entry, "stock_count"),
      image_uri: requireString(entry, "image_uri"),
      barcode,
    };
  });

  const transactions = value.transactions.map((entry): BackupTransaction => {
    if (!isRecord(entry)) throw new Error("Venta no válida en la copia.");
    const transactionStoreId = requireString(entry, "store_id");
    if (transactionStoreId !== storeId) {
      throw new Error("La copia contiene ventas de otra tienda.");
    }
    const items = requireString(entry, "items");
    if (!Array.isArray(JSON.parse(items))) {
      throw new Error("Artículos de venta no válidos en la copia.");
    }
    const refundForId = entry.refund_for_id;
    if (refundForId !== null && typeof refundForId !== "string") {
      throw new Error("Referencia de devolución no válida en la copia.");
    }
    const parsedRefundForId =
      typeof refundForId === "string" ? refundForId : null;
    return {
      id: requireString(entry, "id"),
      store_id: transactionStoreId,
      type: requireString(entry, "type"),
      total: requireNumber(entry, "total"),
      timestamp: requireString(entry, "timestamp"),
      items,
      refund_for_id: parsedRefundForId,
    };
  });

  const closures = value.closures.map((entry): BackupClosure => {
    if (!isRecord(entry)) throw new Error("Cierre de caja no válido en la copia.");
    const closureStoreId = requireString(entry, "store_id");
    if (closureStoreId !== storeId) {
      throw new Error("La copia contiene cierres de otra tienda.");
    }
    const notes = entry.notes;
    if (notes !== null && typeof notes !== "string") {
      throw new Error("Notas de cierre no válidas en la copia.");
    }
    const parsedNotes = typeof notes === "string" ? notes : null;
    return {
      id: requireString(entry, "id"),
      store_id: closureStoreId,
      date: requireString(entry, "date"),
      expected_cash: requireNumber(entry, "expected_cash"),
      counted_cash: requireNumber(entry, "counted_cash"),
      total_digital: requireNumber(entry, "total_digital"),
      grand_total: requireNumber(entry, "grand_total"),
      transaction_count: requireNumber(entry, "transaction_count"),
      notes: parsedNotes,
    };
  });

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    storeId,
    createdAt: requireString(value, "createdAt"),
    products,
    transactions,
    closures,
  };
}

/**
 * Replaces this store's local products, sales, and cash closures from a Drive backup.
 * The restore is local-only; it does not modify Supabase or other stores on device.
 */
export async function restoreGoogleDriveBackup(
  accessToken: string,
  backupFileId: string,
  storeId: string,
): Promise<void> {
  const response = await fetch(
    `${DRIVE_API}/${encodeURIComponent(backupFileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error(
      `Google Drive could not download the backup (${response.status}): ${await response.text()}`,
    );
  }

  const backup = parseBackup(await response.json(), storeId);
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.withTransactionAsync(async () => {
    const queuedItems = await db.getAllAsync<{ id: string; payload: string }>(
      "SELECT id, payload FROM sync_queue;",
    );
    for (const queuedItem of queuedItems) {
      let payload: unknown;
      try {
        payload = JSON.parse(queuedItem.payload);
      } catch {
        console.warn(
          "[BackupService] Preserving malformed sync queue item during restore:",
          queuedItem.id,
        );
        continue;
      }

      if (isRecord(payload) && payload.store_id === storeId) {
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?;", [
          queuedItem.id,
        ]);
      }
    }

    await db.runAsync("DELETE FROM closures WHERE store_id = ?;", [storeId]);
    await db.runAsync("DELETE FROM transactions WHERE store_id = ?;", [storeId]);
    await db.runAsync("DELETE FROM products WHERE store_id = ?;", [storeId]);

    for (const product of backup.products) {
      await db.runAsync(
        `INSERT INTO products
         (id, store_id, title, price, stock_count, image_uri, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          product.id,
          storeId,
          product.title,
          product.price,
          product.stock_count,
          product.image_uri,
          product.barcode,
        ],
      );
    }

    const orderedTransactions = [...backup.transactions].sort(
      (left, right) =>
        Number(Boolean(left.refund_for_id)) -
        Number(Boolean(right.refund_for_id)),
    );
    for (const transaction of orderedTransactions) {
      await db.runAsync(
        `INSERT INTO transactions
         (id, store_id, type, total, timestamp, items, refund_for_id)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          transaction.id,
          storeId,
          transaction.type,
          transaction.total,
          transaction.timestamp,
          transaction.items,
          transaction.refund_for_id,
        ],
      );
    }

    for (const closure of backup.closures) {
      await db.runAsync(
        `INSERT INTO closures
         (id, store_id, date, expected_cash, counted_cash, total_digital,
          grand_total, transaction_count, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          closure.id,
          storeId,
          closure.date,
          closure.expected_cash,
          closure.counted_cash,
          closure.total_digital,
          closure.grand_total,
          closure.transaction_count,
          closure.notes,
        ],
      );
    }
  });
}
