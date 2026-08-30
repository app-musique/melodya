-- Melodya — 0013 : parrainage revu
--   * le filleul ne reçoit AUCUN crédit à l'inscription (via le lien de parrainage)
--   * le parrain est crédité au 1er ACHAT de crédits du filleul
--     (auparavant : à la 1re chanson livrée)
-- À coller dans Supabase > SQL Editor après 0012.

-- ============================================================
-- attach_referral : rattache le filleul à son parrain, SANS bonus filleul
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
end;
$$;

-- ============================================================
-- grant_credits : déclenche la récompense du parrain au 1er ACHAT du filleul
-- (grant_referral_reward reste idempotent via profiles.referral_rewarded)
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

  -- Un achat de crédits (mode réel ou simulé) récompense le parrain éventuel.
  if p_reason = 'purchase' then
    perform grant_referral_reward(p_user);
  end if;

  return v_balance;
end;
$$;

-- ============================================================
-- Nettoyage : le « bonus filleul » n'existe plus
-- ============================================================
delete from app_settings where key = 'referral_referee_bonus';
