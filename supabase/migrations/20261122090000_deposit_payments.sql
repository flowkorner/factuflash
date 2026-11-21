-- Ticket 6 : acompte payé en ligne par le client (Stripe, mode test).
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run.
-- Puis enregistrer le secret serveur des paiements (voir README du ticket : `npm run secret:payments`).
--
-- Principes :
--   * Le pourcentage et le montant de l'acompte sont fixés sur le devis au moment de l'envoi.
--   * Le montant à payer est relu en base côté serveur : jamais celui envoyé par le navigateur.
--   * Seul le webhook Stripe (signature vérifiée par l'app) peut enregistrer un paiement, via
--     record_deposit_payment qui exige un secret serveur dont la base ne garde que l'empreinte.
--   * Enregistrement idempotent : un même paiement Stripe reçu deux fois n'est compté qu'une fois.

-- 1. Devis : acompte et nouveau statut « Acompte payé » ------------------------------
alter table public.quotes
  add column deposit_percent integer not null default 30 check (deposit_percent between 0 and 90),
  add column deposit_cents   bigint check (deposit_cents is null or deposit_cents >= 0),
  add column deposit_paid_at timestamptz;

alter table public.quotes drop constraint quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'declined', 'deposit_paid'));

alter table public.quotes drop constraint quotes_accepted_has_data;
alter table public.quotes
  add constraint quotes_accepted_has_data check (
    (status in ('accepted', 'deposit_paid')) = (accepted_at is not null and accepted_by_name is not null)
  ),
  add constraint quotes_deposit_paid_has_data check (
    (status = 'deposit_paid') = (deposit_paid_at is not null)
  );

-- Devis déjà envoyés avant cette migration : acompte de 30 % calculé sur leur total figé.
update public.quotes
   set deposit_cents = round(((snapshot -> 'totals' ->> 'ttcCents')::bigint) * deposit_percent / 100.0)
 where status <> 'draft' and snapshot is not null and deposit_cents is null;

-- 2. Paiements reçus -------------------------------------------------------------
create table public.quote_payments (
  id                         uuid primary key default gen_random_uuid(),
  quote_id                   uuid not null,
  user_id                    uuid not null,
  stripe_checkout_session_id text not null unique check (stripe_checkout_session_id ~ '^cs_'),
  stripe_payment_intent_id   text,
  amount_cents               bigint not null check (amount_cents > 0),
  currency                   text not null check (currency = 'eur'),
  paid_at                    timestamptz not null default now(),
  foreign key (quote_id, user_id) references public.quotes (id, user_id) on delete restrict
);
create index quote_payments_quote_idx on public.quote_payments (quote_id);

alter table public.quote_payments enable row level security;
create policy "quote_payments_select_own" on public.quote_payments for select to authenticated
  using ((select auth.uid()) = user_id);
-- Aucune écriture directe : seulement via record_deposit_payment.

-- 3. Secret serveur des paiements (schéma privé, non exposé par l'API) ------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name        text primary key,
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$')
);
revoke all on table private.app_secrets from public, anon, authenticated;

-- 4. Vue « Mes devis » : acompte demandé et reçu ----------------------------------
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
),
paid as (
  select quote_id, sum(amount_cents)::bigint as paid_cents
  from public.quote_payments
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
       q.accepted_at,
       q.deposit_percent,
       q.deposit_cents,
       coalesce(p.paid_cents, 0) as deposit_paid_cents,
       q.deposit_paid_at
from public.quotes q
join public.clients c on c.id = q.client_id
left join totals t on t.quote_id = q.id
left join paid p on p.quote_id = q.id;

-- 5. Envoi : le pourcentage d'acompte est fixé à ce moment-là -----------------------
drop function public.send_quote(uuid, text, text, jsonb);

create function public.send_quote(
  p_quote_id        uuid,
  p_token_hash      text,
  p_recipient_email text,
  p_mentions        jsonb,
  p_deposit_percent integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_quote    public.quotes%rowtype;
  v_email    text := lower(trim(p_recipient_email));
  v_snapshot jsonb;
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
  if p_deposit_percent is null or p_deposit_percent not between 0 and 90 then
    raise exception 'invalid_deposit' using errcode = 'P0001';
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

    update public.clients set email = v_email where id = v_quote.client_id and user_id = v_user;

    v_snapshot := public.build_quote_snapshot(v_quote.id) || jsonb_build_object('mentions', p_mentions);

    update public.quotes
       set issue_date = current_date,
           snapshot = v_snapshot,
           public_token_hash = p_token_hash,
           sent_to_email = v_email,
           sent_at = now(),
           last_sent_at = now(),
           deposit_percent = p_deposit_percent,
           deposit_cents = round(((v_snapshot -> 'totals' ->> 'ttcCents')::bigint) * p_deposit_percent / 100.0),
           status = 'sent'
     where id = v_quote.id;
  elsif v_quote.status = 'sent' then
    -- Renvoi : nouveau lien, contenu et acompte inchangés.
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
    'depositPercent', v_quote.deposit_percent,
    'depositCents', v_quote.deposit_cents,
    'snapshot', v_quote.snapshot
  );
end;
$$;

-- 6. Lecture publique : acompte en plus ------------------------------------------
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
    'depositPercent', q.deposit_percent,
    'depositCents', q.deposit_cents,
    'depositPaidAt', q.deposit_paid_at,
    'depositPaidCents', (select coalesce(sum(p.amount_cents), 0) from public.quote_payments p where p.quote_id = q.id),
    'snapshot', q.snapshot
  )
  from public.quotes q
  where p_token is not null
    and char_length(p_token) between 32 and 128
    and q.public_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and q.status in ('sent', 'accepted', 'deposit_paid');
