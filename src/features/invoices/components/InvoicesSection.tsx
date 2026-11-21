'use client';

import { useCallback, useId } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { LabeledInput } from '@/components/LabeledInput';
import { LabeledSelect } from '@/components/LabeledSelect';
import { colors } from '@/theme/tokens';
import { formatIssueDate } from '@/features/quotes/domain/format';
import { formatCents } from '@/features/quotes/domain/money';
import type { InvoiceSummary } from '../domain/types';
import { DUE_DAYS_OPTIONS, MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../domain/types';
import { useInvoiceDialogs } from '../hooks/useInvoiceDialogs';

const DUE_OPTIONS = DUE_DAYS_OPTIONS.map((days) => ({
  value: String(days),
  label: days === 0 ? 'À réception' : `${days} jours`,
}));
const METHOD_OPTIONS = MANUAL_PAYMENT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method].replace(/^./, (first) => first.toUpperCase()),
}));

interface InvoicesSectionProps {
  quoteId: string;
  invoices: readonly InvoiceSummary[];
  canCreateFinal: boolean;
  totalTtcCents: number;
  clientEmail: string | null;
}

export function InvoicesSection({
  quoteId,
  invoices,
  canCreateFinal,
  totalTtcCents,
  clientEmail,
}: InvoicesSectionProps) {
  const dialogs = useInvoiceDialogs(quoteId, clientEmail);
  const titleId = useId();
  const formId = useId();
  const depositsCents = invoices
    .filter((invoice) => invoice.kind === 'deposit')
    .reduce((sum, invoice) => sum + invoice.totalTtcCents, 0);
  const { dialog, form, fieldError } = dialogs;
  const errorFor = (field: string) =>
    fieldError?.field === field ? fieldError.message : undefined;
  const { confirm } = dialogs;
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      confirm();
    },
    [confirm],
  );

  return (
    <Box
      component="section"
      aria-labelledby="invoices-title"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Typography id="invoices-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
        Factures
      </Typography>

      {dialogs.notice ? (
        <Alert severity="success" role="status" sx={{ borderRadius: '12px' }}>
          {dialogs.notice}
        </Alert>
      ) : null}

      {invoices.length === 0 ? (
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Aucune facture pour l’instant. La facture d’acompte se crée toute seule au paiement de
          l’acompte.
        </Typography>
      ) : (
        <Box
          component="ul"
          aria-label="Factures du devis"
          sx={{
            listStyle: 'none',
            m: 0,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          {invoices.map((invoice) => {
            const isPaid = invoice.paidOn !== null;
            return (
              <Box
                component="li"
                key={invoice.id}
                aria-label={`Facture ${invoice.number}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: 2,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '16px',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {invoice.kind === 'deposit' ? 'Facture d’acompte' : 'Facture de solde'}{' '}
                    {invoice.number}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCents(invoice.totalTtcCents)}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isPaid ? colors.successFg : colors.primaryDark,
                  }}
                >
                  {isPaid && invoice.paidOn && invoice.paymentMethod
                    ? `Payée le ${formatIssueDate(invoice.paidOn)} (${PAYMENT_METHOD_LABELS[invoice.paymentMethod]})`
                    : `Reste ${formatCents(invoice.amountDueCents)} à payer avant le ${formatIssueDate(invoice.dueDate)}`}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Émise le {formatIssueDate(invoice.issueDate)}
                  {invoice.sentAt && invoice.sentToEmail
                    ? ` · envoyée à ${invoice.sentToEmail}`
                    : ' · pas encore envoyée'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button
                    component="a"
                    href={`/factures/${invoice.id}/pdf`}
                    variant="outlined"
                    startIcon={<FileDownloadOutlinedIcon />}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="outlined"
                    aria-haspopup="dialog"
                    onClick={() =>
                      dialogs.openSend(
                        invoice.id,
                        invoice.number,
                        invoice.sentToEmail ?? clientEmail,
                      )
                    }
                  >
                    Envoyer
                  </Button>
                  {invoice.kind === 'final' && !isPaid ? (
                    <Button
                      variant="contained"
                      aria-haspopup="dialog"
                      onClick={() => dialogs.openPaid(invoice.id, invoice.number)}
                    >
                      Solde reçu
                    </Button>
                  ) : null}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {canCreateFinal ? (
        <Button
          variant="contained"
          size="large"
          aria-haspopup="dialog"
          onClick={dialogs.openCreate}
        >
          Créer la facture de solde
        </Button>
      ) : null}

      <Dialog
        open={dialog.type !== 'none'}
        onClose={dialogs.close}
        aria-labelledby={titleId}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', m: 2, width: 'calc(100% - 32px)' } } }}
      >
        <DialogTitle id={titleId} sx={{ fontSize: 19, fontWeight: 700, pb: 1 }}>
          {dialog.type === 'create'
            ? 'Facture de solde'
            : dialog.type === 'send'
              ? `Envoyer la facture ${dialog.number}`
              : dialog.type === 'paid'
                ? `Solde reçu · ${dialog.number}`
                : ''}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id={formId}
            noValidate
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: 0.5 }}
          >
            {dialog.type === 'create' ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: 15 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total du devis</span>
                    <span>{formatCents(totalTtcCents)}</span>
                  </Box>
                  {depositsCents > 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: 'text.secondary',
                      }}
                    >
                      <span>Acompte déjà facturé</span>
                      <span>− {formatCents(depositsCents)}</span>
                    </Box>
                  ) : null}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    <span>Reste à facturer</span>
                    <span>{formatCents(totalTtcCents - depositsCents)}</span>
                  </Box>
                </Box>
                <LabeledInput
                  id="invoice-service-date"
                  name="serviceDate"
                  label="Date de fin des travaux"
                  type="date"
                  value={form.serviceDate}
                  onChange={dialogs.onChange}
                  error={errorFor('serviceDate')}
                />
                <LabeledSelect
                  id="invoice-due-days"
                  name="dueDays"
                  label="Délai de paiement"
                  value={form.dueDays}
                  options={DUE_OPTIONS}
                  onChange={dialogs.onChange}
                />
              </>
            ) : null}
            {dialog.type === 'create' || dialog.type === 'send' ? (
              <LabeledInput
                id="invoice-email"
                name="email"
                label="Email du client"
                type="email"
                value={form.email}
                onChange={dialogs.onChange}
                error={errorFor('email')}
                inputMode="email"
                autoComplete="off"
                maxLength={254}
              />
            ) : null}
            {dialog.type === 'paid' ? (
              <>
                <LabeledInput
                  id="invoice-paid-on"
                  name="paidOn"
                  label="Date du paiement"
                  type="date"
                  value={form.paidOn}
                  onChange={dialogs.onChange}
                  error={errorFor('paidOn')}
                />
                <LabeledSelect
                  id="invoice-method"
                  name="method"
                  label="Moyen de paiement"
                  value={form.method}
                  options={METHOD_OPTIONS}
                  onChange={dialogs.onChange}
                />
              </>
            ) : null}
            {dialog.type === 'create' ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: colors.warningBg,
                  border: 1,
                  borderColor: colors.warningBorder,
                  color: colors.warningFg,
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                Une facture émise reçoit un numéro définitif : elle ne pourra plus être modifiée ni
                supprimée.
              </Box>
            ) : null}
            {dialog.type === 'send' ? (
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                Un nouveau lien est envoyé : l’ancien ne fonctionnera plus. La facture ne change
                pas.
              </Typography>
            ) : null}
            {dialogs.error ? (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {dialogs.error}
              </Alert>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            gap: 1.25,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            '& > :not(style) ~ :not(style)': { ml: 0 },
          }}
        >
          <Button variant="outlined" onClick={dialogs.close} disabled={dialogs.isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="contained"
            disabled={dialogs.isPending}
            aria-busy={dialogs.isPending}
          >
            {dialogs.isPending
              ? 'Patientez…'
              : dialog.type === 'create'
                ? 'Émettre'
                : dialog.type === 'paid'
                  ? 'Confirmer'
                  : 'Envoyer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
