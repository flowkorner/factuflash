'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { BrandLogo } from '@/components/BrandLogo';
import { MobileScreen } from '@/components/MobileScreen';
import { usePaymentConfirmation } from '@/features/payments/hooks/usePaymentConfirmation';
import { colors } from '@/theme/tokens';

interface PublicQuoteUnavailableProps {
  /** Retour de Stripe : on reste sur « confirmation en cours » et on réessaie tout seul. */
  isPaymentReturn: boolean;
  /** Document demandé, pour le titre du message. */
  document?: 'devis' | 'facture';
}

/** Le devis n'a pas pu être lu (base injoignable) : jamais de plantage, un message et un nouvel essai. */
export function PublicQuoteUnavailable({
  isPaymentReturn,
  document = 'devis',
}: PublicQuoteUnavailableProps) {
  const router = useRouter();
  const { timedOut, retry } = usePaymentConfirmation(isPaymentReturn);

  return (
    <MobileScreen>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 9 }}>
        <BrandLogo />
        {isPaymentReturn ? (
          <Box
            role="status"
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
              p: 2,
              borderRadius: '16px',
              bgcolor: colors.primarySoft,
              color: colors.primaryDark,
            }}
          >
            {timedOut ? null : <CircularProgress size={22} aria-hidden="true" sx={{ mt: 0.25 }} />}
            <Box>
              <Typography component="h1" sx={{ fontWeight: 700 }}>
                {timedOut
                  ? 'Confirmation plus longue que prévu'
                  : 'Paiement en cours de confirmation…'}
              </Typography>
              <Typography sx={{ fontSize: 15 }}>
                {timedOut
                  ? 'Si votre carte a été débitée, le paiement sera pris en compte automatiquement. Ne payez pas une seconde fois : revenez sur ce lien un peu plus tard.'
                  : 'Le service est momentanément lent. Ne payez pas une seconde fois : cette page se met à jour toute seule.'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="h1" sx={{ fontSize: 24 }}>
              {document === 'facture'
                ? 'Facture momentanément indisponible'
                : 'Devis momentanément indisponible'}
            </Typography>
            <Typography color="text.secondary">
              Le service ne répond pas pour le moment. Réessayez dans quelques instants : votre lien
              reste valable.
            </Typography>
          </>
        )}
        {!isPaymentReturn || timedOut ? (
          <Button
            variant="contained"
            size="large"
            onClick={isPaymentReturn ? retry : router.refresh}
          >
            {isPaymentReturn ? 'Vérifier à nouveau' : 'Réessayer'}
          </Button>
        ) : null}
      </Box>
    </MobileScreen>
  );
}
