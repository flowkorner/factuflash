-- Ticket 4 : clients, devis (brouillons), lignes, numérotation, tarifs de l'artisan.
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run.
--
-- Pensé pour l'IA (plus tard) :
--   * quotes.description      = description libre du chantier (entrée de l'IA) ;
--   * price_items             = tarifs habituels de l'artisan (catalogue que l'IA réutilisera) ;
--   * source ('manual' | 'ai') sur le devis et sur chaque ligne, price_item_id pour tracer l'origine d'un prix.
-- Montants en centimes (bigint), quantités en numeric(12,3) : aucun calcul en virgule flottante.
-- Les totaux ne sont PAS stockés : la vue quote_summaries les calcule à partir des lignes (source unique de vérité).

-- 1. Clients ---------------------------------------------------------------------
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  email      text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  address    text check (address is null or char_length(address) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index clients_user_name_idx on public.clients (user_id, name);

-- 2. Tarifs de l'artisan (catalogue, utilisé plus tard par l'IA) -------------------
create table public.price_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label            text not null check (char_length(label) between 1 and 300),
  unit             text not null check (unit in ('u', 'h', 'jour', 'm', 'm2', 'm3', 'kg', 'forfait', 'lot')),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 100000000),
  vat_rate_bp      integer check (vat_rate_bp is null or vat_rate_bp in (0, 550, 1000, 2000)),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id)
);

-- 3. Devis -----------------------------------------------------------------------
create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id     uuid not null,
  number        text not null check (number ~ '^D-[0-9]{4}-[0-9]{3,}$'),
  status        text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  title         text not null check (char_length(title) between 1 and 160),
  site_address  text not null check (char_length(site_address) between 5 and 300),
  description   text check (description is null or char_length(description) <= 4000),
  issue_date    date not null default current_date,
  validity_days integer not null default 30 check (validity_days between 1 and 365),
  vat_mode      text not null check (vat_mode in ('subject', 'franchise')),
  source        text not null default 'manual' check (source in ('manual', 'ai')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, number),
  unique (id, user_id),
  -- Le client doit appartenir au même artisan (la RLS seule ne l'empêche pas sur une clé étrangère).
  foreign key (client_id, user_id) references public.clients (id, user_id) on delete restrict
);
create index quotes_user_updated_idx on public.quotes (user_id, updated_at desc);

-- 4. Lignes de devis -------------------------------------------------------------
create table public.quote_lines (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null,
  user_id          uuid not null default auth.uid(),
  position         integer not null check (position >= 0),
  designation      text not null check (char_length(designation) between 1 and 300),
  quantity         numeric(12, 3) not null check (quantity > 0 and quantity <= 999999),
  unit             text not null check (unit in ('u', 'h', 'jour', 'm', 'm2', 'm3', 'kg', 'forfait', 'lot')),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 100000000),
  vat_rate_bp      integer not null check (vat_rate_bp in (0, 550, 1000, 2000)),
  source           text not null default 'manual' check (source in ('manual', 'ai')),
  price_item_id    uuid,
  created_at       timestamptz not null default now(),
  unique (quote_id, position),
  foreign key (quote_id, user_id) references public.quotes (id, user_id) on delete cascade,
  foreign key (price_item_id, user_id) references public.price_items (id, user_id) on delete set null (price_item_id)
);

-- 5. Compteur de numérotation : D-<année>-<n° sur 3 chiffres>, par artisan et par an --
create table public.quote_counters (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year       integer not null check (year between 2000 and 2999),
  last_value integer not null check (last_value > 0),
  primary key (user_id, year)
);

-- 6. updated_at automatique (fonction créée par la migration companies) -------------
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger price_items_set_updated_at before update on public.price_items
  for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- 7. RLS : chacun ne voit et ne modifie que ses données ---------------------------
alter table public.clients enable row level security;
alter table public.price_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.quote_counters enable row level security;

create policy "clients_select_own" on public.clients for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "clients_insert_own" on public.clients for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "clients_update_own" on public.clients for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "price_items_all_own" on public.price_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "quotes_select_own" on public.quotes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "quotes_insert_own" on public.quotes for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- Seul un brouillon est modifiable.
create policy "quotes_update_own_draft" on public.quotes for update to authenticated
  using ((select auth.uid()) = user_id and status = 'draft')
  with check ((select auth.uid()) = user_id);

create policy "quote_lines_select_own" on public.quote_lines for select to authenticated
  using ((select auth.uid()) = user_id);
-- Lignes modifiables seulement sur un brouillon.
create policy "quote_lines_insert_own_draft" on public.quote_lines for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.quotes q where q.id = quote_id and q.status = 'draft')
  );
create policy "quote_lines_delete_own_draft" on public.quote_lines for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.quotes q where q.id = quote_id and q.status = 'draft')
  );

