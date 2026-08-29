-- Melodya — migration 0002 : modèle crédits + admin
-- À coller dans Supabase > SQL Editor après 0001_init.sql.

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type credit_reason as enum
    ('purchase', 'song', 'refund', 'bonus', 'referral', 'adjustment');
exception when duplicate_object then null; end $$;

-- ============================================================
-- profiles : rôle admin + solde de crédits
-- ============================================================
alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists credit_balance integer not null default 0;

-- Contrôle admin via une fonction SECURITY DEFINER : elle contourne la RLS,
-- donc aucune récursion quand une policy de `profiles` (ou d'une autre table)
-- veut savoir si l'utilisateur courant est admin.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

-- NB : pas de policy « admin lit tous les profils » — les pages admin passent
-- par le service role (voir src/lib/admin.ts). Une telle policy récurserait.

-- ============================================================
-- app_settings : configuration clé/valeur (éditée en admin)
-- ============================================================
create table if not exists app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

insert into app_settings (key, value) values
  ('credits_per_song', '1'),
  ('signup_bonus_credits', '1')
on conflict (key) do nothing;

alter table app_settings enable row level security;

drop policy if exists "app_settings_select_all" on app_settings;
create policy "app_settings_select_all" on app_settings
  for select using (true);

drop policy if exists "app_settings_write_admin" on app_settings;
create policy "app_settings_write_admin" on app_settings
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- credit_packs : packs de crédits vendus (prix pilotés en admin)
-- ============================================================
create table if not exists credit_packs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  credits     integer not null check (credits > 0),
  price       integer not null check (price >= 0),
  currency    text not null default 'XOF',
  is_popular  boolean not null default false,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists credit_packs_set_updated_at on credit_packs;
create trigger credit_packs_set_updated_at
  before update on credit_packs
  for each row execute function set_updated_at();

insert into credit_packs (name, credits, price, is_popular, sort_order)
select * from (values
  ('Découverte', 3, 4900, false, 1),
  ('Populaire', 8, 11900, true, 2),
  ('Studio', 20, 24900, false, 3)
) as v(name, credits, price, is_popular, sort_order)
where not exists (select 1 from credit_packs);

alter table credit_packs enable row level security;

drop policy if exists "credit_packs_select_active" on credit_packs;
create policy "credit_packs_select_active" on credit_packs
  for select using (is_active or is_admin());

drop policy if exists "credit_packs_write_admin" on credit_packs;
create policy "credit_packs_write_admin" on credit_packs
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- credit_transactions : grand livre des mouvements de crédits
-- ============================================================
create table if not exists credit_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  amount        integer not null,
  reason        credit_reason not null,
  song_id       uuid references songs (id) on delete set null,
  payment_id    uuid,
  balance_after integer not null,
  created_at    timestamptz not null default now()
);

create index if not exists credit_transactions_user_idx
  on credit_transactions (user_id, created_at desc);
create index if not exists credit_transactions_payment_idx
  on credit_transactions (payment_id);

alter table credit_transactions enable row level security;

drop policy if exists "credit_transactions_select_own" on credit_transactions;
create policy "credit_transactions_select_own" on credit_transactions
  for select using (user_id = auth.uid() or is_admin());

-- ============================================================
-- payments : un paiement achète désormais un pack de crédits
-- ============================================================
alter table payments add column if not exists pack_id uuid references credit_packs (id);
alter table payments add column if not exists credits integer;
alter table payments alter column song_id drop not null;

-- ============================================================
-- songs : coût en crédits
-- ============================================================
alter table songs add column if not exists credits_cost integer not null default 1;

-- ============================================================
-- Fonctions atomiques (verrou de ligne sur profiles)
-- ============================================================
create or replace function grant_credits(
  p_user uuid,
  p_amount integer,
  p_reason credit_reason,
  p_payment uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  update profiles set credit_balance = credit_balance + p_amount
  where id = p_user
  returning credit_balance into v_balance;

  if v_balance is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into credit_transactions (user_id, amount, reason, payment_id, balance_after)
  values (p_user, p_amount, p_reason, p_payment, v_balance);

  return v_balance;
end;
$$;

create or replace function spend_credit(
  p_user uuid,
  p_song uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  select credit_balance into v_balance from profiles where id = p_user for update;

  if v_balance is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update profiles set credit_balance = credit_balance - p_amount where id = p_user
  returning credit_balance into v_balance;

  insert into credit_transactions (user_id, amount, reason, song_id, balance_after)
  values (p_user, -p_amount, 'song', p_song, v_balance);

  return v_balance;
end;
$$;

-- ============================================================
-- Trigger d'inscription : crédite le bonus de bienvenue
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus integer;
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  select coalesce((select value::int from public.app_settings where key = 'signup_bonus_credits'), 0)
  into v_bonus;

  if v_bonus > 0 then
    update public.profiles set credit_balance = v_bonus where id = new.id;
    insert into public.credit_transactions (user_id, amount, reason, balance_after)
    values (new.id, v_bonus, 'bonus', v_bonus);
  end if;

  return new;
end;
$$;
