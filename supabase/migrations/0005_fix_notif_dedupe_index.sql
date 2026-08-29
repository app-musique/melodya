-- Melodya — 0005 : corrige l'index de déduplication des notifications
--
-- 0004 créait un index unique PARTIEL sur (user_id, dedupe_key) WHERE dedupe_key
-- IS NOT NULL. PostgREST ne sait pas cibler un index partiel avec `on_conflict`,
-- donc les upserts dédupliqués (song_ready, gift_viewed, occasion_soon…)
-- échouaient silencieusement → aucune notification créée.
--
-- Un index unique NON partiel convient : PostgreSQL considère les NULL comme
-- distincts, donc plusieurs notifications sans dedupe_key restent autorisées.

drop index if exists notifications_dedupe_idx;
create unique index if not exists notifications_dedupe_idx
  on notifications (user_id, dedupe_key);
