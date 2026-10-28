# Configuração

## Variáveis de ambiente

| Variável          | Obrigatória | Descrição                                                                                  |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `CATALOG_SOURCE`  | Não         | `empty` (padrão) ou `demo`. `demo` é ignorado em produção.                                  |
| `WHATSAPP_NUMBER` | Pendente    | Número da Bruna, só dígitos, com DDI 55 e DDD. Enquanto vazio, o link não aparece no rodapé. |

Localmente, use `.env.local` (copie de `.env.example`). Na Vercel, cadastre em
Project → Settings → Environment Variables, ou com `vercel env add`. Um novo
deploy é necessário depois de alterar uma variável.

Nenhuma chave secreta é usada nesta etapa. As variáveis do Supabase entram na
próxima etapa, e a chave `service_role` nunca deve ser exposta ao navegador.

## Informações pendentes do proprietário

Nada abaixo foi inventado. Os campos ficam vazios até a confirmação:

- [ ] Número de WhatsApp para pedidos (`WHATSAPP_NUMBER`).
- [ ] Lista de produtos com nome, marca, preço, descrição, estoque e
      categoria confirmados.
- [ ] Fotos reais dos produtos (ou autorização para fotografá-los).
- [ ] Categorias definitivas. As atuais vêm do briefing: Beleza, Perfumaria,
      Cuidados pessoais e Variedades.
- [ ] Instagram, cidade/região de atendimento e horário (em `src/config/store.ts`).
- [ ] Cor de destaque e eventual logotipo da loja (em `src/app/globals.css`).
- [ ] Política de entrega/retirada e formas de pagamento.
