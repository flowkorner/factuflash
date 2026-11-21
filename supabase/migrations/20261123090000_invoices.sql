-- Ticket 7 : factures d'acompte (automatiques) et factures de solde (par l'artisan).
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run.
--
-- Principes :
--   * Numérotation F-<année>-<n°>, par artisan et par an, continue et sans trou : le numéro est tiré
--     d'un compteur dans la MÊME transaction que la création (un échec annule aussi le compteur).
--   * Une facture émise est inaltérable : un trigger interdit toute modification de son contenu
--     et toute suppression (même par une fonction interne). Correction = avoir (plus tard).
--   * Contenu figé (snapshot) : identité de l'entreprise et du client à la date de facturation,
--     lignes, TVA par taux, totaux, acomptes déduits.
--   * Facture d'acompte : créée par le webhook Stripe avec le paiement (même transaction).
--     TVA de l'acompte répartie au prorata des taux du devis (prestation de services : TVA à l'encaissement).
--   * Facture de solde : créée par l'artisan, acomptes déjà facturés déduits.
--   * Statuts du devis : … → deposit_paid → invoiced (« Facturé ») → paid (« Soldé »).

-- 1. Statuts du devis -------------------------------------------------------------
alter table public.quotes drop constraint quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'declined', 'deposit_paid', 'invoiced', 'paid'));

alter table public.quotes drop constraint quotes_accepted_has_data;
alter table public.quotes add constraint quotes_accepted_has_data check (
  (status in ('accepted', 'deposit_paid', 'invoiced', 'paid')) = (accepted_at is not null and accepted_by_name is not null)
);

alter table public.quotes drop constraint quotes_deposit_paid_has_data;
alter table public.quotes add constraint quotes_deposit_paid_has_data check (
  status <> 'deposit_paid' or deposit_paid_at is not null
);

-- 2. Factures ---------------------------------------------------------------------
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  quote_id          uuid not null,
  kind              text not null check (kind in ('deposit', 'final')),
  number            text not null check (number ~ '^F-[0-9]{4}-[0-9]{3,}$'),
  issue_date        date not null default current_date,
  due_date          date not null,
  service_date      date not null,
  total_ht_cents    bigint not null,
  total_vat_cents   bigint not null,
  total_ttc_cents   bigint not null check (total_ttc_cents >= 0),
  amount_due_cents  bigint not null check (amount_due_cents >= 0),
  snapshot          jsonb not null,
  public_token_hash text unique check (public_token_hash is null or public_token_hash ~ '^[0-9a-f]{64}$'),
  sent_to_email     text check (sent_to_email is null or char_length(sent_to_email) <= 254),
  sent_at           timestamptz,
  last_sent_at      timestamptz,
  paid_on           date,
  payment_method    text check (payment_method is null or payment_method in ('card_online', 'transfer', 'cheque', 'cash', 'card')),
  created_at        timestamptz not null default now(),
  unique (user_id, number),
  check (due_date >= issue_date),
  check ((paid_on is null) = (payment_method is null)),
  -- Conservation légale : impossible de supprimer le devis (donc le compte) d'une facture émise.
  foreign key (quote_id, user_id) references public.quotes (id, user_id) on delete restrict
);
create unique index invoices_one_per_kind_idx on public.invoices (quote_id, kind);
create index invoices_user_idx on public.invoices (user_id, issue_date desc);

-- Inaltérable : seuls l'envoi (lien, email, dates d'envoi) et le paiement peuvent être renseignés.
create or replace function private.protect_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'invoice_immutable' using errcode = 'P0001';
  end if;
  if new.id <> old.id or new.user_id <> old.user_id or new.quote_id <> old.quote_id
     or new.kind <> old.kind or new.number <> old.number or new.issue_date <> old.issue_date
     or new.due_date <> old.due_date or new.service_date <> old.service_date
     or new.total_ht_cents <> old.total_ht_cents or new.total_vat_cents <> old.total_vat_cents
     or new.total_ttc_cents <> old.total_ttc_cents or new.amount_due_cents <> old.amount_due_cents
     or new.snapshot <> old.snapshot or new.created_at <> old.created_at
     or (old.paid_on is not null and (new.paid_on is distinct from old.paid_on
                                       or new.payment_method is distinct from old.payment_method)) then
    raise exception 'invoice_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger invoices_protect
  before update or delete on public.invoices
  for each row execute function private.protect_invoice();

alter table public.invoices enable row level security;
create policy "invoices_select_own" on public.invoices for select to authenticated
  using ((select auth.uid()) = user_id);
