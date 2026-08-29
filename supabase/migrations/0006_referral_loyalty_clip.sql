-- Melodya — 0006 : parrainage, fidélité (remise paliers), colonnes/table clip cadeau
-- À coller dans Supabase > SQL Editor après 0005.

-- ============================================================
-- profiles : parrainage + préférences email + accueil
-- ============================================================
alter table profiles add column if not exists referral_code text unique;
alter table profiles add column if not exists referred_by uuid references auth.users (id) on delete set null;
alter table profiles add column if not exists referral_rewarded boolean not null default false;
alter table profiles add column if not exists email_notifications boolean not null default true;
alter table profiles add column if not exists welcomed_at timestamptz;

create index if not exists profiles_referred_by_idx on profiles (referred_by);

-- Code de parrainage unique (6 caractères hexadécimaux majuscules).
create or replace function gen_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := upper(substring(md5(gen_random_uuid()::text) from 1 for 6));
    select exists (select 1 from profiles where referral_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- Backfill des profils déjà créés.
do $$
declare
  r record;
begin
  for r in select id from profiles where referral_code is null loop
    update profiles set referral_code = gen_referral_code() where id = r.id;
  end loop;
end $$;

-- ============================================================
-- app_settings : montants de parrainage (éditables en admin)
-- ============================================================
insert into app_settings (key, value) values
  ('referral_referee_bonus', '1'),
  ('referral_referrer_reward', '2')
on conflict (key) do nothing;

-- ============================================================
-- loyalty_tiers : paliers de fidélité → remise sur les packs
-- ============================================================
create table if not exists loyalty_tiers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  min_songs    integer not null default 0 check (min_songs >= 0),
  discount_pct integer not null default 0 check (discount_pct between 0 and 90),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists loyalty_tiers_set_updated_at on loyalty_tiers;
create trigger loyalty_tiers_set_updated_at
  before update on loyalty_tiers
  for each row execute function set_updated_at();

insert into loyalty_tiers (name, min_songs, discount_pct, sort_order)
select * from (values
  ('Nouveau', 0, 0, 1),
  ('Bronze', 3, 5, 2),
  ('Argent', 8, 10, 3),
  ('Or', 20, 15, 4),
  ('Platine', 50, 20, 5)
) as v(name, min_songs, discount_pct, sort_order)
where not exists (select 1 from loyalty_tiers);

alter table loyalty_tiers enable row level security;

drop policy if exists "loyalty_tiers_select_all" on loyalty_tiers;
create policy "loyalty_tiers_select_all" on loyalty_tiers
  for select using (true);

drop policy if exists "loyalty_tiers_write_admin" on loyalty_tiers;
create policy "loyalty_tiers_write_admin" on loyalty_tiers
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- songs : dédicace du clip cadeau
-- ============================================================
alter table songs add column if not exists clip_dedication text;

-- ============================================================
-- song_photos : photos ajoutées au clip cadeau
-- ============================================================
create table if not exists song_photos (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references songs (id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists song_photos_song_idx on song_photos (song_id, sort_order);

alter table song_photos enable row level security;

drop policy if exists "song_photos_all_own" on song_photos;
create policy "song_photos_all_own" on song_photos
  for all using (
    exists (select 1 from songs s where s.id = song_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from songs s where s.id = song_id and s.user_id = auth.uid())
  );

-- Lecture publique quand la page cadeau est publique (page /cadeau/[slug]/clip).
drop policy if exists "song_photos_select_public" on song_photos;
create policy "song_photos_select_public" on song_photos
  for select using (
    exists (select 1 from songs s where s.id = song_id and s.is_public)
  );

-- ============================================================
-- Récompense de parrainage : créditée à la 1re chanson du filleul
-- ============================================================
create or replace function grant_referral_reward(p_referee uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_rewarded boolean;
  v_amount integer;
begin
  select referred_by, referral_rewarded into v_referrer, v_rewarded
  from profiles where id = p_referee;

  if v_referrer is null or v_rewarded then
    return;
  end if;

  update profiles set referral_rewarded = true where id = p_referee;

  select coalesce((select value::int from app_settings where key = 'referral_referrer_reward'), 0)
  into v_amount;

  if v_amount > 0 then
    perform grant_credits(v_referrer, v_amount, 'referral', null);
  end if;
end;
$$;

-- spend_credit : + déclenche la récompense de parrainage au 1er passage
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
  v_first boolean;
begin
  select credit_balance into v_balance from profiles where id = p_user for update;

  if v_balance is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  select not exists (
    select 1 from credit_transactions where user_id = p_user and reason = 'song'
  ) into v_first;

  update profiles set credit_balance = credit_balance - p_amount where id = p_user
  returning credit_balance into v_balance;

  insert into credit_transactions (user_id, amount, reason, song_id, balance_after)
  values (p_user, -p_amount, 'song', p_song, v_balance);

  if v_first then
    perform grant_referral_reward(p_user);
  end if;

  return v_balance;
end;
$$;

-- ============================================================
-- attach_referral : rattache un filleul à son parrain (post-inscription)
-- ============================================================
create or replace function attach_referral(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
  v_referred uuid;
  v_created timestamptz;
  v_bonus integer;
begin
  if v_uid is null then
    return;
  end if;

  select referred_by, created_at into v_referred, v_created
  from profiles where id = v_uid;

  if v_referred is not null then
    return;
  end if;
  -- Fenêtre anti-abus : rattachement possible seulement pour un compte récent.
  if v_created is null or v_created < now() - interval '48 hours' then
    return;
  end if;

  select id into v_referrer from profiles
  where referral_code = upper(trim(p_code)) and id <> v_uid
  limit 1;

  if v_referrer is null then
    return;
  end if;

  update profiles set referred_by = v_referrer
  where id = v_uid and referred_by is null;

  select coalesce((select value::int from app_settings where key = 'referral_referee_bonus'), 0)
  into v_bonus;

  if v_bonus > 0 then
    perform grant_credits(v_uid, v_bonus, 'bonus', null);
  end if;
end;
$$;

-- ============================================================
-- Trigger d'inscription : + génération du code de parrainage
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
  insert into public.profiles (id, full_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    gen_referral_code()
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
