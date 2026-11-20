-- Suppression des brouillons de devis.
-- À exécuter une fois : Supabase → SQL Editor → coller ce fichier → Run.
--
-- * Seul le propriétaire peut supprimer, et seulement un devis au statut « draft ».
-- * Les lignes partent avec le devis : clé étrangère quote_lines → quotes déjà en « on delete cascade »
--   (migration 20261119100000_create_quotes).
-- * Le client est conservé (il peut servir à d'autres devis).
-- * Le numéro supprimé n'est pas réattribué : le compteur ne recule jamais.

create policy "quotes_delete_own_draft" on public.quotes for delete to authenticated
  using ((select auth.uid()) = user_id and status = 'draft');

-- Grant explicite (pas de grants automatiques sur ce projet).
grant delete on table public.quotes to authenticated;
