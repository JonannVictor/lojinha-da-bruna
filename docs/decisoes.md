# Decisões de arquitetura — Etapa 1

## Camada de dados

- Toda leitura do catálogo passa por `src/lib/products/repository.ts`
  (`listProducts`, `getProductBySlug`, `getProductsByIds`, `listCategories`).
  As páginas não conhecem a origem dos dados. Para conectar o Supabase, basta
  reimplementar essas funções, sem alterar a interface.
- A fonte atual é definida por `CATALOG_SOURCE`:
  - `empty` (padrão): catálogo vazio;
  - `demo`: produtos **fictícios**, sem fotos, sinalizados por um banner.
  Com `VERCEL_ENV=production`, o modo `demo` é ignorado: produtos fictícios
  nunca chegam à loja de produção.
- As leituras usam `"use cache"` + `cacheTag("products")`. No CRUD do painel,
  `revalidateTag("products")` atualiza a vitrine.

## Modelo de produto (`src/lib/products/types.ts`)

Campos em snake_case, espelhando as futuras colunas do banco. Adaptações em
relação à especificação:

| Campo            | Decisão                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `price_cents`    | Inteiro em centavos (evita erros de arredondamento). `null` = preço a confirmar, e o produto não pode ser comprado.      |
| `description`    | `null` enquanto não houver descrição confirmada; a página mostra "Descrição em breve".                                   |
| `stock_quantity` | `null` = estoque não controlado (limite de 20 unidades por item). `0` = esgotado.                                         |
| `category`       | Objeto `{ slug, name }`. No banco, vira `category_id` com uma tabela `categories`.                                        |
| `images`         | Lista `{ url, alt }`. A primeira imagem é a principal. Sem imagem, a interface mostra um marcador neutro.                 |
| `is_featured`    | Campo novo, para os "produtos em destaque" da página inicial. Sem destaques, a página mostra os primeiros ativos.          |

As regras de compra ficam em `availability.ts`: só é possível comprar um
produto ativo, com preço confirmado e estoque maior que zero (ou estoque não
controlado).

## Carrinho

- O navegador (`localStorage`) guarda apenas `productId` e `quantidade`.
  Nome, preço e estoque vêm sempre do servidor: a página do carrinho chama a
  server action `getCartProducts`, que faz uma leitura sem cache. Assim, um
  valor alterado no navegador nunca define o preço.
- Itens indisponíveis ou removidos do catálogo continuam visíveis, mas
  sinalizados, e ficam fora do subtotal. Quantidades acima do estoque são
  ajustadas automaticamente.
- O botão "Finalizar pelo WhatsApp" fica desativado até a próxima etapa, em
  que o pedido será registrado no Supabase **antes** de abrir o WhatsApp.

## Interface

- A identidade visual está centralizada nos tokens de `src/app/globals.css`
  (cores, fontes Fraunces e Manrope). Ajustes de marca se fazem lá.
- shadcn/ui não foi adotado nesta etapa: os componentes são simples e não
  justificam a dependência. Ele pode entrar no painel administrativo
  (formulários, tabelas, diálogos).
- Para fotos vindas do Supabase Storage, inclua o domínio do projeto em
  `images.remotePatterns` no `next.config.ts`.
- Uma página de produto inexistente renderiza o 404 via streaming: o status
  HTTP é 200, mas a página inclui `noindex`. Esse é o comportamento esperado
  do Next.js com Cache Components.
