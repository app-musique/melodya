-- Muzikii — 0008 : réactions publiques sur les chansons « s'inspirer » (Explorer)
-- À coller dans Supabase > SQL Editor après 0007.
--
-- Les pages /inspiration/[id] sont publiques : n'importe quel auditeur peut
-- « aimer / réagir ». On réutilise gift_reactions (déjà clé par song_id) avec
-- une dédup par auditeur (reactor_key, stocké côté navigateur).

-- 1 réaction par auditeur et par chanson (l'emoji peut changer).
-- Index NON partiel : les NULL sont distincts en Postgres → les réactions des
-- pages cadeau (reactor_key NULL) ne sont pas contraintes, et `on_conflict`
-- peut cibler (song_id, reactor_key) pour l'upsert des vitrines.
alter table gift_reactions add column if not exists reactor_key text;

create unique index if not exists gift_reactions_reactor_idx
  on gift_reactions (song_id, reactor_key);

-- Élargit l'accès : vitrines (is_showcase) en plus des pages cadeau (is_public).
drop policy if exists "gift_reactions_insert_public" on gift_reactions;
create policy "gift_reactions_insert_public" on gift_reactions
  for insert with check (
    exists (select 1 from songs s where s.id = song_id and (s.is_public or s.is_showcase))
  );

drop policy if exists "gift_reactions_select" on gift_reactions;
create policy "gift_reactions_select" on gift_reactions
  for select using (
    exists (select 1 from songs s where s.id = song_id and (s.is_public or s.is_showcase))
    or exists (select 1 from songs s where s.id = song_id and s.user_id = auth.uid())
    or is_admin()
  );
