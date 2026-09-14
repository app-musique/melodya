-- Melodya — 0019 : statistiques de fréquentation (visiteurs / pages vues)
--   Journal de visites (1re partie, anonyme) + 2 fonctions d'agrégation
--   utilisées par le panneau Admin › Statistiques.
-- À coller dans Supabase > SQL Editor après 0018.

create table if not exists page_views (
  id         bigint generated always as identity primary key,
  visitor_id text not null,
  path       text not null,
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_idx on page_views (created_at);
create index if not exists page_views_visitor_idx on page_views (visitor_id, created_at);

alter table page_views enable row level security;
-- Écriture (API de tracking) ET lecture (panneau admin) via le service role
-- uniquement — aucune policy publique.

-- ============================================================
-- Agrégation par tranche (heure ou jour) sur [p_start, p_end)
-- ============================================================
create or replace function get_visit_stats(p_start timestamptz, p_end timestamptz, p_bucket text)
returns table(bucket timestamptz, visitors bigint, pageviews bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    date_trunc(case when p_bucket = 'hour' then 'hour' else 'day' end, created_at) as bucket,
    count(distinct visitor_id) as visitors,
    count(*) as pageviews
  from page_views
  where created_at >= p_start and created_at < p_end
  group by 1
  order by 1;
$$;

-- ============================================================
-- Totaux (visiteurs uniques réels sur toute la période, pas la somme
-- des tranches) sur [p_start, p_end)
-- ============================================================
create or replace function get_visit_totals(p_start timestamptz, p_end timestamptz)
returns table(visitors bigint, pageviews bigint)
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct visitor_id) as visitors, count(*) as pageviews
  from page_views
  where created_at >= p_start and created_at < p_end;
$$;
