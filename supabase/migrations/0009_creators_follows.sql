-- Muzikii — 0009 : créateurs (profil public + handle) & abonnements
-- À coller dans Supabase > SQL Editor après 0008.
--
-- Un visiteur (même sans compte) peut s'abonner à un créateur depuis une page
-- « s'inspirer ». Quand le créateur partage une nouvelle chanson avec ses
-- abonnés, chacun est notifié (in-app + email). Profil public : /createur/[handle].

-- ============================================================
-- profiles : identité publique du créateur
-- ============================================================
alter table profiles add column if not exists handle text unique;

-- Génère un handle unique (slug) à partir d'un nom, sinon aléatoire.
create or replace function gen_handle(seed text)
returns text
language plpgsql
as $$
declare
  base text;
  cand text;
  i int := 0;
begin
  base := lower(regexp_replace(coalesce(nullif(btrim(seed), ''), 'createur'), '[^a-zA-Z0-9]+', '-', 'g'));
  base := btrim(base, '-');
  if base = '' then base := 'createur'; end if;
  base := left(base, 24);
  cand := base;
  loop
    exit when not exists (select 1 from profiles where handle = cand);
    i := i + 1;
    cand := base || '-' || i;
  end loop;
  return cand;
end;
$$;

-- Backfill des profils existants.
do $$
declare r record;
begin
  for r in select id, full_name from profiles where handle is null loop
    update profiles set handle = gen_handle(r.full_name) where id = r.id;
  end loop;
end $$;

-- NB : les profils restent privés en RLS. Le profil public /createur/[handle]
-- est servi côté serveur via le client admin, en ne lisant que id/handle/full_name.

-- Trigger d'inscription : + handle
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus integer;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');

  insert into public.profiles (id, full_name, referral_code, handle)
  values (new.id, v_name, gen_referral_code(), gen_handle(v_name))
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

-- ============================================================
-- songs : chanson partagée avec les abonnés
-- ============================================================
alter table songs add column if not exists shared_with_followers boolean not null default false;
alter table songs add column if not exists followers_notified_at timestamptz;

create index if not exists songs_followers_idx on songs (user_id)
  where shared_with_followers;

-- NB : pas de nouvelle policy RLS. Les pages publiques (/inspiration, /createur)
-- lisent les chansons via le client admin en ne renvoyant que des champs sûrs
-- (jamais story / key_facts / sender_name). RLS `songs` reste inchangée.

-- ============================================================
-- follows : abonnements (utilisateur connecté OU email anonyme)
-- ============================================================
create table if not exists follows (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references auth.users (id) on delete cascade,
  follower_user_id  uuid references auth.users (id) on delete cascade,
  follower_email    text,
  unsubscribe_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at        timestamptz not null default now(),
  constraint follows_one_follower
    check ((follower_user_id is not null) <> (follower_email is not null)),
  constraint follows_not_self
    check (follower_user_id is null or follower_user_id <> creator_id)
);

-- follower_email est toujours stocké en minuscules par l'application → index simple.
create unique index if not exists follows_user_uidx
  on follows (creator_id, follower_user_id) where follower_user_id is not null;
create unique index if not exists follows_email_uidx
  on follows (creator_id, follower_email) where follower_email is not null;
create index if not exists follows_creator_idx on follows (creator_id);
create index if not exists follows_follower_idx on follows (follower_user_id);

alter table follows enable row level security;
-- Écriture / lecture : service role uniquement (les routes API gèrent l'accès).
-- (aucune policy → tout passe par le client admin)

-- Fan-out idempotent : une notif par (chanson, abonnement).
create table if not exists song_follow_notifications (
  song_id    uuid not null references songs (id) on delete cascade,
  follow_id  uuid not null references follows (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, follow_id)
);

alter table song_follow_notifications enable row level security;
