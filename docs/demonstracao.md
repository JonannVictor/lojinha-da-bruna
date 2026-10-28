# Modo demonstração

Versão da loja para apresentar à Bruna **sem Supabase**: a vitrine e o painel
funcionam por completo, mas os dados ficam salvos apenas no navegador de quem
está usando (`localStorage`). Nada é enviado a um servidor, e nenhum pedido é
criado.

> **Não é um ambiente de produção.** O painel abre sem login, os dados são
> fictícios e qualquer pessoa com acesso ao navegador pode alterá-los. Não use
> este modo para dados reais ou sensíveis.

## Como ativar

1. Em `.env.local`, defina:

   ```bash
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. Reinicie o servidor (`npm run dev`) ou gere um novo build
   (`npm run build && npm start`). Por ser `NEXT_PUBLIC_`, o valor é fixado
   no momento do build.

Para desativar, remova a variável (ou use qualquer valor diferente de `true`) e
reinicie. A implementação com Supabase continua intacta e volta a ser usada.

Com o modo ligado, o servidor nunca consulta o Supabase, mesmo que as
variáveis dele estejam preenchidas, e a finalização pelo WhatsApp fica sempre
desativada.

**Proteção contra produção:** o build falha se `NEXT_PUBLIC_DEMO_MODE=true` e
`VERCEL_ENV=production`. Para mostrar a demonstração pela Vercel, use um
deploy de **Preview**. (Nenhum deploy foi feito nesta etapa.)

## Como acessar

- Loja: `http://localhost:3000/`
- Painel: `http://localhost:3000/admin` (sem login; `/admin/login` apenas
  explica isso e leva ao painel)

Uma faixa amarela identifica a demonstração na loja e no painel, e o
carrinho informa que a finalização está desativada.

## O que dá para fazer

| Área | Recursos |
| --- | --- |
| Início do painel | Produtos cadastrados, ativos, inativos e pedidos de demonstração; pendências do catálogo; pedidos de exemplo; atividade recente; atalhos para novo produto e para a loja. |
| Produtos | Busca por nome ou marca, filtros por categoria e status, cadastro, edição, ativação/desativação, exclusão com confirmação, até 3 fotos por produto com pré-visualização. |
| Categorias | Criação, edição de nome e endereço, ordem, ativação/desativação e exclusão (só sem produtos). |
| Pedidos | Pedidos fictícios `DEMO-…`, com itens, subtotal e troca de status. |
| Loja | Produtos e categorias do painel, busca, filtros, página do produto e carrinho. |

## Restaurar os dados iniciais

No painel, clique em **Restaurar dados iniciais** (na faixa amarela, em
qualquer página) e confirme. Tudo o que foi alterado neste navegador é
descartado, os dados de exemplo voltam e o carrinho é esvaziado.

Alternativa manual: nas ferramentas do navegador (Aplicativo → Armazenamento
local), apague a chave `lojinha-da-bruna:demo:v1`.

## Dados de exemplo

Oito produtos **fictícios** (nome terminado em “(exemplo)”, marca “Marca
fictícia”, sem fotos), as quatro categorias do briefing e três pedidos
`DEMO-001` a `DEMO-003` de “Cliente de demonstração”. Nenhum deles representa
um produto, preço ou venda real da Bruna. Os exemplos cobrem os estados da
loja: esgotado, preço a confirmar e inativo.

## Fotos e limites do navegador

- O `localStorage` comporta cerca de 5 milhões de caracteres por site. A
  demonstração reserva até 4 milhões e mostra no painel o percentual usado.
- Cada foto é reduzida no navegador para no máximo 800 px e comprimida (WebP,
  ou JPEG) até caber em 200 KB. Isso dá, em média, algumas dezenas de fotos.
- Se não houver espaço, a foto não é salva e o painel explica as
  alternativas: usar uma foto menor, remover fotos de outros produtos ou
  manter o produto sem foto (a loja mostra “Foto em breve”).
- Dados ilegíveis (JSON inválido) são substituídos pelos dados iniciais, com
  aviso no painel; a cópia original fica em
  `lojinha-da-bruna:demo:v1:corrompido`.
- Em janelas anônimas que bloqueiam o armazenamento, a demonstração funciona,
  mas as alterações se perdem ao recarregar (o painel avisa).

## Limitações

- Os dados existem só naquele navegador, naquele aparelho. O que for
  cadastrado no computador não aparece no celular, e vice-versa.
- Abas do mesmo navegador ficam sincronizadas; navegadores diferentes, não.
- O Safari pode apagar o armazenamento de sites não visitados por 7 dias.
- O título da aba na página de produto é genérico (“Produto (demonstração)”),
  porque o servidor não conhece os produtos salvos no navegador.
