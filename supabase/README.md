# Configuration Supabase — Muzikii

Supabase est la **seule dépendance externe obligatoire** pour lancer l'app en local
(paroles, musique et paiement tournent en mode simulé tant que leurs clés ne sont pas fournies).

## 1. Créer le projet

1. Va sur https://supabase.com/dashboard → **New project** (plan gratuit suffisant).
2. Note le mot de passe de la base (non nécessaire ici mais utile).
3. Attends la fin du provisioning (~2 min).

## 2. Appliquer le schéma

**Option A — SQL Editor (le plus simple)**

1. Dashboard → **SQL Editor** → **New query**.
2. Colle le contenu de [`migrations/0001_init.sql`](migrations/0001_init.sql).
3. **Run**.

**Option B — CLI**

```bash
npm i -g supabase
supabase link --project-ref <ref>
supabase db push
```

## 3. Récupérer les clés

Dashboard → **Project Settings → API** :

| Variable `.env.local`             | Valeur Supabase                    |
| --------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`         | Project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | `anon` `public`                    |
| `SUPABASE_SERVICE_ROLE_KEY`        | `service_role` `secret` (⚠️ privé) |

## 4. Authentification

Dashboard → **Authentication → Providers** :

- **Email** : activé par défaut. Pour tester vite, désactive « Confirm email »
  (Authentication → Providers → Email → *Confirm email* = off).
- **Google** :
  1. Crée un OAuth Client ID sur https://console.cloud.google.com/apis/credentials
     (type « Web application »).
  2. **Authorized redirect URI** :
     `https://<ref>.supabase.co/auth/v1/callback`
  3. Colle *Client ID* et *Client secret* dans Supabase → Providers → Google → Enable.

Dashboard → **Authentication → URL Configuration** :

- **Site URL** : `http://localhost:3000`
- **Redirect URLs** : ajoute `http://localhost:3000/auth/callback`
  (et l'équivalent de production plus tard).

## 5. Lancer

```bash
cp .env.example .env.local   # puis renseigne les 3 clés Supabase + NEXT_PUBLIC_SITE_URL
npm install
npm run dev
```
