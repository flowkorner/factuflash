-- Ticket 5 : envoi du devis au client, page publique par lien secret, acceptation en ligne.
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run.
--
-- Principes :
--   * Le lien client contient un jeton aléatoire de 256 bits ; la base n'en garde que l'empreinte SHA-256.
--   * À l'envoi, le devis est figé dans `snapshot` (entreprise, client, lignes, totaux, mentions) :
--     si l'artisan change ensuite son adresse ou son logo, le devis envoyé ne bouge pas.
--   * Un devis envoyé n'est plus modifiable par l'artisan, et lui seul ne peut pas le passer en « Accepté » :
--     seul le client, avec le lien, peut l'accepter (preuve : nom saisi + date et heure).
--   * Le client n'a pas de compte : il passe par deux fonctions `security definer` (lecture, acceptation)
--     qui ne trouvent un devis QUE par l'empreinte du jeton. Aucune table n'est ouverte à `anon`.

-- 1. Nouvelles colonnes -----------------------------------------------------------
alter table public.quotes
  add column public_token_hash text unique check (public_token_hash ~ '^[0-9a-f]{64}$'),
  add column snapshot          jsonb,
  add column sent_at           timestamptz,
  add column last_sent_at      timestamptz,
  add column sent_to_email     text check (sent_to_email is null or char_length(sent_to_email) <= 254),
  add column accepted_at       timestamptz,
  add column accepted_by_name  text check (accepted_by_name is null or char_length(accepted_by_name) between 2 and 120);

-- Cohérence des statuts.
alter table public.quotes
  add constraint quotes_sent_has_data check (
    status = 'draft' or (sent_at is not null and snapshot is not null and public_token_hash is not null)
  ),
  add constraint quotes_accepted_has_data check (
    (status = 'accepted') = (accepted_at is not null and accepted_by_name is not null)
  );

-- 2. L'artisan ne modifie plus que des brouillons, et ne change jamais le statut lui-même --
drop policy "quotes_update_own_draft" on public.quotes;
create policy "quotes_update_own_draft" on public.quotes for update to authenticated
  using ((select auth.uid()) = user_id and status = 'draft')
  with check ((select auth.uid()) = user_id and status = 'draft');

-- Droits par colonne : impossible d'écrire statut, dates d'envoi, jeton, snapshot ou acceptation via l'API.
revoke insert, update on table public.quotes from authenticated;
grant insert (user_id, client_id, number, title, site_address, description, validity_days, vat_mode, source)
  on table public.quotes to authenticated;
grant update (client_id, title, site_address, description, validity_days, vat_mode)
  on table public.quotes to authenticated;

-- 3. Vue « Mes devis » : dates d'envoi et d'acceptation en plus ---------------------
create or replace view public.quote_summaries with (security_invoker = true) as
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
       coalesce(t.total_ht_cents, 0) + coalesce(t.total_vat_cents, 0) as total_ttc_cents,
       q.sent_at,
       q.accepted_at
from public.quotes q
join public.clients c on c.id = q.client_id
left join totals t on t.quote_id = q.id;

-- 4. Image figée d'un devis (mêmes arrondis que quote_summaries et computeTotals) ----
-- security invoker : sert aussi au PDF d'un brouillon, avec la RLS de l'artisan.
create or replace function public.build_quote_snapshot(p_quote_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'number', q.number,
    'title', q.title,
    'siteAddress', q.site_address,
    'validityDays', q.validity_days,
    'vatMode', q.vat_mode,
    'company', jsonb_build_object(
      'name', co.name, 'siret', co.siret, 'address', co.address, 'phone', co.phone, 'logoPath', co.logo_path
    ),
    'client', jsonb_build_object('name', c.name, 'email', c.email, 'address', c.address),
    'lines', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'designation', l.designation,
        'quantity', l.quantity,
        'unit', l.unit,
        'unitPriceCents', l.unit_price_cents,
        'vatRateBp', l.vat_rate_bp,
        'htCents', round(l.quantity * l.unit_price_cents)::bigint
      ) order by l.position), '[]'::jsonb)
      from public.quote_lines l
      where l.quote_id = q.id
    ),
    'vatGroups', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'rateBp', g.vat_rate_bp,
        'htCents', g.ht_cents::bigint,
        'vatCents', round(g.ht_cents * g.vat_rate_bp / 10000.0)::bigint
      ) order by g.vat_rate_bp desc), '[]'::jsonb)
      from (
        select vat_rate_bp, sum(round(quantity * unit_price_cents)) as ht_cents
        from public.quote_lines
        where quote_id = q.id
        group by vat_rate_bp
      ) g
    ),
    'totals', jsonb_build_object(
      'htCents', s.total_ht_cents, 'vatCents', s.total_vat_cents, 'ttcCents', s.total_ttc_cents
    )
  )
  from public.quotes q
  join public.clients c on c.id = q.client_id
  join public.companies co on co.user_id = q.user_id
  join public.quote_summaries s on s.id = q.id
  where q.id = p_quote_id;
