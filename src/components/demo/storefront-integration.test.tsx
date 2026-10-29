import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogResults } from "@/components/catalog-results";
import { ProductDetailView } from "@/components/product-detail";
import { createDemoAdminActions } from "@/lib/demo/admin-actions";
import { storefrontCategories, storefrontProducts } from "@/lib/demo/model";
import { createDemoStore } from "@/lib/demo/store";
import { filterProducts } from "@/lib/products/search";
import { MemoryStorage } from "@/test/memory-storage";

// Panel → storefront: what is saved through the panel actions is rendered by
// the same components the store pages use.

const whatsapp = { whatsappNumber: "555481394629", storeName: "Lojinha da Bruna" };

function setup() {
  const store = createDemoStore({ getStorage: () => new MemoryStorage() });
  return { store, actions: createDemoAdminActions(store.repository) };
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function renderCatalog(state: ReturnType<ReturnType<typeof setup>["store"]["getSnapshot"]>["state"], query = "") {
  const products = filterProducts(storefrontProducts(state), { query: query || undefined });
  return renderToStaticMarkup(
    <CatalogResults categories={storefrontCategories(state)} activeCategory={undefined} query={query} products={products} />,
  );
}

describe("panel and storefront integration", () => {
  it("a first-time visitor sees the demo products without anything being written", () => {
    const storage = new MemoryStorage();
    const store = createDemoStore({ getStorage: () => storage });

    const html = renderCatalog(store.getSnapshot().state);
    expect(html).toContain("7 produtos encontrados.");
    expect(html).toContain("Paleta de sombras (exemplo)");
    expect(html).not.toContain("Catálogo em preparação");
    // The seed is only saved with the first change, so nothing (empty or not)
    // is persisted ahead of time.
    expect(storage.data.size).toBe(0);
  });

  it("a product created in the panel appears in the catalog and on its page", async () => {
    const { store, actions } = setup();
    let createdId = "";
    await actions.saveProduct(null, (id) => (createdId = id))(
      { status: "idle" },
      form({ name: "Esmalte cintilante", brand: "Marca Y", price: "12,50", stock_quantity: "2", is_active: "on" }),
    );

    const state = store.getSnapshot().state;
    const html = renderCatalog(state);
    expect(html).toContain("Esmalte cintilante");
    expect(html).toContain('href="/produtos/esmalte-cintilante"');
    expect(html).toContain("R$ 12,50");

    const product = storefrontProducts(state).find((p) => p.id === createdId)!;
    const page = renderToStaticMarkup(<ProductDetailView product={product} {...whatsapp} />);
    expect(page).toContain("Esmalte cintilante");
    expect(page).toContain('href="https://wa.me/555481394629?text=');
    expect(page).toContain(encodeURIComponent("*Esmalte cintilante*\nMarca: Marca Y").replace(/'/g, "%27"));
    expect(page).toContain("2 unidades disponíveis");
    expect(page).toContain("Adicionar ao carrinho");
  });

  it("an inactive product is not rendered; an out-of-stock one can't be bought", async () => {
    const { store, actions } = setup();
    const target = store.getSnapshot().state.products.find((p) => p.name.startsWith("Hidratante"))!;
    await actions.toggleProduct(target.id, false)({ status: "idle" }, new FormData());

    const state = store.getSnapshot().state;
    expect(renderCatalog(state)).not.toContain("Hidratante corporal");
    expect(renderCatalog(state)).not.toContain("Kit presente");

    const outOfStock = storefrontProducts(state).find((p) => p.name.startsWith("Base"))!;
    const page = renderToStaticMarkup(<ProductDetailView product={outOfStock} {...whatsapp} />);
    expect(page).toContain("Esgotado");
    expect(page).toContain("não está disponível para compra");
    expect(page).not.toContain("Adicionar ao carrinho");
  });

  it("shows the empty search state", () => {
    const { store } = setup();
    const html = renderCatalog(store.getSnapshot().state, "inexistente");
    expect(html).toContain("Nenhum produto encontrado");
    expect(html).toContain("0 produtos encontrados.");
  });
});
