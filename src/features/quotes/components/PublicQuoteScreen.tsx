'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { LabeledInput } from '@/components/LabeledInput';
import { MobileScreen } from '@/components/MobileScreen';
import { usePaymentConfirmation } from '@/features/payments/hooks/usePaymentConfirmation';
import { colors } from '@/theme/tokens';
import { formatDateTime } from '../document/documentView';
import type { QuoteDocumentView } from '../document/documentView';
import type { Acceptance } from '../hooks/useAcceptQuote';
import { useAcceptQuote } from '../hooks/useAcceptQuote';
import { QuoteDocument } from './QuoteDocument';

// Stripe.js n'est téléchargé qu'à l'ouverture du paiement (page légère pour qui ne fait que lire).
const DepositPanel = dynamic(() => import('@/features/payments/components/DepositPanel'), {
  ssr: false,
  loading: () => (
    <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
      <CircularProgress size={22} aria-hidden="true" />
      <Typography>Chargement du paiement sécurisé…</Typography>
    </Box>
  ),
});

const FORM_ID = 'accept-form';
const HELP_ID = 'accept-help';

interface PublicQuoteScreenProps {
  token: string;
  view: QuoteDocumentView;
  isExpired: boolean;
  initialAcceptance: Acceptance | null;
  /** Retour depuis Stripe (?paiement=…) : on attend la confirmation du webhook. */
  isPaymentReturn: boolean;
}

