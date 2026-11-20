import { useId } from 'react';
import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmation d'une action destructrice (remplace window.confirm).
 * Accessibilité : role="alertdialog", titre et texte reliés, focus piégé par MUI,
 * focus initial sur « Annuler » (le choix sans risque), Échap ferme, focus rendu au bouton d'origine.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '16px', m: 2, width: 'calc(100% - 32px)' } } }}
    >
      <DialogTitle id={titleId} sx={{ fontSize: 19, fontWeight: 700, pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <DialogContentText id={descriptionId} sx={{ color: 'text.secondary', fontSize: 15 }}>
          {description}
        </DialogContentText>
        {error ? (
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            {error}
          </Alert>
        ) : null}
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
        <Button variant="outlined" onClick={onClose} disabled={isPending} autoFocus>
          Annuler
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
