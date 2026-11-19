import Link from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

interface QuotesHeaderProps {
  subtitle: string;
}

export function QuotesHeader({ subtitle }: QuotesHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: 2.5,
        pt: 'calc(28px + env(safe-area-inset-top))',
        pb: 2,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="h1">Mes devis</Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
      </Box>

      <IconButton
        component={Link}
        href="/entreprise"
        aria-label="Mon entreprise"
        sx={{ width: 48, height: 48, border: 1, borderColor: 'divider', color: 'text.primary' }}
      >
        <PersonOutlineIcon />
      </IconButton>
    </Box>
  );
}
