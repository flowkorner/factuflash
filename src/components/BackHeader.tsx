import Link from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
}

/** En-tête des écrans secondaires : bouton retour + titre (maquette « Nouveau devis », « Mon entreprise »). */
export function BackHeader({ title, subtitle, backHref, backLabel }: BackHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.5,
        pt: 'calc(20px + env(safe-area-inset-top))',
        pb: 1.5,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <IconButton
        component={Link}
        href={backHref}
        aria-label={backLabel}
        sx={{ width: 48, height: 48, color: 'text.primary' }}
      >
        <ChevronLeftIcon />
      </IconButton>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography variant="h1" sx={{ fontSize: 22, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{subtitle}</Typography>
        ) : null}
      </Box>
    </Box>
  );
}
