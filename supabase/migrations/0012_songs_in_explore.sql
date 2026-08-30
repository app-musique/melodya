-- Muzikii — 0012 : les chansons des utilisateurs apparaissent dans « s'inspirer »
-- À coller dans Supabase > SQL Editor après 0011.
--
-- Par défaut, une chanson créée par un utilisateur est visible dans la section
-- Inspiration (Explorer + page publique /inspiration/[id]). L'utilisateur peut
-- la retirer depuis « Mes chansons ».

alter table songs add column if not exists in_explore boolean not null default true;

-- On repart d'une base propre : les chansons DÉJÀ créées (données de test,
-- cadeaux privés d'avant cette fonctionnalité) ne sont pas remontées
-- automatiquement. Seules les chansons créées à partir de maintenant le sont.
update songs set in_explore = false where in_explore = true and is_showcase = false;

create index if not exists songs_in_explore_idx on songs (created_at desc)
  where in_explore and status = 'ready';
