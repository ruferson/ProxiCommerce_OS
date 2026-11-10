/**
 * @file useTransactionHistory.ts
 * @description React hook for fetching sales transaction history and computing
 * the daily Arqueo (cash register summary) from the local SQLite database.
 * All queries are scoped to the current calendar day in device local time.
 */

import { useState, useCallback } from "react";
import * as SQLite from "expo-sqlite";
import {
  Transaction,
  TransactionItem,
  TransactionType,
} from "@proxi-commerce/types";
import { DB_NAME } from "../db/schema";

/**
 * Per-payment-method sales aggregation for the daily Arqueo report.
 */
export interface PaymentBreakdown {
  type: TransactionType;
  count: number;
  total: number;
}

/**
 * Complete daily Arqueo (cash register summary) snapshot (Cierre Z / Cierre X).
 */
export interface DailyArqueo {
  /** ISO date string of the reporting day (YYYY-MM-DD) */
  date: string;
  /** Total net revenue across all payment methods (sales + refunds) */
  grandTotal: number;
  /** Total positive gross sales generated today */
  grossSales: number;
  /** Total negative refunds processed today (absolute positive value) */
  grossRefunds: number;
  /** Expected physical cash in drawer: CASH sales minus CASH refunds */
  expectedCash: number;
  /** Total collected via digital channels (NFC, AI_SCAN, ONLINE_WEB) */
  totalDigital: number;
  /** Number of completed transactions (sales and refunds) */
  transactionCount: number;
  /** Per-method revenue breakdown */
  breakdown: PaymentBreakdown[];
}

/**
 * State and actions provided by the `useTransactionHistory` hook.
 */
export interface UseTransactionHistoryResult {
  /** All transactions fetched from SQLite (newest first) */
  transactions: Transaction[];
  /** Today's cash register summary */
  arqueo: DailyArqueo | null;
  /** True while SQLite queries are in-flight */
  loading: boolean;
  /** Error message, or null when no error occurred */
  error: string | null;
  /** Re-fetches all data from SQLite */
  refresh: () => Promise<void>;
}

/**
 * Returns today's date as a local-timezone ISO date string (YYYY-MM-DD).
 * SQLite `timestamp` values stored via `CURRENT_TIMESTAMP` use UTC, so we
 * construct the UTC equivalents of local midnight/end-of-day for the WHERE clause.
 */
function getLocalDayUTCBounds(): { startUtc: string; endUtc: string } {
  const now = new Date();
  // Local midnight → subtract tz offset to convert to UTC
  const localMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const localEndOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  // Convert to UTC ISO strings, then trim to `YYYY-MM-DD HH:MM:SS` for SQLite
  const toSQLite = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

  return {
    startUtc: toSQLite(localMidnight),
    endUtc: toSQLite(localEndOfDay),
  };
}

/**
 * Hook for loading sales history and computing the daily Arqueo from SQLite.
 *
 * @returns {UseTransactionHistoryResult} Reactive state with transactions, arqueo, and refresh action.
 */
export function useTransactionHistory(
  storeId: string,
): UseTransactionHistoryResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [arqueo, setArqueo] = useState<DailyArqueo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const { startUtc, endUtc } = getLocalDayUTCBounds();

      // --- 1. Fetch ALL transactions ordered newest-first ---
      const rawRows = await db.getAllAsync<{
        id: string;
        store_id: string;
        type: string;
        total: number;
        timestamp: string;
        items: string;
        refund_for_id?: string | null;
      }>(`SELECT id, store_id, type, total, timestamp, items, refund_for_id
          FROM transactions
          WHERE store_id = ?
          ORDER BY timestamp DESC;`,
        [storeId],
      );

      const parsed: Transaction[] = rawRows.map((row) => ({
        id: row.id,
        store_id: row.store_id,
        type: row.type as TransactionType,
        total: row.total,
        timestamp: row.timestamp,
        refund_for_id: row.refund_for_id,
        items: (() => {
          try {
            return JSON.parse(row.items) as TransactionItem[];
          } catch {
            return [];
          }
        })(),
      }));

      setTransactions(parsed);

      // --- 2. Daily Arqueo: aggregate today's transactions ---
      const todayRows = await db.getAllAsync<{
        type: string;
        count: number;
        total: number;
        grossSales: number;
        grossRefunds: number;
      }>(
        `SELECT type,
                COUNT(*) AS count,
                SUM(total) AS total,
                SUM(CASE WHEN total > 0 THEN total ELSE 0 END) AS grossSales,
                SUM(CASE WHEN total < 0 THEN ABS(total) ELSE 0 END) AS grossRefunds
          FROM transactions
          WHERE store_id = ? AND timestamp >= ? AND timestamp <= ?
          GROUP BY type;`,
        [storeId, startUtc, endUtc],
      );

      const breakdown: PaymentBreakdown[] = todayRows.map((r) => ({
        type: r.type as TransactionType,
        count: r.count,
        total: r.total || 0,
      }));

      const grandTotal = breakdown.reduce((acc, b) => acc + b.total, 0);
      const transactionCount = breakdown.reduce((acc, b) => acc + b.count, 0);
      const grossSales = todayRows.reduce(
        (acc, r) => acc + (r.grossSales || 0),
        0,
      );
      const grossRefunds = todayRows.reduce(
        (acc, r) => acc + (r.grossRefunds || 0),
        0,
      );

      // Specific cash drawer & digital breakdown
      const cashEntry = breakdown.find((b) => b.type === "CASH");
      const expectedCash = cashEntry ? cashEntry.total : 0;
      const totalDigital = breakdown
        .filter((b) => b.type !== "CASH")
        .reduce((acc, b) => acc + b.total, 0);

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      setArqueo({
        date: dateStr,
        grandTotal,
        grossSales,
        grossRefunds,
        expectedCash,
        totalDigital,
        transactionCount,
        breakdown,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "SQLite query failed";
      console.error("[useTransactionHistory] Error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  return { transactions, arqueo, loading, error, refresh };
}
