-- Melodya — 0016 : réglages d'intégration éditables depuis l'admin (secrets inclus)
--   Contrairement à app_settings (lecture publique), cette table n'est lisible
--   que par un admin / le service role — on peut donc y stocker le jeton API
--   Conversions de Meta.
-- À coller dans Supabase > SQL Editor après 0015.

create table if not exists integration_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table integration_settings enable row level security;

-- Lecture + écriture réservées aux admins. Le service role contourne la RLS
-- (lectures serveur : pixel Meta dans le layout, API Conversions).
drop policy if exists "integration_settings_admin" on integration_settings;
create policy "integration_settings_admin" on integration_settings
  for all using (is_admin()) with check (is_admin());
