// Génère le secret serveur des paiements (PAYMENTS_DB_SECRET) et le SQL qui enregistre son empreinte.
// Le secret va dans .env.local (et l'hébergeur) ; seule son empreinte SHA-256 va en base.
import { createHash, randomBytes } from 'node:crypto';

const secret = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(secret, 'utf8').digest('hex');

console.log(`
1) Ajoutez cette ligne à .env.local (et aux variables de votre hébergeur) :

PAYMENTS_DB_SECRET=${secret}

2) Exécutez ce SQL dans Supabase → SQL Editor :

insert into private.app_secrets (name, secret_hash)
values ('payments', '${hash}')
on conflict (name) do update set secret_hash = excluded.secret_hash;
`);
