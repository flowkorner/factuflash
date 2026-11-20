import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { QuoteEditorScreen } from '@/features/quotes/components/QuoteEditorScreen';
import { QuoteSentScreen } from '@/features/quotes/components/QuoteSentScreen';
import type { SentNotice } from '@/features/quotes/components/QuoteSentScreen';
import { getQuoteForEdit, listClients } from '@/features/quotes/data/quotes';
import { getArtisanQuoteDocument } from '@/features/quotes/document/quoteDocuments';

export const metadata: Metadata = {
  title: 'Devis',
  robots: { index: false },
};

interface DevisPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DevisPage({ params, searchParams }: DevisPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [company, clients, quote] = await Promise.all([
    getCurrentCompany(),
    listClients(),
    getQuoteForEdit(id),
  ]);
  if (!company) redirect('/entreprise');
  if (!quote) notFound();

  // Envoyé ou accepté : lecture seule, tel que le client le voit.
  if (quote.status !== 'draft') {
    const document = await getArtisanQuoteDocument(id);
    if (!document) notFound();
    const notice: SentNotice =
      query.envoye === '1' ? 'sent' : query['echec-email'] === '1' ? 'email-failed' : null;
    return <QuoteSentScreen document={document} notice={notice} />;
  }

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
