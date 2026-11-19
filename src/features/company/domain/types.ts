import type { VatModeDb } from '@/lib/supabase/database.types';

/** subject = facture la TVA ; franchise = TVA non applicable (art. 293 B du CGI). */
export type VatMode = VatModeDb;

export interface CompanyFormValues {
  name: string;
  siret: string;
  address: string;
  phone: string;
  /** Vide tant que l'artisan n'a pas choisi : pas de choix par défaut sur une mention légale. */
  vatMode: VatMode | '';
}

export type CompanyField = keyof CompanyFormValues | 'logo';

export type CompanyErrors = Partial<Record<CompanyField, string>>;

/** Données validées et normalisées, prêtes à enregistrer. */
export interface CompanyData {
  name: string;
  siret: string;
  address: string;
  phone: string;
  vatMode: VatMode;
}

export interface CompanyProfile extends CompanyData {
  logoUrl: string | null;
}

export type SaveCompanyResult =
  { ok: true } | { ok: false; errors: CompanyErrors; message?: string };
