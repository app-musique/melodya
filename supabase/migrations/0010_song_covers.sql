-- Muzikii — 0010 : pochettes de chanson (image générée par Suno, ou choisie/importée)
-- À coller dans Supabase > SQL Editor après 0009.

-- Pochette affichée : image générée par Suno (ré-hébergée sur Storage), ou
-- image/GIF importé par le créateur. NULL => tuile dégradée de repli.
alter table songs add column if not exists cover_url text;

-- true => pochette choisie ou importée par le créateur : syncSongAssets n'y touche plus.
alter table songs add column if not exists cover_custom boolean not null default false;

-- Pochette générée par Suno pour chaque version (pour laisser le créateur choisir).
alter table song_versions add column if not exists image_url text;
