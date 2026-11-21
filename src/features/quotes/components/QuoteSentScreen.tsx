'use client';

import { useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { BackHeader } from '@/components/BackHeader';
import { MobileScreen } from '@/components/MobileScreen';
import { colors } from '@/theme/tokens';
import { formatDateTime } from '../document/documentView';
import type { ArtisanQuoteDocument } from '../document/quoteDocuments';
import { STATUS_LABELS } from '../domain/format';
import { useSendQuote } from '../hooks/useSendQuote';
import { QuoteDocument } from './QuoteDocument';
import { SendQuoteDialog } from './SendQuoteDialog';

export type SentNotice = 'sent' | 'email-failed' | null;

interface QuoteSentScreenProps {
  document: ArtisanQuoteDocument;
  notice: SentNotice;
}

export function QuoteSentScreen({ document, notice }: QuoteSentScreenProps) {
  const { view } = document;
  const send = useSendQuote();
  const canResend = document.status === 'sent';
  const openResend = useCallback(
    () => send.open(document.id, document.sentToEmail ?? document.clientEmail ?? ''),
    [send, document.id, document.sentToEmail, document.clientEmail],
  );

  return (
    <MobileScreen
      header={
        <BackHeader
          title={`Devis ${view.number}`}
          subtitle={`${STATUS_LABELS[document.status]} · non modifiable`}
          backHref="/devis"
          backLabel="Retour à mes devis"
        />
      }
      footer={
        <Box
          sx={{ display: 'grid', gridTemplateColumns: canResend ? '1fr 1fr' : '1fr', gap: 1.25 }}
        >
          <Button
            component="a"
            href={`/devis/${document.id}/pdf`}
            variant={canResend ? 'outlined' : 'contained'}
            startIcon={<FileDownloadOutlinedIcon />}
            sx={{ minHeight: 56 }}
          >
            PDF
          </Button>
          {canResend ? (
            <Button
              variant="contained"
              onClick={openResend}
              aria-haspopup="dialog"
              sx={{ minHeight: 56 }}
            >
              Renvoyer l’email
            </Button>
          ) : null}
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 3 }}>
        {notice === 'sent' ? (
          <Alert severity="success" role="status" sx={{ borderRadius: '12px' }}>
            Devis envoyé à {document.sentToEmail}. Vous verrez ici quand le client l’accepte.
          </Alert>
        ) : null}
        {notice === 'email-failed' ? (
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            Le devis est verrouillé, mais l’email n’est pas parti. Vérifiez la configuration
            d’envoi, puis « Renvoyer l’email ».
          </Alert>
        ) : null}

        {view.acceptance ? (
          <Box
            sx={{
              display: 'flex',
              gap: 1.25,
              alignItems: 'flex-start',
              p: 2,
              borderRadius: '16px',
              bgcolor: colors.successBg,
              color: colors.successFg,
            }}
          >
            <CheckCircleOutlineIcon aria-hidden="true" />
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Accepté par le client</Typography>
              <Typography sx={{ fontSize: 15 }}>
                {view.acceptance.byName}, le {view.acceptance.atLabel}.
              </Typography>
            </Box>
          </Box>
        ) : null}

        {view.deposit?.paid ? (
          <Box
            sx={{
              display: 'flex',
              gap: 1.25,
              alignItems: 'flex-start',
              p: 2,
              borderRadius: '16px',
              bgcolor: colors.successBg,
              color: colors.successFg,
            }}
          >
            <CheckCircleOutlineIcon aria-hidden="true" />
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                Acompte payé : {view.deposit.paid.amount}
              </Typography>
              <Typography sx={{ fontSize: 15 }}>
                Reçu par carte le {view.deposit.paid.atLabel}.
              </Typography>
            </Box>
          </Box>
        ) : view.deposit && view.acceptance ? (
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            En attente du paiement de l’acompte ({view.deposit.amount}) par le client.
          </Typography>
        ) : null}

        {document.lastSentAt ? (
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {document.sentAt === document.lastSentAt ? 'Envoyé' : 'Dernier envoi'} le{' '}
            {formatDateTime(document.lastSentAt)} à {document.sentToEmail}.
          </Typography>
        ) : null}

        <QuoteDocument view={view} />
      </Box>

      <SendQuoteDialog
        open={send.isOpen}
        mode="resend"
        clientName={view.client.name}
        totalLabel={view.totalLabel}
        totalValue={view.totalValue}
        totalCents={0}
        depositPercent={send.depositPercent}
        onDepositChange={send.onDepositChange}
        email={send.email}
        emailError={send.emailError}
        error={send.error}
        isSending={send.isSending}
        onEmailChange={send.onEmailChange}
        onConfirm={send.confirm}
        onClose={send.close}
      />
    </MobileScreen>
  );
}
