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

      {/* Écran « Mon entreprise » : ticket suivant. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
        <IconButton
          disabled
          aria-label="Mon entreprise (bientôt disponible)"
          sx={{ width: 48, height: 48, border: 1, borderColor: 'divider' }}
        >
          <PersonOutlineIcon />
        </IconButton>
        <Typography aria-hidden="true" sx={{ fontSize: 12, color: 'text.secondary' }}>
          Bientôt
        </Typography>
      </Box>
    </Box>
  );
}
