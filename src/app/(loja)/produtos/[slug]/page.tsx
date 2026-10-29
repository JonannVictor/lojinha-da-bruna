import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoProductDetail } from "@/components/demo/storefront";
import { ProductDetailSkeleton, ProductDetailView } from "@/components/product-detail";
import { storeConfig } from "@/config/store";
import { isDemoMode } from "@/lib/demo/mode";
import { findSeedProduct } from "@/lib/demo/seed";
import { getProductBySlug } from "@/lib/products/repository";

export async function generateMetadata({
  params,
}: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // Demo products live in the browser: the server only knows the initial ones.
  if (isDemoMode()) {
    const seeded = findSeedProduct(slug);
    return { title: seeded?.name ?? "Produto", description: seeded?.description };
  }
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description ?? undefined,
  };
}

export default function ProductPage({ params }: PageProps<"/produtos/[slug]">) {
  return (
    // The breadcrumb (with the way back to the catalog) is part of the view.
    <div className="container-page pt-6 sm:pt-8">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({
  params,
}: Pick<PageProps<"/produtos/[slug]">, "params">) {
  const { slug } = await params;
  const whatsapp = { whatsappNumber: storeConfig.whatsappNumber, storeName: storeConfig.name };
  if (isDemoMode()) return <DemoProductDetail slug={slug} {...whatsapp} />;

  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetailView product={product} {...whatsapp} />;
}
