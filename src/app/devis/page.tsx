import type { Metadata } from 'next';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { listQuoteSummaries } from '@/features/quotes/data/quotes';
import { QuotesScreen } from '@/features/quotes/components/QuotesScreen';

export const metadata: Metadata = {
  title: 'Mes devis',
  robots: { index: false },
};

export default async function DevisPage() {
  const [company, quotes] = await Promise.all([getCurrentCompany(), listQuoteSummaries()]);
  return <QuotesScreen hasCompany={company !== null} quotes={quotes} />;
}
