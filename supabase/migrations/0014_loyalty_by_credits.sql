-- Melodya — 0014 : la remise fidélité dépend des crédits ACHETÉS, plus des chansons créées
--   * loyalty_tiers.min_songs  ->  min_credits  (seuil = total de crédits achetés)
--   * remises revues à la baisse (« très minimes »)
-- À coller dans Supabase > SQL Editor après 0013.

alter table loyalty_tiers rename column min_songs to min_credits;

-- Nouveaux seuils / remises. On garde les lignes existantes (mêmes noms) :
update loyalty_tiers set min_credits = 0,   discount_pct = 0 where name = 'Nouveau';
update loyalty_tiers set min_credits = 15,  discount_pct = 2 where name = 'Bronze';
update loyalty_tiers set min_credits = 40,  discount_pct = 3 where name = 'Argent';
update loyalty_tiers set min_credits = 100, discount_pct = 4 where name = 'Or';
update loyalty_tiers set min_credits = 250, discount_pct = 5 where name = 'Platine';

-- Filet : si des paliers ont été renommés/ajoutés, borne les remises trop fortes.
update loyalty_tiers set discount_pct = 5 where discount_pct > 5;
