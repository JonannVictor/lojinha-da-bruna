"use server";

import { redirect } from "next/navigation";
import { failure, type ActionState } from "@/lib/admin/action-state";
import { safeAdminRedirect } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createSessionClient } from "@/lib/supabase/server-client";

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return failure("O painel ainda não está configurado. Veja docs/supabase.md.");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > 320 || password.length > 200) {
    return failure("Informe e-mail e senha.");
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Same message for unknown e-mail and wrong password.
    if (error && error.status !== 400) logSupabaseError("login", error);
    return failure(
      error?.status === 429
        ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
        : "E-mail ou senha incorretos.",
    );
  }

  // Signing in is not enough: the account must be in admin_users.
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (adminError || !admin) {
    if (adminError) logSupabaseError("verificar administradora no login", adminError);
    await supabase.auth.signOut({ scope: "local" });
    return failure(
      adminError
        ? "Não foi possível verificar sua conta agora. Tente novamente."
        : "Esta conta não tem permissão para acessar o painel.",
    );
  }

  redirect(safeAdminRedirect(formData.get("next")));
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) logSupabaseError("logout", error);
  }
  redirect("/admin/login");
}
