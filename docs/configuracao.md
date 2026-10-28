# Configuração

## Variáveis de ambiente

| Variável                               | Obrigatória      | Exposta ao navegador | Descrição                                                                                                                  |
| -------------------------------------- | ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Para o catálogo e o painel | Sim        | URL do projeto Supabase (`https://<ref>.supabase.co`).                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Para o catálogo e o painel | Sim        | Chave publicável (`sb_publishable_…`). O acesso é limitado pelo RLS.                                                       |
| `SUPABASE_SECRET_KEY`                  | Para pedidos     | **Não**              | Chave secreta (`sb_secret_…`). Usada apenas no servidor, para executar `create_order`. Nunca use prefixo `NEXT_PUBLIC_`. |
| `CATALOG_SOURCE`                       | Não              | Não                  | Vazio: Supabase, se configurado; senão, catálogo vazio. `demo`: produtos fictícios (ignorado em produção). `empty`: força o catálogo vazio. |
| `WHATSAPP_NUMBER`                      | Pendente         | Não                  | Número da Bruna, só dígitos, com DDI 55 e DDD. Enquanto vazio, o link não aparece no rodapé e a finalização de pedidos fica desligada. |

Localmente, use `.env.local` (copie de `.env.example`). Na Vercel, cadastre em
Project → Settings → Environment Variables, ou com `vercel env add`. Um novo
deploy é necessário depois de alterar uma variável.

A finalização de pedidos só é ativada quando **as três** condições existem: o
catálogo vem do Supabase, `SUPABASE_SECRET_KEY` está definida e
`WHATSAPP_NUMBER` é válido. Sem isso, o botão "Finalizar pelo WhatsApp" segue
desativado, como na Etapa 1.

Passo a passo do Supabase (projeto, migrações, Storage, primeira
administradora e validação de segurança): [supabase.md](supabase.md).

## Informações pendentes do proprietário

Nada abaixo foi inventado. Os campos ficam vazios até a confirmação:

- [ ] Número de WhatsApp para pedidos (`WHATSAPP_NUMBER`).
- [ ] Lista de produtos com nome, marca, preço, descrição, estoque e
      categoria confirmados (cadastro pelo painel `/admin`).
- [ ] Fotos reais dos produtos (ou autorização para fotografá-los).
- [ ] Categorias definitivas. As atuais vêm do briefing: Beleza, Perfumaria,
      Cuidados pessoais e Variedades. Podem ser editadas no painel.
- [ ] E-mail da conta administradora da Bruna (ver [supabase.md](supabase.md#6-primeira-administradora)).
- [ ] Instagram, cidade/região de atendimento e horário (em `src/config/store.ts`).
- [ ] Cor de destaque e eventual logotipo da loja (em `src/app/globals.css`).
- [ ] Política de entrega/retirada e formas de pagamento.
