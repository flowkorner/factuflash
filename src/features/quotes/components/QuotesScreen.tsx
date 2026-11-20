import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { MobileScreen } from '@/components/MobileScreen';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { quotesCountLabel } from '../domain/format';
import type { QuoteSummary } from '../domain/types';
import { CompleteCompanyNotice } from './CompleteCompanyNotice';
import { QuoteCard } from './QuoteCard';
import { QuotesEmptyState } from './QuotesEmptyState';
import { QuotesHeader } from './QuotesHeader';

interface QuotesScreenProps {
  hasCompany: boolean;
  quotes: readonly QuoteSummary[];
}

export function QuotesScreen({ hasCompany, quotes }: QuotesScreenProps) {
  return (
    <MobileScreen
      header={<QuotesHeader subtitle={quotesCountLabel(quotes.length)} />}
      footer={
        <Button
          component={Link}
          href="/devis/nouveau"
          variant="contained"
          size="large"
          fullWidth
          startIcon={<AddIcon />}
        >
          Nouveau devis
        </Button>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2, pb: 3 }}>
        {hasCompany ? null : <CompleteCompanyNotice />}
        {quotes.length === 0 ? (
          <QuotesEmptyState />
        ) : (
          <Box
            component="ul"
            aria-label="Mes devis"
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {quotes.map((quote) => (
              <li key={quote.id}>
                <QuoteCard quote={quote} />
              </li>
            ))}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
          <SignOutButton />
        </Box>
      </Box>
    </MobileScreen>
  );
}
