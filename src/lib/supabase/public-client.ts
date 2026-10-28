import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./config";

/**
 * Anonymous client for storefront reads. It never touches cookies, so it can
 * run inside "use cache" functions, and RLS limits it to active rows.
 */
export function createPublicClient(): SupabaseClient {
  const { url, publishableKey } = requireSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
