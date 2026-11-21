# factuflash
Devis et factures pour artisans avec l'IA. Projet de la formation FlowKorner.

## Développement local

```bash
npm install
npm run dev
```

Variables d'environnement : voir `.env.example` (valeurs dans `.env.local`).

### Webhook Stripe (mode test)

Dans un second terminal, pendant `npm run dev`. On passe explicitement la clé du projet à la Stripe CLI,
pour écouter **le même compte Stripe que l'application** (et non celui sur lequel la CLI est connectée) ;
la Stripe CLI récente exige aussi `--events`.

```bash
export $(grep STRIPE_SECRET_KEY .env.local)
```

```bash
stripe listen --api-key $STRIPE_SECRET_KEY --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed --forward-to localhost:3000/api/stripe/webhook
```

- La commande affiche un secret `whsec_…` : copiez-le dans `STRIPE_WEBHOOK_SECRET` (`.env.local`).
- Ce `whsec_` est **propre au compte Stripe** écouté : si vous changez de compte ou de clé, il change aussi.
- Next.js ne relit `.env.local` qu'au démarrage : **relancez `npm run dev`** après l'avoir modifié.
- Sans le bon `whsec_`, le webhook répond 400 (signature invalide) et l'acompte ne passe jamais à « payé ».
