-- Melodya — 0015 : marquer les paiements de test + tracer tous les achats
--   * payments.is_test : exclut le paiement des compteurs du panneau admin
--     (chiffre d'affaires, crédits vendus, clients payants…) sans le supprimer.
--   * Les paiements en mode simulé (mock) et les paiements de test connus sont
--     marqués rétroactivement -> le compteur repart de zéro.
-- À coller dans Supabase > SQL Editor après 0014.

alter table payments add column if not exists is_test boolean not null default false;

create index if not exists payments_is_test_idx on payments (is_test);

-- Historique : tout ce qui vient du mode simulé + les essais Moneroo réels.
update payments set is_test = true
where provider_ref like 'mock\_%' escape '\'
   or method = 'mock'
   or provider_ref in ('py_6rudboo7d5jf', 'py_bdhzzj2qweal', 'py_7gvlnaj8bc5y');
