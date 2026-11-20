'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useDeleteQuoteDraft } from '../hooks/useDeleteQuoteDraft';

interface DeleteQuoteDraftButtonProps {
  quoteId: string;
  number: string;
  /** « icon » sur la carte de Mes devis, « text » sur l'écran du devis. */
  variant: 'icon' | 'text';
  /** Où aller après suppression ; sans valeur, la page courante est rafraîchie. */
  redirectTo?: string;
}

export function DeleteQuoteDraftButton({
  quoteId,
  number,
  variant,
  redirectTo,
}: DeleteQuoteDraftButtonProps) {
  const deletion = useDeleteQuoteDraft(quoteId, redirectTo);
  const label = `Supprimer le brouillon ${number}`;

  return (
    <>
      {variant === 'icon' ? (
        <IconButton
          onClick={deletion.open}
          aria-label={label}
          aria-haspopup="dialog"
          sx={{ width: 48, height: 48, color: 'text.secondary' }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      ) : (
        <Button
          onClick={deletion.open}
          aria-haspopup="dialog"
          startIcon={<DeleteOutlineIcon />}
          color="error"
          variant="text"
        >
          Supprimer ce brouillon
        </Button>
      )}
      <ConfirmDialog
        open={deletion.isOpen}
        title={
          <>
            Supprimer le brouillon{' '}
            <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
              {number}
            </Box>{' '}
            ?
          </>
        }
        description="Le devis et toutes ses lignes seront supprimés définitivement. Le client reste dans votre liste."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        isPending={deletion.isDeleting}
        error={deletion.error}
        onConfirm={deletion.confirm}
        onClose={deletion.close}
      />
    </>
  );
}
