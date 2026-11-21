# FactuFlash

Devis et factures pour artisans, utilisés sur téléphone.
Stack : Next.js 15 (App Router, TypeScript strict) · MUI 7 · Supabase (Auth, Postgres + RLS, Storage) · Stripe (acomptes, mode test) · Jest + RTL.
Maquette de référence : canvas « FactuFlash — Écrans artisan » (390×844).

## Commandes

- `npm run dev` · `npm run build`
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run format`

## Organisation

- `src/app/` : routes uniquement (metadata + rendu d'un écran). `/connexion`, `/devis`, `/devis/nouveau`, `/devis/[id]` (+ `/pdf`), `/entreprise`,
  et la page publique client `/d/[token]` (+ `/pdf`), sans compte. Factures : `/factures/[id]/pdf` (artisan),
  `/f/[token]` (+ `/pdf`) pour le client.
- `src/features/<domaine>/` : `components/`, `hooks/` (logique), `services/` (appels externes), `utils/`.
- `src/components/` : composants partagés (`MobileScreen`, `BrandLogo`).
- `src/theme/` : `tokens.ts` (couleurs de la maquette) + `theme.ts` (MUI). Pas de couleur en dur ailleurs.
- `src/lib/env.ts` : variables d'environnement typées (liste dans `.env.example`, valeurs dans `.env.local`).
- `src/lib/supabase/` : client serveur (`server.ts`) et rafraîchissement de session (`middleware.ts`).
- `src/middleware.ts` : pages protégées (`/devis…`, `/entreprise`) → `/connexion` si non connecté.
- `src/features/<domaine>/domain/` : règles métier pures et testées (ex. contrôle du SIRET).
- `supabase/migrations/` : SQL versionné (tables, RLS, stockage). Une migration = un fichier horodaté, jamais modifié après application.
- `src/lib/supabase/database.types.ts` : types de la base, à tenir à jour avec chaque migration.
- `supabase/templates/` : modèles d'email à copier dans le tableau de bord Supabase.
- `src/lib/email/resend.ts` : envoi d'emails (API HTTP Resend, serveur uniquement).
- `src/features/quotes/document/` : snapshot figé → modèle d'affichage partagé par la page web et le PDF (`pdf/`).
- `src/features/payments/` : acompte Stripe (session, Payment Element, webhook). `src/lib/stripe/server.ts` : client Stripe.
- `src/app/api/stripe/webhook/route.ts` : webhook Stripe (hors middleware).
- `src/features/invoices/` : factures (contenu figé, mentions légales, PDF, emails, section « Factures » du devis).

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
- Toute table a la RLS activée, avec des policies limitées à `auth.uid()`. Les données sont revalidées côté serveur.
- **Grants explicites dans chaque migration** (le projet n'accorde pas l'accès API automatiquement) :
  `grant select, insert, update … to authenticated;` au plus juste, et `grant execute` pour chaque fonction appelée par l'app.
  Rien pour `anon`, sauf `get_public_quote`, `accept_public_quote`, `prepare_deposit_checkout` (jeton secret exigé)
  et `record_deposit_payment` (secret serveur exigé, empreinte dans `private.app_secrets`).
- Statuts des devis : `draft` → `sent` (fonction `send_quote`) → `accepted` (fonction `accept_public_quote`, par le client)
  → `deposit_paid` (fonction `record_deposit_payment`, par le webhook Stripe uniquement)
  → `invoiced` (« Facturé », `create_final_invoice`) → `paid` (« Soldé », `mark_final_invoice_paid`).
  Droits par colonne sur `quotes` : l'artisan ne peut écrire ni statut, ni snapshot, ni jeton, ni acceptation.
- Lien client : jeton de 256 bits, seule son empreinte SHA-256 est en base. Un renvoi crée un nouveau lien (l'ancien meurt).
- Fichiers : bucket `logos`, un dossier par utilisateur (`<user_id>/…`), écriture réservée à son propriétaire.
- Écriture multi-tables = une fonction SQL `security invoker` (ex. `save_quote_draft`) : une transaction, RLS appliquée.
- Clés étrangères composites `(id, user_id)` : impossible de rattacher la donnée d'un autre artisan.

## Devis : argent et calculs

- Montants en **centimes** (entiers), quantités en **millièmes**, TVA en **points de base** (2000 = 20 %). Jamais de flottant.
- Totaux jamais stockés : calculés par `quote_summaries` (SQL) et `computeTotals` (TS), avec les **mêmes arrondis**
  (HT arrondi par ligne, TVA arrondie par taux). Toute modification se fait des deux côtés, avec un test.
- Préparé pour l'IA : `quotes.description` (entrée), `price_items` (tarifs), `source` `'manual' | 'ai'` sur devis et lignes.

## Emails

- Variables serveur (jamais `NEXT_PUBLIC_`) : `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TEST_RECIPIENT` (mode test :
  tout part vers cette adresse). Texte saisi toujours échappé dans le HTML.

## Factures

- Numéro `F-AAAA-NNN` par artisan et par an, tiré d'un compteur dans la MÊME transaction que la création : continu,
  sans trou, jamais réattribué. Aucune suppression possible (trigger `private.protect_invoice` + FK `on delete restrict`).
- Facture inaltérable une fois émise : seuls l'envoi (lien, email) et le paiement du solde peuvent être renseignés.
  Correction = avoir (à venir), jamais une modification.
- Facture d'acompte : créée par `record_deposit_payment` avec le paiement (TVA au prorata des taux du devis), acquittée.
  Facture de solde : toutes les lignes, acomptes déjà facturés déduits, échéance 0 à 60 jours.
- Mentions légales régénérées depuis le contenu figé (`buildInvoiceMentions`, versionnées) : échéance, pénalités,
  indemnité de 40 €, pas d'escompte, mention TVA selon le régime, date d'exécution.

## Paiements (Stripe)

- MODE TEST uniquement : `getStripeEnv` refuse une clé live. Checkout Sessions `ui_mode: 'elements'` + Payment Element
  aux couleurs de l'app (`stripeAppearance.ts`). Jamais de `payment_method_types` : moyens de paiement réglés dans Stripe.
- Montant de l'acompte fixé à l'envoi (`deposit_percent`, `deposit_cents`), relu en base pour créer la session.
- Statut « Acompte payé » posé UNIQUEMENT par le webhook signé (`checkout.session.completed` /
  `async_payment_succeeded`, `payment_status = 'paid'`), de façon idempotente. La page de retour ne fait que relire la base.
- Variables : `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENTS_DB_SECRET`
  (`npm run secret:payments`). Webhook local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Façon de travailler

- Plusieurs tickets peuvent s'enchaîner : appliquer ses recommandations sans demander, et noter chaque choix dans le résumé final.
- S'arrêter uniquement pour : une clé ou un compte à créer (l'utilisateur le fait), une suppression de fichier, le commit/push.
- Un commit par ticket. Jamais de commit ni de push sans accord explicite.
- Ne jamais supprimer un fichier ou un dossier sans demander.

## État actuel

- Ticket 2 : connexion par vrai lien magique Supabase, bouton « Se déconnecter » sur Mes devis.
- Ticket 3 : écran Mon entreprise (`/entreprise`), table `companies` + bucket `logos`. Première connexion → `/entreprise`.
- Ticket 4 : devis saisis à la main (brouillons) : clients, lignes, totaux, numérotation `D-AAAA-NNN`, mentions légales.
- Suppression d'un brouillon (carte de Mes devis et écran du devis), confirmée par `ConfirmDialog` (jamais `window.confirm`).
  Un numéro supprimé n'est jamais réattribué.
- Ticket 5 : envoi au client par email, page publique `/d/[token]`, acceptation (nom + case « bon pour accord »),
  devis figé à l'envoi (`snapshot`), PDF artisan et client.
- Ticket 6 : acompte payé en ligne par le client (Stripe, mode test), badge « Acompte payé » et montant reçu.
- Ticket 7 : factures d'acompte (automatiques) et de solde, PDF, email, lien public, statuts « Facturé » / « Soldé ».
