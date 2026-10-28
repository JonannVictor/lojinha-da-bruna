# Supabase — configuração e segurança

Guia para conectar a Lojinha da Bruna a um projeto Supabase, provisionar a
primeira administradora e validar as regras de acesso.

> **Estado atual (28/10/2026):** as migrações em `supabase/migrations/` foram
> escritas e testadas localmente num Postgres embutido (PGlite, ver
> [Testes](#testes-automatizados)), mas **ainda não foram aplicadas em nenhum
> projeto Supabase remoto**. Não havia acesso autorizado a um projeto durante a
> Etapa 2.

## Modelo de acesso

| Quem                               | Como acessa                                      | O que pode fazer                                                                 |
| ---------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| Visitante da loja (`anon`)         | Chave publicável, sem sessão                     | Ler categorias e produtos **ativos**. Nada mais.                                 |
| Conta autenticada comum            | Chave publicável + sessão                        | O mesmo que o visitante. Não vira administradora.                                |
| Administradora                     | Chave publicável + sessão + linha em `admin_users` | Gerenciar produtos, categorias e fotos; ler pedidos e alterar o status.          |
| Servidor da aplicação              | Chave secreta (`SUPABASE_SECRET_KEY`)            | Só executa `public.create_order` (registro de pedidos).                          |

- A autorização está no banco (RLS), não só na interface. O painel também
  verifica a sessão (`getClaims()`) e a tabela `admin_users` em **toda**
  página e Server Action (`src/lib/auth/admin.ts`).
- As operações do painel usam a sessão da própria administradora. A chave
  secreta nunca é usada para o CRUD do catálogo.
- `admin_users` não aceita `INSERT`, `UPDATE` nem `DELETE` de `anon` ou
  `authenticated`: ninguém se promove pelo app ou pela API.
- Remover a linha de `admin_users` corta o acesso na requisição seguinte, sem
  esperar o token expirar.

### Tabelas

| Tabela        | Leitura pública         | Escrita                                      |
| ------------- | ----------------------- | -------------------------------------------- |
| `categories`  | Só `is_active = true`   | Administradoras                              |
| `products`    | Só `is_active = true`   | Administradoras                              |
| `admin_users` | A própria linha (autenticada) | Apenas SQL Editor / service role       |
| `orders`      | Não                     | `create_order` (service role); status pelas administradoras |
| `order_items` | Não                     | `create_order` (service role)                |

Desde 2026, o Supabase deixou de expor automaticamente tabelas novas à Data
API. Por isso cada migração já traz os `GRANT`s mínimos junto com o RLS.

## 1. Criar ou conectar o projeto

1. Em <https://supabase.com/dashboard>, crie um projeto (região sugerida:
   São Paulo, `sa-east-1`). Recomenda-se **um projeto de teste** e outro de
   produção.
2. Anote o *Project ref* (Project Settings → General).
3. Em Project Settings → API Keys, copie:
   - **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
   - **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (somente servidor).

Não reaproveite chaves ou `.env` de outros projetos.

## 2. Variáveis de ambiente

Veja a tabela completa em [configuracao.md](configuracao.md). Resumo:

```bash
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# SUPABASE_SECRET_KEY só é necessária quando os pedidos forem ligados
```

Na Vercel: Project → Settings → Environment Variables (ou `vercel env add`).
Marque `SUPABASE_SECRET_KEY` como *Sensitive*. Variáveis `NEXT_PUBLIC_*` são
embutidas no build: um novo deploy é necessário depois de alterá-las.

A aplicação recusa iniciar se a chave secreta for colocada por engano em
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## 3. Aplicar as migrações

As migrações são aditivas (criam schema, tabelas, políticas e o bucket; nada é
apagado). Aplique primeiro no projeto de **teste**.

### Opção A — Supabase CLI (recomendada)

A CLI está nas dependências de desenvolvimento (`npx supabase`).

```bash
# Autentique com um token de acesso pessoal com escopo limitado ao projeto
# (Account → Access Tokens). Evite o login pelo navegador, que gera um token
# com acesso total à conta.
export SUPABASE_ACCESS_TOKEN=...        # não versione

npx supabase link --project-ref <ref>
npx supabase db push --dry-run          # confira a lista de migrações
npx supabase db push
npx supabase migration list             # local e remoto devem coincidir
```

### Opção B — SQL Editor

No painel, SQL Editor → New query. Cole e execute **na ordem**:

1. `supabase/migrations/20261028192058_admin_and_catalog.sql`
2. `supabase/migrations/20261028192101_orders.sql`
3. `supabase/migrations/20261028192105_product_images_storage.sql`

Nessa opção, o histórico de migrações da CLI não é registrado. Prefira a
opção A para manter teste e produção sincronizados.

### Depois de aplicar

Em Advisors → Security Advisor, rode a verificação e trate qualquer alerta
novo. O esperado: RLS ativo em todas as tabelas de `public` e nenhuma função
`SECURITY DEFINER` exposta (não há nenhuma nesta etapa).

## 4. Configurar o Auth

Em Authentication → Sign In / Providers e Authentication → URL Configuration:

- **Desative "Allow new users to sign up".** Contas são criadas pela equipe.
  Mesmo com cadastro aberto, uma conta nova não teria acesso ao painel; o
  bloqueio evita contas inúteis.
- Mantenha desativados os *anonymous sign-ins*.
- **Site URL:** a URL de produção da loja. Em *Redirect URLs*, inclua também
  `http://localhost:3000/**` no projeto de teste.
- Política de senha: mínimo de 10 caracteres, com letras maiúsculas,
  minúsculas e números (o `supabase/config.toml` local já usa essa regra).
- Recomendado: ativar MFA (TOTP) para as administradoras numa próxima etapa.

## 5. Storage (fotos dos produtos)

A migração `…_product_images_storage.sql` cria o bucket e as políticas. Não é
preciso criá-lo à mão.

| Regra                     | Valor                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| Bucket                    | `product-images`, **público para leitura por URL**                    |
| Tamanho máximo            | 5 MB pelo bucket; 4 MB pelo app (limite de corpo da Vercel)           |
| Tipos aceitos             | `image/jpeg`, `image/png`, `image/webp`. O app confere a assinatura do arquivo, não só a extensão |
| Caminho                   | `products/<id do produto>/<nome aleatório>.<ext>`                    |
| Envio (`INSERT`)          | Só administradoras, só nesse caminho e com essas extensões            |
| Exclusão (`DELETE`)       | Só administradoras                                                    |
| Sobrescrita (`UPDATE`)    | **Ninguém**: não há política de UPDATE; cada envio usa um nome novo   |
| Listagem                  | Só administradoras. Visitantes leem apenas pela URL exata da foto     |

Para evitar fotos quebradas na loja, o app grava o caminho no produto **depois**
do envio e o remove do produto **antes** de apagar o arquivo. O navegador
reduz as fotos para no máximo 1600 px antes de enviar.

Para conferir: Storage → `product-images` → Policies deve listar as três
políticas `product-images: …`; em *Bucket settings*, os limites acima.

## 6. Primeira administradora

Não existe tela de cadastro de administradora. O provisionamento é manual e
feito por quem tem acesso ao painel do Supabase:

1. **Authentication → Users → Add user → Create new user.** Informe o e-mail
   da Bruna (ou de quem vai administrar), uma senha forte temporária e marque
   *Auto Confirm User*. Repasse a senha por um canal seguro e peça a troca.
   Alternativa: *Send invitation*, se o SMTP estiver configurado.
2. **SQL Editor**, trocando o e-mail:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'email-da-administradora@exemplo.com'
   on conflict do nothing;

   -- confira:
   select u.email, a.created_at
   from public.admin_users a join auth.users u on u.id = a.user_id;
   ```

3. Acesse `/admin/login` com essa conta.

Para **revogar** um acesso:

```sql
delete from public.admin_users
where user_id = (select id from auth.users where email = 'email@exemplo.com');
```

O painel deixa de funcionar para essa conta na requisição seguinte. Para
encerrar também as sessões, use Authentication → Users → (usuária) → *Sign out
user*, ou exclua a conta.

## 7. Executar localmente

```bash
npm install
cp .env.example .env.local     # preencha com as chaves do projeto de TESTE
npm run dev
```

- Loja: <http://localhost:3000>
- Painel: <http://localhost:3000/admin>

Sem as variáveis do Supabase, a loja fica com catálogo vazio (ou fictício
com `CATALOG_SOURCE=demo`) e o painel mostra um aviso de configuração.

Com Docker instalado, é possível subir um Supabase local com
`npx supabase start` (aplica as migrações e usa `supabase/config.toml`).
Esse caminho não foi testado nesta etapa, porque a máquina de
desenvolvimento não tinha Docker.

## 8. Validar a segurança

Depois de aplicar as migrações no projeto de teste, rode as checagens abaixo.
Elas usam apenas a chave **publicável**, como um visitante qualquer. Defina as
variáveis no terminal sem gravá-las em arquivos versionados.

```bash
URL="$NEXT_PUBLIC_SUPABASE_URL"; KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
H=(-H "apikey: $KEY" -H "Content-Type: application/json")

# 1. Visitante lê produtos: só ativos devem voltar
curl -s "$URL/rest/v1/products?select=name,is_active" "${H[@]}"

# 2. Visitante NÃO consegue criar produto (esperado: 401/403, "permission denied")
curl -s -X POST "$URL/rest/v1/products" "${H[@]}" -d '{"name":"x","slug":"x"}'

# 3. Visitante NÃO lê administradoras nem pedidos (esperado: erro de permissão)
curl -s "$URL/rest/v1/admin_users?select=*" "${H[@]}"
curl -s "$URL/rest/v1/orders?select=*" "${H[@]}"

# 4. Visitante NÃO cria pedidos direto pela API (esperado: permission denied)
curl -s -X POST "$URL/rest/v1/rpc/create_order" "${H[@]}" \
  -d '{"p_customer_name":"x","p_customer_phone":null,"p_delivery_address":null,"p_items":[]}'

# 5. Visitante NÃO envia arquivos ao bucket (esperado: 400/403, RLS)
curl -s -X POST "$URL/storage/v1/object/product-images/products/00000000-0000-4000-8000-000000000000/x.png" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: image/png" --data-binary 'x'
```

No SQL Editor:

```sql
-- RLS ativo em todas as tabelas de public (esperado: nenhuma linha)
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- Políticas existentes
select schemaname, tablename, policyname, roles, cmd from pg_policies
where schemaname in ('public', 'storage') order by 1, 2, 3;
```

No app, com uma conta **sem** linha em `admin_users`: o login deve recusar o
acesso ("Esta conta não tem permissão…").

## Testes automatizados

`npm test` inclui `supabase/tests/database.test.ts`, que aplica as três
migrações num Postgres 18 embutido (PGlite) e testa como `anon`, como
usuária autenticada comum, como administradora e como `service_role`:
leitura de ativos, bloqueio de escrita, autopromoção, `create_order` atômico,
histórico de pedidos e políticas do Storage.

Limites dessa simulação (`supabase/tests/support/database.ts`):

- os papéis, `auth.uid()` e as tabelas do Storage são versões mínimas das
  do Supabase, sem o serviço HTTP do Storage nem o Auth;
- os limites de tamanho e de MIME do bucket são aplicados pelo serviço de
  Storage e não são exercitados nesses testes.

Por isso a validação do item 8 no projeto real continua necessária.
