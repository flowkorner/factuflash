-- Correctif : le projet a été créé sans « Grant API access to new tables automatically ».
-- Sans grant, PostgREST répond 42501 (permission denied) même quand la RLS autorise.
-- Règle du projet : chaque migration donne ses grants explicitement.

grant select, insert, update on table public.companies to authenticated;
