import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { QuoteEditorScreen } from '@/features/quotes/components/QuoteEditorScreen';
import { getQuoteForEdit, listClients } from '@/features/quotes/data/quotes';

export const metadata: Metadata = {
  title: 'Devis',
  robots: { index: false },
};

interface DevisPageProps {
  params: Promise<{ id: string }>;
}

export default async function DevisPage({ params }: DevisPageProps) {
  const { id } = await params;
  const [company, clients, quote] = await Promise.all([
    getCurrentCompany(),
    listClients(),
    getQuoteForEdit(id),
  ]);
  if (!company) redirect('/entreprise');
  if (!quote) notFound();
  // Seuls les brouillons sont modifiables (l'aperçu des devis envoyés viendra avec l'envoi).
  if (quote.status !== 'draft') redirect('/devis');

  return (
    <QuoteEditorScreen
      quoteId={quote.id}
      number={quote.number}
      initialValues={quote.values}
      clients={clients}
      company={{ name: company.name, siret: company.siret, vatMode: company.vatMode }}
    />
  );
}
