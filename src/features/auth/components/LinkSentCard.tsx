import type { Ref } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { colors } from '@/theme/tokens';

interface LinkSentCardProps {
  email: string;
  resent: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}

export function LinkSentCard({
  email,
  resent,
  headingRef,
  onResend,
  onChangeEmail,
}: LinkSentCardProps) {
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
      </Paper>

      <Button component={Link} href="/devis" variant="contained" size="large" fullWidth>
        Simuler le clic sur le lien
      </Button>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        <Button variant="outlined" onClick={onResend} disabled={resent}>
          {resent ? 'Lien renvoyé' : 'Renvoyer le lien'}
        </Button>
        <Button variant="outlined" onClick={onChangeEmail}>
          Changer d’email
        </Button>
      </Box>
    </Box>
  );
}