export function PublicQuoteScreen({
  token,
  view,
  isExpired,
  initialAcceptance,
  isPaymentReturn,
}: PublicQuoteScreenProps) {
  const accept = useAcceptQuote(token, initialAcceptance);
  const canAccept = !accept.accepted && !isExpired && view.status === 'sent';
  const pdfHref = `/d/${token}/pdf`;

  const deposit = view.deposit;
  const isDepositPaid = view.status === 'deposit_paid' || Boolean(deposit?.paid);
  const needsDeposit = accept.accepted !== null && deposit !== null && !isDepositPaid;
  const isWaitingConfirmation = isPaymentReturn && needsDeposit;
  const { timedOut, retry } = usePaymentConfirmation(isWaitingConfirmation);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const showPayButton = needsDeposit && !isWaitingConfirmation && !isPaymentOpen;

  // Focus : sur la confirmation après acceptation, sur le paiement à son ouverture.
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const paymentRef = useRef<HTMLHeadingElement>(null);
  const wasAccepted = useRef(initialAcceptance !== null);
  useEffect(() => {
    if (accept.accepted && !wasAccepted.current) {
      wasAccepted.current = true;
      confirmationRef.current?.focus();
    }
  }, [accept.accepted]);
  useEffect(() => {
    if (isPaymentOpen) paymentRef.current?.focus();
  }, [isPaymentOpen]);

  const openPayment = useCallback(() => setIsPaymentOpen(true), []);

  const footer = canAccept ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>{view.totalLabel}</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{view.totalValue}</Typography>
      </Box>
      <Button
        key="accept"
        type="submit"
        form={FORM_ID}
        variant="contained"
        size="large"
        fullWidth
        disabled={!accept.canSubmit}
        aria-busy={accept.isSubmitting}
        aria-describedby={accept.canSubmit ? undefined : HELP_ID}
      >
        {accept.isSubmitting ? 'Enregistrement…' : 'J’accepte le devis'}
      </Button>
      {accept.canSubmit || accept.isSubmitting ? null : (
        <Typography
          id={HELP_ID}
          sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center' }}
        >
          Saisissez votre nom et cochez la case pour continuer.
        </Typography>
      )}
    </Box>
  ) : showPayButton && deposit ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>{deposit.label}</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{deposit.amount}</Typography>
      </Box>
      <Button key="pay" variant="contained" size="large" fullWidth onClick={openPayment}>
        Payer l’acompte
      </Button>
    </Box>
  ) : (
    <Button
      component="a"
      href={pdfHref}
      variant="contained"
      size="large"
      fullWidth
      startIcon={<FileDownloadOutlinedIcon />}
    >
      Télécharger le devis (PDF)
    </Button>
  );

  return (
    <MobileScreen
      header={
        <Box
          component="header"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            px: 2.5,
            pt: 'calc(24px + env(safe-area-inset-top))',
            pb: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            component="p"
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Devis {view.number}
          </Typography>
          <Typography variant="h1" sx={{ fontSize: 24 }}>
            {view.company.name}
          </Typography>
        </Box>
      }
      footer={footer}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 3 }}>
        {isDepositPaid && deposit?.paid ? (
          <Box
            role="status"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 1,
              p: 2.5,
              borderRadius: '16px',
              bgcolor: colors.successBg,
              color: colors.successFg,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 40 }} aria-hidden="true" />
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 700 }}>
              Acompte payé, merci !
            </Typography>
            <Typography sx={{ fontSize: 15, lineHeight: 1.5 }}>
              {deposit.paid.amount} reçus le {deposit.paid.atLabel}. {view.company.name} va vous
              recontacter pour fixer la date du chantier.
            </Typography>
          </Box>
        ) : null}

        {isWaitingConfirmation ? (
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
              <Typography component="h2" sx={{ fontWeight: 700 }}>
                {timedOut
                  ? 'Confirmation plus longue que prévu'
                  : 'Paiement en cours de confirmation…'}
              </Typography>
              <Typography sx={{ fontSize: 15 }}>
                {timedOut
                  ? 'Nous n’avons pas encore reçu la confirmation de Stripe. Si votre carte a été débitée, le paiement sera pris en compte automatiquement : ne payez pas une seconde fois.'
                  : 'Cela prend quelques secondes. Ne payez pas une seconde fois.'}
              </Typography>
              {timedOut ? (
                <Button
                  variant="outlined"
                  onClick={retry}
                  sx={{ mt: 1.5, bgcolor: 'background.paper' }}
                >
                  Vérifier à nouveau
                </Button>
              ) : null}
            </Box>
          </Box>
        ) : null}

        {accept.accepted && !isDepositPaid ? (
          <Box
            role="status"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 1,
              p: 2.5,
              borderRadius: '16px',
              bgcolor: colors.successBg,
              color: colors.successFg,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 40 }} aria-hidden="true" />
            <Typography
              component="h2"
              ref={confirmationRef}
              tabIndex={-1}
              sx={{ fontSize: 20, fontWeight: 700, outline: 'none' }}
            >
              Devis accepté, merci !
            </Typography>
            <Typography sx={{ fontSize: 15, lineHeight: 1.5 }}>
              Accepté par {accept.accepted.acceptedByName} le{' '}
              {formatDateTime(accept.accepted.acceptedAt)}.{' '}
              {needsDeposit && deposit
                ? `Pour confirmer le chantier, réglez l’acompte de ${deposit.amount}.`
                : `${view.company.name} a bien reçu votre accord et va vous recontacter pour fixer la date du chantier.`}
            </Typography>
          </Box>
        ) : null}

        {isPaymentOpen && needsDeposit && deposit ? (
          <Box
            component="section"
            aria-labelledby="payment-title"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              p: 2,
              bgcolor: 'background.paper',
              border: 1.5,
              borderColor: colors.acceptBorder,
              borderRadius: '16px',
            }}
          >
            <Typography
              id="payment-title"
              component="h2"
              ref={paymentRef}
              tabIndex={-1}
              sx={{ fontSize: 17, fontWeight: 600, outline: 'none' }}
            >
              Payer l’acompte · {deposit.amount}
            </Typography>
            <DepositPanel token={token} amountLabel={deposit.amount} />
          </Box>
        ) : null}

        {isExpired && !accept.accepted ? (
          <Alert severity="warning" sx={{ borderRadius: '12px' }}>
            Ce devis a dépassé sa date de validité ({view.validUntilLabel}). Contactez{' '}
            {view.company.name} pour en recevoir un nouveau.
          </Alert>
        ) : null}

        <QuoteDocument view={view} />

        {canAccept || showPayButton ? (
          <Button
            component="a"
            href={pdfHref}
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
          >
            Télécharger le devis (PDF)
          </Button>
        ) : null}

        {canAccept ? (
          <Box
            component="form"
            id={FORM_ID}
            noValidate
            onSubmit={accept.onSubmit}
            aria-labelledby="accept-title"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.75,
              p: 2,
              bgcolor: 'background.paper',
              border: 1.5,
              borderColor: colors.acceptBorder,
              borderRadius: '16px',
            }}
          >
            <Typography id="accept-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
              Votre accord
            </Typography>
            <LabeledInput
              id="accept-name"
              name="name"
              label="Votre nom et prénom"
              value={accept.name}
              onChange={accept.onNameChange}
              autoComplete="name"
              maxLength={120}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={accept.agreed}
                  onChange={accept.onAgreedChange}
                  sx={{ mt: -0.75 }}
                />
              }
              label="J’ai lu ce devis et je l’accepte : bon pour accord."
              sx={{
                alignItems: 'flex-start',
                m: 0,
                gap: 0.5,
                '& .MuiFormControlLabel-label': { fontSize: 15, lineHeight: 1.45, pt: 0.25 },
              }}
            />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              La date et l’heure de votre accord seront enregistrées et transmises à{' '}
              {view.company.name}.
              {deposit
                ? ` Un acompte de ${deposit.amount} vous sera ensuite demandé, payable par carte.`
                : ''}
            </Typography>
            {accept.error ? (
              <FormHelperText error role="alert" sx={{ m: 0, fontSize: 14 }}>
                {accept.error}
              </FormHelperText>
            ) : null}
          </Box>
        ) : null}

        <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>
          Service de devis en ligne FactuFlash
        </Typography>
      </Box>
    </MobileScreen>
  );
}
