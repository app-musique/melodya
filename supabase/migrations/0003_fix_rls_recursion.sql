-- Melodya — 0003 : corrige une récursion infinie dans la RLS de `profiles`
--
-- 0002 avait ajouté une policy `profiles_select_admin` qui interrogeait `profiles`
-- depuis une policy de `profiles` → « infinite recursion detected in policy ».
-- Conséquence : toute lecture de son propre profil échouait (solde affiché à 0).
--
-- Correctif : on supprime cette policy (les admins lisent les profils via le
-- service role, jamais via RLS) et on route les autres contrôles admin par la
-- fonction SECURITY DEFINER `is_admin()`, qui contourne la RLS (pas de récursion).

-- Fonction is_admin() (au cas où 0002 n'aurait pas été rejoué)
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

-- 1. La policy fautive
drop policy if exists "profiles_select_admin" on profiles;

-- 2. Réécrit les autres contrôles admin via is_admin()
drop policy if exists "app_settings_write_admin" on app_settings;
create policy "app_settings_write_admin" on app_settings
  for all using (is_admin()) with check (is_admin());

drop policy if exists "credit_packs_select_active" on credit_packs;
create policy "credit_packs_select_active" on credit_packs
  for select using (is_active or is_admin());

drop policy if exists "credit_packs_write_admin" on credit_packs;
create policy "credit_packs_write_admin" on credit_packs
  for all using (is_admin()) with check (is_admin());

drop policy if exists "credit_transactions_select_own" on credit_transactions;
create policy "credit_transactions_select_own" on credit_transactions
  for select using (user_id = auth.uid() or is_admin());
