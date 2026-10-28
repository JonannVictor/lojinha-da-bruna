import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "./config";

// Privileged client (secret key, bypasses RLS). It is used for ONE thing:
// calling public.create_order, which only service_role may execute. Never
// import this module from client code; "server-only" makes that a build error.

export function readSecretKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const key = env.SUPABASE_SECRET_KEY?.trim();
  return key ? key : null;
}

export function createServiceClient(): SupabaseClient | null {
  const config = readSupabaseConfig();
  const secretKey = readSecretKey();
  if (!config || !secretKey) return null;
  return createClient(config.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
