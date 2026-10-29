import { ArrowRight, HeartHandshake, MessageCircle, ShoppingBag, UserRoundCheck } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import heroImage from "@/assets/hero-boutique.webp";
import { buttonStyles, ButtonLink } from "@/components/button-link";
import { DemoCategories, DemoFeaturedProducts } from "@/components/demo/storefront";
import {
  CategoriesSkeleton,
  CategoryLinks,
  FEATURED_LIMIT,
  FeaturedProductsView,
} from "@/components/home-sections";
import { ProductGridSkeleton } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { storeConfig } from "@/config/store";
import { isDemoMode } from "@/lib/demo/mode";
import { listCategories, listProducts } from "@/lib/products/repository";

// Only what the store actually does today: no shipping, payment or discount
// promises (none is configured).
const benefits = [
  {
    icon: HeartHandshake,
    title: "Atendimento com a Bruna",
    text: "Dúvidas, disponibilidade e entrega são combinadas diretamente com ela, pelo WhatsApp.",
  },
  {
    icon: UserRoundCheck,
    title: "Sem cadastro",
    text: "Escolha os produtos e monte o carrinho sem criar conta nem senha.",
  },
  {
    icon: ShoppingBag,
    title: "Você revisa antes de enviar",
    text: "O pedido abre pronto no WhatsApp, para você conferir e enviar quando quiser.",
  },
];

export default function HomePage() {
  const demo = isDemoMode();
  const whatsappUrl = `https://wa.me/${storeConfig.whatsappNumber}`;

  return (
    <>
      {/* Phones and tablets: the picture, then the text. Desktop: the text
          sits on the empty cream side of the picture. */}
      <section className="container-page pt-4 sm:pt-6 lg:pt-8">
        <div className="relative overflow-hidden rounded-lg lg:aspect-[16/9] lg:max-h-[40rem] lg:w-full">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto lg:rounded-none">
            {/* Stock photo (Pexels, unlabeled bottle, mirrored): ambience only, not a product for sale. */}
            <Image
              src={heroImage}
              alt=""
              fill
              sizes="(min-width: 76rem) 72rem, calc(100vw - 2rem)"
              placeholder="blur"
              loading="eager"
              fetchPriority="high"
              className="object-cover object-[88%_60%] sm:object-center"
            />
          </div>
          <div className="pt-7 pb-4 sm:pt-9 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[48%] lg:flex-col lg:justify-center lg:py-12 lg:pr-4 lg:pl-14 xl:pl-18">
            <p className="eyebrow">Beleza · Perfumaria · Cuidados pessoais</p>
            <h1 className="mt-3 font-display text-[2.6rem] leading-[1.04] font-medium text-balance sm:text-6xl lg:mt-4 lg:text-[3.75rem] xl:text-[4.25rem]">
              Pequenos rituais de <em className="text-accent">beleza e cuidado</em>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-foreground/80 sm:text-lg lg:mt-5">
              Escolha com calma e finalize o pedido com a Bruna pelo WhatsApp.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 lg:mt-9">
              <ButtonLink href="/produtos" className="min-h-12 px-7 shadow-card">
                Ver o catálogo
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonStyles.secondary} min-h-12 bg-surface/60`}
              >
                <MessageCircle aria-hidden className="size-4" />
                Falar com a Bruna
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="categorias" className="container-page pt-6 sm:pt-10">
        <SectionHeading id="categorias" eyebrow="Categorias" title="Explore por categoria" />
        <Suspense fallback={<CategoriesSkeleton />}>
          {demo ? <DemoCategories /> : <Categories />}
        </Suspense>
      </section>

      <section aria-labelledby="destaques" className="container-page pt-16 sm:pt-24">
        <SectionHeading
          id="destaques"
          eyebrow="Seleção"
          title="Destaques da loja"
          action={
            <ButtonLink href="/produtos" variant="text">
              Ver todos os produtos
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          }
        />
        <div className="mt-8">
          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            {demo ? <DemoFeaturedProducts /> : <FeaturedProducts />}
          </Suspense>
        </div>
      </section>

      <section aria-labelledby="como-funciona" className="container-page pt-16 sm:pt-24">
        <h2 id="como-funciona" className="sr-only">
          Como funciona
        </h2>
        <ul className="grid gap-8 border-y border-border py-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 sm:flex-col sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <Icon aria-hidden strokeWidth={1.5} className="size-6 shrink-0 text-rose-strong" />
              <div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="atendimento" className="container-page pt-16 sm:pt-24">
        <div className="relative overflow-hidden rounded-lg bg-rose-light px-6 py-12 sm:px-12 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-36 -right-36 size-64 rounded-full border border-rose/70 lg:-top-24 lg:-right-16 lg:size-72"
          />
          <div className="relative max-w-xl">
            <p className="eyebrow">Atendimento</p>
            <h2 id="atendimento" className="mt-2 font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
              Ficou com dúvida sobre algum produto?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
              Fale com a Bruna pelo WhatsApp para saber mais sobre os produtos e a
              disponibilidade antes de fazer o seu pedido.
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonStyles.primary} relative mt-8 shrink-0 lg:mt-0`}
          >
            <MessageCircle aria-hidden className="size-4" />
            Conversar pelo WhatsApp
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
      </section>
    </>
  );
}

async function Categories() {
  return <CategoryLinks categories={await listCategories()} />;
}

async function FeaturedProducts() {
  const featured = await listProducts({ featuredOnly: true, limit: FEATURED_LIMIT });
  // No product marked as featured yet: fall back to the first active ones.
  const products =
    featured.length > 0 ? featured : await listProducts({ limit: FEATURED_LIMIT });
  return <FeaturedProductsView products={products} />;
}
