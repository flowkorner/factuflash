import type { Ref } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { colors } from '@/theme/tokens';

interface LinkSentCardProps {
  email: string;
  resent: boolean;
  resendIn: number;
  headingRef: Ref<HTMLHeadingElement>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}

export function LinkSentCard({
  email,
  resent,
  resendIn,
  headingRef,
  onResend,
  onChangeEmail,
}: LinkSentCardProps) {
  const canResend = resendIn === 0;
  const resendLabel = canResend ? 'Renvoyer le lien' : `Renvoyer (${resendIn} s)`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper
        variant="outlined"
        role="status"
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, p: 2.5, borderRadius: '16px' }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: 48,
            borderRadius: '24px',
            bgcolor: colors.primarySoft,
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MailOutlineIcon />
        </Box>
        <Typography variant="h2" ref={headingRef} tabIndex={-1} sx={{ outline: 'none' }}>
          Vérifiez vos emails
        </Typography>
        <Typography color="text.secondary">
          Nous avons envoyé un lien de connexion à{' '}
          <Box component="strong" sx={{ color: 'text.primary', overflowWrap: 'anywhere' }}>
            {email}
          </Box>
          . Il est valable 15 minutes.
        </Typography>
        <Typography color="text.secondary">
          Ouvrez l’email et touchez le lien pour vous connecter. Pensez à regarder dans les
          indésirables.
        </Typography>
        {resent ? (
          <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>
            Un nouveau lien vient de partir.
          </Typography>
        ) : null}
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        <Button variant="outlined" onClick={onResend} disabled={!canResend}>
          {resendLabel}
        </Button>
        <Button variant="outlined" onClick={onChangeEmail}>
          Changer d’email
        </Button>
      </Box>
    </Box>
  );
}
