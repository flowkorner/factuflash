'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LOGOS_BUCKET } from '../data/getCurrentCompany';
import type { LogoMimeType } from '../domain/validation';
import { isLogoMimeType, isVatMode, validateCompany, validateLogo } from '../domain/validation';
import type { SaveCompanyResult, VatMode } from '../domain/types';

const LOGO_EXTENSIONS: Record<LogoMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const GENERIC_ERROR = 'L’enregistrement a échoué. Réessayez dans un instant.';

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function readVatMode(formData: FormData): VatMode | '' {
  const value = readString(formData, 'vatMode');
  return isVatMode(value) ? value : '';
}

function readFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Enregistre « Mon entreprise » (création ou mise à jour).
 * Les règles sont revérifiées ici : le navigateur n'est jamais cru sur parole.
 * La RLS garantit en plus qu'un artisan n'écrit que sa propre ligne et son propre dossier de logos.
 */
export async function saveCompany(formData: FormData): Promise<SaveCompanyResult> {
  const { errors, data } = validateCompany({
    name: readString(formData, 'name'),
    siret: readString(formData, 'siret'),
    address: readString(formData, 'address'),
    phone: readString(formData, 'phone'),
    vatMode: readVatMode(formData),
  });
  const logo = readFile(formData, 'logo');
  const logoError = logo ? validateLogo(logo) : null;
  if (!data || logoError) {
    return { ok: false, errors: logoError ? { ...errors, logo: logoError } : errors };
  }
  const removeLogo = readString(formData, 'removeLogo') === 'true';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errors: {}, message: 'Votre session a expiré. Reconnectez-vous.' };
  }

  const { data: existing } = await supabase
    .from('companies')
    .select('logo_path')
    .eq('user_id', user.id)
    .maybeSingle();
  const previousLogoPath = existing?.logo_path ?? null;

  const uploadedPath =
    logo && isLogoMimeType(logo.type)
      ? `${user.id}/logo-${Date.now()}.${LOGO_EXTENSIONS[logo.type]}`
      : null;
  if (logo && uploadedPath) {
    const { error } = await supabase.storage.from(LOGOS_BUCKET).upload(uploadedPath, logo, {
      contentType: logo.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      console.error('[company] envoi du logo échoué', { message: error.message });
      return { ok: false, errors: { logo: 'L’envoi du logo a échoué. Réessayez.' } };
    }
  }

  const nextLogoPath = uploadedPath ?? (removeLogo ? null : previousLogoPath);
  const { error: upsertError } = await supabase.from('companies').upsert(
    {
      user_id: user.id,
      name: data.name,
      siret: data.siret,
      address: data.address,
      phone: data.phone,
      vat_mode: data.vatMode,
      logo_path: nextLogoPath,
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) {
    console.error('[company] enregistrement échoué', { code: upsertError.code });
    if (uploadedPath) await supabase.storage.from(LOGOS_BUCKET).remove([uploadedPath]);
    return { ok: false, errors: {}, message: GENERIC_ERROR };
  }

  // Ancien logo remplacé ou retiré : on le supprime du stockage (échec sans conséquence).
  if (previousLogoPath && previousLogoPath !== nextLogoPath) {
    await supabase.storage.from(LOGOS_BUCKET).remove([previousLogoPath]);
  }

  revalidatePath('/devis');
  revalidatePath('/entreprise');
  return { ok: true };
}
