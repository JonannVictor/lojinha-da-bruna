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

---

# Decisões de arquitetura — Etapa 3 (modo demonstração)

## Ativação e isolamento

- `NEXT_PUBLIC_DEMO_MODE=true` (`src/lib/demo/mode.ts`). Por ser
  `NEXT_PUBLIC_`, o valor é fixado no build e igual no servidor e no
  navegador, o que evita divergência na hidratação.
- Com o modo ligado, `getCatalogSource()` devolve `demo`: o servidor não
  consulta o Supabase e `isCheckoutEnabled()` fica falso. O `proxy.ts` não
  exige sessão, e as páginas do painel renderizam as telas de
  `components/demo/` em vez das que chamam `requireAdmin()`. As Server
  Actions reais continuam exigindo administradora.
- `next.config.ts` chama `assertDeploymentConfig()`
  (`src/lib/demo/deployment.ts`), que separa dois modos explícitos: loja real
  (padrão) e demonstração. Com `VERCEL_ENV=production`, a demonstração só é
  construída com `ALLOW_DEMO_IN_PRODUCTION=true` **e** sem nenhuma variável do
  Supabase no ambiente: enquanto não existe loja real, o domínio principal
  pode servir a demonstração; quando o Supabase for configurado em produção,
  o build exige remover as variáveis da demonstração. Valores ambíguos
  (`1`, `TRUE`, autorização sem o modo ligado) também interrompem o build.
- Na demonstração, toda mensagem do WhatsApp começa com
  `[DEMONSTRAÇÃO] Mensagem de teste…`, porque o link abre o número real da
  loja.
- Nenhum arquivo do Supabase (migrações, clientes, ações) foi removido.

## Dados no navegador

- `src/lib/demo/model.ts`: estado e regras **puras** (criar, editar,
  ativar, excluir, fotos, categorias, status de pedidos) e as "visões" lidas
  pela loja (`storefrontProducts`) e pelo painel (`adminProducts`,
  `summarize`). As regras repetem as do banco: slug único, produto com pedido
  não é excluído, categoria com produtos não é excluída, categoria inativa
  esconde o rótulo, produto inativo some da loja.
- `src/lib/demo/storage.ts`: leitura e gravação em uma única chave
  (`lojinha-da-bruna:demo:v1`), com orçamento de 4 milhões de caracteres,
  detecção de cota esgotada, armazenamento bloqueado e JSON inválido (cópia em
  `…:corrompido` e volta aos dados iniciais). A gravação é feita antes de
  atualizar a tela: se o navegador recusar, nada muda.
- `src/lib/demo/store.ts`: ponto único de acesso. `useDemoSnapshot()`
  (`useSyncExternalStore`, snapshot do servidor `null`) é lido pela loja e
  pelo painel, então os dois mostram sempre o mesmo estado; o evento
  `storage` sincroniza abas. O `localStorage` nunca é lido no servidor, e o
  primeiro render do cliente mostra o mesmo esqueleto do HTML do servidor.
- `CatalogRepository` (assíncrono) é a interface de escrita. Uma
  implementação via Server Actions/Supabase pode substituí-la sem alterar os
  componentes.
- `src/lib/demo/admin-actions.ts` adapta o repositório à assinatura das
  Server Actions (`(state, formData) => ActionState`), com a mesma validação
  (`parseProductForm`) e as mesmas mensagens (`lib/admin/mutation-messages.ts`).
  Assim `ProductForm`, `CategoryForm`, `ImageManager`, `ActionButton` e
  `ProductRow` são os mesmos nos dois modos.
- Ids gerados com `crypto.randomUUID`, com alternativa via
  `getRandomValues` para acesso por HTTP na rede local (contexto não seguro).

## Vitrine

- As partes visuais foram extraídas para componentes compartilhados
  (`catalog-results.tsx`, `product-detail.tsx`, `home-sections.tsx`); as
  páginas escolhem a origem (servidor ou navegador). URLs inalteradas.
- O carrinho foi dividido em `CartContents` (apresentação) com duas fontes:
  `CartView` (server action) e `DemoCartView` (catálogo local). Na
  demonstração, o botão abre o WhatsApp com os produtos do carrinho e avisa
  que eles são fictícios (ver "Integração com o WhatsApp").

## Fotos

- Guardadas como `data:` URL (WebP/JPEG), após redução para 800 px e
  compressão progressiva até 200 KB (`lib/admin/prepare-image.ts`, também
  usada no envio ao Supabase com os limites antigos de 1600 px/4 MB). Máximo
  de 3 por produto. Ao ler o armazenamento, só são aceitas URLs
  `data:image/(webp|jpeg|png)` e as ilustrações dos produtos iniciais
  (`/demo/produtos/<nome>.webp`, 1000 px, ~10 KB cada). Elas são desenhos
  criados para a demonstração, não fotos de produtos reais, e passam pelo
  otimizador de imagens do Next como qualquer arquivo de `public/`.
- IndexedDB comportaria mais fotos, mas exigiria leitura assíncrona e URLs
  de objeto em cada render. Para uma demonstração, o `localStorage` com
  orçamento e mensagens claras foi considerado suficiente.

## Pedidos de demonstração

- Apenas os três pedidos iniciais, fictícios. O carrinho não grava pedidos
  na demonstração: ele só abre o WhatsApp, e o cliente decide se envia.
- `/admin/pedidos` só existe no modo demonstração (404 fora dele).

---

# Decisões — Integração com o WhatsApp

- **Número em um único lugar:** `STORE_WHATSAPP_NUMBER` em
  `src/config/store.ts` (`555481394629`). `WHATSAPP_NUMBER` continua
  aceito como substituição por ambiente; vazio ou inválido usa o oficial. O
  número é lido no servidor e passado às telas como propriedade.
- **Dois modos de finalização** (`Checkout` em `carrinho/cart-view.tsx`):
  com Supabase e chave secreta, o fluxo da Etapa 2 (grava o pedido e depois
  abre o WhatsApp); nos demais casos, inclusive no modo demonstração, um link
  `wa.me` direto (`buildCartWhatsappLink`). O fluxo com Supabase abre na
  mesma aba, porque a URL só existe depois da resposta do servidor e abrir
  uma aba após uma espera é bloqueado pelos navegadores.
- **Link comum, em nova aba** (`<a target="_blank" rel="noopener noreferrer">`),
  e não `window.open`: respeita o comportamento do navegador (abrir em aba,
  copiar link) e nunca é barrado como pop-up. A mensagem usa
  `encodeURIComponent`.
- **Dados atuais:** a mensagem é montada a partir de `summarizeCart`, com os
  produtos do catálogo (servidor, ou repositório local na demonstração),
  nunca de valores guardados no carrinho. Só itens compráveis entram, com a
  quantidade limitada ao estoque. No modo servidor, o carrinho relê o
  catálogo quando a aba volta ao primeiro plano; na demonstração, o estado
  local já é sempre o atual.
- **Botão desativado** quando nenhum item pode ser comprado (carrinho vazio
  mostra o estado vazio, sem botão).
- **Texto da mensagem:** sem frete, desconto, taxa ou forma de pagamento;
  informa que o valor é só dos produtos e pede a confirmação da
  disponibilidade. O site nunca diz que o pedido foi enviado ou confirmado.
- **Página de produto:** botão "Tirar dúvidas pelo WhatsApp" com o nome, a
  marca e o preço (quando confirmado), também para produtos esgotados ou com
  preço a confirmar.
