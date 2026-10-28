import { AlertCircle, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { storeConfig } from "@/config/store";
import { getSessionStatus, safeAdminRedirect } from "@/lib/auth/admin";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-2xl font-semibold">{storeConfig.name}</p>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="font-display text-xl font-semibold">Entrar no painel</h1>
          <Suspense fallback={<div aria-hidden className="mt-6 h-56 animate-pulse rounded-xl bg-surface-muted" />}>
            <LoginContent searchParams={searchParams} />
          </Suspense>
        </div>
        <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-accent">
          Voltar para a loja
        </Link>
      </div>
    </main>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeAdminRedirect(Array.isArray(params.next) ? params.next[0] : params.next);
  const state = await getSessionStatus();

  if (state.status === "admin") redirect(next);

  if (state.status === "unconfigured") {
    return (
      <div className="mt-4 flex gap-3 rounded-xl bg-warning-soft p-4 text-sm text-warning">
        <Settings aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          O painel ainda não está conectado ao Supabase. Configure as variáveis
          de ambiente conforme <code>docs/supabase.md</code>.
        </p>
      </div>
    );
  }

  const forbidden = state.status === "forbidden" || params.erro === "sem-permissao";

  return (
    <>
      {forbidden && (
        <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          Esta conta não tem permissão para acessar o painel. Entre com uma conta de administradora.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}
