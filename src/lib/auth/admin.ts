import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toDataSourceError } from "@/lib/supabase/errors";
import { createSessionClient } from "@/lib/supabase/server-client";

// Data Access Layer for the admin panel. Every admin page and every Server
// Action calls requireAdmin(), which verifies the session JWT (getClaims) and
// checks public.admin_users on EACH request. The UI hiding buttons is never
// the security boundary, and RLS repeats the same check in the database.

export type AdminSession = {
  userId: string;
  email: string | null;
};

export type SessionStatus =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "forbidden"; email: string | null }
  | { status: "admin"; session: AdminSession };

export async function resolveSessionStatus(supabase: SupabaseClient): Promise<SessionStatus> {
  // getClaims() validates the JWT signature; getSession() would trust cookies.
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string" || !userId) return { status: "anonymous" };
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;

  // RLS lets each user read only their own admin_users row.
  const { data: row, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (adminError) throw toDataSourceError("verificar administradora", adminError);

  return row ? { status: "admin", session: { userId, email } } : { status: "forbidden", email };
}

type AdminContext = { supabase: SupabaseClient | null; state: SessionStatus };

// Memoized per request in Server Components (React cache).
const getAdminContext = cache(async (): Promise<AdminContext> => {
  // Always a per-request decision, never baked into a prerendered page (even
  // the "not configured" branch, which reads no cookies).
  await connection();
  if (!isSupabaseConfigured()) return { supabase: null, state: { status: "unconfigured" } };
  const supabase = await createSessionClient();
  return { supabase, state: await resolveSessionStatus(supabase) };
});

export async function getSessionStatus(): Promise<SessionStatus> {
  return (await getAdminContext()).state;
}

/**
 * Returns the admin session and a client bound to it, or redirects to the
 * login page. Use the returned client for every admin query, so RLS applies
 * with the admin's own identity (no privileged key involved).
 */
export async function requireAdmin(): Promise<{ session: AdminSession; supabase: SupabaseClient }> {
  const { supabase, state } = await getAdminContext();
  if (state.status === "forbidden") redirect("/admin/login?erro=sem-permissao");
  if (state.status !== "admin" || !supabase) redirect("/admin/login");
  return { session: state.session, supabase };
}

/** Only internal admin paths are accepted as a post-login destination. */
export function safeAdminRedirect(raw: unknown): string {
  if (typeof raw !== "string") return "/admin";
  if (!/^\/admin(\/[A-Za-z0-9/_-]*)?$/.test(raw)) return "/admin";
  if (raw.startsWith("/admin/login")) return "/admin";
  return raw;
}
