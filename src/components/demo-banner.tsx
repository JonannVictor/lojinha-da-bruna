import { isDemoMode } from "@/lib/demo/mode";
import { getCatalogSource } from "@/lib/products/repository";

export function DemoBanner() {
  if (getCatalogSource() !== "demo") return null;
  return (
    <div
      role="note"
      className="bg-warning-soft px-4 py-2 text-center text-xs font-medium text-warning sm:text-sm"
    >
      {isDemoMode()
        ? "Demonstração: os produtos são fictícios e ficam salvos só neste navegador. O site não registra pedidos."
        : "Ambiente de demonstração: os produtos exibidos são fictícios e não estão à venda."}
    </div>
  );
}
