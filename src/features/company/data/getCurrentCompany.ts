import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CompanyProfile } from '../domain/types';

export const LOGOS_BUCKET = 'logos';

/** Profil de l'artisan connecté, ou null s'il n'a pas encore rempli « Mon entreprise ». */
export async function getCurrentCompany(): Promise<CompanyProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('companies')
    .select('name, siret, address, phone, vat_mode, logo_path')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Lecture de l’entreprise impossible (${error.code})`);
  }
  if (!data) return null;

  const logoUrl = data.logo_path
    ? supabase.storage.from(LOGOS_BUCKET).getPublicUrl(data.logo_path).data.publicUrl
    : null;

  return {
    name: data.name,
    siret: data.siret,
    address: data.address,
    phone: data.phone,
    vatMode: data.vat_mode,
    logoUrl,
  };
}
