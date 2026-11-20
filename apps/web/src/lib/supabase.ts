/**
 * @file supabase.ts
 * @description Supabase client initialization for the customer web storefront.
 * Connects to public database views, RPC endpoints, and Realtime channels using
 * public anon credentials.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xyuamimlurzpaektcqbv.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_aGthgRBHrbBO9SEqaU-RHg_4EpgmjR_";

/**
 * Shared Supabase client instance configured with public anon keys.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
