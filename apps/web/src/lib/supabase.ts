import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xyuamimlurzpaektcqbv.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_aGthgRBHrbBO9SEqaU-RHg_4EpgmjR_";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
