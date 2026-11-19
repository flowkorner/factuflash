# FactuFlash

Devis et factures pour artisans, utilisés sur téléphone.
Stack : Next.js 15 (App Router, TypeScript strict) · MUI 7 · Supabase (Auth, Postgres + RLS, Storage) · Jest + RTL. Prévu : Stripe (acomptes).
Maquette de référence : canvas « FactuFlash — Écrans artisan » (390×844).

## Commandes

- `npm run dev` · `npm run build`
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run format`

## Organisation

- `src/app/` : routes uniquement (metadata + rendu d'un écran). `/connexion`, `/devis`.
- `src/features/<domaine>/` : `components/`, `hooks/` (logique), `services/` (appels externes), `utils/`.
- `src/components/` : composants partagés (`MobileScreen`, `BrandLogo`).
- `src/theme/` : `tokens.ts` (couleurs de la maquette) + `theme.ts` (MUI). Pas de couleur en dur ailleurs.
- `src/lib/env.ts` : variables d'environnement typées (liste dans `.env.example`, valeurs dans `.env.local`).
- `src/lib/supabase/` : client serveur (`server.ts`) et rafraîchissement de session (`middleware.ts`).
- `src/middleware.ts` : pages protégées → `/connexion` si non connecté.
- `supabase/templates/` : modèles d'email à copier dans le tableau de bord Supabase.

## Conventions

- Composants fonctionnels, hooks, pas de `let`, jamais de `any` (règles ESLint).
- Logique dans des custom hooks, JSX simple. `useMemo` / `useCallback` quand utile.
- Mobile d'abord : cibles ≥ 48 px, `100dvh`, zones sûres iOS. Accessibilité : labels, `aria-*`, gestion du focus.
- Textes de l'interface en français. Tests : comportement utilisateur (RTL), services mockés.
- Redux classique seulement si un état global devient nécessaire.

## Supabase

- Appels Supabase uniquement côté serveur (Server Actions, Route Handlers, Server Components).
- Uniquement la clé publique (publishable / anon). Jamais la clé `service_role` dans l'app.
- Lien magique : `signInWithOtp` → email → `/auth/confirm?token_hash=…` → `verifyOtp` (marche d'un navigateur à l'autre).

## Façon de travailler

- Plusieurs tickets peuvent s'enchaîner : appliquer ses recommandations sans demander, et noter chaque choix dans le résumé final.
- S'arrêter uniquement pour : une clé ou un compte à créer (l'utilisateur le fait), une suppression de fichier, le commit/push.
- Un commit par ticket. Jamais de commit ni de push sans accord explicite.
- Ne jamais supprimer un fichier ou un dossier sans demander.

## État actuel

- Ticket 2 : connexion par vrai lien magique Supabase, bouton « Se déconnecter » sur Mes devis.
- « Nouveau devis » et « Mon entreprise » : visibles, désactivés, marqués « bientôt ».
