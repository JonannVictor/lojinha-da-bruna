# Lojinha da Bruna

Loja multimarcas (beleza, perfumaria, cuidados pessoais e variedades) com
carrinho e finalização do pedido pelo WhatsApp. Desenvolvida pela Hineni Agency.

**Etapa atual:** 1 — fundação e vitrine (início, catálogo, produto e carrinho).

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript estrito · Tailwind CSS 4 ·
Vitest · Supabase (próxima etapa) · Vercel.

## Como rodar

```bash
npm install
cp .env.example .env.local   # ajuste CATALOG_SOURCE=demo para ver produtos fictícios
npm run dev
```

| Comando             | O que faz                         |
| ------------------- | --------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento       |
| `npm run typecheck` | Verificação de tipos (TypeScript) |
| `npm run lint`      | ESLint                            |
| `npm test`          | Testes unitários (Vitest)         |
| `npm run build`     | Build de produção                 |

> **Atenção:** o build (Turbopack) e o Vitest falham quando o caminho da pasta
> contém `#` (ex.: `...\#Bruna\...`). Mantenha o projeto num caminho sem `#`.
> Na Vercel isso não ocorre.

## Estrutura

```
src/
  app/                 rotas: / , /produtos , /produtos/[slug] , /carrinho
  components/          componentes de interface
  config/store.ts      informações comerciais configuráveis
  lib/products/        tipos, regras de disponibilidade, busca e repositório
  lib/cart/            regras do carrinho e persistência no navegador
docs/
  decisoes.md          decisões de arquitetura
  configuracao.md      variáveis de ambiente e pendências do proprietário
```
