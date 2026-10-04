-- Resguardo schema. Safe to re-run: every policy is dropped before it is created.
-- SHADOW CLAUSE (Blueprint condition 5): there is intentionally NO employee table
-- and NO per-person score anywhere in this schema. Inventory is by device/account.

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  sector text not null check (char_length(sector) between 2 and 60),
  employees_band text not null check (employees_band in ('1-5','6-15','16-50')),
  domain text check (domain is null or char_length(domain) between 3 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('device','account')),
  label text not null check (char_length(label) between 2 and 60),
  platform text not null check (platform in ('android','ios','windows','mac','web')),
  has_mfa boolean not null default false,
  auto_updates boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null check (code in ('backup_restore','mfa_accounts','updates','email_protection','incident_contact')),
  status text not null default 'pending' check (status in ('pending','done')),
  owner_role text not null default 'Dueña o dueño' check (char_length(owner_role) between 2 and 40),
  due_date date not null default (current_date + 7),
  done_note text check (done_note is null or char_length(done_note) <= 300),
  done_at timestamptz,
  unique (business_id, code)
);

create table if not exists public.backup_tests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tested_on date not null check (tested_on <= current_date),
  restored_ok boolean not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.email_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  domain text not null check (char_length(domain) between 3 and 100),
  spf text,
  dmarc text,
  dmarc_policy text check (dmarc_policy is null or dmarc_policy in ('none','quarantine','reject')),
  checked_at timestamptz not null default now()
);

create table if not exists public.responders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  role text not null check (char_length(role) between 2 and 60),
  contact text not null check (char_length(contact) between 3 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('phishing','account_takeover','lost_device','ransomware','other')),
  description text not null check (char_length(description) between 5 and 500),
  severity text not null check (severity in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','awaiting_human','closed')),
  responder_id uuid references public.responders(id) on delete set null,
  confirmed_by text check (confirmed_by is null or char_length(confirmed_by) between 2 and 60),
  close_note text check (close_note is null or char_length(close_note) <= 300),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  -- A high-severity incident can only be closed once a human has confirmed it.
  constraint high_needs_human check (
    not (severity = 'high' and status = 'closed' and confirmed_by is null)
  )
);

alter table public.businesses enable row level security;
alter table public.assets enable row level security;
alter table public.actions enable row level security;
alter table public.backup_tests enable row level security;
alter table public.email_checks enable row level security;
alter table public.responders enable row level security;
alter table public.incidents enable row level security;

-- businesses: owner only
drop policy if exists "businesses: owner all" on public.businesses;
create policy "businesses: owner all" on public.businesses
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- every child table: only rows of the caller's own business
do $$
declare t text;
begin
  foreach t in array array['assets','actions','backup_tests','email_checks','responders','incidents']
  loop
    execute format('drop policy if exists "%s: owner all" on public.%I', t, t);
    execute format(
      'create policy "%s: owner all" on public.%I for all to authenticated
         using (business_id in (select id from public.businesses where owner_id = auth.uid()))
         with check (business_id in (select id from public.businesses where owner_id = auth.uid()))',
      t, t);
  end loop;
end $$;