-- Aucune écriture directe : uniquement via les fonctions ci-dessous.

-- 3. Compteur de factures (sans trou) -------------------------------------------------
create table public.invoice_counters (
  user_id    uuid not null references auth.users (id) on delete cascade,
  year       integer not null check (year between 2000 and 2999),
  last_value integer not null check (last_value > 0),
  primary key (user_id, year)
);
alter table public.invoice_counters enable row level security;
-- Aucun grant : seul le code SQL interne l'utilise.

create or replace function private.next_invoice_number(p_user uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_seq  integer;
begin
  insert into public.invoice_counters as c (user_id, year, last_value)
  values (p_user, v_year, 1)
  on conflict (user_id, year) do update set last_value = c.last_value + 1
  returning last_value into v_seq;
  return format('F-%s-%s', v_year, lpad(v_seq::text, 3, '0'));
end;
$$;

-- 4. Contenus figés -----------------------------------------------------------------
-- Identité de l'entreprise et du client au jour de la facture.
create or replace function private.invoice_parties(p_quote public.quotes)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'company', jsonb_build_object(
      'name', co.name, 'siret', co.siret, 'address', co.address, 'phone', co.phone, 'logoPath', co.logo_path
    ),
    'client', jsonb_build_object('name', c.name, 'email', c.email, 'address', c.address)
  )
  from public.companies co, public.clients c
  where co.user_id = p_quote.user_id and c.id = p_quote.client_id;
$$;

-- Facture d'acompte : montant TTC payé, réparti par taux au prorata du devis, au centime près
-- (le groupe le plus important absorbe l'écart d'arrondi). HT = TTC / (1 + taux), TVA = TTC − HT.
create or replace function private.build_deposit_invoice_snapshot(p_quote public.quotes, p_number text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_total     bigint := (p_quote.snapshot -> 'totals' ->> 'ttcCents')::bigint;
  v_deposit   bigint := p_quote.deposit_cents;
  v_lines     jsonb := '[]'::jsonb;
  v_groups    jsonb := '[]'::jsonb;
  v_ht        bigint := 0;
  v_vat       bigint := 0;
  v_allocated bigint := 0;
  v_rows      integer;
  v_index     integer := 0;
  r           record;
  v_share     bigint;
  v_line_ht   bigint;
begin
  select count(*) into v_rows from jsonb_array_elements(p_quote.snapshot -> 'vatGroups');
  for r in
    select (e ->> 'rateBp')::integer as rate,
           (e ->> 'htCents')::bigint + (e ->> 'vatCents')::bigint as ttc
    from jsonb_array_elements(p_quote.snapshot -> 'vatGroups') e
    order by 2 asc, 1 asc
  loop
    v_index := v_index + 1;
    v_share := case
      when v_index = v_rows then v_deposit - v_allocated
      else round(r.ttc * v_deposit::numeric / v_total)::bigint
    end;
    v_allocated := v_allocated + v_share;
    continue when v_share <= 0;
    v_line_ht := round(v_share * 10000.0 / (10000 + r.rate))::bigint;
    v_ht := v_ht + v_line_ht;
    v_vat := v_vat + (v_share - v_line_ht);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'designation', format('Acompte de %s %% sur le devis %s', p_quote.deposit_percent, p_quote.number),
      'quantity', 1, 'unit', 'forfait', 'unitPriceCents', v_line_ht, 'vatRateBp', r.rate, 'htCents', v_line_ht
    ));
    v_groups := v_groups || jsonb_build_array(jsonb_build_object(
      'rateBp', r.rate, 'htCents', v_line_ht, 'vatCents', v_share - v_line_ht
    ));
  end loop;

  return private.invoice_parties(p_quote) || jsonb_build_object(
    'version', 1,
    'kind', 'deposit',
    'number', p_number,
    'quoteNumber', p_quote.number,
    'quoteIssueDate', p_quote.issue_date,
    'title', p_quote.title,
    'siteAddress', p_quote.site_address,
    'vatMode', p_quote.vat_mode,
    'depositPercent', p_quote.deposit_percent,
    'lines', v_lines,
    'vatGroups', v_groups,
    'totals', jsonb_build_object('htCents', v_ht, 'vatCents', v_vat, 'ttcCents', v_deposit),
    'deductions', '[]'::jsonb,
    'amountDueCents', 0
  );
end;
$$;

