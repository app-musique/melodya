-- Melodya — 0017 : chansons mises en avant sur la landing (écoutables sans compte)
--   songs.landing_order : 1..N = position sur la page d'accueil, null = pas affichée.
-- À coller dans Supabase > SQL Editor après 0016.

alter table songs add column if not exists landing_order integer;

create unique index if not exists songs_landing_order_uidx
  on songs (landing_order)
  where landing_order is not null;
