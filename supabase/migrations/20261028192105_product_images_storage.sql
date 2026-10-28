-- Lojinha da Bruna — Etapa 2: bucket de fotos dos produtos.
--
-- Regras:
--   * Bucket público para LEITURA por URL (as fotos aparecem na vitrine).
--     Não há política de SELECT pública: ninguém lista o conteúdo do bucket.
--   * Tamanho máximo de 5 MB e apenas JPEG, PNG e WebP (validado pelo
--     Storage, além da validação no servidor da aplicação).
--   * Só administradoras enviam e excluem arquivos, sempre em
--     products/<product_id>/<arquivo>.
--   * Não existe política de UPDATE: um arquivo nunca é sobrescrito nem
--     movido. Cada envio usa um nome aleatório novo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product-images: administradoras enviam"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin())
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'products'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Necessária para a API do Storage localizar o objeto ao excluir.
create policy "product-images: administradoras leem metadados"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin())
  );

create policy "product-images: administradoras excluem"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin())
  );