-- Facture de solde : toutes les lignes du devis, acomptes déjà facturés déduits.
create or replace function private.build_final_invoice_snapshot(p_quote public.quotes, p_number text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.invoice_parties(p_quote) || jsonb_build_object(
    'version', 1,
    'kind', 'final',
    'number', p_number,
    'quoteNumber', p_quote.number,
    'quoteIssueDate', p_quote.issue_date,
    'title', p_quote.title,
    'siteAddress', p_quote.site_address,
    'vatMode', p_quote.vat_mode,
    'lines', p_quote.snapshot -> 'lines',
    'vatGroups', p_quote.snapshot -> 'vatGroups',
    'totals', p_quote.snapshot -> 'totals',
    'deductions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', format('Acompte versé le %s', to_char(i.issue_date, 'DD/MM/YYYY')),
        'invoiceNumber', i.number,
        'ttcCents', i.total_ttc_cents
      ) order by i.issue_date)
      from public.invoices i
      where i.quote_id = p_quote.id and i.kind = 'deposit'
    ), '[]'::jsonb),
    'amountDueCents', (p_quote.snapshot -> 'totals' ->> 'ttcCents')::bigint - coalesce((
      select sum(i.total_ttc_cents) from public.invoices i where i.quote_id = p_quote.id and i.kind = 'deposit'
    ), 0)
  );
$$;

-- 5. Paiement de l'acompte (webhook) : paiement + facture d'acompte, dans la même transaction --
drop function public.record_deposit_payment(text, uuid, text, text, bigint, text);

create function public.record_deposit_payment(
  p_secret             text,
  p_quote_id           uuid,
  p_session_id         text,
  p_payment_intent_id  text,
  p_amount_cents       bigint,
  p_currency           text,
  p_invoice_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected text;
  v_quote    public.quotes%rowtype;
  v_number   text;
  v_snapshot jsonb;
  v_invoice  public.invoices%rowtype;
begin
  select secret_hash into v_expected from private.app_secrets where name = 'payments';
  if v_expected is null
     or p_secret is null
     or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> v_expected then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_invoice_token_hash is null or p_invoice_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.quote_payments where stripe_checkout_session_id = p_session_id) then
    return jsonb_build_object('result', 'already_recorded', 'invoice', null);
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

  -- Une seule facture d'acompte par devis (un second paiement accidentel ne crée pas de doublon).
  if exists (select 1 from public.invoices where quote_id = v_quote.id and kind = 'deposit') then
    return jsonb_build_object('result', 'recorded', 'invoice', null);
  end if;

  v_number := private.next_invoice_number(v_quote.user_id);
  v_snapshot := private.build_deposit_invoice_snapshot(v_quote, v_number);
  insert into public.invoices (
    user_id, quote_id, kind, number, issue_date, due_date, service_date,
    total_ht_cents, total_vat_cents, total_ttc_cents, amount_due_cents, snapshot,
    public_token_hash, sent_to_email, paid_on, payment_method
  ) values (
    v_quote.user_id, v_quote.id, 'deposit', v_number, current_date, current_date, current_date,
    (v_snapshot -> 'totals' ->> 'htCents')::bigint, (v_snapshot -> 'totals' ->> 'vatCents')::bigint,
    v_quote.deposit_cents, 0, v_snapshot,
    p_invoice_token_hash, v_quote.sent_to_email, current_date, 'card_online'
  ) returning * into v_invoice;

  return jsonb_build_object(
    'result', 'recorded',
    'invoice', jsonb_build_object(
      'id', v_invoice.id, 'number', v_invoice.number, 'sentToEmail', v_invoice.sent_to_email,
      'issueDate', v_invoice.issue_date, 'dueDate', v_invoice.due_date, 'snapshot', v_invoice.snapshot
    )
  );
end;
$$;

