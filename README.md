# Melodya — SaaS de chanson personnalisée par IA

Application Next.js : de la landing page au tunnel de commande, génération des paroles (Claude)
et de la musique (Suno), paiement Mobile Money (Moneroo), espace personnel et page cadeau
publique. Positionnée pour le marché africain — livraison 100 % en ligne, paiement one-shot.

## Démarrage rapide

```bash
cp .env.example .env.local        # renseigne au minimum les 3 clés Supabase
npm install
npm run dev                        # http://localhost:3000
```

**Supabase est la seule dépendance externe obligatoire.** Sans clé Anthropic / Suno / Moneroo,
ces briques tournent en **mode simulé** et le parcours complet reste jouable en local.

### 1. Créer le projet Supabase

Voir [`supabase/README.md`](supabase/README.md) — en résumé :

1. Nouveau projet sur https://supabase.com/dashboard
2. SQL Editor → coller [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run
3. Project Settings → API → copier `URL`, `anon key`, `service_role key` dans `.env.local`
4. Authentication → Providers → Email : désactiver « Confirm email » pour tester vite
5. (option) Authentication → Providers → Google : coller Client ID / Secret
6. Authentication → URL Configuration → Redirect URLs : ajouter
   `http://localhost:3000/auth/callback`

### 2. Variables d'environnement

| Variable | Rôle | Si absente |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Auth + base de données | l'app affiche un écran « configurer Supabase » |
| `NEXT_PUBLIC_SITE_URL` | URL absolue (redirections OAuth, liens) | `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Paroles via Claude (`claude-sonnet-5`) | paroles générées depuis un gabarit local |
| `MUSIC_PROVIDER` + `SUNO_API_BASE_URL` + `SUNO_API_KEY` | Génération musicale Suno | 3 extraits `public/samples/*.wav`, prêts après ~15 s |
| `MONEROO_SECRET_KEY` + `MONEROO_WEBHOOK_SECRET` | Paiement Moneroo (PayDunya + pawaPay) | paiement simulé, commande marquée payée sans redirection |

Variables optionnelles : `LYRICS_MODEL` (défaut `claude-sonnet-5`), `SUNO_MODEL` (défaut `V4_5`).

## Parcours utilisateur

1. `/connexion` — email + mot de passe ou Google
2. `/commander` — wizard 6 étapes : Occasion → Histoire → Style & voix → **Paroles**
   (génération IA + édition + 3 régénérations max) → Options → Paiement
3. `/commander/[id]/paiement` — retour de paiement (Moneroo réel ou simulé)
4. `/mes-chansons/[id]` — écran d'attente (polling), puis 3 versions à écouter / choisir /
   télécharger, pochette générée, activation d'une **page cadeau publique**
5. `/cadeau/[slug]` — page publique : dédicace, lecteur de la version choisie, paroles, OG image

## Architecture

```
src/
  proxy.ts                     # ex-middleware : refresh session + garde /commander /mes-chansons
  lib/
    env.ts                     # accès env + détection des modes mock
    supabase/{client,server,admin,session}.ts
    domain.ts                  # types + listes (styles, voix, occasions, statuts)
    pricing.ts                 # prix de base + add-ons (XOF)
    schemas.ts                 # validation Zod (étapes du wizard + payloads API)
    lyrics.ts                  # generateLyrics() : Claude + fallback gabarit
    music/{types,mock,suno,index}.ts   # interface MusicProvider + adaptateurs
    payments/moneroo.ts        # initializePayment() + verifyWebhookSignature() + mock
    songs.ts                   # helpers DB + machine à états de génération
    api.ts                     # requireUser(), helpers de réponse
  app/
    page.tsx                   # landing
    connexion/ , auth/{callback,signout}/
    commander/ , commander/[id]/paiement/
    mes-chansons/ , mes-chansons/[id]/
    cadeau/[slug]/
    api/
      songs/ (POST) , songs/[id]/ (GET, PATCH)
      songs/[id]/{status,generate,select-version,share,download,confirm-mock-payment}/
      lyrics/ , checkout/ , webhooks/moneroo/ , cover/[id]/ (OG image)
  components/
    wizard/ , song/ , auth/ , ui.tsx , app-header.tsx , account-nav.tsx
scripts/make-samples.mjs       # (re)génère public/samples/*.wav
supabase/migrations/0001_init.sql
```

### Choix de conception

- **Aucune file d'attente externe.** La génération avance via une machine à états
  (`advanceGeneration`) pilotée par le polling de `GET /api/songs/[id]/status`.
  → Évolution prévue : Trigger.dev / Inngest.
- **Intégrations isolées.** `music/`, `payments/`, `lyrics.ts` : un seul fichier à toucher
  pour brancher le vrai fournisseur. Le mode mock est choisi automatiquement selon la présence
  des clés (`src/lib/env.ts`).
- **Suno** : l'adaptateur `music/suno.ts` suit le schéma d'API tiers le plus courant
  (`POST /api/v1/generate` → `GET /api/v1/generate/record-info`). Ajuster aux endpoints réels
  du fournisseur retenu.
- **Moneroo** : `payments/moneroo.ts` cible `POST /v1/payments/initialize` + webhook signé
  HMAC-SHA256. Le webhook attend `metadata.song_id`.

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build de production |
| `npm run lint` | ESLint |
| `node scripts/make-samples.mjs` | régénère les extraits audio placeholder |

## Test end-to-end (mode mock)

1. Supabase configuré, autres clés vides.
2. `npm run dev`, ouvrir `/connexion`, créer un compte.
3. `/commander` : dérouler les 6 étapes, générer puis valider les paroles.
4. Étape Paiement → « Payer » → page `?mock=1` → confirmation → `/mes-chansons/[id]`.
5. Attendre ~15 s : la page passe à « Prête », 3 lecteurs audio apparaissent.
6. Choisir une version, télécharger le MP3 et la pochette.
7. Activer « page cadeau publique », ouvrir `/cadeau/[slug]` en navigation privée.

## À faire (passes suivantes)

- File d'attente de génération (Trigger.dev) + webhook Suno (`/api/webhooks/suno`)
- Intégration réelle Moneroo (PayDunya + pawaPay) : clés, page d'échec, réconciliation
- Clip vidéo lyrics, version instrumentale, WAV : génération réelle des assets
- Emails transactionnels (chanson prête, correction livrée)
- Back-office admin (suivi des commandes, remboursements)
- i18n FR / EN (`next-intl`)
- Pages légales (confidentialité, CGU)
