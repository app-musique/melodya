-- Melodya — 0007 : durcissement de la génération
-- À coller dans Supabase > SQL Editor après 0006.

-- ============================================================
-- song_versions : suivi du ré-hébergement + id fournisseur
-- ============================================================
alter table song_versions add column if not exists provider_audio_id text;
alter table song_versions add column if not exists persisted_at timestamptz;

-- ============================================================
-- songs : synchronisation des assets (ré-hébergement + timings)
-- ============================================================
alter table songs add column if not exists assets_synced_at timestamptz;

-- ============================================================
-- app_errors : journal d'erreurs serveur (visible en admin)
-- ============================================================
create table if not exists app_errors (
  id         uuid primary key default gen_random_uuid(),
  context    text not null,
  message    text not null,
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists app_errors_created_idx on app_errors (created_at desc);

alter table app_errors enable row level security;

drop policy if exists "app_errors_select_admin" on app_errors;
create policy "app_errors_select_admin" on app_errors
  for select using (is_admin());
-- insert : service role uniquement (pas de policy).

-- ============================================================
-- spend_credit : la récompense de parrainage passe à advanceGeneration
-- (le parrain n'est crédité que pour une chanson réellement livrée).
-- ============================================================
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
