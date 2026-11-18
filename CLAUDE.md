# FactuFlash

Devis et factures pour artisans, utilisés sur téléphone.
Stack : Next.js 15 (App Router, TypeScript strict) · MUI 7 · Jest + RTL. Prévu : Supabase (auth, BDD), Stripe (acomptes).
Maquette de référence : canvas « FactuFlash — Écrans artisan » (390×844).

## Commandes

- `npm run dev` · `npm run build`
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run format`

## Organisation

- `src/app/` : routes uniquement (metadata + rendu d'un écran). `/connexion`, `/devis`.
- `src/features/<domaine>/` : `components/`, `hooks/` (logique), `services/` (appels externes), `utils/`.
- `src/components/` : composants partagés (`MobileScreen`, `BrandLogo`).
- `src/theme/` : `tokens.ts` (couleurs de la maquette) + `theme.ts` (MUI). Pas de couleur en dur ailleurs.

## Conventions

- Composants fonctionnels, hooks, pas de `let`, jamais de `any` (règles ESLint).
- Logique dans des custom hooks, JSX simple. `useMemo` / `useCallback` quand utile.
- Mobile d'abord : cibles ≥ 48 px, `100dvh`, zones sûres iOS. Accessibilité : labels, `aria-*`, gestion du focus.
- Textes de l'interface en français. Tests : comportement utilisateur (RTL), services mockés.
- Redux classique seulement si un état global devient nécessaire.

## Façon de travailler

- Un ticket à la fois. Proposer le plan avant de coder.
- Jamais de commit ni de push sans accord explicite.
- Ne jamais supprimer un fichier ou un dossier sans demander.

## État actuel (ticket 1)

- Lien magique simulé : `src/features/auth/services/magicLink.ts` (à remplacer par `supabase.auth.signInWithOtp`).
- « Nouveau devis » et « Mon entreprise » : visibles, désactivés, marqués « bientôt ».