$$;

-- 5. Envoi (et renvoi) par l'artisan ---------------------------------------------
-- security definer : nécessaire pour faire passer le devis en « sent » (interdit en direct par la policy).
-- Contrôle explicite : le devis doit appartenir à auth.uid().
-- Renvoi d'un devis déjà envoyé : nouveau jeton (l'ancien lien cesse de marcher), contenu inchangé.
create or replace function public.send_quote(
  p_quote_id        uuid,
  p_token_hash      text,
  p_recipient_email text,
  p_mentions        jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_quote  public.quotes%rowtype;
  v_email  text := lower(trim(p_recipient_email));
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  if v_email is null or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if p_mentions is null or jsonb_typeof(p_mentions) <> 'array' then
    raise exception 'invalid_mentions' using errcode = 'P0001';
  end if;

  select * into v_quote from public.quotes
   where id = p_quote_id and user_id = v_user
   for update;
  if not found then
    raise exception 'quote_not_found' using errcode = 'P0001';
  end if;

  if v_quote.status = 'draft' then
    if not exists (select 1 from public.quote_lines where quote_id = v_quote.id) then
      raise exception 'invalid_lines' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.companies where user_id = v_user) then
      raise exception 'company_missing' using errcode = 'P0001';
    end if;

    -- L'email saisi à l'envoi devient celui du client.
    update public.clients set email = v_email where id = v_quote.client_id and user_id = v_user;

    update public.quotes
       set issue_date = current_date,
           snapshot = public.build_quote_snapshot(v_quote.id) || jsonb_build_object('mentions', p_mentions),
           public_token_hash = p_token_hash,
           sent_to_email = v_email,
           sent_at = now(),
           last_sent_at = now(),
           status = 'sent'
     where id = v_quote.id;
  elsif v_quote.status = 'sent' then
    update public.quotes
       set public_token_hash = p_token_hash,
           sent_to_email = v_email,
           last_sent_at = now()
     where id = v_quote.id;
  else
    raise exception 'quote_not_sendable' using errcode = 'P0001';
  end if;

  select * into v_quote from public.quotes where id = p_quote_id;
  return jsonb_build_object(
    'number', v_quote.number,
    'issueDate', v_quote.issue_date,
    'validUntil', v_quote.issue_date + v_quote.validity_days,
    'snapshot', v_quote.snapshot
  );
end;
$$;

-- 6. Lecture publique par le client (sans compte) --------------------------------
-- Ne renvoie jamais d'identifiant interne ni l'empreinte du jeton.
create or replace function public.get_public_quote(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', q.status,
    'issueDate', q.issue_date,
    'validUntil', q.issue_date + q.validity_days,
    'sentAt', q.sent_at,
    'acceptedAt', q.accepted_at,
    'acceptedByName', q.accepted_by_name,
    'snapshot', q.snapshot
  )
  from public.quotes q
  where p_token is not null
    and char_length(p_token) between 32 and 128
    and q.public_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and q.status in ('sent', 'accepted');
$$;

-- 7. Acceptation par le client ---------------------------------------------------
-- Idempotente : un devis déjà accepté n'est pas « ré-accepté » (date et nom d'origine conservés).
create or replace function public.accept_public_quote(p_token text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_quote public.quotes%rowtype;
begin
  if p_token is null or char_length(p_token) not between 32 and 128 then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select * into v_quote from public.quotes
   where public_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and status in ('sent', 'accepted')
   for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if v_quote.status = 'sent' then
    if char_length(v_name) not between 2 and 120 then
      raise exception 'invalid_name' using errcode = 'P0001';
    end if;
    if current_date > v_quote.issue_date + v_quote.validity_days then
      raise exception 'expired' using errcode = 'P0001';
    end if;
    update public.quotes
       set status = 'accepted', accepted_at = now(), accepted_by_name = v_name
     where id = v_quote.id
    returning * into v_quote;
  end if;

  return jsonb_build_object(
    'status', v_quote.status,
    'acceptedAt', v_quote.accepted_at,
    'acceptedByName', v_quote.accepted_by_name
  );
end;
$$;

-- 8. Grants explicites ------------------------------------------------------------
revoke execute on function public.build_quote_snapshot(uuid) from public, anon;
grant execute on function public.build_quote_snapshot(uuid) to authenticated;

revoke execute on function public.send_quote(uuid, text, text, jsonb) from public, anon;
grant execute on function public.send_quote(uuid, text, text, jsonb) to authenticated;

-- Seule exception à « rien pour anon » : ces deux fonctions, qui exigent le jeton secret.
revoke execute on function public.get_public_quote(text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;

revoke execute on function public.accept_public_quote(text, text) from public;
grant execute on function public.accept_public_quote(text, text) to anon, authenticated;
