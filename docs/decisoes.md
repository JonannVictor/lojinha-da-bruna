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

---

# Decisões de arquitetura — Etapa 2 (Supabase e painel)

## Fonte do catálogo

- `repository.ts` manteve a interface (`listProducts`, `getProductBySlug`,
  `getProductsByIds`, `listCategories`). A fonte `supabase` é escolhida
  automaticamente quando as variáveis do Supabase existem. `demo` continua
  disponível fora de produção, e sem configuração o catálogo continua vazio.
- As leituras da vitrine usam um cliente **anônimo, sem cookies**
  (`src/lib/supabase/public-client.ts`). Funções com `"use cache"` não podem
  ler cookies, e assim o cache é compartilhado entre visitantes sem misturar
  sessões.
- A busca da vitrine continua em memória (`filterProducts`), ignorando acentos
  como na Etapa 1. Para um catálogo de pequeno porte, isso é mais simples que
  `unaccent`/busca textual no banco. Revisar se o catálogo passar de alguns
  milhares de itens.
- Falhas do Supabase viram `DataSourceError` com mensagem genérica. A página
  mostra o erro, nunca um catálogo vazio enganoso. Detalhes ficam só no log do
  servidor.
- Com o Supabase configurado, o build prerenderiza a página inicial lendo o
  banco. Se o banco estiver inacessível no build, o deploy falha em vez de
  publicar uma loja vazia.
- Categoria desativada some dos filtros e da página inicial. Os produtos dela
  continuam visíveis, sem o rótulo de categoria. Para esconder um produto,
  desative o produto.

## Banco de dados (ajustes em relação à especificação)

| Item                      | Decisão                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `products.images`         | `jsonb` com `[{ path, alt }]`. Guarda o **caminho** no bucket, não a URL: a URL pública é montada no servidor e entradas malformadas são descartadas. |
| `products.is_featured`    | Mantido da Etapa 1 (destaques da página inicial).                                                                               |
| `products.price_cents`    | `null` = preço a confirmar. Quando definido, de 1 a 9.999.999 (R$ 99.999,99). Zero não é aceito: um preço zero tornaria o produto gratuito. |
| `products.stock_quantity` | `null` = não controlado; senão, de 0 a 100.000.                                                                                  |
| `products.is_active`      | Padrão `false`: produto novo só aparece depois de revisado.                                                                     |
| `categories.position`     | Campo novo para ordenar as categorias na loja ("organização de categorias").                                                    |
| `admin_users`             | Tabela nova: quem pode usar o painel.                                                                                           |
| `orders.status`           | `pending`, `confirmed`, `cancelled`, `fulfilled`.                                                                               |
| `orders.subtotal_cents`   | `bigint` (soma de até 50 linhas).                                                                                               |
| `order_items`             | `created_at` adicionado; `(order_id, product_id)` único; `line_total_cents = unit_price_cents × quantity` garantido por `CHECK`. |
| Exclusões                 | `order_items.product_id` usa `ON DELETE RESTRICT`: produto com pedido não é excluído, apenas desativado. O mesmo vale para categoria com produtos. |

Categorias iniciais do briefing são inseridas pela migração (`on conflict do
nothing`). Nenhum produto, preço ou dado comercial foi criado.

## Autorização

- **Tabela `admin_users` + `private.is_admin()`**, em vez de *custom claims*
  no JWT. A checagem consulta o banco a cada requisição, então revogar um
  acesso vale na hora. *Custom claims* só mudariam quando o token fosse
  renovado (até 1 h depois) e dependeriam de configurar um Auth Hook.
- `is_admin()` é `SECURITY INVOKER` e fica no schema `private` (fora da Data
  API). Ela funciona porque o RLS de `admin_users` deixa cada usuária ler a
  própria linha. Não há função `SECURITY DEFINER` nesta etapa.
- Três camadas: `src/proxy.ts` renova a sessão e redireciona quem não tem
  sessão; cada página e Server Action chama `requireAdmin()`; o RLS repete as
  regras no banco.
- O login recusa e encerra a sessão de contas sem linha em `admin_users`.
- O destino pós-login (`?next=`) só aceita caminhos `/admin/...`, o que evita
  *open redirect*.

## Painel

- Rotas da loja foram movidas para o grupo `src/app/(loja)/` (URLs iguais),
  para o painel ter layout próprio, sem cabeçalho, busca e carrinho da loja.
- Leituras do painel usam o cliente da sessão (`createSessionClient`) e ficam
  dentro de `<Suspense>`, exigência do Cache Components para dados por
  requisição.
- Mutações chamam `updateTag("products")` e `updateTag("categories")`, o que
  atualiza a vitrine imediatamente.
- Formulários com validação usam envio por `onSubmit`, pois o reset automático
  do React 19 apagaria o que foi digitado quando há erro. A validação real é
  sempre a do servidor (`src/lib/admin/validation.ts`), espelhando os `CHECK`s
  do banco.
- Exclusão de produto só é possível sem histórico de pedidos. O painel sugere
  desativar.
- Sem paginação na lista de produtos por enquanto (catálogo pequeno).

## Fotos

- Envio pela Server Action `uploadProductImage`, com a sessão da
  administradora, sob o RLS do Storage. O servidor valida a assinatura binária
  (JPEG/PNG/WebP) e o tamanho; o MIME declarado pelo navegador é ignorado.
- O navegador reduz a foto para no máximo 1600 px (WebP, ou JPEG como
  alternativa). Isso cabe no limite de corpo de 4,5 MB da Vercel e deixa a
  vitrine leve.
- Ordem das operações: enviar → gravar no produto (desfaz o envio se falhar);
  tirar do produto → apagar o arquivo. Uma falha deixa no máximo um arquivo
  órfão, nunca uma foto quebrada.
- O produto precisa existir antes das fotos, pois a pasta usa o id. Por isso
  "Novo produto" leva à edição depois de salvar.

## Pedidos

- `public.create_order` (PL/pgSQL, uma transação): valida itens, trava os
  produtos (`FOR SHARE`, em ordem de id), recalcula preço e subtotal no banco,
  grava `orders` e `order_items`. Qualquer erro desfaz tudo.
- Só o `service_role` executa a função. Assim ninguém cria pedidos chamando a
  API diretamente com a chave publicável, e o servidor pode exigir as condições
  de negócio (WhatsApp configurado) antes de chamar.
- O carrinho envia só ids e quantidades. A mensagem do WhatsApp é montada a
  partir do pedido **já gravado** e só depois o navegador é redirecionado.
- **Estoque validado, não baixado.** O pedido fica `pending` até a Bruna
  confirmar pelo WhatsApp. Baixar o estoque na criação travaria unidades por
  pedidos nunca confirmados, sem tela para cancelá-los. A baixa (com
  devolução no cancelamento) entra junto com a gestão de pedidos.
- Enquanto `WHATSAPP_NUMBER` estiver vazio, a finalização segue desligada na
  interface **e** recusada no servidor.
