import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { colors } from '@/theme/tokens';

export function QuotesEmptyState() {
  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="quotes-empty-title"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 1.5,
        px: 3,
        py: 4,
        borderRadius: '16px',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 64,
          height: 64,
          borderRadius: '32px',
          bgcolor: colors.primarySoft,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DescriptionOutlinedIcon fontSize="large" />
      </Box>
      <Typography variant="h2" id="quotes-empty-title">
        Aucun devis pour l’instant
      </Typography>
      <Typography color="text.secondary">
        Décrivez le chantier en quelques mots, FactuFlash prépare le devis. Vous le relisez puis
        l’envoyez à votre client, depuis votre téléphone.
      </Typography>
    </Paper>
  );
}
