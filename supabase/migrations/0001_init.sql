-- Melodya — schéma initial
-- À coller dans Supabase > SQL Editor (ou `supabase db push` si tu utilises la CLI).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type song_status as enum
    ('draft', 'pending_payment', 'paid', 'generating', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('initiated', 'success', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_type as enum ('cover', 'clip', 'instrumental', 'wav');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voice_type as enum ('homme', 'femme', 'enfant', 'duo');
exception when duplicate_object then null; end $$;

-- ============================================================
-- updated_at helper
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  country     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- Crée le profil à l'inscription
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- songs
-- ============================================================
create table if not exists songs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  status                song_status not null default 'draft',

  -- brief
  occasion              text,
  recipient_name        text,
  sender_name           text,
  relationship          text,
  story                 text,
  key_facts             text,
  language              text not null default 'fr',
  music_style           text,
  voice                 voice_type,
  mood                  text,

  -- paroles
  lyrics                text,
  lyrics_approved       boolean not null default false,
  regen_count           integer not null default 0,

  -- commande
  addons                jsonb not null default '[]'::jsonb,
  price_total           integer not null default 0,
  currency              text not null default 'XOF',

  -- génération
  provider              text,
  provider_job_id       text,
  generation_started_at timestamptz,
  error                 text,

  -- partage
  gift_slug             text unique,
  is_public             boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists songs_user_id_idx on songs (user_id);
create index if not exists songs_status_idx on songs (status);
create index if not exists songs_gift_slug_idx on songs (gift_slug);

drop trigger if exists songs_set_updated_at on songs;
create trigger songs_set_updated_at
  before update on songs
  for each row execute function set_updated_at();

alter table songs enable row level security;

drop policy if exists "songs_select_own" on songs;
create policy "songs_select_own" on songs
  for select using (auth.uid() = user_id);

drop policy if exists "songs_insert_own" on songs;
create policy "songs_insert_own" on songs
  for insert with check (auth.uid() = user_id);

drop policy if exists "songs_update_own" on songs;
create policy "songs_update_own" on songs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- song_versions
-- ============================================================
create table if not exists song_versions (
  id            uuid primary key default gen_random_uuid(),
  song_id       uuid not null references songs (id) on delete cascade,
  idx           integer not null,
  audio_url     text not null,
  duration_sec  integer,
  is_selected   boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (song_id, idx)
);

create index if not exists song_versions_song_id_idx on song_versions (song_id);

alter table song_versions enable row level security;

drop policy if exists "song_versions_select_own" on song_versions;
create policy "song_versions_select_own" on song_versions
  for select using (
    exists (select 1 from songs s where s.id = song_versions.song_id and s.user_id = auth.uid())
  );

-- ============================================================
-- song_assets
-- ============================================================
create table if not exists song_assets (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references songs (id) on delete cascade,
  type        asset_type not null,
  url         text not null,
  created_at  timestamptz not null default now()
);

create index if not exists song_assets_song_id_idx on song_assets (song_id);

alter table song_assets enable row level security;

drop policy if exists "song_assets_select_own" on song_assets;
create policy "song_assets_select_own" on song_assets
  for select using (
    exists (select 1 from songs s where s.id = song_assets.song_id and s.user_id = auth.uid())
  );

-- ============================================================
-- payments
-- ============================================================
create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  song_id       uuid not null references songs (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  provider      text not null default 'moneroo',
  provider_ref  text,
  checkout_url  text,
  amount        integer not null,
  currency      text not null default 'XOF',
  method        text,
  status        payment_status not null default 'initiated',
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists payments_song_id_idx on payments (song_id);
create index if not exists payments_provider_ref_idx on payments (provider_ref);

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

alter table payments enable row level security;

drop policy if exists "payments_select_own" on payments;
create policy "payments_select_own" on payments
  for select using (auth.uid() = user_id);

-- Aucune policy insert/update pour anon/authenticated : écriture via service role uniquement.

-- ============================================================
-- Storage : bucket pour les rendus (audio/pochettes) — optionnel en mode mock
-- ============================================================
insert into storage.buckets (id, name, public)
values ('renders', 'renders', true)
on conflict (id) do nothing;
