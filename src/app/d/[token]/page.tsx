import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BrandLogo } from '@/components/BrandLogo';
import { MobileScreen } from '@/components/MobileScreen';
import { PublicQuoteScreen } from '@/features/quotes/components/PublicQuoteScreen';
import { PublicQuoteUnavailable } from '@/features/quotes/components/PublicQuoteUnavailable';
import { getPublicQuoteDocument } from '@/features/quotes/document/quoteDocuments';

// Lien secret : jamais indexé, et jamais transmis à un autre site via l'en-tête Referer.
export const metadata: Metadata = {
  title: 'Votre devis',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

interface PublicQuotePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paiement?: string | string[] }>;
}

export default async function PublicQuotePage({ params, searchParams }: PublicQuotePageProps) {
  const [{ token }, { paiement }] = await Promise.all([params, searchParams]);
  // Seule la présence du paramètre compte : le statut affiché vient toujours de la base.
  const isPaymentReturn = typeof paiement === 'string';
  const result = await getPublicQuoteDocument(token);

  if (result.kind === 'unavailable') {
    return <PublicQuoteUnavailable isPaymentReturn={isPaymentReturn} />;
  }

  if (result.kind === 'not_found') {
    return (
      <MobileScreen>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 9 }}>
          <BrandLogo />
          <Typography variant="h1" sx={{ fontSize: 24 }}>
            Ce lien ne fonctionne pas
          </Typography>
          <Typography color="text.secondary">
            Il est incomplet, ou l’entreprise vous a envoyé un lien plus récent. Utilisez le dernier
            email reçu, ou contactez directement l’entreprise.
          </Typography>
        </Box>
      </MobileScreen>
    );
  }

  const { quote, view, isExpired } = result;
  return (
    <PublicQuoteScreen
      token={token}
      view={view}
      isExpired={isExpired}
      isPaymentReturn={isPaymentReturn}
      initialAcceptance={
        quote.acceptedAt && quote.acceptedByName
          ? { acceptedAt: quote.acceptedAt, acceptedByName: quote.acceptedByName }
          : null
      }
    />
  );
}
