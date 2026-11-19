import type { CompanyData, CompanyErrors, CompanyFormValues, VatMode } from './types';

export const VAT_MODES: readonly VatMode[] = ['subject', 'franchise'];

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

export const COMPANY_ERRORS = {
  nameRequired: 'Indiquez le nom de votre entreprise.',
  nameTooLong: 'Le nom est trop long (120 caractères maximum).',
  siretFormat: 'Le SIRET compte 14 chiffres.',
  siretInvalid: 'Ce SIRET n’existe pas. Vérifiez les chiffres sur votre avis Insee ou votre Kbis.',
  addressRequired: 'Indiquez l’adresse complète (rue, code postal, ville).',
  phoneInvalid: 'Numéro français attendu. Exemple : 06 12 34 56 78',
  vatRequired: 'Choisissez votre situation de TVA.',
  logoType: 'Format accepté : PNG, JPG ou WebP.',
  logoSize: 'Image trop lourde : 2 Mo maximum.',
} as const;

export function isVatMode(value: string): value is VatMode {
  return (VAT_MODES as readonly string[]).includes(value);
}

export function isLogoMimeType(value: string): value is LogoMimeType {
  return (LOGO_MIME_TYPES as readonly string[]).includes(value);
}

export function normalizeSiret(value: string): string {
  return value.replace(/\D/g, '');
}

function luhnSum(digits: string): number {
  return digits
    .split('')
    .reverse()
    .map(Number)
    .reduce((sum, digit, index) => {
      if (index % 2 === 0) return sum + digit;
      const doubled = digit * 2;
      return sum + (doubled > 9 ? doubled - 9 : doubled);
    }, 0);
}

/** Contrôle de Luhn, avec l'exception des établissements de La Poste (SIREN 356000000). */
export function isValidSiret(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false;
  if (value.startsWith('356000000')) {
    const digitSum = value.split('').reduce((sum, digit) => sum + Number(digit), 0);
    return digitSum % 5 === 0;
  }
  return luhnSum(value) % 10 === 0;
}

export function formatSiret(siret: string): string {
  const digits = normalizeSiret(siret);
  if (digits.length !== 14) return siret;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

/** Numéro de TVA intracommunautaire français, déduit du SIREN. */
export function vatNumberFromSiret(siret: string): string | null {
  if (!isValidSiret(siret)) return null;
  const siren = siret.slice(0, 9);
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(key).padStart(2, '0')}${siren}`;
}

/** "06 12.34-56 78" → "0612345678" ; "+33 (0)6 12…" → "+33612…". */
export function normalizePhone(value: string): string {
  return value
    .replace(/[\s.\-()]/g, '')
    .replace(/^0033/, '+33')
    .replace(/^\+330/, '+33');
}

export function isValidPhone(value: string): boolean {
  return /^(\+33|0)[1-9]\d{8}$/.test(value);
}

export function formatPhone(phone: string): string {
  if (/^0\d{9}$/.test(phone)) return phone.replace(/(\d{2})(?=\d)/g, '$1 ');
  if (/^\+33\d{9}$/.test(phone)) {
    return `+33 ${phone.slice(3, 4)} ${phone.slice(4).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  }
  return phone;
}

export interface CompanyValidation {
  errors: CompanyErrors;
  data: CompanyData | null;
}

export function validateCompany(values: CompanyFormValues): CompanyValidation {
  const name = values.name.trim();
  const siret = normalizeSiret(values.siret);
  const address = values.address.trim().replace(/\s+/g, ' ');
  const phone = normalizePhone(values.phone);
  const errors: CompanyErrors = {};

  if (name.length === 0) errors.name = COMPANY_ERRORS.nameRequired;
  else if (name.length > 120) errors.name = COMPANY_ERRORS.nameTooLong;

  if (siret.length !== 14) errors.siret = COMPANY_ERRORS.siretFormat;
  else if (!isValidSiret(siret)) errors.siret = COMPANY_ERRORS.siretInvalid;

  if (address.length < 5 || address.length > 300) errors.address = COMPANY_ERRORS.addressRequired;

  if (!isValidPhone(phone)) errors.phone = COMPANY_ERRORS.phoneInvalid;

  if (!isVatMode(values.vatMode)) errors.vatMode = COMPANY_ERRORS.vatRequired;

  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors || !isVatMode(values.vatMode)) return { errors, data: null };
  return { errors, data: { name, siret, address, phone, vatMode: values.vatMode } };
}

export function validateLogo(file: { type: string; size: number }): string | null {
  if (!isLogoMimeType(file.type)) return COMPANY_ERRORS.logoType;
  if (file.size > LOGO_MAX_BYTES) return COMPANY_ERRORS.logoSize;
  return null;
}