$$;

-- 7. Acceptation : un devis à acompte payé reste « accepté » --------------------------
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
     and status in ('sent', 'accepted', 'deposit_paid')
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

-- 8. Préparation du paiement (client, par le lien secret) ---------------------------
-- Renvoie ce qu'il faut pour créer la session Stripe ; le montant vient de la base.
create or replace function public.prepare_deposit_checkout(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes%rowtype;
begin
  select * into v_quote from public.quotes
   where p_token is not null
     and char_length(p_token) between 32 and 128
     and public_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and status in ('sent', 'accepted', 'deposit_paid');
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_quote.status = 'deposit_paid' then
    raise exception 'already_paid' using errcode = 'P0001';
  end if;
  if v_quote.status <> 'accepted' then
    raise exception 'not_accepted' using errcode = 'P0001';
  end if;
  if coalesce(v_quote.deposit_cents, 0) <= 0 then
    raise exception 'no_deposit' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'quoteId', v_quote.id,
    'number', v_quote.number,
    'companyName', v_quote.snapshot -> 'company' ->> 'name',
    'clientEmail', v_quote.sent_to_email,
    'depositPercent', v_quote.deposit_percent,
    'depositCents', v_quote.deposit_cents
  );
end;
$$;

-- 9. Enregistrement d'un paiement (webhook Stripe uniquement) ----------------------
create or replace function public.record_deposit_payment(
  p_secret            text,
  p_quote_id          uuid,
  p_session_id        text,
  p_payment_intent_id text,
  p_amount_cents      bigint,
  p_currency          text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected text;
  v_quote    public.quotes%rowtype;
begin
  select secret_hash into v_expected from private.app_secrets where name = 'payments';
  if v_expected is null
     or p_secret is null
     or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> v_expected then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- Idempotence : déjà enregistré → rien à faire.
  if exists (select 1 from public.quote_payments where stripe_checkout_session_id = p_session_id) then
    return 'already_recorded';
  end if;

  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'quote_not_found' using errcode = 'P0001';
  end if;
  if v_quote.status not in ('accepted', 'deposit_paid') then
    raise exception 'not_accepted' using errcode = 'P0001';
  end if;
  if p_currency is distinct from 'eur' or p_amount_cents is distinct from v_quote.deposit_cents then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  insert into public.quote_payments
    (quote_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id, amount_cents, currency)
  values
    (v_quote.id, v_quote.user_id, p_session_id, p_payment_intent_id, p_amount_cents, p_currency);

  if v_quote.status = 'accepted' then
    update public.quotes set status = 'deposit_paid', deposit_paid_at = now() where id = v_quote.id;
  end if;
  return 'recorded';
end;
$$;

-- 10. Grants explicites -------------------------------------------------------------
grant select on table public.quote_payments to authenticated;
grant select on public.quote_summaries to authenticated;

revoke execute on function public.send_quote(uuid, text, text, jsonb, integer) from public, anon;
grant execute on function public.send_quote(uuid, text, text, jsonb, integer) to authenticated;

-- Fonctions publiques (lien secret ou secret serveur exigé) :
revoke execute on function public.get_public_quote(text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;

revoke execute on function public.accept_public_quote(text, text) from public;
grant execute on function public.accept_public_quote(text, text) to anon, authenticated;

revoke execute on function public.prepare_deposit_checkout(text) from public;
grant execute on function public.prepare_deposit_checkout(text) to anon, authenticated;

revoke execute on function public.record_deposit_payment(text, uuid, text, text, bigint, text) from public;
grant execute on function public.record_deposit_payment(text, uuid, text, text, bigint, text) to anon, authenticated;
