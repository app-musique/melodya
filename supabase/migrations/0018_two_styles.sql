-- Melodya — 0018 : deux styles possibles par chanson (un par version)
--   Chaque génération produit 2 versions. Si l'utilisateur choisit un
--   « style de la version 2 » différent, on lance 2 jobs Suno (un par style)
--   et on prend 1 piste de chacun.
-- À coller dans Supabase > SQL Editor après 0017.

alter table songs add column if not exists music_style_b text;

-- Suivi par version : job d'origine + timings + style (les 2 versions peuvent
-- venir de jobs différents avec des arrangements différents).
alter table song_versions add column if not exists provider_job_id text;
alter table song_versions add column if not exists lyrics_timing jsonb;
alter table song_versions add column if not exists music_style text;

-- Jobs de génération (1 ou 2 par chanson selon le nombre de styles).
create table if not exists song_jobs (
  id                uuid primary key default gen_random_uuid(),
  song_id           uuid not null references songs (id) on delete cascade,
  slot              smallint not null,              -- 1 ou 2 => idx de la version cible
  provider          text not null default 'suno',
  provider_job_id   text,
  style             text not null,
  status            text not null default 'pending', -- pending | ready | failed
  audio_url         text,
  duration_sec      integer,
  provider_audio_id text,
  image_url         text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  unique (song_id, slot)
);

create index if not exists song_jobs_song_idx on song_jobs (song_id);
create index if not exists song_jobs_provider_job_idx on song_jobs (provider_job_id);

alter table song_jobs enable row level security;
-- Écriture ET lecture via le service role uniquement (orchestration serveur).
