import { useCallback, useId } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { LabeledInput } from '@/components/LabeledInput';
import { colors } from '@/theme/tokens';

interface SendQuoteDialogProps {
  open: boolean;
  /** Premier envoi (verrouille le devis) ou renvoi d'un devis déjà envoyé. */
  mode: 'send' | 'resend';
  clientName: string;
  totalLabel: string;
  totalValue: string;
  email: string;
  emailError: string | null;
  error: string | null;
  isSending: boolean;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function SendQuoteDialog({
  open,
  mode,
  clientName,
  totalLabel,
  totalValue,
  email,
  emailError,
  error,
  isSending,
  onEmailChange,
  onConfirm,
  onClose,
}: SendQuoteDialogProps) {
  const titleId = useId();
  const formId = useId();
  const isFirstSend = mode === 'send';
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onConfirm();
    },
    [onConfirm],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '16px', m: 2, width: 'calc(100% - 32px)' } } }}
    >
      <DialogTitle id={titleId} sx={{ fontSize: 19, fontWeight: 700, pb: 1 }}>
        {isFirstSend ? 'Envoyer le devis' : 'Renvoyer l’email'} à {clientName}
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          id={formId}
          noValidate
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: 0.5 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography sx={{ color: 'text.secondary' }}>{totalLabel}</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{totalValue}</Typography>
          </Box>
          <LabeledInput
            id="send-email"
            name="email"
            label="Email du client"
            type="email"
            value={email}
            onChange={onEmailChange}
            error={emailError ?? undefined}
            placeholder="client@exemple.fr"
            inputMode="email"
            autoComplete="off"
            maxLength={254}
          />
          {isFirstSend ? (
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
              Une fois envoyé, ce devis ne pourra plus être modifié.
            </Box>
          ) : (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Un nouveau lien est envoyé : l’ancien ne fonctionnera plus.
            </Typography>
          )}
          {error ? (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
              {error}
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
        <Button variant="outlined" onClick={onClose} disabled={isSending}>
          Annuler
        </Button>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          disabled={isSending}
          aria-busy={isSending}
        >
          {isSending ? 'Envoi…' : 'Envoyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
