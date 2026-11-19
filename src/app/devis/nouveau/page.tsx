import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { QuoteEditorScreen } from '@/features/quotes/components/QuoteEditorScreen';
import { listClients } from '@/features/quotes/data/quotes';
import { newQuoteValues } from '@/features/quotes/domain/newQuote';

export const metadata: Metadata = {
  title: 'Nouveau devis',
  robots: { index: false },
};

export default async function NouveauDevisPage() {
  const [company, clients] = await Promise.all([getCurrentCompany(), listClients()]);
  // Sans « Mon entreprise », impossible d'afficher SIRET, TVA et mentions légales.
  if (!company) redirect('/entreprise');

  return (
    <QuoteEditorScreen
      quoteId={null}
      number={null}
      initialValues={newQuoteValues(clients, company.vatMode)}
      clients={clients}
      company={{ name: company.name, siret: company.siret, vatMode: company.vatMode }}
    />
  );
}
