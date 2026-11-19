import type { Metadata } from 'next';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { QuotesScreen } from '@/features/quotes/components/QuotesScreen';

export const metadata: Metadata = {
  title: 'Mes devis',
  robots: { index: false },
};

export default async function DevisPage() {
  const company = await getCurrentCompany();
  return <QuotesScreen hasCompany={company !== null} />;
}
