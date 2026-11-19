import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { colors } from '@/theme/tokens';

export function CompleteCompanyNotice() {
  return (
    <Box
      component="section"
      aria-labelledby="complete-company-title"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 2,
        borderRadius: '16px',
        bgcolor: colors.primarySoft,
        color: colors.primaryDark,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <InfoOutlinedIcon fontSize="small" aria-hidden="true" sx={{ mt: 0.25 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            id="complete-company-title"
            component="h2"
            sx={{ fontSize: 16, fontWeight: 600 }}
          >
            Complétez votre entreprise
          </Typography>
          <Typography variant="body2">
            Nom, SIRET, adresse et TVA figurent sur chaque devis. À remplir une seule fois.
          </Typography>
        </Box>
      </Box>
      <Button component={Link} href="/entreprise" variant="contained" fullWidth>
        Remplir Mon entreprise
      </Button>
    </Box>
  );
}
