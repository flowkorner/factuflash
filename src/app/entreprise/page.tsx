import type { Metadata } from 'next';
import { CompanyScreen } from '@/features/company/components/CompanyScreen';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { formatPhone, formatSiret } from '@/features/company/domain/validation';
import type { CompanyFormValues } from '@/features/company/domain/types';

export const metadata: Metadata = {
  title: 'Mon entreprise',
  robots: { index: false },
};

const EMPTY_VALUES: CompanyFormValues = {
  name: '',
  siret: '',
  address: '',
  phone: '',
  vatMode: '',
};

export default async function EntreprisePage() {
  const company = await getCurrentCompany();
  const initialValues: CompanyFormValues = company
    ? {
        name: company.name,
        siret: formatSiret(company.siret),
        address: company.address,
        phone: formatPhone(company.phone),
        vatMode: company.vatMode,
      }
    : EMPTY_VALUES;

  return (
    <CompanyScreen
      initialValues={initialValues}
      initialLogoUrl={company?.logoUrl ?? null}
      isFirstTime={company === null}
    />
  );
}
