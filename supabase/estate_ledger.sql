-- =============================================================================
-- THE MANDALA COMPANY — estate_ledger  (Supabase / Postgres upgrade path)
-- =============================================================================
-- The live ledger today is Vercel KV / Upstash (api/stripe-webhook.ts writes,
-- api/auth-lookup.ts reads) — already provisioned, zero new accounts, and it
-- IS a real datastore. This file is the drop-in upgrade to Supabase/Postgres
-- when the estate wants SQL querying, a dashboard, and exportable history.
--
-- It mirrors the KV record shape 1:1, so swapping the two API functions over
-- to Supabase is a transport change only — the fields, the Certificate ID
-- format, and the per-drop sequential numbering all stay identical.
--
-- TO ADOPT:
--   1. Create a Supabase project; run this script in the SQL editor.
--   2. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.
--   3. In api/stripe-webhook.ts issueLedgerEntries(): replace the kvCmd SET/INCR
--      calls with the RPC `issue_print` below (atomic numbering + insert).
--   4. In api/auth-lookup.ts: replace the KV GET with a PostgREST select of the
--      public columns (see the auth_lookup view).
--   The front-end (/auth) and the COA/label renderer need no change — they read
--   the same fields back.
-- =============================================================================

create table if not exists estate_ledger (
  certificate_id  text primary key,                 -- e.g. MANDALA-OPI-7F3K91 (non-guessable)
  artwork_id      text        not null,             -- paintings.ts id, e.g. "ophiuchus"
  artwork_name    text        not null,             -- display title
  colourway       text,
  drop_id         text        not null,             -- e.g. "drop-i"
  drop_label      text        not null,             -- e.g. "Drop I"
  tier_id         text        not null,             -- atelier | collector | atelier-grande | heirloom | studio
  tier_label      text        not null,             -- "Open Edition" | "Collector Drop" | …
  print_number    integer,                          -- sequential WITHIN the drop; NULL for Open Edition
  allocation      integer,                          -- per-drop cap (200/75/18); NULL for Open Edition
  issued_date     timestamptz not null default now(),
  order_id        text        not null,             -- Stripe checkout session id
  status          text        not null default 'issued',
  line_index      integer     not null default 0,
  -- Idempotency: one certificate per (order, line). A Stripe redelivery can
  -- never double-issue.
  unique (order_id, line_index)
);

-- Per-drop numbering integrity: a print number is unique within its
-- artwork+tier+drop batch (Open Edition rows have NULL print_number, which is
-- exempt from the unique constraint in Postgres — exactly the desired behaviour).
create unique index if not exists estate_ledger_drop_number_idx
  on estate_ledger (artwork_id, tier_id, drop_id, print_number);

create index if not exists estate_ledger_order_idx on estate_ledger (order_id);

-- Atomic "issue the next print in this drop" — assigns the next sequential
-- number within (artwork, tier, drop) and inserts the row in one transaction.
-- Pass p_allocation = NULL for the Open Edition (the row is then un-numbered).
-- ON CONFLICT (order_id, line_index) DO NOTHING makes retries idempotent;
-- returns the existing/just-created certificate either way.
create or replace function issue_print(
  p_certificate_id text,
  p_artwork_id     text,
  p_artwork_name   text,
  p_colourway      text,
  p_drop_id        text,
  p_drop_label     text,
  p_tier_id        text,
  p_tier_label     text,
  p_allocation     integer,
  p_order_id       text,
  p_line_index     integer
) returns estate_ledger
language plpgsql
as $$
declare
  v_next   integer;
  v_row    estate_ledger;
begin
  -- Already issued for this (order, line)? Return it unchanged (idempotent).
  select * into v_row from estate_ledger
    where order_id = p_order_id and line_index = p_line_index;
  if found then
    return v_row;
  end if;

  if p_allocation is null then
    v_next := null;                       -- Open Edition: not numbered
  else
    select coalesce(max(print_number), 0) + 1 into v_next
      from estate_ledger
      where artwork_id = p_artwork_id and tier_id = p_tier_id and drop_id = p_drop_id;
  end if;

  insert into estate_ledger (
    certificate_id, artwork_id, artwork_name, colourway, drop_id, drop_label,
    tier_id, tier_label, print_number, allocation, order_id, status, line_index
  ) values (
    p_certificate_id, p_artwork_id, p_artwork_name, p_colourway, p_drop_id, p_drop_label,
    p_tier_id, p_tier_label, v_next, p_allocation, p_order_id, 'issued', p_line_index
  )
  on conflict (order_id, line_index) do nothing
  returning * into v_row;

  -- If a concurrent call won the (order,line) race, read its row back.
  if v_row is null then
    select * into v_row from estate_ledger
      where order_id = p_order_id and line_index = p_line_index;
  end if;

  return v_row;
end;
$$;

-- Public projection for /api/auth-lookup — exposes ONLY provenance fields,
-- never order_id / line_index. Grant select on the VIEW (not the table) to the
-- anon role if querying client-side; otherwise query it from the service role.
create or replace view auth_lookup as
  select
    certificate_id,
    artwork_name,
    colourway,
    drop_label,
    tier_label,
    print_number,
    allocation,
    issued_date,
    'Authenticated in Estate Registry'::text as status
  from estate_ledger;
