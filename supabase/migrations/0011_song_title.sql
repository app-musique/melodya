-- Muzikii — 0011 : titre de chanson (facultatif) + destinataire/expéditeur non requis
-- À coller dans Supabase > SQL Editor après 0010.
--
-- L'utilisateur peut créer une chanson juste pour lui : ni prénom du
-- destinataire, ni prénom de l'expéditeur, ni relation ne sont obligatoires.
-- Il peut donner un titre ; l'IA peut écrire les paroles à partir du titre.

alter table songs add column if not exists title text;
