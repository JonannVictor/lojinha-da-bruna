import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./config";

/**
 * Client bound to the signed-in user's session (auth cookies). Every query
 * runs as that user, so RLS decides what is allowed. Use it in Server
 * Components and Server Actions of the admin panel.
 */
export async function createSessionClient(): Promise<SupabaseClient> {
  const { url, publishableKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. The session is refreshed by
          // src/proxy.ts on every /admin request, so this is safe to ignore.
        }
      },
    },
  });
}
