"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { buttonStyles } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert">
      <EmptyState
        icon={<AlertCircle aria-hidden className="size-6" />}
        title="Não foi possível carregar os dados"
        description="A conexão com o banco de dados falhou. Verifique sua internet e tente novamente."
        action={
          <button type="button" onClick={() => retry()} className={buttonStyles.primary}>
            Tentar novamente
          </button>
        }
      />
    </div>
  );
}
