-- Ticket 3 : profil « Mon entreprise » (une ligne par compte) + stockage du logo.
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run
-- (ou `supabase db push` si la CLI est liée au projet).

-- 1. Table ---------------------------------------------------------------------
create table if not exists public.companies (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  siret      text not null check (siret ~ '^[0-9]{14}$'),
  address    text not null check (char_length(address) between 5 and 300),
  phone      text not null check (phone ~ '^(\+33|0)[1-9][0-9]{8}$'),
  vat_mode   text not null check (vat_mode in ('subject', 'franchise')),
  logo_path  text check (logo_path is null or char_length(logo_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.companies is 'Identité de l’entreprise de l’artisan, affichée sur ses devis et factures.';
comment on column public.companies.vat_mode is 'subject = facture la TVA ; franchise = TVA non applicable, art. 293 B du CGI.';
comment on column public.companies.logo_path is 'Chemin dans le bucket « logos » : <user_id>/<fichier>.';

-- 2. updated_at automatique -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- 3. RLS : chaque artisan ne voit et ne modifie que sa propre ligne -------------
alter table public.companies enable row level security;

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own" on public.companies
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own" on public.companies
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- Pas de policy DELETE : la ligne disparaît seulement avec le compte (on delete cascade).

-- 4. Stockage des logos ---------------------------------------------------------
-- Bucket public en lecture (le logo apparaîtra sur les devis envoyés aux clients, sans compte).
-- Écriture limitée au dossier de l'artisan : logos/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "logos_select_own" on storage.objects;
create policy "logos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos_insert_own" on storage.objects;
create policy "logos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos_update_own" on storage.objects;
create policy "logos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos_delete_own" on storage.objects;
create policy "logos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