-- Le webhook signale que l'email de la facture d'acompte est parti.
create or replace function public.record_invoice_email_sent(p_secret text, p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected text;
begin
  select secret_hash into v_expected from private.app_secrets where name = 'payments';
  if v_expected is null
     or p_secret is null
     or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> v_expected then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update public.invoices
     set sent_at = coalesce(sent_at, now()), last_sent_at = now()
   where id = p_invoice_id;
end;
$$;

-- 6. Facture de solde (artisan) --------------------------------------------------------
create or replace function public.create_final_invoice(
  p_quote_id     uuid,
  p_service_date date,
  p_due_days     integer,
  p_token_hash   text,
  p_email        text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_quote    public.quotes%rowtype;
  v_email    text := lower(trim(p_email));
  v_number   text;
  v_snapshot jsonb;
  v_invoice  public.invoices%rowtype;
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
  if p_due_days is null or p_due_days not in (0, 15, 30, 45, 60) then
    raise exception 'invalid_due_days' using errcode = 'P0001';
  end if;
  if p_service_date is null or p_service_date > current_date then
    raise exception 'invalid_service_date' using errcode = 'P0001';
  end if;

  select * into v_quote from public.quotes where id = p_quote_id and user_id = v_user for update;
  if not found then
    raise exception 'quote_not_found' using errcode = 'P0001';
  end if;
  if v_quote.status not in ('accepted', 'deposit_paid') then
    raise exception 'quote_not_invoiceable' using errcode = 'P0001';
  end if;
  if p_service_date < v_quote.accepted_at::date then
    raise exception 'invalid_service_date' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.invoices where quote_id = v_quote.id and kind = 'final') then
    raise exception 'already_invoiced' using errcode = 'P0001';
  end if;

  update public.clients set email = v_email where id = v_quote.client_id and user_id = v_user;

  v_number := private.next_invoice_number(v_user);
  v_snapshot := private.build_final_invoice_snapshot(v_quote, v_number);
  insert into public.invoices (
    user_id, quote_id, kind, number, issue_date, due_date, service_date,
    total_ht_cents, total_vat_cents, total_ttc_cents, amount_due_cents, snapshot,
    public_token_hash, sent_to_email
  ) values (
    v_user, v_quote.id, 'final', v_number, current_date, current_date + p_due_days, p_service_date,
    (v_snapshot -> 'totals' ->> 'htCents')::bigint, (v_snapshot -> 'totals' ->> 'vatCents')::bigint,
    (v_snapshot -> 'totals' ->> 'ttcCents')::bigint, (v_snapshot ->> 'amountDueCents')::bigint, v_snapshot,
    p_token_hash, v_email
  ) returning * into v_invoice;

  update public.quotes set status = 'invoiced' where id = v_quote.id;

  return jsonb_build_object(
    'id', v_invoice.id, 'number', v_invoice.number, 'kind', v_invoice.kind,
    'issueDate', v_invoice.issue_date, 'dueDate', v_invoice.due_date,
    'amountDueCents', v_invoice.amount_due_cents, 'snapshot', v_invoice.snapshot
  );
end;
$$;

-- 7. Envoi / renvoi d'une facture (artisan) : nouveau lien, contenu inchangé --------------
create or replace function public.send_invoice(p_invoice_id uuid, p_token_hash text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_email   text := lower(trim(p_email));
  v_invoice public.invoices%rowtype;
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

  update public.invoices
     set public_token_hash = p_token_hash, sent_to_email = v_email
   where id = p_invoice_id and user_id = v_user
  returning * into v_invoice;
  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'id', v_invoice.id, 'number', v_invoice.number, 'kind', v_invoice.kind,
    'issueDate', v_invoice.issue_date, 'dueDate', v_invoice.due_date,
    'amountDueCents', v_invoice.amount_due_cents, 'paidOn', v_invoice.paid_on,
    'snapshot', v_invoice.snapshot
  );
end;
$$;

-- Confirmation d'envoi par l'artisan (après que l'email est parti).
create or replace function public.mark_invoice_sent(p_invoice_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invoices
     set sent_at = coalesce(sent_at, now()), last_sent_at = now()
   where id = p_invoice_id and user_id = auth.uid();
$$;

-- 8. Solde reçu (artisan) : le devis passe à « Soldé » ------------------------------------
create or replace function public.mark_final_invoice_paid(p_invoice_id uuid, p_paid_on date, p_method text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_invoice public.invoices%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_method is null or p_method not in ('transfer', 'cheque', 'cash', 'card') then
    raise exception 'invalid_method' using errcode = 'P0001';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id and user_id = v_user for update;
  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0001';
  end if;
  if v_invoice.kind <> 'final' then
    raise exception 'not_final_invoice' using errcode = 'P0001';
  end if;
  if v_invoice.paid_on is not null then
    raise exception 'already_paid' using errcode = 'P0001';
  end if;
  if p_paid_on is null or p_paid_on > current_date or p_paid_on < v_invoice.issue_date then
    raise exception 'invalid_paid_on' using errcode = 'P0001';
  end if;

  update public.invoices set paid_on = p_paid_on, payment_method = p_method where id = v_invoice.id;
  update public.quotes set status = 'paid' where id = v_invoice.quote_id;
end;
$$;

-- 9. Lecture publique d'une facture (client, par le lien secret) ---------------------------
create or replace function public.get_public_invoice(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', i.kind,
    'number', i.number,
    'issueDate', i.issue_date,
    'dueDate', i.due_date,
    'serviceDate', i.service_date,
    'amountDueCents', i.amount_due_cents,
    'paidOn', i.paid_on,
    'paymentMethod', i.payment_method,
    'snapshot', i.snapshot
  )
  from public.invoices i
  where p_token is not null
    and char_length(p_token) between 32 and 128
    and i.public_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- 10. Devis : les nouveaux statuts restent visibles côté client ------------------------------
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
    and q.status in ('sent', 'accepted', 'deposit_paid', 'invoiced', 'paid');
$$;

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
     and status in ('sent', 'accepted', 'deposit_paid', 'invoiced', 'paid')
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
     and status in ('sent', 'accepted', 'deposit_paid', 'invoiced', 'paid');
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_quote.status = 'deposit_paid' or v_quote.deposit_paid_at is not null then
    raise exception 'already_paid' using errcode = 'P0001';
  end if;
  if v_quote.status in ('invoiced', 'paid') then
    raise exception 'already_invoiced' using errcode = 'P0001';
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

-- 11. Rattrapage : acomptes payés AVANT cette migration -----------------------------------
-- Sans facture d'acompte, la facture de solde ne déduirait rien. On crée ces factures maintenant
-- (numéro du jour, acquittées à la date du paiement), dans l'ordre des paiements.
do $$
declare
  v_quote    public.quotes%rowtype;
  v_number   text;
  v_snapshot jsonb;
begin
  for v_quote in
    select q.* from public.quotes q
     where q.deposit_paid_at is not null
       and coalesce(q.deposit_cents, 0) > 0
       and not exists (select 1 from public.invoices i where i.quote_id = q.id and i.kind = 'deposit')
     order by q.deposit_paid_at
  loop
    v_number := private.next_invoice_number(v_quote.user_id);
    v_snapshot := private.build_deposit_invoice_snapshot(v_quote, v_number);
    insert into public.invoices (
      user_id, quote_id, kind, number, issue_date, due_date, service_date,
      total_ht_cents, total_vat_cents, total_ttc_cents, amount_due_cents, snapshot,
      sent_to_email, paid_on, payment_method
    ) values (
      v_quote.user_id, v_quote.id, 'deposit', v_number, current_date, current_date,
      v_quote.deposit_paid_at::date,
      (v_snapshot -> 'totals' ->> 'htCents')::bigint, (v_snapshot -> 'totals' ->> 'vatCents')::bigint,
      v_quote.deposit_cents, 0, v_snapshot,
      v_quote.sent_to_email, v_quote.deposit_paid_at::date, 'card_online'
    );
  end loop;
end;
$$;

-- 12. Grants explicites ------------------------------------------------------------------
revoke all on function private.protect_invoice() from public;
revoke all on function private.next_invoice_number(uuid) from public;
revoke all on function private.invoice_parties(public.quotes) from public;
revoke all on function private.build_deposit_invoice_snapshot(public.quotes, text) from public;
revoke all on function private.build_final_invoice_snapshot(public.quotes, text) from public;

grant select on table public.invoices to authenticated;

revoke execute on function public.record_deposit_payment(text, uuid, text, text, bigint, text, text) from public;
grant execute on function public.record_deposit_payment(text, uuid, text, text, bigint, text, text) to anon, authenticated;

revoke execute on function public.record_invoice_email_sent(text, uuid) from public;
grant execute on function public.record_invoice_email_sent(text, uuid) to anon, authenticated;

revoke execute on function public.create_final_invoice(uuid, date, integer, text, text) from public, anon;
grant execute on function public.create_final_invoice(uuid, date, integer, text, text) to authenticated;

revoke execute on function public.send_invoice(uuid, text, text) from public, anon;
grant execute on function public.send_invoice(uuid, text, text) to authenticated;

revoke execute on function public.mark_invoice_sent(uuid) from public, anon;
grant execute on function public.mark_invoice_sent(uuid) to authenticated;

revoke execute on function public.mark_final_invoice_paid(uuid, date, text) from public, anon;
grant execute on function public.mark_final_invoice_paid(uuid, date, text) to authenticated;

revoke execute on function public.get_public_invoice(text) from public;
grant execute on function public.get_public_invoice(text) to anon, authenticated;

revoke execute on function public.get_public_quote(text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;
revoke execute on function public.accept_public_quote(text, text) from public;
grant execute on function public.accept_public_quote(text, text) to anon, authenticated;
revoke execute on function public.prepare_deposit_checkout(text) from public;
grant execute on function public.prepare_deposit_checkout(text) to anon, authenticated;
