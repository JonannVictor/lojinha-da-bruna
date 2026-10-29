# Configuração

## Variáveis de ambiente

| Variável                               | Obrigatória      | Exposta ao navegador | Descrição                                                                                                                  |
| -------------------------------------- | ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Para o catálogo e o painel | Sim        | URL do projeto Supabase (`https://<ref>.supabase.co`).                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Para o catálogo e o painel | Sim        | Chave publicável (`sb_publishable_…`). O acesso é limitado pelo RLS.                                                       |
| `SUPABASE_SECRET_KEY`                  | Para pedidos     | **Não**              | Chave secreta (`sb_secret_…`). Usada apenas no servidor, para executar `create_order`. Nunca use prefixo `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_DEMO_MODE`                | Não              | Sim                  | `true`: modo demonstração (dados no navegador, painel sem login, sem Supabase). Vazio ou `false`: loja real. Outros valores interrompem o build. Ver [demonstracao.md](demonstracao.md). |
| `ALLOW_DEMO_IN_PRODUCTION`             | Não              | Não                  | `true`: autoriza a demonstração no ambiente Production da Vercel (domínio principal), somente se esse ambiente não tiver variáveis do Supabase. Exige `NEXT_PUBLIC_DEMO_MODE=true`. Ver [demonstracao.md](demonstracao.md). |
| `CATALOG_SOURCE`                       | Não              | Não                  | Vazio: Supabase, se configurado; senão, catálogo vazio. `demo`: produtos fictícios (ignorado em produção). `empty`: força o catálogo vazio. |
| `WHATSAPP_NUMBER`                      | Não              | Não                  | Substitui o número oficial (definido em `src/config/store.ts`) neste ambiente, ex.: um número de teste. Só dígitos, com DDI 55 e DDD. Vazio ou inválido: usa o oficial. |

Localmente, use `.env.local` (copie de `.env.example`). Na Vercel, cadastre em
Project → Settings → Environment Variables, ou com `vercel env add`. Um novo
deploy é necessário depois de alterar uma variável.

## WhatsApp

O número que recebe os pedidos é **+55 54 8139-4629**. Ele fica em um único
lugar: a constante `STORE_WHATSAPP_NUMBER` em `src/config/store.ts`. Para
trocá-lo, altere essa linha (só dígitos: 55 + DDD + número). Rodapé, carrinho
e páginas de produto usam esse valor.

O botão "Finalizar pedido pelo WhatsApp" funciona de duas formas:

- **Sem Supabase (ou no modo demonstração):** abre o WhatsApp em nova aba com
  a lista de produtos, quantidades, preços, subtotais e total já escritos. O
  cliente revisa e envia; o site não registra o pedido.
- **Com Supabase e `SUPABASE_SECRET_KEY`:** o pedido é gravado no banco
  (`create_order`) e só então o WhatsApp é aberto, na mesma aba.

Em ambos os casos, só entram itens disponíveis, com preço e estoque atuais.
A mensagem informa que o valor é apenas dos produtos e que a entrega é
combinada com a Bruna. O pedido nunca é declarado confirmado.

## Pix

O carrinho mostra um QR Code Pix (e o "Pix copia e cola") com o total dos
produtos. O cliente paga, finaliza pelo WhatsApp e envia o comprovante na
conversa. A mensagem informa "Pix de R$ X pelo QR Code do site" e que a
entrega é combinada à parte. Se faltar algum item, a Bruna devolve o valor.

O código é um BR Code estático gerado no próprio site
(`src/lib/payments/pix.ts`), sem intermediário: o dinheiro cai direto na
conta da chave. O site não confirma o pagamento sozinho; quem confere é a
Bruna, pelo comprovante e pelo extrato.

Para ativar, preencha `STORE_PIX` em `src/config/store.ts`:

- `key`: CPF/CNPJ, e-mail, chave aleatória ou telefone **com +55**
  (ex.: `"+5554981394629"`; 11 dígitos sem `+55` são lidos como CPF);
- `receiverName`: nome do titular, como aparece no banco;
- `city`: cidade do titular.

Enquanto os três estiverem `null`, o QR Code não aparece e a mensagem diz
"Entrega e forma de pagamento a combinar". Uma configuração incompleta ou
inválida interrompe o build. A demonstração usa a mesma configuração: o QR Code
só aparece depois que a chave real for preenchida.

Passo a passo do Supabase (projeto, migrações, Storage, primeira
administradora e validação de segurança): [supabase.md](supabase.md).

## Informações pendentes do proprietário

Nada abaixo foi inventado. Os campos ficam vazios até a confirmação:

- [x] Número de WhatsApp para pedidos: +55 54 8139-4629 (`src/config/store.ts`).
- [ ] Lista de produtos com nome, marca, preço, descrição, estoque e
      categoria confirmados (cadastro pelo painel `/admin`).
- [ ] Fotos reais dos produtos (ou autorização para fotografá-los).
- [ ] Categorias definitivas. As atuais vêm do briefing: Beleza, Perfumaria,
      Cuidados pessoais e Variedades. Podem ser editadas no painel.
- [ ] E-mail da conta administradora da Bruna (ver [supabase.md](supabase.md#6-primeira-administradora)).
- [ ] Instagram, cidade/região de atendimento e horário (em `src/config/store.ts`).
- [ ] Cor de destaque e eventual logotipo da loja (em `src/app/globals.css`).
- [ ] Chave Pix, nome do titular e cidade (`STORE_PIX` em `src/config/store.ts`).
- [ ] Política de entrega/retirada e formas de pagamento além do Pix.
