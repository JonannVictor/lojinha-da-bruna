# Lojinha da Bruna

Loja multimarcas (beleza, perfumaria, cuidados pessoais e variedades) com
carrinho e finalização do pedido pelo WhatsApp. Desenvolvida pela Hineni Agency.

**Etapa atual:** 2 — Supabase e painel administrativo (`/admin`).
Etapa 1: vitrine (início, catálogo, produto e carrinho).

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript estrito · Tailwind CSS 4 ·
Supabase (Postgres, Auth, Storage) · Vitest · Vercel.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha o Supabase (docs/supabase.md)
npm run dev
```

Sem Supabase configurado, o catálogo fica vazio. Use `CATALOG_SOURCE=demo`
para ver produtos fictícios, fora de produção.

| Comando             | O que faz                                              |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento                            |
| `npm run typecheck` | Verificação de tipos (TypeScript)                      |
| `npm run lint`      | ESLint                                                 |
| `npm test`          | Testes (Vitest), incluindo migrações e RLS via PGlite |
| `npm run build`     | Build de produção                                      |

> **Atenção:** o build (Turbopack) e o Vitest falham quando o caminho da pasta
> contém `#` (ex.: `...\#Bruna\...`). Mantenha o projeto num caminho sem `#`.
> Na Vercel isso não ocorre.

## Painel administrativo

`/admin`: produtos (cadastro, edição, fotos, ativação), categorias e resumo
do catálogo. O acesso exige uma conta listada em `admin_users`. Não há
cadastro público. Veja como criar a primeira administradora em
[docs/supabase.md](docs/supabase.md#6-primeira-administradora).

## Estrutura

```
src/
  app/(loja)/          vitrine: / , /produtos , /produtos/[slug] , /carrinho
  app/admin/           painel: /admin/login , /admin , /admin/produtos , /admin/categorias
  proxy.ts             renova a sessão do Supabase e protege /admin
  components/          componentes da loja; components/admin/ para o painel
  config/store.ts      informações comerciais configuráveis
  lib/products/        tipos, regras de disponibilidade, busca e repositório
  lib/cart/            regras do carrinho e persistência no navegador
  lib/admin/           validação e operações do painel (catálogo e fotos)
  lib/auth/admin.ts    verificação de administradora (toda página e ação)
  lib/orders/          checkout, criação do pedido e mensagem do WhatsApp
  lib/supabase/        clientes (público, sessão, secreto) e configuração
supabase/
  migrations/          schema, RLS, pedidos e bucket de fotos
  tests/               testes das migrações e políticas (PGlite)
docs/
  decisoes.md          decisões de arquitetura
  configuracao.md      variáveis de ambiente e pendências do proprietário
  supabase.md          configuração do Supabase, administradoras e segurança
```
