import { ArrowRight, HeartHandshake, MessageCircle, ShoppingBag, UserRoundCheck } from "lucide-react";
import { Suspense } from "react";
import { buttonStyles, ButtonLink } from "@/components/button-link";
import { DemoCategories, DemoFeaturedProducts } from "@/components/demo/storefront";
import { HeroArt } from "@/components/hero-art";
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
      <section className="overflow-hidden">
        <div className="container-page grid items-center gap-10 pt-10 pb-14 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:py-16 lg:gap-20 lg:py-20">
          <div>
            <p className="eyebrow">Beleza · Perfumaria · Cuidados pessoais</p>
            <h1 className="mt-4 font-display text-[2.6rem] leading-[1.05] font-medium text-balance sm:text-6xl lg:text-[4.25rem]">
              Pequenos rituais de <em className="text-accent">beleza e cuidado</em>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
              {storeConfig.tagline}. Escolha com calma, monte seu carrinho e
              finalize o pedido com a Bruna pelo WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/produtos">
                Explorar produtos
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles.secondary}
              >
                <MessageCircle aria-hidden className="size-4" />
                Falar com a Bruna
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[13.5rem] sm:max-w-[16rem] md:max-w-sm">
            <HeroArt />
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
        <div className="relative overflow-hidden rounded-md bg-rose-light px-6 py-12 sm:px-12 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-12">
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
