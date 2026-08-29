-- Melodya — 0004 : Explorer (vitrines), notifications, carnet d'occasions, réactions cadeau
-- À coller dans Supabase > SQL Editor après 0003.

-- ============================================================
-- songs : colonnes vitrine / compteurs / timing paroles
-- ============================================================
alter table songs add column if not exists is_showcase boolean not null default false;
alter table songs add column if not exists showcase_title text;
alter table songs add column if not exists showcase_artist text;
alter table songs add column if not exists plays_count integer not null default 0;
alter table songs add column if not exists gift_view_count integer not null default 0;
alter table songs add column if not exists inspire_count integer not null default 0;
alter table songs add column if not exists lyrics_timing jsonb;

create index if not exists songs_showcase_idx on songs (is_showcase) where is_showcase;
create index if not exists songs_public_ready_idx on songs (is_public, status)
  where is_public and status = 'ready';

-- Lecture publique des vitrines (en plus de songs_select_own).
drop policy if exists "songs_select_showcase" on songs;
create policy "songs_select_showcase" on songs
  for select using (is_showcase = true);

-- Incrément atomique d'un compteur de chanson (liste blanche de champs).
create or replace function increment_song_counter(p_song uuid, p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_field not in ('plays_count', 'gift_view_count', 'inspire_count') then
    raise exception 'CHAMP_INVALIDE';
  end if;
  execute format('update songs set %I = %I + 1 where id = $1', p_field, p_field)
  using p_song;
end;
$$;

-- ============================================================
-- occasions : carnet de dates
-- ============================================================
create table if not exists occasions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  label              text not null,
  person_name        text,
  relationship       text,
  event_date         date not null,
  is_recurring       boolean not null default true,
  notify_days_before integer not null default 7,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists occasions_user_idx on occasions (user_id, event_date);

drop trigger if exists occasions_set_updated_at on occasions;
create trigger occasions_set_updated_at
  before update on occasions
  for each row execute function set_updated_at();

alter table occasions enable row level security;

drop policy if exists "occasions_all_own" on occasions;
create policy "occasions_all_own" on occasions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- notifications
-- ============================================================
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  dedupe_key  text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
-- Index non partiel : les NULL sont distincts → plusieurs notifs sans dedupe_key OK,
-- et `on_conflict` peut le cibler (contrairement à un index partiel).
create unique index if not exists notifications_dedupe_idx
  on notifications (user_id, dedupe_key);

alter table notifications enable row level security;

drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- insert : service role uniquement (pas de policy).

-- ============================================================
-- gift_reactions : mots du destinataire sur la page cadeau
-- ============================================================
create table if not exists gift_reactions (
  id           uuid primary key default gen_random_uuid(),
  song_id      uuid not null references songs (id) on delete cascade,
  emoji        text not null,
  message      text,
  author_name  text,
  created_at   timestamptz not null default now()
);

create index if not exists gift_reactions_song_idx on gift_reactions (song_id, created_at desc);

alter table gift_reactions enable row level security;

drop policy if exists "gift_reactions_insert_public" on gift_reactions;
create policy "gift_reactions_insert_public" on gift_reactions
  for insert with check (
    exists (select 1 from songs s where s.id = song_id and s.is_public)
  );

drop policy if exists "gift_reactions_select" on gift_reactions;
create policy "gift_reactions_select" on gift_reactions
  for select using (
    exists (select 1 from songs s where s.id = song_id and s.is_public)
    or exists (select 1 from songs s where s.id = song_id and s.user_id = auth.uid())
    or is_admin()
  );
