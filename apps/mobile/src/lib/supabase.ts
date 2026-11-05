/**
 * @file supabase.ts
 * @description Supabase client initialization tailored for React Native / Expo.
 * Uses a resilient multi-tier storage adapter (In-Memory + SQLite app_kv_store + AsyncStorage fallback)
 * to ensure auth session persistence while completely preventing "Native module is null" crashes in Expo Go.
 */

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupportedStorage } from "@supabase/supabase-js";
import * as SQLite from "expo-sqlite";
import { DB_NAME } from "../db/schema";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder-offline.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.info(
    "[Supabase] Credentials not found in .env; operating in 100% offline local SQLite mode. Changes will queue in sync_queue.",
  );
}

const memoryStore = new Map<string, string>();

/**
 * Resilient multi-tier storage adapter for Supabase Auth.
 * 1. In-memory Map for instant synchronous lookups.
 * 2. SQLite `app_kv_store` for reliable offline persistence across app restarts.
 * 3. Graceful try/catch over AsyncStorage so unlinked/mismatched native modules
 *    (e.g., in Expo Go or New Architecture) never throw uncaught exceptions.
 */
const safeAuthStorage: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    if (memoryStore.has(key)) {
      return memoryStore.get(key) ?? null;
    }

    // 1. Query SQLite local storage
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_kv_store WHERE key = ? LIMIT 1;`,
        [key],
      );
      if (row?.value) {
        memoryStore.set(key, row.value);
        return row.value;
      }
    } catch {
      // Table might not be ready yet during early boot ticks
    }

    // 2. Safe attempt with AsyncStorage (suppressing native module null errors)
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === "function") {
        const val = await AsyncStorage.getItem(key);
        if (val) {
          memoryStore.set(key, val);
          return val;
        }
      }
    } catch {
      // Ignore "Native module is null" from legacy AsyncStorage in Expo Go
    }

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);

    // Persist to SQLite
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.runAsync(
        `INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?);`,
        [key, value],
      );
    } catch {
      // Ignore
    }

    // Safe attempt with AsyncStorage
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === "function") {
        await AsyncStorage.setItem(key, value);
      }
    } catch {
      // Ignore
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);

    // Remove from SQLite
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.runAsync(`DELETE FROM app_kv_store WHERE key = ?;`, [key]);
    } catch {
      // Ignore
    }

    // Safe attempt with AsyncStorage
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === "function") {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
