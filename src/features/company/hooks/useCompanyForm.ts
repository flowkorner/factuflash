'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveCompany } from '../actions/saveCompany';
import type { CompanyErrors, CompanyField, CompanyFormValues } from '../domain/types';
import {
  isVatMode,
  validateCompany,
  validateLogo,
  vatNumberFromSiret,
  normalizeSiret,
} from '../domain/validation';

export const COMPANY_FIELD_IDS: Record<CompanyField, string> = {
  name: 'company-name',
  siret: 'company-siret',
  address: 'company-address',
  phone: 'company-phone',
  vatMode: 'company-vat-subject',
  logo: 'company-logo',
};

const FIELD_ORDER: readonly CompanyField[] = [
  'name',
  'siret',
  'address',
  'phone',
  'logo',
  'vatMode',
];
const TEXT_FIELDS: readonly string[] = ['name', 'siret', 'address', 'phone'];

type TextField = 'name' | 'siret' | 'address' | 'phone';

function isTextField(name: string): name is TextField {
  return TEXT_FIELDS.includes(name);
}

function focusFirstError(errors: CompanyErrors): void {
  const first = FIELD_ORDER.find((field) => errors[field]);
  if (first) document.getElementById(COMPANY_FIELD_IDS[first])?.focus();
}

export interface UseCompanyFormOptions {
  initialValues: CompanyFormValues;
  initialLogoUrl: string | null;
}

export interface UseCompanyForm {
  values: CompanyFormValues;
  errors: CompanyErrors;
  formError: string | null;
  isSaving: boolean;
  logoPreviewUrl: string | null;
  vatNumber: string | null;
  onFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLogoSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function useCompanyForm({
  initialValues,
  initialLogoUrl,
}: UseCompanyFormOptions): UseCompanyForm {
  const [values, setValues] = useState<CompanyFormValues>(initialValues);
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const router = useRouter();

  // Aperçu local du logo choisi, libéré quand il change.
  const localPreviewUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile],
  );
  useEffect(
    () => () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    },
    [localPreviewUrl],
  );
  const logoPreviewUrl = localPreviewUrl ?? (removeLogo ? null : initialLogoUrl);

  const vatNumber = useMemo(
    () => (values.vatMode === 'subject' ? vatNumberFromSiret(normalizeSiret(values.siret)) : null),
    [values.vatMode, values.siret],
  );

  const onFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (isTextField(name)) {
      setValues((previous) => ({ ...previous, [name]: value }));
      setErrors((previous) => ({ ...previous, [name]: undefined }));
    } else if (name === 'vatMode' && isVatMode(value)) {
      setValues((previous) => ({ ...previous, vatMode: value }));
      setErrors((previous) => ({ ...previous, vatMode: undefined }));
    }
  }, []);

  const onLogoSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    const error = validateLogo(file);
    setErrors((previous) => ({ ...previous, logo: error ?? undefined }));
    if (!error) {
      setLogoFile(file);
      setRemoveLogo(false);
    }
  }, []);

  const onLogoRemove = useCallback(() => {
    setLogoFile(null);
    setRemoveLogo(true);
    setErrors((previous) => ({ ...previous, logo: undefined }));
  }, []);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      const validation = validateCompany(values);
      if (!validation.data) {
        setErrors(validation.errors);
        focusFirstError(validation.errors);
        return;
      }

      const formData = new FormData();
      formData.set('name', values.name);
      formData.set('siret', values.siret);
      formData.set('address', values.address);
      formData.set('phone', values.phone);
      formData.set('vatMode', values.vatMode);
      formData.set('removeLogo', String(removeLogo));
      if (logoFile) formData.set('logo', logoFile);

      startTransition(async () => {
        try {
          const result = await saveCompany(formData);
          if (result.ok) {
            router.push('/devis');
            return;
          }
          setErrors(result.errors);
          setFormError(result.message ?? null);
          focusFirstError(result.errors);
        } catch {
          setFormError('L’enregistrement a échoué. Vérifiez votre connexion et réessayez.');
        }
      });
    },
    [values, logoFile, removeLogo, router],
  );

  return {
    values,
    errors,
    formError,
    isSaving,
    logoPreviewUrl,
    vatNumber,
    onFieldChange,
    onLogoSelect,
    onLogoRemove,
    onSubmit,
  };
}