create policy "quote_counters_all_own" on public.quote_counters for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 8. Vue « Mes devis » : totaux calculés depuis les lignes -------------------------
-- Arrondis identiques au code TypeScript (src/features/quotes/domain/totals.ts) :
-- HT de ligne arrondi au centime, puis TVA arrondie par taux.
create view public.quote_summaries with (security_invoker = true) as
with line_ht as (
  select quote_id, vat_rate_bp, round(quantity * unit_price_cents) as ht_cents
  from public.quote_lines
),
by_rate as (
  select quote_id, vat_rate_bp, sum(ht_cents) as ht_cents
  from line_ht
  group by quote_id, vat_rate_bp
),
totals as (
  select quote_id,
         sum(ht_cents)::bigint as total_ht_cents,
         sum(round(ht_cents * vat_rate_bp / 10000.0))::bigint as total_vat_cents
  from by_rate
  group by quote_id
)
select q.id,
       q.number,
       q.status,
       q.title,
       q.issue_date,
       q.updated_at,
       c.name as client_name,
       coalesce(t.total_ht_cents, 0) as total_ht_cents,
       coalesce(t.total_vat_cents, 0) as total_vat_cents,
       coalesce(t.total_ht_cents, 0) + coalesce(t.total_vat_cents, 0) as total_ttc_cents
from public.quotes q
join public.clients c on c.id = q.client_id
left join totals t on t.quote_id = q.id;

-- 9. Enregistrement atomique d'un brouillon ---------------------------------------
-- Une seule transaction : client éventuel + devis + lignes + numéro.
-- security invoker : la RLS et les grants s'appliquent comme pour un appel direct.
create or replace function public.save_quote_draft(
  p_quote_id      uuid,
  p_client_id     uuid,
  p_new_client    jsonb,
  p_title         text,
  p_site_address  text,
  p_description   text,
  p_validity_days integer,
  p_lines         jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_vat_mode  text;
  v_client_id uuid := p_client_id;
  v_quote_id  uuid;
  v_year      integer := extract(year from current_date)::integer;
  v_seq       integer;
  v_count     integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select c.vat_mode into v_vat_mode from public.companies c where c.user_id = v_user;
  if v_vat_mode is null then
    raise exception 'company_missing' using errcode = 'P0001';
  end if;

  v_count := coalesce(jsonb_array_length(p_lines), 0);
  if v_count < 1 or v_count > 100 then
    raise exception 'invalid_lines' using errcode = 'P0001';
  end if;

  if v_client_id is null then
    if p_new_client is null then
      raise exception 'client_missing' using errcode = 'P0001';
    end if;
    insert into public.clients (user_id, name, email, address)
    values (
      v_user,
      p_new_client ->> 'name',
      nullif(p_new_client ->> 'email', ''),
      nullif(p_new_client ->> 'address', '')
    )
    returning id into v_client_id;
  end if;

  if p_quote_id is null then
    insert into public.quote_counters as qc (user_id, year, last_value)
    values (v_user, v_year, 1)
    on conflict (user_id, year) do update set last_value = qc.last_value + 1
    returning last_value into v_seq;

    insert into public.quotes (user_id, client_id, number, title, site_address, description, validity_days, vat_mode)
    values (
      v_user, v_client_id, format('D-%s-%s', v_year, lpad(v_seq::text, 3, '0')),
      p_title, p_site_address, nullif(p_description, ''), p_validity_days, v_vat_mode
    )
    returning id into v_quote_id;
  else
    update public.quotes
       set client_id = v_client_id,
           title = p_title,
           site_address = p_site_address,
           description = nullif(p_description, ''),
           validity_days = p_validity_days,
           vat_mode = v_vat_mode
     where id = p_quote_id and status = 'draft'
    returning id into v_quote_id;

    if v_quote_id is null then
      raise exception 'quote_not_editable' using errcode = 'P0001';
    end if;

    delete from public.quote_lines where quote_id = v_quote_id;
  end if;

  insert into public.quote_lines
    (quote_id, user_id, position, designation, quantity, unit, unit_price_cents, vat_rate_bp, source, price_item_id)
  select v_quote_id,
         v_user,
         (e.ord - 1)::integer,
         e.item ->> 'designation',
         (e.item ->> 'quantity')::numeric,
         e.item ->> 'unit',
         (e.item ->> 'unit_price_cents')::bigint,
         -- Franchise en base : TVA forcée à 0, quoi qu'envoie le client.
         case when v_vat_mode = 'franchise' then 0 else (e.item ->> 'vat_rate_bp')::integer end,
         coalesce(e.item ->> 'source', 'manual'),
         nullif(e.item ->> 'price_item_id', '')::uuid
  from jsonb_array_elements(p_lines) with ordinality as e(item, ord);

  return v_quote_id;
end;
$$;

-- 10. Grants explicites (pas de grants automatiques sur ce projet) -------------------
grant select, insert, update on table public.clients to authenticated;
grant select, insert, update, delete on table public.price_items to authenticated;
grant select, insert, update on table public.quotes to authenticated;
grant select, insert, delete on table public.quote_lines to authenticated;
grant select, insert, update on table public.quote_counters to authenticated;
grant select on public.quote_summaries to authenticated;

revoke execute on function public.save_quote_draft(uuid, uuid, jsonb, text, text, text, integer, jsonb) from public, anon;
grant execute on function public.save_quote_draft(uuid, uuid, jsonb, text, text, text, integer, jsonb) to authenticated;
