"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { buttonStyles } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="container-page py-12 sm:py-16">
      <EmptyState
        icon={<AlertCircle aria-hidden className="size-6" />}
        title="Algo deu errado"
        description="Não foi possível carregar esta página agora. Tente novamente em instantes."
        action={
          <button type="button" onClick={() => retry()} className={buttonStyles.primary}>
            Tentar novamente
          </button>
        }
      />
    </div>
  );
}
